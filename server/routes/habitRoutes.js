import express from "express";
import {
  completeHabit,
  createHabit,
  deleteHabit,
  getHabits
} from "../controllers/habitController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.route("/").post(createHabit).get(getHabits);
router.post("/:id/complete", completeHabit);
router.delete("/:id", deleteHabit);

export default router;
