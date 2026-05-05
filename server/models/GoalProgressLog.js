import mongoose from "mongoose";

const goalProgressLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  goalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Goal",
    required: true
  },
  previousValue: {
    type: Number,
    default: 0
  },
  currentValue: {
    type: Number,
    required: true
  },
  delta: {
    type: Number,
    default: 0
  },
  completedGoal: {
    type: Boolean,
    default: false
  },
  date: {
    type: Date,
    default: Date.now
  }
});

goalProgressLogSchema.index({ userId: 1, date: -1 });
goalProgressLogSchema.index({ goalId: 1, date: -1 });

export default mongoose.model("GoalProgressLog", goalProgressLogSchema);
