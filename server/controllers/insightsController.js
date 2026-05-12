import Journal from "../models/Journal.js";
import Habit from "../models/Habit.js";
import HabitLog from "../models/HabitLog.js";
import TodoLog from "../models/TodoLog.js";
import Goal from "../models/Goal.js";
import GoalProgressLog from "../models/GoalProgressLog.js";
import GymExerciseProgress from "../models/GymExerciseProgress.js";
import GymMeasurement from "../models/GymMeasurement.js";
import { getJournalSummary } from "./journalController.js";
import { getTodoSummary } from "./todoController.js";
import { getHabitConsistency } from "./habitController.js";

function toDayKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getRange(scope) {
  if (scope === "7d") {
    const from = new Date();
    from.setDate(from.getDate() - 7);
    from.setHours(0, 0, 0, 0);
    return from;
  }
  if (scope === "30d") {
    const from = new Date();
    from.setDate(from.getDate() - 30);
    from.setHours(0, 0, 0, 0);
    return from;
  }
  return null;
}

export const getInsightsSummary = async (req, res) => {
  try {
    const userId = req.user._id;
    const scope = req.query.scope || "7d";
    const fromDate = getRange(scope);
    const fromDayKey = fromDate ? toDayKey(fromDate) : null;
    const todayKey = toDayKey(new Date());

    const dateFilter   = fromDate ? { $gte: fromDate }       : {};
    const dayKeyFilter = fromDayKey ? { $gte: fromDayKey, $lte: todayKey } : {};

    // ── Journal ──────────────────────────────────────────────
    const journalDocs = await Journal.find(
      { userId, ...(fromDate ? { date: dateFilter } : {}) },
      { mood: 1, energyLevel: 1, overallRating: 1 }
    ).lean();

    const moodCounts = {};
    journalDocs.forEach((j) => {
      if (j.mood) moodCounts[j.mood] = (moodCounts[j.mood] || 0) + 1;
    });
    const moodDistribution = Object.entries(moodCounts)
      .map(([mood, count]) => ({ mood, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const journalStats = {
      entryCount: journalDocs.length,
      avgEnergyLevel: journalDocs.length
        ? Math.round(journalDocs.reduce((s, j) => s + (j.energyLevel ?? 50), 0) / journalDocs.length)
        : 0,
      avgOverallRating: journalDocs.length
        ? Math.round(journalDocs.reduce((s, j) => s + (j.overallRating ?? 50), 0) / journalDocs.length)
        : 0,
      topMood: moodDistribution[0]?.mood ?? null,
      moodDistribution,
    };

    // ── Habits ───────────────────────────────────────────────
    const activeHabits = await Habit.find(
      { userId, deletedAt: null },
      { _id: 1, frequency: 1 }
    ).lean();

    const habitIds = activeHabits.map((h) => h._id);
    const habitLogs = await HabitLog.find({
      habitId: { $in: habitIds },
      ...(fromDate ? { date: dateFilter } : {}),
    }).lean();

    const dayCount = fromDate
      ? Math.max(1, Math.ceil((Date.now() - fromDate.getTime()) / 86400000))
      : 0;
    const dailyCount  = activeHabits.filter((h) => h.frequency !== "weekly").length;
    const weeklyCount = activeHabits.filter((h) => h.frequency === "weekly").length;
    const possibleLogs = fromDate
      ? dailyCount * dayCount + weeklyCount * Math.max(1, Math.floor(dayCount / 7))
      : habitLogs.length;
    const completedLogs = habitLogs.filter((l) => l.completed).length;

    const habitStats = {
      totalActiveHabits: activeHabits.length,
      completedLogs,
      possibleLogs: Math.max(possibleLogs, completedLogs),
      completionRate:
        possibleLogs > 0 ? Math.min(100, Math.round((completedLogs / possibleLogs) * 100)) : 0,
    };

    // ── Todos (via TodoLog) ───────────────────────────────────
    const [todoCompletions, todoCreations] = await Promise.all([
      TodoLog.countDocuments({
        userId,
        action: "ended",
        ...(fromDate ? { createdAt: dateFilter } : {}),
      }),
      TodoLog.countDocuments({
        userId,
        action: "created",
        ...(fromDate ? { createdAt: dateFilter } : {}),
      }),
    ]);

    const todoStats = {
      completed: todoCompletions,
      created: todoCreations,
      completionRate:
        todoCreations > 0 ? Math.round((todoCompletions / todoCreations) * 100) : 0,
    };

    // ── Goals ────────────────────────────────────────────────
    const [activeGoals, progressLogs] = await Promise.all([
      Goal.find({ userId, deletedAt: null }, { _id: 1, completed: 1 }).lean(),
      GoalProgressLog.find({
        userId,
        ...(fromDate ? { date: dateFilter } : {}),
      }).lean(),
    ]);

    const goalsUpdated = [...new Set(progressLogs.map((l) => l.goalId.toString()))].length;

    const goalStats = {
      activeGoals: activeGoals.length,
      completedGoals: activeGoals.filter((g) => g.completed).length,
      progressUpdates: progressLogs.length,
      goalsUpdated,
    };

    // ── Gym ───────────────────────────────────────────────────
    const [exerciseProgress, measurements] = await Promise.all([
      GymExerciseProgress.find(
        { userId, ...(fromDayKey ? { date: dayKeyFilter } : {}) },
        { date: 1, exerciseName: 1, bodyPart: 1 }
      ).lean(),
      GymMeasurement.find(
        { userId, deletedAt: null, ...(fromDayKey ? { checkInDate: dayKeyFilter } : {}) },
        { checkInDate: 1 }
      ).lean(),
    ]);

    const workoutDays    = [...new Set(exerciseProgress.map((e) => e.date))].length;
    const uniqueExercises = [
      ...new Set(exerciseProgress.map((e) => e.exerciseName?.toLowerCase().trim()).filter(Boolean)),
    ].length;
    const bodyPartsWorked = [...new Set(exerciseProgress.map((e) => e.bodyPart).filter(Boolean))];

    const gymStats = {
      workoutDays,
      exercisesLogged: exerciseProgress.length,
      uniqueExercises,
      bodyPartsWorked,
      measurementsTaken: measurements.length,
    };

    res.json({
      scope,
      period: fromDate ? { from: toDayKey(fromDate), to: todayKey } : null,
      journal: journalStats,
      habits: habitStats,
      todos: todoStats,
      goals: goalStats,
      gym: gymStats,
    });
  } catch (err) {
    console.error("getInsightsSummary error:", err);
    res.status(500).json({ error: "Failed to load insights" });
  }
};

const callController = async (handler, req) => {
  let payload;
  let statusCode = 200;
  const mockRes = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      payload = data;
      return this;
    }
  };

  await handler(req, mockRes);
  return { statusCode, payload };
};

export const getNavbarConsistency = async (req, res) => {
  try {
    const todayKey = toDayKey(new Date());

    const [journalResult, todoResult, habitResult] = await Promise.all([
      callController(getJournalSummary, { user: req.user, query: {} }),
      callController(getTodoSummary, { user: req.user, query: { date: todayKey } }),
      callController(getHabitConsistency, { user: req.user, query: {} })
    ]);

    if (journalResult.statusCode >= 400 || todoResult.statusCode >= 400 || habitResult.statusCode >= 400) {
      return res.status(502).json({
        message: "Failed to compute consistency from one or more sections"
      });
    }

    const journalTodaySubmitted = Boolean(journalResult.payload?.todayLogged);
    const journalScore = journalTodaySubmitted ? 100 : 0;
    const journalStreak = Math.max(0, Number(journalResult.payload?.currentStreakDays || 0));

    const todoExpectedToday = Math.max(0, Number(todoResult.payload?.today?.total || 0));
    const todoCompletedToday = Math.max(0, Number(todoResult.payload?.today?.completed || 0));
    const todoScore = todoExpectedToday > 0
      ? Math.round((todoCompletedToday / todoExpectedToday) * 100)
      : 0;
    const todoStreak = Math.max(0, Number(todoResult.payload?.fullCompletionStreakDays || 0));

    const habitExpectedToday = Math.max(0, Number(habitResult.payload?.expectedToday || 0));
    const habitCompletedToday = Math.max(0, Number(habitResult.payload?.completedToday || 0));
    const habitScore = habitExpectedToday > 0
      ? Math.round((habitCompletedToday / habitExpectedToday) * 100)
      : 0;
    const habitStreak = Math.max(0, Number(habitResult.payload?.fullCompletionStreakDays || 0));

    const consistencyScore = Math.round((journalScore + todoScore + habitScore) / 3);
    const allSectionsComplete = Boolean(
      journalTodaySubmitted &&
      todoExpectedToday > 0 &&
      todoCompletedToday >= todoExpectedToday &&
      habitExpectedToday > 0 &&
      habitCompletedToday >= habitExpectedToday
    );

    return res.json({
      date: todayKey,
      consistencyScore,
      allSectionsComplete,
      sections: {
        journal: {
          submittedToday: journalTodaySubmitted,
          score: journalScore,
          currentStreakDays: journalStreak
        },
        todo: {
          completedToday: todoCompletedToday,
          expectedToday: todoExpectedToday,
          score: todoScore,
          fullCompletionStreakDays: todoStreak
        },
        habit: {
          completedToday: habitCompletedToday,
          expectedToday: habitExpectedToday,
          score: habitScore,
          fullCompletionStreakDays: habitStreak
        }
      }
    });
  } catch (err) {
    console.error("getNavbarConsistency error:", err);
    return res.status(500).json({ message: "Failed to compute navbar consistency" });
  }
};
