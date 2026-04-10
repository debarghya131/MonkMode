import mongoose from "mongoose";

const workoutSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  exercise: String,
  sets: Number,
  reps: Number,
  weight: Number,
  date: { type: Date, default: Date.now }
});

export default mongoose.model("Workout", workoutSchema);