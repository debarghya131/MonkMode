import mongoose from "mongoose";

const journalSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  content: String,
  mood: {
    type: String,
    enum: ["happy", "sad", "neutral"]
  },
  date: { type: Date, default: Date.now }
});

export default mongoose.model("Journal", journalSchema);