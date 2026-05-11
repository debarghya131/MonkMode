import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

import Journal from "../models/Journal.js";

const RAHUL_EMAIL = "rahul@gmail.com";

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  // Resolve rahul's userId
  const User = mongoose.model(
    "User",
    new mongoose.Schema({ email: String }, { strict: false })
  );
  const user = await User.findOne({ email: RAHUL_EMAIL }).select("_id").lean();
  if (!user) {
    console.error("User not found:", RAHUL_EMAIL);
    process.exit(1);
  }
  const userId = user._id;
  console.log("Found user:", userId.toString());

  const entries = [
    {
      dayKey: "2026-05-04",
      date: new Date("2026-05-04T12:00:00Z"),
      mood: "Motivated",
      wakeUpTime: "06:15",
      sleepTime: "23:00",
      energyLevel: 82,
      overallRating: 78,
      summary: "Started the week strong. Deep work session in the morning, got the backend auth module finished ahead of schedule. Felt clear-headed and locked in.",
      insight: "Blocking out the first 2 hours for focused work without checking messages makes a huge difference.",
      affirmation: "I do hard things with ease when I show up prepared.",
      tomorrowPlan: "Review the frontend PR, push the missed-days endpoint, and go for a 6km run.",
      wins: ["Finished auth module", "No social media before noon", "Cooked a proper meal"],
      mistakes: ["Stayed up 30 mins later than planned"],
      gratitude: ["Good health", "Quiet morning", "Strong coffee"],
      achievement: ["Shipped backend feature ahead of deadline"],
      distractions: ["Phone notifications after lunch"],
      _seed: true,
    },
    {
      dayKey: "2026-05-10",
      date: new Date("2026-05-10T12:00:00Z"),
      mood: "Grateful",
      wakeUpTime: "07:00",
      sleepTime: "22:45",
      energyLevel: 74,
      overallRating: 85,
      summary: "Wrapped up the week on a high note. Reviewed all weekly reports, fixed a gnarly bug in the heatmap refresh, and closed 4 open tasks. Feeling accomplished.",
      insight: "Weekly reviews are underrated — seeing the full week at once shows you how much you actually got done.",
      affirmation: "Consistency compounds. Every small win matters.",
      tomorrowPlan: "Rest day. Short walk, read, and plan next week's goals.",
      wins: ["Closed 4 open tasks", "Fixed heatmap refresh bug", "Weekly review done", "Stayed under calorie goal"],
      mistakes: ["Skipped the morning run", "Replied to messages during deep work block"],
      gratitude: ["Productive week", "Great music playlist", "Team support"],
      achievement: ["Full week of journaling (almost)", "Completed weekly report feature"],
      distractions: ["YouTube rabbit hole after dinner"],
      _seed: true,
    },
  ];

  let inserted = 0;
  for (const entry of entries) {
    try {
      await Journal.findOneAndUpdate(
        { userId, dayKey: entry.dayKey },
        { ...entry, userId },
        { upsert: true, new: true }
      );
      console.log(`✓ Upserted journal for ${entry.dayKey}`);
      inserted++;
    } catch (err) {
      console.error(`✗ Failed for ${entry.dayKey}:`, err.message);
    }
  }

  console.log(`\nDone. ${inserted}/${entries.length} entries upserted.`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
