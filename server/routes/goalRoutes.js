import express from "express";
import {
  addGoalSubgoal,
  createGoal,
  deleteGoal,
  deleteGoalSubgoal,
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

const router = express.Router();

router.use(protect);

router.get("/heatmap", getGoalHeatmap);
router.get("/logs", getGoalLogs);
router.get("/summary", getGoalSummary);
router.route("/").post(createGoal).get(getGoals);
router.patch("/:id/important", toggleGoalImportant);
router.post("/:id/subgoals", addGoalSubgoal);
router.patch("/:id/subgoals/:subgoalId/progress", updateGoalSubgoalProgress);
router.delete("/:id/subgoals/:subgoalId", deleteGoalSubgoal);
router.patch("/:id/restore", restoreGoal);
router.patch("/:id", updateGoal);
router.patch("/:id/progress", updateGoalProgress);
router.delete("/:id", deleteGoal);

export default router;
