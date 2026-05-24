import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { createRateLimiter } from "../middleware/rateLimit.js";
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
const aiSummaryLimiter = createRateLimiter({
  keyPrefix: "weekly-ai-summary",
  windowMs: Number(process.env.WEEKLY_AI_RATE_LIMIT_WINDOW_MS || 60_000),
  max: Number(process.env.WEEKLY_AI_RATE_LIMIT_MAX || 12),
  message: "Weekly AI summaries are being requested too quickly. Please try again in a moment.",
});

router.use(protect);

// General weeks list (all modules share the same week grid)
router.get("/weeks", getWeeksList);

// Habit
router.get("/habits/summaries", getHabitSummaries);
router.get("/habits/ai-summary", aiSummaryLimiter, generateHabitAiSummary);
router.get("/habits", getHabitWeeklyReport);

// Todo
router.get("/todos/summaries", getTodoSummaries);
router.get("/todos/ai-summary", aiSummaryLimiter, generateTodoAiSummary);
router.get("/todos", getTodoWeeklyReport);

// Journal — detailed stats for one week
router.get("/journal", getJournalWeeklyReport);
// Journal — list of past weekly summaries (right-panel week picker)
router.get("/journal/summaries", getJournalSummaries);
// Journal — missed days for a week (defaults to current week)
router.get("/journal/missed-days", getMissedJournalDays);
// Journal — save reason for a missed day
router.post("/journal/missed-reason", saveJournalMissedReason);
// Journal — generate Little Monk's AI analysis for a week
router.get("/journal/ai-summary", aiSummaryLimiter, generateJournalAiSummary);

// Goals
router.get("/goals/summaries", getGoalSummaries);
router.get("/goals/ai-summary", aiSummaryLimiter, generateGoalAiSummary);
router.get("/goals", getGoalWeeklyReport);

// Gym
router.get("/gym/summaries", getGymSummaries);
router.get("/gym/ai-summary", aiSummaryLimiter, generateGymAiSummary);
router.get("/gym", getGymWeeklyReport);

export default router;
