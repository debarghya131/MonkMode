import mongoose from "mongoose";

const siteVisitorSchema = new mongoose.Schema({
  visitorId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 16,
    maxlength: 120,
  },
}, { timestamps: true });

export default mongoose.model("SiteVisitor", siteVisitorSchema);
