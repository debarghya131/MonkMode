import { journalMonthDays, journalMood } from "../../../../../shared/journalAnalysisStats.js";
import { validReportDay } from "../../../../../shared/journalWeeklyStats.js";
import { todoReportDay } from "../../../../../shared/todoWeeklyStats.js";

const integer = value => Number.isSafeInteger(value) && value >= 0;
const number = (value, min, max) => typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
const nullable = (value, check) => value === null || check(value);
const score = value => nullable(value, item => number(item, 1, 100));
const clock = value => typeof value === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
const mood = value => value === null || (typeof value === "string" && journalMood(value)?.label === value);
const rows = (value, max, check) => Array.isArray(value) && value.length <= max && value.every(check);
const tags = value => Array.isArray(value) && value.every(item => typeof item === "string" && Boolean(item.trim()));
const entry = row => Boolean(row && validReportDay(row.date) && mood(row.mood) && score(row.energy) && score(row.rating)
  && (row.sleepTime === "" || clock(row.sleepTime)) && (row.wakeUpTime === "" || clock(row.wakeUpTime))
  && nullable(row.sleepMinutes, value => Number.isSafeInteger(value) && value > 0 && value <= 1080)
  && ["wins", "mistakes", "achievement", "gratitude"].every(key => integer(row[key]))
  && tags(row.mistakeTags) && tags(row.distractionTags));
const daily = row => Boolean(row && validReportDay(row.date) && typeof row.label === "string"
  && ["logged", "future", "not-tracked", "pending", "missed"].includes(row.status) && typeof row.logged === "boolean"
  && row.logged === (row.status === "logged") && mood(row.mood) && score(row.energy) && score(row.rating)
  && nullable(row.sleep, value => number(value, Number.MIN_VALUE, 18))
  && ["wins", "mistakes", "achievement", "streak"].every(key => nullable(row[key], integer))
  && (row.logged || ["mood", "energy", "rating", "sleep", "wins", "mistakes", "achievement"].every(key => row[key] === null)));
const weekday = row => Boolean(row && ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].includes(row.label)
  && score(row.rating) && integer(row.count) && integer(row.missed));

export function journalAnalysisClockValid(data) {
  if (!validReportDay(data?.today) || typeof data.timezone !== "string" || typeof data.serverNow !== "string"
    || !Number.isFinite(Date.parse(data.serverNow))) return false;
  try { return todoReportDay(data.serverNow, data.timezone) === data.today; }
  catch { return false; }
}

// Validate every nested value consumed by all three tabs before putting a
// response into React state. An invalid payload must remain a retryable error.
export function validJournalAnalysisResponse(data, period) {
  let calendar;
  try { calendar = journalMonthDays(period?.year, period?.month); } catch { return false; }
  if (data?.year !== Number(period.year) || data.month !== Number(period.month) || !journalAnalysisClockValid(data)
    || !(data.joinedDay === null || validReportDay(data.joinedDay)) || typeof data.dataNote !== "string") return false;
  const analysis = data.analysis;
  if (!analysis || !rows(data.entries, calendar.length, entry)
    || data.entries.some((row, index) => !calendar.includes(row.date) || row.date > data.today
      || (index > 0 && row.date <= data.entries[index - 1].date))) return false;
  const loggedDates = new Set(data.entries.map(row => row.date));
  if (!rows(analysis.days, calendar.length, daily) || analysis.days.length !== calendar.length
    || analysis.days.some((row, index) => row.date !== calendar[index] || row.logged !== loggedDates.has(row.date)
      || (row.date > data.today) !== (row.status === "future") || (row.status === "missed" && row.date >= data.today))) return false;
  if (!rows(analysis.weeks, 5, (row, index) => {
    const block = calendar.slice(index * 7, index * 7 + 7);
    return Boolean(row && row.label === `Week ${index + 1}` && row.from === block[0] && row.to === block.at(-1)
      && integer(row.expectedDays) && row.expectedDays <= block.length && integer(row.loggedDays)
      && row.loggedDays <= row.expectedDays && nullable(row.score, value => number(value, 0, 100))
      && rows(row.days, block.length, daily) && row.days.length === block.length
      && row.days.every((day, offset) => day.date === block[offset]
        && Object.keys(analysis.days[index * 7 + offset]).every(key => day[key] === analysis.days[index * 7 + offset][key])));
  }) || analysis.weeks.length !== Math.ceil(calendar.length / 7)) return false;
  if (!rows(analysis.moods, 20, row => {
    const known = journalMood(row?.mood);
    return Boolean(row && known && row.label === known.label && row.emoji === known.emoji && row.color === known.color
      && integer(row.count) && row.count > 0 && row.count <= data.entries.length
      && score(row.energy) && score(row.rating) && integer(row.energyCount) && row.energyCount <= row.count
      && integer(row.ratingCount) && row.ratingCount <= row.count && number(row.percentage, 0, 100));
  }) || new Set(analysis.moods.map(row => row.mood)).size !== analysis.moods.length
    || !rows(analysis.weekdays, 7, weekday) || analysis.weekdays.length !== 7
    || new Set(analysis.weekdays.map(row => row.label)).size !== 7) return false;
  if (!["loggedDays", "moodLoggedDays", "sleepRecordedDays", "energyRecordedDays", "ratingRecordedDays", "wins", "mistakes",
    "achievements", "longestStreak", "streakBreaks", "missedDays", "pendingDays"].every(key => integer(analysis[key]))
    || analysis.loggedDays !== data.entries.length || analysis.moodLoggedDays !== data.entries.filter(row => row.mood !== null).length
    || analysis.moods.reduce((sum, row) => sum + row.count, 0) !== analysis.moodLoggedDays
    || ["sleepRecordedDays", "energyRecordedDays", "ratingRecordedDays"].some(key => analysis[key] > analysis.loggedDays)
    || !score(analysis.avgEnergy) || !score(analysis.avgRating)
    || !nullable(analysis.avgWeeklyScore, value => number(value, 0, 100))
    || !nullable(analysis.avgSleepMinutes, value => number(value, Number.MIN_VALUE, 1080))
    || !nullable(analysis.avgSleepTime, clock) || !nullable(analysis.avgWakeTime, clock)) return false;
  if (!["highestEnergy", "lowestEnergy"].every(key => nullable(analysis[key], row => entry(row) && loggedDates.has(row.date) && row.energy !== null))
    || !["highestRatedWeekday", "lowestRatedWeekday"].every(key => nullable(analysis[key], row => weekday(row) && row.rating !== null))
    || !["topMistakes", "topDistractions"].every(key => rows(analysis[key], 5, row => Boolean(row && typeof row.label === "string"
      && row.label.trim() && integer(row.count) && row.count >= 2 && row.count <= analysis.loggedDays)))) return false;
  return true;
}
