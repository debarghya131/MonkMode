import mongoose from "mongoose";

const todoSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  title: String,
  completed: { type: Boolean, default: false },
  date: Date
}, { timestamps: true });

export default mongoose.model("Todo", todoSchema);