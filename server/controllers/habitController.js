import Habit from "../models/Habit.js";
import HabitLog from "../models/HabitLog.js";
import { calculateStreak } from "../utils/streakUtils.js";

// Create Habit
export const createHabit = async (req, res) => {
  try {
    const { title, frequency } = req.body;

    if (!title || !frequency) {
      return res.status(400).json({ message: "Title and frequency are required" });
    }

    const habit = await Habit.create({
      userId: req.user.id,
      title,
      frequency
    });

    res.status(201).json(habit);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get Habits WITH STREAK 🔥
export const getHabits = async (req, res) => {
  try {
    const habits = await Habit.find({ userId: req.user.id }).sort({ createdAt: -1 });

    const result = [];

    for (const habit of habits) {
      const logs = await HabitLog.find({ habitId: habit._id });
      const streak = calculateStreak(logs);

      result.push({
        ...habit._doc,
        streak
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

export const deleteHabit = async (req, res) => {
  try {
    const habit = await Habit.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!habit) {
      return res.status(404).json({ message: "Habit not found" });
    }

    await HabitLog.deleteMany({ habitId: habit._id });

    res.json({ message: "Habit deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
