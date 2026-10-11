import { computeTodoWeeklyReport } from "../../../../shared/todoWeeklyStats.js";
import { shiftReportDay } from "../../../../shared/journalWeeklyStats.js";

const samples = [
  { id: "2026-04-13", total: [6, 7, 8, 7, 7, 5, 2], done: [4, 5, 6, 7, 4, 2, 0] },
  { id: "2026-04-06", total: [6, 6, 7, 7, 6, 4, 2], done: [3, 4, 5, 4, 4, 2, 0] },
  { id: "2026-03-30", total: [6, 7, 8, 7, 7, 5, 5], done: [5, 6, 8, 7, 6, 3, 1] },
  { id: "2026-03-23", total: [0, 0, 7, 8, 7, 5, 8], done: [0, 0, 5, 6, 4, 2, 0] },
];
const categories = ["Study", "Work", "Fitness", "Health", "Bill & Payment", "Personal", "Shopping"];
const times = ["05:30", "08:00", "10:00", "13:00", "16:00", "20:00", ""];
export const DEMO_TODO_REPORTS = Object.fromEntries(samples.map(sample => {
  const days = Array.from({ length: 7 }, (_, index) => shiftReportDay(sample.id, index));
  const tasks = days.flatMap((date, dayIndex) => Array.from({ length: sample.total[dayIndex] }, (_, index) => ({
    id: `${date}-sample-${index}`, title: `Sample ${categories[index % categories.length]} task ${index + 1}`,
    repeatType: "once", date, category: categories[index % categories.length], priority: ["High", "Medium", "Low"][index % 3], time: times[index % times.length],
    dayStates: [{ dayKey: date, status: index < sample.done[dayIndex] ? "completed" : "missed" }],
  })));
  const report = computeTodoWeeklyReport(tasks, days, { today: "2026-04-20" });
  return [report.id, { ...report, aiSummary: `This sample week has ${report.completed} of ${report.totalTasks} tasks completed (${report.completionRate}%), with ${report.missed} missed and no pending past tasks. Tasks were completed on ${report.activeDays} of ${report.scheduledDays} scheduled days, with a longest active-day run of ${report.longestStreak} days. Next week, review the next day's schedule each evening and reserve a short block for any high-priority task.` }];
}));
export const DEMO_TODO_SUMMARIES = Object.values(DEMO_TODO_REPORTS).map(report => ({
  id: report.id, date: report.date, signal: report.signal, taskCount: report.totalTasks,
  totalTasks: report.totalTasks, completed: report.completed, pending: report.pending, missed: report.missed,
  activeDays: report.activeDays, scheduledDays: report.scheduledDays, consistency: report.consistency,
  completionRate: report.completionRate, weeklyScore: report.weeklyScore, longestStreak: report.longestStreak,
}));
