import { GURU_SCOPES } from "../../../../shared/guruInsightsStats.js";
import { validReportDay, shiftReportDay } from "../../../../shared/journalWeeklyStats.js";
import { todoReportDay } from "../../../../shared/todoWeeklyStats.js";

const object = value => value !== null && typeof value === "object" && !Array.isArray(value);
const text = value => typeof value === "string";
const count = value => Number.isSafeInteger(value) && value >= 0;
const score = value => value === null || (typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100);
const fields = (value, names, check) => object(value) && names.split(" ").every(key => check(value[key]));
const counts = (value, names) => fields(value, names, count);

export function validGuruInsights(value, scope) {
  if (!object(value) || !GURU_SCOPES.includes(scope) || value.scope !== scope || !text(value.dataNote)
    || !validReportDay(value.period?.from) || !validReportDay(value.period?.to) || value.period.from > value.period.to) return false;
  if (scope !== "all" && value.period.from !== shiftReportDay(value.period.to, scope === "7d" ? -6 : -29)) return false;
  if (!text(value.timezone)) return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: value.timezone });
    if (value.serverNow !== undefined && (!text(value.serverNow) || !Number.isFinite(Date.parse(value.serverNow))
      || todoReportDay(value.serverNow, value.timezone) !== value.period.to)) return false;
  } catch { return false; }
  const { journal, habits, todos, goals, gym } = value;
  if (!counts(journal, "entryCount energyRecordedDays ratingRecordedDays")
    || !score(journal.avgEnergyLevel) || !score(journal.avgOverallRating)
    || !(journal.topMood === null || text(journal.topMood)) || !Array.isArray(journal.moodDistribution)
    || !journal.moodDistribution.every(row => object(row) && text(row.mood) && count(row.count))
    || journal.energyRecordedDays > journal.entryCount || journal.ratingRecordedDays > journal.entryCount
    || (journal.energyRecordedDays === 0) !== (journal.avgEnergyLevel === null)
    || (journal.ratingRecordedDays === 0) !== (journal.avgOverallRating === null)) return false;
  if (!counts(habits, "totalActiveHabits completedLogs possibleLogs missed pending") || !score(habits.completionRate)
    || habits.completedLogs + habits.missed + habits.pending !== habits.possibleLogs
    || !counts(todos, "completed total missed pending") || !score(todos.completionRate)
    || todos.completed + todos.missed + todos.pending !== todos.total) return false;
  if (habits.completionRate !== (habits.possibleLogs ? Math.round(habits.completedLogs / habits.possibleLogs * 100) : null)
    || todos.completionRate !== (todos.total ? Math.round(todos.completed / todos.total * 100) : null)) return false;
  if (!counts(goals, "activeGoals completedGoals progressUpdates goalsUpdated milestoneCompletions unknownProgressGoals")
    || goals.completedGoals > goals.activeGoals || !counts(gym, "workoutDays exercisesLogged uniqueExercises measurementsTaken")
    || !Array.isArray(gym.bodyPartsWorked) || !gym.bodyPartsWorked.every(text)) return false;
  return true;
}

export function validGuruReply(value, scope) {
  return object(value) && value.scope === scope && text(value.reply) && Boolean(value.reply.trim()) && value.reply.length <= 8000
    && validReportDay(value.period?.from) && validReportDay(value.period?.to) && value.period.from <= value.period.to;
}

export function guruFailureMessage(error, fallback) {
  return [error?.response?.data?.error, error?.response?.data?.message]
    .find(value => text(value) && value.trim()) || fallback;
}
