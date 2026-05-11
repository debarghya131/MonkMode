import express from "express";
import { protect } from "../middleware/authMiddleware.js";
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
  getGoalWeeklyReport,
  getGymWeeklyReport,
} from "../controllers/weeklyReportController.js";

const router = express.Router();

router.use(protect);

// General weeks list (all modules share the same week grid)
router.get("/weeks", getWeeksList);

// Habit
router.get("/habits/summaries", getHabitSummaries);
router.get("/habits/ai-summary", generateHabitAiSummary);
router.get("/habits", getHabitWeeklyReport);

// Todo
router.get("/todos/summaries", getTodoSummaries);
router.get("/todos/ai-summary", generateTodoAiSummary);
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
router.get("/journal/ai-summary", generateJournalAiSummary);

// Goals
router.get("/goals", getGoalWeeklyReport);

// Gym
router.get("/gym", getGymWeeklyReport);

export default router;
