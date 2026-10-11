export const DEFAULT_TODO_TIMEZONE = "Asia/Kolkata";

export function formatTodoTime(value) {
  if (typeof value !== "string" || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)) return "--";
  const [hours, minutes] = value.split(":");
  const hour = Number(hours);
  return `${hour % 12 || 12}:${minutes} ${hour < 12 ? "AM" : "PM"}`;
}

export function todoClock(now = new Date(), timezone = DEFAULT_TODO_TIMEZONE) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(now);
  const value = type => parts.find(part => part.type === type)?.value;
  return { date: `${value("year")}-${value("month")}-${value("day")}`, time: `${value("hour")}:${value("minute")}` };
}

export function shiftTodoDay(dayKey, offset) {
  const date = new Date(`${dayKey}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

export function formatTodoDay(dayKey, options = {}) {
  return new Date(`${dayKey}T12:00:00Z`).toLocaleDateString("en-US", { ...options, timeZone: "UTC" });
}

export function effectiveTodoDay(value, timezone = DEFAULT_TODO_TIMEZONE) {
  if (!value) return "";
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : todoClock(new Date(value), timezone).date;
}

export function todoTimeOnDay(task, dayKey, timezone = DEFAULT_TODO_TIMEZONE) {
  const effective = effectiveTodoDay(task.timeChangeEffectiveFrom, timezone);
  return task.pendingTime && effective && dayKey >= effective ? task.pendingTime : task.time || "";
}

export function todoDaysOnDay(task, dayKey, timezone = DEFAULT_TODO_TIMEZONE) {
  const effective = effectiveTodoDay(task.daysChangeEffectiveFrom, timezone);
  if (task.pendingDays?.length && effective && dayKey >= effective) return task.pendingDays;
  return task.days?.length ? task.days : ["Mon", "Tue", "Wed", "Thu", "Fri"];
}

export function isTodoArchived(task, today) {
  if (task.deletedAt) return true;
  if (task.repeatType === "once") return Boolean(task.date && task.date < today);
  return Boolean(task.endDate && task.endDate < today);
}

export function isTodoOnDay(task, dayKey, timezone = DEFAULT_TODO_TIMEZONE) {
  if (task.deletedAt) return false;
  if (task.repeatType === "once") return task.date === dayKey;
  if (!task.startDate || dayKey < task.startDate || (task.endDate && dayKey > task.endDate)) return false;
  const weekday = new Date(`${dayKey}T12:00:00Z`).getUTCDay();
  if (task.repeatType === "daily") return true;
  if (task.repeatType === "weekend") return weekday === 0 || weekday === 6;
  return task.repeatType === "weekdays" && todoDaysOnDay(task, dayKey, timezone).includes(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][weekday]);
}

export function todosOnDay(tasks, dayKey, clock, timezone = DEFAULT_TODO_TIMEZONE) {
  return tasks.filter(task => isTodoOnDay(task, dayKey, timezone)).map(task => {
    const state = task.dayStates?.find(item => item.dayKey === dayKey);
    const time = todoTimeOnDay(task, dayKey, timezone);
    const status = state?.status && state.status !== "pending" ? state.status
      : dayKey < clock.date || (dayKey === clock.date && time && time < clock.time) ? "missed" : "pending";
    return { ...task, note: task.note ?? task.description ?? "", time, status, completedAt: state?.completedAt || "", lateCompleted: Boolean(state?.lateCompleted) };
  }).sort((a, b) => a.time.localeCompare(b.time) || a.title.localeCompare(b.title));
}
