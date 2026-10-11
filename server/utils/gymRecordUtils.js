import { gymError } from "./gymMutationUtils.js";

export const MEASUREMENT_KEYS = [
  "bodyWeight", "chest", "upperChest", "lowerChest", "waist", "upperWaist",
  "lowerWaist", "shoulders", "neck", "hips", "armsBiceps", "leftArm", "rightArm",
  "forearms", "leftForearm", "rightForearm", "thighs", "leftThigh", "rightThigh",
  "calves", "leftCalf", "rightCalf", "ankle",
];

export function measurementFields(body = {}, previous = {}) {
  const fields = {};
  for (const key of MEASUREMENT_KEYS) {
    const value = Object.hasOwn(body, key) ? body[key] : previous[key];
    if (value == null || value === "") { fields[key] = ""; continue; }
    if (!["string", "number"].includes(typeof value)) throw gymError(400, `${key} must be a number`);
    const text = String(value).trim();
    if (!text) { fields[key] = ""; continue; }
    if (!/^\d+(?:\.\d+)?$/.test(text) || !Number.isFinite(Number(text)) || Number(text) <= 0 || Number(text) > 1000) {
      throw gymError(400, `${key} must be greater than 0 and at most 1000`);
    }
    fields[key] = text;
  }
  if (!Object.values(fields).some(Boolean)) throw gymError(400, "Add at least one measurement");
  return fields;
}

export const MAX_GALLERY_IMAGE_BYTES = 2 * 1024 * 1024;
export function validGalleryImage(value) {
  if (typeof value !== "string" || value.length > Math.ceil(MAX_GALLERY_IMAGE_BYTES / 3) * 4 + 64) return false;
  const match = /^data:(image\/(?:jpeg|jpg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match || match[2].length % 4 !== 0) return false;
  const bytes = Buffer.from(match[2], "base64");
  if (bytes.length > MAX_GALLERY_IMAGE_BYTES || bytes.toString("base64") !== match[2]) return false;
  if (match[1] === "image/png") return bytes.length >= 24 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) && bytes.subarray(12, 16).toString("ascii") === "IHDR";
  if (match[1] === "image/webp") return bytes.length >= 16 && bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP";
  return bytes.length >= 4 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
}
