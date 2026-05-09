import mongoose from "mongoose";

const todoLogSchema = new mongoose.Schema({
  todoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Todo",
    default: null,
    index: true
  },
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
  date: {
    type: String,
    default: ""
  },
  time: {
    type: String,
    default: ""
  },
  action: {
    type: String,
    enum: ["created", "edited", "deleted", "restored", "ended"],
    default: "created"
  }
}, { timestamps: true });

todoLogSchema.index({ userId: 1, createdAt: -1 });
todoLogSchema.index({ userId: 1, todoId: 1, createdAt: -1 });
todoLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export default mongoose.model("TodoLog", todoLogSchema);
