import express from "express";
import {
  createJournalEntry,
  deleteJournalEntry,
  getJournalEntries,
  getJournalHeatmap
} from "../controllers/journalController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.get("/heatmap", getJournalHeatmap);
router.route("/").post(createJournalEntry).get(getJournalEntries);
router.delete("/:id", deleteJournalEntry);

export default router;
