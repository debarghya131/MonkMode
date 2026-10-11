export const DEFAULT_GOAL_TIMEZONE = "Asia/Kolkata";

export function goalDayKey(value, timezone = DEFAULT_GOAL_TIMEZONE) {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const date = new Date(`${value}T12:00:00Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? value : "";
  }
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const get = type => parts.find(part => part.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function goalDaysLeft(deadline, today) {
  if (!goalDayKey(deadline) || !goalDayKey(today)) return null;
  return Math.round((Date.parse(`${deadline}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / 86400000);
}

export function shiftGoalDay(day, offset) {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

export function addGoalMonths(day, months) {
  const date = new Date(`${day}T12:00:00Z`);
  // Match the server's calendar-month overflow rule.
  date.setUTCMonth(date.getUTCMonth() + months);
  return date.toISOString().slice(0, 10);
}

export function normalizeGoal(goal, timezone, today) {
  const deadline = goalDayKey(goal.deadline, timezone);
  const deleted = Boolean(goal.deletedAt || goal.archiveReason === "deleted");
  const goalType = goal.goalType || (String(goal.type || "").toLowerCase().includes("long") ? "long-term" : "short-term");
  return {
    ...goal, id: String(goal.id || goal._id), goalType,
    type: goalType === "long-term" ? "Long-term" : "Short-term",
    startDate: goalDayKey(goal.startDate || goal.createdAt, timezone), deadline,
    status: deleted || (deadline && deadline < today) ? "Archived" : "Active",
    archiveReason: deleted ? "deleted" : deadline && deadline < today ? "ended" : null,
    milestones: (Array.isArray(goal.milestones) ? goal.milestones : []).map(milestone => ({
      ...milestone, id: String(milestone.id || milestone._id), deadline: goalDayKey(milestone.deadline, timezone),
    })),
  };
}

export function buildDemoGoals(samples, today) {
  const shift = goalDaysLeft(today, "2026-10-10");
  return samples.map(goal => {
    const deadline = shiftGoalDay(goal.deadline, shift);
    const longTerm = goal.goalType === "long-term" || String(goal.type).toLowerCase().includes("long");
    const milestones = goal.milestones.map(milestone => ({ ...milestone, deadline: shiftGoalDay(milestone.deadline, shift) }));
    const startDate = [shiftGoalDay(deadline, longTerm ? -150 : -30), ...milestones.map(milestone => milestone.deadline)].sort()[0];
    return normalizeGoal({
      ...goal, isImportant: goal.id === "gate-2027", startDate, deadline, milestones,
    }, DEFAULT_GOAL_TIMEZONE, today);
  });
}

export function formatGoalTime(time) {
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time || "")) return "--";
  const [hour, minute] = time.split(":");
  return `${Number(hour) % 12 || 12}:${minute} ${Number(hour) < 12 ? "AM" : "PM"}`;
}
