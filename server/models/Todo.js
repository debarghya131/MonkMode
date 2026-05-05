import mongoose from "mongoose";

const DAY_KEYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const dayStatusSchema = new mongoose.Schema({
  dayKey: {
    type: String,
    required: true,
    match: /^\d{4}-\d{2}-\d{2}$/
  },
  status: {
    type: String,
    enum: ["pending", "completed", "missed"],
    required: true
  },
  completedAt: {
    type: String,
    default: ""
  },
  lateCompleted: {
    type: Boolean,
    default: false
  }
}, { _id: false });

const todoSchema = new mongoose.Schema({
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
  category: {
    type: String,
    default: "Others",
    trim: true,
    maxlength: 80
  },
  priority: {
    type: String,
    enum: ["High", "Medium", "Low"],
    default: "Medium"
  },
  repeatType: {
    type: String,
    enum: ["once", "daily", "weekdays", "weekend"],
    default: "once"
  },
  days: {
    type: [String],
    default: [],
    validate: {
      validator: (value) => Array.isArray(value) && value.every((day) => DAY_KEYS.includes(day)),
      message: "days must contain valid weekday keys"
    }
  },
  startDate: {
    type: Date,
    index: true
  },
  endDate: {
    type: Date,
    default: null,
    index: true
  },
  neverEnds: {
    type: Boolean,
    default: true
  },
  time: {
    type: String,
    default: "",
    match: /^(|(?:[01]\d|2[0-3]):[0-5]\d)$/
  },
  pendingTime: {
    type: String,
    default: "",
    match: /^(|(?:[01]\d|2[0-3]):[0-5]\d)$/
  },
  timeChangeEffectiveFrom: {
    type: Date,
    default: null
  },
  pendingDays: {
    type: [String],
    default: [],
    validate: {
      validator: (value) => Array.isArray(value) && value.every((day) => DAY_KEYS.includes(day)),
      message: "pendingDays must contain valid weekday keys"
    }
  },
  daysChangeEffectiveFrom: {
    type: Date,
    default: null
  },
  deletedAt: { type: Date, default: null },
  completed: { type: Boolean, default: false },
  date: Date,
  dayStates: {
    type: [dayStatusSchema],
    default: []
  }
}, { timestamps: true });

todoSchema.index({ userId: 1, date: -1 });
todoSchema.index({ userId: 1, startDate: -1 });
todoSchema.index({ userId: 1, repeatType: 1 });
todoSchema.index({ userId: 1, priority: 1, createdAt: -1 });

export default mongoose.model("Todo", todoSchema);
