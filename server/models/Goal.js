import mongoose from "mongoose";

const goalSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  title: String,
  targetValue: Number,
  currentValue: { type: Number, default: 0 },
  deadline: Date
}, { timestamps: true });

export default mongoose.model("Goal", goalSchema);