import Workout from "../models/Workout.js";
import WorkoutPlan from "../models/WorkoutPlan.js";
import WorkoutPlanLog from "../models/WorkoutPlanLog.js";
import GymExerciseProgress from "../models/GymExerciseProgress.js";
import GymGalleryEntry from "../models/GymGalleryEntry.js";
import GymCustomExercise from "../models/GymCustomExercise.js";
import GymDietPlan from "../models/GymDietPlan.js";
import GymMeasurement from "../models/GymMeasurement.js";
import mongoose from "mongoose";

const MAX_GALLERY_IMAGES_PER_REQUEST = 6;
const MAX_GALLERY_IMAGES_PER_CHECKIN = 12;
const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp"
]);
const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DIET_PLAN_TYPES = new Set(["diet", "workoutNutrition", "supplements", "macros"]);
const DIET_MEAL_SECTIONS = ["morning", "breakfast", "lunch", "evening", "dinner"];
const WORKOUT_NUTRITION_SECTIONS = ["preWorkout", "postWorkout"];
const MACRO_FIELDS = ["protein", "carbs", "fats", "fiber", "calories", "water", "sugar", "sodium"];
const WEEK_DAY_BY_INDEX = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const SERVER_TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

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
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const isValidImageDataUrl = (value) => {
  if (typeof value !== "string") return false;
  const match = value.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,/);
  if (!match) return false;
  return ALLOWED_IMAGE_MIME_TYPES.has(match[1].toLowerCase());
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
    throw new Error("Time must be in HH:mm format");
  }
  return value;
};

const normalizeDayValue = (value) => {
  const day = typeof value === "string" ? value.trim() : "";
  if (!WEEK_DAYS.includes(day)) {
    throw new Error("day must be one of Mon, Tue, Wed, Thu, Fri, Sat, Sun");
  }
  return day;
};

const normalizePlanTypeValue = (value) => {
  const planType = typeof value === "string" ? value.trim() : "";
  if (!DIET_PLAN_TYPES.has(planType)) {
    throw new Error("planType must be diet, workoutNutrition, supplements, or macros");
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
  if (!Array.isArray(value)) throw new Error(`${sectionName} must be an array`);

  return value.map((entry) => {
    const rawName = typeof entry?.name === "string" ? entry.name.trim() : "";
    if (!rawName) throw new Error(`${sectionName} meal name is required`);
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
    throw new Error("meals must be an object");
  }

  const sections = planType === "diet" ? DIET_MEAL_SECTIONS : WORKOUT_NUTRITION_SECTIONS;
  sections.forEach((section) => {
    mealMap[section] = normalizeMealEntries(payload?.[section], section);
  });

  return mealMap;
};

const normalizeSupplementItems = (value) => {
  if (value === null || value === undefined) return [];
  if (!Array.isArray(value)) throw new Error("items must be an array");

  return value.map((entry) => {
    const rawName = typeof entry?.name === "string" ? entry.name.trim() : "";
    if (!rawName) throw new Error("Supplement name is required");
    return {
      name: rawName.slice(0, 180),
      time: normalizeTimeValue(entry?.time)
    };
  });
};

const normalizeMacroFieldValue = (value, fieldName) => {
  if (value === null || value === undefined || value === "") return "";
  const normalized = String(value).trim();
  if (!normalized) return "";
  if (!/^\d+(?:\.\d+)?$/.test(normalized)) {
    throw new Error(`${fieldName} must be a non-negative number`);
  }
  return normalized.slice(0, 24);
};

const normalizeMacroValues = (value) => {
  if (value === null || value === undefined) {
    return Object.fromEntries(MACRO_FIELDS.map((field) => [field, ""]));
  }
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new Error("values must be an object");
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

const deactivateOtherPlansForDay = async ({ userId, planType, day, currentPlanId }) => {
  await GymDietPlan.updateMany(
    {
      userId,
      planType,
      day,
      isActive: true,
      _id: { $ne: currentPlanId }
    },
    { $set: { isActive: false } }
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
    const status = error?.message?.includes("must be") ? 400 : 500;
    res.status(status).json({ message: error.message });
  }
};

export const createGymDietPlan = async (req, res) => {
  try {
    const planType = normalizePlanTypeValue(req.body?.planType);
    const day = normalizeDayValue(req.body?.day);
    const copiedFromId = normalizeCopiedFromId(req.body?.copiedFromId);
    const isActive = Boolean(req.body?.isActive);

    const payload = {
      userId: req.user.id,
      planType,
      day,
      isActive,
      copiedFromId,
      meals: normalizeMealsPayload(planType, req.body?.meals),
      items: planType === "supplements" ? normalizeSupplementItems(req.body?.items) : [],
      values: planType === "macros" ? normalizeMacroValues(req.body?.values) : normalizeMacroValues(null)
    };

    const plan = await GymDietPlan.create(payload);

    if (plan.isActive) {
      await deactivateOtherPlansForDay({
        userId: req.user.id,
        planType: plan.planType,
        day: plan.day,
        currentPlanId: plan._id
      });
    }

    res.status(201).json(normalizeDietPlan(plan));
  } catch (error) {
    const status = error?.message?.includes("must be") || error?.message?.includes("required") ? 400 : 500;
    res.status(status).json({ message: error.message });
  }
};

export const updateGymDietPlan = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid diet plan id" });
    }

    const plan = await GymDietPlan.findOne({ _id: req.params.id, userId: req.user.id });
    if (!plan) {
      return res.status(404).json({ message: "Diet plan not found" });
    }

    if (req.body?.planType && req.body.planType !== plan.planType) {
      return res.status(400).json({ message: "planType cannot be changed for an existing plan" });
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "day")) {
      plan.day = normalizeDayValue(req.body.day);
    }
    if (Object.prototype.hasOwnProperty.call(req.body, "copiedFromId")) {
      plan.copiedFromId = normalizeCopiedFromId(req.body.copiedFromId);
    }
    if (Object.prototype.hasOwnProperty.call(req.body, "isActive")) {
      plan.isActive = Boolean(req.body.isActive);
    }

    if (plan.planType === "diet" || plan.planType === "workoutNutrition") {
      if (Object.prototype.hasOwnProperty.call(req.body, "meals")) {
        plan.meals = normalizeMealsPayload(plan.planType, req.body.meals);
      }
    } else if (plan.planType === "supplements") {
      if (Object.prototype.hasOwnProperty.call(req.body, "items")) {
        plan.items = normalizeSupplementItems(req.body.items);
      }
    } else if (plan.planType === "macros") {
      if (Object.prototype.hasOwnProperty.call(req.body, "values")) {
        plan.values = normalizeMacroValues(req.body.values);
      }
    }

    await plan.save();

    if (plan.isActive) {
      await deactivateOtherPlansForDay({
        userId: req.user.id,
        planType: plan.planType,
        day: plan.day,
        currentPlanId: plan._id
      });
    }

    res.json(normalizeDietPlan(plan));
  } catch (error) {
    const status = error?.message?.includes("must be") || error?.message?.includes("required") ? 400 : 500;
    res.status(status).json({ message: error.message });
  }
};

export const toggleGymDietPlanActive = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid diet plan id" });
    }

    const plan = await GymDietPlan.findOne({ _id: req.params.id, userId: req.user.id });
    if (!plan) {
      return res.status(404).json({ message: "Diet plan not found" });
    }

    plan.isActive = !plan.isActive;
    await plan.save();

    if (plan.isActive) {
      await deactivateOtherPlansForDay({
        userId: req.user.id,
        planType: plan.planType,
        day: plan.day,
        currentPlanId: plan._id
      });
    }

    const plans = await GymDietPlan.find({
      userId: req.user.id,
      planType: plan.planType
    }).sort({ createdAt: -1 });

    res.json(plans.map(normalizeDietPlan));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const copyGymDietPlanToDay = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid diet plan id" });
    }

    const targetDay = normalizeDayValue(req.body?.day);
    const plan = await GymDietPlan.findOne({ _id: req.params.id, userId: req.user.id });
    if (!plan) {
      return res.status(404).json({ message: "Diet plan not found" });
    }

    const sourceRootId = plan.copiedFromId || String(plan._id);
    const sourceMatcher = [{ copiedFromId: sourceRootId }];
    if (mongoose.Types.ObjectId.isValid(sourceRootId)) {
      sourceMatcher.push({ _id: sourceRootId });
    }

    const existing = await GymDietPlan.findOne({
      userId: req.user.id,
      planType: plan.planType,
      day: targetDay,
      $or: sourceMatcher
    });

    if (existing) {
      return res.status(409).json({ message: `Plan already copied to ${targetDay}` });
    }

    const copied = await GymDietPlan.create({
      userId: req.user.id,
      planType: plan.planType,
      day: targetDay,
      isActive: false,
      copiedFromId: sourceRootId,
      meals: plan.meals?.toObject ? plan.meals.toObject() : plan.meals,
      items: Array.isArray(plan.items) ? plan.items.map((item) => ({
        name: item.name,
        time: item.time || ""
      })) : [],
      values: plan.values?.toObject ? plan.values.toObject() : plan.values
    });

    res.status(201).json(normalizeDietPlan(copied));
  } catch (error) {
    const status = error?.message?.includes("must be") ? 400 : 500;
    res.status(status).json({ message: error.message });
  }
};

export const deleteGymDietPlan = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid diet plan id" });
    }

    const plan = await GymDietPlan.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!plan) {
      return res.status(404).json({ message: "Diet plan not found" });
    }

    res.json({ message: "Diet plan deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
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
    res.status(500).json({ message: error.message });
  }
};

export const getWorkouts = async (req, res) => {
  try {
    const workouts = await Workout.find({ userId: req.user.id }).sort({ date: -1 });
    res.json(workouts);
  } catch (error) {
    res.status(500).json({ message: error.message });
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
    res.status(500).json({ message: error.message });
  }
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

    /* unique exercise IDs updated today */
    const updatedExerciseIds = new Set(todaysProgressEntries.map((e) => e.exerciseId));
    const progressUpdatesToday = updatedExerciseIds.size;

    /* total exercises scheduled today across all active plans */
    const totalExercisesToday = todaysWorkoutPlans.reduce(
      (sum, plan) => sum + (Array.isArray(plan.exercises) ? plan.exercises.length : 0),
      0
    );
    const completedProgress = Math.min(progressUpdatesToday, totalExercisesToday);
    const totalProgress = totalExercisesToday;
    const pendingUpdates = Math.max(0, totalProgress - completedProgress);

    const latestGalleryUploadDate = latestGalleryUpload?.[0]?.latestUploadedAt
      ? toDayKey(latestGalleryUpload[0].latestUploadedAt)
      : null;

    res.json({
      date: todayKey,
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
    res.status(500).json({ message: error.message });
  }
};

export const getGymHeatmap = async (req, res) => {
  try {
    const { year } = req.query;
    const parsedYear = Number.parseInt(year, 10);
    const hasYearFilter = Number.isFinite(parsedYear);

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
    res.status(500).json({ message: error.message });
  }
};

export const getGymGalleryEntries = async (req, res) => {
  try {
    const entries = await GymGalleryEntry.find({ userId: req.user.id }).sort({ checkInDate: -1, createdAt: -1 });
    const normalized = entries.map(normalizeGalleryEntry);
    res.json(normalized);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const uploadGymGalleryImages = async (req, res) => {
  try {
    const resolvedDate = req.body?.date ? parseDateInput(req.body.date) : new Date();
    if (!resolvedDate) {
      return res.status(400).json({ message: "date must be a valid YYYY-MM-DD value" });
    }

    const incomingImages = Array.isArray(req.body?.images) ? req.body.images : [];
    if (incomingImages.length === 0) {
      return res.status(400).json({ message: "At least one image is required" });
    }
    if (incomingImages.length > MAX_GALLERY_IMAGES_PER_REQUEST) {
      return res.status(400).json({ message: `You can upload up to ${MAX_GALLERY_IMAGES_PER_REQUEST} images at once` });
    }

    const normalizedImages = incomingImages
      .filter((image) => typeof image === "string")
      .map((image) => image.trim())
      .filter(Boolean);

    if (normalizedImages.length !== incomingImages.length || normalizedImages.some((image) => !isValidImageDataUrl(image))) {
      return res.status(400).json({ message: "Only JPG, PNG, and WEBP image uploads are supported" });
    }

    const checkInDate = getStartOfDay(resolvedDate);
    let entry = await GymGalleryEntry.findOne({
      userId: req.user.id,
      checkInDate
    });

    if (!entry) {
      entry = new GymGalleryEntry({
        userId: req.user.id,
        checkInDate,
        images: []
      });
    }

    const nextImageCount = entry.images.length + normalizedImages.length;
    if (nextImageCount > MAX_GALLERY_IMAGES_PER_CHECKIN) {
      return res.status(400).json({
        message: `Each check-in can have up to ${MAX_GALLERY_IMAGES_PER_CHECKIN} images`
      });
    }

    normalizedImages.forEach((src) => {
      entry.images.push({ src });
    });

    await entry.save();
    res.status(201).json(normalizeGalleryEntry(entry));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteGymGalleryImage = async (req, res) => {
  try {
    const { entryId, imageId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(entryId) || !mongoose.Types.ObjectId.isValid(imageId)) {
      return res.status(400).json({ message: "Invalid gallery id or image id" });
    }

    const entry = await GymGalleryEntry.findOne({
      _id: entryId,
      userId: req.user.id
    });

    if (!entry) {
      return res.status(404).json({ message: "Gallery entry not found" });
    }

    const image = entry.images.id(imageId);
    if (!image) {
      return res.status(404).json({ message: "Image not found" });
    }

    image.deleteOne();

    if (entry.images.length === 0) {
      await entry.deleteOne();
      return res.json({
        message: "Image deleted",
        deletedEntryId: entryId
      });
    }

    await entry.save();
    res.json({
      message: "Image deleted",
      entry: normalizeGalleryEntry(entry)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
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
    res.status(500).json({ message: error.message });
  }
};

export const getGymCustomExercises = async (req, res) => {
  try {
    const exercises = await GymCustomExercise.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(exercises.map(normalizeCustomExercise));
  } catch (error) {
    res.status(500).json({ message: error.message });
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
    const duplicate = await GymCustomExercise.findOne({
      userId: req.user.id,
      $expr: {
        $and: [
          { $eq: [{ $toLower: "$name" }, normalizedName] },
          { $eq: [{ $toLower: "$bodyPart" }, normalizedBodyPart] }
        ]
      }
    });
    if (duplicate) {
      return res.status(409).json({ message: "This workout already exists in your library" });
    }

    const exercise = await GymCustomExercise.create({
      userId: req.user.id,
      name,
      bodyGroup,
      bodySection,
      bodyPart
    });

    res.status(201).json(normalizeCustomExercise(exercise));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteGymCustomExercise = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid workout id" });
    }

    const exercise = await GymCustomExercise.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!exercise) {
      return res.status(404).json({ message: "Workout not found" });
    }

    res.json({ message: "Workout removed from library" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ─── Workout Plan helpers ──────────────────────────────────────────────── */

const VALID_PLAN_DAYS = new Set(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
const VALID_PLAN_ACTIONS = new Set(["created", "updated", "deleted", "copied", "activated", "deactivated", "restored"]);
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const HH_MM_RE = /^\d{2}:\d{2}$/;

const sanitizePlanDays = (days) => {
  if (!Array.isArray(days)) return null;
  const unique = [...new Set(days.filter((d) => typeof d === "string"))];
  const invalid = unique.filter((d) => !VALID_PLAN_DAYS.has(d));
  if (invalid.length > 0) return { error: `Invalid days: ${invalid.join(", ")}` };
  return unique;
};

const validatePlanBody = (body, isCreate) => {
  const { title, days, startDate, endDate, neverEnds, exercises } = body;

  if (isCreate || title !== undefined) {
    if (!title || typeof title !== "string" || !title.trim()) {
      return "Title is required";
    }
  }

  if (isCreate || days !== undefined) {
    const result = sanitizePlanDays(days);
    if (result === null) return "days must be an array";
    if (result.error) return result.error;
    if (isCreate && result.length === 0) return "At least one day is required";
  }

  if (startDate !== undefined && startDate && !ISO_DATE_RE.test(startDate)) {
    return "startDate must be in YYYY-MM-DD format";
  }

  if (endDate !== undefined && endDate && !ISO_DATE_RE.test(endDate)) {
    return "endDate must be in YYYY-MM-DD format";
  }

  const resolvedNeverEnds = neverEnds !== undefined ? Boolean(neverEnds) : true;
  if (!resolvedNeverEnds && endDate && startDate && endDate < startDate) {
    return "endDate cannot be before startDate";
  }

  if (exercises !== undefined && !Array.isArray(exercises)) {
    return "exercises must be an array";
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
    res.status(500).json({ message: error.message });
  }
};

export const createWorkoutPlan = async (req, res) => {
  try {
    const validationError = validatePlanBody(req.body, true);
    if (validationError) return res.status(400).json({ message: validationError });

    const {
      title, goalType, workoutSplit, totalEstimatedTime,
      days, startDate, neverEnds, endDate, difficulty,
      exercises, copiedFromId,
    } = req.body;

    const cleanDays = sanitizePlanDays(days);

    const plan = await WorkoutPlan.create({
      userId: req.user.id,
      title: title.trim(),
      goalType: typeof goalType === "string" ? goalType.trim() : "",
      workoutSplit: typeof workoutSplit === "string" ? workoutSplit.trim() : "",
      totalEstimatedTime: totalEstimatedTime != null ? String(totalEstimatedTime).trim() : "",
      days: cleanDays,
      startDate: typeof startDate === "string" ? startDate.trim() : "",
      neverEnds: neverEnds !== false,
      endDate: typeof endDate === "string" ? endDate.trim() : "",
      difficulty: typeof difficulty === "string" ? difficulty.trim() : "",
      exercises: Array.isArray(exercises) ? exercises : [],
      isActive: false,
      copiedFromId: copiedFromId ? String(copiedFromId) : null,
    });

    res.status(201).json(normalizeWorkoutPlan(plan));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateWorkoutPlan = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid plan id" });
    }

    const plan = await WorkoutPlan.findOne({ _id: req.params.id, userId: req.user.id });
    if (!plan) return res.status(404).json({ message: "Workout plan not found" });

    const validationError = validatePlanBody(req.body, false);
    if (validationError) return res.status(400).json({ message: validationError });

    const { title, goalType, workoutSplit, totalEstimatedTime, days, startDate, neverEnds, endDate, difficulty, exercises } = req.body;

    if (title !== undefined) plan.title = title.trim();
    if (goalType !== undefined) plan.goalType = typeof goalType === "string" ? goalType.trim() : "";
    if (workoutSplit !== undefined) plan.workoutSplit = typeof workoutSplit === "string" ? workoutSplit.trim() : "";
    if (totalEstimatedTime !== undefined) plan.totalEstimatedTime = totalEstimatedTime != null ? String(totalEstimatedTime).trim() : "";
    if (days !== undefined) plan.days = sanitizePlanDays(days);
    if (startDate !== undefined) plan.startDate = typeof startDate === "string" ? startDate.trim() : "";
    if (neverEnds !== undefined) plan.neverEnds = Boolean(neverEnds);
    if (endDate !== undefined) plan.endDate = typeof endDate === "string" ? endDate.trim() : "";
    if (difficulty !== undefined) plan.difficulty = typeof difficulty === "string" ? difficulty.trim() : "";
    if (exercises !== undefined) plan.exercises = Array.isArray(exercises) ? exercises : plan.exercises;

    await plan.save();
    res.json(normalizeWorkoutPlan(plan));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteWorkoutPlan = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid plan id" });
    }

    const plan = await WorkoutPlan.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!plan) return res.status(404).json({ message: "Workout plan not found" });

    res.json({ message: "Workout plan deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const toggleWorkoutPlanActive = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid plan id" });
    }

    const plan = await WorkoutPlan.findOne({ _id: req.params.id, userId: req.user.id });
    if (!plan) return res.status(404).json({ message: "Workout plan not found" });

    plan.isActive = !plan.isActive;
    await plan.save();

    if (plan.isActive && Array.isArray(plan.days) && plan.days.length > 0) {
      await WorkoutPlan.updateMany(
        { userId: req.user.id, _id: { $ne: plan._id }, days: { $in: plan.days }, isActive: true },
        { $set: { isActive: false } }
      );
    }

    const allPlans = await WorkoutPlan.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(allPlans.map(normalizeWorkoutPlan));
  } catch (error) {
    res.status(500).json({ message: error.message });
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
    res.status(500).json({ message: error.message });
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
    if (!date || !ISO_DATE_RE.test(date)) {
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
    res.status(500).json({ message: error.message });
  }
};

const MEASUREMENT_KEYS = [
  "bodyWeight", "chest", "upperChest", "lowerChest", "waist", "upperWaist",
  "lowerWaist", "shoulders", "neck", "hips", "armsBiceps", "leftArm", "rightArm",
  "forearms", "leftForearm", "rightForearm", "thighs", "leftThigh", "rightThigh",
  "calves", "leftCalf", "rightCalf", "ankle",
];
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
    res.status(500).json({ message: error.message });
  }
};

export const createMeasurement = async (req, res) => {
  try {
    const checkInDate = typeof req.body?.checkInDate === "string" ? req.body.checkInDate.trim() : "";
    if (!checkInDate || !/^\d{4}-\d{2}-\d{2}$/.test(checkInDate)) {
      return res.status(400).json({ message: "Valid checkInDate (YYYY-MM-DD) is required" });
    }

    const existing = await GymMeasurement.findOne({ userId: req.user.id, checkInDate });
    if (existing && !existing.deletedAt) {
      return res.status(409).json({ message: "A check-in for this date already exists. Use update instead." });
    }

    const fields = { checkInDate, deletedAt: null };
    for (const key of MEASUREMENT_KEYS) {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) {
        fields[key] = String(req.body[key] ?? "").trim();
      }
    }

    if (existing && existing.deletedAt) {
      Object.assign(existing, fields);
      existing.userId = req.user.id;
      await existing.save();
      return res.status(201).json(normalizeMeasurement(existing));
    }

    const doc = await GymMeasurement.create({ userId: req.user.id, ...fields });
    return res.status(201).json(normalizeMeasurement(doc));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateMeasurement = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid measurement id" });
    }

    const doc = await GymMeasurement.findOne({ _id: req.params.id, userId: req.user.id });
    if (!doc) return res.status(404).json({ message: "Measurement not found" });
    if (doc.deletedAt) {
      return res.status(409).json({ message: "This check-in is deleted. Undo deletion before updating." });
    }

    for (const key of MEASUREMENT_KEYS) {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) {
        doc[key] = String(req.body[key] ?? "").trim();
      }
    }

    await doc.save();
    res.json(normalizeMeasurement(doc));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteMeasurement = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid measurement id" });
    }

    const doc = await GymMeasurement.findOne({ _id: req.params.id, userId: req.user.id });
    if (!doc) return res.status(404).json({ message: "Measurement not found" });

    doc.deletedAt = new Date();
    await doc.save();

    res.json({
      message: "Measurement deleted. Undo available for 48 hours.",
      entry: normalizeMeasurement(doc)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const undoDeleteMeasurement = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid measurement id" });
    }

    const doc = await GymMeasurement.findOne({ _id: req.params.id, userId: req.user.id });
    if (!doc) return res.status(404).json({ message: "Measurement not found" });
    if (!doc.deletedAt) return res.status(400).json({ message: "This check-in is not deleted." });

    const undoMeta = getMeasurementDeleteUndoMeta(doc);
    if (!undoMeta.canUndoDelete) {
      return res.status(409).json({
        message: "Restore window expired. Check-in can only be restored within 48 hours of deletion."
      });
    }

    doc.deletedAt = null;
    await doc.save();

    res.json({
      message: "Check-in restored successfully.",
      entry: normalizeMeasurement(doc)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
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
  const parsed = Number.parseInt(String(value).trim(), 10);
  if (!Number.isFinite(parsed)) return "";
  return String(Math.max(0, Math.min(maxValue, parsed)));
};

const sanitizeRepsBreakdownValue = (value, maxPerPart) => {
  if (value === null || value === undefined || value === "") return "";
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
  const parsed = Number.parseFloat(String(value).trim());
  if (!Number.isFinite(parsed)) return "";
  const clamped = Math.max(0, Math.min(maxValue, parsed));
  const rounded = Math.round(clamped * 100) / 100;
  return String(rounded);
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
    res.status(500).json({ message: error.message });
  }
};

export const getExerciseProgress = async (req, res) => {
  try {
    const query = { userId: req.user.id };

    if (req.query.date) {
      if (!ISO_DATE_RE.test(req.query.date)) {
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
    res.status(500).json({ message: error.message });
  }
};

export const upsertExerciseProgress = async (req, res) => {
  try {
    const { date, exerciseId, repsBreakdown, ...rest } = req.body;

    if (!date || !ISO_DATE_RE.test(date)) {
      return res.status(400).json({ message: "date must be in YYYY-MM-DD format" });
    }
    if (!exerciseId || typeof exerciseId !== "string" || !exerciseId.trim()) {
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

    const doc = await GymExerciseProgress.findOneAndUpdate(
      { userId: req.user.id, date, exerciseId: exerciseId.trim() },
      { $set: setFields },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(200).json(normalizeExerciseProgress(doc));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
