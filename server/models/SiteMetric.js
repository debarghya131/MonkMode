import mongoose from "mongoose";

const siteMetricSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  count: {
    type: Number,
    required: true,
    default: 0,
    min: 0,
  },
}, { timestamps: true });

export default mongoose.model("SiteMetric", siteMetricSchema);
