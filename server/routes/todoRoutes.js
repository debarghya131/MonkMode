import express from "express";
import {
  createTodo,
  deleteTodo,
  getTodos,
  toggleTodo
} from "../controllers/todoController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.route("/").post(createTodo).get(getTodos);
router.patch("/:id/toggle", toggleTodo);
router.delete("/:id", deleteTodo);

export default router;
