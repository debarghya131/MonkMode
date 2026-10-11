import mongoose from "mongoose";
import User from "../models/User.js";

export const gymError = (status, message) => Object.assign(new Error(message), { status });

export function validGymDay(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function requestedGymActive(body, current) {
  if (!Object.prototype.hasOwnProperty.call(body || {}, "isActive")) return !current;
  if (typeof body.isActive !== "boolean") throw gymError(400, "isActive must be a boolean");
  return body.isActive;
}

// Atlas/replica-set transactions roll back the target, overlapping plans and
// the response snapshot together. The per-user fence also prevents two tabs
// from activating different plans against the same empty snapshot.
export const gymMutation = (userId, task) => mongoose.connection.transaction(async session => {
  const result = await User.updateOne({ _id: userId }, { $inc: { gymMutationVersion: 1 } }, { session });
  if (!result.matchedCount) throw gymError(404, "User not found");
  return task(session);
});
