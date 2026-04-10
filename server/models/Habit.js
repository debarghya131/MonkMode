import mongoose from "mongoose";

const habitSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  title: String,
  frequency: {
    type: String,
    enum: ["daily", "weekly"]
  }
}, { timestamps: true });

export default mongoose.model("Habit", habitSchema);