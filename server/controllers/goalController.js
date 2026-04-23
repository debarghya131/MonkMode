import Goal from "../models/Goal.js";
import GoalProgressLog from "../models/GoalProgressLog.js";
import mongoose from "mongoose";

export const createGoal = async (req, res) => {
  try {
    const { title, targetValue, deadline } = req.body;

    if (!title || targetValue == null) {
      return res.status(400).json({ message: "Title and targetValue are required" });
    }

    const goal = await Goal.create({
      userId: req.user.id,
      title,
      targetValue,
      deadline
    });

    res.status(201).json(goal);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getGoals = async (req, res) => {
  try {
    const goals = await Goal.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(goals);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateGoalProgress = async (req, res) => {
  try {
    const { currentValue } = req.body;

    if (currentValue == null) {
      return res.status(400).json({ message: "currentValue is required" });
    }

    const parsedCurrentValue = Number(currentValue);
    if (!Number.isFinite(parsedCurrentValue)) {
      return res.status(400).json({ message: "currentValue must be a valid number" });
    }

    let resolvedDate = new Date();
    if (req.body?.date != null) {
      resolvedDate = new Date(req.body.date);
      if (Number.isNaN(resolvedDate.getTime())) {
        return res.status(400).json({ message: "date must be a valid date" });
      }
    }

    const goal = await Goal.findOne({ _id: req.params.id, userId: req.user.id });

    if (!goal) {
      return res.status(404).json({ message: "Goal not found" });
    }

    const previousValue = Number(goal.currentValue) || 0;
    goal.currentValue = parsedCurrentValue;
    await goal.save();

    const targetValue = Number(goal.targetValue) || 0;
    const wasCompleted = targetValue > 0 && previousValue >= targetValue;
    const isCompleted = targetValue > 0 && parsedCurrentValue >= targetValue;

    await GoalProgressLog.create({
      userId: req.user.id,
      goalId: goal._id,
      previousValue,
      currentValue: parsedCurrentValue,
      delta: parsedCurrentValue - previousValue,
      completedGoal: !wasCompleted && isCompleted,
      date: resolvedDate
    });

    res.json(goal);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteGoal = async (req, res) => {
  try {
    const goal = await Goal.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!goal) {
      return res.status(404).json({ message: "Goal not found" });
    }

    res.json({ message: "Goal deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getGoalHeatmap = async (req, res) => {
  try {
    const { year } = req.query;
    const parsedYear = Number.parseInt(year, 10);
    const hasYearFilter = Number.isFinite(parsedYear);

    if (year !== undefined && !hasYearFilter) {
      return res.status(400).json({ message: "Year must be a valid number" });
    }

    const userId = new mongoose.Types.ObjectId(req.user.id);
    const match = { userId };

    if (hasYearFilter) {
      const startDate = new Date(Date.UTC(parsedYear, 0, 1));
      const endDate = new Date(Date.UTC(parsedYear + 1, 0, 1));
      match.date = { $gte: startDate, $lt: endDate };
    }

    const [updatesByDay, yearsByActivity] = await Promise.all([
      GoalProgressLog.aggregate([
        { $match: match },
        {
          $project: {
            day: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$date"
              }
            },
            completedGoal: 1
          }
        },
        {
          $group: {
            _id: "$day",
            updates: { $sum: 1 },
            completedGoals: {
              $sum: {
                $cond: [{ $eq: ["$completedGoal", true] }, 1, 0]
              }
            }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      GoalProgressLog.aggregate([
        { $match: { userId } },
        {
          $group: {
            _id: { $year: "$date" }
          }
        },
        { $sort: { _id: -1 } }
      ])
    ]);

    const values = updatesByDay.map((item) => {
      const updates = Number(item.updates) || 0;
      const completedGoals = Number(item.completedGoals) || 0;
      let count = 1;

      if (completedGoals > 0) {
        count = 4;
      } else if (updates >= 4) {
        count = 3;
      } else if (updates >= 2) {
        count = 2;
      }

      return {
        date: item._id,
        count,
        updates,
        completedGoals
      };
    });

    const years = yearsByActivity
      .map((item) => item._id)
      .filter((item) => Number.isFinite(item));

    const totalProgressUpdates = values.reduce((sum, value) => sum + value.updates, 0);

    res.json({
      values,
      years,
      totalProgressUpdates
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
