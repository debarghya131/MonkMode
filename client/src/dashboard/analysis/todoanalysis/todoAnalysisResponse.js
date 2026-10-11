import { journalMonthDays } from "../../../../../shared/journalAnalysisStats.js";
import { validReportDay } from "../../../../../shared/journalWeeklyStats.js";

const integer = value => Number.isSafeInteger(value) && value >= 0;
const rate = value => value === null || (typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100);
const counts = row => Boolean(row && ["total", "completed", "pending", "missed", "lateCompleted", "timingKnown"].every(key => integer(row[key]))
  && row.total === row.completed + row.pending + row.missed
  && row.lateCompleted <= row.timingKnown && row.timingKnown <= row.completed
  && ["completionRate", "missedRate", "pendingRate", "lateRate"].every(key => rate(row[key])));
const rows = (value, check) => Array.isArray(value) && value.every(check);

export function todoAnalysisClockValid(data) {
  if (!validReportDay(data?.today) || typeof data.timezone !== "string" || typeof data.serverNow !== "string"
    || !Number.isFinite(Date.parse(data.serverNow))) return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: data.timezone }).format();
    return true;
  } catch { return false; }
}

export function validTodoAnalysisResponse(data, period) {
  if (data?.year !== Number(period.year) || data.month !== Number(period.month) || !todoAnalysisClockValid(data)) return false;
  const analysis = data.analysis, calendar = journalMonthDays(period.year, period.month);
  if (!counts(analysis?.totals) || !rate(analysis.totals.score) || !rate(analysis.totals.consistency)
    || !integer(analysis.totals.activeDays) || !integer(analysis.totals.scheduledDays)
    || !integer(analysis.longestStreak) || !integer(analysis.currentStreak) || !integer(analysis.streakBreaks)
    || !rate(analysis.averageBlockScore)) return false;
  if (!rows(analysis.days, row => counts(row) && typeof row.status === "string" && typeof row.weekday === "string"
      && typeof row.future === "boolean" && (row.streak === null || integer(row.streak)))
    || analysis.days.length !== calendar.length || analysis.days.some((row, index) => row.date !== calendar[index])) return false;
  if (!rows(analysis.categories, row => counts(row) && typeof row.name === "string" && typeof row.label === "string" && typeof row.important === "boolean")
    || !rows(analysis.priorities, row => counts(row) && ["High", "Medium", "Low"].includes(row.name) && typeof row.label === "string") || analysis.priorities.length !== 3
    || !rows(analysis.timeSlots, row => counts(row) && typeof row.label === "string") || analysis.timeSlots.length !== 7
    || !rows(analysis.weekdays, row => counts(row) && typeof row.label === "string" && rate(row.consistency)) || analysis.weekdays.length !== 7
    || !rows(analysis.weeks, row => counts(row) && typeof row.label === "string" && validReportDay(row.from) && validReportDay(row.to) && rate(row.score))
    || analysis.weeks.length !== Math.ceil(calendar.length / 7)) return false;
  for (const key of ["highestWeekday", "lowestWeekday"]) {
    if (analysis[key] !== null && !(counts(analysis[key]) && typeof analysis[key].label === "string")) return false;
  }
  return data.joinedDay === null || validReportDay(data.joinedDay);
}
