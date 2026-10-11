import { computeHabitWeeklyReport } from "../../../../shared/habitWeeklyStats.js";
import { shiftReportDay } from "../../../../shared/journalWeeklyStats.js";

const specs = [
  ["2026-04-13", [5, 5, 6, 4, 3, 2, 3]],
  ["2026-04-06", [5, 0, 5, 4, 0, 2, 1]],
  ["2026-03-30", [6, 6, 6, 6, 6, 3, 1]],
  ["2026-03-23", [0, 4, 4, 3, 0, 1, 0]],
];
const samples = [
  ["Morning Walk", "Fitness", "High", "Morning"],
  ["Read 30 min", "Study", "Medium", "Afternoon"],
  ["Drink Water", "Health", "Low", "Unspecified"],
  ["Meditate", "Mindfulness", "Medium", "Morning"],
  ["Deep Work Sprint", "Study", "High", "Afternoon"],
  ["Sleep by 11 PM", "Sleep", "High", "Night"],
  ["Weekend Planning", "Morning Routine", "Low", "Evening"],
];
export const DEMO_HABIT_REPORTS = Object.fromEntries(specs.map(([id, completed]) => {
  const days = Array.from({ length: 7 }, (_, index) => shiftReportDay(id, index));
  const habits = samples.map(([title, category, priority, timeOfDay], index) => ({ id: `${id}-${index}`, title, category, priority,
    timeOfDay, startDate: id, repeatType: index === 6 ? "weekend" : "daily", targetStreak: 21 }));
  const logs = days.flatMap((dayKey, index) => habits.slice(0, completed[index]).map(habit => ({ habitId: habit.id, dayKey, completed: true })));
  const report = computeHabitWeeklyReport(habits, logs, days, { today: "2026-04-20" });
  report.aiSummary = `This sample week has ${report.completed} completed and ${report.missed} missed check-ins out of ${report.totalInstances} scheduled (${report.completionRate}% completion). There were ${report.activeDays} active days out of ${report.scheduledDays} scheduled days. The longest within-week run for one habit was ${report.longestStreak} scheduled check-ins. For next week, choose a repeatable reminder for one habit with missed check-ins.`;
  return [id, report];
}));
export const DEMO_HABIT_SUMMARIES = Object.values(DEMO_HABIT_REPORTS).map(({ id, date, signal, habits, totalInstances, completed, missed, pending }) => ({ id, date, signal, habitCount: habits.length, totalInstances, completed, missed, pending }));
