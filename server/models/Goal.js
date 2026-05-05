import mongoose from "mongoose";

const goalActivityLogSchema = new mongoose.Schema({
  action: {
    type: String,
    enum: [
      "created",
      "edited",
      "deleted",
      "restored",
      "ended",
      "progress_updated",
      "important_toggled",
      "subgoal_added",
      "subgoal_updated",
      "subgoal_completed",
      "subgoal_reopened",
      "subgoal_deleted"
    ],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  subgoalId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  at: {
    type: Date,
    default: Date.now
  }
}, { _id: true });

const goalSubgoalSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 180
  },
  deadline: {
    type: Date,
    required: true
  },
  completed: {
    type: Boolean,
    default: false
  },
  completedAt: {
    type: Date,
    default: null
  }
}, { _id: true, timestamps: true });

const goalSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 180
  },
  description: {
    type: String,
    default: "",
    trim: true,
    maxlength: 2500
  },
  goalType: {
    type: String,
    enum: ["short-term", "long-term"],
    default: "short-term"
  },
  priority: {
    type: String,
    enum: ["High", "Medium", "Low"],
    default: "Medium"
  },
  startDate: {
    type: Date,
    default: null,
    index: true
  },
  deadline: {
    type: Date,
    default: null,
    index: true
  },
  targetValue: {
    type: Number,
    default: 100,
    min: 0
  },
  currentValue: {
    type: Number,
    default: 0,
    min: 0
  },
  isImportant: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date,
    default: null
  },
  archivedReason: {
    type: String,
    enum: ["deleted", null],
    default: null
  },
  subgoals: {
    type: [goalSubgoalSchema],
    default: []
  },
  activityLogs: {
    type: [goalActivityLogSchema],
    default: []
  }
}, { timestamps: true });

goalSchema.index({ userId: 1, createdAt: -1 });
goalSchema.index({ userId: 1, deadline: 1 });
goalSchema.index({ userId: 1, deletedAt: 1, deadline: 1 });
goalSchema.index({ userId: 1, "activityLogs.action": 1, "activityLogs.at": -1 });

export default mongoose.model("Goal", goalSchema);
