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
  },
  endDate: {
    type: Date,
    default: null
  },
  deletedAt: {
    type: Date,
    default: null
  },
  archivedReason: {
    type: String,
    enum: ["ended", "deleted", null],
    default: null
  }
}, { timestamps: true });

export default mongoose.model("Habit", habitSchema);
