import { APP_TIMEZONE } from "../config/runtime.js";
import Journal from "../models/Journal.js";
import Habit from "../models/Habit.js";
import HabitLog from "../models/HabitLog.js";
import Todo from "../models/Todo.js";
import Goal from "../models/Goal.js";
import GoalProgressLog from "../models/GoalProgressLog.js";
import GymExerciseProgress from "../models/GymExerciseProgress.js";
import GymMeasurement from "../models/GymMeasurement.js";
import { HABIT_REPORT_FIELDS, habitLogFilter } from "./habitWeeklyReportUtils.js";
import { TODO_REPORT_FIELDS, todoReportFilter } from "./todoWeeklyReportUtils.js";
import { GOAL_REPORT_FIELDS } from "./goalWeeklyReportUtils.js";
import { GYM_EXERCISE_FIELDS, GYM_MEASUREMENT_FIELDS } from "./gymWeeklyReportUtils.js";
import { computeGuruInsights, GURU_SCOPES } from "../../shared/guruInsightsStats.js";
import { todoReportDay } from "../../shared/todoWeeklyStats.js";
import { shiftReportDay } from "../../shared/journalWeeklyStats.js";

export async function loadGuruInsights(userId, scope, now = new Date()) {
  if (!GURU_SCOPES.includes(scope)) throw new Error("Invalid insights scope");
  const today = todoReportDay(now, APP_TIMEZONE);
  const from = scope === "all" ? "1900-01-01" : shiftReportDay(today, scope === "30d" ? -29 : -6);
  const days = [from, today];
  // Broad timestamp bounds are resolved to exact app days by the shared calculator.
  const date = { $gte: new Date(Date.parse(`${from}T00:00:00Z`) - 86400000), $lt: new Date(Date.parse(`${today}T00:00:00Z`) + 2 * 86400000) };
  const journalsRead = Journal.find({ userId, $or: [{ dayKey: { $gte: from, $lte: today } }, { dayKey: null, date }] }, { dayKey: 1, date: 1, updatedAt: 1, mood: 1, energyLevel: 1, overallRating: 1 }).lean();
  const habitsRead = Habit.find({ userId }, HABIT_REPORT_FIELDS).lean();
  const goalsRead = Goal.find({ userId }, GOAL_REPORT_FIELDS).lean();
  // Start each dependent log read as soon as its owned definitions arrive,
  // without waiting for unrelated Journal, Todo, or Gym reads to finish.
  const habitLogsRead = habitsRead.then(habits => HabitLog.find(
    habitLogFilter(habits.map(row => row._id), days),
    { habitId: 1, dayKey: 1, date: 1, completed: 1, updatedAt: 1 }
  ).lean());
  const goalLogsRead = goalsRead.then(goals => GoalProgressLog.find(
    { userId, goalId: { $in: goals.map(row => row._id) } },
    { goalId: 1, date: 1, previousValue: 1, currentValue: 1 }
  ).lean());
  const [journals, habits, todos, goals, exercises, measurements, habitLogs, goalLogs] = await Promise.all([
    journalsRead,
    habitsRead,
    Todo.find(todoReportFilter(userId, days), TODO_REPORT_FIELDS).lean(),
    goalsRead,
    GymExerciseProgress.find({ userId, date: { $gte: from, $lte: today } }, GYM_EXERCISE_FIELDS).lean(),
    GymMeasurement.find({ userId, deletedAt: null, checkInDate: { $gte: from, $lte: today } }, GYM_MEASUREMENT_FIELDS).lean(),
    habitLogsRead,
    goalLogsRead,
  ]);
  const time = new Intl.DateTimeFormat("en-GB", { timeZone: APP_TIMEZONE, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(now);
  return { ...computeGuruInsights({ journals, habits, habitLogs, todos, goals, goalLogs, exercises, measurements }, scope,
    { today, time, timezone: APP_TIMEZONE, now: now.getTime() }), serverNow: now.toISOString() };
}
