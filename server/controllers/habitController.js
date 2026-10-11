import Habit from "../models/Habit.js";
import HabitLog from "../models/HabitLog.js";
import User from "../models/User.js";
import { journalMonthDays } from "../../shared/journalAnalysisStats.js";
import { computeHabitAnalysis } from "../../shared/habitAnalysisStats.js";
import { todoReportDay } from "../../shared/todoWeeklyStats.js";
import mongoose from "mongoose";
import { calculateStreak } from "../utils/streakUtils.js";
import { calculateCompletionStreak } from "../utils/monkStreakUtils.js";
import { APP_TIMEZONE } from "../config/runtime.js";
import { addCalendarDays, calendarDaysBetween } from "../utils/calendarUtils.js";

const DELETE_UNDO_WINDOW_MS = 48 * 60 * 60 * 1000;

const getUtcStartOfDay = (value = new Date()) => {
  const day = new Date(value);
  day.setHours(0, 0, 0, 0);
  return day;
};

const getUtcDayBounds = (value = new Date()) => {
  const start = getUtcStartOfDay(value);
  const end = addCalendarDays(start, 1);
  return { start, end };
};

const toDayKey = (value = new Date()) => {
  const day = getUtcStartOfDay(value);
  const year = day.getFullYear();
  const month = String(day.getMonth() + 1).padStart(2, "0");
  const date = String(day.getDate()).padStart(2, "0");
  return `${year}-${month}-${date}`;
};

const dayKeyToDate = (dayKey) => {
  if (typeof dayKey !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dayKey)) return null;
  const [year, month, date] = dayKey.split("-").map((part) => Number.parseInt(part, 10));
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(date)) return null;
  const parsed = new Date(year, month - 1, date);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== date
  ) {
    return null;
  }
  return parsed;
};

const buildActivityLogEntry = (action, title, at = new Date()) => ({
  action,
  title: title || "Untitled",
  at
});

const buildActivityLogPush = (entry) => ({
  $each: [entry],
  $slice: -200
});

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

const getArchiveState = (habit, today = getUtcStartOfDay()) => {
  if (habit.deletedAt) {
    return { isArchived: true, archiveReason: "deleted" };
  }

  if (habit.archivedReason === "ended") {
    return { isArchived: true, archiveReason: "ended" };
  }

  if (habit.endDate && getUtcStartOfDay(habit.endDate) < today) {
    return { isArchived: true, archiveReason: "ended" };
  }

  return { isArchived: false, archiveReason: null };
};

const dueHabitChanges = (habit, today = getUtcStartOfDay()) => {
  const changes = {};
  if (!habit) return changes;
  if (habit.pendingTime && habit.timeChangeEffectiveFrom) {
    const effectiveTimeDay = getUtcStartOfDay(habit.timeChangeEffectiveFrom);
    if (effectiveTimeDay <= today) {
      Object.assign(changes, { time: habit.pendingTime, pendingTime: null, timeChangeEffectiveFrom: null });
    }
  }

  if (Array.isArray(habit.pendingDays) && habit.daysChangeEffectiveFrom) {
    const effectiveDaysDay = getUtcStartOfDay(habit.daysChangeEffectiveFrom);
    if (effectiveDaysDay <= today) {
      Object.assign(changes, { days: [...habit.pendingDays], pendingDays: null, daysChangeEffectiveFrom: null });
    }
  }

  return changes;
};

const habitRevisionFilter = (habit, req) => {
  const filter = { _id: habit._id || req.params.id, userId: req.user.id };
  const expected = req.body?.expectedUpdatedAt;
  if (expected === undefined) return filter;
  if (typeof expected !== "string" || !Number.isFinite(Date.parse(expected))) throw Object.assign(new Error("expectedUpdatedAt must be a valid timestamp"), { status: 400 });
  if (!habit.updatedAt || Date.parse(expected) !== new Date(habit.updatedAt).getTime()) throw Object.assign(new Error("This habit changed in another request. Reload habits before trying again."), { status: 409 });
  filter.updatedAt = new Date(expected);
  return filter;
};
const habitUpdateOptions = filter => ({ new: true, runValidators: true, ...(filter.updatedAt ? { timestamps: false } : {}) });
const habitRevisionUpdate = filter => filter.updatedAt ? { updatedAt: new Date(Math.max(Date.now(), filter.updatedAt.getTime() + 1)) } : {};
const saveHabit = async (habit, req) => {
  const filter = habitRevisionFilter(habit, req);
  if (filter.updatedAt) {
    habit.$where = { userId: new mongoose.Types.ObjectId(req.user.id), updatedAt: filter.updatedAt };
    Object.assign(habit, habitRevisionUpdate(filter));
    await habit.save({ timestamps: false });
  } else await habit.save();
};
const habitWriteFailure = (res, error) => {
  if ([400, 409].includes(error.status)) return res.status(error.status).json({ message: error.message });
  if (["DocumentNotFoundError", "VersionError"].includes(error.name)) return res.status(409).json({ message: "This habit changed in another request. Reload habits before trying again." });
  if (["ValidationError", "CastError"].includes(error.name)) return res.status(400).json({ message: "Invalid habit values. Please check the form." });
  return res.status(503).json({ message: "The habit change could not be confirmed. Reload habits before trying again." });
};
const habitUpdateMissing = (res, filter) => res.status(filter.updatedAt ? 409 : 404).json({ message: filter.updatedAt
  ? "This habit changed in another request. Reload habits before trying again." : "Habit not found" });

const buildHabitFilter = (userId, view, today = getUtcStartOfDay()) => {
  const filter = { userId };

  if (view === "active") {
    filter.deletedAt = null;
    filter.archivedReason = { $ne: "ended" };
    filter.$and = [
      {
        $or: [
          { endDate: null },
          { endDate: { $gte: today } }
        ]
      },
      {
        $or: [
          { startDate: null },
          { startDate: { $lte: today } }
        ]
      }
    ];
  }

  if (view === "archived") {
    filter.$or = [
      { deletedAt: { $ne: null } },
      { archivedReason: "ended" },
      { endDate: { $lt: today } }
    ];
  }

  return filter;
};

const VALID_PRIORITIES = new Set(["High", "Medium", "Low"]);
const VALID_TIME_OF_DAY = new Set(["Morning", "Afternoon", "Evening", "Night"]);
const VALID_FREQUENCIES = new Set(["daily", "weekly"]);
const VALID_REPEAT_TYPES = new Set(["daily", "weekdays", "weekend", "7days", "21days"]);
const VALID_DAY_KEYS = new Set(["sun", "mon", "tue", "wed", "thu", "fri", "sat"]);
const DAY_KEY_TO_LABEL = {
  sun: "Sun",
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat"
};

const hasOccurrenceInUtcRange = (repeatType, startDate, endDate, days = []) => {
  if (!startDate || !endDate) return true;
  const normalizedStart = getUtcStartOfDay(startDate);
  const normalizedEnd = getUtcStartOfDay(endDate);
  const rangeDays = calendarDaysBetween(normalizedStart, normalizedEnd) + 1;
  if (rangeDays <= 0) return false;

  if (repeatType === "daily" || repeatType === "7days" || repeatType === "21days") return true;

  const startDay = normalizedStart.getDay();
  const includesDay = (dayIndex) => {
    const offset = (dayIndex - startDay + 7) % 7;
    return offset < rangeDays;
  };

  if (repeatType === "weekend") {
    return includesDay(0) || includesDay(6);
  }

  if (repeatType === "weekdays") {
    const selectedDays = Array.isArray(days) && days.length ? days : ["Mon", "Tue", "Wed", "Thu", "Fri"];
    return selectedDays.some((dayLabel) => {
      const dayIndex = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"]
        .findIndex((label) => label === String(dayLabel).toLowerCase().slice(0, 3));
      return dayIndex >= 0 && includesDay(dayIndex);
    });
  }

  return true;
};

const parseUtcDateInput = (value) => {
  if (value === null || value === "") return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return getUtcStartOfDay(value);
  }
  if (typeof value === "string") {
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
    if (!Number.isNaN(parsed.getTime())) return getUtcStartOfDay(parsed);
  }
  return null;
};

const areHabitFieldValuesEqual = (left, right) => {
  if (left == null && right == null) return true;
  if (left instanceof Date || right instanceof Date) {
    const leftDate = left ? new Date(left) : null;
    const rightDate = right ? new Date(right) : null;
    if (!leftDate && !rightDate) return true;
    if (!leftDate || !rightDate) return false;
    return leftDate.getTime() === rightDate.getTime();
  }
  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right)) return false;
    if (left.length !== right.length) return false;
    return left.every((value, index) => value === right[index]);
  }
  return left === right;
};

// Create Habit
export const createHabit = async (req, res) => {
  try {
    const { title, category, priority, time, note, targetStreak, frequency, endDate,
            timeOfDay, repeatType, startDate, days, isImportant } = req.body;

    if (typeof title !== "string" || !title.trim()) {
      return res.status(400).json({ message: "Title is required" });
    }

    const createdAt = new Date();
    const parsedStartDate = parseUtcDateInput(startDate);
    let parsedEndDate = parseUtcDateInput(endDate);
    const todayUtc = getUtcStartOfDay();
    const normalizedTitle = title.trim();
    const normalizedCategory = category == null || category === ""
      ? "General"
      : (typeof category === "string" ? category.trim() || "General" : null);
    const normalizedPriority = priority || "Medium";
    const normalizedTime = time || "08:00";
    const normalizedNote = note == null
      ? ""
      : (typeof note === "string" ? note.trim() : null);
    const normalizedTimeOfDay = timeOfDay == null || timeOfDay === ""
      ? null
      : timeOfDay;
    const normalizedFrequency = frequency || "daily";
    const nextRepeatType = repeatType || "daily";
    const nextStartDate = parsedStartDate || getUtcStartOfDay(createdAt);
    let normalizedTargetStreak = 21;
    let normalizedDays = [];

    if (startDate != null && startDate !== "" && !parsedStartDate) {
      return res.status(400).json({ message: "Valid startDate is required" });
    }

    if (endDate != null && endDate !== "" && !parsedEndDate) {
      return res.status(400).json({ message: "Valid endDate is required" });
    }

    if (normalizedCategory === null) {
      return res.status(400).json({ message: "Category must be a string" });
    }

    if (!VALID_PRIORITIES.has(normalizedPriority)) {
      return res.status(400).json({ message: "Priority must be High, Medium, or Low" });
    }

    if (typeof normalizedTime !== "string" || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(normalizedTime)) {
      return res.status(400).json({ message: "Time must be in HH:mm format" });
    }
    if (normalizedTitle.length > 180 || normalizedCategory?.length > 80 || normalizedNote?.length > 2500) return res.status(400).json({ message: "Title, category or reason is too long" });
    if (isImportant !== undefined && typeof isImportant !== "boolean") return res.status(400).json({ message: "isImportant must be a boolean" });
    if (nextStartDate < todayUtc) return res.status(400).json({ message: "New habits cannot start in the past." });

    if (normalizedNote === null) {
      return res.status(400).json({ message: "Reason / note must be a string" });
    }

    if (normalizedTimeOfDay !== null && !VALID_TIME_OF_DAY.has(normalizedTimeOfDay)) {
      return res.status(400).json({ message: "Invalid timeOfDay value" });
    }

    if (!VALID_FREQUENCIES.has(normalizedFrequency)) {
      return res.status(400).json({ message: "Frequency must be daily or weekly" });
    }

    if (!VALID_REPEAT_TYPES.has(nextRepeatType)) {
      return res.status(400).json({ message: "Invalid repeatType value" });
    }

    if (targetStreak != null && targetStreak !== "") {
      const parsedTargetStreak = Number(targetStreak);
      if (!["string", "number"].includes(typeof targetStreak) || !Number.isSafeInteger(parsedTargetStreak) || parsedTargetStreak < 1) {
        return res.status(400).json({ message: "Target streak must be an integer greater than 0" });
      }
      normalizedTargetStreak = parsedTargetStreak;
    }

    const duration = nextRepeatType === "7days" ? 7 : nextRepeatType === "21days" ? 21 : null;
    if (duration) {
      const fixedEnd = addCalendarDays(nextStartDate, duration - 1);
      if (parsedEndDate && parsedEndDate.getTime() !== fixedEnd.getTime()) return res.status(400).json({ message: "End date must match the selected fixed duration" });
      parsedEndDate = fixedEnd;
    }
    if (targetStreak == null || targetStreak === "") normalizedTargetStreak = parsedEndDate ? Math.min(21, calendarDaysBetween(nextStartDate, parsedEndDate) + 1) : 21;

    if (nextRepeatType === "weekdays") {
      if (!Array.isArray(days)) {
        return res.status(400).json({ message: "Days must be an array" });
      }
      const resolvedDays = [];
      for (const day of days) {
        if (typeof day !== "string") {
          return res.status(400).json({ message: "Invalid day value in days list" });
        }
        const dayKey = day.trim().toLowerCase().slice(0, 3);
        if (!VALID_DAY_KEYS.has(dayKey)) {
          return res.status(400).json({ message: `Invalid day value: ${day}` });
        }
        resolvedDays.push(DAY_KEY_TO_LABEL[dayKey]);
      }
      normalizedDays = [...new Set(resolvedDays)];
      if (normalizedDays.length === 0) {
        return res.status(400).json({ message: "Select at least one day for weekdays repeat type" });
      }
    }

    if (parsedEndDate && parsedEndDate < todayUtc) {
      return res.status(400).json({ message: "End date cannot be before today." });
    }
    if (parsedEndDate && parsedEndDate < nextStartDate) {
      return res.status(400).json({ message: "End date cannot be before start date" });
    }
    if (parsedEndDate) {
      const totalDays = calendarDaysBetween(nextStartDate, parsedEndDate) + 1;
      if (normalizedTargetStreak > totalDays) {
        return res.status(400).json({ message: "Target streak should be <= total start to end date days." });
      }
    }
    if (
      parsedEndDate &&
      !hasOccurrenceInUtcRange(nextRepeatType, nextStartDate, parsedEndDate, normalizedDays)
    ) {
      if (nextRepeatType === "weekend") {
        return res.status(400).json({ message: "Selected date range has no weekend day. Please choose a later end date." });
      }
      if (nextRepeatType === "weekdays") {
        return res.status(400).json({ message: "Selected date range has no chosen weekday. Please adjust start/end date." });
      }
    }

    const habit = await Habit.create({
      userId: req.user.id,
      title: normalizedTitle,
      category: normalizedCategory,
      priority: normalizedPriority,
      time: normalizedTime,
      note: normalizedNote,
      targetStreak: normalizedTargetStreak,
      frequency: normalizedFrequency,
      repeatType: nextRepeatType,
      timeOfDay: normalizedTimeOfDay,
      startDate: nextStartDate,
      days: normalizedDays,
      isImportant: Boolean(isImportant),
      endDate: parsedEndDate || null,
      activityLogs: [buildActivityLogEntry("created", normalizedTitle, createdAt)]
    });

    res.status(201).json(habit);
  } catch (error) {
    return habitWriteFailure(res, error);
  }
};

// Get Habits WITH STREAK 🔥
export const getHabits = async (req, res) => {
  try {
    const view = req.query.view || "all";
    const today = getUtcStartOfDay();
    const todayKey = toDayKey(today);

    const habits = await Habit.find(buildHabitFilter(req.user.id, view, today)).sort({ createdAt: -1 });

    if (!habits.length) return res.json([]);

    const habitIds = habits.map((h) => h._id);
    const allLogs = await HabitLog.find({
      habitId: { $in: habitIds },
      completed: true
    }).select("habitId date dayKey completed");

    const logsByHabit = new Map();
    const completedTodaySet = new Set();

    for (const log of allLogs) {
      const habitId = log.habitId.toString();
      if (!logsByHabit.has(habitId)) logsByHabit.set(habitId, []);
      logsByHabit.get(habitId).push(log);

      const logDayKey = log.dayKey || toDayKey(log.date);
      if (logDayKey === todayKey) {
        completedTodaySet.add(habitId);
      }
    }

    const result = [];

    for (const habit of habits) {
      const logs = logsByHabit.get(habit._id.toString()) || [];
      const streak = calculateStreak(logs, habit);
      const { isArchived, archiveReason } = getArchiveState(habit, today);
      const deleteUndoMeta = getDeleteUndoMeta(habit.deletedAt);

      result.push({
        ...habit._doc,
        currentStreak: streak.currentStreak,
        maxStreak: streak.maxStreak,
        streakBreaks: streak.streakBreaks,
        completedToday: completedTodaySet.has(habit._id.toString()),
        status: isArchived ? "archived" : "active",
        archiveReason,
        ...deleteUndoMeta
      });
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: "Could not load habits. Please retry." });
  }
};

// Complete Habit
export const completeHabit = async (req, res) => {
  try {
    const { id } = req.params;
    const habit = await Habit.findOne({ _id: id, userId: req.user.id });

    if (!habit) {
      return res.status(404).json({ message: "Habit not found" });
    }

    const now = new Date();
    const today = getUtcStartOfDay(now);
    if (req.body?.date != null && req.body.date !== toDayKey(today)) {
      return res.status(400).json({ message: "The app day has changed. Refresh Today before completing this habit." });
    }

    if (getArchiveState(habit, today).isArchived) {
      return res.status(400).json({ message: "Archived habits cannot be completed" });
    }

    if (habit.startDate && getUtcStartOfDay(habit.startDate) > today) {
      return res.status(400).json({ message: "Cannot complete a habit before its start date" });
    }
    const dayKey = toDayKey(today);

    if (!isHabitExpectedOnDate(habit, dayKey)) {
      return res.status(400).json({ message: "Habit is not scheduled for today" });
    }

    const upsertResult = await HabitLog.updateOne(
      { habitId: id, dayKey },
      {
        $set: { completed: true },
        $setOnInsert: {
          habitId: id,
          dayKey,
          date: now
        }
      },
      { upsert: true }
    );

    if (!upsertResult.upsertedCount) {
      return res.json({ message: "Already completed today", habitId: String(id), dayKey, completed: true });
    }

    const log = await HabitLog.findOne({ habitId: id, dayKey });

    res.status(201).json(log);
  } catch (error) {
    // Another request may win the unique (habitId, dayKey) upsert race.
    if (error.code === 11000) return res.json({ message: "Already completed today", habitId: String(req.params.id), dayKey: toDayKey(), completed: true });
    return habitWriteFailure(res, error);
  }
};

// Undo today's completion
export const undoCompleteHabit = async (req, res) => {
  try {
    const { id } = req.params;
    const habit = await Habit.findOne({ _id: id, userId: req.user.id });
    if (!habit) return res.status(404).json({ message: "Habit not found" });

    const { start: dayStart, end: dayEnd } = getUtcDayBounds();
    const dayKey = toDayKey(dayStart);

    if (req.body?.date != null && req.body.date !== dayKey) {
      return res.status(400).json({ message: "The app day has changed. Refresh Today before undoing this habit." });
    }

    await HabitLog.deleteMany({
      habitId: id,
      $or: [
        { dayKey },
        { dayKey: { $in: [null, ""] }, date: { $gte: dayStart, $lt: dayEnd } }
      ]
    });
    res.json({ message: "Completion undone", habitId: String(id), dayKey, completed: false });
  } catch (error) {
    return habitWriteFailure(res, error);
  }
};

export const endHabit = async (req, res) => {
  try {
    const { id } = req.params;
    const hasExplicitEndDate = Object.prototype.hasOwnProperty.call(req.body || {}, "endDate");
    const resolvedEndDate = hasExplicitEndDate
      ? parseUtcDateInput(req.body?.endDate)
      : getUtcStartOfDay(new Date());

    if (!resolvedEndDate) {
      return res.status(400).json({ message: "Valid endDate is required" });
    }

    const existingHabit = await Habit.findOne({ _id: id, userId: req.user.id, deletedAt: null });
    if (!existingHabit) {
      return res.status(404).json({ message: "Habit not found" });
    }
    const revisionFilter = habitRevisionFilter(existingHabit, req);
    if (resolvedEndDate < getUtcStartOfDay(existingHabit.startDate || existingHabit.createdAt)) return res.status(400).json({ message: "End date cannot be before start date" });
    const habit = await Habit.findOneAndUpdate(
      { ...revisionFilter, deletedAt: null },
      {
        $set: {
          endDate: resolvedEndDate,
          archivedReason: "ended",
          ...habitRevisionUpdate(revisionFilter)
        },
        $push: {
          activityLogs: buildActivityLogPush(
            buildActivityLogEntry("ended", existingHabit.title, new Date())
          )
        }
      },
      habitUpdateOptions(revisionFilter)
    );

    if (!habit) {
      return habitUpdateMissing(res, revisionFilter);
    }

    res.json(habit);
  } catch (error) {
    return habitWriteFailure(res, error);
  }
};

export const deleteHabit = async (req, res) => {
  try {
    const existingHabit = await Habit.findOne({
      _id: req.params.id,
      userId: req.user.id
    });
    if (!existingHabit) {
      return res.status(404).json({ message: "Habit not found" });
    }

    if (existingHabit.deletedAt && existingHabit.archivedReason === "deleted") {
      return res.json({ message: "Habit already deleted", habit: existingHabit, ...getDeleteUndoMeta(existingHabit.deletedAt) });
    }
    const revisionFilter = habitRevisionFilter(existingHabit, req);
    const deletedAt = new Date();
    const habit = await Habit.findOneAndUpdate({
      ...revisionFilter, deletedAt: null
    }, {
      $set: {
        deletedAt,
        archivedReason: "deleted", ...habitRevisionUpdate(revisionFilter)
      },
      $push: {
        activityLogs: buildActivityLogPush(
          buildActivityLogEntry("deleted", existingHabit.title, deletedAt)
        )
      }
    }, habitUpdateOptions(revisionFilter));

    if (!habit) {
      return habitUpdateMissing(res, revisionFilter);
    }

    res.json({
      message: "Habit archived as deleted",
      habit,
      ...getDeleteUndoMeta(deletedAt)
    });
  } catch (error) {
    return habitWriteFailure(res, error);
  }
};

// Restore a soft-deleted habit
export const restoreHabit = async (req, res) => {
  try {
    const habit = await Habit.findOne({ _id: req.params.id, userId: req.user.id });
    if (!habit) return res.status(404).json({ message: "Habit not found" });

    if (!habit.deletedAt || habit.archivedReason !== "deleted") {
      return res.status(400).json({ message: "Only deleted habits can be restored" });
    }
    habitRevisionFilter(habit, req);

    const deleteUndoMeta = getDeleteUndoMeta(habit.deletedAt);
    if (!deleteUndoMeta.canUndoDelete) {
      return res.status(410).json({
        message: "Restore window expired. Habit can only be restored within 48 hours of deletion."
      });
    }

    habit.deletedAt = null;
    habit.archivedReason = null;
    habit.activityLogs.push(buildActivityLogEntry("restored", habit.title, new Date()));
    if (habit.activityLogs.length > 200) {
      habit.activityLogs = habit.activityLogs.slice(-200);
    }
    await saveHabit(habit, req);

    res.json(habit);
  } catch (error) {
    return habitWriteFailure(res, error);
  }
};

// Update Habit (edit)
export const updateHabit = async (req, res) => {
  try {
    const { id } = req.params;
    const allowed = ["title", "category", "priority", "time", "note", "targetStreak",
                     "timeOfDay", "repeatType", "startDate", "endDate", "days", "isImportant"];
    const updates = {};
    for (const field of allowed) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) updates[field] = req.body[field];
    }
    const existingHabit = await Habit.findOne({ _id: id, userId: req.user.id, deletedAt: null });
    if (!existingHabit) return res.status(404).json({ message: "Habit not found" });
    const revisionFilter = habitRevisionFilter(existingHabit, req);
    const todayUtc = getUtcStartOfDay();
    const dueChanges = dueHabitChanges(existingHabit, todayUtc);
    Object.assign(existingHabit, dueChanges);

    // Once a habit is ended, editing should not mutate that historical record.
    // Users should edit an active habit only (or create a new one).
    const archiveState = getArchiveState(existingHabit, todayUtc);
    if (archiveState.isArchived && archiveState.archiveReason === "ended") {
      return res.status(400).json({ message: "Ended habits cannot be edited." });
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "repeatType")) {
      const requestedRepeatType = String(req.body.repeatType || "").trim().toLowerCase();
      const currentRepeatType = String(
        existingHabit.repeatType || existingHabit.frequency || requestedRepeatType || "daily"
      ).trim().toLowerCase();
      if (requestedRepeatType && requestedRepeatType !== currentRepeatType) {
        return res.status(400).json({ message: "Repeat type cannot be changed in edit mode." });
      }
    }

    if (Object.prototype.hasOwnProperty.call(updates, "title")) {
      if (typeof updates.title !== "string" || !updates.title.trim()) {
        return res.status(400).json({ message: "Title is required" });
      }
      updates.title = updates.title.trim();
    }

    if (Object.prototype.hasOwnProperty.call(updates, "note")) {
      if (updates.note === null) {
        updates.note = "";
      } else if (typeof updates.note !== "string") {
        return res.status(400).json({ message: "Reason / note must be a string" });
      } else {
        updates.note = updates.note.trim();
      }
    }

    if (Object.prototype.hasOwnProperty.call(updates, "category")) {
      if (updates.category === null || updates.category === "") {
        updates.category = "General";
      } else if (typeof updates.category !== "string") {
        return res.status(400).json({ message: "Category must be a string" });
      } else {
        updates.category = updates.category.trim() || "General";
      }
    }

    if (Object.prototype.hasOwnProperty.call(updates, "priority")) {
      if (!VALID_PRIORITIES.has(updates.priority)) {
        return res.status(400).json({ message: "Priority must be High, Medium, or Low" });
      }
    }

    if (Object.prototype.hasOwnProperty.call(updates, "time")) {
      if (typeof updates.time !== "string" || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(updates.time)) {
        return res.status(400).json({ message: "Time must be in HH:mm format" });
      }
    }

    if (Object.prototype.hasOwnProperty.call(updates, "timeOfDay")) {
      if (updates.timeOfDay === null || updates.timeOfDay === "") {
        updates.timeOfDay = null;
      } else if (!VALID_TIME_OF_DAY.has(updates.timeOfDay)) {
        return res.status(400).json({ message: "Invalid timeOfDay value" });
      }
    }

    if (Object.prototype.hasOwnProperty.call(updates, "repeatType")) {
      if (!VALID_REPEAT_TYPES.has(updates.repeatType)) {
        return res.status(400).json({ message: "Invalid repeatType value" });
      }
      if (updates.repeatType !== "weekdays" && !Object.prototype.hasOwnProperty.call(updates, "days")) {
        updates.days = [];
      }
    }

    if (Object.prototype.hasOwnProperty.call(updates, "days")) {
      if (updates.days == null) {
        updates.days = [];
      }
      if (!Array.isArray(updates.days)) {
        return res.status(400).json({ message: "Days must be an array" });
      }
      const normalizedDays = [];
      for (const day of updates.days) {
        if (typeof day !== "string") {
          return res.status(400).json({ message: "Invalid day value in days list" });
        }
        const dayKey = day.trim().toLowerCase().slice(0, 3);
        if (!VALID_DAY_KEYS.has(dayKey)) {
          return res.status(400).json({ message: `Invalid day value: ${day}` });
        }
        normalizedDays.push(DAY_KEY_TO_LABEL[dayKey]);
      }
      updates.days = [...new Set(normalizedDays)];
    }

    if (Object.prototype.hasOwnProperty.call(updates, "targetStreak")) {
      if (updates.targetStreak === null || updates.targetStreak === "") {
        updates.targetStreak = null;
      } else {
        const parsed = Number(updates.targetStreak);
        if (!["string", "number"].includes(typeof updates.targetStreak) || !Number.isSafeInteger(parsed) || parsed < 1) {
          return res.status(400).json({ message: "Target streak must be an integer greater than 0" });
        }
        updates.targetStreak = parsed;
      }
    }

    if (Object.prototype.hasOwnProperty.call(updates, "isImportant")) {
      if (typeof updates.isImportant !== "boolean") return res.status(400).json({ message: "isImportant must be a boolean" });
    }

    if (Object.prototype.hasOwnProperty.call(updates, "startDate")) {
      const parsedStart = parseUtcDateInput(updates.startDate);
      if (updates.startDate != null && updates.startDate !== "" && !parsedStart) {
        return res.status(400).json({ message: "Valid startDate is required" });
      }

      const existingStart = getUtcStartOfDay(existingHabit.startDate || existingHabit.createdAt || todayUtc);
      const habitHasStarted = existingStart && existingStart <= getUtcStartOfDay();
      if (habitHasStarted && (!parsedStart || parsedStart.getTime() !== existingStart.getTime())) {
        return res.status(400).json({ message: "Start date cannot be changed after the habit has begun." });
      }
      if (!habitHasStarted && (!parsedStart || parsedStart < todayUtc)) return res.status(400).json({ message: "Rescheduled habits cannot start in the past." });

      updates.startDate = parsedStart;
    }

    if (Object.prototype.hasOwnProperty.call(updates, "endDate")) {
      const parsedEnd = parseUtcDateInput(updates.endDate);
      if (updates.endDate != null && updates.endDate !== "" && !parsedEnd) {
        return res.status(400).json({ message: "Valid endDate is required" });
      }
      if (parsedEnd && parsedEnd < getUtcStartOfDay()) {
        return res.status(400).json({ message: "End date cannot be before today." });
      }
      updates.endDate = parsedEnd;
    }

    const nextRepeatType = Object.prototype.hasOwnProperty.call(updates, "repeatType")
      ? updates.repeatType
      : (existingHabit.repeatType || existingHabit.frequency || "daily");
    const nextDays = Object.prototype.hasOwnProperty.call(updates, "days")
      ? updates.days
      : (existingHabit.days || []);
    if (nextRepeatType === "weekdays" && (!Array.isArray(nextDays) || nextDays.length === 0)) {
      return res.status(400).json({ message: "Select at least one day for weekdays repeat type" });
    }

    const nextStartDate = Object.prototype.hasOwnProperty.call(updates, "startDate")
      ? updates.startDate
      : existingHabit.startDate || getUtcStartOfDay(existingHabit.createdAt || todayUtc);
    let nextEndDate = Object.prototype.hasOwnProperty.call(updates, "endDate")
      ? updates.endDate
      : existingHabit.endDate;
    const duration = nextRepeatType === "7days" ? 7 : nextRepeatType === "21days" ? 21 : null;
    if (duration) {
      const fixedEnd = addCalendarDays(nextStartDate, duration - 1);
      if (Object.prototype.hasOwnProperty.call(updates, "endDate") && (!nextEndDate || nextEndDate.getTime() !== fixedEnd.getTime())) return res.status(400).json({ message: "End date must match the selected fixed duration" });
      nextEndDate = fixedEnd;
      updates.endDate = fixedEnd;
    }
    if (nextStartDate && nextEndDate && nextEndDate < nextStartDate) {
      return res.status(400).json({ message: "End date cannot be before start date" });
    }
    if (
      nextEndDate &&
      !hasOccurrenceInUtcRange(nextRepeatType, nextStartDate, nextEndDate, nextDays)
    ) {
      if (nextRepeatType === "weekend") {
        return res.status(400).json({ message: "Selected date range has no weekend day. Please choose a later end date." });
      }
      if (nextRepeatType === "weekdays") {
        return res.status(400).json({ message: "Selected date range has no chosen weekday. Please adjust start/end date." });
      }
    }

    const nextTargetStreak = Object.prototype.hasOwnProperty.call(updates, "targetStreak")
      ? updates.targetStreak
      : existingHabit.targetStreak;
    if (nextTargetStreak && nextStartDate && nextEndDate) {
      const totalDays = calendarDaysBetween(nextStartDate, nextEndDate) + 1;
      if (nextTargetStreak > totalDays) {
        return res.status(400).json({ message: "Target streak should be <= total start to end date days." });
      }
    }

    if (updates.title?.length > 180 || updates.category?.length > 80 || updates.note?.length > 2500) return res.status(400).json({ message: "Title, category or reason is too long" });
    const changedUpdates = { ...dueChanges };
    for (const [field, value] of Object.entries(updates)) {
      if (!areHabitFieldValuesEqual(existingHabit[field], value)) {
        changedUpdates[field] = value;
      }
    }

    if (Object.keys(changedUpdates).length === 0) {
      return res.json(existingHabit);
    }

    const existingStart = getUtcStartOfDay(existingHabit.startDate || existingHabit.createdAt || todayUtc);
    const hasStarted = existingStart <= todayUtc;
    const timeChanged = Object.prototype.hasOwnProperty.call(updates, "time") && !areHabitFieldValuesEqual(existingHabit.time, updates.time);
    const daysChanged = Object.prototype.hasOwnProperty.call(updates, "days") && !areHabitFieldValuesEqual(existingHabit.days, updates.days);
    const isWeekdaysHabit = nextRepeatType === "weekdays";
    const tomorrowUtc = addCalendarDays(todayUtc, 1);
    let reflectFromNextDay = false;
    let reflectDaysFromNextDay = false;

    if (timeChanged && hasStarted) {
      changedUpdates.pendingTime = changedUpdates.time;
      changedUpdates.timeChangeEffectiveFrom = tomorrowUtc;
      if (dueChanges.time !== undefined) changedUpdates.time = dueChanges.time;
      else delete changedUpdates.time;
      reflectFromNextDay = true;
    } else if (timeChanged) {
      changedUpdates.pendingTime = null;
      changedUpdates.timeChangeEffectiveFrom = null;
    }

    if (daysChanged && hasStarted && isWeekdaysHabit) {
      changedUpdates.pendingDays = [...changedUpdates.days];
      changedUpdates.daysChangeEffectiveFrom = tomorrowUtc;
      if (dueChanges.days !== undefined) changedUpdates.days = dueChanges.days;
      else delete changedUpdates.days;
      reflectDaysFromNextDay = true;
    } else if (daysChanged) {
      changedUpdates.pendingDays = null;
      changedUpdates.daysChangeEffectiveFrom = null;
    }

    const nextTitle = changedUpdates.title ?? existingHabit.title;
    const habit = await Habit.findOneAndUpdate(
      { ...revisionFilter, deletedAt: null },
      {
        $set: { ...changedUpdates, ...habitRevisionUpdate(revisionFilter) },
        $push: {
          activityLogs: buildActivityLogPush(
            buildActivityLogEntry("edited", nextTitle, new Date())
          )
        }
      },
      habitUpdateOptions(revisionFilter)
    );
    if (!habit) return habitUpdateMissing(res, revisionFilter);
    res.json({
      ...habit.toObject(),
      splitApplied: false,
      reflectFromNextDay,
      reflectsFromDate: reflectFromNextDay ? tomorrowUtc.toISOString() : null,
      reflectDaysFromNextDay,
      reflectsDaysFromDate: reflectDaysFromNextDay ? tomorrowUtc.toISOString() : null
    });
  } catch (error) {
    return habitWriteFailure(res, error);
  }
};

// Toggle isImportant
export const toggleImportant = async (req, res) => {
  try {
    const { id } = req.params;
    const habit = await Habit.findOne({ _id: id, userId: req.user.id });
    if (!habit) return res.status(404).json({ message: "Habit not found" });
    if (req.body?.isImportant != null && typeof req.body.isImportant !== "boolean") {
      return res.status(400).json({ message: "isImportant must be a boolean" });
    }
    habitRevisionFilter(habit, req);
    habit.isImportant = req.body?.isImportant ?? !habit.isImportant;
    await saveHabit(habit, req);
    res.json({ habitId: String(id), isImportant: habit.isImportant, updatedAt: habit.updatedAt });
  } catch (error) {
    return habitWriteFailure(res, error);
  }
};

// Get tracking data for a month/year
export const getHabitTracking = async (req, res) => {
  try {
    const { month, year } = req.query;
    const parsedMonth = Number(month);
    const parsedYear = Number(year);
    if (typeof month !== "string" || typeof year !== "string" || !/^\d+$/.test(month) || !/^\d+$/.test(year)
      || !Number.isSafeInteger(parsedMonth) || !Number.isSafeInteger(parsedYear)) {
      return res.status(400).json({ message: "Valid month and year are required" });
    }
    if (parsedMonth < 1 || parsedMonth > 12) {
      return res.status(400).json({ message: "Month must be between 1 and 12" });
    }
    if (parsedYear < 1970 || parsedYear > 3000) {
      return res.status(400).json({ message: "Year must be between 1970 and 3000" });
    }

    const startOfMonth = new Date(parsedYear, parsedMonth - 1, 1);
    const endOfMonth = new Date(parsedYear, parsedMonth, 1);
    const monthPrefix = `${parsedYear}-${String(parsedMonth).padStart(2, "0")}-`;
    const nextMonthPrefix = `${endOfMonth.getFullYear()}-${String(endOfMonth.getMonth() + 1).padStart(2, "0")}-`;
    const habits = await Habit.find({ userId: req.user.id });
    const habitIds = habits.map((h) => h._id);
    const [logs, allCompletedLogs] = await Promise.all([
      HabitLog.find({
        habitId: { $in: habitIds },
        completed: true,
        $or: [
          { dayKey: { $gte: monthPrefix, $lt: nextMonthPrefix } },
          { dayKey: { $in: [null, ""] }, date: { $gte: startOfMonth, $lt: endOfMonth } }
        ]
      }).select("habitId date dayKey"),
      HabitLog.find({
        habitId: { $in: habitIds },
        completed: true
      }).select("habitId date dayKey completed")
    ]);
    const completedMap = {};
    for (const log of logs) {
      const key = log.habitId.toString();
      const resolvedDayKey = log.dayKey || toDayKey(log.date);
      if (!resolvedDayKey.startsWith(monthPrefix)) continue;
      if (!dayKeyToDate(resolvedDayKey) || resolvedDayKey > toDayKey()) continue;
      const day = Number.parseInt(resolvedDayKey.slice(8, 10), 10);
      if (!Number.isFinite(day)) continue;
      if (!completedMap[key]) completedMap[key] = [];
      completedMap[key].push(day);
    }

    const logsByHabit = new Map();
    for (const log of allCompletedLogs) {
      const key = log.habitId.toString();
      if (!logsByHabit.has(key)) logsByHabit.set(key, []);
      logsByHabit.get(key).push(log);
    }

    const result = habits.map((habit) => {
      const streak = calculateStreak(logsByHabit.get(habit._id.toString()) || [], habit);
      return {
        _id: habit._id,
        title: habit.title,
        isImportant: habit.isImportant,
        targetStreak: habit.targetStreak,
        startDate: habit.startDate,
        endDate: habit.endDate,
        deletedAt: habit.deletedAt,
        archivedReason: habit.archivedReason,
        updatedAt: habit.updatedAt,
        completedDays: [...new Set(completedMap[habit._id.toString()] || [])],
        currentStreak: streak.currentStreak,
        maxStreak: streak.maxStreak,
        streakBreaks: streak.streakBreaks,
        ...getDeleteUndoMeta(habit.deletedAt)
      };
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: "Could not load habit tracking. Please retry." });
  }
};

export const getHabitConsistency = async (req, res) => {
  try {
    const today = getUtcStartOfDay();
    const todayKey = toDayKey(today);

    const [activeHabits, allHabits] = await Promise.all([
      Habit.find(buildHabitFilter(req.user.id, "active", today)).select(
        "createdAt startDate deletedAt endDate archivedReason repeatType frequency days pendingDays daysChangeEffectiveFrom time pendingTime timeChangeEffectiveFrom"
      ),
      Habit.find({ userId: req.user.id }).select(
        "createdAt startDate deletedAt endDate archivedReason repeatType frequency days pendingDays daysChangeEffectiveFrom time pendingTime timeChangeEffectiveFrom"
      )
    ]);


    if (!allHabits.length) {
      return res.json({
        timezone: APP_TIMEZONE,
        serverNow: new Date().toISOString(),
        date: todayKey,
        completedToday: 0,
        expectedToday: 0,
        totalCompletedLifetime: 0,
        totalExpectedLifetime: 0,
        lifetimeConsistency: 0,
        fullCompletionStreakDays: 0,
        ...(req.includeCompletionDays ? { completedDayKeys: [] } : {})
      });
    }

    const allHabitIds = allHabits.map((habit) => habit._id);

    const [lifetimeCompleted, completedByDay] = await Promise.all([
      HabitLog.aggregate([
        {
          $match: {
            habitId: { $in: allHabitIds },
            completed: true
          }
        },
        {
          $project: {
            habitId: 1,
            normalizedDay: {
              $ifNull: [
                "$dayKey",
                {
                  $dateToString: {
                    format: "%Y-%m-%d",
                    date: "$date",
                    timezone: APP_TIMEZONE
                  }
                }
              ]
            }
          }
        },
        {
          $group: {
            _id: {
              habitId: "$habitId",
              day: "$normalizedDay"
            }
          }
        },
        {
          $count: "count"
        }
      ]),
      HabitLog.aggregate([
        {
          $match: {
            habitId: { $in: allHabitIds },
            completed: true
          }
        },
        {
          $project: {
            day: {
              $ifNull: [
                "$dayKey",
                {
                  $dateToString: {
                    format: "%Y-%m-%d",
                    date: "$date",
                    timezone: APP_TIMEZONE
                  }
                }
              ]
            },
            habitId: 1
          }
        },
        {
          $group: {
            _id: {
              day: "$day",
              habitId: "$habitId"
            }
          }
        },
        {
          $group: {
            _id: "$_id.day",
            completedHabits: { $sum: 1 },
            habitIds: { $addToSet: "$_id.habitId" }
          }
        }
      ])
    ]);

    const totalCompletedLifetime = Number(lifetimeCompleted[0]?.count || 0);

    const expectedToday = activeHabits.reduce(
      (count, habit) => count + (isHabitExpectedOnDate(habit, todayKey) ? 1 : 0),
      0
    );

    const completedIdsByDay = new Map(completedByDay.map((item) => [
      String(item._id), new Set((item.habitIds || []).map(String))
    ]));
    const completedToday = activeHabits.filter(habit => isHabitExpectedOnDate(habit, todayKey)
      && completedIdsByDay.get(todayKey)?.has(String(habit._id))).length;

    let totalExpectedLifetime = 0;
    const lifetimeExpectedIdsByDay = new Map();

    for (const habit of allHabits) {
      const start = getUtcStartOfDay(habit.startDate || habit.createdAt || today);
      const endCandidates = [today];

      if (habit.endDate) endCandidates.push(getUtcStartOfDay(habit.endDate));
      if (habit.deletedAt) endCandidates.push(getUtcStartOfDay(habit.deletedAt));

      const end = new Date(Math.min(...endCandidates.map((value) => value.getTime())));
      if (start > end) continue;

      for (const cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
        const cursorDayKey = toDayKey(cursor);
        if (isHabitExpectedOnDate(habit, cursorDayKey)) {
          totalExpectedLifetime++;
          const expectedIds = lifetimeExpectedIdsByDay.get(cursorDayKey) || new Set();
          expectedIds.add(String(habit._id));
          lifetimeExpectedIdsByDay.set(cursorDayKey, expectedIds);
        }
      }
    }

    const normalizedTotalExpectedLifetime = Math.max(totalExpectedLifetime, totalCompletedLifetime);
    const completedDayKeys = [...lifetimeExpectedIdsByDay.entries()]
      .filter(([day, expectedIds]) => [...expectedIds].every((id) => completedIdsByDay.get(day)?.has(id)))
      .map(([day]) => day);
    const fullCompletionStreakDays = calculateCompletionStreak({ dayKeys: completedDayKeys, todayKey });
    const lifetimeConsistency = normalizedTotalExpectedLifetime > 0
      ? Number(((totalCompletedLifetime / normalizedTotalExpectedLifetime) * 100).toFixed(1))
      : 0;

    res.json({
      timezone: APP_TIMEZONE,
      serverNow: new Date().toISOString(),
      date: todayKey,
      completedToday,
      expectedToday,
      totalCompletedLifetime,
      totalExpectedLifetime: normalizedTotalExpectedLifetime,
      lifetimeConsistency,
      fullCompletionStreakDays,
      ...(req.includeCompletionDays ? { completedDayKeys } : {})
    });
  } catch (error) {
    res.status(500).json({ message: "Could not load habit statistics. Please retry." });
  }
};

const isHabitActiveOnDate = (habit, dateKey) => {
  const dayStart = dayKeyToDate(dateKey);
  if (!dayStart) return false;
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const createdAt = habit?.createdAt ? new Date(habit.createdAt) : null;
  if (createdAt && createdAt >= dayEnd) return false;

  const startDate = habit?.startDate ? getUtcStartOfDay(habit.startDate) : null;
  if (startDate && startDate > dayStart) return false;

  const deletedAt = habit?.deletedAt ? new Date(habit.deletedAt) : null;
  if (deletedAt && deletedAt < dayEnd) return false;

  const endDate = habit?.endDate ? getUtcStartOfDay(habit.endDate) : null;
  if (endDate && endDate < dayStart) return false;

  if (habit?.archivedReason === "deleted" && !deletedAt) return false;

  return true;
};
const DAY_NAMES = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

const normalizeDayName = (value) => {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase().slice(0, 3);
  return DAY_NAMES.includes(normalized) ? normalized : null;
};

const isHabitScheduledOnDate = (habit, dateKey) => {
  const day = dayKeyToDate(dateKey);
  if (!day) return false;
  const dayName = DAY_NAMES[day.getDay()];

  const days = Array.isArray(habit.pendingDays) && habit.daysChangeEffectiveFrom && dateKey >= toDayKey(habit.daysChangeEffectiveFrom) ? habit.pendingDays : habit.days;
  if (Array.isArray(days) && days.length > 0) {
    const selected = new Set(days.map(normalizeDayName).filter(Boolean));
    if (selected.size > 0) return selected.has(dayName);
  }

  if (habit?.repeatType === "weekdays") return dayName !== "sat" && dayName !== "sun";
  if (habit?.repeatType === "weekend") return dayName === "sat" || dayName === "sun";

  if (habit?.frequency === "weekly") {
    const referenceDate = habit?.startDate || habit?.createdAt || day;
    return getUtcStartOfDay(referenceDate).getDay() === day.getDay();
  }

  return true;
};

const isHabitExpectedOnDate = (habit, dateKey) => {
  if (!isHabitActiveOnDate(habit, dateKey)) return false;
  return isHabitScheduledOnDate(habit, dateKey);
};

export const getHabitHeatmap = async (req, res) => {
  try {
    const { year } = req.query;
    const parsedYear = Number(year);
    const hasYearFilter = typeof year === "string" && /^\d+$/.test(year) && Number.isSafeInteger(parsedYear);

    if (year !== undefined && !hasYearFilter) {
      return res.status(400).json({ message: "Year must be a valid number" });
    }
    if (hasYearFilter && (parsedYear < 1970 || parsedYear > 3000)) {
      return res.status(400).json({ message: "Year must be between 1970 and 3000" });
    }

    const userId = new mongoose.Types.ObjectId(req.user.id);

    const [completedByDay, habits] = await Promise.all([
      HabitLog.aggregate([
        {
          $lookup: {
            from: "habits",
            localField: "habitId",
            foreignField: "_id",
            as: "habit"
          }
        },
        { $unwind: "$habit" },
        {
          $match: {
            "habit.userId": userId,
            completed: true
          }
        },
        {
          $project: {
            day: {
              $ifNull: [
                "$dayKey",
                {
                  $dateToString: {
                    format: "%Y-%m-%d",
                    date: "$date",
                    timezone: APP_TIMEZONE
                  }
                }
              ]
            },
            habitId: 1
          }
        },
        {
          $group: {
            _id: {
              day: "$day",
              habitId: "$habitId"
            }
          }
        },
        {
          $group: {
            _id: "$_id.day",
            completedHabits: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      Habit.find({ userId: req.user.id }).select(
        "createdAt startDate deletedAt endDate archivedReason repeatType frequency days pendingDays daysChangeEffectiveFrom time pendingTime timeChangeEffectiveFrom"
      )
    ]);

    const today = getUtcStartOfDay();
    const todayKey = toDayKey(today);
    const completedMap = new Map(
      completedByDay.map((item) => [String(item._id), Number(item.completedHabits) || 0])
    );

    let rangeStart;
    let rangeEnd;

    if (hasYearFilter) {
      rangeStart = new Date(parsedYear, 0, 1);
      rangeEnd = new Date(parsedYear + 1, 0, 1);
    } else {
      const earliestCompletion = completedByDay.length
        ? dayKeyToDate(String(completedByDay[0]._id))
        : null;
      const earliestHabitDate = habits.reduce((earliest, habit) => {
        const candidate = habit.startDate || habit.createdAt;
        if (!candidate) return earliest;
        return !earliest || new Date(candidate) < earliest ? new Date(candidate) : earliest;
      }, null);

      const baseline = earliestCompletion && earliestHabitDate
        ? new Date(Math.min(earliestCompletion.getTime(), earliestHabitDate.getTime()))
        : earliestCompletion || earliestHabitDate;

      if (!baseline) {
        return res.json({ values: [], years: [], totalActiveDays: 0 });
      }

      rangeStart = getUtcStartOfDay(baseline);
      rangeEnd = addCalendarDays(today, 1);
    }

    const values = [];
    for (const cursor = new Date(rangeStart); cursor < rangeEnd; cursor.setDate(cursor.getDate() + 1)) {
      const date = toDayKey(cursor);
      const completed = completedMap.get(date) || 0;
      const totalHabits = habits.reduce(
        (count, habit) => (isHabitExpectedOnDate(habit, date) ? count + 1 : count),
        0
      );

      if (totalHabits === 0 && completed === 0) continue;

      const expectedHabits = Math.max(totalHabits, completed);
      const incomplete = Math.max(0, expectedHabits - completed);
      const missed = date < todayKey ? incomplete : 0;
      const pending = Math.max(0, incomplete - missed);

      let count = 1;
      if (expectedHabits > 0 && completed >= expectedHabits) {
        count = 4;
      } else if (completed > 0) {
        const completionRatio = completed / expectedHabits;
        if (completionRatio >= 0.75 && missed === 0) {
          count = 3;
        } else if (completionRatio >= 0.35 || completed >= 2) {
          count = 2;
        }
      }

      values.push({
        date,
        count,
        total: expectedHabits,
        completed,
        missed,
        pending
      });
    }

    const years = hasYearFilter
      ? [parsedYear]
      : [...new Set(values.map((value) => Number.parseInt(value.date.slice(0, 4), 10)))]
          .filter((value) => Number.isFinite(value))
          .sort((a, b) => b - a);

    res.json({
      values,
      years,
      totalActiveDays: values.length
    });
  } catch (error) {
    res.status(500).json({ message: "Could not load habit activity. Please retry." });
  }
};

export const getHabitAnalysis = async (req, res) => {
  let days;
  try { days = journalMonthDays(req.query.year, req.query.month); }
  catch { return res.status(400).json({ message: "Use a valid year and month (1–12)." }); }
  const now = new Date(), today = todoReportDay(now, APP_TIMEZONE);
  const clock = { today, timezone: APP_TIMEZONE, serverNow: now.toISOString() };
  if (days[0] > today) return res.status(400).json({ message: "Future months are not available for analysis.", ...clock });
  try {
    const account = await User.findById(req.user.id).select("createdAt").lean();
    if (!account) return res.status(404).json({ message: "Account not found." });
    const through = days.at(-1) < today ? days.at(-1) : today;
    const end = new Date(Date.parse(through) + 2 * 86400000);
    const habits = await Habit.find({ userId: req.user.id, $or: [{ createdAt: { $lte: end } }, { createdAt: null }] },
      { title: 1, category: 1, priority: 1, time: 1, pendingTime: 1, timeChangeEffectiveFrom: 1,
        pendingDays: 1, daysChangeEffectiveFrom: 1, targetStreak: 1, timeOfDay: 1, frequency: 1,
        repeatType: 1, startDate: 1, endDate: 1, createdAt: 1, updatedAt: 1, days: 1,
        deletedAt: 1, archivedReason: 1, isImportant: 1 }).lean();
    // HabitLog has no owner field: only IDs from the owner-scoped Habit read may be queried.
    // Include false logs, so a later undo wins over an old duplicate true log.
    const logs = habits.length ? await HabitLog.find({ habitId: { $in: habits.map(row => row._id) }, $or: [
      { dayKey: { $gte: days[0], $lte: through } },
      { dayKey: { $in: [null, ""] }, date: { $gte: new Date(Date.parse(days[0]) - 2 * 86400000), $lte: end } },
    ] }).select("habitId dayKey date updatedAt completed").lean() : [];
    const analysis = computeHabitAnalysis(habits, logs, { year: req.query.year, month: req.query.month, ...clock });
    return res.json({ year: Number(req.query.year), month: Number(req.query.month), ...clock,
      joinedDay: account.createdAt ? todoReportDay(account.createdAt, APP_TIMEZONE) : null, analysis,
      dataNote: "Calculated from retained habit schedules and check-ins; not AI-generated. Historical edits are not a complete audit trail." });
  } catch {
    return res.status(500).json({ message: "Could not load Habit Analysis. Please retry." });
  }
};
