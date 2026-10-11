import { validReportDay } from "../../../../shared/journalWeeklyStats.js";
import { gymDay, gymWeekday } from "./gymUtils.js";

const object = value => Boolean(value && typeof value === "object" && !Array.isArray(value));
const text = value => typeof value === "string";
const optional = (value, check) => value === undefined || check(value);
const scalar = value => text(value) || (typeof value === "number" && Number.isFinite(value));
const timestamp = value => text(value) && Number.isFinite(Date.parse(value));
const date = value => value === "" || validReportDay(value);
const id = value => object(value) && text(value.id) && Boolean(value.id.trim());
const unique = values => new Set(values).size === values.length;
const rows = (value, check) => Array.isArray(value) && value.every(check) && unique(value.map(row => row.id));
const days = new Set(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
const progressKeys = ["sets", "reps", "weight", "lastSetReps", "lastSetWeight", "totalTime", "restBetweenSets", "notes"];
export const measurementKeys = ["bodyWeight", "chest", "upperChest", "lowerChest", "waist", "upperWaist", "lowerWaist", "shoulders", "neck", "hips", "armsBiceps", "leftArm", "rightArm", "forearms", "leftForearm", "rightForearm", "thighs", "leftThigh", "rightThigh", "calves", "leftCalf", "rightCalf", "ankle"];
const macros = ["protein", "carbs", "fats", "fiber", "calories", "water", "sugar", "sodium"];
const planTypes = ["diet", "workoutNutrition", "supplements", "macros"];
const mealSections = type => type === "diet" ? ["morning", "breakfast", "lunch", "evening", "dinner"] : ["preWorkout", "postWorkout"];
const metadata = value => ["createdAt", "updatedAt"].every(key => optional(value[key], at => at === "" || at === null || timestamp(at))) && optional(value.warning, text);
const meal = value => object(value) && text(value.name) && text(value.time) && /^(|(?:[01]\d|2[0-3]):[0-5]\d)$/.test(value.time);
export const validWorkoutExercise = value => object(value) && scalar(value.id) && text(value.name) && Boolean(value.name.trim())
  && optional(value.bodyPart, text) && ["sets", "reps", "weight", "duration", "restTime"].every(key => optional(value[key], scalar));
export const validWorkoutPlan = value => id(value) && text(value.title) && Boolean(value.title.trim()) && metadata(value)
  && ["goalType", "workoutSplit", "totalEstimatedTime", "difficulty"].every(key => optional(value[key], text))
  && Array.isArray(value.days) && value.days.length > 0 && value.days.every(day => days.has(day)) && unique(value.days)
  && date(value.startDate) && date(value.endDate) && typeof value.neverEnds === "boolean" && typeof value.isActive === "boolean"
  && Array.isArray(value.exercises) && value.exercises.every(validWorkoutExercise) && unique(value.exercises.map(row => String(row.id)));
export const validWorkoutPlans = value => rows(value, validWorkoutPlan);
export function validDietPlan(value) {
  if (!id(value) || !metadata(value) || !planTypes.includes(value.planType) || !days.has(value.day) || typeof value.isActive !== "boolean") return false;
  if (value.planType === "macros") return object(value.values) && macros.every(key => text(value.values[key]));
  if (value.planType === "supplements") return Array.isArray(value.items) && value.items.every(meal);
  return object(value.meals) && mealSections(value.planType).every(key => Array.isArray(value.meals[key]) && value.meals[key].every(meal));
}
export const validDietPlans = value => rows(value, validDietPlan);
export const validMeasurement = value => id(value) && validReportDay(value.checkInDate) && metadata(value)
  && measurementKeys.every(key => optional(value[key], text)) && (value.deletedAt === null || timestamp(value.deletedAt))
  && typeof value.canUndoDelete === "boolean" && (value.deleteUndoExpiresAt === null || timestamp(value.deleteUndoExpiresAt))
  && Number.isSafeInteger(value.deleteUndoRemainingMs) && value.deleteUndoRemainingMs >= 0;
export const validMeasurements = value => rows(value, validMeasurement);
export const validExerciseProgress = value => id(value) && validReportDay(value.date) && text(value.exerciseId) && Boolean(value.exerciseId.trim())
  && ["exerciseName", "bodyPart", ...progressKeys].every(key => text(value[key])) && Array.isArray(value.repsBreakdown)
  && value.repsBreakdown.every(text) && text(value.savedAt) && (value.savedAt === "" || timestamp(value.savedAt));
export const validProgressMap = value => object(value) && Object.entries(value).every(([key, row]) => validExerciseProgress(row) && key === `${row.date}_${row.exerciseId}`);
export const validCustomExercise = value => id(value) && ["name", "bodyGroup", "bodySection", "bodyPart"].every(key => text(value[key])) && value.custom === true;
export const validLibrary = value => rows(value, validCustomExercise);
export const validGalleryEntry = value => id(value) && validReportDay(value.date) && rows(value.images, row => id(row) && text(row.src)
  && /^data:image\/(?:jpeg|jpg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(row.src));
export const validGallery = value => rows(value, validGalleryEntry);
const actions = new Set(["created", "updated", "deleted", "copied", "activated", "deactivated", "restored"]);
export const validPlanLog = value => id(value) && ["planId", "title", "note", "time", "restoredFromLogId"].every(key => text(value[key]))
  && actions.has(value.action) && validReportDay(value.date) && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value.time)
  && (value.deletedItem === null || validWorkoutPlan(value.deletedItem));
export const validPlanLogs = value => rows(value, validPlanLog);
export function validGymClock(value) {
  if (!object(value) || !validReportDay(value.date) || !text(value.timezone) || !timestamp(value.serverNow)) return false;
  try { return gymDay(value.serverNow, value.timezone) === value.date && gymWeekday(value.date) === value.day; } catch { return false; }
}
export const gymFailureMessage = (error, fallback = "Gym request failed. Please retry; unsaved changes are kept.") => text(error?.response?.data?.message) && error.response.data.message.trim() ? error.response.data.message
  : text(error?.message) && error.message.trim() ? error.message : fallback;
export const gymRevision = value => value?.updatedAt ? { expectedUpdatedAt: value.updatedAt } : {};
const matches = (value, body, keys) => keys.every(key => body[key] === undefined || String(value[key] ?? "").trim() === String(body[key] ?? "").trim());
const numericMatch = (returned, requested) => String(returned).replace(/\s/g, "") === String(requested).replace(/\s/g, "") ||
  (String(returned).trim() !== "" && String(requested).trim() !== "" && Number.isFinite(Number(requested)) && Number(returned) === Number(requested));
const sameMeals = (returned, requested) => Array.isArray(returned) && Array.isArray(requested) && returned.length === requested.length && requested.every((item, i) => returned[i].name === item.name.trim() && returned[i].time === (item.time || ""));
export function validGymResponse(url, method, data, body = {}) {
  const path = url.split("?")[0], parts = path.split("/"), expectedId = parts[3];
  if (!optional(data?.warning, text) || !optional(data?.message, text)) return false;
  if (method === "get") {
    const validate = {"/gym/clock":validGymClock,"/gym/plans":validWorkoutPlans,"/gym/plans/logs":validPlanLogs,"/gym/diet-plans":validDietPlans,"/gym/measurements":validMeasurements,"/gym/library":validLibrary,"/gym/gallery":validGallery,"/gym/exercise-progress":validProgressMap}[path];
    return validate ? Boolean(validate(data)) : false;
  }
  if (path === "/gym/plans/logs") return validPlanLog(data) && matches(data, body, ["planId", "title", "action", "date", "time"]);
  if (parts[2] === "plans" || parts[2] === "diet-plans") {
    const workout = parts[2] === "plans", validate = workout ? validWorkoutPlan : validDietPlan;
    if (path.endsWith("/active")) return (workout ? validWorkoutPlans(data) : validDietPlans(data)) && data.some(row => row.id === expectedId && row.isActive === body.isActive);
    if (method === "delete") return object(data) && text(data.message) && data.deletedId === expectedId;
    if (!validate(data) || (expectedId && !path.endsWith("/copy") && data.id !== expectedId)) return false;
    if (!matches(data, body, workout ? ["title", "goalType", "workoutSplit", "totalEstimatedTime", "startDate", "endDate", "neverEnds", "difficulty"] : ["planType", "day"])) return false;
    if (workout) return (body.days === undefined || (data.days.length === new Set(body.days).size && body.days.every(day => data.days.includes(day))))
      && (body.exercises === undefined || (data.exercises.length === body.exercises.length && body.exercises.every((row, i) => matches(data.exercises[i], row, ["id", "name", "bodyPart", "sets", "reps", "weight", "duration", "restTime"]))));
    if (body.meals && !mealSections(data.planType).every(key => sameMeals(data.meals[key], body.meals[key] || []))) return false;
    if (body.items && !sameMeals(data.items, body.items)) return false;
    return !body.values || matches(data.values, body.values, macros);
  }
  if (parts[2] === "measurements") {
    const entry = data?.entry || data;
    if (!validMeasurement(entry) || (expectedId && entry.id !== expectedId)) return false;
    if (method === "delete") return Boolean(entry.deletedAt);
    if (path.endsWith("/undo-delete")) return !entry.deletedAt;
    return !entry.deletedAt && matches(entry, body, ["checkInDate", ...measurementKeys]);
  }
  if (parts[2] === "exercise-progress") return validExerciseProgress(data) && data.date === body.date && data.exerciseId === body.exerciseId && matches(data, body, ["exerciseName", "bodyPart", "notes"])
    && progressKeys.filter(key => key !== "notes").every(key => body[key] === undefined || numericMatch(data[key], body[key]))
    && (body.repsBreakdown === undefined || (data.repsBreakdown.length === body.repsBreakdown.length && body.repsBreakdown.every((value, i) => numericMatch(data.repsBreakdown[i], value))));
  if (parts[2] === "library") return method === "delete" ? object(data) && text(data.message) && data.deletedId === expectedId : validCustomExercise(data) && ["name", "bodyGroup", "bodySection", "bodyPart"].every(key => body[key] === undefined || data[key].trim().toLowerCase() === body[key].trim().toLowerCase());
  if (parts[2] === "gallery") {
    if (method === "delete") return object(data) && text(data.message) && (data.deletedEntryId === expectedId || (validGalleryEntry(data.entry) && data.entry.id === expectedId && !data.entry.images.some(row => row.id === parts[5])));
    return validGalleryEntry(data) && data.date === body.date && Array.isArray(body.images) && body.images.every(src => data.images.some(row => row.src === src));
  }
  return false;
}
