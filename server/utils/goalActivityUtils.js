const DEFAULT_ACTIVITY_WINDOW_MS = 1000;

export const GOAL_ACTIVITY_TIMEZONE = process.env.APP_TIMEZONE || process.env.TZ || "Asia/Kolkata";

export const buildSubgoalActivityTitle = (subgoalTitle, goalTitle) =>
  `${subgoalTitle || "Untitled"} (Sub-goal in ${goalTitle || "Untitled"})`;

export const toZonedDayKey = (value, timezone = GOAL_ACTIVITY_TIMEZONE) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  const parts = formatter.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) return "";
  return `${year}-${month}-${day}`;
};

export const hasSubgoalCompletedEvent = (goal, subgoal, windowMs = DEFAULT_ACTIVITY_WINDOW_MS) => {
  const activityLogs = Array.isArray(goal?.activityLogs) ? goal.activityLogs : [];
  const subgoalId = subgoal?._id ? String(subgoal._id) : "";
  const completedAt = subgoal?.completedAt ? new Date(subgoal.completedAt) : null;
  const completedAtMs = completedAt && !Number.isNaN(completedAt.getTime()) ? completedAt.getTime() : null;
  const legacyTitle = buildSubgoalActivityTitle(subgoal?.title || "", goal?.title || "");

  return activityLogs.some((entry) => {
    if (entry?.action !== "subgoal_completed") return false;

    if (subgoalId && entry?.subgoalId && String(entry.subgoalId) === subgoalId) {
      return true;
    }

    const entryAt = entry?.at ? new Date(entry.at) : null;
    const entryAtMs = entryAt && !Number.isNaN(entryAt.getTime()) ? entryAt.getTime() : null;
    if (completedAtMs == null || entryAtMs == null) return false;

    return entry?.title === legacyTitle && Math.abs(entryAtMs - completedAtMs) <= windowMs;
  });
};
