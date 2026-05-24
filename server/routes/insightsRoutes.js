import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { createRateLimiterChain } from "../middleware/rateLimit.js";
import { getInsightsSummary, getNavbarConsistency } from "../controllers/insightsController.js";
import { chatWithMing } from "../controllers/aiGuruController.js";

const router = express.Router();
const aiChatLimiter = createRateLimiterChain([
  {
    keyPrefix: "ai-chat",
    windowMs: Number(process.env.AI_CHAT_RATE_LIMIT_WINDOW_MS || 60_000),
    max: Number(process.env.AI_CHAT_RATE_LIMIT_MAX || 12),
    message: "Ming is receiving too many requests right now. Please pause and try again shortly.",
  },
  {
    keyPrefix: "ai-chat-daily",
    windowMs: Number(process.env.AI_CHAT_RATE_LIMIT_DAILY_WINDOW_MS || 86_400_000),
    max: Number(process.env.AI_CHAT_RATE_LIMIT_DAILY_MAX || 2),
    message: "You have reached the daily Ming request limit for this portfolio project. Please try again tomorrow.",
  },
]);

router.use(protect);

router.get("/consistency", getNavbarConsistency);
router.get("/summary", getInsightsSummary);
router.post(
  "/chat",
  aiChatLimiter,
  chatWithMing,
);

export default router;
