import mongoose from "mongoose";
import { getDatabaseConfig } from "../config/database.js";
import { ensureHabitAnalysisIndex } from "../utils/habitAnalysisIndex.js";

// Additive and dry-run by default. Do not sync/drop indexes or copy/delete data.
const apply = process.argv.includes("--apply");
try {
  const database = getDatabaseConfig();
  console.log(`Target database: ${database.dbName} (${database.environment})`);
  await mongoose.connect(database.uri, { dbName: database.dbName, autoIndex: false, autoCreate: false,
    serverSelectionTimeoutMS: 10000 });
  const result = await ensureHabitAnalysisIndex(mongoose.connection.db.collection("habits"), { apply });
  console.log(`Habit analysis index: ${result}. No records copied or deleted.`);
  if (!apply) console.log(result === "would-create"
    ? "Dry-run complete. Add --apply to create the index."
    : "Dry-run complete. Existing index needs no change.");
} catch (error) {
  // Never echo URI credentials or driver connection details.
  console.error("Habit analysis index setup failed:", error.name);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
