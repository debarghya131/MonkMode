import mongoose from "mongoose";

const gymExerciseProgressSchema = new mongoose.Schema({
  userId:          { type: mongoose.Schema.Types.ObjectId, required: true },
  date:            { type: String, required: true },
  exerciseId:      { type: String, required: true },
  exerciseName:    { type: String, default: "" },
  bodyPart:        { type: String, default: "" },
  sets:            { type: String, default: "" },
  reps:            { type: String, default: "" },
  weight:          { type: String, default: "" },
  lastSetReps:     { type: String, default: "" },
  lastSetWeight:   { type: String, default: "" },
  repsBreakdown:   { type: [String], default: [] },
  totalTime:       { type: String, default: "" },
  restBetweenSets: { type: String, default: "" },
  notes:           { type: String, default: "" },
}, { timestamps: true });

gymExerciseProgressSchema.index({ userId: 1, date: 1, exerciseId: 1 }, { unique: true });
gymExerciseProgressSchema.index({ userId: 1, exerciseId: 1 });
gymExerciseProgressSchema.index({ userId: 1, date: -1, updatedAt: -1 });
gymExerciseProgressSchema.index({ userId: 1, bodyPart: 1, date: -1 });

export default mongoose.model("GymExerciseProgress", gymExerciseProgressSchema);
