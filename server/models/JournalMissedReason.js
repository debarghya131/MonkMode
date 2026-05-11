import mongoose from "mongoose";

const journalMissedReasonSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  dayKey: {
    type: String,
    required: true,
    match: /^\d{4}-\d{2}-\d{2}$/,
  },
  reason: {
    type: String,
    default: "",
    trim: true,
    maxlength: 1000,
  },
}, { timestamps: true });

journalMissedReasonSchema.index({ userId: 1, dayKey: 1 }, { unique: true });

export default mongoose.model("JournalMissedReason", journalMissedReasonSchema);
