const DAY_MS = 24 * 60 * 60 * 1000;
const DAY_NAMES = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

const normalizeDate = (value) => {
  const date = new Date(value);
  date.setUTCHours(0, 0, 0, 0);
  return date;
};

const toDayKey = (value) => normalizeDate(value).toISOString().slice(0, 10);

const normalizeDayName = (value) => {
  if (typeof value !== "string") return null;
  const short = value.trim().toLowerCase().slice(0, 3);
  return DAY_NAMES.includes(short) ? short : null;
};

const buildExplicitDaysSet = (habit) => {
  if (!Array.isArray(habit?.days) || habit.days.length === 0) return null;
  const normalized = habit.days.map(normalizeDayName).filter(Boolean);
  if (!normalized.length) return null;
  return new Set(normalized);
};

const isScheduledOnDate = (habit, date) => {
  const explicitDays = buildExplicitDaysSet(habit);
  const dayName = DAY_NAMES[date.getUTCDay()];
  const repeatType = habit?.repeatType || "daily";

  if (explicitDays) return explicitDays.has(dayName);

  if (repeatType === "weekdays") return dayName !== "sat" && dayName !== "sun";
  if (repeatType === "weekend") return dayName === "sat" || dayName === "sun";

  if (habit?.frequency === "weekly") {
    const reference = habit?.startDate || habit?.createdAt || new Date();
    return normalizeDate(reference).getUTCDay() === date.getUTCDay();
  }

  return true;
};

const isWithinHabitWindow = (habit, date) => {
  const dayStart = normalizeDate(date);
  const dayEnd = new Date(dayStart.getTime() + DAY_MS);

  const createdAt = habit?.createdAt ? new Date(habit.createdAt) : null;
  if (createdAt && createdAt >= dayEnd) return false;

  const startDate = habit?.startDate ? normalizeDate(habit.startDate) : null;
  if (startDate && dayStart < startDate) return false;

  const deletedAt = habit?.deletedAt ? new Date(habit.deletedAt) : null;
  if (deletedAt && deletedAt < dayEnd) return false;

  const endDate = habit?.endDate ? new Date(habit.endDate) : null;
  if (endDate && endDate < dayEnd) return false;

  if (habit?.archivedReason === "deleted" && !deletedAt) return false;

  return true;
};

const isExpectedOnDate = (habit, date) => {
  if (!isWithinHabitWindow(habit, date)) return false;
  return isScheduledOnDate(habit, date);
};

const findLastExpectedDate = (habit, today) => {
  const cursor = normalizeDate(today);
  const floorDate = normalizeDate(
    habit?.startDate || habit?.createdAt || new Date(today.getTime() - (3650 * DAY_MS))
  );

  while (cursor >= floorDate) {
    if (isExpectedOnDate(habit, cursor)) return new Date(cursor);
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  return null;
};

export const calculateStreak = (logs, habit = {}) => {
  const completedSet = new Set(
    logs
      .filter((log) => log?.completed !== false)
      .map((log) => log?.dayKey || toDayKey(log.date))
      .filter(Boolean)
  );

  const today = normalizeDate(new Date());
  const firstExpectedDate = normalizeDate(habit?.startDate || habit?.createdAt || today);
  const lastExpectedDate = findLastExpectedDate(habit, today);

  if (!lastExpectedDate || firstExpectedDate > lastExpectedDate) {
    return { currentStreak: 0, maxStreak: 0, streakBreaks: 0 };
  }

  let currentStreak = 0;
  let maxStreak = 0;
  let streakBreaks = 0;
  let runningStreak = 0;

  for (const cursor = new Date(firstExpectedDate); cursor <= lastExpectedDate; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    if (!isExpectedOnDate(habit, cursor)) continue;
    const isComplete = completedSet.has(toDayKey(cursor));
    if (isComplete) {
      runningStreak++;
      if (runningStreak > maxStreak) maxStreak = runningStreak;
    } else {
      if (runningStreak > 0) streakBreaks++;
      runningStreak = 0;
    }
  }

  for (const cursor = new Date(lastExpectedDate); cursor >= firstExpectedDate; cursor.setUTCDate(cursor.getUTCDate() - 1)) {
    if (!isExpectedOnDate(habit, cursor)) continue;
    if (completedSet.has(toDayKey(cursor))) {
      currentStreak++;
    } else {
      break;
    }
  }

  return { currentStreak, maxStreak, streakBreaks };
};
