import { getDatabaseConfig } from "../config/database.js";
import mongoose from "mongoose";
import Goal from "../models/Goal.js";
import {
  buildSubgoalActivityTitle,
  hasSubgoalCompletedEvent,
  retainGoalActivityLogs
} from "../utils/goalActivityUtils.js";

const MAX_ACTIVITY_LOGS = 200;

const run = async () => {
  const database = getDatabaseConfig();
  console.log(`Target database: ${database.dbName} (${database.environment})`);
  await mongoose.connect(database.uri, { dbName: database.dbName, autoIndex: false, autoCreate: false });

  const goals = await Goal.find({
    subgoals: {
      $elemMatch: {
        completed: true,
        completedAt: { $ne: null }
      }
    }
  });

  let goalCount = 0;
  let eventCount = 0;

  for (const goal of goals) {
    let changed = false;

    for (const subgoal of goal.subgoals || []) {
      if (!subgoal?.completed || !subgoal?.completedAt) continue;
      if (hasSubgoalCompletedEvent(goal, subgoal)) continue;

      goal.activityLogs = retainGoalActivityLogs([
        ...(Array.isArray(goal.activityLogs) ? goal.activityLogs : []),
        {
          action: "subgoal_completed",
          title: buildSubgoalActivityTitle(subgoal.title, goal.title),
          subgoalId: subgoal._id || null,
          at: subgoal.completedAt
        }
      ], MAX_ACTIVITY_LOGS);

      changed = true;
      eventCount += 1;
    }

    if (changed) {
      await goal.save();
      goalCount += 1;
    }
  }

  console.log(`Backfill complete. Updated ${goalCount} goals and added ${eventCount} sub-goal completion events.`);
};

run()
  .then(async () => {
    await mongoose.disconnect();
  })
  .catch(async (error) => {
    console.error("Backfill failed:", error.message);
    try {
      await mongoose.disconnect();
    } catch {
      // ignore disconnect error on failure path
    }
    process.exit(1);
  });
