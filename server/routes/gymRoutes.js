import express from "express";
import {
  createWorkout,
  deleteWorkout,
  getGymHeatmap,
  getWorkouts
} from "../controllers/gymController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.get("/heatmap", getGymHeatmap);
router.route("/").post(createWorkout).get(getWorkouts);
router.delete("/:id", deleteWorkout);

export default router;
