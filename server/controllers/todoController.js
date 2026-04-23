import Todo from "../models/Todo.js";
import mongoose from "mongoose";

export const createTodo = async (req, res) => {
  try {
    if (!req.body.title) {
      return res.status(400).json({ message: "Title is required" });
    }

    const todo = await Todo.create({
      userId: req.user.id,
      title: req.body.title,
      date: req.body.date
    });

    res.status(201).json(todo);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getTodos = async (req, res) => {
  try {
    const todos = await Todo.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(todos);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const toggleTodo = async (req, res) => {
  try {
    const todo = await Todo.findOne({ _id: req.params.id, userId: req.user.id });

    if (!todo) {
      return res.status(404).json({ message: "Todo not found" });
    }

    todo.completed = !todo.completed;
    await todo.save();

    res.json(todo);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteTodo = async (req, res) => {
  try {
    const todo = await Todo.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!todo) {
      return res.status(404).json({ message: "Todo not found" });
    }

    res.json({ message: "Todo deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getTodoHeatmap = async (req, res) => {
  try {
    const { year } = req.query;
    const parsedYear = Number.parseInt(year, 10);
    const hasYearFilter = Number.isFinite(parsedYear);

    if (year !== undefined && !hasYearFilter) {
      return res.status(400).json({ message: "Year must be a valid number" });
    }

    const userId = new mongoose.Types.ObjectId(req.user.id);

    const groupedByDay = await Todo.aggregate([
      { $match: { userId } },
      {
        $addFields: {
          effectiveDate: { $ifNull: ["$date", "$createdAt"] }
        }
      },
      {
        $project: {
          day: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$effectiveDate"
            }
          },
          completed: 1
        }
      },
      {
        $group: {
          _id: "$day",
          total: { $sum: 1 },
          completed: {
            $sum: {
              $cond: [{ $eq: ["$completed", true] }, 1, 0]
            }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const todayKey = new Date().toISOString().slice(0, 10);

    const values = groupedByDay
      .filter((item) => {
        if (!hasYearFilter) return true;
        return String(item._id).startsWith(`${parsedYear}-`);
      })
      .map((item) => {
        const date = String(item._id);
        const total = Number(item.total) || 0;
        const completed = Number(item.completed) || 0;
        const incomplete = Math.max(0, total - completed);
        const missed = date < todayKey ? incomplete : 0;

        let count = 1;
        if (total > 0 && completed === total && missed === 0) {
          count = 4;
        } else if (completed > 0) {
          const completionRatio = completed / total;
          if (completionRatio >= 0.8 && missed === 0) {
            count = 3;
          } else if (completionRatio >= 0.4 || completed >= 2) {
            count = 2;
          }
        }

        return {
          date,
          count,
          total,
          completed,
          missed,
          pending: Math.max(0, incomplete - missed)
        };
      });

    const years = [...new Set(
      groupedByDay
        .map((item) => Number.parseInt(String(item._id).slice(0, 4), 10))
        .filter((item) => Number.isFinite(item))
    )].sort((a, b) => b - a);

    res.json({
      values,
      years,
      totalActiveDays: values.length
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
