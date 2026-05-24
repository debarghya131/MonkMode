import express from "express";
import {
  completeHabit,
  createHabit,
  deleteHabit,
  endHabit,
  getHabitAnalysis,
  getHabitConsistency,
  getHabitHeatmap,
  getHabitTracking,
  getHabits,
  restoreHabit,
  toggleImportant,
  undoCompleteHabit,
  updateHabit
} from "../controllers/habitController.js";
import { protect } from "../middleware/authMiddleware.js";
import { createRateLimiter } from "../middleware/rateLimit.js";

const router = express.Router();
const habitWriteLimiter = createRateLimiter({
  keyPrefix: "habit-write-daily",
  windowMs: Number(process.env.HABIT_WRITE_RATE_LIMIT_DAILY_WINDOW_MS || 86_400_000),
  max: Number(process.env.HABIT_WRITE_RATE_LIMIT_DAILY_MAX || 5),
  message: "You have reached the daily habit update limit for this portfolio project. Please try again tomorrow.",
});

router.use(protect);

router.get("/analysis", getHabitAnalysis);
router.get("/consistency", getHabitConsistency);
router.get("/heatmap", getHabitHeatmap);
router.get("/tracking", getHabitTracking);
router.route("/").post(habitWriteLimiter, createHabit).get(getHabits);
router.post("/:id/complete", habitWriteLimiter, completeHabit);
router.delete("/:id/complete", habitWriteLimiter, undoCompleteHabit);
router.patch("/:id/end", habitWriteLimiter, endHabit);
router.patch("/:id/restore", habitWriteLimiter, restoreHabit);
router.patch("/:id/important", habitWriteLimiter, toggleImportant);
router.patch("/:id", habitWriteLimiter, updateHabit);
router.delete("/:id", habitWriteLimiter, deleteHabit);

export default router;
