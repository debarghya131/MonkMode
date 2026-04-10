import Habit from "../models/Habit.js";
import HabitLog from "../models/HabitLog.js";
import { calculateStreak } from "../utils/streakUtils.js";

// Create Habit
export const createHabit = async (req, res) => {
  const habit = await Habit.create({
    userId: req.user.id,
    title: req.body.title,
    frequency: req.body.frequency
  });

  res.json(habit);
};

// Get Habits WITH STREAK 🔥
export const getHabits = async (req, res) => {
  const habits = await Habit.find({ userId: req.user.id });

  const result = [];

  for (let habit of habits) {
    const logs = await HabitLog.find({ habitId: habit._id });

    const streak = calculateStreak(logs);

    result.push({
      ...habit._doc,
      streak
    });
  }

  res.json(result);
};

// Complete Habit
export const completeHabit = async (req, res) => {
  const { id } = req.params;

  const today = new Date().toDateString();

  const alreadyDone = await HabitLog.findOne({
    habitId: id,
    date: {
      $gte: new Date(today),
      $lt: new Date(new Date(today).setDate(new Date(today).getDate() + 1))
    }
  });

  if (alreadyDone) {
    return res.json({ message: "Already completed today" });
  }

  const log = await HabitLog.create({
    habitId: id,
    completed: true
  });

  res.json(log);
};