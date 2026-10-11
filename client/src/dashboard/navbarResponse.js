import { validReportDay } from "../../../shared/journalWeeklyStats.js";
import { todoReportDay } from "../../../shared/todoWeeklyStats.js";

const count = value => Number.isSafeInteger(value) && value >= 0;
const score = value => count(value) && value <= 100;

export function validNavbarStats(data) {
  if (!data || !validReportDay(data.date) || !score(data.consistencyScore)
    || !count(data.monkStreakDays) || typeof data.allSectionsComplete !== "boolean"
    || typeof data.timezone !== "string") return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: data.timezone });
    // Older deployments may omit serverNow; do not invent a clock offset.
    if (data.serverNow !== undefined && (typeof data.serverNow !== "string"
      || !Number.isFinite(Date.parse(data.serverNow))
      || todoReportDay(data.serverNow, data.timezone) !== data.date)) return false;
  } catch { return false; }
  const journal = data.sections?.journal, todo = data.sections?.todo, habit = data.sections?.habit;
  if (!journal || !todo || !habit || typeof journal.submittedToday !== "boolean"
    || !count(journal.currentStreakDays) || journal.score !== (journal.submittedToday ? 100 : 0)) return false;
  for (const section of [todo, habit]) {
    if (!count(section.completedToday) || !count(section.expectedToday)
      || section.completedToday > section.expectedToday || !count(section.fullCompletionStreakDays)
      || !score(section.score) || section.score !== (section.expectedToday
        ? Math.round(section.completedToday / section.expectedToday * 100) : 0)) return false;
  }
  if (data.consistencyScore !== Math.round((journal.score + todo.score + habit.score) / 3)
    || data.monkStreakDays > Math.min(journal.currentStreakDays, todo.fullCompletionStreakDays, habit.fullCompletionStreakDays)) return false;
  return !data.allSectionsComplete || (data.consistencyScore === 100 && data.monkStreakDays > 0);
}
