export const scoreLabel = value => value === null || value === undefined ? "No data" : `${value}/100`;
export const durationLabel = minutes => {
  if (minutes === null || minutes === undefined) return "No data";
  const rounded = Math.round(minutes);
  return `${Math.floor(rounded / 60)}h ${String(rounded % 60).padStart(2, "0")}m`;
};
export const clockLabel = time => {
  if (!time) return "No data";
  const hour = Number(time.slice(0,2));
  return `${hour % 12 || 12}:${time.slice(3)} ${hour >= 12 ? "PM" : "AM"}`;
};
export const dayLabel = day => new Date(`${day}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", weekday: "short", timeZone: "UTC" });
