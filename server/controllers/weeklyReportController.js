import Habit from "../models/Habit.js";
import HabitLog from "../models/HabitLog.js";
import Todo from "../models/Todo.js";
import Journal from "../models/Journal.js";
import JournalMissedReason from "../models/JournalMissedReason.js";
import JournalWeeklySummary from "../models/JournalWeeklySummary.js";
import TodoWeeklySummary from "../models/TodoWeeklySummary.js";
import HabitWeeklySummary from "../models/HabitWeeklySummary.js";
import GoalWeeklySummary from "../models/GoalWeeklySummary.js";
import GymWeeklySummary from "../models/GymWeeklySummary.js";
import Goal from "../models/Goal.js";
import GymExerciseProgress from "../models/GymExerciseProgress.js";
import GymMeasurement from "../models/GymMeasurement.js";
import GymGalleryEntry from "../models/GymGalleryEntry.js";
import GymDietPlan from "../models/GymDietPlan.js";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toDayKey(date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getWeekBounds(weekParam) {
  let base;
  if (weekParam && /^\d{4}-\d{2}-\d{2}$/.test(weekParam)) {
    base = new Date(`${weekParam}T00:00:00Z`);
  } else {
    base = new Date();
    base.setUTCHours(0, 0, 0, 0);
  }
  // Roll back to Monday
  const dow = base.getUTCDay(); // 0=Sun
  const toMonday = dow === 0 ? -6 : 1 - dow;
  const weekStart = new Date(base);
  weekStart.setUTCDate(base.getUTCDate() + toMonday);
  weekStart.setUTCHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekStart.getUTCDate() + 6);
  weekEnd.setUTCHours(23, 59, 59, 999);

  return { weekStart, weekEnd };
}

function getWeekDayKeys(weekStart) {
  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return labels.map((label, i) => {
    const d = new Date(weekStart);
    d.setUTCDate(weekStart.getUTCDate() + i);
    return { dayKey: toDayKey(d), label };
  });
}

function formatWeekLabel(weekStart, weekEnd) {
  const opts = { month: "short", day: "numeric", timeZone: "UTC" };
  return `${weekStart.toLocaleDateString("en-US", opts)} - ${weekEnd.toLocaleDateString("en-US", opts)}`;
}

function computeWeeklyScore(completionRate, activeDays) {
  return Math.min(100, Math.round(completionRate * 0.7 + (activeDays / 7) * 100 * 0.3));
}

// Consecutive completed days ending on the last scheduled day
function computeIntraWeekStreak(completedSet, scheduledDayKeys) {
  let streak = 0;
  for (let i = scheduledDayKeys.length - 1; i >= 0; i--) {
    if (completedSet.has(scheduledDayKeys[i])) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

// Mirrors habitController's isHabitExpectedOnDate exactly
function isHabitScheduledOn(habit, utcDate) {
  const DAY_MS = 24 * 60 * 60 * 1000;
  const dayEnd = new Date(utcDate.getTime() + DAY_MS);

  // Must exist before end of this day
  if (habit.createdAt && new Date(habit.createdAt) >= dayEnd) return false;

  // startDate must be <= day
  if (habit.startDate) {
    const s = new Date(habit.startDate);
    s.setUTCHours(0, 0, 0, 0);
    if (s > utcDate) return false;
  }

  // deletedAt must not have happened before end of this day
  if (habit.deletedAt && new Date(habit.deletedAt) < dayEnd) return false;

  // endDate must be >= day
  if (habit.endDate) {
    const e = new Date(habit.endDate);
    e.setUTCHours(0, 0, 0, 0);
    if (e < utcDate) return false;
  }

  if (habit.archivedReason === "deleted" && !habit.deletedAt) return false;

  // Day-of-week check — normalise to lowercase 3-char ("mon", "tue", …)
  const DOW_NAMES = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const dow     = utcDate.getUTCDay();
  const dayName = DOW_NAMES[dow];

  // habit.days takes priority over repeatType (same as heatmap)
  if (Array.isArray(habit.days) && habit.days.length > 0) {
    const selected = new Set(
      habit.days
        .map(d => (typeof d === "string" ? d.trim().toLowerCase().slice(0, 3) : ""))
        .filter(Boolean)
    );
    if (selected.size > 0) return selected.has(dayName);
  }

  if (habit.repeatType === "weekdays") return dayName !== "sat" && dayName !== "sun";
  if (habit.repeatType === "weekend") return dayName === "sat" || dayName === "sun";

  if (habit.frequency === "weekly") {
    const ref = habit.startDate || habit.createdAt;
    if (ref) {
      const refDate = new Date(ref);
      refDate.setUTCHours(0, 0, 0, 0);
      return refDate.getUTCDay() === dow;
    }
  }

  return true; // daily, 7days, 21days
}

function buildRepeatLabel(habit) {
  const end = habit.endDate
    ? new Date(habit.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })
    : null;
  switch (habit.repeatType) {
    case "daily":     return end ? `Daily - ends ${end}` : "Daily - never ends";
    case "weekdays":  return end ? `Weekdays - ends ${end}` : "Weekdays - never ends";
    case "weekend":   return end ? `Weekend - ends ${end}` : "Weekend - never ends";
    case "7days":     return "7-day challenge";
    case "21days":    return "21-day challenge";
    default:          return habit.repeatType || "Daily";
  }
}

// Calculate longest streak of consecutive days in a set
function longestConsecutiveStreak(activeDayKeys, weekDays) {
  let best = 0;
  let cur = 0;
  for (const { dayKey } of weekDays) {
    if (activeDayKeys.has(dayKey)) {
      cur++;
      if (cur > best) best = cur;
    } else {
      cur = 0;
    }
  }
  return best;
}

const MOOD_EMOJI = {
  happy: "😊", Happy: "😊", sad: "😢", Sad: "😢", neutral: "😐", Neutral: "😐",
  Motivated: "🔥", Calm: "😌", Anxious: "😰", Focused: "😤", Tired: "😴",
  Excited: "🤩", Grateful: "🙏", Inspired: "✨", Frustrated: "😤", Overwhelmed: "😩",
  Strong: "💪", Peaceful: "🧘", Bored: "😑", Confident: "😎", Curious: "🤔",
  Emotional: "🥹", Content: "☺️",
};

function parseSleepDuration(sleepTime, wakeUpTime) {
  if (!sleepTime || !wakeUpTime) return null;
  const [sh, sm] = sleepTime.split(":").map(Number);
  const [wh, wm] = wakeUpTime.split(":").map(Number);
  let sleepMins = sh * 60 + sm;
  let wakeMins = wh * 60 + wm;
  if (wakeMins <= sleepMins) wakeMins += 24 * 60;
  const dur = wakeMins - sleepMins;
  if (dur <= 0 || dur > 18 * 60) return null;
  const h = Math.floor(dur / 60);
  const m = dur % 60;
  return { minutes: dur, label: `${h}h ${String(m).padStart(2, "0")}m` };
}

function avgTime(timeStrings) {
  const valid = timeStrings.filter(Boolean).map(t => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  });
  if (!valid.length) return "";
  const avg = Math.round(valid.reduce((a, b) => a + b, 0) / valid.length);
  return `${String(Math.floor(avg / 60)).padStart(2, "0")}:${String(avg % 60).padStart(2, "0")}`;
}

// Parse numeric value from strings like "158 g", "3.7 L", "2,484 kcal"
function parseNumericValue(str) {
  if (!str) return null;
  const n = parseFloat(str.replace(/,/g, "").replace(/[^\d.]/g, ""));
  return isNaN(n) ? null : n;
}

// Return Monday dayKey for any given dayKey
function getWeekStartDayKey(dayKey) {
  const date = new Date(`${dayKey}T00:00:00Z`);
  const dow = date.getUTCDay();
  const toMonday = dow === 0 ? -6 : 1 - dow;
  date.setUTCDate(date.getUTCDate() + toMonday);
  return toDayKey(date);
}

// Compute journal weekly stats from an array of entries + weekDays metadata
function computeJournalWeekStats(orderedEntries, weekDays) {
  const loggedDaySet  = new Set(orderedEntries.map(e => e.dayKey));
  const loggedDays    = orderedEntries.length;
  const longestStreak = longestConsecutiveStreak(loggedDaySet, weekDays);

  const moodCounts = {};
  for (const { entry } of orderedEntries) {
    if (entry.mood) moodCounts[entry.mood] = (moodCounts[entry.mood] || 0) + 1;
  }
  const topMoodEntry = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0];
  const topMood = topMoodEntry
    ? { emoji: MOOD_EMOJI[topMoodEntry[0]] || "😐", label: topMoodEntry[0], days: topMoodEntry[1] }
    : null;

  const energyValues = orderedEntries.map(({ dayKey, entry }) => ({ dayKey, value: entry.energyLevel ?? 50 }));
  const ratingValues = orderedEntries.map(({ dayKey, entry }) => ({ dayKey, value: entry.overallRating ?? 50 }));

  function statBlock(values) {
    if (!values.length) return { avg: 0, highest: { day: "-", value: 0 }, lowest: { day: "-", value: 0 } };
    const avg = Math.round(values.reduce((s, v) => s + v.value, 0) / values.length);
    const hi  = values.reduce((a, b) => (b.value > a.value ? b : a));
    const lo  = values.reduce((a, b) => (b.value < a.value ? b : a));
    const fmt = (v) => new Date(`${v.dayKey}T00:00:00Z`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
    return { avg, highest: { day: fmt(hi), value: hi.value }, lowest: { day: fmt(lo), value: lo.value } };
  }

  function countBlock(field) {
    if (!orderedEntries.length) return { total: 0, highest: { day: "-", value: 0 }, lowest: { day: "-", value: 0 } };
    const values = orderedEntries.map(({ dayKey, entry }) => ({ dayKey, value: (entry[field] || []).length }));
    const total = values.reduce((s, v) => s + v.value, 0);
    const hi = values.reduce((a, b) => (b.value > a.value ? b : a));
    const lo = values.reduce((a, b) => (b.value < a.value ? b : a));
    const fmt = (v) => new Date(`${v.dayKey}T00:00:00Z`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
    return { total, highest: { day: fmt(hi), value: hi.value }, lowest: { day: fmt(lo), value: lo.value } };
  }

  const sleepEntries = orderedEntries
    .filter(({ entry }) => entry.sleepTime && entry.wakeUpTime)
    .map(({ entry }) => ({ sleepTime: entry.sleepTime, wakeUpTime: entry.wakeUpTime }));

  const durations = sleepEntries.map(e => parseSleepDuration(e.sleepTime, e.wakeUpTime)).filter(Boolean);
  const avgDuration = durations.length
    ? (() => {
        const avgMins = Math.round(durations.reduce((s, d) => s + d.minutes, 0) / durations.length);
        return `${Math.floor(avgMins / 60)}h ${String(avgMins % 60).padStart(2, "0")}m`;
      })()
    : "";

  const avgRating   = statBlock(ratingValues).avg;
  const streakBonus = Math.min(10, longestStreak * 1.5);
  const weeklyScore = Math.min(100, Math.round(
    (loggedDays / 7) * 100 * 0.45 +
    avgRating * 0.45 +
    streakBonus
  ));

  return {
    loggedDays,
    loggedDaySet,
    longestStreak,
    topMood,
    weeklyScore,
    stats: {
      energy:       statBlock(energyValues),
      rating:       statBlock(ratingValues),
      wins:         countBlock("wins"),
      mistakes:     countBlock("mistakes"),
      achievements: countBlock("achievement"),
      sleep: {
        avgWakeUp:    avgTime(sleepEntries.map(e => e.wakeUpTime)),
        avgSleepTime: avgTime(sleepEntries.map(e => e.sleepTime)),
        avgDuration,
      },
    },
  };
}

// ─── Weeks List ───────────────────────────────────────────────────────────────

export const getWeeksList = (_req, res) => {
  try {
    const weeks = [];
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const dow = today.getUTCDay();
    const toMonday = dow === 0 ? -6 : 1 - dow;
    const thisMonday = new Date(today);
    thisMonday.setUTCDate(today.getUTCDate() + toMonday);

    for (let i = 0; i < 12; i++) {
      const weekStart = new Date(thisMonday);
      weekStart.setUTCDate(thisMonday.getUTCDate() - i * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setUTCDate(weekStart.getUTCDate() + 6);
      weeks.push({
        id: toDayKey(weekStart),
        date: formatWeekLabel(weekStart, weekEnd),
      });
    }
    res.json(weeks);
  } catch (err) {
    console.error("getWeeksList error:", err);
    res.status(500).json({ error: "Failed to load weeks list" });
  }
};

// ─── Habit Weekly Report ──────────────────────────────────────────────────────

export const getHabitWeeklyReport = async (req, res) => {
  try {
    const userId = req.user.id;
    const { weekStart, weekEnd } = getWeekBounds(req.query.week);
    const weekDays = getWeekDayKeys(weekStart);
    const startDayKey = weekDays[0].dayKey;
    const endDayKey   = weekDays[6].dayKey;

    const habits = await Habit.find({ userId, deletedAt: null }).lean();
    const habitIds = habits.map(h => h._id);

    const logs = await HabitLog.find({
      habitId: { $in: habitIds },
      dayKey:  { $gte: startDayKey, $lte: endDayKey },
    }).lean();

    // habitId -> dayKey -> completed
    const logMap = {};
    for (const log of logs) {
      const hid = log.habitId.toString();
      if (!logMap[hid]) logMap[hid] = {};
      logMap[hid][log.dayKey] = log.completed;
    }

    const categoryMap = {};
    const priorityMap = {
      High:   { total: 0, completed: 0, missed: 0 },
      Medium: { total: 0, completed: 0, missed: 0 },
      Low:    { total: 0, completed: 0, missed: 0 },
    };
    const dailyMap = {};
    for (const wd of weekDays) {
      dailyMap[wd.dayKey] = { day: wd.label, completed: 0, total: 0 };
    }

    let totalInstances = 0;
    let totalCompleted = 0;
    const activeDayKeys = new Set();
    const habitRows = [];

    for (const habit of habits) {
      const scheduledDayKeys = [];
      const completedSet = new Set();

      for (const wd of weekDays) {
        const d = new Date(`${wd.dayKey}T00:00:00Z`);
        if (!isHabitScheduledOn(habit, d)) continue;

        scheduledDayKeys.push(wd.dayKey);
        dailyMap[wd.dayKey].total++;
        totalInstances++;

        const completed = logMap[habit._id.toString()]?.[wd.dayKey] ?? false;
        if (completed) {
          completedSet.add(wd.dayKey);
          activeDayKeys.add(wd.dayKey);
          dailyMap[wd.dayKey].completed++;
          totalCompleted++;
        }
      }

      if (!scheduledDayKeys.length) continue;

      const habitCompleted = completedSet.size;
      const habitMissed    = scheduledDayKeys.length - habitCompleted;
      const streak         = computeIntraWeekStreak(completedSet, scheduledDayKeys);

      const cat = habit.category || "General";
      if (!categoryMap[cat]) categoryMap[cat] = { name: cat, total: 0, completed: 0, missed: 0 };
      categoryMap[cat].total     += scheduledDayKeys.length;
      categoryMap[cat].completed += habitCompleted;
      categoryMap[cat].missed    += habitMissed;

      const pri = habit.priority || "Medium";
      priorityMap[pri].total     += scheduledDayKeys.length;
      priorityMap[pri].completed += habitCompleted;
      priorityMap[pri].missed    += habitMissed;

      habitRows.push({
        name:          habit.title,
        priority:      pri,
        category:      cat,
        timeOfDay:     habit.timeOfDay || "Morning",
        repeat:        buildRepeatLabel(habit),
        targetStreak:  habit.targetStreak || 21,
        completedDays: habitCompleted,
        totalDays:     scheduledDayKeys.length,
        missed:        habitMissed,
        streak,
      });
    }

    const completionRate  = totalInstances > 0 ? Math.round((totalCompleted / totalInstances) * 100) : 0;
    const activeDaysCount = activeDayKeys.size;
    const weeklyScore     = computeWeeklyScore(completionRate, activeDaysCount);
    const longestStreak   = habitRows.length ? Math.max(...habitRows.map(h => h.streak)) : 0;

    res.json({
      id:             weekDays[0].dayKey,
      date:           formatWeekLabel(weekStart, weekEnd),
      signal:         `${activeDaysCount} Active days`,
      totalInstances,
      completed:      totalCompleted,
      missed:         totalInstances - totalCompleted,
      completionRate,
      weeklyScore,
      longestStreak,
      categories:     Object.values(categoryMap).sort((a, b) => b.total - a.total),
      dailyStats:     weekDays.map(wd => dailyMap[wd.dayKey]),
      priorityStats:  ["High", "Medium", "Low"].map(p => ({ priority: p, ...priorityMap[p] })),
      habits:         habitRows,
      aiSummary:      null,
    });
  } catch (err) {
    console.error("getHabitWeeklyReport error:", err);
    res.status(500).json({ error: "Failed to load habit weekly report" });
  }
};

// ─── Habit Summaries + AI ────────────────────────────────────────────────────

// GET /api/weekly-report/habits/summaries
export const getHabitSummaries = async (req, res) => {
  try {
    const userId = req.user.id;

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const dow = today.getUTCDay();
    const toMonday = dow === 0 ? -6 : 1 - dow;
    const thisMonday = new Date(today);
    thisMonday.setUTCDate(today.getUTCDate() + toMonday);

    const mondays = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(thisMonday);
      d.setUTCDate(thisMonday.getUTCDate() - (i + 1) * 7);
      return d;
    });

    const habits = await Habit.find({ userId, deletedAt: null }).lean();
    if (habits.length === 0) return res.json([]);

    const habitIds = habits.map(h => h._id);
    const earliestDayKey = toDayKey(mondays[11]);
    const latestSunday   = new Date(mondays[0]);
    latestSunday.setUTCDate(mondays[0].getUTCDate() + 6);
    const latestDayKey   = toDayKey(latestSunday);

    const logs = await HabitLog.find(
      { habitId: { $in: habitIds }, dayKey: { $gte: earliestDayKey, $lte: latestDayKey }, completed: true },
      { habitId: 1, dayKey: 1 }
    ).lean();

    const completedByDay = {};
    for (const log of logs) {
      if (!completedByDay[log.dayKey]) completedByDay[log.dayKey] = new Set();
      completedByDay[log.dayKey].add(log.habitId.toString());
    }

    const summaries = mondays.map(monday => {
      const weekEnd     = new Date(monday);
      weekEnd.setUTCDate(monday.getUTCDate() + 6);
      const weekDays    = getWeekDayKeys(monday);
      const scheduledIds = new Set();
      const activeDays   = new Set();

      for (const wd of weekDays) {
        const d = new Date(`${wd.dayKey}T00:00:00Z`);
        for (const habit of habits) {
          if (isHabitScheduledOn(habit, d)) {
            scheduledIds.add(habit._id.toString());
            if (completedByDay[wd.dayKey]?.has(habit._id.toString())) activeDays.add(wd.dayKey);
          }
        }
      }

      return {
        id:         toDayKey(monday),
        date:       formatWeekLabel(monday, weekEnd),
        signal:     `${activeDays.size} Active days`,
        habitCount: scheduledIds.size,
      };
    }).filter(w => w.habitCount > 0);

    res.json(summaries);
  } catch (err) {
    console.error("getHabitSummaries error:", err);
    res.status(500).json({ error: "Failed to load habit summaries" });
  }
};

// GET /api/weekly-report/habits/ai-summary?week=YYYY-MM-DD
export const generateHabitAiSummary = async (req, res) => {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) return res.status(503).json({ error: "AI service not configured" });

    const userId     = req.user.id;
    const regenerate = req.query.regenerate === "true";
    const { weekStart, weekEnd } = getWeekBounds(req.query.week);
    const weekDays    = getWeekDayKeys(weekStart);
    const startDayKey = weekDays[0].dayKey;
    const endDayKey   = weekDays[6].dayKey;

    if (!regenerate) {
      const cached = await HabitWeeklySummary.findOne({ userId, weekStart: startDayKey }).lean();
      if (cached) return res.json({ aiSummary: cached.aiSummary, cached: true });
    }

    const habits = await Habit.find({ userId, deletedAt: null }).lean();
    if (habits.length === 0) {
      return res.json({ aiSummary: "No habits are set up yet. Add your first habit to start tracking consistency." });
    }

    const habitIds = habits.map(h => h._id);
    const logs = await HabitLog.find(
      { habitId: { $in: habitIds }, dayKey: { $gte: startDayKey, $lte: endDayKey } }
    ).lean();

    const logMap = {};
    for (const log of logs) {
      const hid = log.habitId.toString();
      if (!logMap[hid]) logMap[hid] = {};
      logMap[hid][log.dayKey] = log.completed;
    }

    let totalInstances = 0, totalCompleted = 0;
    const activeDayKeys = new Set();
    const categoryMap   = {};
    const habitRows     = [];

    for (const habit of habits) {
      const scheduledDayKeys = [];
      const completedSet     = new Set();

      for (const wd of weekDays) {
        const d = new Date(`${wd.dayKey}T00:00:00Z`);
        if (!isHabitScheduledOn(habit, d)) continue;
        scheduledDayKeys.push(wd.dayKey);
        totalInstances++;
        const completed = logMap[habit._id.toString()]?.[wd.dayKey] ?? false;
        if (completed) { completedSet.add(wd.dayKey); activeDayKeys.add(wd.dayKey); totalCompleted++; }
      }

      if (!scheduledDayKeys.length) continue;

      const habitCompleted = completedSet.size;
      const habitMissed    = scheduledDayKeys.length - habitCompleted;
      const streak         = computeIntraWeekStreak(completedSet, scheduledDayKeys);
      const cat = habit.category || "General";
      if (!categoryMap[cat]) categoryMap[cat] = { name: cat, total: 0, completed: 0, missed: 0 };
      categoryMap[cat].total += scheduledDayKeys.length;
      categoryMap[cat].completed += habitCompleted;
      categoryMap[cat].missed    += habitMissed;

      habitRows.push({ name: habit.title, completedDays: habitCompleted, totalDays: scheduledDayKeys.length, streak });
    }

    if (totalInstances === 0) {
      return res.json({ aiSummary: "No habits were scheduled this week." });
    }

    const completionRate = Math.round((totalCompleted / totalInstances) * 100);
    const activeDays     = activeDayKeys.size;
    const weeklyScore    = computeWeeklyScore(completionRate, activeDays);
    const longestStreak  = habitRows.length ? Math.max(...habitRows.map(h => h.streak)) : 0;
    const weekLabel      = formatWeekLabel(weekStart, weekEnd);

    const topMissed = Object.values(categoryMap).sort((a, b) => b.missed - a.missed).slice(0, 3).filter(c => c.missed > 0);
    const brokenHabits = habitRows.filter(h => h.streak === 0 && h.totalDays > 0).map(h => h.name);

    const contextLines = [
      `Week: ${weekLabel}`,
      `Habit check-ins: ${totalInstances} total — ${totalCompleted} completed, ${totalInstances - totalCompleted} missed (${completionRate}% rate, score ${weeklyScore}/100)`,
      `Active days: ${activeDays}/7`,
      `Longest intra-week streak: ${longestStreak} days`,
    ];
    if (topMissed.length > 0) contextLines.push(`Most missed categories: ${topMissed.map(c => `${c.name} (${c.missed} missed)`).join(", ")}`);
    if (brokenHabits.length > 0) contextLines.push(`Habits with broken streak: ${brokenHabits.slice(0, 4).join(", ")}`);

    const systemPrompt = `You are Little Monk — a sharp, direct personal productivity coach embedded in the MonkMode app. Your job is to give a weekly habit analysis that is honest, specific, and immediately actionable.

Rules:
- Write in plain paragraph form (2-4 sentences). No bullet points, no headers.
- Mention specific habits or categories when the data supports it.
- Identify the one clearest pattern — what held strong, what broke, and why.
- End with one concrete, specific action for next week. Not generic advice.
- Keep it under 120 words. Tight and direct.
- Do not start with "I" or refer to yourself as Little Monk.`;

    const userMessage = `Here is this week's habit data:\n\n${contextLines.join("\n")}\n\nWrite the weekly analysis.`;

    const groqResponse = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user",   content: userMessage },
        ],
        max_tokens: 200,
        temperature: 0.72,
      }),
    });

    if (!groqResponse.ok) {
      const errText = await groqResponse.text();
      console.error("Groq API error (habit):", groqResponse.status, errText);
      return res.status(502).json({ error: "AI generation failed" });
    }

    const groqData  = await groqResponse.json();
    const aiSummary = groqData.choices?.[0]?.message?.content?.trim() ?? null;

    if (aiSummary) {
      await HabitWeeklySummary.findOneAndUpdate(
        { userId, weekStart: startDayKey },
        { aiSummary },
        { upsert: true, returnDocument: "after" }
      );
    }

    res.json({ aiSummary, cached: false });
  } catch (err) {
    console.error("generateHabitAiSummary error:", err);
    res.status(500).json({ error: "Failed to generate AI summary" });
  }
};

// ─── Todo Weekly Report ───────────────────────────────────────────────────────

// GET /api/weekly-report/todos/summaries
// Returns only completed past weeks where the user has at least 1 todo entry.
export const getTodoSummaries = async (req, res) => {
  try {
    const userId = req.user.id;

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const dow = today.getUTCDay();
    const toMonday = dow === 0 ? -6 : 1 - dow;
    const thisMonday = new Date(today);
    thisMonday.setUTCDate(today.getUTCDate() + toMonday);

    // Build last 12 completed weeks (exclude current week)
    const mondays = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(thisMonday);
      d.setUTCDate(thisMonday.getUTCDate() - (i + 1) * 7);
      return d;
    });

    const earliestDayKey = toDayKey(mondays[11]);

    // Fetch all relevant todos: once-type with dayStates in range, and all repeating ones
    const todos = await Todo.find(
      {
        userId,
        deletedAt: null,
        $or: [
          { repeatType: "once", "dayStates.dayKey": { $gte: earliestDayKey } },
          { repeatType: { $ne: "once" }, startDate: { $lte: new Date(`${toDayKey(mondays[0])}T23:59:59Z`) } },
        ],
      },
      { repeatType: 1, days: 1, startDate: 1, endDate: 1, dayStates: 1 }
    ).lean();

    const todayKey = toDayKey(today);

    // For each past week, count scheduled tasks (including missed ones)
    const summaries = mondays
      .map(monday => {
        const weekEnd = new Date(monday);
        weekEnd.setUTCDate(monday.getUTCDate() + 6);
        const startDayKey = toDayKey(monday);
        const endDayKey   = toDayKey(weekEnd);
        const weekDays    = getWeekDayKeys(monday);

        let taskCount = 0;
        const activeDays = new Set();

        for (const todo of todos) {
          const stateMap = {};
          for (const ds of (todo.dayStates || [])) stateMap[ds.dayKey] = ds;

          if (todo.repeatType === "once") {
            for (const wd of weekDays) {
              const ds = stateMap[wd.dayKey];
              if (!ds) continue;
              taskCount++;
              if (ds.status === "completed") activeDays.add(wd.dayKey);
            }
          } else {
            for (const wd of weekDays) {
              if (wd.dayKey > todayKey) continue;
              if (!isTodoScheduledOn(todo, wd.dayKey)) continue;
              taskCount++;
              const ds = stateMap[wd.dayKey];
              if (ds?.status === "completed") activeDays.add(wd.dayKey);
            }
          }
        }

        return {
          id:     startDayKey,
          date:   formatWeekLabel(monday, weekEnd),
          signal: `${activeDays.size} Active days`,
          taskCount,
        };
      })
      .filter(w => w.taskCount > 0);

    res.json(summaries);
  } catch (err) {
    console.error("getTodoSummaries error:", err);
    res.status(500).json({ error: "Failed to load todo summaries" });
  }
};

const TODO_TIMING_BUCKETS = [
  { range: "6 AM – 9 AM",   start: 6,  end: 9  },
  { range: "9 AM – 12 PM",  start: 9,  end: 12 },
  { range: "12 PM – 3 PM",  start: 12, end: 15 },
  { range: "3 PM – 6 PM",   start: 15, end: 18 },
  { range: "6 PM – 12 AM",  start: 18, end: 24 },
];
const IMPORTANT_CATEGORIES = new Set(["Bill & Payment", "Health", "Finance", "Medical", "Insurance"]);

// Returns true if this todo was scheduled to run on the given dayKey
function isTodoScheduledOn(todo, dayKey) {
  if (todo.repeatType === "once") return false; // once-type handled via explicit dayStates only

  const date = new Date(`${dayKey}T00:00:00Z`);
  if (todo.startDate && date < new Date(todo.startDate)) return false;
  if (todo.endDate   && date > new Date(todo.endDate))   return false;

  const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dow = date.getUTCDay();
  const dayName = DAY_NAMES[dow];

  switch (todo.repeatType) {
    case "daily":
      return true;
    case "weekdays":
      // If specific days are listed, use them; otherwise fall back to Mon–Fri
      if (todo.days && todo.days.length > 0) return todo.days.includes(dayName);
      return dow >= 1 && dow <= 5;
    case "weekend":
      return dow === 0 || dow === 6;
    default:
      return false;
  }
}

export const getTodoWeeklyReport = async (req, res) => {
  try {
    const userId = req.user.id;
    const { weekStart, weekEnd } = getWeekBounds(req.query.week);
    const weekDays    = getWeekDayKeys(weekStart);
    const startDayKey = weekDays[0].dayKey;
    const endDayKey   = weekDays[6].dayKey;
    const todayKey    = toDayKey(new Date());

    // Fetch once-type todos that have an explicit dayState in the week,
    // AND all repeating todos that started on or before the week ends.
    const todos = await Todo.find({
      userId,
      deletedAt: null,
      $or: [
        {
          repeatType: "once",
          "dayStates.dayKey": { $gte: startDayKey, $lte: endDayKey },
        },
        {
          repeatType: { $ne: "once" },
          startDate:  { $lte: new Date(`${endDayKey}T23:59:59Z`) },
        },
      ],
    }).lean();

    const categoryMap = {};
    const priorityMap = {
      High:   { total: 0, completed: 0, missed: 0 },
      Medium: { total: 0, completed: 0, missed: 0 },
      Low:    { total: 0, completed: 0, missed: 0 },
    };
    const dailyMap = {};
    for (const wd of weekDays) {
      dailyMap[wd.dayKey] = { day: wd.label, completed: 0, total: 0 };
    }

    const bucketStats = TODO_TIMING_BUCKETS.map(() => ({ total: 0, completed: 0, missed: 0 }));
    const missedTasks = [];
    let totalTasks = 0, totalCompleted = 0, totalMissed = 0, totalPending = 0;
    const activeDayKeys = new Set();

    const recordSlot = (dayKey, status, todo, cat, pri, bucketIdx) => {
      const isPastDay = dayKey <= todayKey;

      totalTasks++;
      categoryMap[cat].total++;
      priorityMap[pri].total++;
      if (dailyMap[dayKey]) dailyMap[dayKey].total++;
      if (bucketIdx >= 0) bucketStats[bucketIdx].total++;

      if (status === "completed") {
        totalCompleted++;
        categoryMap[cat].completed++;
        priorityMap[pri].completed++;
        if (dailyMap[dayKey]) {
          dailyMap[dayKey].completed++;
          activeDayKeys.add(dayKey);
        }
        if (bucketIdx >= 0) bucketStats[bucketIdx].completed++;
      } else if (status === "missed" || (status === "pending" && isPastDay)) {
        // pending on a past day = effectively missed
        totalMissed++;
        categoryMap[cat].missed++;
        priorityMap[pri].missed++;
        if (bucketIdx >= 0) bucketStats[bucketIdx].missed++;
        const dayDate = new Date(`${dayKey}T00:00:00Z`);
        missedTasks.push({
          title:    todo.title,
          category: cat,
          priority: pri,
          day:      dayDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" }),
        });
      } else {
        // pending on today or a future day — still in play
        totalPending++;
      }
    };

    for (const todo of todos) {
      const cat = todo.category || "Others";
      const pri = todo.priority || "Medium";
      if (!categoryMap[cat]) categoryMap[cat] = { name: cat, total: 0, completed: 0, missed: 0 };

      let bucketIdx = -1;
      if (todo.time) {
        const h = parseInt(todo.time.split(":")[0], 10);
        bucketIdx = TODO_TIMING_BUCKETS.findIndex(b => h >= b.start && h < b.end);
      }

      // Build dayKey → dayState map for quick lookup
      const stateMap = {};
      for (const ds of (todo.dayStates || [])) stateMap[ds.dayKey] = ds;

      if (todo.repeatType === "once") {
        // Only count explicit dayStates within the week
        for (const wd of weekDays) {
          const ds = stateMap[wd.dayKey];
          if (!ds) continue;
          recordSlot(wd.dayKey, ds.status, todo, cat, pri, bucketIdx);
        }
      } else {
        // For repeating todos: check every day in the week against the schedule
        for (const wd of weekDays) {
          if (wd.dayKey > todayKey) continue; // don't count future days as missed
          if (!isTodoScheduledOn(todo, wd.dayKey)) continue;

          const ds = stateMap[wd.dayKey];
          const status = ds ? ds.status : "missed"; // no record on a scheduled past day = missed
          recordSlot(wd.dayKey, status, todo, cat, pri, bucketIdx);
        }
      }
    }

    const completionRate  = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0;
    const activeDaysCount = activeDayKeys.size;
    const weeklyScore     = computeWeeklyScore(completionRate, activeDaysCount);
    const longestStreak   = longestConsecutiveStreak(activeDayKeys, weekDays);

    const sortedCategories    = Object.values(categoryMap).sort((a, b) => b.total - a.total);
    const importantCategories = sortedCategories.filter(c => IMPORTANT_CATEGORIES.has(c.name));

    res.json({
      id:               weekDays[0].dayKey,
      date:             formatWeekLabel(weekStart, weekEnd),
      signal:           `${activeDaysCount} Active days`,
      totalTasks,
      completed:        totalCompleted,
      pending:          totalPending,
      missed:           totalMissed,
      completionRate,
      weeklyScore,
      longestStreak,
      completionTiming: TODO_TIMING_BUCKETS.map((b, i) => ({ range: b.range, count: bucketStats[i].completed, total: bucketStats[i].total })),
      missedTiming:     TODO_TIMING_BUCKETS.map((b, i) => ({ range: b.range, count: bucketStats[i].missed,    total: bucketStats[i].total })),
      categories:       sortedCategories,
      priorityStats:    ["High", "Medium", "Low"].map(p => ({ priority: p, ...priorityMap[p] })),
      importantCategories,
      dailyStats:       weekDays.map(wd => dailyMap[wd.dayKey]),
      missedTasks:      missedTasks.slice(0, 20),
      aiSummary:        null,
    });
  } catch (err) {
    console.error("getTodoWeeklyReport error:", err);
    res.status(500).json({ error: "Failed to load todo weekly report" });
  }
};

// ─── Todo AI Summary ─────────────────────────────────────────────────────────

function buildTodoWeekContext(weekLabel, totalTasks, completed, missed, completionRate, weeklyScore, dailyStats, categories, priorityStats) {
  const lines = [
    `Week: ${weekLabel}`,
    `Tasks: ${totalTasks} total — ${completed} completed, ${missed} missed (${completionRate}% completion rate, score ${weeklyScore}/100)`,
  ];

  const sorted = [...dailyStats].filter(d => d.total > 0).sort((a, b) => (b.completed / b.total) - (a.completed / a.total));
  if (sorted.length > 0) {
    lines.push(`Best day: ${sorted[0].label} (${sorted[0].completed}/${sorted[0].total} done)`);
    if (sorted.length > 1) lines.push(`Worst day: ${sorted[sorted.length - 1].label} (${sorted[sorted.length - 1].completed}/${sorted[sorted.length - 1].total} done)`);
  }

  const zeroDays = dailyStats.filter(d => d.total > 0 && d.completed === 0).map(d => d.label);
  if (zeroDays.length > 0) lines.push(`Zero-completion days: ${zeroDays.join(", ")}`);

  const topMissed = [...categories].sort((a, b) => b.missed - a.missed).slice(0, 3).filter(c => c.missed > 0);
  if (topMissed.length > 0) lines.push(`Most missed categories: ${topMissed.map(c => `${c.name} (${c.missed} missed)`).join(", ")}`);

  const highPri = priorityStats.find(p => p.priority === "High");
  if (highPri && highPri.total > 0) lines.push(`High-priority tasks: ${highPri.completed}/${highPri.total} completed`);

  return lines.join("\n");
}

// GET /api/weekly-report/todos/ai-summary?week=YYYY-MM-DD
export const generateTodoAiSummary = async (req, res) => {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) return res.status(503).json({ error: "AI service not configured" });

    const userId     = req.user.id;
    const regenerate = req.query.regenerate === "true";
    const { weekStart, weekEnd } = getWeekBounds(req.query.week);
    const weekDays    = getWeekDayKeys(weekStart);
    const startDayKey = weekDays[0].dayKey;
    const endDayKey   = weekDays[6].dayKey;
    const todayKey    = toDayKey(new Date());

    if (!regenerate) {
      const cached = await TodoWeeklySummary.findOne({ userId, weekStart: startDayKey }).lean();
      if (cached) return res.json({ aiSummary: cached.aiSummary, cached: true });
    }

    // Fetch todos for the week (same query as getTodoWeeklyReport)
    const todos = await Todo.find({
      userId, deletedAt: null,
      $or: [
        { repeatType: "once", "dayStates.dayKey": { $gte: startDayKey, $lte: endDayKey } },
        { repeatType: { $ne: "once" }, startDate: { $lte: new Date(`${endDayKey}T23:59:59Z`) } },
      ],
    }).lean();

    if (todos.length === 0) {
      return res.json({ aiSummary: "No tasks were recorded this week. Add your first todo and start building the habit." });
    }

    // Compute summary stats
    let totalTasks = 0, completed = 0, missed = 0;
    const categoryMap = {};
    const priorityMap = { High: { total: 0, completed: 0, missed: 0 }, Medium: { total: 0, completed: 0, missed: 0 }, Low: { total: 0, completed: 0, missed: 0 } };
    const dailyMap = {};
    for (const wd of weekDays) dailyMap[wd.dayKey] = { label: wd.label, total: 0, completed: 0 };

    for (const todo of todos) {
      const stateMap = {};
      for (const ds of (todo.dayStates || [])) stateMap[ds.dayKey] = ds;
      const cat = todo.category || "Uncategorized";
      const pri = todo.priority || "Medium";
      if (!categoryMap[cat]) categoryMap[cat] = { name: cat, total: 0, completed: 0, missed: 0 };
      if (!priorityMap[pri]) priorityMap[pri] = { total: 0, completed: 0, missed: 0 };

      const recordSlot = (dayKey, status) => {
        totalTasks++;
        dailyMap[dayKey].total++;
        categoryMap[cat].total++;
        priorityMap[pri].total++;
        if (status === "completed") {
          completed++; dailyMap[dayKey].completed++; categoryMap[cat].completed++; priorityMap[pri].completed++;
        } else {
          missed++; categoryMap[cat].missed++; priorityMap[pri].missed++;
        }
      };

      if (todo.repeatType === "once") {
        for (const wd of weekDays) {
          const ds = stateMap[wd.dayKey];
          if (ds) recordSlot(wd.dayKey, ds.status);
        }
      } else {
        for (const wd of weekDays) {
          if (wd.dayKey > todayKey || !isTodoScheduledOn(todo, wd.dayKey)) continue;
          const ds = stateMap[wd.dayKey];
          recordSlot(wd.dayKey, ds ? ds.status : "missed");
        }
      }
    }

    if (totalTasks === 0) {
      return res.json({ aiSummary: "No tasks were scheduled this week." });
    }

    const completionRate = Math.round((completed / totalTasks) * 100);
    const activeDays     = Object.values(dailyMap).filter(d => d.total > 0 && d.completed > 0).length;
    const weeklyScore    = computeWeeklyScore(completionRate, activeDays);
    const weekLabel      = formatWeekLabel(weekStart, weekEnd);
    const dailyStats     = weekDays.map(wd => ({ ...dailyMap[wd.dayKey] }));
    const categories     = Object.values(categoryMap).sort((a, b) => b.total - a.total);
    const priorityStats  = ["High", "Medium", "Low"].map(p => ({ priority: p, ...priorityMap[p] }));

    const weekContext = buildTodoWeekContext(weekLabel, totalTasks, completed, missed, completionRate, weeklyScore, dailyStats, categories, priorityStats);

    const systemPrompt = `You are Little Monk — a sharp, direct personal productivity coach embedded in the MonkMode app. Your job is to give a weekly task analysis that is honest, specific, and immediately actionable.

Rules:
- Write in plain paragraph form (2-4 sentences). No bullet points, no headers.
- Mention specific days (e.g. "Wednesday had zero completions") when the data supports it.
- Identify the one clearest pattern — what worked, what failed, and why.
- End with one concrete, specific action for next week. Not generic advice.
- Keep it under 120 words. Tight and direct.
- Do not start with "I" or refer to yourself as Little Monk.`;

    const userMessage = `Here is this week's task data:\n\n${weekContext}\n\nWrite the weekly analysis.`;

    const groqResponse = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user",   content: userMessage },
        ],
        max_tokens: 200,
        temperature: 0.72,
      }),
    });

    if (!groqResponse.ok) {
      const errText = await groqResponse.text();
      console.error("Groq API error (todo):", groqResponse.status, errText);
      return res.status(502).json({ error: "AI generation failed" });
    }

    const groqData  = await groqResponse.json();
    const aiSummary = groqData.choices?.[0]?.message?.content?.trim() ?? null;

    if (aiSummary) {
      await TodoWeeklySummary.findOneAndUpdate(
        { userId, weekStart: startDayKey },
        { aiSummary },
        { upsert: true, returnDocument: "after" }
      );
    }

    res.json({ aiSummary, cached: false });
  } catch (err) {
    console.error("generateTodoAiSummary error:", err);
    res.status(500).json({ error: "Failed to generate AI summary" });
  }
};

// ─── Journal Weekly Report ────────────────────────────────────────────────────

// GET /api/weekly-report/journal?week=YYYY-MM-DD
// Returns full stats for a specific week, computed from journal entries (Mon–Sun).
// Summaries are based on whichever days data exists — a "complete" week summary
// is naturally available once the week ends (Sunday midnight → Monday).
export const getJournalWeeklyReport = async (req, res) => {
  try {
    const userId = req.user.id;
    const { weekStart, weekEnd } = getWeekBounds(req.query.week);
    const weekDays    = getWeekDayKeys(weekStart);
    const startDayKey = weekDays[0].dayKey;
    const endDayKey   = weekDays[6].dayKey;

    const [entries, savedReasons] = await Promise.all([
      Journal.find(
        { userId, dayKey: { $gte: startDayKey, $lte: endDayKey } },
        { dayKey: 1, mood: 1, energyLevel: 1, overallRating: 1, wins: 1, mistakes: 1, achievement: 1, sleepTime: 1, wakeUpTime: 1 }
      ).lean(),
      JournalMissedReason.find(
        { userId, dayKey: { $gte: startDayKey, $lte: endDayKey } }
      ).lean(),
    ]);

    const entryMap  = Object.fromEntries(entries.map(e => [e.dayKey, e]));
    const reasonMap = Object.fromEntries(savedReasons.map(r => [r.dayKey, r.reason]));

    const orderedEntries = weekDays
      .filter(wd => entryMap[wd.dayKey])
      .map(wd => ({ dayKey: wd.dayKey, label: wd.label, entry: entryMap[wd.dayKey] }));

    const computed = computeJournalWeekStats(orderedEntries, weekDays);

    // Missed days: week days with no journal entry
    const missedDays = weekDays
      .filter(wd => !computed.loggedDaySet.has(wd.dayKey))
      .map(wd => ({
        date:   wd.dayKey,
        label:  new Date(`${wd.dayKey}T00:00:00Z`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" }),
        note:   "No journal submitted",
        reason: reasonMap[wd.dayKey] || null,
      }));

    res.json({
      id:           startDayKey,
      date:         formatWeekLabel(weekStart, weekEnd),
      signal:       `${computed.loggedDays} logged days`,
      topMood:      computed.topMood,
      weeklyScore:  computed.weeklyScore,
      longestStreak: computed.longestStreak,
      stats:        computed.stats,
      missedDays,
      aiSummary:    null,
    });
  } catch (err) {
    console.error("getJournalWeeklyReport error:", err);
    res.status(500).json({ error: "Failed to load journal weekly report" });
  }
};

// GET /api/weekly-report/journal/summaries
// Returns the last 12 weeks (most recent first), each with basic stats
// computed from journal entries. Once a week ends (Sunday midnight), that
// week's summary reflects all 7 days of entries.
export const getJournalSummaries = async (req, res) => {
  try {
    const userId = req.user.id;

    // Build list of last 12 Mondays (most recent first)
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const dow        = today.getUTCDay();
    const toMonday   = dow === 0 ? -6 : 1 - dow;
    const thisMonday = new Date(today);
    thisMonday.setUTCDate(today.getUTCDate() + toMonday);

    const mondays = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(thisMonday);
      d.setUTCDate(thisMonday.getUTCDate() - i * 7);
      return d;
    });

    const earliestMonday  = mondays[11];
    const earliestDayKey  = toDayKey(earliestMonday);

    // Single query: all journals from the last 12 weeks
    const allEntries = await Journal.find(
      { userId, dayKey: { $gte: earliestDayKey } },
      { dayKey: 1, mood: 1, energyLevel: 1, overallRating: 1 }
    ).lean();

    // Group entries by their week's Monday key
    const weekGroups = {};
    for (const entry of allEntries) {
      const wk = getWeekStartDayKey(entry.dayKey);
      if (!weekGroups[wk]) weekGroups[wk] = [];
      weekGroups[wk].push(entry);
    }

    const summaries = mondays.map(monday => {
      const weekStart   = monday;
      const weekEnd     = new Date(monday);
      weekEnd.setUTCDate(monday.getUTCDate() + 6);
      const weekDays    = getWeekDayKeys(weekStart);
      const startDayKey = weekDays[0].dayKey;
      const entries     = weekGroups[startDayKey] || [];

      // Ordered entries for this week
      const entryMap       = Object.fromEntries(entries.map(e => [e.dayKey, e]));
      const orderedEntries = weekDays
        .filter(wd => entryMap[wd.dayKey])
        .map(wd => ({ dayKey: wd.dayKey, label: wd.label, entry: entryMap[wd.dayKey] }));

      const { loggedDays, topMood, weeklyScore, longestStreak } =
        computeJournalWeekStats(orderedEntries, weekDays);

      // A summary is "Ready" once the week is fully over
      const weekIsComplete = weekEnd < today;

      return {
        id:           startDayKey,
        date:         formatWeekLabel(weekStart, weekEnd),
        status:       weekIsComplete ? "Ready" : "Draft",
        signal:       `${loggedDays} logged days`,
        loggedDays,
        topMood,
        weeklyScore,
        longestStreak,
      };
    });

    // Only show completed weeks where the user logged at least one journal entry
    res.json(summaries.filter(w => w.status === "Ready" && w.loggedDays > 0));
  } catch (err) {
    console.error("getJournalSummaries error:", err);
    res.status(500).json({ error: "Failed to load journal summaries" });
  }
};

// GET /api/weekly-report/journal/missed-days?week=YYYY-MM-DD
// Returns missed journal days for the given week with any saved reasons.
// Defaults to the current week if no week param is provided.
export const getMissedJournalDays = async (req, res) => {
  try {
    const userId = req.user.id;
    const { weekStart } = getWeekBounds(req.query.week);
    const weekDays    = getWeekDayKeys(weekStart);
    const startDayKey = weekDays[0].dayKey;
    const endDayKey   = weekDays[6].dayKey;

    const [entries, savedReasons] = await Promise.all([
      Journal.find(
        { userId, dayKey: { $gte: startDayKey, $lte: endDayKey } },
        { dayKey: 1 }
      ).lean(),
      JournalMissedReason.find(
        { userId, dayKey: { $gte: startDayKey, $lte: endDayKey } }
      ).lean(),
    ]);

    const loggedDayKeys = new Set(entries.map(e => e.dayKey));
    const reasonMap     = Object.fromEntries(savedReasons.map(r => [r.dayKey, r.reason]));

    // Only include days up to today (don't count future days as "missed")
    const todayKey = toDayKey(new Date());

    const missedDays = weekDays
      .filter(wd => wd.dayKey <= todayKey && !loggedDayKeys.has(wd.dayKey))
      .map(wd => ({
        date:   wd.dayKey,
        label:  new Date(`${wd.dayKey}T00:00:00Z`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" }),
        note:   "No journal submitted",
        reason: reasonMap[wd.dayKey] || null,
      }));

    res.json(missedDays);
  } catch (err) {
    console.error("getMissedJournalDays error:", err);
    res.status(500).json({ error: "Failed to load missed journal days" });
  }
};

// POST /api/weekly-report/journal/missed-reason
// Body: { dayKey: "YYYY-MM-DD", reason: "..." }
// Saves (or updates) the user's reason for missing a journal entry on that day.
export const saveJournalMissedReason = async (req, res) => {
  try {
    const userId = req.user.id;
    const { dayKey, reason } = req.body;

    if (!dayKey || !/^\d{4}-\d{2}-\d{2}$/.test(dayKey)) {
      return res.status(400).json({ error: "Invalid dayKey" });
    }
    if (typeof reason !== "string" || !reason.trim()) {
      return res.status(400).json({ error: "Reason is required" });
    }

    const doc = await JournalMissedReason.findOneAndUpdate(
      { userId, dayKey },
      { reason: reason.trim() },
      { upsert: true, new: true }
    );

    res.json({ dayKey: doc.dayKey, reason: doc.reason });
  } catch (err) {
    console.error("saveJournalMissedReason error:", err);
    res.status(500).json({ error: "Failed to save reason" });
  }
};

// ─── Journal AI Summary (Little Monk's Analysis) ─────────────────────────────

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL   = "llama-3.3-70b-versatile";

// Build a compact text snapshot of the week for the AI prompt
function buildJournalWeekContext(weekLabel, stats, loggedDays, missedDays, topMood, longestStreak) {
  const lines = [
    `Week: ${weekLabel}`,
    `Journal entries: ${loggedDays}/7 days logged, ${missedDays} days missed, longest consecutive streak: ${longestStreak} days`,
  ];

  if (topMood) lines.push(`Most repeated mood: ${topMood.label} (${topMood.days} days)`);

  const { energy, rating, wins, mistakes, achievements, sleep } = stats;
  lines.push(`Energy — avg: ${energy.avg}, highest: ${energy.highest.value} on ${energy.highest.day}, lowest: ${energy.lowest.value} on ${energy.lowest.day}`);
  lines.push(`Day rating — avg: ${rating.avg}, highest: ${rating.highest.value} on ${rating.highest.day}, lowest: ${rating.lowest.value} on ${rating.lowest.day}`);
  lines.push(`Wins: ${wins.total} total, best day ${wins.highest.day} (${wins.highest.value} wins), worst ${wins.lowest.day} (${wins.lowest.value} wins)`);
  lines.push(`Mistakes: ${mistakes.total} total, most on ${mistakes.highest.day} (${mistakes.highest.value}), least on ${mistakes.lowest.day} (${mistakes.lowest.value})`);
  lines.push(`Achievements: ${achievements.total} total, best day ${achievements.highest.day} (${achievements.highest.value})`);

  if (sleep.avgWakeUp)   lines.push(`Avg wake-up: ${sleep.avgWakeUp}`);
  if (sleep.avgSleepTime) lines.push(`Avg sleep time: ${sleep.avgSleepTime}`);
  if (sleep.avgDuration)  lines.push(`Avg sleep duration: ${sleep.avgDuration}`);

  return lines.join("\n");
}

// GET /api/weekly-report/journal/ai-summary?week=YYYY-MM-DD
// Calls the Groq API (Llama 3.3 70B) to generate Little Monk's Analysis
// based on the real journal data for that week.
export const generateJournalAiSummary = async (req, res) => {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: "AI service not configured" });
    }

    const userId     = req.user.id;
    const regenerate = req.query.regenerate === "true";
    const { weekStart, weekEnd } = getWeekBounds(req.query.week);
    const weekDays    = getWeekDayKeys(weekStart);
    const startDayKey = weekDays[0].dayKey;
    const endDayKey   = weekDays[6].dayKey;

    // Return cached summary unless regenerate is explicitly requested
    if (!regenerate) {
      const cached = await JournalWeeklySummary.findOne({
        userId,
        $or: [{ weekStart: startDayKey }, { weekId: startDayKey }]
      }).lean();
      if (cached) return res.json({ aiSummary: cached.aiSummary, cached: true });
    }

    // Fetch journal entries for the week
    const entries = await Journal.find(
      { userId, dayKey: { $gte: startDayKey, $lte: endDayKey } },
      { dayKey: 1, mood: 1, energyLevel: 1, overallRating: 1, wins: 1, mistakes: 1, achievement: 1, sleepTime: 1, wakeUpTime: 1, content: 1, summary: 1 }
    ).lean();

    const entryMap       = Object.fromEntries(entries.map(e => [e.dayKey, e]));
    const orderedEntries = weekDays
      .filter(wd => entryMap[wd.dayKey])
      .map(wd => ({ dayKey: wd.dayKey, label: wd.label, entry: entryMap[wd.dayKey] }));

    if (orderedEntries.length === 0) {
      return res.json({ aiSummary: "No journal entries were logged this week. Start with just one sentence a day — it's enough to build the pattern." });
    }

    const computed    = computeJournalWeekStats(orderedEntries, weekDays);
    const missedCount = 7 - computed.loggedDays;
    const weekLabel   = formatWeekLabel(weekStart, weekEnd);

    const weekContext = buildJournalWeekContext(
      weekLabel,
      computed.stats,
      computed.loggedDays,
      missedCount,
      computed.topMood,
      computed.longestStreak
    );

    const systemPrompt = `You are Little Monk — a sharp, direct personal productivity coach embedded in the MonkMode app. Your job is to give a weekly journal analysis that is honest, specific, and immediately actionable.

Rules:
- Write in plain paragraph form (2-4 sentences). No bullet points, no headers.
- Mention specific days (e.g. "Wednesday was your best day") when the data supports it.
- Identify the one clearest pattern from the data — what drove the best days, what caused the worst.
- End with one concrete, specific action for next week. Not generic advice.
- Keep it under 120 words. Tight and direct.
- Do not start with "I" or refer to yourself as Little Monk.`;

    const userMessage = `Here is this week's journal data:\n\n${weekContext}\n\nWrite the weekly analysis.`;

    const groqResponse = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user",   content: userMessage },
        ],
        max_tokens:  200,
        temperature: 0.72,
      }),
    });

    if (!groqResponse.ok) {
      const errText = await groqResponse.text();
      console.error("Groq API error:", groqResponse.status, errText);
      return res.status(502).json({ error: "AI generation failed" });
    }

    const groqData  = await groqResponse.json();
    const aiSummary = groqData.choices?.[0]?.message?.content?.trim() ?? null;

    // Persist to DB so subsequent loads are instant
    if (aiSummary) {
      await JournalWeeklySummary.findOneAndUpdate(
        { userId, weekStart: startDayKey },
        { weekStart: startDayKey, weekId: startDayKey, aiSummary },
        { upsert: true, returnDocument: "after" }
      );
    }

    res.json({ aiSummary, cached: false });
  } catch (err) {
    console.error("generateJournalAiSummary error:", err);
    res.status(500).json({ error: "Failed to generate AI summary" });
  }
};

// ─── Goal Weekly Report ───────────────────────────────────────────────────────

// GET /api/weekly-report/goals/summaries
// Only returns weeks where at least one subgoal was completed during that week
export const getGoalSummaries = async (req, res) => {
  try {
    const userId = req.user.id;

    const goals = await Goal.find(
      { userId, deletedAt: null },
      { subgoals: 1 }
    ).lean();
    if (goals.length === 0) return res.json([]);

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const dow = today.getUTCDay();
    const toMonday = dow === 0 ? -6 : 1 - dow;
    const thisMonday = new Date(today);
    thisMonday.setUTCDate(today.getUTCDate() + toMonday);

    // Collect all completed subgoals with their completedAt dates
    const completions = [];
    for (const goal of goals) {
      for (const sub of (goal.subgoals || [])) {
        if (sub.completed && sub.completedAt) {
          completions.push(new Date(sub.completedAt));
        }
      }
    }

    const goalCount = goals.length;

    const summaries = Array.from({ length: 12 }, (_, i) => {
      const monday = new Date(thisMonday);
      monday.setUTCDate(thisMonday.getUTCDate() - (i + 1) * 7);
      const sunday = new Date(monday);
      sunday.setUTCDate(monday.getUTCDate() + 6);
      sunday.setUTCHours(23, 59, 59, 999);

      // Only include this week if at least one subgoal was completed during it
      const hasProgress = completions.some(d => d >= monday && d <= sunday);
      if (!hasProgress) return null;

      return {
        id:        toDayKey(monday),
        date:      formatWeekLabel(monday, sunday),
        goalCount,
      };
    }).filter(Boolean);

    res.json(summaries);
  } catch (err) {
    console.error("getGoalSummaries error:", err);
    res.status(500).json({ error: "Failed to load goal summaries" });
  }
};

export const getGoalWeeklyReport = async (req, res) => {
  try {
    const userId = req.user.id;
    const { weekStart, weekEnd } = getWeekBounds(req.query.week);
    const weekId = toDayKey(weekStart);

    const goals = await Goal.find({ userId, deletedAt: null }).lean();

    const goalRows = goals.map(goal => {
      const subgoals      = goal.subgoals || [];
      const completedSubs = subgoals.filter(s => s.completed).length;
      const totalSubs     = subgoals.length;

      // Use subgoal-based progress when subgoals exist (matches Goals module display)
      // Fall back to currentValue/targetValue for numeric goals with no subgoals
      let progress = 0;
      if (totalSubs > 0) {
        progress = Math.round((completedSubs / totalSubs) * 100);
      } else if (goal.targetValue > 0) {
        progress = Math.min(100, Math.round((goal.currentValue / goal.targetValue) * 100));
      }

      // Expected progress based on time elapsed up to end of week
      let expected = 0;
      if (goal.startDate && goal.deadline) {
        const start   = new Date(goal.startDate).getTime();
        const end     = new Date(goal.deadline).getTime();
        const elapsed = Math.min(weekEnd.getTime(), end) - start;
        const total   = end - start;
        expected = total > 0 ? Math.max(0, Math.min(100, Math.round((elapsed / total) * 100))) : 100;
      }

      const completedThisWeek = subgoals.filter(s => {
        if (!s.completed || !s.completedAt) return false;
        const d = new Date(s.completedAt);
        return d >= weekStart && d <= weekEnd;
      }).length;

      const deadline = goal.deadline
        ? new Date(goal.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })
        : null;

      return {
        title:            goal.title,
        type:             goal.goalType === "long-term" ? "Long Term" : "Short Term",
        priority:         goal.priority || "Medium",
        progress,
        expected,
        deadline,
        completed:        completedSubs,
        total:            subgoals.length,
        completedThisWeek,
      };
    });

    const goalCount   = goalRows.length;
    const avgProgress = goalCount > 0 ? Math.round(goalRows.reduce((s, g) => s + g.progress, 0) / goalCount) : 0;
    const avgExpected = goalCount > 0 ? Math.round(goalRows.reduce((s, g) => s + g.expected, 0) / goalCount) : 0;
    const onTrackBonus = avgProgress >= avgExpected ? 40 : Math.round((avgProgress / Math.max(avgExpected, 1)) * 40);
    const weeklyScore = goalCount > 0
      ? Math.min(100, Math.round(avgProgress * 0.6 + onTrackBonus))
      : 0;

    res.json({
      id:          weekId,
      date:        formatWeekLabel(weekStart, weekEnd),
      weeklyScore,
      summary:     null,
      goals:       goalRows,
    });
  } catch (err) {
    console.error("getGoalWeeklyReport error:", err);
    res.status(500).json({ error: "Failed to load goal weekly report" });
  }
};

// GET /api/weekly-report/goals/ai-summary?week=YYYY-MM-DD
export const generateGoalAiSummary = async (req, res) => {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) return res.status(503).json({ error: "AI service not configured" });

    const userId     = req.user.id;
    const regenerate = req.query.regenerate === "true";
    const { weekStart, weekEnd } = getWeekBounds(req.query.week);
    const weekDays    = getWeekDayKeys(weekStart);
    const startDayKey = weekDays[0].dayKey;

    if (!regenerate) {
      const cached = await GoalWeeklySummary.findOne({ userId, weekStart: startDayKey }).lean();
      if (cached) return res.json({ aiSummary: cached.aiSummary, cached: true });
    }

    const goals = await Goal.find({ userId, deletedAt: null }).lean();
    if (goals.length === 0) {
      return res.json({ aiSummary: "No goals are set up yet. Add your first goal to start tracking progress." });
    }

    const goalRows = goals.map(goal => {
      const subgoals      = goal.subgoals || [];
      const completedSubs = subgoals.filter(s => s.completed).length;
      const totalSubs     = subgoals.length;

      let progress = 0;
      if (totalSubs > 0) {
        progress = Math.round((completedSubs / totalSubs) * 100);
      } else if (goal.targetValue > 0) {
        progress = Math.min(100, Math.round((goal.currentValue / goal.targetValue) * 100));
      }

      let expected = 0;
      if (goal.startDate && goal.deadline) {
        const start   = new Date(goal.startDate).getTime();
        const end     = new Date(goal.deadline).getTime();
        const elapsed = Math.min(weekEnd.getTime(), end) - start;
        const total   = end - start;
        expected = total > 0 ? Math.max(0, Math.min(100, Math.round((elapsed / total) * 100))) : 100;
      }

      const completedThisWeek = subgoals.filter(s => {
        if (!s.completed || !s.completedAt) return false;
        const d = new Date(s.completedAt);
        return d >= weekStart && d <= weekEnd;
      }).length;

      return {
        title:            goal.title,
        type:             goal.goalType === "long-term" ? "Long Term" : "Short Term",
        priority:         goal.priority || "Medium",
        progress,
        expected,
        completedSubs,
        totalSubs,
        completedThisWeek,
      };
    });

    const goalCount         = goalRows.length;
    const avgProgress       = goalCount > 0 ? Math.round(goalRows.reduce((s, g) => s + g.progress, 0) / goalCount) : 0;
    const totalThisWeek     = goalRows.reduce((s, g) => s + g.completedThisWeek, 0);
    const onTrack           = goalRows.filter(g => g.progress >= g.expected).length;
    const slightlyBehind    = goalRows.filter(g => g.progress < g.expected && g.progress >= g.expected - 12).length;
    const behind            = goalRows.filter(g => g.progress < g.expected - 12).length;
    const weekLabel         = formatWeekLabel(weekStart, weekEnd);

    const contextLines = [
      `Week: ${weekLabel}`,
      `Goals: ${goalCount} active — avg progress ${avgProgress}%`,
      `Risk distribution: ${onTrack} on track, ${slightlyBehind} slightly behind, ${behind} behind schedule`,
      `Milestones completed this week: ${totalThisWeek}`,
    ];

    const highPriority = goalRows.filter(g => g.priority === "High");
    if (highPriority.length > 0) {
      const highBehind = highPriority.filter(g => g.progress < g.expected - 12);
      if (highBehind.length > 0) {
        contextLines.push(`High-priority goals behind schedule: ${highBehind.map(g => `${g.title} (${g.progress}% vs ${g.expected}% expected)`).join(", ")}`);
      } else {
        contextLines.push(`High-priority goals: ${highPriority.map(g => `${g.title} (${g.progress}%)`).join(", ")}`);
      }
    }

    const systemPrompt = `You are Little Monk — a sharp, direct personal productivity coach embedded in the MonkMode app. Your job is to give a weekly goal analysis that is honest, specific, and immediately actionable.

Rules:
- Write in plain paragraph form (2-4 sentences). No bullet points, no headers.
- Mention specific goals by name when the data supports it.
- Identify the one clearest pattern — which goals are healthy, which are at risk, and why.
- End with one concrete, specific action for next week. Not generic advice.
- Keep it under 120 words. Tight and direct.
- Do not start with "I" or refer to yourself as Little Monk.`;

    const userMessage = `Here is this week's goal data:\n\n${contextLines.join("\n")}\n\nWrite the weekly analysis.`;

    const groqResponse = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user",   content: userMessage },
        ],
        max_tokens: 200,
        temperature: 0.72,
      }),
    });

    if (!groqResponse.ok) {
      const errText = await groqResponse.text();
      console.error("Groq API error (goal):", groqResponse.status, errText);
      return res.status(502).json({ error: "AI generation failed" });
    }

    const groqData  = await groqResponse.json();
    const aiSummary = groqData.choices?.[0]?.message?.content?.trim() ?? null;

    if (aiSummary) {
      await GoalWeeklySummary.findOneAndUpdate(
        { userId, weekStart: startDayKey },
        { aiSummary },
        { upsert: true, returnDocument: "after" }
      );
    }

    res.json({ aiSummary, cached: false });
  } catch (err) {
    console.error("generateGoalAiSummary error:", err);
    res.status(500).json({ error: "Failed to generate AI summary" });
  }
};

// ─── Gym Weekly Report ────────────────────────────────────────────────────────

// GET /api/weekly-report/gym/summaries
export const getGymSummaries = async (req, res) => {
  try {
    const userId = req.user.id;

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const dow = today.getUTCDay();
    const toMonday = dow === 0 ? -6 : 1 - dow;
    const thisMonday = new Date(today);
    thisMonday.setUTCDate(today.getUTCDate() + toMonday);

    const mondays = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(thisMonday);
      d.setUTCDate(thisMonday.getUTCDate() - (i + 1) * 7);
      return d;
    });

    const earliestDayKey = toDayKey(mondays[11]);
    const latestSunday   = new Date(mondays[0]);
    latestSunday.setUTCDate(mondays[0].getUTCDate() + 6);
    const latestDayKey   = toDayKey(latestSunday);

    const exercises = await GymExerciseProgress.find(
      { userId, date: { $gte: earliestDayKey, $lte: latestDayKey } },
      { date: 1 }
    ).lean();

    const weekWorkoutDays = {};
    for (const ex of exercises) {
      const wk = getWeekStartDayKey(ex.date);
      if (!weekWorkoutDays[wk]) weekWorkoutDays[wk] = new Set();
      weekWorkoutDays[wk].add(ex.date);
    }

    const summaries = mondays.map(monday => {
      const weekEnd    = new Date(monday);
      weekEnd.setUTCDate(monday.getUTCDate() + 6);
      const startKey   = toDayKey(monday);
      const workoutSet = weekWorkoutDays[startKey];
      if (!workoutSet || workoutSet.size === 0) return null;
      return {
        id:          startKey,
        date:        formatWeekLabel(monday, weekEnd),
        workoutDays: workoutSet.size,
      };
    }).filter(Boolean);

    res.json(summaries);
  } catch (err) {
    console.error("getGymSummaries error:", err);
    res.status(500).json({ error: "Failed to load gym summaries" });
  }
};

// GET /api/weekly-report/gym/ai-summary?week=YYYY-MM-DD
export const generateGymAiSummary = async (req, res) => {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) return res.status(503).json({ error: "AI service not configured" });

    const userId     = req.user.id;
    const regenerate = req.query.regenerate === "true";
    const { weekStart, weekEnd } = getWeekBounds(req.query.week);
    const weekDays    = getWeekDayKeys(weekStart);
    const startDayKey = weekDays[0].dayKey;
    const endDayKey   = weekDays[6].dayKey;

    if (!regenerate) {
      const cached = await GymWeeklySummary.findOne({ userId, weekStart: startDayKey }).lean();
      if (cached) return res.json({ aiSummary: cached.aiSummary, cached: true });
    }

    const exercises = await GymExerciseProgress.find(
      { userId, date: { $gte: startDayKey, $lte: endDayKey } }
    ).lean();

    if (exercises.length === 0) {
      return res.json({ aiSummary: "No gym sessions were logged this week. Start tracking your workouts to get a personalized analysis." });
    }

    const workoutDays   = new Set(exercises.map(e => e.date)).size;
    const bodyGroupCounts = {};
    for (const ex of exercises) {
      const g = ex.bodyPart || "Unknown";
      bodyGroupCounts[g] = (bodyGroupCounts[g] || 0) + 1;
    }
    const topGroups = Object.entries(bodyGroupCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([g]) => g);

    const times = exercises.map(e => parseInt(e.totalTime) || 0).filter(t => t > 0);
    const avgTime = times.length > 0 ? Math.round(times.reduce((a, b) => a + b, 0) / workoutDays) : 0;

    const consistencyScore = Math.round((workoutDays / 6) * 100);
    const weekLabel = formatWeekLabel(weekStart, weekEnd);

    const contextLines = [
      `Week: ${weekLabel}`,
      `Workout days: ${workoutDays}/6 (consistency: ${consistencyScore}%)`,
      avgTime > 0 ? `Avg session time: ${avgTime} min` : null,
      topGroups.length > 0 ? `Most trained muscle groups: ${topGroups.join(", ")}` : null,
      `Total exercise sets logged: ${exercises.length}`,
    ].filter(Boolean);

    const systemPrompt = `You are Little Monk — a sharp, direct fitness coach embedded in the MonkMode app. Give a weekly gym analysis that is honest, specific, and immediately actionable.

Rules:
- Write in plain paragraph form (2-4 sentences). No bullet points, no headers.
- Mention specific body groups when the data supports it.
- Identify the clearest pattern — consistency, what was trained, recovery gaps.
- End with one concrete, specific action for next week.
- Keep it under 120 words. Tight and direct.
- Do not start with "I" or refer to yourself as Little Monk.`;

    const userMessage = `Here is this week's gym data:\n\n${contextLines.join("\n")}\n\nWrite the weekly analysis.`;

    const groqResponse = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user",   content: userMessage },
        ],
        max_tokens: 200,
        temperature: 0.72,
      }),
    });

    if (!groqResponse.ok) {
      const errText = await groqResponse.text();
      console.error("Groq API error (gym):", groqResponse.status, errText);
      return res.status(502).json({ error: "AI generation failed" });
    }

    const groqData  = await groqResponse.json();
    const aiSummary = groqData.choices?.[0]?.message?.content?.trim() ?? null;

    if (aiSummary) {
      await GymWeeklySummary.findOneAndUpdate(
        { userId, weekStart: startDayKey },
        { aiSummary },
        { upsert: true, returnDocument: "after" }
      );
    }

    res.json({ aiSummary, cached: false });
  } catch (err) {
    console.error("generateGymAiSummary error:", err);
    res.status(500).json({ error: "Failed to generate AI summary" });
  }
};

export const getGymWeeklyReport = async (req, res) => {
  try {
    const userId = req.user.id;
    const { weekStart, weekEnd } = getWeekBounds(req.query.week);
    const weekDays    = getWeekDayKeys(weekStart);
    const startDayKey = weekDays[0].dayKey;
    const endDayKey   = weekDays[6].dayKey;

    // Previous week bounds for comparison
    const prevWeekStart = new Date(weekStart);
    prevWeekStart.setUTCDate(weekStart.getUTCDate() - 7);
    const prevWeekEnd = new Date(weekEnd);
    prevWeekEnd.setUTCDate(weekEnd.getUTCDate() - 7);
    const prevStartDayKey = toDayKey(prevWeekStart);
    const prevEndDayKey   = toDayKey(prevWeekEnd);

    const [
      thisWeekExercises,
      thisWeekMeasurements,
      prevMeasurement,
      galleryEntries,
      macroPlanDays,
    ] = await Promise.all([
      GymExerciseProgress.find({ userId, date: { $gte: startDayKey, $lte: endDayKey } }).lean(),
      GymMeasurement.find({ userId, deletedAt: null, checkInDate: { $gte: startDayKey, $lte: endDayKey } }).lean(),
      GymMeasurement.findOne({ userId, deletedAt: null, checkInDate: { $lt: startDayKey } }).sort({ checkInDate: -1 }).lean(),
      GymGalleryEntry.find({ userId, checkInDate: { $gte: new Date(weekStart.getTime() - 12 * 60 * 60 * 1000), $lte: new Date(weekEnd.getTime() + 12 * 60 * 60 * 1000) } }).lean(),
      GymDietPlan.find({ userId, planType: "macros", isActive: true }).lean(),
    ]);

    // For each exercise done this week, fetch its most recent previous entry (any past session)
    const exerciseIds = [...new Set(thisWeekExercises.map(e => e.exerciseId))];
    const prevExerciseEntries = exerciseIds.length > 0
      ? await GymExerciseProgress.find(
          { userId, exerciseId: { $in: exerciseIds }, date: { $lt: startDayKey } }
        ).sort({ date: -1 }).lean()
      : [];

    // Build map: exerciseName → most recent previous entry
    const prevExByName = {};
    for (const e of prevExerciseEntries) {
      const key = e.exerciseName?.toLowerCase().trim();
      if (!key || prevExByName[key]) continue; // keep only the most recent
      prevExByName[key] = e;
    }

    // Workout days
    const workoutDayKeys = [...new Set(thisWeekExercises.map(e => e.date))];
    const workoutDays = workoutDayKeys.length;

    // Average workout time: sum of all exercise times across Mon–Sat divided by 6
    const allTimes = thisWeekExercises
      .map(e => parseInt(e.totalTime))
      .filter(n => !isNaN(n) && n > 0);
    const avgWorkoutTimeMin = allTimes.length
      ? Math.round(allTimes.reduce((s, n) => s + n, 0) / 6)
      : 0;

    // Strength progress: this week's latest entry vs most recent previous entry per exercise
    const thisExByName = {};
    for (const e of thisWeekExercises) {
      const key = e.exerciseName?.toLowerCase().trim();
      if (!key) continue;
      if (!thisExByName[key] || e.date > thisExByName[key].date) thisExByName[key] = e;
    }

    const strengthProgress = Object.entries(thisExByName)
      .map(([key, cur]) => {
        const prev       = prevExByName[key] || null;
        const curWeight  = parseFloat(cur.weight) || 0;
        const prevWeight = prev ? parseFloat(prev.weight) || 0 : 0;
        const improvement = prev && prevWeight > 0
          ? `${((curWeight - prevWeight) / prevWeight * 100) >= 0 ? "+" : ""}${((curWeight - prevWeight) / prevWeight * 100).toFixed(1)}%`
          : null;

        const curReps  = parseInt(cur.reps)  || 0;
        const prevReps = prev ? parseInt(prev.reps)  || 0 : 0;
        const curTime  = parseInt(cur.totalTime)  || 0;
        const prevTime = prev ? parseInt(prev.totalTime) || 0 : 0;

        return {
          exercise:    cur.exerciseName,
          bodyGroup:   cur.bodyPart || "Other",
          previous:    prev ? `${prev.weight} kg x ${prev.reps}` : "—",
          current:     `${cur.weight} kg x ${cur.reps}`,
          improvement,
          sets:        parseInt(cur.sets) || 0,
          totalTime:   cur.totalTime || "",
          repsChange:  prev ? curReps  - prevReps : null,
          timeChange:  prev ? curTime  - prevTime : null,
          isFirstEntry: !prev,
        };
      })
      .filter(r => r.improvement || r.isFirstEntry);

    // Body progress: only if user uploaded at least one measurement this week.
    // Baseline = most recent measurement from any previous week; if none exists,
    // fall back to the earliest measurement within this week (when user has 2+ this week).
    const sortedThisWeek = [...thisWeekMeasurements].sort((a, b) => b.checkInDate.localeCompare(a.checkInDate));
    const latestThis = sortedThisWeek[0];
    const baseline   = prevMeasurement ?? (sortedThisWeek.length >= 2 ? sortedThisWeek[sortedThisWeek.length - 1] : null);

    const bodyProgress = [];
    if (latestThis && baseline) {
      const measurementFields = [
        { key: "bodyWeight", label: "Weight",    category: "Overall",    unit: "kg" },
        { key: "chest",      label: "Chest",     category: "Upper Body", unit: "cm" },
        { key: "waist",      label: "Waist",     category: "Core",       unit: "cm" },
        { key: "armsBiceps", label: "Biceps",    category: "Arms",       unit: "cm" },
        { key: "thighs",     label: "Thigh",     category: "Lower Body", unit: "cm" },
        { key: "shoulders",  label: "Shoulders", category: "Upper Body", unit: "cm" },
      ];
      for (const { key, label, category, unit } of measurementFields) {
        const cur  = parseFloat(latestThis[key]);
        const prev = parseFloat(baseline[key]);
        if (isNaN(cur) || isNaN(prev)) continue;
        const delta = Math.round((cur - prev) * 10) / 10;
        bodyProgress.push({
          bodyPart: label,
          category,
          previous: `${prev} ${unit}`,
          current:  `${cur} ${unit}`,
          change:   delta >= 0 ? `+${delta} ${unit}` : `${delta} ${unit}`,
          trend:    delta >= 0 ? "up" : "down",
        });
      }
    }

    // Progress photos
    // checkInDate is stored as local midnight in UTC (e.g. IST midnight = 18:30 UTC prev day).
    // Adding 12h normalises any UTC-11..UTC+12 timezone to the correct calendar day.
    const progressPhotos = weekDays.map(wd => {
      const dayDate = new Date(`${wd.dayKey}T00:00:00Z`);
      const entry = galleryEntries.find(g => {
        const normalised = new Date(new Date(g.checkInDate).getTime() + 12 * 60 * 60 * 1000);
        return toDayKey(normalised) === wd.dayKey;
      });
      const photo = entry?.images?.[0]?.src || null;
      return {
        day:   dayDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" }),
        photo,
      };
    });

    // Nutrition: average of all active macro day plans (Mon–Sat = 6 days)
    let nutrition = null;
    const macroKeys = ["protein", "carbs", "fats", "fiber", "calories", "water", "sugar", "sodium"];
    const macroLabels = { protein: "avgProtein", carbs: "avgCarbs", fats: "avgFats", fiber: "avgFiber", calories: "avgCalories", water: "avgWater", sugar: "avgSugar", sodium: "avgSodium" };
    if (macroPlanDays.length > 0) {
      const totals = {};
      const counts = {};
      for (const plan of macroPlanDays) {
        for (const key of macroKeys) {
          const val = parseNumericValue(plan.values?.[key]);
          if (val !== null) {
            totals[key] = (totals[key] || 0) + val;
            counts[key] = (counts[key] || 0) + 1;
          }
        }
      }
      const hasAny = Object.keys(totals).length > 0;
      if (hasAny) {
        nutrition = {};
        for (const key of macroKeys) {
          const avg = counts[key] ? Math.round(totals[key] / counts[key]) : null;
          nutrition[macroLabels[key]] = avg !== null ? String(avg) : "";
        }
      }
    }

    const consistencyScore = workoutDays > 0 ? Math.round((workoutDays / 6) * 100) : 0;
    const weeklyScore = Math.min(100, Math.round(consistencyScore * 0.6 + (strengthProgress.length > 0 ? 40 : 20)));

    // Total volume = sum of weight × reps × sets across all exercises this week
    const totalVolumeKg = thisWeekExercises.reduce((sum, e) => {
      const w = parseFloat(e.weight) || 0;
      const r = parseInt(e.reps)    || 0;
      const s = parseInt(e.sets)    || 0;
      return sum + w * r * s;
    }, 0);
    const avgVolumeLifted = totalVolumeKg > 0
      ? `${Math.round(totalVolumeKg).toLocaleString("en-IN")} kg`
      : "";

    res.json({
      id:               weekDays[0].dayKey,
      date:             formatWeekLabel(weekStart, weekEnd),
      workoutDays,
      totalDays:        6,
      avgWorkoutTime:   avgWorkoutTimeMin ? `${avgWorkoutTimeMin} min` : "",
      avgVolumeLifted,
      consistencyScore,
      weeklyScore,
      strengthProgress,
      bodyProgress,
      progressPhotos,
      nutrition,
      aiSummary: null,
    });
  } catch (err) {
    console.error("getGymWeeklyReport error:", err);
    res.status(500).json({ error: "Failed to load gym weekly report" });
  }
};
