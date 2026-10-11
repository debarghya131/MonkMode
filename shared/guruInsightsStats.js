import { computeJournalWeeklyStats, shiftReportDay, validReportDay } from "./journalWeeklyStats.js";
import { computeHabitWeeklyReport } from "./habitWeeklyStats.js";
import { computeTodoWeeklyReport, todoReportDay } from "./todoWeeklyStats.js";
import { computeGoalWeeklyReport } from "./goalWeeklyStats.js";
import { computeGymWeeklyReport } from "./gymWeeklyStats.js";

export const GURU_SCOPES = ["7d", "30d", "all"];
export const GURU_MESSAGE_LIMIT = 2000;
export const GURU_HISTORY_LIMIT = 10;

// Shared by chat and Insights. All totals use retained records, not audit-action counts.
export function computeGuruInsights(records, scope, { today, timezone = "Asia/Kolkata", time = "00:00", now = null }) {
  if (!GURU_SCOPES.includes(scope) || !validReportDay(today)) throw new Error("Invalid insights period");
  const { journals = [], habits = [], habitLogs = [], todos = [], goals = [], goalLogs = [], exercises = [], measurements = [] } = records;
  const dayOf = value => todoReportDay(value, timezone);
  const candidates = [today, ...journals.map(row => row.dayKey || dayOf(row.date)),
    ...habits.map(row => dayOf(row.startDate || row.createdAt)), ...habitLogs.map(row => row.dayKey || dayOf(row.date)),
    ...todos.flatMap(row => [dayOf(row.startDate || row.date || row.createdAt), ...(row.dayStates || []).map(state => state.dayKey)]),
    ...goals.map(row => dayOf(row.startDate || row.createdAt)), ...goalLogs.map(row => dayOf(row.date)),
    ...exercises.map(row => dayOf(row.date)), ...measurements.map(row => dayOf(row.checkInDate))]
    .filter(day => validReportDay(day) && day <= today).sort();
  const requestedFrom = scope === "all" ? candidates[0] : shiftReportDay(today, scope === "30d" ? -29 : -6);
  // A malformed legacy date must not cause unbounded calendar expansion.
  const from = requestedFrom < shiftReportDay(today, -36524) ? shiftReportDay(today, -36524) : requestedFrom;
  const length = Math.round((Date.parse(`${today}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86400000) + 1;
  const days = Array.from({ length }, (_, index) => shiftReportDay(from, index));
  const options = { today, timezone, time, now };
  const entries = journals.map(row => ({ ...row, dayKey: row.dayKey || dayOf(row.date) }));
  const journal = computeJournalWeeklyStats(entries, days);
  const habit = computeHabitWeeklyReport(habits, habitLogs, days, options);
  const todo = computeTodoWeeklyReport(todos, days, options);
  const goal = computeGoalWeeklyReport(goals, goalLogs, days, options);
  const gym = computeGymWeeklyReport({ exercises, measurements }, days, options);
  const moodCounts = new Map();
  // Canonical moods and duplicate-day resolution match the journal calculator.
  const canonical = new Map();
  for (const entry of entries) if (days.includes(entry.dayKey)) {
    const old = canonical.get(entry.dayKey);
    if (!old || (Date.parse(entry.updatedAt || entry.date) || 0) > (Date.parse(old.updatedAt || old.date) || 0)) canonical.set(entry.dayKey, entry);
  }
  for (const entry of canonical.values()) {
    const known = computeJournalWeeklyStats([entry], [entry.dayKey]).topMood?.label;
    if (known) moodCounts.set(known, (moodCounts.get(known) || 0) + 1);
  }
  const moodDistribution = [...moodCounts].map(([mood, count]) => ({ mood, count })).sort((a, b) => b.count - a.count || a.mood.localeCompare(b.mood));
  const currentGoals = goal.goals.filter(row => !row.deleted && !goals.find(source => String(source._id || source.id) === row.id)?.deletedAt);
  return {
    scope, timezone, period: { from, to: today },
    dataNote: `Based on retained records and current schedules; historical edits or deletions can change totals. Active counts and goal completion are current, not period achievements.${from !== requestedFrom ? " Calendar range limited to 100 years." : ""}`,
    journal: { entryCount: journal.loggedDays, avgEnergyLevel: journal.stats.energy.avg, avgOverallRating: journal.stats.rating.avg,
      energyRecordedDays: journal.stats.energy.recordedDays, ratingRecordedDays: journal.stats.rating.recordedDays, topMood: journal.topMood?.label || null, moodDistribution },
    habits: { totalActiveHabits: habits.filter(row => !row.deletedAt && (!row.endDate || dayOf(row.endDate) >= today) && dayOf(row.startDate || row.createdAt) <= today && row.archivedReason !== "deleted").length,
      completedLogs: habit.completed, possibleLogs: habit.totalInstances, missed: habit.missed, pending: habit.pending,
      completionRate: habit.totalInstances ? habit.completionRate : null },
    todos: { completed: todo.completed, total: todo.totalTasks, pending: todo.pending, missed: todo.missed,
      completionRate: todo.totalTasks ? todo.completionRate : null },
    goals: { activeGoals: currentGoals.length, completedGoals: currentGoals.filter(row => row.isCompleted).length,
      progressUpdates: goal.stats.progressUpdatesThisWeek, goalsUpdated: goal.goals.filter(row => row.progressUpdatesThisWeek > 0).length,
      milestoneCompletions: goal.stats.completedMilestonesThisWeek, unknownProgressGoals: goal.stats.unknownProgressGoals },
    gym: { workoutDays: gym.workoutDays, exercisesLogged: gym.stats.exerciseLogs, uniqueExercises: gym.stats.uniqueExercises,
      bodyPartsWorked: Object.keys(gym.stats.bodyGroupCounts), measurementsTaken: gym.stats.measurementDays },
  };
}
