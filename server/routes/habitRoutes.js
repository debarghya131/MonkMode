import express from "express";
import {
  completeHabit,
  createHabit,
  deleteHabit,
  endHabit,
  getHabitHeatmap,
  getHabits
} from "../controllers/habitController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.get("/heatmap", getHabitHeatmap);
router.route("/").post(createHabit).get(getHabits);
router.post("/:id/complete", completeHabit);
router.patch("/:id/end", endHabit);
router.delete("/:id", deleteHabit);

export default router;
