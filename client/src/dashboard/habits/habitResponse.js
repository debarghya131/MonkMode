import { validReportDay } from "../../../../shared/journalWeeklyStats.js";
import { habitClock } from "./habitUtils.js";

const object = value => Boolean(value && typeof value === "object" && !Array.isArray(value));
const text = value => typeof value === "string";
const optional = (value, test) => value === undefined || test(value);
const nullable = (value, test) => value === null || test(value);
const timestamp = value => text(value) && Number.isFinite(Date.parse(value));
const date = value => text(value) && (validReportDay(value) || (/^\d{4}-\d{2}-\d{2}T/.test(value) && validReportDay(value.slice(0, 10)) && timestamp(value)));
const count = value => Number.isSafeInteger(value) && value >= 0;
const time = value => text(value) && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
const days = value => Array.isArray(value) && value.every(day => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].includes(day)) && new Set(value).size === value.length;
export const habitResponseId = value => object(value) && (value._id || value.id);
const id = value => text(habitResponseId(value)) && Boolean(habitResponseId(value).trim());
const windowFields = value => ["startDate", "endDate"].every(key => optional(value[key], item => nullable(item, date)))
  && optional(value.deletedAt, item => nullable(item, timestamp)) && optional(value.createdAt, timestamp) && optional(value.updatedAt, timestamp)
  && optional(value.archivedReason, item => [null, "ended", "deleted"].includes(item));
const stats = value => ["currentStreak", "maxStreak", "streakBreaks"].every(key => count(value[key]));

export function validHabit(value) {
  return object(value) && id(value) && text(value.title) && Boolean(value.title.trim()) && text(value.category) && Boolean(value.category.trim())
    && ["High", "Medium", "Low"].includes(value.priority) && time(value.time)
    && optional(value.repeatType, item => ["daily", "weekdays", "weekend", "7days", "21days"].includes(item))
    && optional(value.frequency, item => ["daily", "weekly"].includes(item))
    && optional(value.timeOfDay, item => [null, "Morning", "Afternoon", "Evening", "Night"].includes(item))
    && ["note", "reason", "description"].every(key => optional(value[key], item => nullable(item, text)))
    && optional(value.targetStreak, item => nullable(item, n => count(n) && n > 0)) && windowFields(value)
    && optional(value.days, days) && optional(value.pendingDays, item => nullable(item, days))
    && optional(value.pendingTime, item => nullable(item, time))
    && ["timeChangeEffectiveFrom", "daysChangeEffectiveFrom", "deleteUndoExpiresAt"].every(key => optional(value[key], item => nullable(item, timestamp)))
    && ["completedToday", "isImportant", "canUndoDelete"].every(key => optional(value[key], item => typeof item === "boolean"))
    && ["currentStreak", "maxStreak", "streakBreaks", "deleteUndoRemainingMs"].every(key => optional(value[key], count))
    && optional(value.activityLogs, logs => Array.isArray(logs) && logs.every(log => object(log) && text(log.title) && timestamp(log.at)
      && ["created", "edited", "deleted", "ended", "restored"].includes(log.action)))
    && Boolean(value.startDate || value.createdAt);
}
export const validHabits = data => Array.isArray(data) && data.every(value => validHabit(value) && stats(value) && typeof value.completedToday === "boolean")
  && new Set(data.map(habitResponseId)).size === data.length;
export function validHabitTracking(data, year, month) {
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return Array.isArray(data) && data.every(value => object(value) && id(value) && text(value.title) && value.title.trim() && windowFields(value)
    && typeof value.isImportant === "boolean" && nullable(value.targetStreak, n => count(n) && n > 0) && stats(value)
    && Array.isArray(value.completedDays) && value.completedDays.every(day => count(day) && day >= 1 && day <= lastDay)
    && new Set(value.completedDays).size === value.completedDays.length) && new Set(data.map(habitResponseId)).size === data.length;
}
export function validHabitConsistency(data) {
  if (!object(data) || !validReportDay(data.date) || !text(data.timezone)
    || !["completedToday", "expectedToday", "totalCompletedLifetime", "totalExpectedLifetime", "fullCompletionStreakDays"].every(key => count(data[key]))
    || data.completedToday > data.expectedToday || data.totalCompletedLifetime > data.totalExpectedLifetime
    || typeof data.lifetimeConsistency !== "number" || !Number.isFinite(data.lifetimeConsistency) || data.lifetimeConsistency < 0 || data.lifetimeConsistency > 100) return false;
  try { habitClock(new Date(), data.timezone); return optional(data.serverNow, value => timestamp(value) && habitClock(new Date(value), data.timezone).date === data.date); }
  catch { return false; }
}
export const validHabitYears = data => object(data) && Array.isArray(data.years) && data.years.every(year => count(year) && year >= 1970 && year <= 3000)
  && new Set(data.years).size === data.years.length;
export const validHabitCompletion = (data, id, day, completed) => object(data) && data.habitId === id && data.dayKey === day && data.completed === completed;
export const validHabitImportant = (data, id, next) => object(data) && data.habitId === id && data.isImportant === next && timestamp(data.updatedAt);
export const validHabitDeletion = (data, id) => object(data) && validHabit(data.habit) && habitResponseId(data.habit) === id && Boolean(data.habit.deletedAt);
export const habitFailureMessage = (error, fallback) => text(error?.response?.data?.message) && error.response.data.message.trim() ? error.response.data.message : fallback;
export const habitRevision = value => value?.updatedAt ? { expectedUpdatedAt: value.updatedAt } : {};
export const uncertainHabitWrite = (error, acknowledged = false) => acknowledged || !error.response || error.response.status === 409 || error.response.status >= 500;
