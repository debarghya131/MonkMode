import { validReportDay } from "../../../../shared/journalWeeklyStats.js";
import { goalDayKey } from "./goalUtils.js";

const object = value => Boolean(value && typeof value === "object" && !Array.isArray(value));
const text = value => typeof value === "string";
const optional = (value, check) => value === undefined || check(value);
const nullable = (value, check) => value === null || check(value);
const timestamp = value => text(value) && Number.isFinite(Date.parse(value));
const date = value => text(value) && (validReportDay(value) || (/^\d{4}-\d{2}-\d{2}T/.test(value) && validReportDay(value.slice(0, 10)) && timestamp(value)));
const count = value => Number.isSafeInteger(value) && value >= 0;
const number = value => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= Number.MAX_SAFE_INTEGER;
const rate = value => number(value) && value <= 100;
const unique = values => new Set(values).size === values.length;
export const goalResponseId = value => object(value) && (value.id || value._id);
const id = value => text(goalResponseId(value)) && Boolean(goalResponseId(value).trim());
const actions = new Set(["created", "edited", "deleted", "restored", "ended", "progress_updated", "important_toggled", "subgoal_added", "subgoal_updated", "subgoal_completed", "subgoal_reopened", "subgoal_deleted"]);
const undo = value => optional(value.canUndoDelete, flag => typeof flag === "boolean")
  && optional(value.deleteUndoExpiresAt, at => nullable(at, timestamp)) && optional(value.deleteUndoRemainingMs, count);
const milestone = value => object(value) && id(value) && text(value.title) && value.title.trim() && date(value.deadline) && typeof value.completed === "boolean";
export function validGoal(value) {
  if (!object(value) || !id(value) || !text(value.title) || !value.title.trim() || !text(value.description)
    || !["short-term", "long-term"].includes(value.goalType) || !["High", "Medium", "Low"].includes(value.priority)
    || !number(value.targetValue) || !number(value.currentValue) || typeof value.isImportant !== "boolean"
    || !nullable(value.startDate, date) || !nullable(value.deadline, date)
    || !optional(value.deletedAt, at => nullable(at, timestamp)) || !optional(value.archivedReason, reason => [null, "deleted"].includes(reason))
    || !["Active", "Archived"].includes(value.status) || ![null, "ended", "deleted"].includes(value.archiveReason)
    || !["createdAt", "updatedAt"].every(key => optional(value[key], timestamp)) || !undo(value)
    || !optional(value.warning, text) || !Array.isArray(value.milestones) || !value.milestones.every(milestone)
    || !unique(value.milestones.map(goalResponseId))) return false;
  if (!optional(value.subgoals, rows => Array.isArray(rows) && rows.every(row => milestone(row) && optional(row.completedAt, at => nullable(at, timestamp))) && unique(rows.map(goalResponseId)))) return false;
  if (!optional(value.activityLogs, rows => Array.isArray(rows) && rows.every(row => object(row) && text(row.title) && timestamp(row.at) && actions.has(row.action)))) return false;
  const progress = value.subgoalProgress;
  const completed = value.milestones.filter(row => row.completed).length;
  return object(progress) && ["total", "completed", "pending"].every(key => count(progress[key])) && rate(progress.completionPercentage)
    && progress.total === value.milestones.length && progress.completed === completed && progress.pending === progress.total - completed
    && progress.completionPercentage === (progress.total ? Math.round(completed / progress.total * 100) : 0);
}
export const validGoals = values => Array.isArray(values) && values.every(validGoal) && unique(values.map(goalResponseId));
export function validGoalSummary(value) {
  if (!object(value) || !validReportDay(value.date) || !text(value.timezone) || !timestamp(value.serverNow)
    || !["totalGoals", "activeGoals", "archivedGoals", "completedGoals", "pendingGoals", "totalSubgoals", "completedSubgoals", "pendingSubgoals"].every(key => count(value[key]))
    || !rate(value.goalCompletionRate) || !rate(value.subgoalCompletionRate)
    || value.activeGoals + value.archivedGoals !== value.totalGoals || value.completedGoals + value.pendingGoals !== value.totalGoals
    || value.completedSubgoals + value.pendingSubgoals !== value.totalSubgoals) return false;
  try { return goalDayKey(value.serverNow, value.timezone) === value.date; } catch { return false; }
}
export const validGoalLogs = values => Array.isArray(values) && unique(values.map(value => value?.id)) && values.every(value => object(value)
  && text(value.id) && value.id.trim() && text(value.goalId) && value.goalId.trim() && text(value.title) && actions.has(value.action)
  && timestamp(value.at) && validReportDay(value.date) && text(value.time) && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value.time) && undo(value));
export function validGoalConfirmation(data, method, path, body = {}, previous = [], timezone) {
  if (!object(data) || !optional(data.warning, text)) return false;
  const goal = data.goal || data;
  if (!validGoal(goal)) return false;
  const expectedId = path.split("/")[2];
  const confirmedId = goalResponseId(goal);
  if (expectedId && confirmedId !== expectedId) return false;
  if (!expectedId && previous.some(item => goalResponseId(item) === confirmedId)) return false;
  if (method === "delete" && !path.includes("/subgoals/")) return Boolean(data.goal && goal.deletedAt);
  if (path.endsWith("/restore")) return !goal.deletedAt;
  if (path.endsWith("/important")) return goal.isImportant === body.isImportant;
  if (path.includes("/subgoals/")) {
    const subgoalId = path.split("/")[4];
    const row = goal.milestones.find(item => goalResponseId(item) === subgoalId);
    return method === "delete" ? !row : Boolean(row && row.completed === body.completed);
  }
  if (path.endsWith("/subgoals")) {
    const before = previous.find(item => goalResponseId(item) === expectedId);
    return Boolean(before && goal.milestones.some(row => !before.milestones.some(old => goalResponseId(old) === goalResponseId(row))
      && row.title === body.title.trim() && goalDayKey(row.deadline, timezone) === goalDayKey(body.deadline, timezone)));
  }
  return ["title", "description", "goalType", "priority", "currentValue", "targetValue"].every(key => body[key] === undefined || goal[key] === body[key])
    && ["startDate", "deadline"].every(key => body[key] === undefined || goalDayKey(goal[key], timezone) === goalDayKey(body[key], timezone));
}
export const goalFailureMessage = (error, fallback) => text(error?.response?.data?.message) && error.response.data.message.trim() ? error.response.data.message
  : text(error?.message) && error.message.trim() ? error.message : fallback;
export const goalRevision = goal => goal?.updatedAt ? { expectedUpdatedAt: goal.updatedAt } : {};
