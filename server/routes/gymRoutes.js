import express from "express";
import {
  createGymCustomExercise,
  createWorkout,
  createWorkoutPlan,
  createWorkoutPlanLog,
  createGymDietPlan,
  copyGymDietPlanToDay,
  deleteGymDietPlan,
  deleteGymGalleryImage,
  deleteGymCustomExercise,
  deleteWorkout,
  deleteWorkoutPlan,
  getGymGalleryEntries,
  getGymGallerySummary,
  getGymDietPlans,
  getGymCustomExercises,
  getGymAnalysis,
  getGymHeatmap,
  getGymSummary,
  getWorkouts,
  getWorkoutPlans,
  getWorkoutPlanLogs,
  getExerciseProgressAnalytics,
  getExerciseProgress,
  upsertExerciseProgress,
  toggleGymDietPlanActive,
  toggleWorkoutPlanActive,
  updateGymDietPlan,
  updateWorkoutPlan,
  uploadGymGalleryImages,
  getMeasurements,
  createMeasurement,
  updateMeasurement,
  deleteMeasurement,
  undoDeleteMeasurement,
} from "../controllers/gymController.js";
import { protect } from "../middleware/authMiddleware.js";
import { createRateLimiterChain } from "../middleware/rateLimit.js";

const router = express.Router();
const galleryUploadLimiter = createRateLimiterChain([
  {
    keyPrefix: "gym-gallery-upload",
    windowMs: Number(process.env.GYM_GALLERY_RATE_LIMIT_WINDOW_MS || 300_000),
    max: Number(process.env.GYM_GALLERY_RATE_LIMIT_MAX || 8),
    message: "Gallery uploads are being sent too quickly. Please wait a moment before uploading more images.",
  },
  {
    keyPrefix: "gym-gallery-upload-daily",
    windowMs: Number(process.env.GYM_GALLERY_RATE_LIMIT_DAILY_WINDOW_MS || 86_400_000),
    max: Number(process.env.GYM_GALLERY_RATE_LIMIT_DAILY_MAX || 1),
    message: "You have reached the daily gallery upload limit for this portfolio project. Please try again tomorrow.",
  },
]);
const exerciseProgressWriteLimiter = createRateLimiterChain([
  {
    keyPrefix: "gym-exercise-progress-write",
    windowMs: Number(process.env.GYM_EXERCISE_PROGRESS_RATE_LIMIT_WINDOW_MS || 60_000),
    max: Number(process.env.GYM_EXERCISE_PROGRESS_RATE_LIMIT_MAX || 30),
    message: "Exercise progress is being updated too quickly. Please slow down for a moment.",
  },
  {
    keyPrefix: "gym-exercise-progress-write-daily",
    windowMs: Number(process.env.GYM_EXERCISE_PROGRESS_RATE_LIMIT_DAILY_WINDOW_MS || 86_400_000),
    max: Number(process.env.GYM_EXERCISE_PROGRESS_RATE_LIMIT_DAILY_MAX || 5),
    message: "You have reached the daily exercise progress update limit for this portfolio project. Please try again tomorrow.",
  },
]);
const measurementWriteLimiter = createRateLimiterChain([
  {
    keyPrefix: "gym-measurement-write",
    windowMs: Number(process.env.GYM_MEASUREMENT_RATE_LIMIT_WINDOW_MS || 60_000),
    max: Number(process.env.GYM_MEASUREMENT_RATE_LIMIT_MAX || 20),
    message: "Measurements are being updated too quickly. Please try again shortly.",
  },
  {
    keyPrefix: "gym-measurement-write-daily",
    windowMs: Number(process.env.GYM_MEASUREMENT_RATE_LIMIT_DAILY_WINDOW_MS || 86_400_000),
    max: Number(process.env.GYM_MEASUREMENT_RATE_LIMIT_DAILY_MAX || 2),
    message: "You have reached the daily measurement update limit for this portfolio project. Please try again tomorrow.",
  },
]);
const workoutDietWriteLimiter = createRateLimiterChain([
  {
    keyPrefix: "gym-workout-diet-write-daily",
    windowMs: Number(process.env.GYM_WORKOUT_DIET_WRITE_RATE_LIMIT_DAILY_WINDOW_MS || 86_400_000),
    max: Number(process.env.GYM_WORKOUT_DIET_WRITE_RATE_LIMIT_DAILY_MAX || 5),
    message: "You have reached the daily workout or diet update limit for this portfolio project. Please try again tomorrow.",
  },
]);

router.use(protect);

router.get("/analysis", getGymAnalysis);
router.get("/heatmap", getGymHeatmap);
router.get("/summary", getGymSummary);
router.get("/plans/logs", getWorkoutPlanLogs);
router.post("/plans/logs", workoutDietWriteLimiter, createWorkoutPlanLog);
router.get("/plans", getWorkoutPlans);
router.post("/plans", workoutDietWriteLimiter, createWorkoutPlan);
router.patch("/plans/:id/active", workoutDietWriteLimiter, toggleWorkoutPlanActive);
router.patch("/plans/:id", workoutDietWriteLimiter, updateWorkoutPlan);
router.delete("/plans/:id", workoutDietWriteLimiter, deleteWorkoutPlan);
router.get("/library", getGymCustomExercises);
router.post("/library", workoutDietWriteLimiter, createGymCustomExercise);
router.delete("/library/:id", workoutDietWriteLimiter, deleteGymCustomExercise);
router.get("/gallery", getGymGalleryEntries);
router.get("/gallery/summary", getGymGallerySummary);
router.post("/gallery", galleryUploadLimiter, uploadGymGalleryImages);
router.delete("/gallery/:entryId/images/:imageId", workoutDietWriteLimiter, deleteGymGalleryImage);
router.get("/diet-plans", getGymDietPlans);
router.post("/diet-plans", workoutDietWriteLimiter, createGymDietPlan);
router.post("/diet-plans/:id/copy", workoutDietWriteLimiter, copyGymDietPlanToDay);
router.patch("/diet-plans/:id/active", workoutDietWriteLimiter, toggleGymDietPlanActive);
router.patch("/diet-plans/:id", workoutDietWriteLimiter, updateGymDietPlan);
router.delete("/diet-plans/:id", workoutDietWriteLimiter, deleteGymDietPlan);
router.get("/exercise-progress/analytics", getExerciseProgressAnalytics);
router.get("/exercise-progress", getExerciseProgress);
router.post("/exercise-progress", exerciseProgressWriteLimiter, upsertExerciseProgress);
router.get("/measurements", getMeasurements);
router.post("/measurements", measurementWriteLimiter, createMeasurement);
router.patch("/measurements/:id", measurementWriteLimiter, updateMeasurement);
router.patch("/measurements/:id/undo-delete", measurementWriteLimiter, undoDeleteMeasurement);
router.delete("/measurements/:id", measurementWriteLimiter, deleteMeasurement);
router.route("/").post(workoutDietWriteLimiter, createWorkout).get(getWorkouts);
router.delete("/:id", workoutDietWriteLimiter, deleteWorkout);

export default router;
