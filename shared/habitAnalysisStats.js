import { computeHabitWeeklyReport } from "./habitWeeklyStats.js";
import { journalMonthDays } from "./journalAnalysisStats.js";
import { validReportDay } from "./journalWeeklyStats.js";

const counts = () => ({ total: 0, completed: 0, missed: 0, pending: 0 });
const rate = (part, total) => total ? Math.round(part / total * 1000) / 10 : null;
const rates = row => ({ ...row, completionRate: rate(row.completed, row.total),
  missedRate: rate(row.missed, row.total), pendingRate: rate(row.pending, row.total) });
const rollup = rows => rows.reduce((sum, row) => {
  for (const key of Object.keys(sum)) sum[key] += row[key];
  return sum;
}, counts());
const activity = (rows, totals) => {
  const scheduledDays = rows.filter(row => row.total > 0).length;
  const activeDays = rows.filter(row => row.completed > 0).length;
  return { activeDays, scheduledDays, consistency: rate(activeDays, scheduledDays),
    score: totals.total ? Math.round(Math.round(totals.completed / totals.total * 100) * 0.7
      + Math.round(activeDays / scheduledDays * 100) * 0.3) : null };
};

export function computeHabitAnalysis(habits, logs, { year, month, today, timezone = "Asia/Kolkata" }) {
  const calendar = journalMonthDays(year, month);
  if (!validReportDay(today)) throw new Error("Invalid app date");
  const daily = new Map(calendar.map(date => [date, { date, label: String(Number(date.slice(-2))),
    weekday: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][new Date(date + "T12:00:00Z").getUTCDay()], ...counts() }]));
  const categories = new Map(), perHabit = new Map(), totals = counts();
  const priorities = new Map(["High", "Medium", "Low"].map(name => [name, { name, label: name, ...counts() }]));
  const times = new Map(["Morning", "Afternoon", "Evening", "Night", "Unspecified"].map(name => [name, { name, label: name, ...counts() }]));
  const currentMonth = calendar[0] <= today && calendar.at(-1) >= today;
  computeHabitWeeklyReport(habits, logs, calendar, { today, timezone, onOccurrence(occurrence) {
    if (!categories.has(occurrence.category)) categories.set(occurrence.category, { name: occurrence.category, label: occurrence.category, ...counts() });
    if (!perHabit.has(occurrence.id)) perHabit.set(occurrence.id, { id: occurrence.id, name: occurrence.name, label: occurrence.name,
      important: occurrence.important, targetStreak: occurrence.targetStreak, ...counts(),
      endingRun: 0, longestStreak: 0, breakLengths: [], currentEligible: occurrence.currentEligible });
    const habit = perHabit.get(occurrence.id);
    for (const row of [totals, daily.get(occurrence.dayKey), categories.get(occurrence.category),
      priorities.get(occurrence.priority), times.get(occurrence.timeOfDay), habit]) {
      row.total++; row[occurrence.status]++;
    }
    if (occurrence.status === "completed") {
      habit.endingRun++; habit.longestStreak = Math.max(habit.longestStreak, habit.endingRun);
    } else if (occurrence.status === "missed") {
      if (habit.endingRun) habit.breakLengths.push(habit.endingRun);
      habit.endingRun = 0;
    }
  } });
  let fullRun = 0, longestFullCompletionStreak = 0, fullCompletionBreaks = 0;
  const days = [...daily.values()].map(row => {
    const future = row.date > today, fullCompletion = row.total > 0 && row.completed === row.total;
    let fullStreak = null;
    if (fullCompletion) { fullRun++; longestFullCompletionStreak = Math.max(longestFullCompletionStreak, fullRun); fullStreak = fullRun; }
    else if (row.date < today) { if (fullRun) fullCompletionBreaks++; fullRun = 0; fullStreak = 0; }
    return { ...rates(row), future, fullCompletion, fullStreak,
      status: future ? "future" : row.total ? row.date === today ? "in-progress" : "scheduled" : "no habits" };
  });
  const habitRows = [...perHabit.values()].map(({ currentEligible, ...row }) => ({ ...rates(row),
    currentRun: currentMonth && currentEligible ? row.endingRun : 0, streakBreaks: row.breakLengths.length }))
    .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  const names = new Map();
  for (const row of habitRows) names.set(row.name, (names.get(row.name) || 0) + 1);
  const ordinals = new Map();
  for (const row of habitRows) if (names.get(row.name) > 1) {
    const ordinal = (ordinals.get(row.name) || 0) + 1;
    ordinals.set(row.name, ordinal);
    row.label = row.name + " · " + ordinal;
  }
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(label => {
    const rows = days.filter(row => row.weekday === label), total = rollup(rows);
    return { label, ...rates(total), ...activity(rows, total) };
  });
  const weeks = Array.from({ length: Math.ceil(days.length / 7) }, (_, index) => {
    const rows = days.slice(index * 7, index * 7 + 7), total = rollup(rows);
    return { label: "Week " + (index + 1), from: rows[0].date, to: rows.at(-1).date, ...rates(total), ...activity(rows, total) };
  });
  const eligibleWeekdays = weekdays.filter(row => row.total);
  const scored = weeks.filter(row => row.score !== null);
  const broken = new Map();
  for (const row of habitRows) for (const length of row.breakLengths) broken.set(length, (broken.get(length) || 0) + 1);
  const commonBreak = [...broken].sort((a,b) => b[1] - a[1] || a[0] - b[0])[0];
  return { days, weeks, weekdays, habits: habitRows,
    categories: [...categories.values()].map(rates).sort((a,b) => b.total - a.total || a.name.localeCompare(b.name)),
    priorities: [...priorities.values()].map(rates), times: [...times.values()].map(rates),
    totals: { ...rates(totals), ...activity(days, totals) },
    fullCompletionDays: days.filter(row => row.fullCompletion).length, longestFullCompletionStreak, fullCompletionBreaks,
    currentFullCompletionRun: currentMonth ? fullRun : 0,
    longestHabitStreak: Math.max(0, ...habitRows.map(row => row.longestStreak)),
    habitStreakBreaks: habitRows.reduce((sum,row) => sum + row.streakBreaks, 0),
    commonBreak: commonBreak ? { length: commonBreak[0], count: commonBreak[1] } : null,
    maintainedHabits: habitRows.filter(row => row.missed === 0).length, missedHabits: habitRows.filter(row => row.missed > 0).length,
    averageBlockScore: scored.length ? Math.round(scored.reduce((sum,row) => sum + row.score,0) / scored.length * 10) / 10 : null,
    highestWeekday: [...eligibleWeekdays].sort((a,b) => b.completionRate - a.completionRate)[0] || null,
    lowestWeekday: [...eligibleWeekdays].sort((a,b) => a.completionRate - b.completionRate)[0] || null };
}
