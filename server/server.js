import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

app.use(cors());
app.use(express.json({ limit: "25mb" }));

// Models
// Importing these files ensures all MonkMode schemas are registered with Mongoose
// as soon as the server starts.
import User from "./models/User.js";
import Habit from "./models/Habit.js";
import HabitLog from "./models/HabitLog.js";
import Todo from "./models/Todo.js";
import Goal from "./models/Goal.js";
import GoalProgressLog from "./models/GoalProgressLog.js";
import Journal from "./models/Journal.js";
import GymGalleryEntry from "./models/GymGalleryEntry.js";
import GymCustomExercise from "./models/GymCustomExercise.js";
import GymDietPlan from "./models/GymDietPlan.js";
import GymExerciseProgress from "./models/GymExerciseProgress.js";
import GymMeasurement from "./models/GymMeasurement.js";
import Workout from "./models/Workout.js";
import WorkoutPlan from "./models/WorkoutPlan.js";
import WorkoutPlanLog from "./models/WorkoutPlanLog.js";
import authRoutes from "./routes/authRoutes.js";
import habitRoutes from "./routes/habitRoutes.js";
import todoRoutes from "./routes/todoRoutes.js";
import goalRoutes from "./routes/goalRoutes.js";
import journalRoutes from "./routes/journalRoutes.js";
import gymRoutes from "./routes/gymRoutes.js";
import insightsRoutes from "./routes/insightsRoutes.js";

const registeredModels = {
  User: User.modelName,
  Habit: Habit.modelName,
  HabitLog: HabitLog.modelName,
  Todo: Todo.modelName,
  Goal: Goal.modelName,
  GoalProgressLog: GoalProgressLog.modelName,
  Journal: Journal.modelName,
  GymGalleryEntry: GymGalleryEntry.modelName,
  GymCustomExercise: GymCustomExercise.modelName,
  GymDietPlan: GymDietPlan.modelName,
  GymExerciseProgress: GymExerciseProgress.modelName,
  GymMeasurement: GymMeasurement.modelName,
  Workout: Workout.modelName,
  WorkoutPlan: WorkoutPlan.modelName,
  WorkoutPlanLog: WorkoutPlanLog.modelName
};

app.get("/", (_req, res) => {
  res.json({
    message: "MonkMode server is running",
    models: Object.values(registeredModels)
  });
});

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    database:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected"
  });
});

app.get("/test-db", async (_req, res) => {
  try {
    const admin = mongoose.connection.db.admin();
    const pingResult = await admin.ping();

    res.json({
      status: "ok",
      database: "connected",
      ping: pingResult
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      database: "disconnected",
      message: error.message
    });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/habits", habitRoutes);
app.use("/api/todos", todoRoutes);
app.use("/api/goals", goalRoutes);
app.use("/api/journal", journalRoutes);
app.use("/api/gym", gymRoutes);
app.use("/api/insights", insightsRoutes);

app.use((_req, res) => {
  res.status(404).json({ message: "Route not found" });
});

const startServer = async () => {
  if (!MONGO_URI) {
    throw new Error("MONGO_URI is missing in server/.env");
  }

  await mongoose.connect(MONGO_URI);
  console.log("MongoDB connected");

  app.listen(PORT, () => {
    console.log(`MonkMode server listening on port ${PORT}`);
  });
};

startServer().catch((error) => {
  console.error("Failed to start server:", error.message);
  process.exit(1);
});
