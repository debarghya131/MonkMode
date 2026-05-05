import mongoose from "mongoose";

const activityLogSchema = new mongoose.Schema({
  action: {
    type: String,
    enum: ["created", "edited", "deleted", "ended", "restored"],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  at: {
    type: Date,
    default: Date.now
  }
}, { _id: true });

const habitSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  title: { type: String, required: true },
  category: { type: String, default: "General" },
  priority: { type: String, enum: ["High", "Medium", "Low"], default: "Medium" },
  time: { type: String, default: "08:00" },
  pendingTime: { type: String, default: null },
  timeChangeEffectiveFrom: { type: Date, default: null },
  pendingDays: { type: [String], default: null },
  daysChangeEffectiveFrom: { type: Date, default: null },
  note: { type: String, default: "" },
  targetStreak: { type: Number, default: 21 },
  frequency: { type: String, enum: ["daily", "weekly"], default: "daily" },
  repeatType: { type: String, enum: ["daily", "weekdays", "weekend", "7days", "21days"], default: "daily" },
  timeOfDay: { type: String, enum: ["Morning", "Afternoon", "Evening", "Night"], default: null },
  startDate: { type: Date, default: null },
  days: { type: [String], default: [] },
  isImportant: { type: Boolean, default: false },
  endDate: { type: Date, default: null },
  deletedAt: { type: Date, default: null },
  archivedReason: { type: String, enum: ["ended", "deleted", null], default: null },
  activityLogs: { type: [activityLogSchema], default: [] }
}, { timestamps: true });

export default mongoose.model("Habit", habitSchema);
