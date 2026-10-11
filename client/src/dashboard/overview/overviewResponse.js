import { validReportDay } from "../../../../shared/journalWeeklyStats.js";
import { validCount, validJournalSummary } from "../journal/journalResponse.js";

const counts = (data, keys) => Boolean(data && keys.every(key => validCount(data[key])));
export const overviewValidators = {
  journal: validJournalSummary,
  tasks: data => counts(data?.today, ["total", "completed", "pending", "missed"])
    && data.today.total === data.today.completed + data.today.pending + data.today.missed
    && validCount(data.importantToday ?? data.today.important) && (data.importantToday ?? data.today.important) <= data.today.total,
  habits: data => counts(data, ["completedToday", "expectedToday"]) && data.completedToday <= data.expectedToday,
  goals: data => counts(data, ["totalGoals", "completedGoals", "totalSubgoals", "completedSubgoals"])
    && data.completedGoals <= data.totalGoals && data.completedSubgoals <= data.totalSubgoals,
  gym: data => counts(data, ["completedProgress", "totalProgress", "pendingUpdates", "progressUpdatesToday"])
    && data.completedProgress + data.pendingUpdates === data.totalProgress
    && ["lastMeasurementCheckInDate", "lastPicUploadedDate"].every(key => data[key] === null || validReportDay(data[key]))
};

export function validOverviewHeatmap(data, kind) {
  if (!data || !Array.isArray(data.values) || !Array.isArray(data.years)
    || !data.years.every(year => Number.isSafeInteger(year) && year >= 1970 && year <= 3000)) return false;
  const dates = new Set();
  return data.values.every(row => {
    if (!row || !validReportDay(row.date) || dates.has(row.date) || !validCount(row.count) || row.count > 4) return false;
    dates.add(row.date);
    if (kind === "journal") return row.count === 1 && validCount(row.entries) && row.entries > 0;
    if (kind === "todo" || kind === "habit") return counts(row, ["completed", "total", "missed", "pending"])
      && row.completed + row.missed + row.pending === row.total;
    if (kind === "goal") return counts(row, ["completedSubgoals"]);
    if (kind === "gym") return counts(row, ["completedProgress", "updates", "exercises", "measurement", "gallery"]);
    return false;
  });
}
export const heatmapValidators = Object.fromEntries(["journal", "todo", "habit", "goal", "gym"].map(kind => [kind, data => validOverviewHeatmap(data, kind)]));

// The calendar library parses ISO date-only strings as UTC, then uses local
// dates to position cells. Local noon also avoids its fixed 24-hour index
// calculation shifting midnight values across daylight-saving transitions.
export function toCalendarHeatmapValues(values) {
  return values.map(value => {
    const [year, month, day] = value.date.split("-").map(Number);
    return { ...value, dayKey: value.date, date: new Date(year, month - 1, day, 12) };
  });
}
export const OVERVIEW_EVENTS = {
  journal: ["monkmode:journal-logged-days-updated"], tasks: ["monkmode:todos-updated"], habits: ["monkmode:habits-updated"],
  goals: ["monkmode:goals-updated"], gym: ["monkmode:gym-measurements-updated", "monkmode:gym-gallery-updated", "monkmode:exercise-progress-updated", "monkmode:gym-workouts-updated"]
};
