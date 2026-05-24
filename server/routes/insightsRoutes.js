import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { createRateLimiter } from "../middleware/rateLimit.js";
import { getInsightsSummary, getNavbarConsistency } from "../controllers/insightsController.js";
import { chatWithMing } from "../controllers/aiGuruController.js";

const router = express.Router();

router.use(protect);

router.get("/consistency", getNavbarConsistency);
router.get("/summary", getInsightsSummary);
router.post(
  "/chat",
  createRateLimiter({
    keyPrefix: "ai-chat",
    windowMs: Number(process.env.AI_CHAT_RATE_LIMIT_WINDOW_MS || 60_000),
    max: Number(process.env.AI_CHAT_RATE_LIMIT_MAX || 12),
    message: "Ming is receiving too many requests right now. Please pause and try again shortly.",
  }),
  chatWithMing,
);

export default router;
