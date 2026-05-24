import express from "express";
import {
  createJournalEntry,
  deleteJournalEntry,
  getJournalAnalysis,
  getJournalCustomFields,
  getJournalEntryById,
  getJournalEntries,
  getJournalHeatmap,
  getJournalSummary,
  replaceJournalCustomFields,
  updateJournalEntry
} from "../controllers/journalController.js";
import { protect } from "../middleware/authMiddleware.js";
import { createRateLimiter } from "../middleware/rateLimit.js";

const router = express.Router();
const journalSaveLimiter = createRateLimiter({
  keyPrefix: "journal-save-write-daily",
  windowMs: Number(process.env.JOURNAL_SAVE_RATE_LIMIT_DAILY_WINDOW_MS || 86_400_000),
  max: Number(process.env.JOURNAL_SAVE_RATE_LIMIT_DAILY_MAX || 2),
  message: "You have reached the daily journal save limit for this portfolio project. Please try again tomorrow.",
});

router.use(protect);

router.get("/heatmap", getJournalHeatmap);
router.get("/summary", getJournalSummary);
router.get("/analysis", getJournalAnalysis);
router.route("/custom-fields").get(getJournalCustomFields).put(journalSaveLimiter, replaceJournalCustomFields);
router.route("/").post(journalSaveLimiter, createJournalEntry).get(getJournalEntries);
router.route("/:id").get(getJournalEntryById).patch(journalSaveLimiter, updateJournalEntry).delete(journalSaveLimiter, deleteJournalEntry);

export default router;
