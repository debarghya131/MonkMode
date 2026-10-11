import { loadGuruInsights } from "../utils/guruInsightsUtils.js";
import { GURU_SCOPES } from "../../shared/guruInsightsStats.js";
import { getJournalSummary } from "./journalController.js";
import { getTodoSummary } from "./todoController.js";
import { getHabitConsistency } from "./habitController.js";
import { APP_TIMEZONE } from "../config/runtime.js";
import { calculateMonkStreak } from "../utils/monkStreakUtils.js";

const DAY_KEY_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const getFormatterPart = (parts, type) => parts.find((part) => part.type === type)?.value || "";
function toDayKey(date) {
  const parts = DAY_KEY_FORMATTER.formatToParts(new Date(date));
  const y = getFormatterPart(parts, "year");
  const m = getFormatterPart(parts, "month");
  const d = getFormatterPart(parts, "day");
  return `${y}-${m}-${d}`;
}

export const getInsightsSummary = async (req, res) => {
  const scope = req.query.scope || "7d";
  if (!GURU_SCOPES.includes(scope)) return res.status(400).json({ error: "Scope must be 7d, 30d, or all" });
  try {
    return res.json(await loadGuruInsights(req.user.id, scope));
  } catch {
    return res.status(500).json({ error: "Could not load Insights. Please retry." });
  }
};

const callController = async (handler, req) => {
  let payload;
  let statusCode = 200;
  const mockRes = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      payload = data;
      return this;
    }
  };

  await handler(req, mockRes);
  return { statusCode, payload };
};

export const getNavbarConsistency = async (req, res) => {
  try {
    const todayKey = toDayKey(new Date());

    const [journalResult, todoResult, habitResult] = await Promise.all([
      callController(getJournalSummary, { user: req.user, query: {}, includeCompletionDays: true }),
      callController(getTodoSummary, { user: req.user, query: { date: todayKey }, includeCompletionDays: true }),
      callController(getHabitConsistency, { user: req.user, query: {}, includeCompletionDays: true })
    ]);

    if (journalResult.statusCode >= 400 || todoResult.statusCode >= 400 || habitResult.statusCode >= 400) {
      return res.status(502).json({
        message: "Failed to compute consistency from one or more sections"
      });
    }

    const journalTodaySubmitted = Boolean(journalResult.payload?.todayLogged);
    const journalScore = journalTodaySubmitted ? 100 : 0;
    const journalStreak = Math.max(0, Number(journalResult.payload?.currentStreakDays || 0));

    const todoExpectedToday = Math.max(0, Number(todoResult.payload?.today?.total || 0));
    const todoCompletedToday = Math.max(0, Number(todoResult.payload?.today?.completed || 0));
    const todoScore = todoExpectedToday > 0
      ? Math.round((todoCompletedToday / todoExpectedToday) * 100)
      : 0;
    const todoStreak = Math.max(0, Number(todoResult.payload?.fullCompletionStreakDays || 0));

    const habitExpectedToday = Math.max(0, Number(habitResult.payload?.expectedToday || 0));
    const habitCompletedToday = Math.max(0, Number(habitResult.payload?.completedToday || 0));
    const habitScore = habitExpectedToday > 0
      ? Math.round((habitCompletedToday / habitExpectedToday) * 100)
      : 0;
    const habitStreak = Math.max(0, Number(habitResult.payload?.fullCompletionStreakDays || 0));

    const consistencyScore = Math.round((journalScore + todoScore + habitScore) / 3);
    const allSectionsComplete = Boolean(
      journalTodaySubmitted &&
      todoExpectedToday > 0 &&
      todoCompletedToday >= todoExpectedToday &&
      habitExpectedToday > 0 &&
      habitCompletedToday >= habitExpectedToday &&
      todoResult.payload?.completedDayKeys?.includes(todayKey) &&
      habitResult.payload?.completedDayKeys?.includes(todayKey)
    );

    const monkStreakDays = calculateMonkStreak({
      todayKey,
      journalDays: journalResult.payload?.completedDayKeys,
      todoDays: todoResult.payload?.completedDayKeys,
      habitDays: habitResult.payload?.completedDayKeys
    });

    return res.json({
      date: todayKey,
      consistencyScore,
      allSectionsComplete,
      monkStreakDays,
      timezone: APP_TIMEZONE,
      serverNow: new Date().toISOString(),
      sections: {
        journal: {
          submittedToday: journalTodaySubmitted,
          score: journalScore,
          currentStreakDays: journalStreak
        },
        todo: {
          completedToday: todoCompletedToday,
          expectedToday: todoExpectedToday,
          score: todoScore,
          fullCompletionStreakDays: todoStreak
        },
        habit: {
          completedToday: habitCompletedToday,
          expectedToday: habitExpectedToday,
          score: habitScore,
          fullCompletionStreakDays: habitStreak
        }
      }
    });
  } catch (err) {
    console.error("getNavbarConsistency error:", err);
    return res.status(500).json({ message: "Failed to compute navbar consistency" });
  }
};
