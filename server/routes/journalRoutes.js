import express from "express";
import {
  createJournalEntry,
  deleteJournalEntry,
  getJournalCustomFields,
  getJournalEntryById,
  getJournalEntries,
  getJournalHeatmap,
  getJournalSummary,
  replaceJournalCustomFields,
  updateJournalEntry
} from "../controllers/journalController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.get("/heatmap", getJournalHeatmap);
router.get("/summary", getJournalSummary);
router.route("/custom-fields").get(getJournalCustomFields).put(replaceJournalCustomFields);
router.route("/").post(createJournalEntry).get(getJournalEntries);
router.route("/:id").get(getJournalEntryById).patch(updateJournalEntry).delete(deleteJournalEntry);

export default router;
