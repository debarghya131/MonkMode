import mongoose from "mongoose";
import { getDatabaseConfig } from "../config/database.js";

// Materialize the database in Compass without adding sample users or copying
// development data. A dry run never creates collections or indexes.
const apply = process.argv.includes("--apply");
try {
  const database = getDatabaseConfig();
  console.log(`Target database: ${database.dbName} (${database.environment})`);
  await mongoose.connect(database.uri, { dbName: database.dbName, autoIndex: false, autoCreate: false });
  const existing = await mongoose.connection.db.listCollections({ name: "users" }, { nameOnly: true }).hasNext();
  if (existing) {
    console.log("Database already has a users collection. Nothing changed.");
  } else if (apply) {
    try {
      await mongoose.connection.db.createCollection("users");
    } catch (error) {
      if (error.code !== 48) throw error; // Another process may create it first.
    }
    console.log("Database initialized with an empty users collection. No records copied or deleted.");
  } else {
    console.log("Would create an empty users collection. Add --apply to initialize.");
  }
} catch (error) {
  console.error("Database initialization failed:", error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
