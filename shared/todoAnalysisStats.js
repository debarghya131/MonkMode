import { computeTodoWeeklyReport, TODO_REPORT_TIME_BUCKETS } from "./todoWeeklyStats.js";
import { journalMonthDays } from "./journalAnalysisStats.js";
import { validReportDay } from "./journalWeeklyStats.js";

const counts = () => ({ total: 0, completed: 0, pending: 0, missed: 0, lateCompleted: 0, timingKnown: 0 });
export const todoAnalysisRate = (part, total) => total ? Math.round(part / total * 1000) / 10 : null;
const rates = row => ({ ...row, completionRate: todoAnalysisRate(row.completed, row.total),
  missedRate: todoAnalysisRate(row.missed, row.total), pendingRate: todoAnalysisRate(row.pending, row.total),
  lateRate: todoAnalysisRate(row.lateCompleted, row.timingKnown) });
const increment = (row, occurrence) => {
  row.total++;
  row[occurrence.status]++;
  if (occurrence.lateCompleted) row.lateCompleted++;
  if (occurrence.timingKnown) row.timingKnown++;
};
const rollup = rows => rows.reduce((sum, row) => {
  for (const key of Object.keys(sum)) sum[key] += row[key];
  return sum;
}, counts());
const activityScore = (rows, totals) => {
  const scheduledDays = rows.filter(row => row.total > 0).length;
  const activeDays = rows.filter(row => row.completed > 0).length;
  const consistency = todoAnalysisRate(activeDays, scheduledDays);
  const completionRate = todoAnalysisRate(totals.completed, totals.total);
  return { scheduledDays, activeDays, consistency, completionRate,
    // Weekly reports round each raw ratio to a whole percent before weighting.
    // Keep display precision separate so rounded display values cannot change it.
    score: totals.total ? Math.round(Math.round(totals.completed / totals.total * 100) * 0.7
      + Math.round(activeDays / scheduledDays * 100) * 0.3) : null };
};

export function computeTodoAnalysis(tasks, { year, month, today, time = "00:00", timezone = "Asia/Kolkata",
  importantCategories = ["Health", "Bill & Payment"] }) {
  const calendar = journalMonthDays(year, month);
  if (!validReportDay(today) || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error("Invalid analysis clock");
  const daysByKey = new Map(calendar.map(date => [date, { date, label: String(Number(date.slice(-2))),
    weekday: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][new Date(`${date}T12:00:00Z`).getUTCDay()], ...counts() }]));
  const categories = new Map();
  const priorities = new Map(["High", "Medium", "Low"].map(name => [name, { name, label: name, ...counts() }]));
  const timeSlots = TODO_REPORT_TIME_BUCKETS.map(bucket => ({ ...bucket, label: bucket.range, ...counts() }));
  const totals = counts();
  computeTodoWeeklyReport(tasks, calendar, { today, time, timezone, importantCategories,
    onOccurrence(occurrence) {
      if (!categories.has(occurrence.category)) categories.set(occurrence.category,
        { name: occurrence.category, label: occurrence.category, ...counts() });
      const hour = occurrence.time ? Number(occurrence.time.slice(0, 2)) : null;
      const bucket = hour === null ? timeSlots.at(-1) : timeSlots.find(slot => hour >= slot.start && hour < slot.end);
      for (const row of [totals, daysByKey.get(occurrence.dayKey), categories.get(occurrence.category), priorities.get(occurrence.priority), bucket]) increment(row, occurrence);
    },
  });
  let run = 0, longestStreak = 0, streakBreaks = 0;
  const days = [...daysByKey.values()].map(row => {
    const future = row.date > today;
    let streak = null, breakDay = false;
    if (row.completed > 0) { run++; longestStreak = Math.max(longestStreak, run); streak = run; }
    else if (row.date < today) { breakDay = run > 0; if (breakDay) streakBreaks++; run = 0; streak = 0; }
    // An unfinished current day cannot break a calendar-day activity run yet.
    const status = future ? "future" : row.total ? (row.date === today ? "in-progress" : "scheduled") : "no tasks";
    return { ...rates(row), status, future, streak, breakDay };
  });
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(label => {
    const rows = days.filter(row => row.weekday === label);
    return { label, ...rates(rollup(rows)), ...activityScore(rows, rollup(rows)) };
  });
  const weeks = Array.from({ length: Math.ceil(days.length / 7) }, (_, index) => {
    const rows = days.slice(index * 7, index * 7 + 7), total = rollup(rows);
    return { label: `Week ${index + 1}`, from: rows[0].date, to: rows.at(-1).date,
      ...rates(total), ...activityScore(rows, total), days: rows };
  });
  const important = new Set(importantCategories.filter(value => typeof value === "string").map(value => value.trim().toLowerCase()));
  const categoryRows = [...categories.values()].map(row => ({ ...rates(row), important: important.has(row.name.toLowerCase()) }))
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
  const scoredWeeks = weeks.filter(row => row.score !== null);
  const eligible = weekdays.filter(row => row.total > 0);
  return { days, categories: categoryRows, priorities: [...priorities.values()].map(rates), timeSlots: timeSlots.map(rates),
    weekdays, weeks, totals: { ...rates(totals), ...activityScore(days, totals) }, longestStreak, streakBreaks,
    // A trailing run is only current when it reaches yesterday or today, not an old selected month.
    currentStreak: days.at(-1).date >= today ? run : 0,
    averageBlockScore: scoredWeeks.length ? Math.round(scoredWeeks.reduce((sum, row) => sum + row.score, 0) / scoredWeeks.length * 10) / 10 : null,
    highestWeekday: [...eligible].sort((a, b) => b.completionRate - a.completionRate)[0] || null,
    lowestWeekday: [...eligible].sort((a, b) => a.completionRate - b.completionRate)[0] || null,
  };
}
