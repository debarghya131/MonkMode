import Habit from "../models/Habit.js";
import HabitLog from "../models/HabitLog.js";
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
