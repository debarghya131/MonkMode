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

  for (const t of todos) {
    const week = (t.dayStates || []).filter(ds => ds.dayKey >= "2026-05-04" && ds.dayKey <= "2026-05-10");
    const allDayKeys = (t.dayStates || []).map(ds => ds.dayKey).sort();
    console.log(`"${t.title}"`);
    console.log(`  repeatType=${t.repeatType} | days=${JSON.stringify(t.days)} | time=${t.time}`);
    console.log(`  startDate=${t.startDate ? new Date(t.startDate).toISOString().slice(0,10) : "null"}`);
    console.log(`  All dayKeys: ${allDayKeys.join(", ") || "none"}`);
    console.log(`  May 4-10 dayStates: ${week.map(ds => `${ds.dayKey}=${ds.status}`).join(", ") || "none"}`);
    console.log();
  }

  await mongoose.disconnect();
}
main().catch(console.error);
