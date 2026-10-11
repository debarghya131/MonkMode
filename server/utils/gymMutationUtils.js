import mongoose from "mongoose";
import User from "../models/User.js";

export const gymError = (status, message) => Object.assign(new Error(message), { status });

export function checkGymRevision(record, body) {
  const expected = body?.expectedUpdatedAt;
  if (expected === undefined) return;
  if (typeof expected !== "string" || !Number.isFinite(Date.parse(expected))) throw gymError(400, "expectedUpdatedAt must be a valid timestamp");
  if (!record.updatedAt || Date.parse(expected) !== new Date(record.updatedAt).getTime()) throw gymError(409, "This Gym record changed in another request. Reload Gym before trying again.");
}
export async function saveGymRecord(record, body, session) {
  checkGymRevision(record, body);
  if (record.updatedAt) record.updatedAt = new Date(Math.max(Date.now(), new Date(record.updatedAt).getTime() + 1));
  await record.save({ session, ...(record.updatedAt ? { timestamps: false } : {}) });
}
export function gymFailure(res, error) {
  if ([400, 404, 409, 410].includes(error.status)) return res.status(error.status).json({ message: error.message });
  if (error.code === 11000 || ["VersionError", "DocumentNotFoundError"].includes(error.name)) return res.status(409).json({ message: "This Gym record changed or already exists. Reload Gym before trying again." });
  if (["ValidationError", "CastError"].includes(error.name)) return res.status(400).json({ message: "Invalid Gym values. Please check the form." });
  return res.status(500).json({ message: "The Gym request could not be confirmed. Reload Gym before trying again." });
}

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
