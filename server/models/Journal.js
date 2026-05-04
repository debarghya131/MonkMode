import mongoose from "mongoose";

const customFieldSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, default: "", trim: true, maxlength: 400 },
  answer: { type: String, required: true, trim: true, maxlength: 5000 }
}, { _id: false });

const journalSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  dayKey: {
    type: String,
    required: true,
    match: /^\d{4}-\d{2}-\d{2}$/
  },
  content: { type: String, default: "", trim: true, maxlength: 10000 },
  mood: {
    type: String,
    enum: [
      "happy", "sad", "neutral",
      "Motivated", "Happy", "Calm", "Neutral", "Sad", "Anxious", "Focused", "Tired",
      "Excited", "Grateful", "Inspired", "Frustrated", "Overwhelmed", "Strong", "Peaceful",
      "Bored", "Confident", "Curious", "Emotional", "Content"
    ],
    default: "neutral"
  },
  wakeUpTime: { type: String, default: "", match: /^(|(?:[01]\d|2[0-3]):[0-5]\d)$/ },
  sleepTime: { type: String, default: "", match: /^(|(?:[01]\d|2[0-3]):[0-5]\d)$/ },
  energyLevel: { type: Number, min: 1, max: 100, default: 50 },
  overallRating: { type: Number, min: 1, max: 100, default: 50 },
  summary: { type: String, default: "", trim: true, maxlength: 5000 },
  insight: { type: String, default: "", trim: true, maxlength: 5000 },
  affirmation: { type: String, default: "", trim: true, maxlength: 1000 },
  tomorrowPlan: { type: String, default: "", trim: true, maxlength: 5000 },
  wins: { type: [String], default: [] },
  mistakes: { type: [String], default: [] },
  gratitude: { type: [String], default: [] },
  achievement: { type: [String], default: [] },
  distractions: { type: [String], default: [] },
  customFields: { type: [customFieldSchema], default: [] },
  date: { type: Date, default: Date.now, index: true }
}, { timestamps: true });

journalSchema.pre("validate", function normalizeDayKey() {
  if (!this.date) this.date = new Date();
  if (!this.dayKey && this.date) {
    const day = new Date(this.date);
    day.setHours(0, 0, 0, 0);
    const year = day.getFullYear();
    const month = String(day.getMonth() + 1).padStart(2, "0");
    const date = String(day.getDate()).padStart(2, "0");
    this.dayKey = `${year}-${month}-${date}`;
  }
});

journalSchema.index({ userId: 1, dayKey: 1 }, { unique: true });
journalSchema.index({ userId: 1, date: -1 });
journalSchema.index({ userId: 1, mood: 1, date: -1 });

export default mongoose.model("Journal", journalSchema);
