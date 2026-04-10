import Goal from "../models/Goal.js";

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

    const goal = await Goal.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { currentValue },
      { new: true }
    );

    if (!goal) {
      return res.status(404).json({ message: "Goal not found" });
    }

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
