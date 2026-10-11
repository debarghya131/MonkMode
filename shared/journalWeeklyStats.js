export const validReportDay = value => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(`${value}T12:00:00Z`)) && new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value;
export const shiftReportDay = (day, offset) => {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
};
export const reportDayLabel = day => new Date(`${day}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
export const reportWeekLabel = days => days.map(day => new Date(`${day}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })).filter((_, index) => index === 0 || index === days.length - 1).join(" - ");

const EMOJI = { Motivated: "🔥", Happy: "😊", Calm: "😌", Neutral: "😐", Sad: "😔", Anxious: "😰", Focused: "😤", Tired: "😴", Excited: "🤩", Grateful: "🙏", Inspired: "✨", Frustrated: "😣", Overwhelmed: "🥺", Strong: "💪", Peaceful: "🧘", Bored: "😑", Confident: "😎", Curious: "🤔", Emotional: "🥹", Content: "☺️" };
const numeric = value => (typeof value === "number" || (typeof value === "string" && value.trim())) && Number.isFinite(Number(value)) && Number(value) >= 1 && Number(value) <= 100 ? Number(value) : null;
const listCount = value => Array.isArray(value) ? value.filter(item => typeof item === "string" && item.trim()).length : 0;
const timeMinutes = value => typeof value === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value) ? Number(value.slice(0, 2)) * 60 + Number(value.slice(3)) : null;
const durationLabel = minutes => `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`;
export function averageReportTime(values) {
  const times = values.map(timeMinutes).filter(value => value !== null);
  if (!times.length) return "";
  const x = times.reduce((total, minutes) => total + Math.cos(minutes / 1440 * 2 * Math.PI), 0);
  const y = times.reduce((total, minutes) => total + Math.sin(minutes / 1440 * 2 * Math.PI), 0);
  if (Math.hypot(x, y) < 0.000001) return "";
  const minutes = (Math.round(Math.atan2(y, x) / (2 * Math.PI) * 1440) + 1440) % 1440;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

export function computeJournalWeeklyStats(entries, weekDays, expectedDays = weekDays.length) {
  const byDay = new Map();
  for (const entry of entries) {
    if (!weekDays.includes(entry.dayKey)) continue;
    const previous = byDay.get(entry.dayKey);
    const timestamp = item => Date.parse(item.updatedAt || item.date || "") || 0;
    if (!previous || timestamp(entry) > timestamp(previous)) byDay.set(entry.dayKey, entry);
  }
  const ordered = weekDays.filter(day => byDay.has(day)).map(day => byDay.get(day));
  const loggedDays = ordered.length;
  let longestStreak = 0, run = 0;
  for (const day of weekDays) { run = byDay.has(day) ? run + 1 : 0; longestStreak = Math.max(longestStreak, run); }
  const moods = new Map();
  ordered.forEach(entry => {
    const mood = typeof entry.mood === "string" ? entry.mood[0]?.toUpperCase() + entry.mood.slice(1).toLowerCase() : "";
    if (Object.hasOwn(EMOJI, mood)) moods.set(mood, (moods.get(mood) || 0) + 1);
  });
  const top = [...moods].sort((a, b) => b[1] - a[1])[0];
  const extrema = values => {
    if (!values.length) return { highest: { day: "—", value: null }, lowest: { day: "—", value: null } };
    const high = values.reduce((a, b) => b.value > a.value ? b : a);
    const low = values.reduce((a, b) => b.value < a.value ? b : a);
    return { highest: { day: reportDayLabel(high.dayKey), value: high.value }, lowest: { day: reportDayLabel(low.dayKey), value: low.value } };
  };
  const metric = key => {
    const values = ordered.map(entry => ({ dayKey: entry.dayKey, value: numeric(entry[key]) })).filter(item => item.value !== null);
    return { avg: values.length ? Math.round(values.reduce((sum, item) => sum + item.value, 0) / values.length) : null, recordedDays: values.length, ...extrema(values) };
  };
  const counts = key => {
    const values = ordered.map(entry => ({ dayKey: entry.dayKey, value: listCount(entry[key]) }));
    return { total: values.reduce((sum, item) => sum + item.value, 0), activeDays: values.filter(item => item.value > 0).length, ...extrema(values) };
  };
  const rating = metric("overallRating");
  const durations = ordered.map(entry => {
    const sleep = timeMinutes(entry.sleepTime), wake = timeMinutes(entry.wakeUpTime);
    if (sleep === null || wake === null) return null;
    const minutes = (wake - sleep + 1440) % 1440;
    return minutes > 0 && minutes <= 1080 ? minutes : null;
  }).filter(value => value !== null);
  const denominator = Math.max(expectedDays, loggedDays);
  const consistency = denominator ? Math.round(loggedDays / denominator * 100) : 0;
  return {
    loggedDays, expectedDays: denominator, consistency, longestStreak,
    topMood: top ? { label: top[0], emoji: EMOJI[top[0]], days: top[1] } : null,
    weeklyScore: rating.avg === null ? null : Math.min(100, Math.round(consistency * 0.45 + rating.avg * 0.45 + Math.min(10, longestStreak * 1.5))),
    stats: { energy: metric("energyLevel"), rating, wins: counts("wins"), mistakes: counts("mistakes"), achievements: counts("achievement"), sleep: { avgWakeUp: averageReportTime(ordered.map(entry => entry.wakeUpTime)), avgSleepTime: averageReportTime(ordered.map(entry => entry.sleepTime)), avgDuration: durations.length ? durationLabel(Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length)) : "" } },
  };
}
