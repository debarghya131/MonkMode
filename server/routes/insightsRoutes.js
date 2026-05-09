import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { getInsightsSummary } from "../controllers/insightsController.js";

const router = express.Router();

router.use(protect);

router.get("/summary", getInsightsSummary);

export default router;
