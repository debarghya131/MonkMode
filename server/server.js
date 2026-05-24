import { clerkMiddleware } from "@clerk/express";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;
const IS_PRODUCTION = process.env.NODE_ENV === "production";
const CONFIGURED_CORS_ORIGINS = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const DEV_CORS_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
];
let server;
let isShuttingDown = false;

const allowedOrigins = new Set(IS_PRODUCTION ? CONFIGURED_CORS_ORIGINS : [...DEV_CORS_ORIGINS, ...CONFIGURED_CORS_ORIGINS]);
const corsOptions = {
  origin(origin, callback) {
    if (!origin) {
      callback(null, true);
      return;
    }

    if (allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error("CORS origin not allowed"));
  },
  methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(clerkMiddleware());
app.use(cors(corsOptions));
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
import JournalMissedReason from "./models/JournalMissedReason.js";
import JournalWeeklySummary from "./models/JournalWeeklySummary.js";
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
import weeklyReportRoutes from "./routes/weeklyReportRoutes.js";

app.get("/", (_req, res) => {
  res.json({
    message: "MonkMode server is running"
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
  if (IS_PRODUCTION) {
    return res.status(404).json({ message: "Route not found" });
  }

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
app.use("/api/weekly-report", weeklyReportRoutes);

app.use((_req, res) => {
  res.status(404).json({ message: "Route not found" });
});

const closeServer = async (signal) => {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;

  try {
    await new Promise((resolve, reject) => {
      if (!server) {
        resolve();
        return;
      }

      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });

    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  } catch (error) {
    console.error("Failed to close server cleanly:", error.message);
  } finally {
    isShuttingDown = false;

    if (signal === "SIGUSR2") {
      process.kill(process.pid, "SIGUSR2");
      return;
    }

    process.exit(0);
  }
};

const registerShutdownHandlers = () => {
  process.once("SIGINT", () => {
    void closeServer("SIGINT");
  });

  process.once("SIGTERM", () => {
    void closeServer("SIGTERM");
  });

  process.once("SIGUSR2", () => {
    void closeServer("SIGUSR2");
  });
};

const startServer = async () => {
  if (!MONGO_URI) {
    throw new Error("MONGO_URI is missing in server/.env");
  }

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(MONGO_URI);
    console.log("MongoDB connected");
  }

  await new Promise((resolve, reject) => {
    server = app.listen(PORT, () => {
      console.log(`MonkMode server listening on port ${PORT}`);
      resolve();
    });

    server.on("error", (error) => {
      reject(error);
    });
  });
};

registerShutdownHandlers();

startServer().catch((error) => {
  console.error("Failed to start server:", error.message);
  process.exit(1);
});
