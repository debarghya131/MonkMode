import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

import Todo from "../models/Todo.js";

async function main() {
  await mongoose.connect(process.env.MONGO_URI);

  const User = mongoose.model("User", new mongoose.Schema({ email: String }, { strict: false }));
  const user = await User.findOne({ email: "rahul@gmail.com" }).lean();
  const uid = user._id;

  const todos = await Todo.find({ userId: uid, deletedAt: null }).lean();
  console.log(`Total todos: ${todos.length}`);

  // Collect all statuses and times across dayStates in May 4-10
  const statusCounts = {};
  const timeCounts = {};
  let totalDayStates = 0;

  for (const todo of todos) {
    const week = (todo.dayStates || []).filter(ds => ds.dayKey >= "2026-05-04" && ds.dayKey <= "2026-05-10");
    for (const ds of week) {
      totalDayStates++;
      statusCounts[ds.status] = (statusCounts[ds.status] || 0) + 1;
    }
    // Log time field
    const weekHasStates = week.length > 0;
    if (weekHasStates) {
      const t = todo.time || "NO_TIME";
      timeCounts[t] = (timeCounts[t] || 0) + 1;
      console.log(`  "${todo.title}" | time=${todo.time || "null"} | status(es): ${week.map(ds => `${ds.dayKey}=${ds.status}`).join(", ")}`);
    }
  }

  console.log(`\nTotal dayStates in May 4-10: ${totalDayStates}`);
  console.log("Status breakdown:", statusCounts);
  console.log("Time breakdown:", timeCounts);

  await mongoose.disconnect();
}
main().catch(console.error);
