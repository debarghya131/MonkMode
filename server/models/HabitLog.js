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

habitLogSchema.pre("validate", function normalizeDayKey() {
  if (!this.dayKey && this.date) {
    const day = new Date(this.date);
    day.setHours(0, 0, 0, 0);
    const year = day.getFullYear();
    const month = String(day.getMonth() + 1).padStart(2, "0");
    const date = String(day.getDate()).padStart(2, "0");
    this.dayKey = `${year}-${month}-${date}`;
  }
});

habitLogSchema.index(
  { habitId: 1, dayKey: 1 },
  { unique: true, partialFilterExpression: { dayKey: { $type: "string" } } }
);
habitLogSchema.index({ habitId: 1, completed: 1, dayKey: 1 });
habitLogSchema.index({ habitId: 1, completed: 1, date: 1 });
habitLogSchema.index({ date: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export default mongoose.model("HabitLog", habitLogSchema);
