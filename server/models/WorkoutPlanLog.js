import mongoose from "mongoose";

const workoutPlanLogSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  planId:    { type: String, default: "" },
  planTitle: { type: String, required: true, trim: true },
  action:    { type: String, required: true },
  note:      { type: String, default: "" },
  date:      { type: String, required: true },
  time:      { type: String, required: true },
  deletedItem: { type: mongoose.Schema.Types.Mixed, default: null },
  restoredFromLogId: { type: String, default: "" },
}, { timestamps: true });

workoutPlanLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export default mongoose.model("WorkoutPlanLog", workoutPlanLogSchema);
