import Habit from "../models/Habit.js";
import HabitLog from "../models/HabitLog.js";
import mongoose from "mongoose";
import { calculateStreak } from "../utils/streakUtils.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const DELETE_UNDO_WINDOW_MS = 48 * 60 * 60 * 1000;

const getUtcStartOfDay = (value = new Date()) => {
  const day = new Date(value);
  day.setUTCHours(0, 0, 0, 0);
  return day;
};

const getUtcDayBounds = (value = new Date()) => {
  const start = getUtcStartOfDay(value);
  const end = new Date(start.getTime() + DAY_MS);
  return { start, end };
};

const toDayKey = (value = new Date()) => getUtcStartOfDay(value).toISOString().slice(0, 10);

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

  if (habit.endDate && new Date(habit.endDate) < today) {
    return { isArchived: true, archiveReason: "ended" };
  }

  return { isArchived: false, archiveReason: null };
};

const buildHabitFilter = (userId, view, today = getUtcStartOfDay()) => {
  const filter = { userId };

  if (view === "active") {
    filter.deletedAt = null;
    filter.archivedReason = { $ne: "ended" };
    filter.$or = [
      { endDate: null },
      { endDate: { $gte: today } }
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

const parseUtcDateInput = (value) => {
  if (value === null || value === "") return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return getUtcStartOfDay(value);
  }
  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return new Date(`${value}T00:00:00.000Z`);
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

    if (!title) {
      return res.status(400).json({ message: "Title is required" });
    }

    const createdAt = new Date();

    const habit = await Habit.create({
      userId: req.user.id,
      title,
      category: category || "General",
      priority: priority || "Medium",
      time: time || "08:00",
      note: note || "",
      targetStreak: targetStreak || 21,
      frequency: frequency || "daily",
      repeatType: repeatType || "daily",
      timeOfDay: timeOfDay || null,
      startDate: startDate || null,
      days: days || [],
      isImportant: isImportant || false,
      endDate: endDate || null,
      activityLogs: [buildActivityLogEntry("created", title, createdAt)]
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

    if (getArchiveState(habit).isArchived) {
      return res.status(400).json({ message: "Archived habits cannot be completed" });
    }

    const now = new Date();
    const dayKey = toDayKey(now);

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
    const resolvedEndDate = req.body?.endDate ? new Date(req.body.endDate) : new Date();

    if (Number.isNaN(resolvedEndDate.getTime())) {
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
      updates.startDate = parsedStart;
    }

    if (Object.prototype.hasOwnProperty.call(updates, "endDate")) {
      const parsedEnd = parseUtcDateInput(updates.endDate);
      if (updates.endDate != null && updates.endDate !== "" && !parsedEnd) {
        return res.status(400).json({ message: "Valid endDate is required" });
      }
      updates.endDate = parsedEnd;
    }

    const nextRepeatType = Object.prototype.hasOwnProperty.call(updates, "repeatType")
      ? updates.repeatType
      : existingHabit.repeatType;
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
    res.json(habit);
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

    const startOfMonth = new Date(Date.UTC(parsedYear, parsedMonth - 1, 1));
    const endOfMonth = new Date(Date.UTC(parsedYear, parsedMonth, 1));
    const monthPrefix = `${parsedYear}-${String(parsedMonth).padStart(2, "0")}-`;
    const nextMonthPrefix = `${endOfMonth.getUTCFullYear()}-${String(endOfMonth.getUTCMonth() + 1).padStart(2, "0")}-`;
    const habits = await Habit.find({ userId: req.user.id });
    const logs = await HabitLog.find({
      habitId: { $in: habits.map((h) => h._id) },
      completed: true,
      $or: [
        { dayKey: { $gte: monthPrefix, $lt: nextMonthPrefix } },
        { dayKey: { $exists: false }, date: { $gte: startOfMonth, $lt: endOfMonth } }
      ]
    }).select("habitId date dayKey");
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
    const result = habits.map((habit) => ({
      _id: habit._id,
      title: habit.title,
      isImportant: habit.isImportant,
      targetStreak: habit.targetStreak,
      endDate: habit.endDate,
      deletedAt: habit.deletedAt,
      archivedReason: habit.archivedReason,
      completedDays: [...new Set(completedMap[habit._id.toString()] || [])],
      ...getDeleteUndoMeta(habit.deletedAt)
    }));
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
        "createdAt startDate deletedAt endDate archivedReason repeatType frequency days"
      ),
      Habit.find({ userId: req.user.id }).select(
        "createdAt startDate deletedAt endDate archivedReason repeatType frequency days"
      )
    ]);

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
                    timezone: "UTC"
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
                    timezone: "UTC"
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

      for (const cursor = new Date(start); cursor <= end; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
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

      for (const cursor = new Date(start); cursor <= end; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
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
      for (const cursor = new Date(today); cursor >= earliestExpectedDate; cursor.setUTCDate(cursor.getUTCDate() - 1)) {
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
  const dayStart = new Date(`${dateKey}T00:00:00.000Z`);
  const dayEnd = new Date(dayStart);
  dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

  const createdAt = habit?.createdAt ? new Date(habit.createdAt) : null;
  if (createdAt && createdAt >= dayEnd) return false;

  const startDate = habit?.startDate ? getUtcStartOfDay(habit.startDate) : null;
  if (startDate && startDate > dayStart) return false;

  const deletedAt = habit?.deletedAt ? new Date(habit.deletedAt) : null;
  if (deletedAt && deletedAt < dayEnd) return false;

  const endDate = habit?.endDate ? new Date(habit.endDate) : null;
  if (endDate && endDate < dayEnd) return false;

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
  const day = new Date(`${dateKey}T00:00:00.000Z`);
  const dayName = DAY_NAMES[day.getUTCDay()];

  if (Array.isArray(habit?.days) && habit.days.length > 0) {
    const selected = new Set(habit.days.map(normalizeDayName).filter(Boolean));
    if (selected.size > 0) return selected.has(dayName);
  }

  if (habit?.repeatType === "weekdays") return dayName !== "sat" && dayName !== "sun";
  if (habit?.repeatType === "weekend") return dayName === "sat" || dayName === "sun";

  if (habit?.frequency === "weekly") {
    const referenceDate = habit?.startDate || habit?.createdAt || day;
    return getUtcStartOfDay(referenceDate).getUTCDay() === day.getUTCDay();
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
                    timezone: "UTC"
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
        "createdAt startDate deletedAt endDate archivedReason repeatType frequency days"
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
      rangeStart = new Date(Date.UTC(parsedYear, 0, 1));
      rangeEnd = new Date(Date.UTC(parsedYear + 1, 0, 1));
    } else {
      const earliestCompletion = completedByDay.length
        ? new Date(`${String(completedByDay[0]._id)}T00:00:00.000Z`)
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
    for (const cursor = new Date(rangeStart); cursor < rangeEnd; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
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
