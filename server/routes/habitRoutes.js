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

const router = express.Router();

router.use(protect);

router.get("/analysis", getHabitAnalysis);
router.get("/consistency", getHabitConsistency);
router.get("/heatmap", getHabitHeatmap);
router.get("/tracking", getHabitTracking);
router.route("/").post(createHabit).get(getHabits);
router.post("/:id/complete", completeHabit);
router.delete("/:id/complete", undoCompleteHabit);
router.patch("/:id/end", endHabit);
router.patch("/:id/restore", restoreHabit);
router.patch("/:id/important", toggleImportant);
router.patch("/:id", updateHabit);
router.delete("/:id", deleteHabit);

export default router;
