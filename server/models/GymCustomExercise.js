import mongoose from "mongoose";

const gymCustomExerciseSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 180
  },
  bodyGroup: {
    type: String,
    required: true,
    trim: true,
    maxlength: 80
  },
  bodySection: {
    type: String,
    default: "",
    trim: true,
    maxlength: 80
  },
  bodyPart: {
    type: String,
    required: true,
    trim: true,
    maxlength: 180
  }
}, { timestamps: true });

gymCustomExerciseSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model("GymCustomExercise", gymCustomExerciseSchema);
