import { motion as Motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

import api from "../../api/axios";
import useAuth from "../../hooks/useAuth";
import { WORKOUT_SPLITS } from "./workoutLibraryData";
import {
  createDummyWorkouts,
  DEMO_FULL_DIET,
  DEMO_SUPPLEMENTS,
  DEMO_PREWORKOUT,
  DEMO_MACROS,
  RETIRED_DEMO_WORKOUT_IDS,
} from "../../../data/GymDummyData";

const getSplitLabel = (val) => WORKOUT_SPLITS.find((s) => s.value === val)?.label || val || "";

const WORKOUTS_STORAGE_KEY = "monkmode_workouts";

const normalizeActiveByDay = (items) => {
  const usedDays = new Set();
  return (Array.isArray(items) ? items : []).map((item) => {
    if (!item?.isActive) return item;
    const days = Array.isArray(item.days) ? item.days : [];
    const hasConflict = days.some((day) => usedDays.has(day));
    if (hasConflict) return { ...item, isActive: false };
    days.forEach((day) => usedDays.add(day));
    return item;
  });
};

const mergeWithDemoWorkouts = (storedWorkouts, baseDate) => {
  const stored = (Array.isArray(storedWorkouts) ? storedWorkouts : []).filter(
    (workout) => !RETIRED_DEMO_WORKOUT_IDS.has(workout?.id)
  );
  const demos = createDummyWorkouts(baseDate);
  const demoById = new Map(demos.map((demo) => [demo.id, demo]));

  const refreshedStored = stored.map((workout) => {
    const demo = demoById.get(workout.id);
    if (!demo) return workout;
    return {
      ...demo,
      isActive: workout.isActive ?? demo.isActive,
      startDate: workout.startDate ?? demo.startDate,
      neverEnds: workout.neverEnds ?? demo.neverEnds,
      endDate: workout.endDate ?? demo.endDate,
    };
  });

  const storedIds = new Set(refreshedStored.map((workout) => workout.id));
  return [...refreshedStored, ...demos.filter((demo) => !storedIds.has(demo.id))];
};

const loadDemoWorkouts = () => {
  try {
    const stored = localStorage.getItem(WORKOUTS_STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    return normalizeActiveByDay(mergeWithDemoWorkouts(parsed, new Date()));
  } catch {
    return normalizeActiveByDay(createDummyWorkouts(new Date()));
  }
};

const saveDemoWorkouts = (workouts) => {
  try {
    localStorage.setItem(WORKOUTS_STORAGE_KEY, JSON.stringify(workouts));
    window.dispatchEvent(new Event("monkmode:gym-workouts-updated"));
  } catch {
    // Demo mode should still work if storage is unavailable.
  }
};

const loadLocalProgress = () => {
  try { return JSON.parse(localStorage.getItem("monkmode_exercise_progress")) || {}; }
  catch { return {}; }
};

const saveLocalProgress = (data) => {
  localStorage.setItem("monkmode_exercise_progress", JSON.stringify(data));
  window.dispatchEvent(new Event("monkmode:exercise-progress-updated"));
};

const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MAX_PROGRESS_SETS = 20;

const todayDay = () => WEEK_DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];

const formatDate = (day) => (day === todayDay() ? "Today" : day);

const todayISO = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const stableExerciseKey = (exercise) => {
  const id = exercise?.id || "";
  if (id && !id.startsWith("custom-") && !id.startsWith("ex-")) return id;
  return (exercise?.name || "").toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
};

const DIFFICULTY_STYLES = {
  Beginner:     "border-green-400/30 text-green-300 bg-green-500/10",
  Intermediate: "border-yellow-400/30 text-yellow-300 bg-yellow-500/10",
  Advanced:     "border-red-400/30 text-red-300 bg-red-500/10",
};

const GOAL_LABELS = {
  "muscle-gain": "Muscle Gain",
  "fat-loss":    "Fat Loss",
  "strength":    "Strength",
  "endurance":   "Endurance",
};

/* type → backend planType */
const DIET_TYPE_MAP = {
  diet:        "diet",
  supps:       "supplements",
  preworkout:  "workoutNutrition",
  macros:      "macros",
};

/* ── Diet Modal ── */
function DietModal({ type, day, planData, onClose }) {
  const titles = {
    diet:       "Full Day Diet",
    supps:      "Supplements",
    preworkout: "Pre & Post Workout",
    macros:     "Macros",
  };

  const renderContent = () => {
    /* ── Real data ── */
    if (planData) {
      if (type === "diet") {
        const sections = [
          ["Morning",   planData.meals?.morning],
          ["Breakfast", planData.meals?.breakfast],
          ["Lunch",     planData.meals?.lunch],
          ["Evening",   planData.meals?.evening],
          ["Dinner",    planData.meals?.dinner],
        ];
        return (
          <div className="space-y-4">
            {sections.map(([label, items]) =>
              items?.length ? (
                <div key={label}>
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-200/70">{label}</p>
                  <div className="space-y-1">
                    {items.map((item, i) => (
                      <div key={i} className="rounded-lg border border-amber-100/10 bg-white/5 px-3 py-1.5 text-xs text-stone-200">
                        {item.name}{item.time ? <span className="ml-2 text-stone-500">{item.time}</span> : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null
            )}
            {sections.every(([, items]) => !items?.length) && (
              <p className="text-xs text-stone-500 text-center py-4">No meals logged for {day}.</p>
            )}
          </div>
        );
      }
      if (type === "supps") {
        const items = planData.items || [];
        return (
          <div className="space-y-2">
            {items.length === 0
              ? <p className="text-xs text-stone-500">No supplements for {day}.</p>
              : items.map((item, i) => (
                <div key={i} className="flex items-center gap-2 rounded-lg border border-amber-100/10 bg-white/5 px-3 py-2">
                  <span className="text-[10px] font-bold text-amber-400/60">{i + 1}.</span>
                  <p className="text-xs text-stone-200">{item.name}{item.time ? <span className="ml-2 text-stone-500">{item.time}</span> : null}</p>
                </div>
              ))
            }
          </div>
        );
      }
      if (type === "preworkout") {
        const pre  = planData.meals?.preWorkout  || [];
        const post = planData.meals?.postWorkout || [];
        return (
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-200/70">Pre-Workout</p>
              <div className="space-y-1">
                {pre.length
                  ? pre.map((item, i) => (
                    <div key={i} className="rounded-lg border border-amber-100/10 bg-white/5 px-3 py-1.5 text-xs text-stone-200">
                      {item.name}
                    </div>
                  ))
                  : <p className="text-xs text-stone-500">None added.</p>
                }
              </div>
            </div>
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-200/70">Post-Workout</p>
              <div className="space-y-1">
                {post.length
                  ? post.map((item, i) => (
                    <div key={i} className="rounded-lg border border-sky-100/10 bg-sky-500/5 px-3 py-1.5 text-xs text-stone-200">
                      {item.name}
                    </div>
                  ))
                  : <p className="text-xs text-stone-500">None added.</p>
                }
              </div>
            </div>
          </div>
        );
      }
      if (type === "macros") {
        const v = planData.values || {};
        const fields = [
          ["Protein", v.protein], ["Carbs", v.carbs], ["Fats", v.fats], ["Fiber", v.fiber],
          ["Calories", v.calories], ["Water", v.water], ["Sugar", v.sugar], ["Sodium", v.sodium],
        ];
        return (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {fields.map(([label, val]) => val ? (
              <div key={label} className="rounded-xl border border-amber-100/10 bg-black/20 px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-500">{label}</p>
                <p className="mt-1 text-sm font-semibold text-stone-100">{val}</p>
              </div>
            ) : null)}
            {fields.every(([, val]) => !val) && (
              <p className="col-span-4 text-xs text-stone-500 text-center py-4">No macros set for {day}.</p>
            )}
          </div>
        );
      }
    }

    /* ── Demo / fallback data ── */
    if (type === "diet") {
      const data = DEMO_FULL_DIET[day] || {};
      const sections = [["Morning", data.morning], ["Breakfast", data.breakfast], ["Lunch", data.lunch], ["Evening", data.evening], ["Dinner", data.dinner]];
      return (
        <div className="space-y-4">
          {sections.map(([label, items]) => items?.length ? (
            <div key={label}>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-200/70">{label}</p>
              <div className="space-y-1">
                {items.map((item, i) => (
                  <div key={i} className="rounded-lg border border-amber-100/10 bg-white/5 px-3 py-1.5 text-xs text-stone-200">{item}</div>
                ))}
              </div>
            </div>
          ) : null)}
        </div>
      );
    }
    if (type === "supps") {
      const items = DEMO_SUPPLEMENTS[day] || [];
      return (
        <div className="space-y-2">
          {items.length === 0
            ? <p className="text-xs text-stone-500">No supplements for {day}.</p>
            : items.map((item, i) => (
              <div key={i} className="flex items-center gap-2 rounded-lg border border-amber-100/10 bg-white/5 px-3 py-2">
                <span className="text-[10px] font-bold text-amber-400/60">{i + 1}.</span>
                <p className="text-xs text-stone-200">{item}</p>
              </div>
            ))}
        </div>
      );
    }
    if (type === "preworkout") {
      const data = DEMO_PREWORKOUT[day] || { pre: [], post: [] };
      return (
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-200/70">Pre-Workout</p>
            <div className="space-y-1">
              {(data.pre || []).map((item, i) => (
                <div key={i} className="rounded-lg border border-amber-100/10 bg-white/5 px-3 py-1.5 text-xs text-stone-200">{item}</div>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-200/70">Post-Workout</p>
            <div className="space-y-1">
              {(data.post || []).map((item, i) => (
                <div key={i} className="rounded-lg border border-sky-100/10 bg-sky-500/5 px-3 py-1.5 text-xs text-stone-200">{item}</div>
              ))}
            </div>
          </div>
        </div>
      );
    }
    if (type === "macros") {
      const data = DEMO_MACROS[day] || {};
      const fields = [["Protein", data.protein], ["Carbs", data.carbs], ["Fats", data.fats], ["Fiber", data.fiber], ["Calories", data.calories], ["Water", data.water], ["Sugar", data.sugar], ["Sodium", data.sodium]];
      return (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {fields.map(([label, val]) => val ? (
            <div key={label} className="rounded-xl border border-amber-100/10 bg-black/20 px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-500">{label}</p>
              <p className="mt-1 text-sm font-semibold text-stone-100">{val}</p>
            </div>
          ) : null)}
        </div>
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="flex w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-amber-100/10 bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.08),transparent_35%),linear-gradient(180deg,rgba(28,16,12,0.98),rgba(10,8,8,0.99))] shadow-2xl shadow-black/60"
        style={{ maxHeight: "80vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 flex items-center justify-between gap-3 border-b border-amber-100/10 px-5 py-4">
          <div>
            <h3 className="text-sm font-semibold text-amber-100">{titles[type]}</h3>
            <p className="mt-0.5 text-xs text-stone-500">{day} — {day === todayDay() ? "Today" : day}</p>
          </div>
          <button type="button" onClick={onClose}
            className="rounded border border-amber-100/15 bg-white/5 px-2.5 py-1 text-xs font-semibold text-stone-300 transition hover:text-stone-100">
            Close
          </button>
        </div>
        <div className="journal-scroll min-h-0 flex-1 overflow-y-auto p-5">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}

const parseReps = (val) =>
  String(val || "").split("+").reduce((sum, part) => sum + (Math.max(0, parseInt(part, 10) || 0)), 0);

/* ── Update Progress Modal ── */
function UpdateProgressModal({ exercise, isDemoMode, onClose }) {
  const date       = todayISO();
  const exKey      = stableExerciseKey(exercise);
  const key        = `${date}_${exKey}`;

  const [existing, setExisting] = useState(null);
  const [loadingExisting, setLoadingExisting] = useState(!isDemoMode);

  useEffect(() => {
    if (isDemoMode) {
      const all = loadLocalProgress();
      setExisting(all[key] || {});
      return;
    }
    let cancelled = false;
    api.get(`/gym/exercise-progress?date=${date}&exerciseId=${exKey}`)
      .then(({ data }) => {
        if (!cancelled) setExisting(data[key] || {});
      })
      .catch(() => { if (!cancelled) setExisting({}); })
      .finally(() => { if (!cancelled) setLoadingExisting(false); });
    return () => { cancelled = true; };
  }, [isDemoMode, date, exKey, key]);

  const [sets, setSets] = useState("");
  const [reps, setReps] = useState("");
  const [lastSetWeight, setLastSetWeight] = useState("");
  const [repsBreakdown, setRepsBreakdown] = useState([]);
  const [totalTime, setTotalTime] = useState("");
  const [restBetweenSets, setRestBetweenSets] = useState("");
  const [notes, setNotes] = useState("");

  const initialised = useRef(false);
  useEffect(() => {
    if (existing === null || initialised.current) return;
    initialised.current = true;
    const initialSetsRaw = Number.parseInt(existing?.sets ?? exercise.sets ?? "", 10);
    const initialSets = Number.isFinite(initialSetsRaw)
      ? Math.min(MAX_PROGRESS_SETS, Math.max(0, initialSetsRaw))
      : 0;
    setSets(initialSets ? String(initialSets) : "");
    setReps(existing.reps ?? exercise.reps ?? "");
    setLastSetWeight(existing.lastSetWeight ?? "");
    const initialBreakdown = Array.isArray(existing.repsBreakdown)
      ? existing.repsBreakdown.slice(0, MAX_PROGRESS_SETS)
      : Array(initialSets).fill("");
    setRepsBreakdown(initialBreakdown);
    setTotalTime(existing.totalTime ?? "");
    setRestBetweenSets(existing.restBetweenSets ?? "");
    setNotes(existing.notes ?? "");
  }, [existing, exercise.sets, exercise.reps]);

  const setsCount    = Math.min(MAX_PROGRESS_SETS, Math.max(0, Number.parseInt(sets, 10) || 0));
  const breakdown    = Array.from({ length: setsCount }, (_, i) => repsBreakdown[i] ?? "");
  const lastSetReps  = String(parseReps(breakdown[breakdown.length - 1] ?? "") || (breakdown[breakdown.length - 1] ?? ""));
  const weight       = existing?.weight ?? (exercise.weight !== "0" ? exercise.weight : "");

  const handleBreakdown = (i, val) => {
    setRepsBreakdown((prev) => { const next = [...prev]; next[i] = val; return next; });
  };

  const handleSave = async () => {
    const payload = {
      date,
      exerciseId:      exKey,
      exerciseName:    exercise.name,
      bodyPart:        exercise.bodyPart || "",
      sets,
      totalTime,
      restBetweenSets,
      notes,
    };

    if (reps !== "") payload.reps = reps;
    if (lastSetWeight !== "") payload.lastSetWeight = lastSetWeight;
    if (weight !== "") payload.weight = weight;
    if (breakdown.some((v) => v !== "")) {
      payload.repsBreakdown = breakdown;
      payload.lastSetReps = lastSetReps;
    }

    if (isDemoMode) {
      const all = loadLocalProgress();
      all[key] = { ...payload, savedAt: new Date().toISOString() };
      saveLocalProgress(all);
      onClose();
      return;
    }

    try {
      await api.post("/gym/exercise-progress", payload);
      /* keep localStorage in sync so Progress.jsx charts still update */
      const all = loadLocalProgress();
      all[key] = { ...payload, savedAt: new Date().toISOString() };
      saveLocalProgress(all);
    } catch {
      /* still sync localStorage on failure so UX isn't broken */
      const all = loadLocalProgress();
      all[key] = { ...payload, savedAt: new Date().toISOString() };
      saveLocalProgress(all);
    }
    onClose();
  };

  const numericWeight = Number.parseFloat(weight);
  const numericTargetReps = Number.parseInt(reps, 10) || 0;
  const totalRepsFromBreakdown = breakdown.reduce(
    (sum, value) => sum + parseReps(value),
    0
  );
  const totalEffectiveReps = totalRepsFromBreakdown > 0
    ? totalRepsFromBreakdown
    : (setsCount > 0 && numericTargetReps > 0 ? setsCount * numericTargetReps : 0);
  const vol = totalEffectiveReps > 0 && numericWeight > 0
    ? `${(totalEffectiveReps * numericWeight).toFixed(0)} kg`
    : totalEffectiveReps > 0
      ? `${totalEffectiveReps} reps`
      : null;

  const hasAnyBreakdown = breakdown.some((val) => val !== "");
  const breakdownErrors = breakdown.map((val) => {
    if (val === "") return hasAnyBreakdown ? "required" : null;
    if (numericTargetReps > 0 && parseReps(val) !== numericTargetReps) return "mismatch";
    return null;
  });
  const hasBreakdownError = breakdownErrors.some(Boolean);

  const canSave =
    sets !== "" && setsCount > 0 &&
    totalTime !== "" &&
    restBetweenSets !== "" &&
    !hasBreakdownError;

  if (loadingExisting) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
        <div className="rounded-2xl border border-amber-100/10 bg-[linear-gradient(180deg,rgba(28,16,12,0.98),rgba(10,8,8,0.99))] px-8 py-6 shadow-2xl">
          <p className="text-sm text-stone-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-2xl border border-amber-100/10 bg-[linear-gradient(180deg,rgba(28,16,12,0.98),rgba(10,8,8,0.99))] shadow-2xl shadow-black/60 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-amber-100/10 px-5 py-4">
          <div>
            <h3 className="text-sm font-semibold text-amber-100">{exercise.name}</h3>
            <p className="text-[10px] text-stone-500">Target: {exercise.sets}s × {exercise.reps}r {exercise.weight !== "0" ? `@ ${exercise.weight}kg` : ""}</p>
          </div>
          <button type="button" onClick={onClose}
            className="rounded border border-amber-100/15 bg-white/5 px-2.5 py-1 text-xs font-semibold text-stone-300 transition hover:text-stone-100">
            Close
          </button>
        </div>
        <div className="space-y-3 p-5">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-amber-100/10 bg-black/20 px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-500 mb-1">Sets Done</p>
              <input type="number" min="0" max={MAX_PROGRESS_SETS} value={sets} onChange={(e) => {
                const raw = e.target.value;
                if (raw === "") { setSets(""); return; }
                const parsed = Number.parseInt(raw, 10);
                if (!Number.isFinite(parsed)) return;
                setSets(String(Math.min(MAX_PROGRESS_SETS, Math.max(0, parsed))));
              }} placeholder={exercise.sets}
                className="w-full bg-transparent text-xs font-semibold text-stone-100 outline-none placeholder:text-stone-600" />
              <p className="mt-1 text-[9px] text-stone-600">Max {MAX_PROGRESS_SETS} sets</p>
            </div>
            <div className="rounded-xl border border-amber-100/10 bg-black/20 px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-500 mb-1">Reps / Set</p>
              <input type="text" value={reps} onChange={(e) => setReps(e.target.value)}
                placeholder={exercise.reps || "e.g. 12"}
                className="w-full bg-transparent text-xs font-semibold text-stone-100 outline-none placeholder:text-stone-600" />
              <p className="mt-1 text-[9px] text-stone-600">Target: {exercise.reps || "—"}</p>
            </div>
          </div>

          {setsCount > 0 && (
            <div className="rounded-xl border border-amber-100/10 bg-black/20 px-3 py-2.5">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-500">Reps Breakdown</p>
                <p className="text-[9px] text-stone-600">Use + for rest-pause (e.g. 10+5+5)</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {breakdown.map((val, i) => {
                  const target = parseInt(exercise.reps) || 0;
                  const done = parseReps(val);
                  const hit = target > 0 && val !== "" && done >= target;
                  const over = target > 0 && val !== "" && done > target;
                  const err = breakdownErrors[i];
                  const statusColor = err ? "border-rose-500/70" : val === "" ? "border-amber-100/10" : hit ? "border-emerald-400/40" : "border-rose-400/40";
                  return (
                    <div key={i} className="flex flex-col items-center gap-1">
                      <span className="text-[9px] text-stone-600">S{i + 1}</span>
                      <input
                        type="text"
                        value={val}
                        onChange={(e) => handleBreakdown(i, e.target.value)}
                        placeholder="—"
                        className={`w-16 rounded-lg border py-1 text-center text-xs font-semibold text-stone-100 outline-none placeholder:text-stone-700 bg-black/30 focus:border-amber-300/35 ${statusColor}`}
                      />
                      {val !== "" && (
                        <span className={`text-[8px] font-semibold leading-none ${hit ? "text-emerald-400" : "text-rose-400/80"}`}>
                          {target > 0
                            ? (over ? `${done} ↑ +${done - target}` : `${done} / ${target}`)
                            : `${done} reps`}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="rounded-xl border border-amber-100/10 bg-black/20 px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-500 mb-1">Last Set Weight</p>
            <input type="number" value={lastSetWeight} onChange={(e) => setLastSetWeight(e.target.value)} placeholder="kg"
              className="w-full bg-transparent text-xs font-semibold text-stone-100 outline-none placeholder:text-stone-600" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-amber-100/10 bg-black/20 px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-500 mb-1">Total Time (min)</p>
              <input type="number" value={totalTime} onChange={(e) => setTotalTime(e.target.value)} placeholder="—"
                className="w-full bg-transparent text-xs font-semibold text-stone-100 outline-none placeholder:text-stone-600" />
            </div>
            <div className="rounded-xl border border-amber-100/10 bg-black/20 px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-500 mb-1">Rest b/w Sets (sec)</p>
              <input type="number" value={restBetweenSets} onChange={(e) => setRestBetweenSets(e.target.value)} placeholder="—"
                className="w-full bg-transparent text-xs font-semibold text-stone-100 outline-none placeholder:text-stone-600" />
            </div>
          </div>

          {vol && (
            <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/8 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-500">Volume</p>
              <p className="mt-0.5 text-xs font-semibold text-emerald-300">{vol}</p>
            </div>
          )}

          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)…" rows={2}
            className="w-full rounded-xl border border-amber-100/10 bg-black/20 px-3 py-2.5 text-xs text-stone-200 outline-none placeholder:text-stone-600 resize-none" />

          {!canSave && (
            <p className="text-center text-[10px] text-rose-400/80">
              {sets === "" || setsCount === 0
                ? "Sets Done is required."
                : totalTime === ""
                ? "Total Time is required."
                : restBetweenSets === ""
                ? "Rest b/w Sets is required."
                : breakdownErrors.some((err) => err === "required")
                ? "Complete every set breakdown or leave all breakdown boxes empty."
                : "Each set's reps must match the Reps / Set target."}
            </p>
          )}
          <button type="button" onClick={handleSave} disabled={!canSave}
            className={`w-full rounded-xl border py-2 text-xs font-semibold transition ${
              canSave
                ? "border-amber-400/30 bg-amber-500/15 text-amber-200 hover:bg-amber-500/25"
                : "cursor-not-allowed border-stone-700/40 bg-stone-800/30 text-stone-600"
            }`}>
            Save Progress
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── View Progress Modal ── */
const PROGRESS_METRICS = [
  { key: "sets",           label: "Sets",            unit: "",    field: "sets" },
  { key: "reps",           label: "Reps / Set",      unit: "",    field: "reps" },
  { key: "lastSetReps",    label: "Last Set Reps",   unit: "",    field: "lastSetReps" },
  { key: "lastSetWeight",  label: "Last Set Weight", unit: "kg",  field: "lastSetWeight" },
  { key: "totalTime",      label: "Total Time",      unit: "min", field: "totalTime" },
  { key: "restBetweenSets",label: "Rest b/w Sets",   unit: "sec", field: "restBetweenSets" },
];

function ViewProgressModal({ exercise, isDemoMode, onClose }) {
  const [current, setCurrent] = useState(null);
  const [last,    setLast]    = useState(null);
  const [loading, setLoading] = useState(true);
  const today = todayISO();

  const exKey = stableExerciseKey(exercise);

  useEffect(() => {
    const parseEntries = (flat) => {
      const sorted = Object.entries(flat)
        .filter(([k]) => k.endsWith(`_${exKey}`))
        .map(([k, v]) => ({ date: k.split("_")[0], ...v }))
        .sort((a, b) => b.date.localeCompare(a.date));
      const cur  = sorted.find((e) => e.date === today) || null;
      const prev = sorted.find((e) => e.date !== today) || null;
      setCurrent(cur);
      setLast(prev);
      setLoading(false);
    };

    if (isDemoMode) {
      parseEntries(loadLocalProgress());
      return;
    }

    let cancelled = false;
    api.get(`/gym/exercise-progress?exerciseId=${exKey}`)
      .then(({ data: flat }) => { if (!cancelled) parseEntries(flat); })
      .catch(() => { if (!cancelled) { setCurrent(null); setLast(null); setLoading(false); } });
    return () => { cancelled = true; };
  }, [isDemoMode, exKey, today]);

  const delta = (key, cur, prev) => {
    const getRaw = (entry) => {
      if (key === "lastSetReps") {
        const bd = entry?.repsBreakdown;
        const raw = Array.isArray(bd) ? bd.filter(Boolean).slice(-1)[0] : null;
        return raw != null ? parseReps(raw) : parseFloat(entry?.[key]);
      }
      return parseFloat(entry?.[key]);
    };
    const a = getRaw(cur);
    const b = getRaw(prev);
    if (!isFinite(a) || !isFinite(b)) return null;
    return a - b;
  };

  const fmtVal = (entry, key, unit) => {
    if (!entry) return "—";
    if (key === "lastSetReps") {
      const breakdown = entry.repsBreakdown;
      const raw = Array.isArray(breakdown) ? breakdown.filter(Boolean).slice(-1)[0] : null;
      if (raw) return raw;
    }
    const v = entry[key];
    if (v === "" || v == null) return "—";
    return `${v}${unit ? ` ${unit}` : ""}`;
  };

  const hasAny = current || last;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="journal-scroll w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-amber-100/10 bg-[linear-gradient(180deg,rgba(28,16,12,0.98),rgba(10,8,8,0.99))] shadow-2xl shadow-black/60"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-amber-100/10 px-5 py-4">
          <div>
            <h3 className="text-sm font-semibold text-amber-100">{exercise.name}</h3>
            <p className="text-[10px] text-stone-500">{exercise.bodyPart}</p>
          </div>
          <button type="button" onClick={onClose}
            className="rounded border border-amber-100/15 bg-white/5 px-2.5 py-1 text-xs font-semibold text-stone-300 transition hover:text-stone-100">
            Close
          </button>
        </div>

        <div className="space-y-4 p-5">
          {loading ? (
            <p className="py-6 text-center text-xs text-stone-500">Loading progress...</p>
          ) : !hasAny ? (
            <p className="py-6 text-center text-xs text-stone-500">No progress logged for this exercise yet.</p>
          ) : (
            <>
              {/* Column headers */}
              <div className="grid grid-cols-[1fr_1fr_1fr] gap-2 pb-1">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-600">Metric</p>
                <p className="text-center text-[10px] font-semibold uppercase tracking-widest text-stone-500">
                  Last{last ? <span className="ml-1 text-stone-600">({last.date})</span> : ""}
                </p>
                <p className="text-center text-[10px] font-semibold uppercase tracking-widest text-amber-400/80">
                  Today{current ? "" : <span className="ml-1 text-stone-600">(not logged)</span>}
                </p>
              </div>

              {/* Metric rows */}
              {PROGRESS_METRICS.map(({ key, label, unit }) => {
                const d = delta(key, current, last);
                const isRest = key === "restBetweenSets";
                const improved = d != null && (isRest ? d < 0 : d > 0);
                const declined = d != null && (isRest ? d > 0 : d < 0);
                return (
                  <div key={key} className="grid grid-cols-[1fr_1fr_1fr] items-center gap-2 rounded-xl border border-amber-100/10 bg-black/20 px-3 py-2.5">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-stone-500">{label}</p>
                    <p className="text-center text-xs font-semibold text-stone-400">{fmtVal(last, key, unit)}</p>
                    <div className="flex flex-col items-center">
                      <p className={`text-xs font-semibold ${current ? "text-amber-200" : "text-stone-600"}`}>
                        {fmtVal(current, key, unit)}
                      </p>
                      {d != null && (
                        <span className={`text-[9px] font-semibold ${improved ? "text-emerald-400" : declined ? "text-rose-400" : "text-stone-500"}`}>
                          {d > 0 ? "+" : ""}{d}{unit ? ` ${unit}` : ""}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Last session reps breakdown */}
              {last?.repsBreakdown?.some(Boolean) && (
                <div className="rounded-xl border border-amber-100/10 bg-black/20 px-3 py-2.5">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-500">Last Session — Reps Breakdown</p>
                  <div className="flex flex-wrap gap-2">
                    {last.repsBreakdown.map((r, i) => (
                      r ? (
                        <div key={i} className="flex flex-col items-center gap-0.5">
                          <span className="text-[9px] text-stone-600">S{i + 1}</span>
                          <span className="rounded-lg border border-amber-100/15 bg-black/30 px-2 py-0.5 text-xs font-semibold text-stone-300">{r}</span>
                        </div>
                      ) : null
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {last && (
                <div className="rounded-xl border border-amber-100/10 bg-black/20 px-3 py-2.5">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-500">Last Session Notes</p>
                  {last.notes
                    ? <p className="text-xs text-stone-400">{last.notes}</p>
                    : <p className="text-[10px] text-stone-600 italic">No notes from last session</p>
                  }
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Main Component ── */
export default function TodaysWorkout() {
  const { isDemoMode } = useAuth();
  const [selectedDay, setSelectedDay]         = useState(todayDay);
  const [dietModal, setDietModal]             = useState(null);
  const [progressModal, setProgressModal]     = useState(null);
  const [viewProgressModal, setViewProgressModal] = useState(null);
  const [allWorkouts, setAllWorkouts]         = useState(() => isDemoMode ? loadDemoWorkouts() : []);
  const [dietPlans, setDietPlans]             = useState({});
  const [bodyFilter, setBodyFilter]           = useState("all");
  const [loading, setLoading]                 = useState(!isDemoMode);

  /* Fetch workout plans */
  useEffect(() => {
    if (isDemoMode) {
      setAllWorkouts(loadDemoWorkouts());
      setLoading(false);
      const onStorage = () => setAllWorkouts(loadDemoWorkouts());
      window.addEventListener("storage", onStorage);
      window.addEventListener("monkmode:gym-workouts-updated", onStorage);
      return () => {
        window.removeEventListener("storage", onStorage);
        window.removeEventListener("monkmode:gym-workouts-updated", onStorage);
      };
    }

    let cancelled = false;
    const fetchPlans = async () => {
      try {
        const { data } = await api.get("/gym/plans");
        if (!cancelled) setAllWorkouts(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setAllWorkouts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchPlans();
    return () => { cancelled = true; };
  }, [isDemoMode]);

  /* Fetch diet plans for selected day (real mode only) */
  useEffect(() => {
    if (isDemoMode) return;
    let cancelled = false;
    api.get(`/gym/diet-plans?day=${selectedDay}`)
      .then(({ data }) => {
        if (cancelled || !Array.isArray(data)) return;
        const map = {};
        for (const plan of data) {
          if (plan.isActive) map[plan.planType] = plan;
        }
        if (!cancelled) setDietPlans(map);
      })
      .catch(() => { if (!cancelled) setDietPlans({}); });
    return () => { cancelled = true; };
  }, [isDemoMode, selectedDay]);

  const today = todayISO();

  const todayWorkouts = allWorkouts.filter(
    (w) => w.days?.includes(selectedDay) && w.isActive && (w.neverEnds || !w.endDate || w.endDate >= today)
  );

  const inactiveScheduledWorkouts = allWorkouts.filter(
    (w) => w.days?.includes(selectedDay) && !w.isActive
  );

  const handleActivateWorkout = async (id) => {
    const target = allWorkouts.find((w) => w.id === id);
    if (!target) return;
    const targetDays = target.days || [];
    if (isDemoMode) {
      const next = allWorkouts.map((w) => {
        if (w.id === id) return { ...w, isActive: true };
        const overlaps = (w.days || []).some((d) => targetDays.includes(d));
        return overlaps ? { ...w, isActive: false } : w;
      });
      setAllWorkouts(next);
      saveDemoWorkouts(next);
      return;
    }
    try {
      const { data } = await api.patch(`/gym/plans/${id}/active`);
      setAllWorkouts(Array.isArray(data) ? data : []);
    } catch { /* server error — local state unchanged */ }
  };

  const allBodyGroups = [...new Set(
    todayWorkouts.flatMap((w) => (w.exercises || []).map((ex) => ex.bodyPart?.split(" - ")[0]?.trim()).filter(Boolean))
  )].sort();

  const filteredWorkouts = todayWorkouts.map((w) => ({
    ...w,
    exercises: bodyFilter === "all"
      ? (w.exercises || [])
      : (w.exercises || []).filter((ex) => ex.bodyPart?.split(" - ")[0]?.trim() === bodyFilter),
  })).filter((w) => w.exercises.length > 0);

  const dietCards = [
    { type: "diet",       label: "Full Day Diet", icon: "🥗", color: "border-emerald-400/25 bg-emerald-500/10 text-emerald-200" },
    { type: "supps",      label: "Supplements",   icon: "💊", color: "border-sky-400/25 bg-sky-500/10 text-sky-200" },
    { type: "preworkout", label: "Pre / Post",    icon: "⚡", color: "border-amber-400/25 bg-amber-500/10 text-amber-200" },
    { type: "macros",     label: "Macros",        icon: "📊", color: "border-violet-400/25 bg-violet-500/10 text-violet-200" },
  ];

  return (
    <>
      <div className="flex min-h-0 flex-col gap-4 sm:max-h-[calc(100dvh-17rem)]">

        {/* Day selector */}
        <div className="shrink-0 flex flex-wrap items-center gap-2 rounded-[1.4rem] border border-amber-100/10 bg-black/20 px-3 py-3 sm:rounded-2xl sm:px-4">
          <span className="mr-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-500">Day</span>
          {WEEK_DAYS.map((day) => (
            <button key={day} type="button" onClick={() => { setSelectedDay(day); setBodyFilter("all"); }}
              className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition ${
                selectedDay === day
                  ? "border-amber-300/45 bg-amber-500/15 text-amber-100"
                  : "border-amber-100/10 bg-white/5 text-stone-400 hover:text-stone-200"
              }`}>
              {day}{day === todayDay() ? " · Today" : ""}
            </button>
          ))}
        </div>

        <div className="flex min-h-0 flex-col items-start gap-4 xl:flex-row">

          {/* Workout column */}
          <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-[1.4rem] border border-amber-100/10 bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.06),transparent_40%),linear-gradient(180deg,rgba(20,12,10,0.97),rgba(10,8,8,0.98))] sm:rounded-2xl">
            <div className="shrink-0 border-b border-amber-100/10 px-4 py-3 sm:px-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-stone-100">{formatDate(selectedDay)}'s Workouts</h3>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-amber-300/20 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-amber-200">
                    {todayWorkouts.length} plan{todayWorkouts.length !== 1 ? "s" : ""}
                  </span>
                  <span className="rounded-full border border-stone-500/20 bg-white/5 px-2.5 py-0.5 text-[10px] font-semibold text-stone-400">
                    {todayWorkouts.reduce((sum, w) => sum + (w.exercises?.length || 0), 0)} exercises
                  </span>
                </div>
              </div>
            </div>

            <div className="journal-scroll min-h-0 flex-1 overflow-y-auto p-3 pr-1.5 scroll-smooth sm:p-4 sm:pr-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-amber-400/20 hover:[&::-webkit-scrollbar-thumb]:bg-amber-400/40">
              {loading ? (
                <div className="flex h-full items-center justify-center">
                  <p className="text-sm text-stone-500">Loading workouts...</p>
                </div>
              ) : filteredWorkouts.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-4">
                  <div className="text-center">
                    <p className="text-sm font-semibold text-stone-300">Rest day 🙌</p>
                    <p className="mt-1 text-xs text-stone-500">No active workouts scheduled for {selectedDay}.</p>
                  </div>
                  {inactiveScheduledWorkouts.length > 0 && (
                    <div className="w-full max-w-sm space-y-2">
                      <p className="text-center text-[10px] font-semibold uppercase tracking-widest text-stone-500">Inactive plans for {selectedDay}</p>
                      {inactiveScheduledWorkouts.map((w) => (
                        <div key={w.id} className="flex flex-col items-start gap-2 rounded-xl border border-amber-100/10 bg-white/5 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold text-stone-200">{w.title}</p>
                            <p className="mt-0.5 text-[10px] text-stone-500">{w.exercises?.length || 0} exercises</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleActivateWorkout(w.id)}
                            className="shrink-0 rounded-full border border-emerald-400/35 bg-emerald-500/15 px-3 py-1 text-[10px] font-semibold text-emerald-200 transition hover:bg-emerald-500/30"
                          >
                            Activate
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredWorkouts.map((workout, wi) => (
                    <Motion.div
                      key={workout.id}
                      className="rounded-[1.3rem] border border-amber-100/10 bg-white/5 p-3.5 sm:rounded-2xl sm:p-4"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: wi * 0.07, duration: 0.25 }}
                      whileHover={{ y: -2, boxShadow: "0 10px 28px rgba(0,0,0,0.4)", borderColor: "rgba(251,191,36,0.2)" }}
                    >
                      {/* Workout header */}
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-semibold text-stone-100">{workout.title}</h4>
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            {workout.difficulty && (
                              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${DIFFICULTY_STYLES[workout.difficulty] || "border-amber-100/10 text-stone-400 bg-white/5"}`}>
                                {workout.difficulty}
                              </span>
                            )}
                            {workout.goalType && (
                              <span className="rounded-full border border-amber-100/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-stone-400">
                                {GOAL_LABELS[workout.goalType] || workout.goalType}
                              </span>
                            )}
                            {workout.workoutSplit && (
                              <span className="rounded-full border border-violet-400/30 bg-violet-500/10 px-2 py-0.5 text-[10px] font-semibold text-violet-300">
                                {getSplitLabel(workout.workoutSplit)}
                              </span>
                            )}
                            {workout.totalEstimatedTime && (
                              <span className="rounded-full border border-amber-100/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-stone-400">
                                ~{workout.totalEstimatedTime} min
                              </span>
                            )}
                          </div>
                        </div>
                        {workout.isActive && (
                          <span className="rounded-full border border-emerald-400/25 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                            Active
                          </span>
                        )}
                      </div>

                      {/* Body group filter */}
                      {allBodyGroups.length > 0 && (
                        <div className="mt-2.5 flex gap-1.5 overflow-x-auto pb-0.5">
                          <button type="button" onClick={() => setBodyFilter("all")}
                            className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold transition ${
                              bodyFilter === "all" ? "border-amber-300/45 bg-amber-500/15 text-amber-100" : "border-amber-100/10 bg-white/5 text-stone-400 hover:text-stone-200"
                            }`}>
                            All
                          </button>
                          {allBodyGroups.map((g) => (
                            <button key={g} type="button" onClick={() => setBodyFilter(g)}
                              className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold transition ${
                                bodyFilter === g ? "border-amber-300/45 bg-amber-500/15 text-amber-100" : "border-amber-100/10 bg-white/5 text-stone-400 hover:text-stone-200"
                              }`}>
                              {g}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Exercise list */}
                      <div className="journal-scroll mt-3 max-h-[380px] space-y-2 overflow-y-auto scroll-smooth pr-1.5 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-amber-400/25 hover:[&::-webkit-scrollbar-thumb]:bg-amber-400/45 md:max-h-[460px]">
                        {workout.exercises.map((ex, idx) => (
                          <Motion.div
                            key={ex.id}
                            className="rounded-xl border border-amber-100/8 bg-black/20 px-3 py-2.5"
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: wi * 0.07 + idx * 0.05, duration: 0.2 }}
                            whileHover={{ y: -1, borderColor: "rgba(251,191,36,0.18)", boxShadow: "0 6px 16px rgba(0,0,0,0.3)" }}
                          >
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                              <div className="flex items-center gap-3">
                              <span className="shrink-0 text-[10px] font-bold text-amber-400/50">{idx + 1}.</span>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-semibold text-stone-100">{ex.name}</p>
                                <p className="mt-0.5 text-[10px] text-stone-500">{ex.bodyPart}</p>
                              </div>
                              </div>
                              <div className="flex shrink-0 flex-wrap gap-1.5 sm:justify-end">
                                <Motion.button type="button" onClick={() => setViewProgressModal(ex)}
                                  whileHover={{ scale: 1.08, boxShadow: "0 0 16px rgba(251,191,36,0.5)" }}
                                  whileTap={{ scale: 0.93 }}
                                  className="rounded-full border border-amber-300/30 bg-amber-500/10 px-2.5 py-1 text-[10px] font-semibold text-amber-200 transition hover:border-transparent hover:bg-gradient-to-r hover:from-[#ffd86b] hover:via-[#f5b52f] hover:to-[#ea8a17] hover:text-stone-950">
                                  View Progress
                                </Motion.button>
                                {selectedDay === todayDay() && (
                                  <Motion.button type="button" onClick={() => setProgressModal(ex)}
                                    animate={{ boxShadow: ["0 0 0px rgba(52,211,153,0)", "0 0 8px rgba(52,211,153,0.4)", "0 0 0px rgba(52,211,153,0)"] }}
                                    transition={{ boxShadow: { duration: 2.2, repeat: Infinity, ease: "easeInOut" } }}
                                    whileHover={{ scale: 1.08, boxShadow: "0 0 18px rgba(52,211,153,0.65)" }}
                                    whileTap={{ scale: 0.88 }}
                                    className="relative overflow-hidden rounded-full border border-emerald-300/40 bg-emerald-500/15 px-2.5 py-1 text-[10px] font-bold text-emerald-200 transition hover:bg-emerald-500/30">
                                    <Motion.span className="pointer-events-none absolute inset-y-0 left-[-40%] w-[30%] -skew-x-12 bg-white/25 blur-sm"
                                      animate={{ left: ["-40%", "130%"] }}
                                      transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 1.5, ease: "easeInOut" }} />
                                    <span className="relative z-10">Update Progress</span>
                                  </Motion.button>
                                )}
                              </div>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <span className="rounded-md border border-amber-100/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-amber-200/80">{ex.sets} sets</span>
                              {ex.reps && (
                                <span className="rounded-md border border-amber-100/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-stone-300">{ex.reps} reps</span>
                              )}
                              {ex.weight && ex.weight !== "0" && (
                                <span className="rounded-md border border-amber-100/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-stone-300">{ex.weight} kg</span>
                              )}
                              {ex.duration && (
                                <span className="rounded-md border border-sky-400/20 bg-sky-500/8 px-2 py-0.5 text-[10px] font-semibold text-sky-300">{ex.duration} min</span>
                              )}
                              {ex.restTime && (
                                <span className="rounded-md border border-violet-400/20 bg-violet-500/8 px-2 py-0.5 text-[10px] font-semibold text-violet-300">{ex.restTime}s rest</span>
                              )}
                              {ex.sets && ex.reps && ex.weight && ex.weight !== "0" ? (
                                <span className="rounded-md border border-emerald-400/20 bg-emerald-500/8 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                                  {(parseInt(ex.sets) * parseInt(ex.reps) * parseFloat(ex.weight)).toFixed(0)} kg vol
                                </span>
                              ) : ex.sets && ex.reps ? (
                                <span className="rounded-md border border-emerald-400/20 bg-emerald-500/8 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                                  {parseInt(ex.sets) * parseInt(ex.reps)} reps vol
                                </span>
                              ) : null}
                            </div>
                          </Motion.div>
                        ))}
                      </div>
                    </Motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Diet column */}
          <div className="journal-scroll w-full shrink-0 overflow-y-auto scroll-smooth xl:w-44 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-amber-400/20">
            <p className="mb-2 shrink-0 text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-500">Diet</p>
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-1">
              {dietCards.map(({ type, label, icon, color }, di) => {
                const planType = DIET_TYPE_MAP[type];
                const hasPlan  = !isDemoMode && Boolean(dietPlans[planType]);
                return (
                  <Motion.div key={type}
                    className={`dashboard-glow-card flex shrink-0 flex-col items-start gap-2 rounded-2xl border p-3 ${color}`}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: di * 0.08, duration: 0.25 }}
                    whileHover={{ y: -2, boxShadow: "0 8px 20px rgba(0,0,0,0.35)" }}
                  >
                    <span className="text-2xl">{icon}</span>
                    <p className="text-xs font-semibold leading-snug">{label}</p>
                    <p className="text-[10px] opacity-60">
                      {formatDate(selectedDay)}
                      {hasPlan ? " · Active" : isDemoMode ? "" : " · No plan"}
                    </p>
                    <Motion.button type="button"
                      onClick={() => setDietModal({ type, day: selectedDay })}
                      whileHover={{ scale: 1.03, boxShadow: "0 0 12px rgba(255,255,255,0.22)" }}
                      whileTap={{ scale: 0.95 }}
                      className="relative mt-1 w-full overflow-hidden rounded-lg border border-current/30 bg-black/20 py-1 text-[10px] font-semibold transition hover:bg-black/40"
                    >
                      <Motion.span className="pointer-events-none absolute inset-y-0 left-[-40%] w-[30%] -skew-x-12 bg-white/25 blur-sm"
                        animate={{ left: ["-40%", "130%"] }}
                        transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 1.5, ease: "easeInOut" }} />
                      <span className="relative z-10">View</span>
                    </Motion.button>
                  </Motion.div>
                );
              })}
            </div>
          </div>

        </div>
      </div>

      {dietModal && (
        <DietModal
          type={dietModal.type}
          day={dietModal.day}
          planData={isDemoMode ? null : dietPlans[DIET_TYPE_MAP[dietModal.type]] || null}
          onClose={() => setDietModal(null)}
        />
      )}
      {progressModal && (
        <UpdateProgressModal
          exercise={progressModal}
          isDemoMode={isDemoMode}
          onClose={() => setProgressModal(null)}
        />
      )}
      {viewProgressModal && (
        <ViewProgressModal
          exercise={viewProgressModal}
          isDemoMode={isDemoMode}
          onClose={() => setViewProgressModal(null)}
        />
      )}
    </>
  );
}
