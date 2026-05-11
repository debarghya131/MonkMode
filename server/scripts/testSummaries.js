import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

import Journal from "../models/Journal.js";

function toDayKey(date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getWeekStartDayKey(dayKey) {
  const date = new Date(`${dayKey}T00:00:00Z`);
  const dow = date.getUTCDay();
  const toMonday = dow === 0 ? -6 : 1 - dow;
  date.setUTCDate(date.getUTCDate() + toMonday);
  return toDayKey(date);
}

function formatWeekLabel(weekStart, weekEnd) {
  const opts = { month: "short", day: "numeric", timeZone: "UTC" };
  return `${weekStart.toLocaleDateString("en-US", opts)} - ${weekEnd.toLocaleDateString("en-US", opts)}`;
}

async function main() {
  await mongoose.connect(process.env.MONGO_URI);

  const User = mongoose.model("User", new mongoose.Schema({ email: String }, { strict: false }));
  const user = await User.findOne({ email: "rahul@gmail.com" }).lean();
  const userId = user._id;

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  console.log("Server 'today' (UTC midnight):", today.toISOString());

  const dow = today.getUTCDay();
  const toMonday = dow === 0 ? -6 : 1 - dow;
  const thisMonday = new Date(today);
  thisMonday.setUTCDate(today.getUTCDate() + toMonday);
  console.log("This Monday:", toDayKey(thisMonday));

  const mondays = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(thisMonday);
    d.setUTCDate(thisMonday.getUTCDate() - i * 7);
    return d;
  });

  const earliestDayKey = toDayKey(mondays[11]);
  const allEntries = await Journal.find(
    { userId, dayKey: { $gte: earliestDayKey } },
    { dayKey: 1, overallRating: 1 }
  ).lean();

  console.log("\nAll journal entries found:", allEntries.map(e => e.dayKey));

  const weekGroups = {};
  for (const entry of allEntries) {
    const wk = getWeekStartDayKey(entry.dayKey);
    if (!weekGroups[wk]) weekGroups[wk] = [];
    weekGroups[wk].push(entry);
  }
  console.log("Week groups:", JSON.stringify(Object.keys(weekGroups)));

  const summaries = mondays.map(monday => {
    const weekStart = monday;
    const weekEnd = new Date(monday);
    weekEnd.setUTCDate(monday.getUTCDate() + 6);
    const startDayKey = toDayKey(weekStart);
    const entries = weekGroups[startDayKey] || [];
    const loggedDays = entries.length;
    const weekIsComplete = weekEnd < today;
    const status = weekIsComplete ? "Ready" : "Draft";

    return {
      id: startDayKey,
      date: formatWeekLabel(weekStart, weekEnd),
      status,
      loggedDays,
      weekEnd: toDayKey(weekEnd),
      weekIsComplete,
    };
  });

  console.log("\nAll 12 weeks:");
  summaries.forEach(s => {
    console.log(`  ${s.id} → ${s.date} | status=${s.status} | loggedDays=${s.loggedDays} | complete=${s.weekIsComplete}`);
  });

  const filtered = summaries.filter(w => w.status === "Ready" && w.loggedDays > 0);
  console.log("\n✅ Weeks that WOULD be returned by /journal/summaries:", filtered.length);
  filtered.forEach(s => console.log("  -", s.id, s.date, `(${s.loggedDays} logged days)`));

  await mongoose.disconnect();
}
main().catch(console.error);
