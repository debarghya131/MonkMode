import Habit from "../models/Habit.js";
import HabitLog from "../models/HabitLog.js";
import mongoose from "mongoose";
import { calculateStreak } from "../utils/streakUtils.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const DELETE_UNDO_WINDOW_MS = 48 * 60 * 60 * 1000;
const APP_TIMEZONE = process.env.APP_TIMEZONE || "Asia/Kolkata";

const getUtcStartOfDay = (value = new Date()) => {
  const day = new Date(value);
  day.setHours(0, 0, 0, 0);
  return day;
};

const getUtcDayBounds = (value = new Date()) => {
  const start = getUtcStartOfDay(value);
  const end = new Date(start.getTime() + DAY_MS);
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

const applyDeferredTimeIfDue = async (habit, today = getUtcStartOfDay()) => {
  if (!habit) return false;

  let changed = false;

  if (habit.pendingTime && habit.timeChangeEffectiveFrom) {
    const effectiveTimeDay = getUtcStartOfDay(habit.timeChangeEffectiveFrom);
    if (effectiveTimeDay <= today) {
      habit.time = habit.pendingTime;
      habit.pendingTime = null;
      habit.timeChangeEffectiveFrom = null;
      changed = true;
    }
  }

  if (Array.isArray(habit.pendingDays) && habit.daysChangeEffectiveFrom) {
    const effectiveDaysDay = getUtcStartOfDay(habit.daysChangeEffectiveFrom);
    if (effectiveDaysDay <= today) {
      habit.days = [...habit.pendingDays];
      habit.pendingDays = null;
      habit.daysChangeEffectiveFrom = null;
      changed = true;
    }
  }

  if (!changed) return false;
  await habit.save();
  return true;
};

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
  const rangeDays = Math.floor((normalizedEnd.getTime() - normalizedStart.getTime()) / DAY_MS) + 1;
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
    const parsedEndDate = parseUtcDateInput(endDate);
    const todayUtc = getUtcStartOfDay();
    const normalizedTitle = title.trim();
    const normalizedCategory = category == null || category === ""
      ? "General"
      : (typeof category === "string" ? category.trim() : null);
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
      if (!Number.isInteger(parsedTargetStreak) || parsedTargetStreak < 1) {
        return res.status(400).json({ message: "Target streak must be an integer greater than 0" });
      }
      normalizedTargetStreak = parsedTargetStreak;
    }

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
      const totalDays = Math.floor((parsedEndDate.getTime() - nextStartDate.getTime()) / DAY_MS) + 1;
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
      startDate: parsedStartDate || null,
      days: normalizedDays,
      isImportant: Boolean(isImportant),
      endDate: parsedEndDate || null,
      activityLogs: [buildActivityLogEntry("created", normalizedTitle, createdAt)]
    });

    res.status(201).json(habit);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get Habits WITH STREAK 🔥
export const getHabits = async (req, res) => {
  try {
    const view = req.query.view || "all";
    const today = getUtcStartOfDay();
    const { end: endOfToday } = getUtcDayBounds(today);
    const todayKey = toDayKey(today);

    const habits = await Habit.find(buildHabitFilter(req.user.id, view, today)).sort({ createdAt: -1 });
    for (const habit of habits) {
      await applyDeferredTimeIfDue(habit, today);
    }

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
      if (
        logDayKey === todayKey ||
        (log.date >= today && log.date < endOfToday)
      ) {
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
    res.status(500).json({ message: error.message });
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
    await applyDeferredTimeIfDue(habit, today);

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
        $setOnInsert: {
          habitId: id,
          dayKey,
          date: now,
          completed: true
        }
      },
      { upsert: true }
    );

    if (!upsertResult.upsertedCount) {
      return res.json({ message: "Already completed today" });
    }

    const log = await HabitLog.findOne({ habitId: id, dayKey });

    res.status(201).json(log);
  } catch (error) {
    res.status(500).json({ message: error.message });
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

    await HabitLog.deleteOne({
      habitId: id,
      $or: [
        { dayKey },
        { date: { $gte: dayStart, $lt: dayEnd } }
      ]
    });
    res.json({ message: "Completion undone" });
  } catch (error) {
    res.status(500).json({ message: error.message });
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

    const habit = await Habit.findOneAndUpdate(
      { _id: id, userId: req.user.id, deletedAt: null },
      {
        $set: {
          endDate: resolvedEndDate,
          archivedReason: "ended"
        },
        $push: {
          activityLogs: buildActivityLogPush(
            buildActivityLogEntry("ended", existingHabit.title, new Date())
          )
        }
      },
      { new: true }
    );

    if (!habit) {
      return res.status(404).json({ message: "Habit not found" });
    }

    res.json(habit);
  } catch (error) {
    res.status(500).json({ message: error.message });
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

    const deletedAt = new Date();
    const habit = await Habit.findOneAndUpdate({
      _id: req.params.id,
      userId: req.user.id
    }, {
      $set: {
        deletedAt,
        archivedReason: "deleted"
      },
      $push: {
        activityLogs: buildActivityLogPush(
          buildActivityLogEntry("deleted", existingHabit.title, deletedAt)
        )
      }
    }, {
      new: true
    });

    if (!habit) {
      return res.status(404).json({ message: "Habit not found" });
    }

    res.json({
      message: "Habit archived as deleted",
      habit,
      ...getDeleteUndoMeta(deletedAt)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
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
    await habit.save();

    res.json(habit);
  } catch (error) {
    res.status(500).json({ message: error.message });
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
    const todayUtc = getUtcStartOfDay();

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
        updates.category = updates.category.trim();
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
        if (!Number.isInteger(parsed) || parsed < 1) {
          return res.status(400).json({ message: "Target streak must be an integer greater than 0" });
        }
        updates.targetStreak = parsed;
      }
    }

    if (Object.prototype.hasOwnProperty.call(updates, "isImportant")) {
      updates.isImportant = Boolean(updates.isImportant);
    }

    if (Object.prototype.hasOwnProperty.call(updates, "startDate")) {
      const parsedStart = parseUtcDateInput(updates.startDate);
      if (updates.startDate != null && updates.startDate !== "" && !parsedStart) {
        return res.status(400).json({ message: "Valid startDate is required" });
      }

      const existingStart = existingHabit.startDate
        ? getUtcStartOfDay(existingHabit.startDate)
        : null;
      const habitHasStarted = existingStart && existingStart <= getUtcStartOfDay();
      if (habitHasStarted && parsedStart && parsedStart.getTime() !== existingStart.getTime()) {
        return res.status(400).json({ message: "Start date cannot be changed after the habit has begun." });
      }

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
      : existingHabit.startDate;
    const nextEndDate = Object.prototype.hasOwnProperty.call(updates, "endDate")
      ? updates.endDate
      : existingHabit.endDate;
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
      const totalDays = Math.floor((nextEndDate.getTime() - nextStartDate.getTime()) / DAY_MS) + 1;
      if (nextTargetStreak > totalDays) {
        return res.status(400).json({ message: "Target streak should be <= total start to end date days." });
      }
    }

    const changedUpdates = {};
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
    const timeChanged = Object.prototype.hasOwnProperty.call(changedUpdates, "time");
    const daysChanged = Object.prototype.hasOwnProperty.call(changedUpdates, "days");
    const isWeekdaysHabit = nextRepeatType === "weekdays";
    const tomorrowUtc = new Date(todayUtc.getTime() + DAY_MS);
    let reflectFromNextDay = false;
    let reflectDaysFromNextDay = false;

    if (timeChanged && hasStarted) {
      changedUpdates.pendingTime = changedUpdates.time;
      changedUpdates.timeChangeEffectiveFrom = tomorrowUtc;
      delete changedUpdates.time;
      reflectFromNextDay = true;
    } else if (timeChanged) {
      changedUpdates.pendingTime = null;
      changedUpdates.timeChangeEffectiveFrom = null;
    }

    if (daysChanged && hasStarted && isWeekdaysHabit) {
      changedUpdates.pendingDays = [...changedUpdates.days];
      changedUpdates.daysChangeEffectiveFrom = tomorrowUtc;
      delete changedUpdates.days;
      reflectDaysFromNextDay = true;
    } else if (daysChanged) {
      changedUpdates.pendingDays = null;
      changedUpdates.daysChangeEffectiveFrom = null;
    }

    const nextTitle = changedUpdates.title ?? existingHabit.title;
    const habit = await Habit.findOneAndUpdate(
      { _id: id, userId: req.user.id, deletedAt: null },
      {
        $set: changedUpdates,
        $push: {
          activityLogs: buildActivityLogPush(
            buildActivityLogEntry("edited", nextTitle, new Date())
          )
        }
      },
      { new: true }
    );
    if (!habit) return res.status(404).json({ message: "Habit not found" });
    res.json({
      ...habit.toObject(),
      splitApplied: false,
      reflectFromNextDay,
      reflectsFromDate: reflectFromNextDay ? tomorrowUtc.toISOString() : null,
      reflectDaysFromNextDay,
      reflectsDaysFromDate: reflectDaysFromNextDay ? tomorrowUtc.toISOString() : null
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Toggle isImportant
export const toggleImportant = async (req, res) => {
  try {
    const { id } = req.params;
    const habit = await Habit.findOne({ _id: id, userId: req.user.id });
    if (!habit) return res.status(404).json({ message: "Habit not found" });
    habit.isImportant = !habit.isImportant;
    await habit.save();
    res.json({ isImportant: habit.isImportant });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get tracking data for a month/year
export const getHabitTracking = async (req, res) => {
  try {
    const { month, year } = req.query;
    const parsedMonth = Number.parseInt(month, 10);
    const parsedYear = Number.parseInt(year, 10);
    if (!Number.isFinite(parsedMonth) || !Number.isFinite(parsedYear)) {
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
    const today = getUtcStartOfDay();
    for (const habit of habits) {
      await applyDeferredTimeIfDue(habit, today);
    }
    const habitIds = habits.map((h) => h._id);
    const [logs, allCompletedLogs] = await Promise.all([
      HabitLog.find({
        habitId: { $in: habitIds },
        completed: true,
        $or: [
          { dayKey: { $gte: monthPrefix, $lt: nextMonthPrefix } },
          { dayKey: { $exists: false }, date: { $gte: startOfMonth, $lt: endOfMonth } }
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
        completedDays: [...new Set(completedMap[habit._id.toString()] || [])],
        currentStreak: streak.currentStreak,
        maxStreak: streak.maxStreak,
        streakBreaks: streak.streakBreaks,
        ...getDeleteUndoMeta(habit.deletedAt)
      };
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getHabitConsistency = async (req, res) => {
  try {
    const today = getUtcStartOfDay();
    const todayKey = toDayKey(today);
    const tomorrow = new Date(today.getTime() + DAY_MS);

    const [activeHabits, allHabits] = await Promise.all([
      Habit.find(buildHabitFilter(req.user.id, "active", today)).select(
        "createdAt startDate deletedAt endDate archivedReason repeatType frequency days pendingDays daysChangeEffectiveFrom time pendingTime timeChangeEffectiveFrom"
      ),
      Habit.find({ userId: req.user.id }).select(
        "createdAt startDate deletedAt endDate archivedReason repeatType frequency days pendingDays daysChangeEffectiveFrom time pendingTime timeChangeEffectiveFrom"
      )
    ]);

    const deferredApplySeen = new Set();
    for (const habit of [...activeHabits, ...allHabits]) {
      const id = habit?._id?.toString?.();
      if (!id || deferredApplySeen.has(id)) continue;
      deferredApplySeen.add(id);
      await applyDeferredTimeIfDue(habit, today);
    }

    if (!allHabits.length) {
      return res.json({
        completedToday: 0,
        expectedToday: 0,
        totalCompletedLifetime: 0,
        totalExpectedLifetime: 0,
        lifetimeConsistency: 0,
        fullCompletionStreakDays: 0
      });
    }

    const activeHabitIds = activeHabits.map((habit) => habit._id);
    const allHabitIds = allHabits.map((habit) => habit._id);

    const [todayCompletedWithDayKey, todayCompletedLegacy, lifetimeCompleted, completedByDay] = await Promise.all([
      HabitLog.countDocuments({
        habitId: { $in: activeHabitIds },
        completed: true,
        dayKey: todayKey
      }),
      HabitLog.aggregate([
        {
          $match: {
            habitId: { $in: activeHabitIds },
            completed: true,
            dayKey: { $exists: false },
            date: { $gte: today, $lt: tomorrow }
          }
        },
        {
          $group: {
            _id: "$habitId"
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
            habitId: { $in: activeHabitIds },
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
        }
      ])
    ]);

    const completedToday = todayCompletedWithDayKey + Number(todayCompletedLegacy[0]?.count || 0);
    const totalCompletedLifetime = Number(lifetimeCompleted[0]?.count || 0);

    const expectedToday = activeHabits.reduce(
      (count, habit) => count + (isHabitExpectedOnDate(habit, todayKey) ? 1 : 0),
      0
    );

    const completedByDayMap = new Map(
      completedByDay.map((item) => [String(item._id), Number(item.completedHabits) || 0])
    );

    let totalExpectedLifetime = 0;
    const expectedByDayMap = new Map();
    let earliestExpectedDate = null;

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
        }
      }
    }

    for (const habit of activeHabits) {
      const start = getUtcStartOfDay(habit.startDate || habit.createdAt || today);
      const endCandidates = [today];

      if (habit.endDate) endCandidates.push(getUtcStartOfDay(habit.endDate));
      if (habit.deletedAt) endCandidates.push(getUtcStartOfDay(habit.deletedAt));

      const end = new Date(Math.min(...endCandidates.map((value) => value.getTime())));
      if (start > end) continue;

      for (const cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
        const cursorDayKey = toDayKey(cursor);
        if (isHabitExpectedOnDate(habit, cursorDayKey)) {
          expectedByDayMap.set(cursorDayKey, (expectedByDayMap.get(cursorDayKey) || 0) + 1);
          if (!earliestExpectedDate || cursor < earliestExpectedDate) {
            earliestExpectedDate = new Date(cursor);
          }
        }
      }
    }

    let fullCompletionStreakDays = 0;
    if (earliestExpectedDate) {
      const streakStartCursor = new Date(today);
      const todayExpected = Number(expectedByDayMap.get(todayKey) || 0);
      const todayCompletedForStreak = Number(completedByDayMap.get(todayKey) || 0);

      // Keep yesterday's streak visible after midnight until today is either completed
      // or actually becomes a missed day on the next rollover.
      if (todayExpected <= 0 || todayCompletedForStreak < todayExpected) {
        streakStartCursor.setDate(streakStartCursor.getDate() - 1);
      }

      for (const cursor = new Date(streakStartCursor); cursor >= earliestExpectedDate; cursor.setDate(cursor.getDate() - 1)) {
        const cursorDayKey = toDayKey(cursor);
        const expected = Number(expectedByDayMap.get(cursorDayKey) || 0);
        const completed = Number(completedByDayMap.get(cursorDayKey) || 0);

        if (expected <= 0 || completed < expected) break;
        fullCompletionStreakDays++;
      }
    }

    const normalizedTotalExpectedLifetime = Math.max(totalExpectedLifetime, totalCompletedLifetime);
    const lifetimeConsistency = normalizedTotalExpectedLifetime > 0
      ? Number(((totalCompletedLifetime / normalizedTotalExpectedLifetime) * 100).toFixed(1))
      : 0;

    res.json({
      completedToday,
      expectedToday,
      totalCompletedLifetime,
      totalExpectedLifetime: normalizedTotalExpectedLifetime,
      lifetimeConsistency,
      fullCompletionStreakDays
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
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

  if (Array.isArray(habit?.days) && habit.days.length > 0) {
    const selected = new Set(habit.days.map(normalizeDayName).filter(Boolean));
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
    const parsedYear = Number.parseInt(year, 10);
    const hasYearFilter = Number.isFinite(parsedYear);

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
    for (const habit of habits) {
      await applyDeferredTimeIfDue(habit, today);
    }
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
      rangeEnd = new Date(today.getTime() + DAY_MS);
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
    res.status(500).json({ message: error.message });
  }
};
