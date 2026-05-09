import mongoose from "mongoose";

const workoutPlanSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  title: { type: String, required: true, trim: true },
  goalType: { type: String, default: "" },
  workoutSplit: { type: String, default: "" },
  totalEstimatedTime: { type: String, default: "" },
  days: { type: [String], default: [] },
  startDate: { type: String, default: "" },
  neverEnds: { type: Boolean, default: true },
  endDate: { type: String, default: "" },
  difficulty: { type: String, default: "" },
  exercises: { type: [mongoose.Schema.Types.Mixed], default: [] },
  isActive: { type: Boolean, default: false },
  copiedFromId: { type: String, default: null },
}, { timestamps: true });

export default mongoose.model("WorkoutPlan", workoutPlanSchema);
