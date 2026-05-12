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
      dayKey: "2026-04-13",
      date: new Date("2026-04-13T12:00:00Z"),
      mood: "Focused",
      wakeUpTime: "06:05",
      sleepTime: "22:50",
      energyLevel: 76,
      overallRating: 72,
      summary: "Started the week clean. Deep work was solid before lunch and distractions stayed low.",
      insight: "Keeping the first hour phone-free improves output for the rest of the day.",
      affirmation: "I protect my attention and it pays off.",
      tomorrowPlan: "Finish API cleanup and one focused DSA block.",
      wins: ["Two deep work blocks", "No late-night snacking"],
      mistakes: ["Skipped evening stretch"],
      gratitude: ["Calm morning", "Good sleep"],
      achievement: ["Closed one pending backend issue"],
      distractions: ["Unplanned message replies"],
      _seed: true,
    },
    {
      dayKey: "2026-04-14",
      date: new Date("2026-04-14T12:00:00Z"),
      mood: "Calm",
      wakeUpTime: "06:20",
      sleepTime: "23:10",
      energyLevel: 71,
      overallRating: 69,
      summary: "Decent momentum. Progress was steady though afternoon energy dipped.",
      insight: "A short walk after lunch prevents the 3 PM slump.",
      affirmation: "Slow and steady still moves me forward.",
      tomorrowPlan: "Push workout consistency and review weekly report edge cases.",
      wins: ["Finished report polish", "Hit hydration goal"],
      mistakes: ["Context switched too often"],
      gratitude: ["Supportive teammate", "Healthy meal prep"],
      achievement: ["Refined analytics view copy"],
      distractions: ["Notification pings"],
      _seed: true,
    },
    {
      dayKey: "2026-04-15",
      date: new Date("2026-04-15T12:00:00Z"),
      mood: "Motivated",
      wakeUpTime: "05:55",
      sleepTime: "22:40",
      energyLevel: 84,
      overallRating: 81,
      summary: "High-output day. Finished a complex bugfix and got back to workout routine.",
      insight: "Starting with the hardest task early removes mental drag all day.",
      affirmation: "I can execute under pressure with clarity.",
      tomorrowPlan: "Review analytics data accuracy and run test pass.",
      wins: ["Resolved bug end-to-end", "Completed workout"],
      mistakes: ["Worked through a break window"],
      gratitude: ["Strong energy", "Clear priorities"],
      achievement: ["Merged critical fix"],
      distractions: ["Short social media check"],
      _seed: true,
    },
    {
      dayKey: "2026-04-16",
      date: new Date("2026-04-16T12:00:00Z"),
      mood: "Tired",
      wakeUpTime: "06:50",
      sleepTime: "23:45",
      energyLevel: 58,
      overallRating: 60,
      summary: "Energy was low but minimum commitments were met.",
      insight: "Late sleep starts the next day in recovery mode.",
      affirmation: "Even on low-energy days, I keep the chain alive.",
      tomorrowPlan: "Prioritize sleep and one non-negotiable habit.",
      wins: ["Did minimum habit set", "Shipped one minor fix"],
      mistakes: ["Slept late", "Skipped evening walk"],
      gratitude: ["Still showed up", "Warm dinner"],
      achievement: ["Maintained journaling streak"],
      distractions: ["Passive scrolling at night"],
      _seed: true,
    },
    {
      dayKey: "2026-04-17",
      date: new Date("2026-04-17T12:00:00Z"),
      mood: "Happy",
      wakeUpTime: "06:10",
      sleepTime: "22:55",
      energyLevel: 77,
      overallRating: 75,
      summary: "Balanced day. Good code progress and stable routine.",
      insight: "Small task batching keeps momentum smooth.",
      affirmation: "Consistency is my edge.",
      tomorrowPlan: "Weekend planning and one long focus session.",
      wins: ["Completed sprint checklist", "Ate on time"],
      mistakes: ["Delayed one follow-up"],
      gratitude: ["Steady focus", "Good weather"],
      achievement: ["Closed two review comments"],
      distractions: ["Chat tabs during focus window"],
      _seed: true,
    },
    {
      dayKey: "2026-04-18",
      date: new Date("2026-04-18T12:00:00Z"),
      mood: "Neutral",
      wakeUpTime: "07:05",
      sleepTime: "23:20",
      energyLevel: 66,
      overallRating: 64,
      summary: "Lighter Saturday. Kept habits moderate and did weekly cleanup.",
      insight: "Low-pressure days still need one anchor task.",
      affirmation: "I honor progress, not perfection.",
      tomorrowPlan: "Reset workspace and plan Monday priorities.",
      wins: ["Weekly cleanup done", "Short workout complete"],
      mistakes: ["No deep work block"],
      gratitude: ["Quiet afternoon", "Music break"],
      achievement: ["Prepared next-week task list"],
      distractions: ["Long video break"],
      _seed: true,
    },
    {
      dayKey: "2026-04-19",
      date: new Date("2026-04-19T12:00:00Z"),
      mood: "Grateful",
      wakeUpTime: "07:15",
      sleepTime: "22:35",
      energyLevel: 73,
      overallRating: 79,
      summary: "Strong Sunday reset. Planned the week and reflected with clarity.",
      insight: "Weekly planning lowers weekday decision fatigue.",
      affirmation: "I build momentum one clean day at a time.",
      tomorrowPlan: "Start Monday with top-priority implementation task.",
      wins: ["Weekly plan complete", "Healthy meal prep"],
      mistakes: ["Delayed one household task"],
      gratitude: ["Family support", "A stable routine"],
      achievement: ["Clear weekly roadmap"],
      distractions: ["Late inbox check"],
      _seed: true,
    },
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
        { upsert: true, returnDocument: "after" }
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
