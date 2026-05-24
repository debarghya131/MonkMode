import express from "express";
import {
  addGoalSubgoal,
  createGoal,
  deleteGoal,
  deleteGoalSubgoal,
  getGoalAnalysis,
  getGoalHeatmap,
  getGoalLogs,
  getGoalSummary,
  getGoals,
  restoreGoal,
  toggleGoalImportant,
  updateGoal,
  updateGoalSubgoalProgress,
  updateGoalProgress
} from "../controllers/goalController.js";
import { protect } from "../middleware/authMiddleware.js";
import { createRateLimiter } from "../middleware/rateLimit.js";

const router = express.Router();
const goalWriteLimiter = createRateLimiter({
  keyPrefix: "goal-write-daily",
  windowMs: Number(process.env.GOAL_WRITE_RATE_LIMIT_DAILY_WINDOW_MS || 86_400_000),
  max: Number(process.env.GOAL_WRITE_RATE_LIMIT_DAILY_MAX || 5),
  message: "You have reached the daily goal update limit for this portfolio project. Please try again tomorrow.",
});

router.use(protect);

router.get("/analysis", getGoalAnalysis);
router.get("/heatmap", getGoalHeatmap);
router.get("/logs", getGoalLogs);
router.get("/summary", getGoalSummary);
router.route("/").post(goalWriteLimiter, createGoal).get(getGoals);
router.patch("/:id/important", goalWriteLimiter, toggleGoalImportant);
router.post("/:id/subgoals", goalWriteLimiter, addGoalSubgoal);
router.patch("/:id/subgoals/:subgoalId/progress", goalWriteLimiter, updateGoalSubgoalProgress);
router.delete("/:id/subgoals/:subgoalId", goalWriteLimiter, deleteGoalSubgoal);
router.patch("/:id/restore", goalWriteLimiter, restoreGoal);
router.patch("/:id", goalWriteLimiter, updateGoal);
router.patch("/:id/progress", goalWriteLimiter, updateGoalProgress);
router.delete("/:id", goalWriteLimiter, deleteGoal);

export default router;
