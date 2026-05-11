import mongoose from "mongoose";

const goalWeeklySummarySchema = new mongoose.Schema({
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
  aiSummary: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000,
  },
}, { timestamps: true });

goalWeeklySummarySchema.index({ userId: 1, weekStart: 1 }, { unique: true });

export default mongoose.model("GoalWeeklySummary", goalWeeklySummarySchema);
