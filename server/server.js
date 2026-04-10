import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

app.use(cors());
app.use(express.json());

// Models
// Importing these files ensures all MonkMode schemas are registered with Mongoose
// as soon as the server starts.
import User from "./models/User.js";
import Habit from "./models/Habit.js";
import HabitLog from "./models/HabitLog.js";
import Todo from "./models/Todo.js";
import Goal from "./models/Goal.js";
import Journal from "./models/Journal.js";
import Workout from "./models/Workout.js";
import authRoutes from "./routes/authRoutes.js";
import habitRoutes from "./routes/habitRoutes.js";
import todoRoutes from "./routes/todoRoutes.js";
import goalRoutes from "./routes/goalRoutes.js";
import journalRoutes from "./routes/journalRoutes.js";
import gymRoutes from "./routes/gymRoutes.js";

const registeredModels = {
  User: User.modelName,
  Habit: Habit.modelName,
  HabitLog: HabitLog.modelName,
  Todo: Todo.modelName,
  Goal: Goal.modelName,
  Journal: Journal.modelName,
  Workout: Workout.modelName
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
