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

export default mongoose.model("GoalProgressLog", goalProgressLogSchema);
