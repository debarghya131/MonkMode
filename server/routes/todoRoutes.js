import express from "express";
import {
  getTodoCategories,
  createTodo,
  deleteTodo,
  restoreTodo,
  getTodoSummary,
  getTodos,
  getTodoAnalysis,
  getTodoHeatmap,
  getTodoLogs,
  createTodoLog,
  setTodoStatus,
  toggleTodo,
  updateTodo
} from "../controllers/todoController.js";
import { protect } from "../middleware/authMiddleware.js";
import { createRateLimiter } from "../middleware/rateLimit.js";

const router = express.Router();
const todoWriteLimiter = createRateLimiter({
  keyPrefix: "todo-write-daily",
  windowMs: Number(process.env.TODO_WRITE_RATE_LIMIT_DAILY_WINDOW_MS || 86_400_000),
  max: Number(process.env.TODO_WRITE_RATE_LIMIT_DAILY_MAX || 5),
  message: "You have reached the daily to-do update limit for this portfolio project. Please try again tomorrow.",
});

router.use(protect);

router.get("/heatmap", getTodoHeatmap);
router.get("/summary", getTodoSummary);
router.get("/analysis", getTodoAnalysis);
router.get("/categories", getTodoCategories);
router.route("/logs").get(getTodoLogs).post(todoWriteLimiter, createTodoLog);
router.route("/").post(todoWriteLimiter, createTodo).get(getTodos);
router.patch("/:id/toggle", todoWriteLimiter, toggleTodo);
router.patch("/:id/status", todoWriteLimiter, setTodoStatus);
router.patch("/:id/restore", todoWriteLimiter, restoreTodo);
router.route("/:id").patch(todoWriteLimiter, updateTodo).delete(todoWriteLimiter, deleteTodo);

export default router;
