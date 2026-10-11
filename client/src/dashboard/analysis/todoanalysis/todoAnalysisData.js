import { computeTodoAnalysis } from "../../../../../shared/todoAnalysisStats.js";
import { journalMonthDays } from "../../../../../shared/journalAnalysisStats.js";

export function demoTodoAnalysis(year, month) {
  const days = journalMonthDays(year, month);
  const sample = Number(year) === 2026 && [2, 3, 4].includes(Number(month));
  const tasks = sample ? [
    { id: "study", category: "Study", priority: "High", time: "08:00", repeatType: "daily" },
    { id: "work", category: "Work", priority: "Medium", time: "14:00", repeatType: "weekdays", days: ["Mon", "Wed", "Fri"] },
    { id: "health", category: "Health", priority: "Low", time: "05:30", repeatType: "daily" },
    { id: "bill", category: "Bill & Payment", priority: "High", time: "", repeatType: "once", date: days[12] },
    { id: "reading", category: "Learning", priority: "Medium", time: "22:00", repeatType: "weekend" },
  ].map((task, taskIndex) => ({
    ...task, startDate: days[0], createdAt: days[0],
    dayStates: days.filter((day, index) => (index + taskIndex) % 4 !== 0).map((dayKey, index) => ({
      dayKey, status: "completed", completedAt: task.time || "12:00", lateCompleted: (index + taskIndex) % 5 === 0,
    })),
  })) : [];
  const clock = { today: "2026-10-10", time: "11:30", timezone: "Asia/Kolkata" };
  return { year: Number(year), month: Number(month), ...clock, joinedDay: "2026-02-01",
    analysis: computeTodoAnalysis(tasks, { year, month, ...clock, importantCategories: ["Health", "Bill & Payment", "Study"] }),
    dataNote: "Demo sample, calculated from one shared set of task occurrences; not AI-generated." };
}

