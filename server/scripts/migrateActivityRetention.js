import "../config/runtime.js";
import { getDatabaseConfig } from "../config/database.js";
import mongoose from "mongoose";
import HabitLog from "../models/HabitLog.js";
import GoalProgressLog from "../models/GoalProgressLog.js";
import TodoLog from "../models/TodoLog.js";
import WorkoutPlanLog from "../models/WorkoutPlanLog.js";
import { findActivityTtlIndexes } from "../utils/activityRetentionUtils.js";

// Dry-run by default. Only the listed activity-history expiry indexes are in
// scope. Deleted-measurement cleanup and all unrelated indexes are untouched.
const apply = process.argv.includes("--apply");
const targets = [[HabitLog, "date"], [GoalProgressLog, "date"], [TodoLog, "createdAt"], [WorkoutPlanLog, "createdAt"]];
try {
  const database = getDatabaseConfig();
  console.log(`Target database: ${database.dbName} (${database.environment})`);
  await mongoose.connect(database.uri, { dbName: database.dbName, autoIndex: false, autoCreate: false });
  for (const [model, field] of targets) {
    let indexes = [];
    try {
      indexes = await model.collection.listIndexes().toArray();
    } catch (error) {
      if (error.code !== 26) throw error; // A fresh database has no collection yet.
    }
    for (const index of findActivityTtlIndexes(indexes, field)) {
      console.log(`${apply ? "Removing" : "Would remove"} ${model.collection.name} TTL index: ${index.name}`);
      if (apply) await model.collection.dropIndex(index.name);
    }
    // Recreate only the activity date index. Rebuilding every schema index can
    // conflict with unrelated legacy index options and is outside this migration.
    if (apply) await model.collection.createIndex({ [field]: 1 });
  }
  console.log(apply ? "Activity retention migration complete. No records deleted." : "Dry-run complete. Add --apply to migrate.");
} catch (error) {
  console.error("Activity retention migration failed:", error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
