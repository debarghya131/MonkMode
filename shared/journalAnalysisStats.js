import { averageReportTime, computeJournalWeeklyStats, shiftReportDay, validReportDay } from "./journalWeeklyStats.js";
import { todoReportDay } from "./todoWeeklyStats.js";

export const JOURNAL_MOODS = [
  ["Motivated", "🔥", "#f59e0b"], ["Happy", "😊", "#facc15"], ["Calm", "😌", "#10b981"], ["Neutral", "😐", "#a8a29e"],
  ["Sad", "😔", "#818cf8"], ["Anxious", "😰", "#fb7185"], ["Focused", "😤", "#a855f7"], ["Tired", "😴", "#94a3b8"],
  ["Excited", "🤩", "#f97316"], ["Grateful", "🙏", "#34d399"], ["Inspired", "✨", "#22d3ee"], ["Frustrated", "😣", "#ef4444"],
  ["Overwhelmed", "🥺", "#c084fc"], ["Strong", "💪", "#fbbf24"], ["Peaceful", "🧘", "#38bdf8"], ["Bored", "😑", "#78716c"],
  ["Confident", "😎", "#eab308"], ["Curious", "🤔", "#2dd4bf"], ["Emotional", "🥹", "#f472b6"], ["Content", "☺️", "#a3e635"],
];
const moodMap = new Map(JOURNAL_MOODS.map(([label, emoji, color]) => [label.toLowerCase(), { label, emoji, color }]));
export const journalMood = value => typeof value === "string" ? moodMap.get(value.trim().toLowerCase()) || null : null;
export const journalScore = value => typeof value === "number" && Number.isFinite(value) && value >= 1 && value <= 100 ? value : null;
const validTime = value => typeof value === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
export const meanJournalValues = values => {
  const valid = values.filter(value => typeof value === "number" && Number.isFinite(value));
  return valid.length ? Math.round(valid.reduce((sum, value) => sum + value, 0) / valid.length * 10) / 10 : null;
};
export function journalSleepMinutes(sleep, wake) {
  if (!validTime(sleep) || !validTime(wake)) return null;
  const minutes = value => Number(value.slice(0, 2)) * 60 + Number(value.slice(3));
  const duration = (minutes(wake) - minutes(sleep) + 1440) % 1440;
  return duration > 0 && duration <= 1080 ? duration : null;
}
export function journalMonthDays(year, month) {
  const y = Number(year), m = Number(month);
  if (!["string", "number"].includes(typeof year) || !["string", "number"].includes(typeof month) || !/^\d{4}$/.test(String(year)) || !/^\d{1,2}$/.test(String(month)) || y < 1900 || y > 9998 || m < 1 || m > 12)
    throw new Error("Use a valid year and month (1–12).");
  const start = `${y}-${String(m).padStart(2, "0")}-01`;
  const end = `${m === 12 ? y + 1 : y}-${String(m === 12 ? 1 : m + 1).padStart(2, "0")}-01`;
  const count = Math.round((Date.parse(end) - Date.parse(start)) / 86400000);
  return Array.from({ length: count }, (_, index) => shiftReportDay(start, index));
}
const tags = value => Array.isArray(value) ? value.filter(item => typeof item === "string" && item.trim()).map(item => item.trim()) : [];
export function canonicalJournalAnalysisEntries(docs, days, { today, timezone = "Asia/Kolkata" }) {
  const byDay = new Map();
  for (const row of docs) {
    const date = row.dayKey || todoReportDay(row.date, timezone);
    if (!days.includes(date) || date > today) continue;
    const stamp = item => Date.parse(item.updatedAt || item.createdAt || item.date || "") || 0;
    const old = byDay.get(date);
    if (!old || stamp(row) > stamp(old) || (stamp(row) === stamp(old) && String(row._id || "") >= String(old._id || ""))) byDay.set(date, row);
  }
  return [...byDay].sort(([a], [b]) => a.localeCompare(b)).map(([date, row]) => ({
    date, mood: journalMood(row.mood)?.label || null, energy: journalScore(row.energyLevel), rating: journalScore(row.overallRating),
    sleepTime: validTime(row.sleepTime) ? row.sleepTime : "", wakeUpTime: validTime(row.wakeUpTime) ? row.wakeUpTime : "",
    sleepMinutes: journalSleepMinutes(row.sleepTime, row.wakeUpTime),
    wins: tags(row.wins).length, mistakes: tags(row.mistakes).length, achievement: tags(row.achievement).length,
    gratitude: tags(row.gratitude).length, mistakeTags: tags(row.mistakes), distractionTags: tags(row.distractions),
  }));
}
function topTags(entries, key) {
  const counts = new Map();
  for (const entry of entries) for (const label of new Set(tags(entry[key]).map(tag => tag.toLowerCase()))) {
    const previous = counts.get(label) || { label: tags(entry[key]).find(tag => tag.toLowerCase() === label), count: 0 };
    previous.count++; counts.set(label, previous);
  }
  return [...counts.values()].filter(item => item.count >= 2).sort((a,b) => b.count - a.count || a.label.localeCompare(b.label)).slice(0, 5);
}
export function computeJournalAnalysis(entries, { year, month, today, joinedDay = null }) {
  const days = journalMonthDays(year, month);
  if (!validReportDay(today)) throw new Error("Invalid app date");
  const byDay = new Map(entries.filter(row => days.includes(row.date) && row.date <= today).map(row => [row.date, row]));
  const ordered = [...byDay.values()].sort((a,b) => a.date.localeCompare(b.date));
  // Retained imported entries may predate account creation. Include that evidence.
  const knownStart = validReportDay(joinedDay) ? joinedDay : ordered[0]?.date || null;
  const start = knownStart && ordered[0]?.date < knownStart ? ordered[0].date : knownStart;
  let run = 0, breaks = 0, longest = 0, previousLogged = false;
  const daily = days.map(date => {
    const entry = byDay.get(date), eligible = Boolean(start && date >= start && date <= today);
    const status = entry ? "logged" : date > today ? "future" : !eligible ? "not-tracked" : date === today ? "pending" : "missed";
    if (entry) { run++; longest = Math.max(longest, run); previousLogged = true; }
    else if (status === "missed") { if (previousLogged) breaks++; run = 0; previousLogged = false; }
    return { date, label: String(Number(date.slice(-2))), status, logged: Boolean(entry), mood: entry?.mood || null,
      energy: entry?.energy ?? null, rating: entry?.rating ?? null, sleep: entry?.sleepMinutes === null || !entry ? null : entry.sleepMinutes / 60,
      wins: entry?.wins ?? null, mistakes: entry?.mistakes ?? null, achievement: entry?.achievement ?? null,
      streak: entry ? run : status === "missed" ? 0 : null };
  });
  const moodGroups = new Map();
  for (const row of ordered) if (journalMood(row.mood)) {
    if (!moodGroups.has(row.mood)) moodGroups.set(row.mood, []);
    moodGroups.get(row.mood).push(row);
  }
  const moodCount = [...moodGroups.values()].reduce((sum, rows) => sum + rows.length, 0);
  const moods = [...moodGroups].map(([mood, rows]) => ({ ...journalMood(mood), mood, count: rows.length,
    energy: meanJournalValues(rows.map(row => row.energy)), rating: meanJournalValues(rows.map(row => row.rating)),
    energyCount: rows.filter(row => row.energy !== null).length, ratingCount: rows.filter(row => row.rating !== null).length,
    percentage: moodCount ? Math.round(rows.length / moodCount * 1000) / 10 : 0,
  })).sort((a,b) => b.count - a.count || a.mood.localeCompare(b.mood));
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((label, index) => {
    const rows = daily.filter(row => new Date(`${row.date}T12:00:00Z`).getUTCDay() === index);
    return { label, rating: meanJournalValues(rows.map(row => row.rating)), count: rows.filter(row => row.rating !== null).length,
      missed: rows.filter(row => row.status === "missed").length };
  });
  const weeks = Array.from({ length: Math.ceil(days.length / 7) }, (_, index) => {
    const block = days.slice(index * 7, index * 7 + 7);
    const eligible = daily.filter(row => block.includes(row.date) && ["logged", "pending", "missed"].includes(row.status));
    const docs = ordered.filter(row => block.includes(row.date)).map(row => ({ dayKey: row.date, energyLevel: row.energy, overallRating: row.rating }));
    const report = computeJournalWeeklyStats(docs, block, eligible.length);
    return { label: `Week ${index + 1}`, from: block[0], to: block.at(-1), expectedDays: eligible.length,
      loggedDays: report.loggedDays, score: report.weeklyScore, days: daily.filter(row => block.includes(row.date)) };
  });
  const validEnergy = ordered.filter(row => row.energy !== null);
  const ratedDays = weekdays.filter(row => row.rating !== null);
  return { days: daily, weeks, moods, weekdays, moodLoggedDays: moodCount, loggedDays: ordered.length,
    avgEnergy: meanJournalValues(ordered.map(row => row.energy)), avgRating: meanJournalValues(ordered.map(row => row.rating)),
    avgSleepMinutes: meanJournalValues(ordered.map(row => row.sleepMinutes)),
    avgSleepTime: averageReportTime(ordered.map(row => row.sleepTime)) || null,
    avgWakeTime: averageReportTime(ordered.map(row => row.wakeUpTime)) || null,
    sleepRecordedDays: ordered.filter(row => row.sleepMinutes !== null).length,
    energyRecordedDays: validEnergy.length, ratingRecordedDays: ordered.filter(row => row.rating !== null).length,
    highestEnergy: [...validEnergy].sort((a,b) => b.energy-a.energy || a.date.localeCompare(b.date))[0] || null,
    lowestEnergy: [...validEnergy].sort((a,b) => a.energy-b.energy || a.date.localeCompare(b.date))[0] || null,
    highestRatedWeekday: [...ratedDays].sort((a,b) => b.rating-a.rating)[0] || null,
    lowestRatedWeekday: [...ratedDays].sort((a,b) => a.rating-b.rating)[0] || null,
    wins: ordered.reduce((sum,row)=>sum+row.wins,0), mistakes: ordered.reduce((sum,row)=>sum+row.mistakes,0), achievements: ordered.reduce((sum,row)=>sum+row.achievement,0),
    topMistakes: topTags(ordered,"mistakeTags"), topDistractions: topTags(ordered,"distractionTags"),
    avgWeeklyScore: meanJournalValues(weeks.map(week => week.score)), longestStreak: longest, streakBreaks: breaks,
    missedDays: daily.filter(row=>row.status==="missed").length, pendingDays: daily.filter(row=>row.status==="pending").length };
}
