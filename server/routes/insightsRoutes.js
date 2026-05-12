import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { getInsightsSummary, getNavbarConsistency } from "../controllers/insightsController.js";
import { chatWithMing } from "../controllers/aiGuruController.js";

const router = express.Router();

router.use(protect);

router.get("/consistency", getNavbarConsistency);
router.get("/summary", getInsightsSummary);
router.post("/chat", chatWithMing);

export default router;
