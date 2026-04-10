import express from "express";
import {
  createWorkout,
  deleteWorkout,
  getWorkouts
} from "../controllers/gymController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.route("/").post(createWorkout).get(getWorkouts);
router.delete("/:id", deleteWorkout);

export default router;
