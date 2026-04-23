import express from "express";
import {
  createGoal,
  deleteGoal,
  getGoalHeatmap,
  getGoals,
  updateGoalProgress
} from "../controllers/goalController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.get("/heatmap", getGoalHeatmap);
router.route("/").post(createGoal).get(getGoals);
router.patch("/:id/progress", updateGoalProgress);
router.delete("/:id", deleteGoal);

export default router;
