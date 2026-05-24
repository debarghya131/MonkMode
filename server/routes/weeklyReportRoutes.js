import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { createRateLimiterChain } from "../middleware/rateLimit.js";
import {
  getWeeksList,
  getHabitSummaries,
  getHabitWeeklyReport,
  generateHabitAiSummary,
  getTodoSummaries,
  getTodoWeeklyReport,
  getJournalWeeklyReport,
  getJournalSummaries,
  getMissedJournalDays,
  saveJournalMissedReason,
  generateJournalAiSummary,
  generateTodoAiSummary,
  getGoalSummaries,
  getGoalWeeklyReport,
  generateGoalAiSummary,
  getGymWeeklyReport,
  getGymSummaries,
  generateGymAiSummary,
} from "../controllers/weeklyReportController.js";

const router = express.Router();
const createWeeklyAiSummaryLimiter = (sectionKey, dailyMaxEnvName) =>
  createRateLimiterChain([
    {
      keyPrefix: `weekly-ai-summary-${sectionKey}`,
      windowMs: Number(process.env.WEEKLY_AI_RATE_LIMIT_WINDOW_MS || 60_000),
      max: Number(process.env.WEEKLY_AI_RATE_LIMIT_MAX || 12),
      message: "Weekly AI summaries are being requested too quickly. Please try again in a moment.",
    },
    {
      keyPrefix: `weekly-ai-summary-${sectionKey}-daily`,
      windowMs: Number(process.env.WEEKLY_AI_RATE_LIMIT_DAILY_WINDOW_MS || 86_400_000),
      max: Number(process.env[dailyMaxEnvName] || 2),
      message: "You have reached the daily weekly-summary AI limit for this section of the portfolio project. Please try again tomorrow.",
    },
  ]);
const habitAiSummaryLimiter = createWeeklyAiSummaryLimiter("habits", "HABIT_WEEKLY_AI_RATE_LIMIT_DAILY_MAX");
const todoAiSummaryLimiter = createWeeklyAiSummaryLimiter("todos", "TODO_WEEKLY_AI_RATE_LIMIT_DAILY_MAX");
const journalAiSummaryLimiter = createWeeklyAiSummaryLimiter("journal", "JOURNAL_WEEKLY_AI_RATE_LIMIT_DAILY_MAX");
const goalAiSummaryLimiter = createWeeklyAiSummaryLimiter("goals", "GOAL_WEEKLY_AI_RATE_LIMIT_DAILY_MAX");
const gymAiSummaryLimiter = createWeeklyAiSummaryLimiter("gym", "GYM_WEEKLY_AI_RATE_LIMIT_DAILY_MAX");
const journalMissedReasonLimiter = createRateLimiterChain([
  {
    keyPrefix: "journal-missed-reason-write",
    windowMs: Number(process.env.JOURNAL_MISSED_REASON_RATE_LIMIT_WINDOW_MS || 60_000),
    max: Number(process.env.JOURNAL_MISSED_REASON_RATE_LIMIT_MAX || 20),
    message: "Missed-day reasons are being submitted too quickly. Please wait a moment and try again.",
  },
  {
    keyPrefix: "journal-missed-reason-write-daily",
    windowMs: Number(process.env.JOURNAL_MISSED_REASON_RATE_LIMIT_DAILY_WINDOW_MS || 86_400_000),
    max: Number(process.env.JOURNAL_MISSED_REASON_RATE_LIMIT_DAILY_MAX || 1),
    message: "You have reached the daily missed-day reason limit for this portfolio project. Please try again tomorrow.",
  },
]);

router.use(protect);

// General weeks list (all modules share the same week grid)
router.get("/weeks", getWeeksList);

// Habit
router.get("/habits/summaries", getHabitSummaries);
router.get("/habits/ai-summary", habitAiSummaryLimiter, generateHabitAiSummary);
router.get("/habits", getHabitWeeklyReport);

// Todo
router.get("/todos/summaries", getTodoSummaries);
router.get("/todos/ai-summary", todoAiSummaryLimiter, generateTodoAiSummary);
router.get("/todos", getTodoWeeklyReport);

// Journal — detailed stats for one week
router.get("/journal", getJournalWeeklyReport);
// Journal — list of past weekly summaries (right-panel week picker)
router.get("/journal/summaries", getJournalSummaries);
// Journal — missed days for a week (defaults to current week)
router.get("/journal/missed-days", getMissedJournalDays);
// Journal — save reason for a missed day
router.post("/journal/missed-reason", journalMissedReasonLimiter, saveJournalMissedReason);
// Journal — generate Little Monk's AI analysis for a week
router.get("/journal/ai-summary", journalAiSummaryLimiter, generateJournalAiSummary);

// Goals
router.get("/goals/summaries", getGoalSummaries);
router.get("/goals/ai-summary", goalAiSummaryLimiter, generateGoalAiSummary);
router.get("/goals", getGoalWeeklyReport);

// Gym
router.get("/gym/summaries", getGymSummaries);
router.get("/gym/ai-summary", gymAiSummaryLimiter, generateGymAiSummary);
router.get("/gym", getGymWeeklyReport);

export default router;
