import { validReportDay } from "../../../../shared/journalWeeklyStats.js";
import { todoReportDay } from "../../../../shared/todoWeeklyStats.js";

export const validCount = value => Number.isSafeInteger(value) && value >= 0;
const text = value => typeof value === "string";
const optional = (value, predicate) => value === undefined || predicate(value);
const score = value => value === null || (typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100);
const fields = value => Array.isArray(value) && value.every(item => item && text(item.title)
  && optional(item.description, text) && optional(item.answer, text));
const time = value => text(value) && /^(|(?:[01]\d|2[0-3]):[0-5]\d)$/.test(value);

export function validJournalSummary(data) {
  if (!data || !validReportDay(data.date) || typeof data.timezone !== "string"
    || typeof data.todayLogged !== "boolean" || !["daysThisWeek", "achievementsThisWeek", "winsThisWeek",
      "lifetimeLoggedDays", "lifetimeExpectedDays", "currentStreakDays"].every(key => validCount(data[key]))
    || data.daysThisWeek > 7 || !score(data.lifetimeConsistency) || data.lifetimeConsistency === null
    || data.lifetimeLoggedDays > data.lifetimeExpectedDays) return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: data.timezone });
    return data.serverNow === undefined || (text(data.serverNow) && Number.isFinite(Date.parse(data.serverNow))
      && todoReportDay(data.serverNow, data.timezone) === data.date);
  } catch { return false; }
}

export function validJournalEntry(entry) {
  return Boolean(entry && typeof entry === "object" && !Array.isArray(entry)
    && optional(entry._id, value => text(value) && value.length > 0)
    && (validReportDay(entry.dayKey) || (entry.dayKey === undefined && text(entry.date) && Number.isFinite(Date.parse(entry.date))))
    && optional(entry.date, value => text(value) && Number.isFinite(Date.parse(value)))
    && optional(entry.updatedAt, value => text(value) && Number.isFinite(Date.parse(value)))
    && ["mood", "summary", "content", "insight", "affirmation", "tomorrowPlan"].every(key => optional(entry[key], text))
    && ["wakeUpTime", "sleepTime"].every(key => optional(entry[key], time))
    && ["energyLevel", "overallRating"].every(key => optional(entry[key], score))
    && ["wins", "mistakes", "gratitude", "achievement", "distractions"].every(key => optional(entry[key], value => Array.isArray(value) && value.every(text)))
    && optional(entry.customFields, value => fields(value) && value.every(item => text(item.answer))));
}

export function journalEntries(data) { return Array.isArray(data) ? data : data?.entries; }
export function validJournalEntries(data, page) {
  const entries = journalEntries(data);
  if (!Array.isArray(entries) || !entries.every(validJournalEntry)) return false;
  if (page !== undefined) return !Array.isArray(data) && data.page === page && validCount(data.limit) && data.limit > 0
    && validCount(data.total) && validCount(data.totalPages) && data.totalPages === Math.max(1, Math.ceil(data.total / data.limit))
    && entries.length <= data.limit && entries.length <= data.total;
  return true;
}
export const validJournalTemplates = data => Boolean(data && fields(data.templates) && data.templates.every(item => item.title.trim()));
export const validJournalMissedDays = data => Array.isArray(data) && data.every(day => day && validReportDay(day.date)
  && text(day.label) && optional(day.reason, value => value === null || text(value)))
  && new Set(data.map(day => day.date)).size === data.length;
export const journalFailureMessage = (error, fallback) => {
  const body = error?.response?.data;
  return [body?.message, body?.error].find(value => text(value) && value.trim()) || fallback;
};
