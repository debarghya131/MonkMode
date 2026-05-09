import mongoose from "mongoose";

const gymGalleryImageSchema = new mongoose.Schema({
  src: {
    type: String,
    required: true
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  }
}, { _id: true });

const gymGalleryEntrySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },
  checkInDate: {
    type: Date,
    required: true,
    index: true
  },
  images: {
    type: [gymGalleryImageSchema],
    default: []
  }
}, { timestamps: true });

gymGalleryEntrySchema.index({ userId: 1, checkInDate: -1 }, { unique: true });

export default mongoose.model("GymGalleryEntry", gymGalleryEntrySchema);
