import { MEASUREMENT_KEYS, measurementFields, validGalleryImage } from "../utils/gymRecordUtils.js";
import { gymError, gymMutation, gymFailure, checkGymRevision, saveGymRecord, validGymDay, requestedGymActive } from "../utils/gymMutationUtils.js";
import Workout from "../models/Workout.js";
import WorkoutPlan from "../models/WorkoutPlan.js";
import WorkoutPlanLog from "../models/WorkoutPlanLog.js";
import GymExerciseProgress from "../models/GymExerciseProgress.js";
import GymGalleryEntry from "../models/GymGalleryEntry.js";
import GymCustomExercise from "../models/GymCustomExercise.js";
import GymDietPlan from "../models/GymDietPlan.js";
import GymMeasurement from "../models/GymMeasurement.js";
import mongoose from "mongoose";
import User from "../models/User.js";
import { journalMonthDays } from "../../shared/journalAnalysisStats.js";
import { todoReportDay } from "../../shared/todoWeeklyStats.js";
import { computeGymAnalysis, GYM_ANALYSIS_NOTE } from "../../shared/gymAnalysisStats.js";
import { GYM_EXERCISE_FIELDS, GYM_MEASUREMENT_FIELDS } from "../utils/gymWeeklyReportUtils.js";
import { APP_TIMEZONE } from "../config/runtime.js";
import { getWorkoutChecklistSummary } from "../utils/workoutChecklistUtils.js";

const MAX_GALLERY_IMAGES_PER_REQUEST = 6;
const MAX_GALLERY_IMAGES_PER_CHECKIN = 12;
const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DIET_PLAN_TYPES = new Set(["diet", "workoutNutrition", "supplements", "macros"]);
const DIET_MEAL_SECTIONS = ["morning", "breakfast", "lunch", "evening", "dinner"];
const WORKOUT_NUTRITION_SECTIONS = ["preWorkout", "postWorkout"];
const MACRO_FIELDS = ["protein", "carbs", "fats", "fiber", "calories", "water", "sugar", "sodium"];
const WEEK_DAY_BY_INDEX = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const SERVER_TIMEZONE = APP_TIMEZONE;

const getStartOfDay = (value = new Date()) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const toDayKey = (value = new Date()) => {
  const date = getStartOfDay(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const toWeekDayLabel = (value = new Date()) => WEEK_DAY_BY_INDEX[new Date(value).getDay()] || "Mon";

const hasDietMeals = (plan, sections) => (
  sections.some((section) => Array.isArray(plan?.meals?.[section]) && plan.meals[section].length > 0)
);

const hasSupplements = (plan) => Array.isArray(plan?.items) && plan.items.length > 0;

const hasMacroValues = (plan) => (
  MACRO_FIELDS.some((field) => String(plan?.values?.[field] || "").trim() !== "")
);

const getProgressCountFromUpdates = (updates) => {
  if (updates >= 6) return 4;
  if (updates >= 4) return 3;
  if (updates >= 2) return 2;
  return 1;
};

const parseDateInput = (value) => {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return new Date(value);

  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map((part) => Number.parseInt(part, 10));
    const parsed = new Date(year, month - 1, day);
    if (
      parsed.getFullYear() === year &&
      parsed.getMonth() === month - 1 &&
      parsed.getDate() === day
    ) {
      return parsed;
    }
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const normalizeGalleryEntry = (entry) => ({
  id: String(entry?._id || ""),
  date: entry?.checkInDate ? toDayKey(entry.checkInDate) : "",
  images: Array.isArray(entry?.images)
    ? entry.images.map((image) => ({
      id: String(image?._id || ""),
      src: image?.src || ""
    }))
    : []
});

const normalizeCustomExercise = (exercise) => ({
  id: String(exercise?._id || ""),
  name: exercise?.name || "",
  bodyGroup: exercise?.bodyGroup || "",
  bodySection: exercise?.bodySection || "",
  bodyPart: exercise?.bodyPart || "",
  custom: true
});

const normalizeTimeValue = (value) => {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value !== "string" || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)) {
    throw gymError(400, "Time must be in HH:mm format");
  }
  return value;
};

const normalizeDayValue = (value) => {
  const day = typeof value === "string" ? value.trim() : "";
  if (!WEEK_DAYS.includes(day)) {
    throw gymError(400, "day must be one of Mon, Tue, Wed, Thu, Fri, Sat, Sun");
  }
  return day;
};

const normalizePlanTypeValue = (value) => {
  const planType = typeof value === "string" ? value.trim() : "";
  if (!DIET_PLAN_TYPES.has(planType)) {
    throw gymError(400, "planType must be diet, workoutNutrition, supplements, or macros");
  }
  return planType;
};

const normalizeCopiedFromId = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const normalized = String(value).trim();
  return normalized || null;
};

const normalizeMealEntries = (value, sectionName) => {
  if (value === null || value === undefined) return [];
  if (!Array.isArray(value) || value.length > 100) throw gymError(400, `${sectionName} must be an array of at most 100 entries`);

  return value.map((entry) => {
    const rawName = typeof entry?.name === "string" ? entry.name.trim() : "";
    if (!rawName || rawName.length > 180) throw gymError(400, `${sectionName} meal name is required and must be at most 180 characters`);
    return {
      name: rawName.slice(0, 180),
      time: normalizeTimeValue(entry?.time)
    };
  });
};

const normalizeMealsPayload = (planType, payload) => {
  const mealMap = {
    morning: [],
    breakfast: [],
    lunch: [],
    evening: [],
    dinner: [],
    preWorkout: [],
    postWorkout: []
  };

  if (planType !== "diet" && planType !== "workoutNutrition") return mealMap;
  if (payload !== null && payload !== undefined && (typeof payload !== "object" || Array.isArray(payload))) {
    throw gymError(400, "meals must be an object");
  }

  const sections = planType === "diet" ? DIET_MEAL_SECTIONS : WORKOUT_NUTRITION_SECTIONS;
  sections.forEach((section) => {
    mealMap[section] = normalizeMealEntries(payload?.[section], section);
  });

  return mealMap;
};

const normalizeSupplementItems = (value) => {
  if (value === null || value === undefined) return [];
  if (!Array.isArray(value) || value.length > 100) throw gymError(400, "items must be an array of at most 100 entries");

  return value.map((entry) => {
    const rawName = typeof entry?.name === "string" ? entry.name.trim() : "";
    if (!rawName || rawName.length > 180) throw gymError(400, "Supplement name is required and must be at most 180 characters");
    return {
      name: rawName.slice(0, 180),
      time: normalizeTimeValue(entry?.time)
    };
  });
};

const normalizeMacroFieldValue = (value, fieldName) => {
  if (value === null || value === undefined || value === "") return "";
  if (!["string", "number"].includes(typeof value)) throw gymError(400, `${fieldName} must be a non-negative number`);
  const normalized = String(value).trim();
  if (!normalized) return "";
  if (!/^\d+(?:\.\d+)?$/.test(normalized) || !Number.isFinite(Number(normalized)) || Number(normalized) > Number.MAX_SAFE_INTEGER || normalized.length > 24) {
    throw gymError(400, `${fieldName} must be a valid non-negative number`);
  }
  return normalized.slice(0, 24);
};

const normalizeMacroValues = (value) => {
  if (value === null || value === undefined) {
    return Object.fromEntries(MACRO_FIELDS.map((field) => [field, ""]));
  }
  if (typeof value !== "object" || Array.isArray(value)) {
    throw gymError(400, "values must be an object");
  }

  return Object.fromEntries(
    MACRO_FIELDS.map((field) => [field, normalizeMacroFieldValue(value[field], field)])
  );
};

const serializeMealEntries = (entries) => (
  Array.isArray(entries)
    ? entries.map((entry) => ({
      id: String(entry?._id || ""),
      name: entry?.name || "",
      time: entry?.time || ""
    }))
    : []
);

const normalizeDietPlan = (plan) => {
  const base = {
    id: String(plan?._id || ""),
    planType: plan?.planType || "",
    day: plan?.day || "",
    isActive: Boolean(plan?.isActive),
    copiedFromId: plan?.copiedFromId || null,
    createdAt: plan?.createdAt || null,
    updatedAt: plan?.updatedAt || null
  };

  if (plan?.planType === "diet") {
    return {
      ...base,
      meals: Object.fromEntries(
        DIET_MEAL_SECTIONS.map((section) => [section, serializeMealEntries(plan?.meals?.[section])])
      )
    };
  }

  if (plan?.planType === "workoutNutrition") {
    return {
      ...base,
      meals: Object.fromEntries(
        WORKOUT_NUTRITION_SECTIONS.map((section) => [section, serializeMealEntries(plan?.meals?.[section])])
      )
    };
  }

  if (plan?.planType === "supplements") {
    return {
      ...base,
      items: serializeMealEntries(plan?.items)
    };
  }

  return {
    ...base,
    values: Object.fromEntries(MACRO_FIELDS.map((field) => [field, plan?.values?.[field] || ""]))
  };
};

const deactivateOtherPlansForDay = async ({ userId, planType, day, currentPlanId, session }) => {
  await GymDietPlan.updateMany(
    {
      userId,
      planType,
      day,
      isActive: true,
      _id: { $ne: currentPlanId }
    },
    { $set: { isActive: false } },
    { session }
  );
};

export const getGymDietPlans = async (req, res) => {
  try {
    const query = { userId: req.user.id };
    if (req.query?.planType !== undefined) {
      query.planType = normalizePlanTypeValue(req.query.planType);
    }
    if (req.query?.day !== undefined) {
      query.day = normalizeDayValue(req.query.day);
    }

    const plans = await GymDietPlan.find(query).sort({ createdAt: -1 });
    res.json(plans.map(normalizeDietPlan));
  } catch (error) {
    gymFailure(res, error);
  }
};

export const createGymDietPlan = async (req, res) => {
  try {
    const planType = normalizePlanTypeValue(req.body?.planType);
    const day = normalizeDayValue(req.body?.day);
    if (req.body.isActive !== undefined && typeof req.body.isActive !== "boolean") throw gymError(400, "isActive must be a boolean");
    const payload = {
      userId: req.user.id, planType, day, isActive: req.body.isActive === true,
      copiedFromId: normalizeCopiedFromId(req.body?.copiedFromId),
      meals: normalizeMealsPayload(planType, req.body?.meals),
      items: planType === "supplements" ? normalizeSupplementItems(req.body?.items) : [],
      values: planType === "macros" ? normalizeMacroValues(req.body?.values) : normalizeMacroValues(null)
    };
    const saved = await gymMutation(req.user.id, async session => {
      const [plan] = await GymDietPlan.create([payload], { session });
      if (plan.isActive) await deactivateOtherPlansForDay({ userId: req.user.id, planType, day, currentPlanId: plan._id, session });
      return normalizeDietPlan(plan);
    });
    res.status(201).json(saved);
  } catch (error) {
    gymFailure(res, error);
  }
};

export const updateGymDietPlan = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) throw gymError(400, "Invalid diet plan id");
    const saved = await gymMutation(req.user.id, async session => {
      const plan = await GymDietPlan.findOne({ _id: req.params.id, userId: req.user.id }).session(session);
      if (!plan) throw gymError(404, "Diet plan not found");
      checkGymRevision(plan, req.body);
      if (req.body.planType && req.body.planType !== plan.planType) throw gymError(400, "planType cannot be changed for an existing plan");
      if (req.body.day !== undefined) plan.day = normalizeDayValue(req.body.day);
      if (req.body.isActive !== undefined) plan.isActive = requestedGymActive(req.body, plan.isActive);
      if (req.body.copiedFromId !== undefined) plan.copiedFromId = normalizeCopiedFromId(req.body.copiedFromId);
      if ((plan.planType === "diet" || plan.planType === "workoutNutrition") && req.body.meals !== undefined) plan.meals = normalizeMealsPayload(plan.planType, req.body.meals);
      if (plan.planType === "supplements" && req.body.items !== undefined) plan.items = normalizeSupplementItems(req.body.items);
      if (plan.planType === "macros" && req.body.values !== undefined) plan.values = normalizeMacroValues(req.body.values);
      await saveGymRecord(plan, req.body, session);
      if (plan.isActive) await deactivateOtherPlansForDay({ userId: req.user.id, planType: plan.planType, day: plan.day, currentPlanId: plan._id, session });
      return normalizeDietPlan(plan);
    });
    res.json(saved);
  } catch (error) {
    gymFailure(res, error);
  }
};

export const toggleGymDietPlanActive = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) throw gymError(400, "Invalid diet plan id");
    if (req.body.isActive !== undefined) requestedGymActive(req.body, false);
    const plans = await gymMutation(req.user.id, async session => {
      const plan = await GymDietPlan.findOne({ _id: req.params.id, userId: req.user.id }).session(session);
      if (!plan) throw gymError(404, "Diet plan not found");
      checkGymRevision(plan, req.body);
      plan.isActive = requestedGymActive(req.body, plan.isActive);
      await saveGymRecord(plan, req.body, session);
      if (plan.isActive) await deactivateOtherPlansForDay({ userId: req.user.id, planType: plan.planType, day: plan.day, currentPlanId: plan._id, session });
      const all = await GymDietPlan.find({ userId: req.user.id, planType: plan.planType }).session(session).sort({ createdAt: -1 });
      return all.map(normalizeDietPlan);
    });
    res.json(plans);
  } catch (error) {
    gymFailure(res, error);
  }
};

export const copyGymDietPlanToDay = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) throw gymError(400, "Invalid diet plan id");
    const targetDay = normalizeDayValue(req.body?.day);
    let created = false;
    const saved = await gymMutation(req.user.id, async session => {
      const plan = await GymDietPlan.findOne({ _id: req.params.id, userId: req.user.id }).session(session);
      if (!plan) throw gymError(404, "Diet plan not found");
      const sourceRootId = plan.copiedFromId || String(plan._id);
      const sourceMatcher = [{ copiedFromId: sourceRootId }];
      if (mongoose.Types.ObjectId.isValid(sourceRootId)) sourceMatcher.push({ _id: sourceRootId });
      const existing = await GymDietPlan.findOne({ userId: req.user.id, planType: plan.planType, day: targetDay, $or: sourceMatcher }).session(session);
      // A retry after a lost response returns the existing canonical copy.
      if (existing) { created = false; return normalizeDietPlan(existing); }
      const [copied] = await GymDietPlan.create([{
        userId: req.user.id, planType: plan.planType, day: targetDay,
        isActive: false, copiedFromId: sourceRootId,
        meals: plan.meals?.toObject ? plan.meals.toObject() : plan.meals,
        items: Array.isArray(plan.items) ? plan.items.map(item => ({ name: item.name, time: item.time || "" })) : [],
        values: plan.values?.toObject ? plan.values.toObject() : plan.values
      }], { session });
      created = true;
      return normalizeDietPlan(copied);
    });
    res.status(created ? 201 : 200).json(saved);
  } catch (error) {
    gymFailure(res, error);
  }
};

export const deleteGymDietPlan = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) throw gymError(400, "Invalid diet plan id");
    await gymMutation(req.user.id, async session => {
      if (req.body?.expectedUpdatedAt !== undefined) {
        const current = await GymDietPlan.findOne({ _id: req.params.id, userId: req.user.id }).session(session);
        if (!current) throw gymError(404, "Diet plan not found");
        checkGymRevision(current, req.body);
      }
      const plan = await GymDietPlan.findOneAndDelete({ _id: req.params.id, userId: req.user.id }, { session });
      if (!plan) throw gymError(404, "Diet plan not found");
    });
    res.json({ message: "Diet plan deleted", deletedId: req.params.id });
  } catch (error) {
    gymFailure(res, error);
  }
};

export const createWorkout = async (req, res) => {
  try {
    const { exercise, sets, reps, weight, date } = req.body;

    if (!exercise || sets == null || reps == null) {
      return res.status(400).json({ message: "Exercise, sets and reps are required" });
    }

    const workout = await Workout.create({
      userId: req.user.id,
      exercise,
      sets,
      reps,
      weight,
      date
    });

    res.status(201).json(workout);
  } catch (error) {
    gymFailure(res, error);
  }
};

export const getWorkouts = async (req, res) => {
  try {
    const workouts = await Workout.find({ userId: req.user.id }).sort({ date: -1 });
    res.json(workouts);
  } catch (error) {
    gymFailure(res, error);
  }
};

export const deleteWorkout = async (req, res) => {
  try {
    const workout = await Workout.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!workout) {
      return res.status(404).json({ message: "Workout not found" });
    }

    res.json({ message: "Workout deleted" });
  } catch (error) {
    gymFailure(res, error);
  }
};

// Clock metadata must remain available independently of measurement/gallery reads.
export const getGymClock = (req, res) => {
  const now = new Date();
  res.json({ date: toDayKey(now), day: toWeekDayLabel(now), timezone: APP_TIMEZONE, serverNow: now.toISOString() });
};

export const getGymSummary = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);
    const today = new Date();
    const todayKey = toDayKey(today);
    const dayStart = getStartOfDay(today);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    const dayLabel = toWeekDayLabel(today);

    const [
      todaysMeasurement,
      todaysProgressEntries,
      lastMeasurement,
      latestGalleryUpload,
      todaysWorkoutPlans
    ] = await Promise.all([
      GymMeasurement.findOne({
        userId,
        checkInDate: todayKey,
        deletedAt: null
      }).select("_id"),
      GymExerciseProgress.find({
        userId,
        date: todayKey
      }).select("exerciseId"),
      GymMeasurement.findOne({
        userId,
        deletedAt: null
      }).sort({ checkInDate: -1 }).select("checkInDate"),
      GymGalleryEntry.aggregate([
        { $match: { userId } },
        { $unwind: "$images" },
        {
          $group: {
            _id: null,
            latestUploadedAt: { $max: "$images.uploadedAt" }
          }
        }
      ]),
      WorkoutPlan.find({
        userId,
        isActive: true,
        days: dayLabel,
        $or: [
          { neverEnds: true },
          { endDate: "" },
          { endDate: { $gte: todayKey } }
        ],
        startDate: { $lte: todayKey }
      }).select("exercises")
    ]);

    const { progressUpdatesToday, completedProgress, totalProgress, pendingUpdates } =
      getWorkoutChecklistSummary(todaysWorkoutPlans, todaysProgressEntries);

    const latestGalleryUploadDate = latestGalleryUpload?.[0]?.latestUploadedAt
      ? toDayKey(latestGalleryUpload[0].latestUploadedAt)
      : null;

    res.json({
      date: todayKey,
      timezone: APP_TIMEZONE,
      serverNow: today.toISOString(),
      day: dayLabel,
      progressUpdatesToday,
      completedProgress,
      totalProgress,
      pendingUpdates,
      lastMeasurementCheckInDate: lastMeasurement?.checkInDate || null,
      lastPicUploadedDate: latestGalleryUploadDate,
      lastMeasurementCheckIn: todaysMeasurement ? todayKey : null
    });
  } catch (error) {
    gymFailure(res, error);
  }
};

export const getGymHeatmap = async (req, res) => {
  try {
    const { year } = req.query;
    const parsedYear = Number(year);
    const hasYearFilter = typeof year === "string" && /^\d+$/.test(year) && Number.isSafeInteger(parsedYear) && parsedYear >= 1970 && parsedYear <= 3000;

    if (year !== undefined && !hasYearFilter) {
      return res.status(400).json({ message: "Year must be a valid number" });
    }
    if (hasYearFilter && (parsedYear < 1970 || parsedYear > 3000)) {
      return res.status(400).json({ message: "Year must be between 1970 and 3000" });
    }

    const userId = new mongoose.Types.ObjectId(req.user.id);
    const startDayKey = hasYearFilter ? `${parsedYear}-01-01` : null;
    const endDayKey = hasYearFilter ? `${parsedYear + 1}-01-01` : null;
    const startDate = hasYearFilter ? new Date(parsedYear, 0, 1) : null;
    const endDate = hasYearFilter ? new Date(parsedYear + 1, 0, 1) : null;

    const [
      exerciseProgressByDay,
      measurementsByDay,
      galleryUploadsByDay,
    ] = await Promise.all([
      GymExerciseProgress.aggregate([
        {
          $match: {
            userId,
            ...(hasYearFilter ? { date: { $gte: startDayKey, $lt: endDayKey } } : {})
          }
        },
        {
          $group: {
            _id: "$date",
            exerciseIds: { $addToSet: "$exerciseId" }
          }
        },
        {
          $project: {
            updates: { $size: "$exerciseIds" }
          }
        }
      ]),
      GymMeasurement.aggregate([
        {
          $match: {
            userId,
            deletedAt: null,
            ...(hasYearFilter ? { checkInDate: { $gte: startDayKey, $lt: endDayKey } } : {})
          }
        },
        {
          $group: {
            _id: "$checkInDate",
            updates: { $sum: 1 }
          }
        }
      ]),
      GymGalleryEntry.aggregate([
        {
          $match: {
            userId,
            ...(hasYearFilter ? { checkInDate: { $gte: startDate, $lt: endDate } } : {})
          }
        },
        {
          $project: {
            day: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$checkInDate",
                timezone: SERVER_TIMEZONE
              }
            }
          }
        },
        {
          $group: {
            _id: "$day",
            updates: { $sum: 1 }
          }
        }
      ]),
    ]);

    const exerciseByDay   = new Map();
    const measurementByDay = new Map();
    const galleryByDay    = new Map();

    exerciseProgressByDay.forEach((item) => {
      const k = String(item?._id || "").trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(k)) exerciseByDay.set(k, Math.max(0, Number(item?.updates || 0)));
    });
    measurementsByDay.forEach((item) => {
      const k = String(item?._id || "").trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(k)) measurementByDay.set(k, Math.max(0, Number(item?.updates || 0)));
    });
    galleryUploadsByDay.forEach((item) => {
      const k = String(item?._id || "").trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(k)) galleryByDay.set(k, Math.max(0, Number(item?.updates || 0)));
    });

    const allDays = new Set([...exerciseByDay.keys(), ...measurementByDay.keys(), ...galleryByDay.keys()]);

    const values = [...allDays]
      .sort()
      .map((date) => {
        const exercises   = exerciseByDay.get(date) || 0;
        const measurement = measurementByDay.get(date) || 0;
        const gallery     = galleryByDay.get(date) || 0;
        const updates     = exercises + measurement + gallery;
        return {
          date,
          count: getProgressCountFromUpdates(updates),
          updates,
          exercises,
          measurement,
          gallery,
          completedProgress: updates
        };
      })
      .filter((v) => v.updates > 0);

    const years = [...new Set(
      values
        .map((value) => Number.parseInt(String(value.date).slice(0, 4), 10))
        .filter((value) => Number.isFinite(value))
    )].sort((left, right) => right - left);

    const totalProgressUpdates = values.reduce((sum, value) => sum + Number(value.updates || 0), 0);

    res.json({
      values,
      years,
      totalProgressUpdates
    });
  } catch (error) {
    gymFailure(res, error);
  }
};

export const getGymGalleryEntries = async (req, res) => {
  try {
    const entries = await GymGalleryEntry.find({ userId: req.user.id }).sort({ checkInDate: -1, createdAt: -1 });
    const normalized = entries.map(normalizeGalleryEntry);
    res.json(normalized);
  } catch (error) {
    gymFailure(res, error);
  }
};

export const uploadGymGalleryImages = async (req, res) => {
  try {
    const day = req.body?.date || toDayKey();
    if (!validGymDay(day) || day > toDayKey()) throw gymError(400, "date must be a valid, non-future YYYY-MM-DD value");
    if (req.body?.expectedToday && (req.body.expectedToday !== toDayKey() || day !== toDayKey())) throw gymError(409, "The app day changed. Review your upload date before retrying.");
    const incoming = req.body?.images;
    if (!Array.isArray(incoming) || !incoming.length || incoming.length > MAX_GALLERY_IMAGES_PER_REQUEST) throw gymError(400, "Choose between 1 and 6 images");
    if (incoming.some(image => !validGalleryImage(image))) throw gymError(400, "Use valid JPG, PNG or WEBP images, at most 2 MB each");
    const checkInDate = parseDateInput(day);
    const result = await gymMutation(req.user.id, async session => {
      let entry = await GymGalleryEntry.findOne({ userId: req.user.id, checkInDate }).session(session);
      const existing = new Set(entry?.images.map(image => image.src) || []);
      // Identical bytes within the same check-in are the same photo. This also
      // makes retry after an unacknowledged successful upload safe.
      const images = [...new Set(incoming)].filter(src => !existing.has(src)).map(src => ({ src }));
      const combined = [...(entry?.images || []), ...images];
      if (combined.reduce((bytes, image) => bytes + Buffer.byteLength(image.src, "utf8"), 0) > 14 * 1024 * 1024) throw gymError(400, "This check-in is too large. Use smaller images (about 10 MB total).");
      if ((entry?.images.length || 0) + images.length > MAX_GALLERY_IMAGES_PER_CHECKIN) throw gymError(400, "Each check-in can have up to 12 images");
      if (!entry) {
        [entry] = await GymGalleryEntry.create([{ userId: req.user.id, checkInDate, images }], { session });
      } else if (images.length) {
        entry.images.push(...images);
        await entry.save({ session });
      }
      return normalizeGalleryEntry(entry);
    });
    res.status(201).json(result);
  } catch (error) { gymFailure(res, error); }
};

export const deleteGymGalleryImage = async (req, res) => {
  try {
    const { entryId, imageId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(entryId) || !mongoose.Types.ObjectId.isValid(imageId)) throw gymError(400, "Invalid gallery id or image id");
    const result = await gymMutation(req.user.id, async session => {
      const entry = await GymGalleryEntry.findOne({ _id: entryId, userId: req.user.id }).session(session);
      // A repeated deletion has the same outcome, without touching another owner.
      if (!entry) return { message: "Image deleted", deletedEntryId: entryId };
      const image = entry.images.id(imageId);
      if (image) image.deleteOne();
      if (!entry.images.length) {
        await entry.deleteOne({ session });
        return { message: "Image deleted", deletedEntryId: entryId };
      }
      if (image) await entry.save({ session });
      return { message: "Image deleted", entry: normalizeGalleryEntry(entry) };
    });
    res.json(result);
  } catch (error) { gymFailure(res, error); }
};

export const getGymGallerySummary = async (req, res) => {
  try {
    const entries = await GymGalleryEntry.find({ userId: req.user.id }).select("checkInDate images");
    const totalCheckIns = entries.length;
    const totalPhotos = entries.reduce((sum, entry) => sum + (Array.isArray(entry.images) ? entry.images.length : 0), 0);
    const lastUploadedAt = entries.reduce((latest, entry) => {
      const images = Array.isArray(entry?.images) ? entry.images : [];
      images.forEach((image) => {
        const uploadedAt = image?.uploadedAt ? new Date(image.uploadedAt) : null;
        if (!uploadedAt || Number.isNaN(uploadedAt.getTime())) return;
        if (!latest || uploadedAt > latest) {
          latest = uploadedAt;
        }
      });
      return latest;
    }, null);
    const lastUploadedDate = lastUploadedAt ? toDayKey(lastUploadedAt) : null;

    res.json({
      totalCheckIns,
      totalPhotos,
      lastUploadedDate
    });
  } catch (error) {
    gymFailure(res, error);
  }
};

export const getGymCustomExercises = async (req, res) => {
  try {
    const exercises = await GymCustomExercise.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(exercises.map(normalizeCustomExercise));
  } catch (error) {
    gymFailure(res, error);
  }
};

export const createGymCustomExercise = async (req, res) => {
  try {
    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    const bodyGroup = typeof req.body?.bodyGroup === "string" ? req.body.bodyGroup.trim() : "";
    const bodySection = typeof req.body?.bodySection === "string" ? req.body.bodySection.trim() : "";
    const bodyPart = typeof req.body?.bodyPart === "string" ? req.body.bodyPart.trim() : "";

    if (!name) {
      return res.status(400).json({ message: "Workout name is required" });
    }
    if (!bodyGroup) {
      return res.status(400).json({ message: "Body group is required" });
    }
    if (!bodyPart) {
      return res.status(400).json({ message: "Body part is required" });
    }

    const normalizedName = name.toLowerCase();
    const normalizedBodyPart = bodyPart.toLowerCase();
    if (name.length > 180 || bodyPart.length > 180 || bodyGroup.length > 80 || bodySection.length > 80) throw gymError(400, "Workout name or body group is too long");
    const saved = await gymMutation(req.user.id, async session => {
    const duplicate = await GymCustomExercise.findOne({
      userId: req.user.id,
      $expr: {
        $and: [
          { $eq: [{ $toLower: "$name" }, normalizedName] },
          { $eq: [{ $toLower: "$bodyPart" }, normalizedBodyPart] }
        ]
      }
    }).session(session);
    if (duplicate) return { status: 200, exercise: normalizeCustomExercise(duplicate) };

    const [exercise] = await GymCustomExercise.create([{
      userId: req.user.id,
      name,
      bodyGroup,
      bodySection,
      bodyPart
    }], { session });
    return { status: 201, exercise: normalizeCustomExercise(exercise) };
    });
    res.status(saved.status).json(saved.exercise);
  } catch (error) {
    gymFailure(res, error);
  }
};

export const deleteGymCustomExercise = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) throw gymError(400, "Invalid workout id");
    await gymMutation(req.user.id, async session => {
      await GymCustomExercise.findOneAndDelete({ _id: req.params.id, userId: req.user.id }).session(session);
    });
    res.json({ message: "Workout removed from library", deletedId: req.params.id });
  } catch (error) { gymFailure(res, error); }
};

/* ─── Workout Plan helpers ──────────────────────────────────────────────── */

const VALID_PLAN_DAYS = new Set(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
const VALID_PLAN_ACTIONS = new Set(["created", "updated", "deleted", "copied", "activated", "deactivated", "restored"]);
const HH_MM_RE = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

const sanitizePlanDays = (days) => {
  if (!Array.isArray(days)) return null;
  if (days.some(day => typeof day !== "string")) return { error: "Each workout day must be a weekday string" };
  const unique = [...new Set(days.filter((day) => typeof day === "string"))];
  const invalid = unique.filter((day) => !VALID_PLAN_DAYS.has(day));
  if (invalid.length) return { error: `Invalid days: ${invalid.join(", ")}` };
  return unique;
};

const validatePlanBody = (body, isCreate) => {
  if (!body || typeof body !== "object" || Array.isArray(body)) return "Workout details must be an object";
  const { title, days, startDate, endDate, neverEnds, exercises } = body;
  if ((isCreate || title !== undefined) && (typeof title !== "string" || !title.trim())) return "Title is required";
  if (typeof title === "string" && title.trim().length > 180) return "Workout title must be at most 180 characters";
  for (const field of ["goalType", "workoutSplit", "difficulty", "totalEstimatedTime"]) {
    if (body[field] !== undefined && (typeof body[field] !== "string" || body[field].length > 180)) return `${field} must be a string of at most 180 characters`;
  }
  if (isCreate || days !== undefined) {
    const result = sanitizePlanDays(days);
    if (result === null) return "days must be an array";
    if (result.error) return result.error;
    if (!result.length) return "At least one day is required";
  }
  if (startDate !== undefined && startDate !== "" && !validGymDay(startDate)) return "startDate must be a valid YYYY-MM-DD date";
  if (endDate !== undefined && endDate !== "" && !validGymDay(endDate)) return "endDate must be a valid YYYY-MM-DD date";
  if (neverEnds !== undefined && typeof neverEnds !== "boolean") return "neverEnds must be a boolean";
  if (neverEnds === false && endDate && startDate && endDate < startDate) return "endDate cannot be before startDate";
  if (neverEnds === false && !endDate) return "endDate is required unless the workout never ends";
  if (exercises !== undefined && !Array.isArray(exercises)) return "exercises must be an array";
  if (Array.isArray(exercises)) {
    if (exercises.length > 100) return "A workout can contain at most 100 exercises";
    const ids = new Set();
    for (const ex of exercises) {
      if (!ex || typeof ex !== "object" || Array.isArray(ex) || !["string", "number"].includes(typeof ex.id) || (typeof ex.id === "number" && !Number.isFinite(ex.id)) || !String(ex.id).trim() || String(ex.id).trim().length > 180 || typeof ex.name !== "string" || !ex.name.trim() || ex.name.length > 180) return "Each exercise needs an id and a name of at most 180 characters";
      if (ids.has(String(ex.id))) return "Exercise ids must be unique within a workout";
      ids.add(String(ex.id));
      if (ex.bodyPart !== undefined && (typeof ex.bodyPart !== "string" || ex.bodyPart.length > 180)) return "Exercise bodyPart must be a string of at most 180 characters";
      for (const [key, max] of [["sets", 20], ["reps", 200], ["weight", 1000], ["duration", 600], ["restTime", 3600]]) {
        if (key === "reps" && typeof ex.reps === "string" && /^\d+\s*-\s*\d+$/.test(ex.reps)) {
          const [low, high] = ex.reps.split("-").map(Number);
          if (low > high || high > max) return "Exercise rep range must be ordered and no greater than 200";
          continue;
        }
        if (ex[key] !== undefined && ex[key] !== "" && (!["string", "number"].includes(typeof ex[key]) || !/^\d+(?:\.\d+)?$/.test(String(ex[key])) || !Number.isFinite(Number(ex[key])) || Number(ex[key]) > max || (["sets", "reps"].includes(key) && !Number.isInteger(Number(ex[key]))))) return `Exercise ${key} must be a valid non-negative number no greater than ${max}`;
      }
    }
  }
  return null;
};

const normalizeWorkoutPlan = (plan) => ({
  id: String(plan._id),
  title: plan.title || "",
  goalType: plan.goalType || "",
  workoutSplit: plan.workoutSplit || "",
  totalEstimatedTime: plan.totalEstimatedTime || "",
  days: Array.isArray(plan.days) ? plan.days : [],
  startDate: plan.startDate || "",
  neverEnds: Boolean(plan.neverEnds),
  endDate: plan.endDate || "",
  difficulty: plan.difficulty || "",
  exercises: Array.isArray(plan.exercises) ? plan.exercises : [],
  isActive: Boolean(plan.isActive),
  copiedFromId: plan.copiedFromId || null,
  createdAt: plan.createdAt ? plan.createdAt.toISOString() : "",
  updatedAt: plan.updatedAt ? plan.updatedAt.toISOString() : "",
});

const normalizeWorkoutPlanLog = (log) => ({
  id: String(log._id),
  planId: log.planId || "",
  title: log.planTitle || "",
  action: log.action || "",
  note: log.note || "",
  date: log.date || "",
  time: log.time || "",
  deletedItem: log.deletedItem && typeof log.deletedItem === "object" ? log.deletedItem : null,
  restoredFromLogId: log.restoredFromLogId || "",
  createdAt: log.createdAt ? log.createdAt.toISOString() : "",
});

/* ─── Workout Plan CRUD ─────────────────────────────────────────────────── */

export const getWorkoutPlans = async (req, res) => {
  try {
    const plans = await WorkoutPlan.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(plans.map(normalizeWorkoutPlan));
  } catch (error) {
    gymFailure(res, error);
  }
};

export const createWorkoutPlan = async (req, res) => {
  try {
    const validationError = validatePlanBody(req.body, true);
    if (validationError) throw gymError(400, validationError);
    const { title, goalType, workoutSplit, totalEstimatedTime, days, startDate, neverEnds, endDate, difficulty, exercises, copiedFromId } = req.body;
    let created = false;
    const saved = await gymMutation(req.user.id, async session => {
      const cleanDays = sanitizePlanDays(days);
      if (copiedFromId) {
        if (!mongoose.Types.ObjectId.isValid(copiedFromId)) throw gymError(400, "Invalid source workout id");
        const sourceMatcher = [{ _id: copiedFromId }, { copiedFromId }];
        const source = await WorkoutPlan.findOne({ userId: req.user.id, $or: sourceMatcher }).session(session);
        if (!source) throw gymError(404, "Source workout not found");
        if (cleanDays.length !== 1) throw gymError(400, "A copied workout must have one day");
        const existing = await WorkoutPlan.findOne({ userId: req.user.id, days: cleanDays[0], $or: sourceMatcher }).session(session);
        if (existing) { created = false; return normalizeWorkoutPlan(existing); }
      }
      const [plan] = await WorkoutPlan.create([{
        userId: req.user.id, title: title.trim(),
        goalType: typeof goalType === "string" ? goalType.trim() : "",
        workoutSplit: typeof workoutSplit === "string" ? workoutSplit.trim() : "",
        totalEstimatedTime: totalEstimatedTime != null ? String(totalEstimatedTime).trim() : "",
        days: cleanDays, startDate: typeof startDate === "string" ? startDate : "",
        neverEnds: neverEnds !== false, endDate: typeof endDate === "string" ? endDate : "",
        difficulty: typeof difficulty === "string" ? difficulty.trim() : "",
        exercises: Array.isArray(exercises) ? exercises : [], isActive: false,
        copiedFromId: copiedFromId ? String(copiedFromId) : null,
      }], { session });
      created = true;
      return normalizeWorkoutPlan(plan);
    });
    res.status(created ? 201 : 200).json(saved);
  } catch (error) {
    gymFailure(res, error);
  }
};

export const updateWorkoutPlan = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) throw gymError(400, "Invalid plan id");
    const saved = await gymMutation(req.user.id, async session => {
      const plan = await WorkoutPlan.findOne({ _id: req.params.id, userId: req.user.id }).session(session);
      if (!plan) throw gymError(404, "Workout plan not found");
      checkGymRevision(plan, req.body);
      const merged = { title: plan.title, days: plan.days, startDate: plan.startDate, endDate: plan.endDate, neverEnds: plan.neverEnds, exercises: plan.exercises, ...req.body };
      const validationError = validatePlanBody(merged, false);
      if (validationError) throw gymError(400, validationError);
      if (req.body.startDate !== undefined && plan.startDate && plan.startDate <= toDayKey() && req.body.startDate !== plan.startDate) throw gymError(400, "The start date of an already-started workout cannot be changed");
      for (const key of ["title", "goalType", "workoutSplit", "difficulty"]) {
        if (req.body[key] !== undefined) plan[key] = typeof req.body[key] === "string" ? req.body[key].trim() : "";
      }
      if (req.body.totalEstimatedTime !== undefined) plan.totalEstimatedTime = String(req.body.totalEstimatedTime ?? "").trim();
      if (req.body.days !== undefined) plan.days = sanitizePlanDays(req.body.days);
      if (req.body.startDate !== undefined) plan.startDate = req.body.startDate;
      if (req.body.endDate !== undefined) plan.endDate = req.body.endDate;
      if (req.body.neverEnds !== undefined) plan.neverEnds = req.body.neverEnds;
      if (req.body.exercises !== undefined) plan.exercises = req.body.exercises;
      await saveGymRecord(plan, req.body, session);
      if (plan.isActive) await WorkoutPlan.updateMany(
        { userId: req.user.id, _id: { $ne: plan._id }, days: { $in: plan.days }, isActive: true },
        { $set: { isActive: false } }, { session }
      );
      return normalizeWorkoutPlan(plan);
    });
    res.json(saved);
  } catch (error) {
    gymFailure(res, error);
  }
};

export const deleteWorkoutPlan = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) throw gymError(400, "Invalid plan id");
    await gymMutation(req.user.id, async session => {
      if (req.body?.expectedUpdatedAt !== undefined) {
        const current = await WorkoutPlan.findOne({ _id: req.params.id, userId: req.user.id }).session(session);
        if (!current) throw gymError(404, "Workout plan not found");
        checkGymRevision(current, req.body);
      }
      const plan = await WorkoutPlan.findOneAndDelete({ _id: req.params.id, userId: req.user.id }, { session });
      if (!plan) throw gymError(404, "Workout plan not found");
    });
    res.json({ message: "Workout plan deleted", deletedId: req.params.id });
  } catch (error) {
    gymFailure(res, error);
  }
};

export const toggleWorkoutPlanActive = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) throw gymError(400, "Invalid plan id");
    if (req.body.isActive !== undefined) requestedGymActive(req.body, false);
    const plans = await gymMutation(req.user.id, async session => {
      const plan = await WorkoutPlan.findOne({ _id: req.params.id, userId: req.user.id }).session(session);
      if (!plan) throw gymError(404, "Workout plan not found");
      checkGymRevision(plan, req.body);
      plan.isActive = requestedGymActive(req.body, plan.isActive);
      await saveGymRecord(plan, req.body, session);
      if (plan.isActive && plan.days.length) await WorkoutPlan.updateMany(
        { userId: req.user.id, _id: { $ne: plan._id }, days: { $in: plan.days }, isActive: true },
        { $set: { isActive: false } }, { session }
      );
      const all = await WorkoutPlan.find({ userId: req.user.id }).session(session).sort({ createdAt: -1 });
      return all.map(normalizeWorkoutPlan);
    });
    res.json(plans);
  } catch (error) {
    gymFailure(res, error);
  }
};

/* ─── Workout Plan Logs ─────────────────────────────────────────────────── */

export const getWorkoutPlanLogs = async (req, res) => {
  try {
    const logs = await WorkoutPlanLog.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(100);
    res.json(logs.map(normalizeWorkoutPlanLog));
  } catch (error) {
    gymFailure(res, error);
  }
};

export const createWorkoutPlanLog = async (req, res) => {
  try {
    const { planId, title, action, note, date, time, deletedItem, restoredFromLogId } = req.body;

    if (!title || typeof title !== "string" || !title.trim()) {
      return res.status(400).json({ message: "title is required" });
    }
    if (!action || !VALID_PLAN_ACTIONS.has(action)) {
      return res.status(400).json({ message: `action must be one of: ${[...VALID_PLAN_ACTIONS].join(", ")}` });
    }
    if (!validGymDay(date)) {
      return res.status(400).json({ message: "date must be in YYYY-MM-DD format" });
    }
    if (!time || !HH_MM_RE.test(time)) {
      return res.status(400).json({ message: "time must be in HH:MM format" });
    }

    const log = await WorkoutPlanLog.create({
      userId: req.user.id,
      planId: planId ? String(planId) : "",
      planTitle: title.trim(),
      action,
      note: typeof note === "string" ? note.trim() : "",
      date,
      time,
      deletedItem: action === "deleted" && deletedItem && typeof deletedItem === "object" ? deletedItem : null,
      restoredFromLogId:
        action === "restored" && typeof restoredFromLogId === "string"
          ? restoredFromLogId.trim()
          : "",
    });

    res.status(201).json(normalizeWorkoutPlanLog(log));
  } catch (error) {
    gymFailure(res, error);
  }
};

const MEASUREMENT_DELETE_UNDO_WINDOW_MS = 48 * 60 * 60 * 1000;

const getMeasurementDeleteUndoMeta = (doc, now = new Date()) => {
  const deletedAt = doc?.deletedAt ? new Date(doc.deletedAt) : null;
  if (!deletedAt || Number.isNaN(deletedAt.getTime())) {
    return { canUndoDelete: false, deleteUndoExpiresAt: null, deleteUndoRemainingMs: 0 };
  }

  const expiresAt = new Date(deletedAt.getTime() + MEASUREMENT_DELETE_UNDO_WINDOW_MS);
  const remainingMs = Math.max(0, expiresAt.getTime() - now.getTime());

  return {
    canUndoDelete: remainingMs > 0,
    deleteUndoExpiresAt: expiresAt.toISOString(),
    deleteUndoRemainingMs: remainingMs
  };
};

const normalizeMeasurement = (doc) => {
  const undoMeta = getMeasurementDeleteUndoMeta(doc);
  const out = {
    id: String(doc._id),
    checkInDate: doc.checkInDate || "",
    updatedAt: doc.updatedAt ? doc.updatedAt.toISOString() : "",
    deletedAt: doc.deletedAt ? new Date(doc.deletedAt).toISOString() : null,
    ...undoMeta,
  };
  for (const key of MEASUREMENT_KEYS) {
    out[key] = doc[key] || "";
  }
  return out;
};

export const getMeasurements = async (req, res) => {
  try {
    const docs = await GymMeasurement.find({ userId: req.user.id }).sort({ checkInDate: -1, updatedAt: -1 });
    res.json(docs.map(normalizeMeasurement));
  } catch (error) {
    gymFailure(res, error);
  }
};

export const createMeasurement = async (req, res) => {
  try {
    const checkInDate = req.body?.checkInDate;
    if (!validGymDay(checkInDate) || checkInDate > toDayKey()) throw gymError(400, "Valid non-future checkInDate (YYYY-MM-DD) is required");
    if (req.body?.expectedToday && (req.body.expectedToday !== toDayKey() || checkInDate !== toDayKey())) throw gymError(409, "The app day changed. Review today’s check-in before saving.");
    const fields = measurementFields(req.body);
    const result = await gymMutation(req.user.id, async session => {
      const existing = await GymMeasurement.findOne({ userId: req.user.id, checkInDate }).session(session);
      if (existing) {
        if (existing.deletedAt) throw gymError(409, "This check-in is deleted. Restore it instead of overwriting its history.");
        if (MEASUREMENT_KEYS.every(key => String(existing[key] || "") === fields[key])) return { status: 200, entry: normalizeMeasurement(existing) };
        throw gymError(409, "A check-in for this date already exists. Reload and use update instead.");
      }
      const [doc] = await GymMeasurement.create([{ userId: req.user.id, checkInDate, ...fields }], { session });
      return { status: 201, entry: normalizeMeasurement(doc) };
    });
    res.status(result.status).json(result.entry);
  } catch (error) { gymFailure(res, error); }
};

export const updateMeasurement = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) throw gymError(400, "Invalid measurement id");
    const result = await gymMutation(req.user.id, async session => {
      const doc = await GymMeasurement.findOne({ _id: req.params.id, userId: req.user.id }).session(session);
      if (!doc) throw gymError(404, "Measurement not found");
      if (doc.deletedAt) throw gymError(409, "This check-in is deleted. Undo deletion before updating.");
      checkGymRevision(doc, req.body);
      if (Object.hasOwn(req.body || {}, "checkInDate") && req.body.checkInDate !== doc.checkInDate) throw gymError(400, "A check-in date cannot be changed");
      if (req.body?.expectedToday && (req.body.expectedToday !== toDayKey() || doc.checkInDate !== toDayKey())) throw gymError(409, "The app day changed. Only today’s check-in can be edited here.");
      Object.assign(doc, measurementFields(req.body, doc));
      await saveGymRecord(doc, req.body, session);
      return normalizeMeasurement(doc);
    });
    res.json(result);
  } catch (error) { gymFailure(res, error); }
};

export const deleteMeasurement = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) throw gymError(400, "Invalid measurement id");
    const result = await gymMutation(req.user.id, async session => {
      const doc = await GymMeasurement.findOne({ _id: req.params.id, userId: req.user.id }).session(session);
      if (!doc) throw gymError(404, "Measurement not found");
      checkGymRevision(doc, req.body);
      if (!doc.deletedAt) { doc.deletedAt = new Date(); await saveGymRecord(doc, req.body, session); }
      return { message: "Measurement deleted. Undo available for 48 hours from its original deletion.", entry: normalizeMeasurement(doc) };
    });
    res.json(result);
  } catch (error) { gymFailure(res, error); }
};

export const undoDeleteMeasurement = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) throw gymError(400, "Invalid measurement id");
    const result = await gymMutation(req.user.id, async session => {
      const doc = await GymMeasurement.findOne({ _id: req.params.id, userId: req.user.id }).session(session);
      if (!doc) throw gymError(404, "Measurement not found");
      checkGymRevision(doc, req.body);
      if (doc.deletedAt) {
        if (!getMeasurementDeleteUndoMeta(doc).canUndoDelete) throw gymError(409, "Restore window expired. Check-in can only be restored within 48 hours of deletion.");
        doc.deletedAt = null;
        await saveGymRecord(doc, req.body, session);
      }
      return { message: "Check-in restored successfully.", entry: normalizeMeasurement(doc) };
    });
    res.json(result);
  } catch (error) { gymFailure(res, error); }
};

/* ─── Exercise Progress ─────────────────────────────────────────────────── */

const EXERCISE_PROGRESS_NUMERIC_FIELDS = ["sets", "reps", "weight", "totalTime", "restBetweenSets"];
const MAX_EXERCISE_PROGRESS_SETS = 20;
const MAX_EXERCISE_PROGRESS_REPS = 200;
const MAX_EXERCISE_PROGRESS_WEIGHT = 1000;
const MAX_EXERCISE_PROGRESS_TOTAL_TIME = 600;
const MAX_EXERCISE_PROGRESS_REST_TIME = 3600;
const MAX_EXERCISE_PROGRESS_NOTES = 1000;

const toBodyGroup = (bodyPart = "") => {
  if (!bodyPart || typeof bodyPart !== "string") return "Other";
  const group = bodyPart.split(" - ")[0]?.trim();
  return group || "Other";
};

const toNumericValue = (value) => {
  const parsed = Number.parseFloat(String(value ?? "").trim());
  return Number.isFinite(parsed) ? parsed : null;
};

const sanitizeIntString = (value, maxValue) => {
  if (value === null || value === undefined || value === "") return "";
  if (!["string", "number"].includes(typeof value) || !/^\d+$/.test(String(value).trim()) || !Number.isSafeInteger(Number(value)) || Number(value) > maxValue) throw gymError(400, `Use a whole number between 0 and ${maxValue}`);
  const parsed = Number.parseInt(String(value).trim(), 10);
  if (!Number.isFinite(parsed)) return "";
  return String(Math.max(0, Math.min(maxValue, parsed)));
};

const sanitizeRepsBreakdownValue = (value, maxPerPart) => {
  if (value === null || value === undefined || value === "") return "";
  if (!["string", "number"].includes(typeof value) || !/^\d+(?:\s*\+\s*\d+)*$/.test(String(value).trim()) || String(value).split("+").some(part => !Number.isSafeInteger(Number(part)) || Number(part) > maxPerPart)) throw gymError(400, `Each rep count must be a whole number between 0 and ${maxPerPart}`);
  const str = String(value).trim();
  const parts = str.split("+").map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return "";
  const sanitized = parts.map((p) => {
    const n = Number.parseInt(p, 10);
    return Number.isFinite(n) ? String(Math.max(0, Math.min(maxPerPart, n))) : null;
  });
  if (sanitized.some((p) => p === null)) return "";
  return sanitized.join("+");
};

const sanitizeFloatString = (value, maxValue) => {
  if (value === null || value === undefined || value === "") return "";
  if (!["string", "number"].includes(typeof value) || !/^\d+(?:\.\d+)?$/.test(String(value).trim()) || !Number.isFinite(Number(value)) || Number(value) > maxValue) throw gymError(400, `Use a non-negative number no greater than ${maxValue}`);
  const parsed = Number.parseFloat(String(value).trim());
  if (!Number.isFinite(parsed)) return "";
  const clamped = Math.max(0, Math.min(maxValue, parsed));
  return String(clamped);
};

const toExerciseProgressLatestMetrics = (doc) => (
  Object.fromEntries(EXERCISE_PROGRESS_NUMERIC_FIELDS.map((field) => [field, toNumericValue(doc?.[field])]))
);

const normalizeExerciseProgress = (doc) => ({
  id: String(doc._id),
  date: doc.date || "",
  exerciseId: doc.exerciseId || "",
  exerciseName: doc.exerciseName || "",
  bodyPart: doc.bodyPart || "",
  sets: doc.sets || "",
  reps: doc.reps || "",
  weight: doc.weight || "",
  lastSetReps: doc.lastSetReps || "",
  lastSetWeight: doc.lastSetWeight || "",
  repsBreakdown: Array.isArray(doc.repsBreakdown) ? doc.repsBreakdown : [],
  totalTime: doc.totalTime || "",
  restBetweenSets: doc.restBetweenSets || "",
  notes: doc.notes || "",
  savedAt: doc.updatedAt ? doc.updatedAt.toISOString() : "",
});

export const getExerciseProgressAnalytics = async (req, res) => {
  try {
    const from = req.query.from ? String(req.query.from).trim() : "";
    const to = req.query.to ? String(req.query.to).trim() : "";
    const group = req.query.group ? String(req.query.group).trim() : "All";
    const selectedExerciseIdQuery = req.query.exerciseId ? String(req.query.exerciseId).trim() : "";

    if (from && !ISO_DATE_RE.test(from)) {
      return res.status(400).json({ message: "from must be in YYYY-MM-DD format" });
    }
    if (to && !ISO_DATE_RE.test(to)) {
      return res.status(400).json({ message: "to must be in YYYY-MM-DD format" });
    }
    if (from && to && from > to) {
      return res.status(400).json({ message: "from cannot be after to" });
    }

    const query = { userId: req.user.id };
    if (from || to) {
      query.date = {};
      if (from) query.date.$gte = from;
      if (to) query.date.$lte = to;
    }

    const docs = await GymExerciseProgress.find(query).sort({ date: 1, updatedAt: 1 });
    const grouped = new Map();

    docs.forEach((doc) => {
      const exerciseId = doc.exerciseId || "";
      if (!exerciseId) return;
      if (!grouped.has(exerciseId)) grouped.set(exerciseId, []);
      grouped.get(exerciseId).push(doc);
    });

    const allRows = [...grouped.entries()].map(([exerciseId, logs]) => {
      const latest = logs[logs.length - 1];
      return {
        exerciseId,
        name: latest?.exerciseName || exerciseId,
        bodyPart: latest?.bodyPart || "",
        bodyGroup: toBodyGroup(latest?.bodyPart || ""),
        logsCount: logs.length,
        lastLoggedDate: latest?.date || "",
        latest: toExerciseProgressLatestMetrics(latest),
      };
    }).sort((left, right) => {
      if (left.lastLoggedDate !== right.lastLoggedDate) {
        return right.lastLoggedDate.localeCompare(left.lastLoggedDate);
      }
      return left.name.localeCompare(right.name);
    });

    const groups = ["All", ...new Set(allRows.map((row) => row.bodyGroup).filter(Boolean))];
    const filteredRows = group === "All"
      ? allRows
      : allRows.filter((row) => row.bodyGroup.toLowerCase() === group.toLowerCase());

    const selectedExerciseId = selectedExerciseIdQuery && filteredRows.some((row) => row.exerciseId === selectedExerciseIdQuery)
      ? selectedExerciseIdQuery
      : (filteredRows[0]?.exerciseId || null);

    let selectedExercise = null;
    if (selectedExerciseId) {
      const logs = grouped.get(selectedExerciseId) || [];
      const latest = logs[logs.length - 1] || null;
      const metricTrends = Object.fromEntries(
        EXERCISE_PROGRESS_NUMERIC_FIELDS.map((field) => [
          field,
          logs
            .map((log) => ({ date: log.date || "", value: toNumericValue(log[field]) }))
            .filter((point) => point.date && point.value != null)
        ])
      );

      selectedExercise = {
        exerciseId: selectedExerciseId,
        name: latest?.exerciseName || selectedExerciseId,
        bodyPart: latest?.bodyPart || "",
        bodyGroup: toBodyGroup(latest?.bodyPart || ""),
        logsCount: logs.length,
        lastLoggedDate: latest?.date || "",
        latest: toExerciseProgressLatestMetrics(latest),
        metrics: metricTrends,
      };
    }

    res.json({
      groups,
      groupFilter: group,
      exercisesShown: filteredRows.length,
      totalExercises: allRows.length,
      totalLogs: docs.length,
      exercises: filteredRows,
      selectedExerciseId,
      selectedExercise,
    });
  } catch (error) {
    gymFailure(res, error);
  }
};

export const getExerciseProgress = async (req, res) => {
  try {
    const query = { userId: req.user.id };

    if (req.query.date) {
      if (!validGymDay(req.query.date)) {
        return res.status(400).json({ message: "date must be in YYYY-MM-DD format" });
      }
      query.date = req.query.date;
    }

    if (req.query.exerciseId) {
      query.exerciseId = String(req.query.exerciseId);
    }

    const docs = await GymExerciseProgress.find(query).sort({ date: -1, updatedAt: -1 });

    const flat = {};
    for (const doc of docs) {
      flat[`${doc.date}_${doc.exerciseId}`] = normalizeExerciseProgress(doc);
    }

    res.json(flat);
  } catch (error) {
    gymFailure(res, error);
  }
};

export const getGymAnalysis = async (req, res) => {
  let days;
  try { days = journalMonthDays(req.query.year, req.query.month); }
  catch { return res.status(400).json({ message: "Use a valid year and month (1–12)." }); }
  const now = new Date(), today = todoReportDay(now, APP_TIMEZONE);
  const clock = { today, timezone: APP_TIMEZONE, serverNow: now.toISOString() };
  if (days[0] > today) return res.status(400).json({ message: "Future months are not available for analysis.", ...clock });
  try {
    const account = await User.findById(req.user.id).select("createdAt").lean();
    if (!account) return res.status(404).json({ message: "Account not found." });
    const through = days.at(-1) < today ? days.at(-1) : today;
    const [current, baseline, measurements, macroPlans] = await Promise.all([
      GymExerciseProgress.find({ userId: req.user.id, date: { $gte: days[0], $lte: through } }, GYM_EXERCISE_FIELDS).lean(),
      // One latest retained pre-period record per exercise: no lifetime exercise history response.
      GymExerciseProgress.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(req.user.id), date: { $lt: days[0] } } },
        { $sort: { date: -1, updatedAt: -1, createdAt: -1, _id: -1 } },
        { $group: { _id: "$exerciseId", entry: { $first: "$$ROOT" } } },
        { $replaceRoot: { newRoot: "$entry" } }, { $project: GYM_EXERCISE_FIELDS },
      ]),
      GymMeasurement.find({ userId: req.user.id, deletedAt: null, checkInDate: { $lte: through } }, GYM_MEASUREMENT_FIELDS).lean(),
      GymDietPlan.find({ userId: req.user.id, planType: "macros", isActive: true },
        { day: 1, planType: 1, isActive: 1, values: 1, updatedAt: 1, createdAt: 1 }).lean(),
    ]);
    return res.json({ year: Number(req.query.year), month: Number(req.query.month), ...clock,
      joinedDay: account.createdAt ? todoReportDay(account.createdAt, APP_TIMEZONE) : null,
      analysis: computeGymAnalysis({ exercises: [...baseline, ...current], measurements, macroPlans },
        { year: req.query.year, month: req.query.month, today }),
      dataNote: GYM_ANALYSIS_NOTE });
  } catch {
    return res.status(500).json({ message: "Could not load Gym Analysis. Please retry." });
  }
};

export const upsertExerciseProgress = async (req, res) => {
  try {
    const { date, exerciseId, repsBreakdown, ...rest } = req.body;
    for (const field of ["exerciseName", "bodyPart", "notes"]) if (rest[field] !== undefined && (typeof rest[field] !== "string" || rest[field].length > (field === "notes" ? 1000 : 180))) throw gymError(400, `${field} must be a string within its length limit`);
    if (repsBreakdown !== undefined && (!Array.isArray(repsBreakdown) || repsBreakdown.length > MAX_EXERCISE_PROGRESS_SETS)) throw gymError(400, "repsBreakdown must be an array of at most 20 entries");

    if (!validGymDay(date)) {
      return res.status(400).json({ message: "date must be in YYYY-MM-DD format" });
    }
    if (req.body.expectedToday !== undefined && (req.body.expectedToday !== toDayKey() || date !== toDayKey())) {
      return res.status(400).json({ message: "The app day has changed. Reload Today before saving progress." });
    }
    if (date > toDayKey()) return res.status(400).json({ message: "Progress cannot be recorded for a future date" });
    if (!exerciseId || typeof exerciseId !== "string" || !exerciseId.trim() || exerciseId.trim().length > 180) {
      return res.status(400).json({ message: "exerciseId is required" });
    }

    const setFields = { exerciseId: exerciseId.trim(), date };

    if (Object.prototype.hasOwnProperty.call(rest, "exerciseName")) {
      setFields.exerciseName = rest.exerciseName != null ? String(rest.exerciseName).trim().slice(0, 180) : "";
    }
    if (Object.prototype.hasOwnProperty.call(rest, "bodyPart")) {
      setFields.bodyPart = rest.bodyPart != null ? String(rest.bodyPart).trim().slice(0, 180) : "";
    }

    if (Object.prototype.hasOwnProperty.call(rest, "sets")) {
      setFields.sets = sanitizeIntString(rest.sets, MAX_EXERCISE_PROGRESS_SETS);
    }
    if (Object.prototype.hasOwnProperty.call(rest, "reps")) {
      setFields.reps = sanitizeIntString(rest.reps, MAX_EXERCISE_PROGRESS_REPS);
    }
    if (Object.prototype.hasOwnProperty.call(rest, "lastSetReps")) {
      setFields.lastSetReps = sanitizeRepsBreakdownValue(rest.lastSetReps, MAX_EXERCISE_PROGRESS_REPS);
    }
    if (Object.prototype.hasOwnProperty.call(rest, "weight")) {
      setFields.weight = sanitizeFloatString(rest.weight, MAX_EXERCISE_PROGRESS_WEIGHT);
    }
    if (Object.prototype.hasOwnProperty.call(rest, "lastSetWeight")) {
      setFields.lastSetWeight = sanitizeFloatString(rest.lastSetWeight, MAX_EXERCISE_PROGRESS_WEIGHT);
    }
    if (Object.prototype.hasOwnProperty.call(rest, "totalTime")) {
      setFields.totalTime = sanitizeFloatString(rest.totalTime, MAX_EXERCISE_PROGRESS_TOTAL_TIME);
    }
    if (Object.prototype.hasOwnProperty.call(rest, "restBetweenSets")) {
      setFields.restBetweenSets = sanitizeFloatString(rest.restBetweenSets, MAX_EXERCISE_PROGRESS_REST_TIME);
    }
    if (Object.prototype.hasOwnProperty.call(rest, "notes")) {
      setFields.notes = rest.notes != null ? String(rest.notes).trim().slice(0, MAX_EXERCISE_PROGRESS_NOTES) : "";
    }

    const resolvedSetsCount = Number.parseInt(String(setFields.sets || rest.sets || "").trim(), 10);
    const limitedSetCount = Number.isFinite(resolvedSetsCount)
      ? Math.max(0, Math.min(MAX_EXERCISE_PROGRESS_SETS, resolvedSetsCount))
      : null;

    if (Array.isArray(repsBreakdown)) {
      const sanitizedBreakdown = repsBreakdown
        .slice(0, MAX_EXERCISE_PROGRESS_SETS)
        .map((value) => sanitizeRepsBreakdownValue(value, MAX_EXERCISE_PROGRESS_REPS));

      if (limitedSetCount != null) {
        setFields.repsBreakdown = sanitizedBreakdown.slice(0, limitedSetCount);
      } else {
        setFields.repsBreakdown = sanitizedBreakdown;
        if (!setFields.sets && sanitizedBreakdown.length > 0) {
          setFields.sets = String(sanitizedBreakdown.length);
        }
      }
    }

    const filter = { userId: req.user.id, date, exerciseId: exerciseId.trim() };
    const expected = req.body.expectedUpdatedAt;
    if (expected !== undefined && (typeof expected !== "string" || !Number.isFinite(Date.parse(expected)))) throw gymError(400, "expectedUpdatedAt must be a valid timestamp");
    let doc;
    try {
      doc = await GymExerciseProgress.findOneAndUpdate(expected === undefined ? filter : { ...filter, updatedAt: new Date(expected) }, { $set: { ...setFields, updatedAt: new Date(Math.max(Date.now(), expected === undefined ? 0 : Date.parse(expected) + 1)) }, ...(expected === undefined ? { $setOnInsert: { createdAt: new Date() } } : {}) },
        { upsert: expected === undefined, new: true, setDefaultsOnInsert: true, runValidators: true, timestamps: false });
      if (!doc) throw gymError(409, "This exercise progress changed in another request. Reload Gym before trying again.");
    } catch (failure) {
      if (failure.code !== 11000) throw failure;
      doc = await GymExerciseProgress.findOneAndUpdate(filter, { $set: setFields }, { new: true, runValidators: true });
      if (!doc) throw failure;
    }

    res.status(200).json(normalizeExerciseProgress(doc));
  } catch (error) {
    gymFailure(res, error);
  }
};
