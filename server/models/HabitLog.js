import mongoose from "mongoose";

const habitLogSchema = new mongoose.Schema({
  habitId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Habit"
  },
  dayKey: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  completed: {
    type: Boolean,
    default: true
  }
});

habitLogSchema.pre("validate", function normalizeDayKey(next) {
  if (!this.dayKey && this.date) {
    const day = new Date(this.date);
    day.setUTCHours(0, 0, 0, 0);
    this.dayKey = day.toISOString().slice(0, 10);
  }
  next();
});

habitLogSchema.index(
  { habitId: 1, dayKey: 1 },
  { unique: true, partialFilterExpression: { dayKey: { $type: "string" } } }
);
habitLogSchema.index({ habitId: 1, completed: 1, dayKey: 1 });
habitLogSchema.index({ habitId: 1, completed: 1, date: 1 });

export default mongoose.model("HabitLog", habitLogSchema);
