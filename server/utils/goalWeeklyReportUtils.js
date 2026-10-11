import { createHash } from "node:crypto";
import { APP_TIMEZONE } from "../config/runtime.js";
import { journalDayKey } from "./journalCalendarUtils.js";
import { journalReportWeek, completedJournalWeeks } from "./journalWeeklyReportUtils.js";
import { computeGoalWeeklyReport } from "../../shared/goalWeeklyStats.js";

export const goalReportWeek = journalReportWeek;
export const completedGoalWeeks = completedJournalWeeks;
export const GOAL_REPORT_FIELDS = { title: 1, goalType: 1, priority: 1, startDate: 1, deadline: 1, targetValue: 1, currentValue: 1,
  deletedAt: 1, archivedReason: 1, createdAt: 1, updatedAt: 1, subgoals: 1, activityLogs: 1 };
export const goalReportFilter = (userId, days) => ({ userId, $or: [{ createdAt: { $lte: new Date(`${days.at(-1)}T23:59:59.999`) } }, { createdAt: null }] });
// Numeric snapshots may precede the 12-week picker window or provide the next
// event's previous value. Do not cut away that evidence with a lower date bound.
export const goalProgressFilter = (userId, goalIds) => ({ userId, goalId: { $in: goalIds } });
export function buildGoalWeeklyReport(goals, logs, days) {
  const now = new Date();
  return { ...computeGoalWeeklyReport(goals, logs, days, { today: journalDayKey(now), now: now.getTime(), timezone: APP_TIMEZONE }), timezone: APP_TIMEZONE, serverNow: now.toISOString() };
}
export function goalAiContext(report) {
  const { id, date, asOf, status, stats, weeklyScore, historyNote } = report;
  return { id, date, asOf, status, stats, weeklyScore, historyNote,
    goalStats: report.goals.map(({ type, priority, progress, expected, isCompleted, total, completed, completedThisWeek, progressUpdatesThisWeek, historyLimited, risk }) =>
      ({ type, priority, progress, expected, isCompleted, total, completed, completedThisWeek, progressUpdatesThisWeek, historyLimited, risk }))
      .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))) };
}
export const goalReportFingerprint = report => createHash("sha256").update(JSON.stringify({ version: 1, ...goalAiContext(report) })).digest("hex");
