import mongoose from "mongoose";

const gymMeasurementSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "User" },
  checkInDate: { type: String, required: true },
  bodyWeight: { type: String, default: "" },
  chest: { type: String, default: "" },
  upperChest: { type: String, default: "" },
  lowerChest: { type: String, default: "" },
  waist: { type: String, default: "" },
  upperWaist: { type: String, default: "" },
  lowerWaist: { type: String, default: "" },
  shoulders: { type: String, default: "" },
  neck: { type: String, default: "" },
  hips: { type: String, default: "" },
  armsBiceps: { type: String, default: "" },
  leftArm: { type: String, default: "" },
  rightArm: { type: String, default: "" },
  forearms: { type: String, default: "" },
  leftForearm: { type: String, default: "" },
  rightForearm: { type: String, default: "" },
  thighs: { type: String, default: "" },
  leftThigh: { type: String, default: "" },
  rightThigh: { type: String, default: "" },
  calves: { type: String, default: "" },
  leftCalf: { type: String, default: "" },
  rightCalf: { type: String, default: "" },
  ankle: { type: String, default: "" },
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

gymMeasurementSchema.index({ userId: 1, checkInDate: 1 }, { unique: true });
gymMeasurementSchema.index({ deletedAt: 1 }, { expireAfterSeconds: 48 * 60 * 60 });

export default mongoose.model("GymMeasurement", gymMeasurementSchema);
