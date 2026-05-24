import mongoose from "mongoose";

const journalCustomFieldTemplateSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, default: "", trim: true, maxlength: 400 }
}, { _id: false });

const userSchema = new mongoose.Schema({
  clerkId: { type: String, unique: true, sparse: true, index: true },
  name: String,
  email: { type: String, unique: true },
  password: String,
  journalCustomFieldTemplates: {
    type: [journalCustomFieldTemplateSchema],
    default: []
  }
}, { timestamps: true });

export default mongoose.model("User", userSchema);
