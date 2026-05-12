import mongoose from "mongoose";

const journalWeeklySummarySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  weekStart: {
    type: String,
    required: true,
    match: /^\d{4}-\d{2}-\d{2}$/,
  },
  // Backward compatibility: some databases still have a legacy unique index
  // on (userId, weekId). Keep weekId mirrored with weekStart.
  weekId: {
    type: String,
    default: null,
    match: /^\d{4}-\d{2}-\d{2}$/,
  },
  aiSummary: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000,
  },
}, { timestamps: true });

journalWeeklySummarySchema.pre("validate", function syncLegacyWeekId(next) {
  if (!this.weekId && this.weekStart) this.weekId = this.weekStart;
  next();
});

journalWeeklySummarySchema.index({ userId: 1, weekStart: 1 }, { unique: true });

export default mongoose.model("JournalWeeklySummary", journalWeeklySummarySchema);
