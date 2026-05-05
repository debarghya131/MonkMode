import dotenv from "dotenv";
import mongoose from "mongoose";
import Goal from "../models/Goal.js";
import {
  buildSubgoalActivityTitle,
  hasSubgoalCompletedEvent
} from "../utils/goalActivityUtils.js";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;
const MAX_ACTIVITY_LOGS = 200;

const run = async () => {
  if (!MONGO_URI) {
    throw new Error("MONGO_URI is missing in server/.env");
  }

  await mongoose.connect(MONGO_URI);

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

      goal.activityLogs = [
        ...(Array.isArray(goal.activityLogs) ? goal.activityLogs : []),
        {
          action: "subgoal_completed",
          title: buildSubgoalActivityTitle(subgoal.title, goal.title),
          subgoalId: subgoal._id || null,
          at: subgoal.completedAt
        }
      ].slice(-MAX_ACTIVITY_LOGS);

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
