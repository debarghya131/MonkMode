import { journalMonthDays } from "../../../../../shared/journalAnalysisStats.js";
import { validReportDay } from "../../../../../shared/journalWeeklyStats.js";

const integer = value => Number.isSafeInteger(value) && value >= 0;
const rate = value => value === null || (typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100);
const counts = row => Boolean(row && ["total", "completed", "pending", "missed"].every(key => integer(row[key]))
  && row.total === row.completed + row.pending + row.missed
  && ["completionRate", "missedRate", "pendingRate"].every(key => rate(row[key])));
const rows = (value, check) => Array.isArray(value) && value.every(check);

export function habitAnalysisClockValid(data) {
  if (!validReportDay(data?.today) || typeof data.timezone !== "string" || typeof data.serverNow !== "string"
    || !Number.isFinite(Date.parse(data.serverNow))) return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: data.timezone }).format();
    return true;
  } catch { return false; }
}

export function validHabitAnalysisResponse(data, period) {
  if (data?.year !== Number(period.year) || data.month !== Number(period.month) || !habitAnalysisClockValid(data)) return false;
  const analysis = data.analysis, calendar = journalMonthDays(period.year, period.month);
  if (!counts(analysis?.totals) || !rate(analysis.totals.score) || !rate(analysis.totals.consistency)
    || !integer(analysis.totals.activeDays) || !integer(analysis.totals.scheduledDays) || !rate(analysis.averageBlockScore)
    || !["longestHabitStreak", "longestFullCompletionStreak", "fullCompletionBreaks", "currentFullCompletionRun", "habitStreakBreaks", "fullCompletionDays", "maintainedHabits", "missedHabits"].every(key => integer(analysis[key]))) return false;
  if (!rows(analysis.days, row => counts(row) && typeof row.status === "string" && typeof row.weekday === "string"
      && typeof row.future === "boolean" && typeof row.fullCompletion === "boolean" && (row.fullStreak === null || integer(row.fullStreak)))
    || analysis.days.length !== calendar.length || analysis.days.some((row, index) => row.date !== calendar[index])) return false;
  if (!rows(analysis.categories, row => counts(row) && typeof row.name === "string" && typeof row.label === "string")
    || !rows(analysis.priorities, row => counts(row) && ["High", "Medium", "Low"].includes(row.name) && typeof row.label === "string") || analysis.priorities.length !== 3
    || !rows(analysis.times, row => counts(row) && typeof row.label === "string") || analysis.times.length !== 5
    || !rows(analysis.weekdays, row => counts(row) && typeof row.label === "string" && rate(row.consistency)) || analysis.weekdays.length !== 7
    || !rows(analysis.weeks, row => counts(row) && typeof row.label === "string" && validReportDay(row.from) && validReportDay(row.to) && rate(row.score))
    || analysis.weeks.length !== Math.ceil(calendar.length / 7)) return false;
  if (!rows(analysis.habits, row => counts(row) && typeof row.id === "string" && typeof row.name === "string" && typeof row.label === "string"
      && typeof row.important === "boolean" && ["endingRun", "currentRun", "longestStreak", "streakBreaks"].every(key => integer(row[key]))
      && (row.targetStreak === null || integer(row.targetStreak)) && rows(row.breakLengths, integer))
    || new Set(analysis.habits.map(row => row.id)).size !== analysis.habits.length) return false;
  for (const key of ["highestWeekday", "lowestWeekday"]) {
    if (analysis[key] !== null && !(counts(analysis[key]) && typeof analysis[key].label === "string")) return false;
  }
  if (analysis.commonBreak !== null && !(integer(analysis.commonBreak?.length) && integer(analysis.commonBreak?.count))) return false;
  return data.joinedDay === null || validReportDay(data.joinedDay);
}
