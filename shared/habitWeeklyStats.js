import { validReportDay, reportDayLabel, reportWeekLabel } from "./journalWeeklyStats.js";
import { todoReportDay } from "./todoWeeklyStats.js";

const names = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const text = (value, fallback) => typeof value === "string" && value.trim() ? value.trim() : fallback;
const stamp = value => Date.parse(value || "") || 0;
const timeValid = value => typeof value === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
const counts = () => ({ total: 0, completed: 0, missed: 0, pending: 0 });

function scheduled(habit, day, timezone) {
  const start = todoReportDay(habit.startDate || habit.createdAt, timezone);
  const created = todoReportDay(habit.createdAt, timezone);
  const end = todoReportDay(habit.endDate, timezone);
  if (!start || day < start || (created && day < created) || (end && day > end)) return false;
  const dow = new Date(`${day}T12:00:00Z`).getUTCDay();
  const from = todoReportDay(habit.daysChangeEffectiveFrom, timezone);
  const days = from && day >= from && Array.isArray(habit.pendingDays) ? habit.pendingDays : habit.days;
  const selected = new Set((Array.isArray(days) ? days : []).filter(value => typeof value === "string").map(value => value.trim().toLowerCase().slice(0, 3)).filter(value => names.includes(value)));
  if (selected.size) return selected.has(names[dow]);
  if (habit.repeatType === "weekdays") return dow !== 0 && dow !== 6;
  if (habit.repeatType === "weekend") return dow === 0 || dow === 6;
  if (habit.frequency === "weekly") return new Date(`${start}T12:00:00Z`).getUTCDay() === dow;
  return true;
}

export function computeHabitWeeklyReport(habits, logs, weekDays, { today, timezone = "Asia/Kolkata", onOccurrence }) {
  const byHabit = new Map(), distinct = new Map();
  for (const log of logs) {
    if (!log?.habitId) continue;
    const day = validReportDay(log.dayKey) ? log.dayKey : !log.dayKey ? todoReportDay(log.date, timezone) : "";
    if (!weekDays.includes(day)) continue;
    const id = String(log.habitId);
    if (!byHabit.has(id)) byHabit.set(id, new Map());
    const previous = byHabit.get(id).get(day);
    // Last write wins for legacy duplicate logs, including an undo (false).
    if (!previous || stamp(log.updatedAt || log.date) > stamp(previous.updatedAt || previous.date)
      || (stamp(log.updatedAt || log.date) === stamp(previous.updatedAt || previous.date) && String(log._id || "") >= String(previous._id || ""))) byHabit.get(id).set(day, log);
  }
  habits.forEach((habit, index) => {
    const id = String(habit._id || habit.id || `legacy-${index}`), previous = distinct.get(id);
    if (!previous || stamp(habit.updatedAt) >= stamp(previous.updatedAt)) distinct.set(id, habit);
  });
  const overall = counts(), categories = new Map();
  const priorities = new Map(["High", "Medium", "Low"].map(priority => [priority, { priority, ...counts() }]));
  const daily = new Map(weekDays.map(day => [day, { dayKey: day, day: reportDayLabel(day).split(",")[0], future: day > today, ...counts() }]));
  const rows = [], missedHabits = [];
  for (const [id, habit] of distinct) {
    const category = text(habit.category, "General"), priority = priorities.has(habit.priority) ? habit.priority : "Medium";
    const deleted = todoReportDay(habit.deletedAt, timezone);
    const row = { id, name: text(habit.title, "Untitled habit"), category, priority,
      timeOfDay: ["Morning", "Afternoon", "Evening", "Night"].includes(habit.timeOfDay) ? habit.timeOfDay : "Unspecified",
      targetStreak: Number.isInteger(habit.targetStreak) && habit.targetStreak > 0 ? habit.targetStreak : null, ...counts(), streak: 0, longestStreak: 0 };
    const end = todoReportDay(habit.endDate, timezone);
    row.repeat = `${habit.frequency === "weekly" ? "Weekly" : ({ daily: "Daily", weekdays: "Selected weekdays", weekend: "Weekend", "7days": "7-day challenge", "21days": "21-day challenge" }[habit.repeatType] || "Daily")} · ${end ? `ends ${end}` : "never ends"}`;
    for (const day of weekDays) {
      if (day > today || !scheduled(habit, day, timezone) || (deleted && day > deleted)) continue;
      const completed = byHabit.get(id)?.get(day)?.completed === true;
      if (((habit.archivedReason === "deleted" && !deleted) || day === deleted) && !completed) continue;
      const from = todoReportDay(habit.timeChangeEffectiveFrom, timezone);
      const scheduledTime = habit.pendingTime && from && day >= from ? habit.pendingTime : habit.time;
      const clockTime = timeValid(scheduledTime) ? scheduledTime : "";
      // Habits remain completable throughout the app day; a reminder is not a deadline.
      const status = completed ? "completed" : day < today ? "missed" : "pending";
      if (!categories.has(category)) categories.set(category, { name: category, ...counts() });
      for (const group of [overall, row, categories.get(category), priorities.get(priority), daily.get(day)]) { group.total++; group[status]++; }
      // Within-week scheduled-occurrence streak, not lifetime streak or Monk Streak.
      if (completed) { row.streak++; row.longestStreak = Math.max(row.longestStreak, row.streak); }
      else if (status === "missed") row.streak = 0;
      // Monthly analysis uses these same schedule/log decisions without exposing
      // raw logs or sending habit titles/notes to an AI provider.
      onOccurrence?.({ id, name: row.name, category, priority, timeOfDay: row.timeOfDay,
        important: habit.isImportant === true, dayKey: day, status, targetStreak: row.targetStreak,
        currentEligible: (!end || end >= today) && (!deleted || deleted > today)
          && !(habit.archivedReason === "deleted" && !deleted) });
      if (status === "missed") missedHabits.push({ id: `${id}:${day}`, dayKey: day, day: reportDayLabel(day), title: row.name, category, time: clockTime });
    }
    if (row.total) rows.push({ ...row, completedDays: row.completed, totalDays: row.total });
  }
  const dailyStats = [...daily.values()], activeDays = dailyStats.filter(day => day.completed).length;
  const scheduledDays = dailyStats.filter(day => day.total).length;
  const completionRate = overall.total ? Math.round(overall.completed / overall.total * 100) : 0;
  const consistency = scheduledDays ? Math.round(activeDays / scheduledDays * 100) : 0;
  missedHabits.sort((a, b) => a.dayKey.localeCompare(b.dayKey) || a.time.localeCompare(b.time) || a.id.localeCompare(b.id));
  return { id: weekDays[0], date: reportWeekLabel(weekDays), signal: `${activeDays} active days`, status: weekDays.at(-1) < today ? "Ready" : "Draft",
    totalInstances: overall.total, completed: overall.completed, missed: overall.missed, pending: overall.pending,
    activeDays, scheduledDays, consistency, completionRate, weeklyScore: Math.round(completionRate * 0.7 + consistency * 0.3),
    longestStreak: rows.reduce((max, row) => Math.max(max, row.longestStreak), 0),
    categories: [...categories.values()].sort((a, b) => b.total - a.total || a.name.localeCompare(b.name)),
    priorityStats: [...priorities.values()], dailyStats, habits: rows.sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id)),
    missedHabits: missedHabits.slice(0, 20), missedHabitsTotal: missedHabits.length, missedHabitsTruncated: missedHabits.length > 20 };
}
