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

const router = express.Router();

router.use(protect);

router.get("/analysis", getGymAnalysis);
router.get("/heatmap", getGymHeatmap);
router.get("/summary", getGymSummary);
router.get("/plans/logs", getWorkoutPlanLogs);
router.post("/plans/logs", createWorkoutPlanLog);
router.get("/plans", getWorkoutPlans);
router.post("/plans", createWorkoutPlan);
router.patch("/plans/:id/active", toggleWorkoutPlanActive);
router.patch("/plans/:id", updateWorkoutPlan);
router.delete("/plans/:id", deleteWorkoutPlan);
router.get("/library", getGymCustomExercises);
router.post("/library", createGymCustomExercise);
router.delete("/library/:id", deleteGymCustomExercise);
router.get("/gallery", getGymGalleryEntries);
router.get("/gallery/summary", getGymGallerySummary);
router.post("/gallery", uploadGymGalleryImages);
router.delete("/gallery/:entryId/images/:imageId", deleteGymGalleryImage);
router.get("/diet-plans", getGymDietPlans);
router.post("/diet-plans", createGymDietPlan);
router.post("/diet-plans/:id/copy", copyGymDietPlanToDay);
router.patch("/diet-plans/:id/active", toggleGymDietPlanActive);
router.patch("/diet-plans/:id", updateGymDietPlan);
router.delete("/diet-plans/:id", deleteGymDietPlan);
router.get("/exercise-progress/analytics", getExerciseProgressAnalytics);
router.get("/exercise-progress", getExerciseProgress);
router.post("/exercise-progress", upsertExerciseProgress);
router.get("/measurements", getMeasurements);
router.post("/measurements", createMeasurement);
router.patch("/measurements/:id", updateMeasurement);
router.patch("/measurements/:id/undo-delete", undoDeleteMeasurement);
router.delete("/measurements/:id", deleteMeasurement);
router.route("/").post(createWorkout).get(getWorkouts);
router.delete("/:id", deleteWorkout);

export default router;
