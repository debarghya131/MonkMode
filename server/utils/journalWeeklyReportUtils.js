import { createHash } from "node:crypto";
import { journalDayKey, journalWeekDays, parseJournalDayKey } from "./journalCalendarUtils.js";
import { computeJournalWeeklyStats, reportDayLabel, reportWeekLabel, shiftReportDay } from "../../shared/journalWeeklyStats.js";
import { APP_TIMEZONE } from "../config/runtime.js";

export function journalReportWeek(week) {
  if (week !== undefined && !parseJournalDayKey(week)) throw Object.assign(new Error("Invalid week: use a valid YYYY-MM-DD date"), { status: 400 });
  const days = journalWeekDays(week);
  if (days[0] > journalDayKey()) throw Object.assign(new Error("Future weeks cannot be reported yet"), { status: 400 });
  return days;
}

export function buildJournalWeeklyReport(entries, reasons, account, days) {
  const today = journalDayKey();
  const joined = account?.createdAt ? journalDayKey(account.createdAt) : "0000-00-00";
  // Existing owned history can predate account metadata after an import or
  // identity migration. Preserve it, without inventing pre-account missed days.
  const relevant = entries.filter(entry => entry.dayKey <= today);
  const logged = new Set(relevant.map(entry => entry.dayKey));
  const eligible = days.filter(day => logged.has(day) || (day >= joined && day < today));
  const computed = computeJournalWeeklyStats(relevant, days, eligible.length);
  const reasonMap = new Map(reasons.map(reason => [reason.dayKey, reason.reason]));
  const missedDays = eligible.filter(day => !logged.has(day)).map(day => ({ date: day, label: reportDayLabel(day), note: "No journal submitted", reason: reasonMap.get(day) || null }));
  return { id: days[0], date: reportWeekLabel(days), signal: `${computed.loggedDays} logged days`, status: days[6] < today ? "Ready" : "Draft", ...computed, missedDays, timezone: APP_TIMEZONE, serverNow: new Date().toISOString() };
}

export const journalReportFingerprint = report => createHash("sha256").update(JSON.stringify({ version: 2, id: report.id, loggedDays: report.loggedDays, expectedDays: report.expectedDays, topMood: report.topMood, longestStreak: report.longestStreak, stats: report.stats, missedDays: report.missedDays })).digest("hex");
export const completedJournalWeeks = () => {
  const current = journalWeekDays()[0];
  return Array.from({ length: 12 }, (_, index) => journalWeekDays(shiftReportDay(current, -(index + 1) * 7)));
};
