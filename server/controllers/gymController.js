import Workout from "../models/Workout.js";

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
