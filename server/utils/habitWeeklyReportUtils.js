import { createHash } from "node:crypto";
import { APP_TIMEZONE } from "../config/runtime.js";
import { journalReportWeek, completedJournalWeeks } from "./journalWeeklyReportUtils.js";
import { journalDayKey } from "./journalCalendarUtils.js";
import { computeHabitWeeklyReport } from "../../shared/habitWeeklyStats.js";

export const habitReportWeek = journalReportWeek;
export const completedHabitWeeks = completedJournalWeeks;
export const HABIT_REPORT_FIELDS = { title: 1, category: 1, priority: 1, time: 1, pendingTime: 1, timeChangeEffectiveFrom: 1,
  pendingDays: 1, daysChangeEffectiveFrom: 1, targetStreak: 1, timeOfDay: 1, frequency: 1, repeatType: 1, startDate: 1,
  endDate: 1, createdAt: 1, updatedAt: 1, days: 1, deletedAt: 1, archivedReason: 1 };
export const habitReportFilter = (userId, days) => ({ userId, $or: [{ createdAt: { $lte: new Date(`${days.at(-1)}T23:59:59.999`) } }, { createdAt: null }] });
export const habitLogFilter = (habitIds, days) => ({ habitId: { $in: habitIds }, $or: [
  { dayKey: { $gte: days[0], $lte: days.at(-1) } },
  { dayKey: null, date: { $gte: new Date(`${days[0]}T00:00:00`), $lte: new Date(`${days.at(-1)}T23:59:59.999`) } },
] });
export function buildHabitWeeklyReport(habits, logs, days) {
  const now = new Date();
  return { ...computeHabitWeeklyReport(habits, logs, days, { today: journalDayKey(now), timezone: APP_TIMEZONE }), timezone: APP_TIMEZONE, serverNow: now.toISOString() };
}
export function habitAiContext(report) {
  const { id, date, totalInstances, completed, missed, pending, activeDays, scheduledDays, consistency, completionRate, weeklyScore, longestStreak, categories, priorityStats, dailyStats } = report;
  return { id, date, totalInstances, completed, missed, pending, activeDays, scheduledDays, consistency, completionRate, weeklyScore, longestStreak, categories, priorityStats, dailyStats,
    habitStats: report.habits.map(({ priority, timeOfDay, completedDays, totalDays, missed, pending, streak, longestStreak }) => ({ priority, timeOfDay, completedDays, totalDays, missed, pending, streak, longestStreak })) };
}
export const habitReportFingerprint = report => createHash("sha256").update(JSON.stringify({ version: 1, ...habitAiContext(report) })).digest("hex");
