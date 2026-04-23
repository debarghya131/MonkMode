import Habit from "../models/Habit.js";
import HabitLog from "../models/HabitLog.js";
import mongoose from "mongoose";
import { calculateStreak } from "../utils/streakUtils.js";

const getStartOfToday = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

const getArchiveState = (habit, today = getStartOfToday()) => {
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

const buildHabitFilter = (userId, view, today = getStartOfToday()) => {
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

// Create Habit
export const createHabit = async (req, res) => {
  try {
    const { title, frequency, endDate } = req.body;

    if (!title || !frequency) {
      return res.status(400).json({ message: "Title and frequency are required" });
    }

    const habit = await Habit.create({
      userId: req.user.id,
      title,
      frequency,
      endDate: endDate || null
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
    const today = getStartOfToday();
    const habits = await Habit.find(buildHabitFilter(req.user.id, view, today)).sort({ createdAt: -1 });

    const result = [];

    for (const habit of habits) {
      const logs = await HabitLog.find({ habitId: habit._id });
      const streak = calculateStreak(logs);
      const { isArchived, archiveReason } = getArchiveState(habit, today);

      result.push({
        ...habit._doc,
        streak,
        status: isArchived ? "archived" : "active",
        archiveReason
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

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const alreadyDone = await HabitLog.findOne({
      habitId: id,
      date: {
        $gte: startOfDay,
        $lt: endOfDay
      }
    });

    if (alreadyDone) {
      return res.json({ message: "Already completed today" });
    }

    const log = await HabitLog.create({
      habitId: id,
      completed: true
    });

    res.status(201).json(log);
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

    const habit = await Habit.findOneAndUpdate(
      { _id: id, userId: req.user.id, deletedAt: null },
      {
        endDate: resolvedEndDate,
        archivedReason: "ended"
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
    const habit = await Habit.findOneAndUpdate({
      _id: req.params.id,
      userId: req.user.id
    }, {
      deletedAt: new Date(),
      archivedReason: "deleted"
    }, {
      new: true
    });

    if (!habit) {
      return res.status(404).json({ message: "Habit not found" });
    }

    res.json({ message: "Habit archived as deleted", habit });
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

  const deletedAt = habit?.deletedAt ? new Date(habit.deletedAt) : null;
  if (deletedAt && deletedAt < dayStart) return false;

  const endDate = habit?.endDate ? new Date(habit.endDate) : null;
  if (endDate && endDate < dayStart) return false;

  if (habit?.archivedReason === "deleted" && !deletedAt) return false;

  return true;
};

export const getHabitHeatmap = async (req, res) => {
  try {
    const { year } = req.query;
    const parsedYear = Number.parseInt(year, 10);
    const hasYearFilter = Number.isFinite(parsedYear);

    if (year !== undefined && !hasYearFilter) {
      return res.status(400).json({ message: "Year must be a valid number" });
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
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$date"
              }
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
      Habit.find({ userId: req.user.id }).select("createdAt deletedAt endDate archivedReason")
    ]);

    const todayKey = new Date().toISOString().slice(0, 10);

    const values = completedByDay
      .filter((item) => {
        if (!hasYearFilter) return true;
        return String(item._id).startsWith(`${parsedYear}-`);
      })
      .map((item) => {
        const date = String(item._id);
        const completed = Number(item.completedHabits) || 0;
        const totalHabits = habits.reduce(
          (count, habit) => (isHabitActiveOnDate(habit, date) ? count + 1 : count),
          0
        );
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

        return {
          date,
          count,
          total: expectedHabits,
          completed,
          missed,
          pending
        };
      });

    const years = [...new Set(
      completedByDay
        .map((item) => Number.parseInt(String(item._id).slice(0, 4), 10))
        .filter((value) => Number.isFinite(value))
    )].sort((a, b) => b - a);

    res.json({
      values,
      years,
      totalActiveDays: values.length
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
