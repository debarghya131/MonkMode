import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

import Todo from "../models/Todo.js";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function isTodoScheduledOn(todo, dayKey) {
  if (todo.repeatType === "once") return false;
  const date = new Date(`${dayKey}T00:00:00Z`);
  if (todo.startDate && date < new Date(todo.startDate)) return false;
  if (todo.endDate   && date > new Date(todo.endDate))   return false;
  const dow = date.getUTCDay();
  const dayName = DAY_NAMES[dow];
  switch (todo.repeatType) {
    case "daily":    return true;
    case "weekdays": return todo.days?.length > 0 ? todo.days.includes(dayName) : (dow >= 1 && dow <= 5);
    case "weekend":  return dow === 0 || dow === 6;
    default:         return false;
  }
}

const WEEK_DAYS = [
  { dayKey: "2026-05-04", label: "Mon" }, { dayKey: "2026-05-05", label: "Tue" },
  { dayKey: "2026-05-06", label: "Wed" }, { dayKey: "2026-05-07", label: "Thu" },
  { dayKey: "2026-05-08", label: "Fri" }, { dayKey: "2026-05-09", label: "Sat" },
  { dayKey: "2026-05-10", label: "Sun" },
];

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  const User = mongoose.model("User", new mongoose.Schema({ email: String }, { strict: false }));
  const user = await User.findOne({ email: "rahul@gmail.com" }).lean();
  const uid = user._id;

  const todos = await Todo.find({ userId: uid, deletedAt: null }).lean();
  let total = 0, completed = 0, missed = 0, pending = 0;
  const missedList = [];

  for (const todo of todos) {
    const stateMap = {};
    for (const ds of (todo.dayStates || [])) stateMap[ds.dayKey] = ds;

    if (todo.repeatType === "once") {
      for (const wd of WEEK_DAYS) {
        const ds = stateMap[wd.dayKey];
        if (!ds) continue;
        total++;
        if (ds.status === "completed") completed++;
        else if (ds.status === "missed") missed++;
        else pending++;
      }
    } else {
      for (const wd of WEEK_DAYS) {
        if (!isTodoScheduledOn(todo, wd.dayKey)) continue;
        total++;
        const ds = stateMap[wd.dayKey];
        const status = ds ? ds.status : "missed";
        if (status === "completed") completed++;
        else {
          missed++;
          missedList.push(`${wd.label} ${wd.dayKey} — "${todo.title}" (${todo.repeatType})`);
        }
      }
    }
  }

  console.log(`\nCorrected stats for May 4-10:`);
  console.log(`  Total scheduled: ${total}`);
  console.log(`  Completed: ${completed}`);
  console.log(`  Missed: ${missed}`);
  console.log(`  Pending: ${pending}`);
  console.log(`  Completion rate: ${total > 0 ? Math.round(completed/total*100) : 0}%`);
  console.log(`\nMissed tasks:`);
  missedList.forEach(t => console.log("  -", t));

  await mongoose.disconnect();
}
main().catch(console.error);
