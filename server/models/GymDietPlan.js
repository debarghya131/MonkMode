import mongoose from "mongoose";

const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DIET_PLAN_TYPES = ["diet", "workoutNutrition", "supplements", "macros"];

const mealEntrySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 180
  },
  time: {
    type: String,
    default: "",
    match: /^(|(?:[01]\d|2[0-3]):[0-5]\d)$/
  }
}, { _id: true });

const mealGroupsSchema = new mongoose.Schema({
  morning: { type: [mealEntrySchema], default: [] },
  breakfast: { type: [mealEntrySchema], default: [] },
  lunch: { type: [mealEntrySchema], default: [] },
  evening: { type: [mealEntrySchema], default: [] },
  dinner: { type: [mealEntrySchema], default: [] },
  preWorkout: { type: [mealEntrySchema], default: [] },
  postWorkout: { type: [mealEntrySchema], default: [] }
}, { _id: false });

const macroValuesSchema = new mongoose.Schema({
  protein: { type: String, default: "" },
  carbs: { type: String, default: "" },
  fats: { type: String, default: "" },
  fiber: { type: String, default: "" },
  calories: { type: String, default: "" },
  water: { type: String, default: "" },
  sugar: { type: String, default: "" },
  sodium: { type: String, default: "" }
}, { _id: false });

const gymDietPlanSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },
  planType: {
    type: String,
    enum: DIET_PLAN_TYPES,
    required: true,
    index: true
  },
  day: {
    type: String,
    enum: WEEK_DAYS,
    required: true,
    index: true
  },
  isActive: {
    type: Boolean,
    default: false
  },
  copiedFromId: {
    type: String,
    default: null
  },
  meals: {
    type: mealGroupsSchema,
    default: () => ({})
  },
  items: {
    type: [mealEntrySchema],
    default: []
  },
  values: {
    type: macroValuesSchema,
    default: () => ({})
  }
}, { timestamps: true });

gymDietPlanSchema.index({ userId: 1, planType: 1, createdAt: -1 });
gymDietPlanSchema.index({ userId: 1, planType: 1, day: 1, isActive: 1 });

export default mongoose.model("GymDietPlan", gymDietPlanSchema);
