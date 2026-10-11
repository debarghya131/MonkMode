export const DEFAULT_HABIT_TIMEZONE = "Asia/Kolkata";

export function habitClock(now = new Date(), timezone = DEFAULT_HABIT_TIMEZONE) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(now);
  const get = type => parts.find(part => part.type === type)?.value;
  return { date: `${get("year")}-${get("month")}-${get("day")}`, time: `${get("hour")}:${get("minute")}` };
}

export function habitDayKey(value, timezone = DEFAULT_HABIT_TIMEZONE) {
  if (!value) return null;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : habitClock(date, timezone).date;
}

export function shiftHabitDay(day, offset) {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

export function formatHabitDay(day, options = {}) {
  return new Date(`${day}T12:00:00Z`).toLocaleDateString("en-US", { ...options, timeZone: "UTC" });
}

export function formatHabitTime(time) {
  if (typeof time !== "string" || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) return "--";
  const [h, m] = time.split(":");
  return `${Number(h) % 12 || 12}:${m} ${Number(h) < 12 ? "AM" : "PM"}`;
}

export function isHabitArchived(habit, today, timezone = DEFAULT_HABIT_TIMEZONE) {
  const end = habitDayKey(habit.endDate, timezone);
  return Boolean(habit.deletedAt || habit.archivedReason === "ended" || (end && end < today));
}

export function isHabitOnDay(habit, day, timezone = DEFAULT_HABIT_TIMEZONE) {
  if (habit.deletedAt || habit.archivedReason === "ended") return false;
  const start = habitDayKey(habit.startDate || habit.createdAt, timezone);
  const end = habitDayKey(habit.endDate, timezone);
  if ((start && day < start) || (end && day > end)) return false;
  const weekday = new Date(`${day}T12:00:00Z`).getUTCDay();
  const effective = habitDayKey(habit.daysChangeEffectiveFrom, timezone);
  const days = effective && day >= effective && Array.isArray(habit.pendingDays) ? habit.pendingDays : habit.days;
  if (habit.repeatType === "weekend") return weekday === 0 || weekday === 6;
  if (habit.repeatType === "weekdays") return (days?.length ? days : ["Mon", "Tue", "Wed", "Thu", "Fri"]).includes(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][weekday]);
  if (habit.frequency === "weekly" && start) return new Date(`${start}T12:00:00Z`).getUTCDay() === weekday;
  return true;
}

export function habitTimeOnDay(habit, day, timezone = DEFAULT_HABIT_TIMEZONE) {
  const effective = habitDayKey(habit.timeChangeEffectiveFrom, timezone);
  return habit.pendingTime && effective && day >= effective ? habit.pendingTime : habit.time;
}

// One read-only sample snapshot for Today, Create and Track; no future ticks.
export function buildDemoHabits(today) {
  const samples = [
    ["meditation", "Morning Meditation", "Mindfulness", "High", "06:30", "Morning", 30, 11, 40, true, "10 minutes breath focus before starting work."],
    ["workout", "Workout (30 min)", "Fitness", "High", "07:00", "Morning", 21, 3, null, false, "Bodyweight circuit: pushups, squats, planks."],
    ["reading", "Read 20 pages", "Learning", "Medium", "21:00", "Night", 45, 7, 60, false, "Read before sleep and write one takeaway."],
    ["water", "Drink 3L Water", "Health", "Low", "20:00", "Evening", 60, 18, null, true, "Track hydration across the day."],
    ["journal", "Night Journal", "Personal", "Low", "22:15", "Night", 30, 2, 15, false, "Write a short reflection before bedtime."],
    ["focus", "Deep Work Sprint", "Productivity", "High", "10:00", "Morning", 14, 1, null, false, "Make room for uninterrupted focus."],
  ];
  return samples.map(([id, title, category, priority, time, timeOfDay, targetStreak, currentStreak, endsIn, done, note]) => ({
    id: `demo-habit-${id}`, title, category, priority, time, timeOfDay, note, reason: note,
    targetStreak, currentStreak, maxStreak: currentStreak, streakBreaks: 0,
    startDate: shiftHabitDay(today, -30), endDate: endsIn === null ? null : shiftHabitDay(today, endsIn),
    repeatType: "daily", isImportant: priority === "High", completedToday: done, status: done ? "completed" : "pending",
    completedDayKeys: Array.from({ length: currentStreak }, (_, index) => shiftHabitDay(today, -(index + (done ? 0 : 1)))),
    activityLogs: [],
  }));
}

export function demoHabitTracking(habits, year, month) {
  const prefix = `${year}-${String(month).padStart(2, "0")}-`;
  return habits.map(habit => ({ ...habit, completedDays: habit.completedDayKeys.filter(day => day.startsWith(prefix)).map(day => Number(day.slice(8))) }));
}

export const habitCategoryStorageKey = (userId, demo = false) => `monkmode.habit.custom_categories.v2.${demo ? "demo" : encodeURIComponent(userId || "guest")}`;
