import { computeHabitAnalysis } from "../../../../../shared/habitAnalysisStats.js";
import { journalMonthDays } from "../../../../../shared/journalAnalysisStats.js";

export function demoHabitAnalysis(year, month) {
  const days = journalMonthDays(year, month);
  const sample = Number(year) === 2026 && [2, 3, 4].includes(Number(month));
  const habits = sample ? [
    { _id: "meditation", title: "Morning Meditation", category: "Mindfulness", priority: "High", timeOfDay: "Morning", time: "06:30", isImportant: true, targetStreak: 30 },
    { _id: "exercise", title: "Workout", category: "Fitness", priority: "High", timeOfDay: "Afternoon", days: ["Mon", "Wed", "Fri"], targetStreak: 21 },
    { _id: "reading-a", title: "Read 20 Pages", category: "Learning", priority: "Medium", timeOfDay: "Night", time: "21:00", targetStreak: 45 },
    { _id: "reading-b", title: "Read 20 Pages", category: "Personal", priority: "Low", timeOfDay: null, frequency: "weekly", targetStreak: 14 },
    { _id: "water", title: "Drink Water", category: "Health", priority: "Low", timeOfDay: "Evening", targetStreak: 60 },
  ].map(row => ({ repeatType: "daily", frequency: "daily", ...row, startDate: days[0], createdAt: days[0] })) : [];
  const logs = habits.flatMap((habit, index) => days.filter((day, offset) => (index + offset) % 5 !== 0)
    .map(dayKey => ({ habitId: habit._id, dayKey, completed: true })));
  const clock = { today: "2026-10-10", timezone: "Asia/Kolkata" };
  return { year: Number(year), month: Number(month), ...clock, joinedDay: "2026-02-01",
    analysis: computeHabitAnalysis(habits, logs, { year, month, ...clock }),
    dataNote: "Demo sample, calculated from one shared set of habits and check-ins; not AI-generated." };
}

