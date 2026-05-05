import express from "express";
import {
  getTodoCategories,
  createTodo,
  deleteTodo,
  restoreTodo,
  getTodoSummary,
  getTodos,
  getTodoHeatmap,
  getTodoLogs,
  createTodoLog,
  setTodoStatus,
  toggleTodo,
  updateTodo
} from "../controllers/todoController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.get("/heatmap", getTodoHeatmap);
router.get("/summary", getTodoSummary);
router.get("/categories", getTodoCategories);
router.route("/logs").get(getTodoLogs).post(createTodoLog);
router.route("/").post(createTodo).get(getTodos);
router.patch("/:id/toggle", toggleTodo);
router.patch("/:id/status", setTodoStatus);
router.patch("/:id/restore", restoreTodo);
router.route("/:id").patch(updateTodo).delete(deleteTodo);

export default router;
