import { validReportDay, reportDayLabel, reportWeekLabel } from "./journalWeeklyStats.js";

export const TODO_REPORT_TIME_BUCKETS = [
  { range: "12 AM – 6 AM", start: 0, end: 6 },
  { range: "6 AM – 9 AM", start: 6, end: 9 },
  { range: "9 AM – 12 PM", start: 9, end: 12 },
  { range: "12 PM – 3 PM", start: 12, end: 15 },
  { range: "3 PM – 6 PM", start: 15, end: 18 },
  { range: "6 PM – 12 AM", start: 18, end: 24 },
  { range: "No scheduled time" },
];
const validTime = value => typeof value === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
const text = (value, fallback) => typeof value === "string" && value.trim() ? value.trim() : fallback;
export function todoReportDay(value, timezone) {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return validReportDay(value) ? value : "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const part = type => parts.find(item => item.type === type).value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function normalizeTask(task, timezone) {
  const states = new Map();
  for (const state of Array.isArray(task.dayStates) ? task.dayStates : []) {
    if (state && validReportDay(state.dayKey) && ["completed", "pending", "missed"].includes(state.status)) states.set(state.dayKey, state);
  }
  const once = todoReportDay(task.date || task.startDate, timezone);
  return { ...task, states, once: once || (states.size ? "" : todoReportDay(task.createdAt, timezone)),
    start: todoReportDay(task.startDate || task.date || task.createdAt, timezone),
    end: todoReportDay(task.endDate, timezone), deleted: todoReportDay(task.deletedAt, timezone),
    timeFrom: todoReportDay(task.timeChangeEffectiveFrom, timezone), daysFrom: todoReportDay(task.daysChangeEffectiveFrom, timezone) };
}

function scheduled(task, day) {
  if (task.repeatType === "once") return task.once ? task.once === day : task.states.has(day);
  if (!task.start || day < task.start || (task.end && day > task.end)) return false;
  const weekday = new Date(`${day}T12:00:00Z`).getUTCDay();
  if (task.repeatType === "daily") return true;
  if (task.repeatType === "weekend") return weekday === 0 || weekday === 6;
  const days = task.pendingDays?.length && task.daysFrom && day >= task.daysFrom ? task.pendingDays
    : task.days?.length ? task.days : ["Mon", "Tue", "Wed", "Thu", "Fri"];
  return task.repeatType === "weekdays" && days.includes(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][weekday]);
}

export function computeTodoWeeklyReport(tasks, weekDays, { today, time = "00:00", timezone = "Asia/Kolkata", importantCategories = ["Health", "Bill & Payment"], onOccurrence }) {
  const counts = () => ({ total: 0, completed: 0, missed: 0, pending: 0 });
  const categories = new Map(), priorities = new Map(["High", "Medium", "Low"].map(priority => [priority, { priority, ...counts() }]));
  const daily = new Map(weekDays.map(day => [day, { dayKey: day, day: reportDayLabel(day).split(",")[0], future: day > today, ...counts() }]));
  const buckets = TODO_REPORT_TIME_BUCKETS.map(bucket => ({ ...bucket, ...counts() }));
  const missedTasks = [], overall = counts();
  let lateCompleted = 0;
  // A duplicate document in legacy exports must not duplicate its occurrences.
  const distinct = new Map();
  tasks.forEach((task, index) => {
    const id = String(task._id || task.id || `legacy-${index}`);
    const previous = distinct.get(id);
    if (!previous || new Date(task.updatedAt || 0).getTime() >= new Date(previous.updatedAt || 0).getTime()) distinct.set(id, task);
  });
  for (const [id, source] of distinct) {
    const task = normalizeTask(source, timezone);
    const category = text(task.category, "Others");
    const priority = priorities.has(task.priority) ? task.priority : "Medium";
    for (const day of weekDays) {
      if (day > today || (task.deleted && day > task.deleted)) continue;
      const state = task.states.get(day);
      // Saved past occurrences are evidence even if a later weekday edit no
      // longer schedules that day. Do not invent occurrences after deletion.
      const historical = day < today && state && state.status !== "pending";
      if (!scheduled(task, day) && !historical) continue;
      if (task.deleted === day && (!state || state.status === "pending")) continue;
      const scheduledTime = task.pendingTime && task.timeFrom && day >= task.timeFrom ? task.pendingTime : task.time;
      const clockTime = validTime(scheduledTime) ? scheduledTime : "";
      const completed = state?.status === "completed" || (!state && task.repeatType === "once" && task.completed === true);
      const status = completed ? "completed" : state?.status === "missed" || day < today || (day === today && clockTime && clockTime < time) ? "missed" : "pending";
      if (!categories.has(category)) categories.set(category, { name: category, ...counts() });
      const hour = clockTime ? Number(clockTime.slice(0, 2)) : null;
      const bucket = hour === null ? buckets.at(-1) : buckets.find(bucket => hour >= bucket.start && hour < bucket.end);
      for (const group of [overall, categories.get(category), priorities.get(priority), daily.get(day), bucket]) { group.total++; group[status]++; }
      if (completed && state?.lateCompleted) lateCompleted++;
      // Monthly analysis consumes the same occurrence decisions as weekly reports.
      // The callback is internal; it is never serialized into a report response.
      onOccurrence?.({ dayKey: day, category, priority, time: clockTime, status,
        lateCompleted: completed && state?.lateCompleted === true,
        timingKnown: completed && (state?.lateCompleted === true ||
          (typeof state?.lateCompleted === "boolean" && validTime(state.completedAt))) });
      if (status === "missed") missedTasks.push({ id: `${id}:${day}`, dayKey: day, day: reportDayLabel(day), title: text(task.title, "Untitled task"), category, priority, time: clockTime });
    }
  }
  const dailyStats = [...daily.values()];
  const activeDays = dailyStats.filter(day => day.completed > 0).length;
  const scheduledDays = dailyStats.filter(day => day.total > 0).length;
  const consistency = scheduledDays ? Math.round(activeDays / scheduledDays * 100) : 0;
  const completionRate = overall.total ? Math.round(overall.completed / overall.total * 100) : 0;
  let longestStreak = 0, run = 0;
  dailyStats.forEach(day => { run = day.completed ? run + 1 : 0; longestStreak = Math.max(longestStreak, run); });
  const categoryStats = [...categories.values()].sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
  const important = new Set(importantCategories.filter(name => typeof name === "string").map(name => name.trim().toLowerCase()));
  missedTasks.sort((a, b) => a.dayKey.localeCompare(b.dayKey) || a.time.localeCompare(b.time) || a.id.localeCompare(b.id));
  return { id: weekDays[0], date: reportWeekLabel(weekDays), status: weekDays.at(-1) < today ? "Ready" : "Draft",
    signal: `${activeDays} active days`, totalTasks: overall.total, completed: overall.completed, missed: overall.missed, pending: overall.pending,
    activeDays, scheduledDays, consistency, completionRate, weeklyScore: Math.round(completionRate * 0.7 + consistency * 0.3), longestStreak, lateCompleted,
    categories: categoryStats, priorityStats: [...priorities.values()], importantCategories: categoryStats.filter(category => important.has(category.name.toLowerCase())),
    dailyStats, completionTiming: buckets.map(bucket => ({ range: bucket.range, count: bucket.completed, total: bucket.total })),
    missedTiming: buckets.map(bucket => ({ range: bucket.range, count: bucket.missed, total: bucket.total })),
    missedTasks: missedTasks.slice(0, 20), missedTasksTotal: missedTasks.length, missedTasksTruncated: missedTasks.length > 20 };
}
