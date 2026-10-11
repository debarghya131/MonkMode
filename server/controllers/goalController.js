import Goal from "../models/Goal.js";
import GoalProgressLog from "../models/GoalProgressLog.js";
import mongoose from "mongoose";
import User from "../models/User.js";
import { journalMonthDays } from "../../shared/journalAnalysisStats.js";
import { validReportDay } from "../../shared/journalWeeklyStats.js";
import { todoReportDay } from "../../shared/todoWeeklyStats.js";
import { computeGoalAnalysis, GOAL_ANALYSIS_NOTE } from "../../shared/goalAnalysisStats.js";
import { GOAL_REPORT_FIELDS, goalProgressFilter } from "../utils/goalWeeklyReportUtils.js";
import { APP_TIMEZONE } from "../config/runtime.js";
import { retainGoalActivityLogs } from "../utils/goalActivityUtils.js";
import {
  buildSubgoalActivityTitle,
  GOAL_ACTIVITY_TIMEZONE
} from "../utils/goalActivityUtils.js";

const VALID_PRIORITIES = new Set(["High", "Medium", "Low"]);
const VALID_GOAL_TYPES = new Set(["short-term", "long-term"]);
const VALID_VIEWS = new Set(["all", "active", "archived"]);
const MAX_ACTIVITY_LOGS = 200;
const MIN_SHORT_TERM_DAYS = 7;
const MIN_LONG_TERM_MONTHS = 3;
const DELETE_UNDO_WINDOW_MS = 48 * 60 * 60 * 1000;

const getStartOfDay = (value = new Date()) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const toDayKey = (value = new Date()) => {
  const date = getStartOfDay(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const toTimeKey = (value = new Date()) => {
  const date = new Date(value);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
};

const parseDateInput = (value) => {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return new Date(value);

  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}/.test(value) && !validReportDay(value.slice(0, 10))) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [year, month, day] = value.split("-").map((part) => Number.parseInt(part, 10));
      if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
      const parsed = new Date(year, month - 1, day);
      if (
        parsed.getFullYear() !== year ||
        parsed.getMonth() !== month - 1 ||
        parsed.getDate() !== day
      ) {
        return null;
      }
      return parsed;
    }
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  return null;
};

const getMinimumDeadlineForGoalType = (startDate, goalType) => {
  const baseDate = getStartOfDay(startDate);
  if (goalType === "long-term") {
    const minLongTerm = new Date(baseDate);
    minLongTerm.setMonth(minLongTerm.getMonth() + MIN_LONG_TERM_MONTHS);
    return minLongTerm;
  }

  const minShortTerm = new Date(baseDate);
  minShortTerm.setDate(minShortTerm.getDate() + MIN_SHORT_TERM_DAYS);
  return minShortTerm;
};

const hasGoalStarted = (startDate, now = new Date()) => {
  if (!startDate) return false;
  return getStartOfDay(startDate) <= getStartOfDay(now);
};

const getDeleteUndoMeta = (deletedAt, now = new Date()) => {
  if (!deletedAt) {
    return {
      canUndoDelete: false,
      deleteUndoExpiresAt: null,
      deleteUndoRemainingMs: 0
    };
  }

  const deletedAtDate = new Date(deletedAt);
  if (Number.isNaN(deletedAtDate.getTime())) {
    return {
      canUndoDelete: false,
      deleteUndoExpiresAt: null,
      deleteUndoRemainingMs: 0
    };
  }

  const expiresAt = new Date(deletedAtDate.getTime() + DELETE_UNDO_WINDOW_MS);
  const remainingMs = Math.max(0, expiresAt.getTime() - now.getTime());

  return {
    canUndoDelete: remainingMs > 0,
    deleteUndoExpiresAt: expiresAt.toISOString(),
    deleteUndoRemainingMs: remainingMs
  };
};

const buildActivityLogEntry = (action, title, at = new Date(), extra = {}) => ({
  action,
  title: title || "Untitled",
  at,
  ...extra
});

const appendActivityLog = (goal, entry) => {
  const currentLogs = Array.isArray(goal.activityLogs) ? [...goal.activityLogs] : [];
  currentLogs.push(entry);
  goal.activityLogs = retainGoalActivityLogs(currentLogs, MAX_ACTIVITY_LOGS);
};

const getGoalStatus = (goal, today = getStartOfDay(new Date())) => {
  if (goal?.deletedAt) return "Archived";
  if (!goal?.deadline) return "Active";
  return getStartOfDay(goal.deadline) < today ? "Archived" : "Active";
};

const buildMilestonesFromSubgoals = (subgoals = []) =>
  (Array.isArray(subgoals) ? subgoals : []).map((subgoal) => ({
    id: String(subgoal?._id || ""),
    title: subgoal?.title || "",
    deadline: subgoal?.deadline
      ? toDayKey(subgoal.deadline)
      : "",
    completed: Boolean(subgoal?.completed)
  }));

const buildSubgoalProgressSummary = (goal) => {
  const milestones = buildMilestonesFromSubgoals(goal?.subgoals || []);
  const total = milestones.length;
  const completed = milestones.filter((item) => item.completed).length;
  const pending = Math.max(0, total - completed);
  const completionPercentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return {
    total,
    completed,
    pending,
    completionPercentage
  };
};

const serializeGoal = (goal, today = getStartOfDay(new Date())) => {
  const raw = typeof goal?.toObject === "function" ? goal.toObject() : goal;
  const milestones = buildMilestonesFromSubgoals(raw?.subgoals || []);
  const subgoalProgress = buildSubgoalProgressSummary(raw);
  const deleteUndoMeta = getDeleteUndoMeta(raw?.deletedAt);
  const archiveReason = raw?.deletedAt ? "deleted" : (getGoalStatus(raw, today) === "Archived" ? "ended" : null);
  return {
    ...raw,
    activityLogs: (raw.activityLogs || []).slice(-MAX_ACTIVITY_LOGS),
    ...(goal.progressLogWarning ? { warning: goal.progressLogWarning } : {}),
    status: getGoalStatus(raw, today),
    milestones,
    subgoalProgress,
    archiveReason,
    ...deleteUndoMeta
  };
};

// Goal and its embedded activity are already durable; a secondary audit failure
// must not report the successful mutation as failed (and invite duplicate retries).
const recordProgressLog = async (goal, payload) => {
  try { await GoalProgressLog.create(payload); }
  catch {
    goal.progressLogWarning = "Goal saved, but its progress audit log could not be recorded.";
    console.warn(goal.progressLogWarning);
  }
};

const isValidGoalId = (id) => mongoose.Types.ObjectId.isValid(id);

const checkGoalRevision = (goal, req) => {
  const expected = req.body?.expectedUpdatedAt;
  if (expected === undefined) return;
  if (typeof expected !== "string" || !Number.isFinite(Date.parse(expected))) throw Object.assign(new Error("expectedUpdatedAt must be a valid timestamp"), { status: 400 });
  if (!goal.updatedAt || Date.parse(expected) !== new Date(goal.updatedAt).getTime()) throw Object.assign(new Error("This goal changed in another request. Reload goals before trying again."), { status: 409 });
};
const saveGoal = async (goal, req) => {
  checkGoalRevision(goal, req);
  if (goal.updatedAt) {
    const revision = new Date(goal.updatedAt);
    goal.$where = { userId: new mongoose.Types.ObjectId(req.user.id), updatedAt: revision };
    goal.updatedAt = new Date(Math.max(Date.now(), revision.getTime() + 1));
    await goal.save({ timestamps: false });
  } else await goal.save();
};
const goalFailure = (res, error) => {
  if ([400, 409].includes(error.status)) return res.status(error.status).json({ message: error.message });
  if (["DocumentNotFoundError", "VersionError"].includes(error.name)) return res.status(409).json({ message: "This goal changed in another request. Reload goals before trying again." });
  if (["ValidationError", "CastError"].includes(error.name)) return res.status(400).json({ message: "Invalid goal values. Please check the form." });
  return res.status(503).json({ message: "The goal request could not be confirmed. Reload goals before trying again." });
};
const validProgressNumber = value => ["string", "number"].includes(typeof value) && (typeof value !== "string" || value.trim().length > 0) && Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= Number.MAX_SAFE_INTEGER;

const applySubgoalProgressToGoal = (goal, wasCompleted) => {
  const summary = buildSubgoalProgressSummary(goal);
  const previousValue = Number(goal.currentValue) || 0;
  const previousTargetValue = Number(goal.targetValue) || 0;

  goal.currentValue = summary.completed;
  if (previousTargetValue <= 0 || previousTargetValue < summary.total) {
    goal.targetValue = summary.total;
  }

  const nextValue = Number(goal.currentValue) || 0;
  const isCompleted = isGoalCompleted(goal);

  return {
    previousValue,
    nextValue,
    changed: previousValue !== nextValue || (wasCompleted !== undefined && wasCompleted !== isCompleted),
    wasCompleted: Boolean(wasCompleted),
    isCompleted
  };
};

const isGoalCompleted = (goal) => {
  const subgoalSummary = buildSubgoalProgressSummary(goal);
  if (subgoalSummary.total > 0) {
    return subgoalSummary.completed >= subgoalSummary.total;
  }

  const targetValue = Number(goal?.targetValue) || 0;
  const currentValue = Number(goal?.currentValue) || 0;
  return targetValue > 0 && currentValue >= targetValue;
};

export const createGoal = async (req, res) => {
  try {
    const {
      title,
      description,
      goalType,
      priority,
      startDate,
      deadline,
      targetValue,
      currentValue,
      isImportant
    } = req.body;

    if (typeof title !== "string" || !title.trim()) {
      return res.status(400).json({ message: "Title is required" });
    }

    const normalizedTitle = title.trim();
    if (normalizedTitle.length > 180) return res.status(400).json({ message: "Goal title must be 180 characters or fewer" });

    let normalizedDescription = "";
    if (description != null) {
      if (typeof description !== "string") {
        return res.status(400).json({ message: "Description must be a string" });
      }
      normalizedDescription = description.trim();
      if (normalizedDescription.length > 2500) return res.status(400).json({ message: "Description must be 2500 characters or fewer" });
    }

    const normalizedGoalType = goalType || "short-term";
    if (!VALID_GOAL_TYPES.has(normalizedGoalType)) {
      return res.status(400).json({ message: "goalType must be short-term or long-term" });
    }

    const normalizedPriority = priority || "Medium";
    if (!VALID_PRIORITIES.has(normalizedPriority)) {
      return res.status(400).json({ message: "Priority must be High, Medium, or Low" });
    }

    const parsedStartDate = startDate == null || startDate === ""
      ? getStartOfDay(new Date())
      : parseDateInput(startDate);
    if (startDate !== undefined && startDate !== null && startDate !== "" && !parsedStartDate) {
      return res.status(400).json({ message: "startDate must be a valid date" });
    }
    if (getStartOfDay(parsedStartDate) < getStartOfDay()) return res.status(400).json({ message: "New goals cannot start in the past." });

    const parsedDeadline = parseDateInput(deadline);
    if (deadline != null && deadline !== "" && !parsedDeadline) {
      return res.status(400).json({ message: "deadline must be a valid date" });
    }
    if (!parsedDeadline) {
      return res.status(400).json({ message: "deadline is required" });
    }

    if (parsedStartDate && parsedDeadline && parsedDeadline < getStartOfDay(parsedStartDate)) {
      return res.status(400).json({ message: "Deadline cannot be before startDate" });
    }

    if (parsedStartDate && parsedDeadline) {
      const minimumDeadline = getMinimumDeadlineForGoalType(parsedStartDate, normalizedGoalType);
      if (parsedDeadline < minimumDeadline) {
        return res.status(400).json({
          message: normalizedGoalType === "long-term"
            ? "Long-term goal deadline must be at least 3 months after startDate"
            : "Short-term goal deadline must be at least 1 week after startDate"
        });
      }
    }

    const normalizedTargetValue = targetValue == null || targetValue === ""
      ? 100
      : Number(targetValue);
    if (!validProgressNumber(targetValue == null || targetValue === "" ? normalizedTargetValue : targetValue)) {
      return res.status(400).json({ message: "targetValue must be a valid non-negative number" });
    }

    const normalizedCurrentValue = currentValue == null || currentValue === ""
      ? 0
      : Number(currentValue);
    if (!validProgressNumber(currentValue == null || currentValue === "" ? normalizedCurrentValue : currentValue)) {
      return res.status(400).json({ message: "currentValue must be a valid non-negative number" });
    }

    if (typeof isImportant !== "undefined" && typeof isImportant !== "boolean") {
      return res.status(400).json({ message: "isImportant must be a boolean" });
    }

    const goal = await Goal.create({
      userId: req.user.id,
      title: normalizedTitle,
      description: normalizedDescription,
      goalType: normalizedGoalType,
      priority: normalizedPriority,
      startDate: parsedStartDate,
      deadline: parsedDeadline,
      targetValue: normalizedTargetValue,
      currentValue: normalizedCurrentValue,
      isImportant: Boolean(isImportant),
      activityLogs: [buildActivityLogEntry("created", normalizedTitle)]
    });

    res.status(201).json(serializeGoal(goal));
  } catch (error) {
    return goalFailure(res, error);
  }
};

export const getGoals = async (req, res) => {
  try {
    const view = req.query.view || "all";

    if (!VALID_VIEWS.has(view)) {
      return res.status(400).json({ message: "view must be all, active, or archived" });
    }

    const today = getStartOfDay(new Date());
    const filter = { userId: req.user.id };

    if (view === "active") {
      filter.deletedAt = null;
      filter.$or = [{ deadline: null }, { deadline: { $gte: today } }];
    } else if (view === "archived") {
      filter.$or = [
        { deletedAt: { $ne: null } },
        { deadline: { $lt: today } }
      ];
    }

    const goals = await Goal.find(filter).sort({ createdAt: -1 });
    res.json(goals.map((goal) => serializeGoal(goal, today)));
  } catch (error) {
    return goalFailure(res, error);
  }
};

export const updateGoal = async (req, res) => {
  try {
    const goalId = req.params.id;
    if (!isValidGoalId(goalId)) {
      return res.status(400).json({ message: "Invalid goal id" });
    }

    const goal = await Goal.findOne({ _id: goalId, userId: req.user.id, deletedAt: null });

    if (!goal) {
      return res.status(404).json({ message: "Goal not found" });
    }

    let hasChanges = false;
    checkGoalRevision(goal, req);
    const previousValue = Number(goal.currentValue) || 0;
    const wasCompleted = isGoalCompleted(goal);

    if (req.body.title !== undefined) {
      if (typeof req.body.title !== "string" || !req.body.title.trim()) {
        return res.status(400).json({ message: "Title is required" });
      }
      const normalizedTitle = req.body.title.trim();
      if (normalizedTitle.length > 180) return res.status(400).json({ message: "Goal title must be 180 characters or fewer" });
      if (goal.title !== normalizedTitle) {
        goal.title = normalizedTitle;
        hasChanges = true;
      }
    }

    if (req.body.description !== undefined) {
      if (req.body.description != null && typeof req.body.description !== "string") {
        return res.status(400).json({ message: "Description must be a string" });
      }
      const normalizedDescription = (req.body.description || "").trim();
      if (normalizedDescription.length > 2500) return res.status(400).json({ message: "Description must be 2500 characters or fewer" });
      if (goal.description !== normalizedDescription) {
        goal.description = normalizedDescription;
        hasChanges = true;
      }
    }

    if (req.body.goalType !== undefined) {
      const nextGoalType = req.body.goalType || "short-term";
      if (!VALID_GOAL_TYPES.has(nextGoalType)) {
        return res.status(400).json({ message: "goalType must be short-term or long-term" });
      }
      if (goal.goalType !== nextGoalType) {
        goal.goalType = nextGoalType;
        hasChanges = true;
      }
    }

    if (req.body.priority !== undefined) {
      const nextPriority = req.body.priority || "Medium";
      if (!VALID_PRIORITIES.has(nextPriority)) {
        return res.status(400).json({ message: "Priority must be High, Medium, or Low" });
      }
      if (goal.priority !== nextPriority) {
        goal.priority = nextPriority;
        hasChanges = true;
      }
    }

    if (req.body.targetValue !== undefined) {
      const nextTargetValue = req.body.targetValue === "" || req.body.targetValue == null
        ? 100
        : Number(req.body.targetValue);
      if (!validProgressNumber(req.body.targetValue == null || req.body.targetValue === "" ? nextTargetValue : req.body.targetValue)) {
        return res.status(400).json({ message: "targetValue must be a valid non-negative number" });
      }
      if (goal.targetValue !== nextTargetValue) {
        goal.targetValue = nextTargetValue;
        hasChanges = true;
      }
    }

    if (req.body.currentValue !== undefined) {
      const nextCurrentValue = req.body.currentValue === "" || req.body.currentValue == null
        ? 0
        : Number(req.body.currentValue);
      if (!validProgressNumber(req.body.currentValue == null || req.body.currentValue === "" ? nextCurrentValue : req.body.currentValue)) {
        return res.status(400).json({ message: "currentValue must be a valid non-negative number" });
      }
      if (goal.currentValue !== nextCurrentValue) {
        goal.currentValue = nextCurrentValue;
        hasChanges = true;
      }
    }

    if (req.body.isImportant !== undefined) {
      if (typeof req.body.isImportant !== "boolean") {
        return res.status(400).json({ message: "isImportant must be a boolean" });
      }
      if (goal.isImportant !== req.body.isImportant) {
        goal.isImportant = req.body.isImportant;
        hasChanges = true;
      }
    }

    const parsedStartDate = req.body.startDate === undefined
      ? goal.startDate
      : parseDateInput(req.body.startDate);
    if (req.body.startDate !== undefined && req.body.startDate !== null && req.body.startDate !== "" && !parsedStartDate) {
      return res.status(400).json({ message: "startDate must be a valid date" });
    }

    const parsedDeadline = req.body.deadline === undefined
      ? goal.deadline
      : parseDateInput(req.body.deadline);
    if (req.body.deadline !== undefined && req.body.deadline !== null && req.body.deadline !== "" && !parsedDeadline) {
      return res.status(400).json({ message: "deadline must be a valid date" });
    }

    const normalizedStartDate = req.body.startDate === undefined
      ? goal.startDate
      : parsedStartDate;
    const normalizedDeadline = req.body.deadline === undefined
      ? goal.deadline
      : parsedDeadline;
    const normalizedGoalType = req.body.goalType === undefined
      ? goal.goalType
      : (req.body.goalType || "short-term");
    const existingStart = getStartOfDay(goal.startDate || goal.createdAt || new Date());

    if (
      req.body.startDate !== undefined &&
      hasGoalStarted(existingStart) &&
      (!normalizedStartDate || existingStart.getTime() !== getStartOfDay(normalizedStartDate).getTime())
    ) {
      return res.status(400).json({ message: "Start date cannot be edited after the goal has started" });
    }
    if (req.body.startDate !== undefined && (!normalizedStartDate || (!hasGoalStarted(existingStart) && getStartOfDay(normalizedStartDate) < getStartOfDay()))) return res.status(400).json({ message: "Rescheduled goals cannot start in the past." });
    if (req.body.deadline !== undefined && !normalizedDeadline) return res.status(400).json({ message: "deadline is required" });
    if ((req.body.startDate !== undefined || req.body.deadline !== undefined) && goal.subgoals.some(subgoal =>
      (normalizedStartDate && getStartOfDay(subgoal.deadline) < getStartOfDay(normalizedStartDate)) || (normalizedDeadline && getStartOfDay(subgoal.deadline) > getStartOfDay(normalizedDeadline)))) {
      return res.status(400).json({ message: "Goal dates must contain all existing subgoal deadlines." });
    }
    if (goal.subgoals.length && (req.body.currentValue !== undefined || req.body.targetValue !== undefined)) return res.status(400).json({ message: "Use milestone completion to update a goal with subgoals." });

    if (
      normalizedStartDate &&
      normalizedDeadline &&
      normalizedDeadline < getStartOfDay(normalizedStartDate)
    ) {
      return res.status(400).json({ message: "Deadline cannot be before startDate" });
    }

    if (normalizedStartDate && normalizedDeadline) {
      const minimumDeadline = getMinimumDeadlineForGoalType(normalizedStartDate, normalizedGoalType);
      if (normalizedDeadline < minimumDeadline) {
        return res.status(400).json({
          message: normalizedGoalType === "long-term"
            ? "Long-term goal deadline must be at least 3 months after startDate"
            : "Short-term goal deadline must be at least 1 week after startDate"
        });
      }
    }

    if (req.body.startDate !== undefined && String(goal.startDate || "") !== String(normalizedStartDate || "")) {
      goal.startDate = normalizedStartDate;
      hasChanges = true;
    }

    if (req.body.deadline !== undefined && String(goal.deadline || "") !== String(normalizedDeadline || "")) {
      goal.deadline = normalizedDeadline;
      hasChanges = true;
    }

    if (!hasChanges) {
      return res.json(serializeGoal(goal));
    }

    appendActivityLog(goal, buildActivityLogEntry("edited", goal.title));
    await saveGoal(goal, req);
    const completedNow = isGoalCompleted(goal);
    if (previousValue !== Number(goal.currentValue) || wasCompleted !== completedNow) await recordProgressLog(goal, {
      userId: req.user.id, goalId: goal._id, previousValue, currentValue: goal.currentValue,
      delta: goal.currentValue - previousValue, completedGoal: !wasCompleted && completedNow, date: new Date()
    });

    res.json(serializeGoal(goal));
  } catch (error) {
    return goalFailure(res, error);
  }
};

export const updateGoalProgress = async (req, res) => {
  try {
    const goalId = req.params.id;
    if (!isValidGoalId(goalId)) {
      return res.status(400).json({ message: "Invalid goal id" });
    }

    const { currentValue } = req.body;

    if (currentValue == null) {
      return res.status(400).json({ message: "currentValue is required" });
    }

    const parsedCurrentValue = Number(currentValue);
    if (!validProgressNumber(currentValue)) {
      return res.status(400).json({ message: "currentValue must be a valid non-negative number" });
    }

    let resolvedDate = new Date();
    if (req.body?.date != null) {
      resolvedDate = parseDateInput(req.body.date);
      if (!resolvedDate) {
        return res.status(400).json({ message: "date must be a valid date" });
      }
    }
    if (getStartOfDay(resolvedDate) > getStartOfDay()) return res.status(400).json({ message: "Progress cannot be dated in the future." });

    const goal = await Goal.findOne({ _id: goalId, userId: req.user.id, deletedAt: null });

    if (!goal) {
      return res.status(404).json({ message: "Goal not found" });
    }

    const previousValue = Number(goal.currentValue) || 0;
    checkGoalRevision(goal, req);
    if (goal.subgoals.length) return res.status(400).json({ message: "Use milestone completion to update a goal with subgoals." });
    if (getStartOfDay(resolvedDate) < getStartOfDay(goal.startDate || goal.createdAt || new Date())) return res.status(400).json({ message: "Progress cannot be dated before the goal starts." });
    const wasCompleted = isGoalCompleted(goal);
    goal.currentValue = parsedCurrentValue;
    const isCompleted = isGoalCompleted(goal);

    appendActivityLog(goal, buildActivityLogEntry("progress_updated", goal.title, resolvedDate));
    await saveGoal(goal, req);

    await recordProgressLog(goal, {
      userId: req.user.id,
      goalId: goal._id,
      previousValue,
      currentValue: parsedCurrentValue,
      delta: parsedCurrentValue - previousValue,
      completedGoal: !wasCompleted && isCompleted,
      date: resolvedDate
    });

    res.json(serializeGoal(goal));
  } catch (error) {
    return goalFailure(res, error);
  }
};

export const addGoalSubgoal = async (req, res) => {
  try {
    const goalId = req.params.id;
    if (!isValidGoalId(goalId)) {
      return res.status(400).json({ message: "Invalid goal id" });
    }

    const title = typeof req.body?.title === "string" ? req.body.title.trim() : "";
    const deadline = parseDateInput(req.body?.deadline);

    if (!title) {
      return res.status(400).json({ message: "Subgoal title is required" });
    }
    if (title.length > 180) return res.status(400).json({ message: "Subgoal title must be 180 characters or fewer" });

    if (!deadline) {
      return res.status(400).json({ message: "Subgoal deadline is required" });
    }

    const goal = await Goal.findOne({ _id: goalId, userId: req.user.id, deletedAt: null });

    if (!goal) {
      return res.status(404).json({ message: "Goal not found" });
    }

    const normalizedDeadline = getStartOfDay(deadline);
    checkGoalRevision(goal, req);
    if (normalizedDeadline < getStartOfDay()) return res.status(400).json({ message: "New subgoal deadlines cannot be in the past." });
    if (goal.startDate && normalizedDeadline < getStartOfDay(goal.startDate)) {
      return res.status(400).json({ message: "Subgoal deadline cannot be before goal startDate" });
    }
    if (goal.deadline && normalizedDeadline > getStartOfDay(goal.deadline)) {
      return res.status(400).json({ message: "Subgoal deadline cannot be after goal deadline" });
    }

    const wasCompleted = isGoalCompleted(goal);
    goal.subgoals.push({
      title,
      deadline: normalizedDeadline
    });
    const createdSubgoal = goal.subgoals[goal.subgoals.length - 1];
    appendActivityLog(
      goal,
      buildActivityLogEntry(
        "subgoal_added",
        buildSubgoalActivityTitle(title, goal.title),
        new Date(),
        { subgoalId: createdSubgoal?._id || null }
      )
    );

    const progressChange = applySubgoalProgressToGoal(goal, wasCompleted);
    await saveGoal(goal, req);
    if (progressChange.changed) await recordProgressLog(goal, {
      userId: req.user.id, goalId: goal._id, previousValue: progressChange.previousValue,
      currentValue: progressChange.nextValue, delta: progressChange.nextValue - progressChange.previousValue,
      completedGoal: !progressChange.wasCompleted && progressChange.isCompleted, date: new Date()
    });

    res.status(201).json(serializeGoal(goal));
  } catch (error) {
    return goalFailure(res, error);
  }
};

export const updateGoalSubgoalProgress = async (req, res) => {
  try {
    const goalId = req.params.id;
    const subgoalId = req.params.subgoalId;

    if (!isValidGoalId(goalId)) {
      return res.status(400).json({ message: "Invalid goal id" });
    }

    const goal = await Goal.findOne({ _id: goalId, userId: req.user.id, deletedAt: null });

    if (!goal) {
      return res.status(404).json({ message: "Goal not found" });
    }

    const subgoal = goal.subgoals.id(subgoalId);
    checkGoalRevision(goal, req);
    if (!subgoal) {
      return res.status(404).json({ message: "Subgoal not found" });
    }

    if (req.body?.completed !== undefined && typeof req.body.completed !== "boolean") {
      return res.status(400).json({ message: "completed must be a boolean" });
    }
    let nextCompleted;
    if (typeof req.body?.completed === "boolean") {
      nextCompleted = req.body.completed;
    } else {
      nextCompleted = !Boolean(subgoal.completed);
    }

    if (Boolean(subgoal.completed) === nextCompleted) {
      return res.json(serializeGoal(goal));
    }

    const wasCompleted = isGoalCompleted(goal);
    const actionAt = new Date();
    subgoal.completed = nextCompleted;
    subgoal.completedAt = nextCompleted ? actionAt : null;
    appendActivityLog(
      goal,
      buildActivityLogEntry(
        nextCompleted ? "subgoal_completed" : "subgoal_reopened",
        buildSubgoalActivityTitle(subgoal.title, goal.title),
        actionAt,
        { subgoalId: subgoal._id || null }
      )
    );

    const progressChange = applySubgoalProgressToGoal(goal, wasCompleted);
    await saveGoal(goal, req);

    if (progressChange.changed) {
      await recordProgressLog(goal, {
        userId: req.user.id,
        goalId: goal._id,
        previousValue: progressChange.previousValue,
        currentValue: progressChange.nextValue,
        delta: progressChange.nextValue - progressChange.previousValue,
        completedGoal: !progressChange.wasCompleted && progressChange.isCompleted,
        date: actionAt
      });
    }

    res.json(serializeGoal(goal));
  } catch (error) {
    return goalFailure(res, error);
  }
};

export const deleteGoalSubgoal = async (req, res) => {
  try {
    const goalId = req.params.id;
    const subgoalId = req.params.subgoalId;

    if (!isValidGoalId(goalId)) {
      return res.status(400).json({ message: "Invalid goal id" });
    }

    const goal = await Goal.findOne({ _id: goalId, userId: req.user.id, deletedAt: null });

    if (!goal) {
      return res.status(404).json({ message: "Goal not found" });
    }

    const subgoal = goal.subgoals.id(subgoalId);
    checkGoalRevision(goal, req);
    if (!subgoal) {
      return res.status(404).json({ message: "Subgoal not found" });
    }

    const wasCompleted = isGoalCompleted(goal);
    const removedSubgoalTitle = subgoal.title;
    const actionAt = new Date();
    subgoal.deleteOne();

    appendActivityLog(
      goal,
      buildActivityLogEntry(
        "subgoal_deleted",
        buildSubgoalActivityTitle(removedSubgoalTitle, goal.title),
        actionAt,
        { subgoalId: subgoal._id || null }
      )
    );

    const progressChange = applySubgoalProgressToGoal(goal, wasCompleted);
    await saveGoal(goal, req);

    if (progressChange.changed) {
      await recordProgressLog(goal, {
        userId: req.user.id,
        goalId: goal._id,
        previousValue: progressChange.previousValue,
        currentValue: progressChange.nextValue,
        delta: progressChange.nextValue - progressChange.previousValue,
        completedGoal: !progressChange.wasCompleted && progressChange.isCompleted,
        date: actionAt
      });
    }

    res.json(serializeGoal(goal));
  } catch (error) {
    return goalFailure(res, error);
  }
};

export const toggleGoalImportant = async (req, res) => {
  try {
    const goalId = req.params.id;
    if (!isValidGoalId(goalId)) {
      return res.status(400).json({ message: "Invalid goal id" });
    }

    const goal = await Goal.findOne({ _id: goalId, userId: req.user.id, deletedAt: null });

    if (!goal) {
      return res.status(404).json({ message: "Goal not found" });
    }

    if (req.body?.isImportant !== undefined && typeof req.body.isImportant !== "boolean") {
      return res.status(400).json({ message: "isImportant must be a boolean" });
    }
    checkGoalRevision(goal, req);
    const nextImportant = typeof req.body?.isImportant === "boolean" ? req.body.isImportant : !goal.isImportant;
    if (Boolean(goal.isImportant) === nextImportant) return res.json(serializeGoal(goal));
    goal.isImportant = nextImportant;
    appendActivityLog(goal, buildActivityLogEntry("important_toggled", goal.title));
    await saveGoal(goal, req);

    res.json(serializeGoal(goal));
  } catch (error) {
    return goalFailure(res, error);
  }
};

export const deleteGoal = async (req, res) => {
  try {
    const goalId = req.params.id;
    if (!isValidGoalId(goalId)) {
      return res.status(400).json({ message: "Invalid goal id" });
    }

    const existingGoal = await Goal.findOne({
      _id: goalId,
      userId: req.user.id,
    });

    if (!existingGoal) {
      return res.status(404).json({ message: "Goal not found" });
    }
    if (existingGoal.deletedAt) return res.json({ message: "Goal already deleted", goal: serializeGoal(existingGoal), ...getDeleteUndoMeta(existingGoal.deletedAt) });
    checkGoalRevision(existingGoal, req);

    const deletedAt = new Date();
    existingGoal.deletedAt = deletedAt;
    existingGoal.archivedReason = "deleted";
    appendActivityLog(existingGoal, buildActivityLogEntry("deleted", existingGoal.title, deletedAt));
    await saveGoal(existingGoal, req);

    res.json({
      message: "Goal archived as deleted",
      goal: serializeGoal(existingGoal),
      ...getDeleteUndoMeta(deletedAt)
    });
  } catch (error) {
    return goalFailure(res, error);
  }
};

export const restoreGoal = async (req, res) => {
  try {
    const goalId = req.params.id;
    if (!isValidGoalId(goalId)) {
      return res.status(400).json({ message: "Invalid goal id" });
    }

    const goal = await Goal.findOne({ _id: goalId, userId: req.user.id });
    if (!goal) {
      return res.status(404).json({ message: "Goal not found" });
    }

    if (!goal.deletedAt || goal.archivedReason !== "deleted") {
      return res.status(400).json({ message: "Only deleted goals can be restored" });
    }
    checkGoalRevision(goal, req);

    const deleteUndoMeta = getDeleteUndoMeta(goal.deletedAt);
    if (!deleteUndoMeta.canUndoDelete) {
      return res.status(410).json({
        message: "Restore window expired. Goal can only be restored within 48 hours of deletion."
      });
    }

    goal.deletedAt = null;
    goal.archivedReason = null;
    appendActivityLog(goal, buildActivityLogEntry("restored", goal.title, new Date()));
    await saveGoal(goal, req);

    res.json(serializeGoal(goal));
  } catch (error) {
    return goalFailure(res, error);
  }
};

export const getGoalLogs = async (req, res) => {
  try {
    const requestedLimit = Number.parseInt(req.query.limit, 10);
    const limit = Number.isFinite(requestedLimit)
      ? Math.max(1, Math.min(requestedLimit, 200))
      : 50;
    const userId = new mongoose.Types.ObjectId(req.user.id);

    const logs = await Goal.aggregate([
      { $match: { userId } },
      { $unwind: "$activityLogs" },
      {
        $project: {
          _id: "$activityLogs._id",
          goalId: "$_id",
          action: "$activityLogs.action",
          title: "$activityLogs.title",
          at: "$activityLogs.at",
          deletedAt: 1,
          archivedReason: 1
        }
      },
      { $sort: { at: -1 } },
      { $limit: limit }
    ]);

    const values = logs.map((item) => {
      const at = item.at ? new Date(item.at) : new Date();
      const deletedAtDate = item.deletedAt ? new Date(item.deletedAt) : null;
      const isCurrentDeleteEvent =
        item.action === "deleted"
        && deletedAtDate
        && !Number.isNaN(deletedAtDate.getTime())
        && Math.abs(deletedAtDate.getTime() - at.getTime()) < 1000;
      const deleteUndoMeta =
        isCurrentDeleteEvent && item.archivedReason === "deleted"
          ? getDeleteUndoMeta(deletedAtDate)
          : {
            canUndoDelete: false,
            deleteUndoExpiresAt: null,
            deleteUndoRemainingMs: 0
          };

      return {
        id: String(item._id),
        goalId: String(item.goalId),
        action: item.action,
        title: item.title,
        at: at.toISOString(),
        date: toDayKey(at),
        time: toTimeKey(at),
        ...deleteUndoMeta
      };
    });

    res.json(values);
  } catch (error) {
    return goalFailure(res, error);
  }
};

export const getGoalSummary = async (req, res) => {
  try {
    const selectedDate = req.query.date ? parseDateInput(req.query.date) : new Date();
    if (!selectedDate) {
      return res.status(400).json({ message: "date must be a valid YYYY-MM-DD value" });
    }

    const today = getStartOfDay(selectedDate);
    const goals = await Goal.find({ userId: req.user.id, deletedAt: null });

    const summary = goals.reduce((acc, goal) => {
      const subgoalSummary = buildSubgoalProgressSummary(goal);
      const isArchived = getGoalStatus(goal, today) === "Archived";
      const completed = isGoalCompleted(goal);

      acc.totalGoals += 1;
      acc.activeGoals += isArchived ? 0 : 1;
      acc.archivedGoals += isArchived ? 1 : 0;
      acc.completedGoals += completed ? 1 : 0;
      acc.pendingGoals += completed ? 0 : 1;
      acc.totalSubgoals += subgoalSummary.total;
      acc.completedSubgoals += subgoalSummary.completed;
      acc.pendingSubgoals += subgoalSummary.pending;
      return acc;
    }, {
      totalGoals: 0,
      activeGoals: 0,
      archivedGoals: 0,
      completedGoals: 0,
      pendingGoals: 0,
      totalSubgoals: 0,
      completedSubgoals: 0,
      pendingSubgoals: 0
    });

    const goalCompletionRate = summary.totalGoals > 0
      ? Number(((summary.completedGoals / summary.totalGoals) * 100).toFixed(1))
      : 0;
    const subgoalCompletionRate = summary.totalSubgoals > 0
      ? Number(((summary.completedSubgoals / summary.totalSubgoals) * 100).toFixed(1))
      : 0;

    res.json({
      ...summary,
      goalCompletionRate,
      subgoalCompletionRate,
      date: toDayKey(today),
      timezone: APP_TIMEZONE,
      serverNow: new Date().toISOString()
    });
  } catch (error) {
    return goalFailure(res, error);
  }
};

export const getGoalHeatmap = async (req, res) => {
  try {
    const { year } = req.query;
    const parsedYear = Number(year);
    const hasYearFilter = typeof year === "string" && /^\d+$/.test(year) && Number.isSafeInteger(parsedYear) && parsedYear >= 1970 && parsedYear <= 3000;

    if (year !== undefined && !hasYearFilter) {
      return res.status(400).json({ message: "Year must be a valid number" });
    }

    const userId = new mongoose.Types.ObjectId(req.user.id);
    const dayPrefix = hasYearFilter ? `${parsedYear}-` : null;

    const [completedSubgoalsByDay, subgoalYears] = await Promise.all([
      Goal.aggregate([
        { $match: { userId } },
        { $unwind: "$activityLogs" },
        {
          $match: {
            "activityLogs.action": "subgoal_completed"
          }
        },
        {
          $project: {
            day: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$activityLogs.at",
                timezone: GOAL_ACTIVITY_TIMEZONE
              }
            }
          }
        },
        dayPrefix ? { $match: { day: { $regex: `^${dayPrefix}` } } } : null,
        {
          $group: {
            _id: "$day",
            completedSubgoals: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ].filter(Boolean)),
      Goal.aggregate([
        { $match: { userId } },
        { $unwind: "$activityLogs" },
        {
          $match: {
            "activityLogs.action": "subgoal_completed"
          }
        },
        {
          $project: {
            year: {
              $dateToString: {
                format: "%Y",
                date: "$activityLogs.at",
                timezone: GOAL_ACTIVITY_TIMEZONE
              }
            }
          }
        },
        {
          $group: {
            _id: "$year"
          }
        },
        { $sort: { _id: -1 } }
      ])
    ]);

    const values = completedSubgoalsByDay.map((item) => {
      const completedSubgoals = Number(item.completedSubgoals) || 0;
      return {
        date: String(item._id),
        count: Math.min(4, Math.max(1, completedSubgoals)),
        completedSubgoals
      };
    });

    const years = [...new Set(
      subgoalYears
        .map((item) => Number.parseInt(String(item._id), 10))
        .filter((item) => Number.isFinite(item))
    )]
      .sort((left, right) => right - left);

    const totalContributions = values.reduce((sum, value) => sum + (Number(value.completedSubgoals) || 0), 0);

    res.json({
      values,
      years,
      totalContributions
    });
  } catch (error) {
    return goalFailure(res, error);
  }
};

export const getGoalAnalysis = async (req, res) => {
  let days;
  try { days = journalMonthDays(req.query.year, req.query.month); }
  catch { return res.status(400).json({ message: "Use a valid year and month (1–12)." }); }
  const now = new Date(), today = todoReportDay(now, APP_TIMEZONE);
  const clock = { today, timezone: APP_TIMEZONE, serverNow: now.toISOString() };
  if (days[0] > today) return res.status(400).json({ message: "Future months are not available for analysis.", ...clock });
  try {
    const account = await User.findById(req.user.id).select("createdAt").lean();
    if (!account) return res.status(404).json({ message: "Account not found." });
    const through = days.at(-1)<today ? days.at(-1) : today;
    // Broad timestamp bounds are candidates only; exact days use the app timezone.
    // Include retained deletions and earlier snapshots, not only today's active goals.
    const goals = await Goal.find({ userId:req.user.id,
      $or:[{createdAt:{$lt:new Date(Date.parse(through)+2*86400000)}},{createdAt:null}] }, GOAL_REPORT_FIELDS).lean();
    const logs = goals.length ? await GoalProgressLog.find({ ...goalProgressFilter(req.user.id,goals.map(row=>row._id)),date:{$lte:now} })
      .select("goalId previousValue currentValue date").lean() : [];
    return res.json({ year:Number(req.query.year),month:Number(req.query.month),...clock,
      joinedDay:account.createdAt ? todoReportDay(account.createdAt,APP_TIMEZONE) : null,
      analysis:computeGoalAnalysis(goals,logs,{year:req.query.year,month:req.query.month,...clock,now:now.getTime()}),
      dataNote:GOAL_ANALYSIS_NOTE });
  } catch {
    return res.status(500).json({ message:"Could not load Goal Analysis. Please retry." });
  }
};
