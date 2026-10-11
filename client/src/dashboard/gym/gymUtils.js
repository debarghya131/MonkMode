export const GYM_TIMEZONE = "Asia/Kolkata";

export function gymDay(value = new Date(), timezone = GYM_TIMEZONE) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const date = new Date(`${value}T12:00:00Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? value : "";
  }
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(value));
  const get = type => parts.find(part => part.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export const gymWeekday = day => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][new Date(`${day}T12:00:00Z`).getUTCDay()];
export const gymStorageKey = (userId, kind) => `monkmode.gym.v2.${encodeURIComponent(userId || "guest")}.${kind}`;
export function normalizeDemoWorkouts(plans) {
  const occupied = new Set();
  return plans.map(plan => {
    if (!plan.isActive) return plan;
    if (plan.days.some(day => occupied.has(day))) return { ...plan, isActive: false };
    plan.days.forEach(day => occupied.add(day));
    return plan;
  });
}
export const workoutOnDay = (plan, date, weekday = gymWeekday(date)) => Boolean(
  plan.isActive && plan.days?.includes(weekday) && (!plan.startDate || plan.startDate <= date) &&
  (plan.neverEnds || !plan.endDate || plan.endDate >= date)
);
export function gymTime(value = new Date(), timezone = GYM_TIMEZONE) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: timezone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(value));
}
