// Must match the keys used by TodaysWorkout and Progress in the client.
export const stableExerciseKey = (exercise = {}) => {
  const id = String(exercise.id || "");
  if (id && !id.startsWith("custom-") && !id.startsWith("ex-")) return id;
  return String(exercise.name || "").toLowerCase().trim()
    .replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
};

export const getWorkoutChecklistSummary = (plans, progressEntries) => {
  const scheduled = new Set(plans.flatMap((plan) =>
    (Array.isArray(plan.exercises) ? plan.exercises : []).map(stableExerciseKey)
  ).filter(Boolean));
  const updated = new Set(progressEntries.map((entry) => String(entry.exerciseId || "")).filter(Boolean));
  const completedProgress = [...scheduled].filter((id) => updated.has(id)).length;
  return {
    progressUpdatesToday: updated.size,
    completedProgress,
    totalProgress: scheduled.size,
    pendingUpdates: scheduled.size - completedProgress
  };
};
