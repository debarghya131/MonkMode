import { createHash } from "node:crypto";
import { APP_TIMEZONE } from "../config/runtime.js";
import { journalReportWeek, completedJournalWeeks } from "./journalWeeklyReportUtils.js";
import { computeTodoWeeklyReport } from "../../shared/todoWeeklyStats.js";
import { DEFAULT_IMPORTANT_CATEGORIES } from "./todoPreferencesUtils.js";

export const todoReportWeek = journalReportWeek;
export const completedTodoWeeks = completedJournalWeeks;
export const TODO_REPORT_FIELDS = { title: 1, category: 1, priority: 1, repeatType: 1, days: 1, startDate: 1, endDate: 1, date: 1, createdAt: 1, updatedAt: 1,
  time: 1, pendingTime: 1, timeChangeEffectiveFrom: 1, pendingDays: 1, daysChangeEffectiveFrom: 1, completed: 1, dayStates: 1, deletedAt: 1 };

export function todoReportFilter(userId, days) {
  const start = new Date(`${days[0]}T00:00:00`), end = new Date(`${days.at(-1)}T23:59:59.999`);
  return { userId, $or: [
    { startDate: { $lte: end }, $or: [{ endDate: null }, { endDate: { $gte: start } }] },
    { date: { $gte: start, $lte: end } },
    { dayStates: { $elemMatch: { dayKey: { $gte: days[0], $lte: days.at(-1) } } } },
    { startDate: null, date: { $lte: end } },
    { startDate: null, date: null, createdAt: { $lte: end } },
  ] };
}

export function buildTodoWeeklyReport(tasks, account, days) {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: APP_TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now);
  const value = type => parts.find(part => part.type === type).value;
  const importantCategories = [...DEFAULT_IMPORTANT_CATEGORIES, ...(account?.todoPreferences?.importantCategories || [])];
  return { ...computeTodoWeeklyReport(tasks, days, { today: `${value("year")}-${value("month")}-${value("day")}`, time: `${value("hour")}:${value("minute")}`, timezone: APP_TIMEZONE, importantCategories }),
    timezone: APP_TIMEZONE, serverNow: now.toISOString() };
}
export const todoReportFingerprint = report => {
  // Titles are display data, not AI context. Only aggregate facts are sent.
  const { serverNow, timezone, missedTasks, missedTasksTruncated, ...context } = report;
  void serverNow; void timezone; void missedTasks; void missedTasksTruncated;
  return createHash("sha256").update(JSON.stringify({ version: 1, ...context })).digest("hex");
};
export const todoAiContext = report => {
  const { id, date, totalTasks, completed, pending, missed, activeDays, scheduledDays, consistency, completionRate, weeklyScore, longestStreak, lateCompleted, categories, priorityStats, importantCategories, dailyStats, completionTiming, missedTiming } = report;
  return { id, date, totalTasks, completed, pending, missed, activeDays, scheduledDays, consistency, completionRate, weeklyScore, longestStreak, lateCompleted, categories, priorityStats, importantCategories, dailyStats, completionTiming, missedTiming };
};
