import { validReportDay } from "../../../../shared/journalWeeklyStats.js";
import { todoClock } from "./todoUtils.js";

const object = value => Boolean(value && typeof value === "object" && !Array.isArray(value));
const text = value => typeof value === "string";
const optional = (value, test) => value === undefined || test(value);
const nullable = (value, test) => value === null || test(value);
const timestamp = value => text(value) && Number.isFinite(Date.parse(value));
const time = value => text(value) && /^(|(?:[01]\d|2[0-3]):[0-5]\d)$/.test(value);
const count = value => Number.isSafeInteger(value) && value >= 0;
const days = value => Array.isArray(value) && value.every(day => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].includes(day)) && new Set(value).size === value.length;
const status = value => ["completed", "pending", "missed"].includes(value);
const totals = value => object(value) && ["total", "completed", "pending", "missed"].every(key => count(value[key])) && value.total === value.completed + value.pending + value.missed;

export function validTodo(task) {
  return object(task) && text(task.id) && Boolean(task.id.trim()) && text(task.title) && Boolean(task.title.trim())
    && optional(task.description, text) && optional(task.note, text) && text(task.category) && Boolean(task.category.trim())
    && ["High", "Medium", "Low"].includes(task.priority) && ["once", "daily", "weekdays", "weekend"].includes(task.repeatType)
    && time(task.time) && Boolean(task.time)
    && ["date", "startDate", "endDate"].every(key => optional(task[key], value => nullable(value, validReportDay)))
    && (task.repeatType === "once" ? validReportDay(task.date) : validReportDay(task.startDate))
    && (!task.endDate || task.endDate >= (task.startDate || task.date))
    && optional(task.days, days) && optional(task.pendingDays, days) && optional(task.pendingTime, time)
    && ["timeChangeEffectiveFrom", "daysChangeEffectiveFrom", "deletedAt", "deleteUndoExpiresAt"].every(key => optional(task[key], value => nullable(value, timestamp)))
    && ["createdAt", "updatedAt"].every(key => optional(task[key], timestamp))
    && ["completed", "neverEnds", "archived", "scheduled", "canUndoDelete", "lateCompleted"].every(key => optional(task[key], value => typeof value === "boolean"))
    && optional(task.status, value => status(value) || value === "not_scheduled") && optional(task.completedAt, time)
    && optional(task.deleteUndoRemainingMs, count) && optional(task.auditWarning, text)
    && optional(task.dayStates, value => Array.isArray(value) && value.every(state => object(state) && validReportDay(state.dayKey) && status(state.status)
      && optional(state.completedAt, time) && optional(state.lateCompleted, value => typeof value === "boolean"))
      && new Set(value.map(state => state.dayKey)).size === value.length);
}
export const validTodos = data => Array.isArray(data) && data.every(validTodo) && new Set(data.map(task => task.id)).size === data.length;
export const validTodoStatusResponse = (data, id, date, nextStatus) => validTodo(data) && data.id === id && data.scheduled === true
  && (nextStatus === "completed" ? data.status === "completed" && data.dayStates?.some(state => state.dayKey === date && state.status === "completed")
    : ["pending", "missed"].includes(data.status) && !data.dayStates?.some(state => state.dayKey === date && state.status === "completed"));
export const validTodoDeletion = (data, id) => object(data) && validTodo(data.todo) && data.todo.id === id && Boolean(data.todo.deletedAt) && optional(data.auditWarning, text);

export function validTodoSummary(data) {
  if (!object(data) || !validReportDay(data.date) || !text(data.timezone) || !totals(data.today) || !totals(data.thisWeek) || !totals(data.lifetime)
    || !count(data.importantToday) || data.importantToday > data.today.total || !count(data.fullCompletionStreakDays)
    || !count(data.totalCompletedLifetime) || !count(data.totalExpectedLifetime) || data.totalCompletedLifetime !== data.lifetime.completed
    || data.totalExpectedLifetime !== data.lifetime.total || typeof data.lifetimeConsistency !== "number" || !Number.isFinite(data.lifetimeConsistency)
    || data.lifetimeConsistency < 0 || data.lifetimeConsistency > 100) return false;
  try {
    todoClock(new Date(), data.timezone);
    return data.serverNow === undefined || (timestamp(data.serverNow) && todoClock(new Date(data.serverNow), data.timezone).date === data.date);
  } catch { return false; }
}

export const validTodoPreferences = data => object(data) && ["categories", "importantCategories"].every(key => Array.isArray(data[key])
  && data[key].every(name => text(name) && name.trim() && name.length <= 80)
  && new Set(data[key].map(name => name.toLowerCase())).size === data[key].length);

export const validTodoLogs = data => Array.isArray(data) && data.every(log => object(log) && text(log.id) && log.id.trim() && text(log.title)
  && validReportDay(log.date) && time(log.time) && optional(log.action, action => ["created", "edited", "deleted", "restored", "ended"].includes(action))
  && optional(log.logAt, value => nullable(value, timestamp)) && optional(log.todoId, value => nullable(value, text))
  && optional(log.deletedItem, value => nullable(value, validTodo)) && optional(log.canUndoDelete, value => typeof value === "boolean")
  && optional(log.deleteUndoExpiresAt, value => nullable(value, timestamp)) && optional(log.deleteUndoRemainingMs, count));

export const todoFailureMessage = (error, fallback) => {
  const message = error?.response?.data?.message;
  return text(message) && message.trim() ? message : fallback;
};
export const todoRevision = task => task?.updatedAt ? { expectedUpdatedAt: task.updatedAt } : {};
export const uncertainTodoWrite = (error, acknowledged = false) => acknowledged || !error.response || error.response.status === 409 || error.response.status >= 500;
