import Workout from "../models/Workout.js";
import mongoose from "mongoose";

export const createWorkout = async (req, res) => {
  try {
    const { exercise, sets, reps, weight, date } = req.body;

    if (!exercise || sets == null || reps == null) {
      return res.status(400).json({ message: "Exercise, sets and reps are required" });
    }

    const workout = await Workout.create({
      userId: req.user.id,
      exercise,
      sets,
      reps,
      weight,
      date
    });

    res.status(201).json(workout);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getWorkouts = async (req, res) => {
  try {
    const workouts = await Workout.find({ userId: req.user.id }).sort({ date: -1 });
    res.json(workouts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteWorkout = async (req, res) => {
  try {
    const workout = await Workout.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!workout) {
      return res.status(404).json({ message: "Workout not found" });
    }

    res.json({ message: "Workout deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getGymHeatmap = async (req, res) => {
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

    const [activityByDay, yearsByActivity] = await Promise.all([
      Workout.aggregate([
        { $match: match },
        {
          $project: {
            day: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$date"
              }
            }
          }
        },
        {
          $group: {
            _id: "$day",
            updates: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      Workout.aggregate([
        { $match: { userId } },
        {
          $group: {
            _id: { $year: "$date" }
          }
        },
        { $sort: { _id: -1 } }
      ])
    ]);

    const values = activityByDay.map((item) => {
      const updates = Number(item.updates) || 0;
      let count = 1;

      if (updates >= 6) {
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
        completedProgress: updates
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
