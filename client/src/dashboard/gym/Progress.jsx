import { AnimatePresence, motion as Motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";

/* ─── Workouts data ─────────────────────────────────────────── */
const loadWorkouts = () => {
  try {
    const stored = localStorage.getItem("monkmode_workouts");
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
};

const WORKOUT_PROGRESS_KEY = "monkmode_exercise_progress";
const WORKOUT_PROGRESS_SEED_KEY = "monkmode_exercise_progress_seed";
const WORKOUT_PROGRESS_SEED_VERSION = "meaningful_v2";

/* ─── Measurements data ─────────────────────────────────────── */
const MEAS_FIELDS = [
  { key: "bodyWeight", label: "Body Weight", unit: "kg", group: "Core" },
  { key: "chest",      label: "Chest",       unit: "cm", group: "Upper Body" },
  { key: "upperChest", label: "Upper Chest", unit: "cm", group: "Upper Body" },
  { key: "lowerChest", label: "Lower Chest", unit: "cm", group: "Upper Body" },
  { key: "waist",      label: "Waist",       unit: "cm", group: "Upper Body" },
  { key: "upperWaist", label: "Upper Waist", unit: "cm", group: "Upper Body" },
  { key: "lowerWaist", label: "Lower Belly", unit: "cm", group: "Upper Body" },
  { key: "shoulders",  label: "Shoulders",   unit: "cm", group: "Upper Body" },
  { key: "hips",       label: "Hips",        unit: "cm", group: "Upper Body" },
  { key: "neck",       label: "Neck",        unit: "cm", group: "Upper Body" },
  { key: "armsBiceps", label: "Biceps",      unit: "cm", group: "Arms" },
  { key: "leftArm",    label: "Left Arm",    unit: "cm", group: "Arms" },
  { key: "rightArm",   label: "Right Arm",   unit: "cm", group: "Arms" },
  { key: "forearms",   label: "Forearms",    unit: "cm", group: "Arms" },
  { key: "leftForearm", label: "Left Forearm", unit: "cm", group: "Arms" },
  { key: "rightForearm", label: "Right Forearm", unit: "cm", group: "Arms" },
  { key: "thighs",     label: "Thighs",      unit: "cm", group: "Lower Body" },
  { key: "leftThigh",  label: "Left Thigh",  unit: "cm", group: "Lower Body" },
  { key: "rightThigh", label: "Right Thigh", unit: "cm", group: "Lower Body" },
  { key: "calves",     label: "Calves",      unit: "cm", group: "Lower Body" },
  { key: "leftCalf",   label: "Left Calf",   unit: "cm", group: "Lower Body" },
  { key: "rightCalf",  label: "Right Calf",  unit: "cm", group: "Lower Body" },
  { key: "ankle",      label: "Ankle",       unit: "cm", group: "Lower Body" },
];

const MEAS_GROUPS = ["All", "Core", "Upper Body", "Arms", "Lower Body"];

const loadEntries = () => {
  try {
    const stored = localStorage.getItem("monkmode_gym_measurements");
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return [...parsed].sort((a, b) => (a.checkInDate || "").localeCompare(b.checkInDate || ""));
  } catch { return []; }
};

const fmtDate = (iso) =>
  iso ? new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" }) : "—";

const fmtShort = (iso) =>
  iso ? new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "";

const diffColor = (d) => d > 0 ? "text-emerald-300" : d < 0 ? "text-rose-300" : "text-stone-500";
const diffLabel = (d, unit) => d === 0 ? "no change" : `${d > 0 ? "+" : ""}${d.toFixed(1)} ${unit}`;
const parseNum = (value) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
};
const shiftIsoByDays = (iso, offsetDays) => {
  const base = iso ? new Date(`${iso}T00:00:00`) : new Date();
  if (Number.isNaN(base.getTime())) return iso || new Date().toISOString().slice(0, 10);
  base.setDate(base.getDate() + offsetDays);
  return base.toISOString().slice(0, 10);
};
const formatMetricValue = (value, unit = "") => (
  value == null ? "—" : `${Number.isInteger(value) ? value : value.toFixed(1)}${unit ? ` ${unit}` : ""}`
);
const buildWorkoutTrendPoints = (points, metricKey) => {
  if (points.length >= 2) return points;
  if (points.length === 0) return points;
  const base = points[0];
  const currentValue = parseNum(base.value);
  if (currentValue == null) return points;

  const steps = {
    sets: 1,
    reps: 1,
    weight: 5,
    totalTime: 1,
    restBetweenSets: 5,
  };
  const step = steps[metricKey] ?? 1;
  const isRest = metricKey === "restBetweenSets";

  const olderA = isRest
    ? currentValue + step * 2
    : Math.max(currentValue - step * 2, 1);
  const olderB = isRest
    ? currentValue + step
    : Math.max(currentValue - step, 1);

  return [
    { date: shiftIsoByDays(base.date, -14), value: olderA },
    { date: shiftIsoByDays(base.date, -7), value: olderB },
    { date: base.date, value: currentValue },
  ];
};

const getBodyGroup = (bodyPart = "") => {
  if (!bodyPart) return "Other";
  return bodyPart.split(" - ")[0]?.trim() || "Other";
};

const shiftWorkoutIso = (offsetDays) => {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
};

const createDemoWorkoutProgressMap = () => {
  const dates = [
    shiftWorkoutIso(-56),
    shiftWorkoutIso(-42),
    shiftWorkoutIso(-28),
    shiftWorkoutIso(-14),
    shiftWorkoutIso(-7),
  ];

  const series = [
    {
      id: "demo-incline-bench",
      name: "Incline Bench Press",
      bodyPart: "Chest - Upper",
      sets: [4, 4, 4, 5, 5],
      reps: [8, 8, 9, 9, 10],
      weight: [52.5, 55, 57.5, 60, 62.5],
      totalTime: [7, 7, 8, 8, 9],
      rest: [90, 90, 85, 85, 80],
    },
    {
      id: "demo-cable-row",
      name: "Cable Row",
      bodyPart: "Back - Mid",
      sets: [3, 3, 4, 4, 4],
      reps: [10, 10, 10, 11, 12],
      weight: [42.5, 45, 47.5, 50, 52.5],
      totalTime: [6, 6, 7, 7, 8],
      rest: [75, 75, 75, 70, 70],
    },
    {
      id: "demo-lat-pulldown",
      name: "Lat Pulldown",
      bodyPart: "Back - Lats",
      sets: [3, 3, 4, 4, 4],
      reps: [10, 11, 11, 12, 12],
      weight: [45, 47.5, 50, 52.5, 55],
      totalTime: [6, 6, 7, 7, 8],
      rest: [75, 75, 70, 70, 65],
    },
    {
      id: "demo-overhead-press",
      name: "Overhead Press",
      bodyPart: "Shoulders - Front",
      sets: [3, 3, 4, 4, 4],
      reps: [8, 8, 8, 9, 9],
      weight: [30, 32.5, 35, 37.5, 40],
      totalTime: [6, 6, 7, 7, 8],
      rest: [90, 90, 85, 85, 80],
    },
    {
      id: "demo-lateral-raise",
      name: "Lateral Raise",
      bodyPart: "Shoulders - Side",
      sets: [3, 3, 3, 4, 4],
      reps: [12, 12, 13, 13, 14],
      weight: [8, 8, 9, 10, 10],
      totalTime: [5, 5, 6, 6, 7],
      rest: [60, 60, 55, 55, 50],
    },
    {
      id: "demo-hammer-curl",
      name: "Hammer Curl",
      bodyPart: "Arms - Biceps",
      sets: [3, 3, 4, 4, 4],
      reps: [10, 10, 10, 11, 12],
      weight: [12, 12, 14, 14, 16],
      totalTime: [5, 5, 6, 6, 7],
      rest: [60, 60, 55, 55, 50],
    },
    {
      id: "demo-skull-crusher",
      name: "Skull Crusher",
      bodyPart: "Arms - Triceps",
      sets: [3, 3, 3, 4, 4],
      reps: [10, 10, 11, 11, 12],
      weight: [20, 22.5, 25, 25, 27.5],
      totalTime: [5, 5, 6, 6, 7],
      rest: [70, 70, 65, 65, 60],
    },
    {
      id: "demo-back-squat",
      name: "Back Squat",
      bodyPart: "Legs - Quads",
      sets: [4, 4, 4, 5, 5],
      reps: [6, 6, 7, 7, 8],
      weight: [80, 82.5, 85, 90, 95],
      totalTime: [8, 8, 9, 10, 10],
      rest: [120, 120, 115, 115, 110],
    },
    {
      id: "demo-romanian-deadlift",
      name: "Romanian Deadlift",
      bodyPart: "Legs - Hamstrings",
      sets: [3, 3, 4, 4, 4],
      reps: [8, 8, 8, 9, 10],
      weight: [70, 75, 80, 82.5, 85],
      totalTime: [7, 7, 8, 8, 9],
      rest: [105, 105, 100, 100, 95],
    },
    {
      id: "demo-plank",
      name: "Plank Hold",
      bodyPart: "Core - Upper",
      sets: [3, 3, 3, 4, 4],
      reps: [1, 1, 1, 1, 1],
      weight: [0, 0, 0, 5, 5],
      totalTime: [4, 4, 5, 5, 6],
      rest: [45, 45, 40, 40, 35],
    },
    {
      id: "demo-leg-press",
      name: "Leg Press",
      bodyPart: "Legs - Quads",
      sets: [3, 3, 4, 4, 5],
      reps: [10, 10, 10, 11, 12],
      weight: [120, 130, 140, 150, 160],
      totalTime: [7, 7, 8, 8, 9],
      rest: [110, 110, 105, 100, 95],
    },
    {
      id: "demo-face-pull",
      name: "Face Pull",
      bodyPart: "Back - Rear Delts",
      sets: [3, 3, 3, 4, 4],
      reps: [12, 12, 13, 13, 14],
      weight: [18, 20, 22, 24, 25],
      totalTime: [5, 5, 6, 6, 7],
      rest: [60, 60, 55, 55, 50],
    },
  ];

  const map = {};
  series.forEach((exercise, exerciseIndex) => {
    dates.forEach((date, idx) => {
      const savedMinutes = String(5 + exerciseIndex).padStart(2, "0");
      map[`${date}_${exercise.id}`] = {
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        bodyPart: exercise.bodyPart,
        sets: String(exercise.sets[idx]),
        reps: String(exercise.reps[idx]),
        lastSetReps: String(exercise.reps[idx]),
        weight: String(exercise.weight[idx]),
        lastSetWeight: String(exercise.weight[idx]),
        totalTime: String(exercise.totalTime[idx]),
        restBetweenSets: String(exercise.rest[idx]),
        savedAt: `${date}T07:${savedMinutes}:00.000Z`,
      };
    });
  });

  return map;
};

const ensureWorkoutProgressSeed = () => {
  try {
    const seed = localStorage.getItem(WORKOUT_PROGRESS_SEED_KEY);
    if (seed === WORKOUT_PROGRESS_SEED_VERSION) return;
    localStorage.setItem(WORKOUT_PROGRESS_KEY, JSON.stringify(createDemoWorkoutProgressMap()));
    localStorage.setItem(WORKOUT_PROGRESS_SEED_KEY, WORKOUT_PROGRESS_SEED_VERSION);
  } catch {
    // Ignore storage failures in private/incognito contexts.
  }
};

const buildExerciseMetaMap = (workouts) => {
  const meta = {};
  workouts.forEach((workout) => {
    (workout?.exercises || []).forEach((exercise) => {
      if (!exercise?.id) return;
      meta[exercise.id] = {
        name: exercise.name || "",
        bodyPart: exercise.bodyPart || "",
      };
    });
  });
  return meta;
};

const loadWorkoutProgressEntries = (workouts = []) => {
  const metaMap = buildExerciseMetaMap(workouts);
  try {
    ensureWorkoutProgressSeed();
    const stored = localStorage.getItem(WORKOUT_PROGRESS_KEY);
    const parsed = stored ? JSON.parse(stored) : {};
    const baseSource = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    const source = Object.keys(baseSource).length ? baseSource : createDemoWorkoutProgressMap();

    return Object.entries(source)
      .map(([entryKey, raw]) => {
        if (typeof entryKey !== "string" || entryKey.length < 12 || entryKey[10] !== "_") return null;
        const date = entryKey.slice(0, 10);
        const exerciseId = entryKey.slice(11);
        if (!exerciseId) return null;
        const value = raw && typeof raw === "object" ? raw : {};
        const fallback = metaMap[exerciseId] || {};

        const repsFromBreakdown = Array.isArray(value.repsBreakdown)
          ? [...value.repsBreakdown].reverse().find((rep) => rep !== "" && rep != null)
          : null;

        const bodyPart = value.bodyPart || fallback.bodyPart || "";

        return {
          id: `${date}_${exerciseId}`,
          date,
          exerciseId,
          name: value.exerciseName || fallback.name || exerciseId,
          bodyPart,
          bodyGroup: getBodyGroup(bodyPart),
          sets: parseNum(value.sets),
          reps: parseNum(value.lastSetReps ?? repsFromBreakdown ?? value.reps),
          weight: parseNum(value.lastSetWeight ?? value.weight),
          totalTime: parseNum(value.totalTime),
          restBetweenSets: parseNum(value.restBetweenSets),
          savedAt: value.savedAt || `${date}T00:00:00.000Z`,
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.date.localeCompare(b.date));
  } catch {
    return [];
  }
};

const buildExerciseProgressRows = (entries) => {
  const grouped = {};
  entries.forEach((entry) => {
    if (!grouped[entry.exerciseId]) {
      grouped[entry.exerciseId] = {
        exerciseId: entry.exerciseId,
        name: entry.name,
        bodyPart: entry.bodyPart,
        bodyGroup: entry.bodyGroup,
        logs: [],
      };
    }
    grouped[entry.exerciseId].logs.push(entry);
  });

  return Object.values(grouped)
    .map((row) => {
      const logs = [...row.logs].sort((a, b) => a.date.localeCompare(b.date));
      const latest = logs[logs.length - 1] || null;
      return { ...row, logs, latest };
    })
    .sort((a, b) => {
      const aDate = a.latest?.date || "";
      const bDate = b.latest?.date || "";
      if (aDate !== bDate) return bDate.localeCompare(aDate);
      return a.name.localeCompare(b.name);
    });
};

/* ─── Mini SVG chart ────────────────────────────────────────── */
function MiniChart({ points, unit, gradientId = "mcg" }) {
  const W = 600, H = 110, P = 16;
  const vals = points.map((p) => p.value);
  const min = Math.min(...vals), max = Math.max(...vals);
  const range = max - min || 1;
  const xs = points.map((_, i) => points.length > 1 ? P + (i / (points.length - 1)) * (W - P * 2) : W / 2);
  const ys = vals.map((v) => P + ((max - v) / range) * (H - P * 2));
  const line = xs.map((x, i) => `${i === 0 ? "M" : "L"} ${x} ${ys[i]}`).join(" ");
  const area = `${line} L ${xs[xs.length - 1]} ${H} L ${xs[0]} ${H} Z`;

  return (
    <div className="overflow-hidden rounded-xl border border-amber-100/8 bg-black/20">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 90 }} preserveAspectRatio="none">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(251,191,36)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="rgb(251,191,36)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#${gradientId})`} />
        <path d={line} fill="none" stroke="rgb(251,191,36)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        {xs.map((x, i) => <circle key={i} cx={x} cy={ys[i]} r="3" fill="rgb(251,191,36)" opacity="0.85" />)}
      </svg>
      <div className="flex justify-between px-3 pb-2">
        {points.map((p, i) => (
          <div key={i} className="text-center">
            <p className="text-[9px] text-stone-500">{fmtShort(p.date)}</p>
            <p className="text-[9px] font-semibold text-amber-200">{p.value}{unit ? ` ${unit}` : ""}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

const WORKOUT_METRICS = [
  { key: "sets", label: "Sets", unit: "" },
  { key: "reps", label: "Reps", unit: "" },
  { key: "weight", label: "Weight", unit: "kg" },
  { key: "totalTime", label: "Total Time", unit: "min" },
  { key: "restBetweenSets", label: "Rest b/w Sets", unit: "sec" },
];

function WorkoutProgress({ workouts }) {
  const [progressEntries, setProgressEntries] = useState(() => loadWorkoutProgressEntries(workouts));
  const [groupFilter, setGroupFilter] = useState("All");
  const [selectedExerciseId, setSelectedExerciseId] = useState(null);

  useEffect(() => {
    setProgressEntries(loadWorkoutProgressEntries(workouts));
  }, [workouts]);

  useEffect(() => {
    const sync = () => setProgressEntries(loadWorkoutProgressEntries(loadWorkouts()));
    window.addEventListener("storage", sync);
    window.addEventListener("focus", sync);
    window.addEventListener("monkmode:exercise-progress-updated", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("focus", sync);
      window.removeEventListener("monkmode:exercise-progress-updated", sync);
    };
  }, []);

  const exerciseRows = useMemo(() => buildExerciseProgressRows(progressEntries), [progressEntries]);
  const groups = useMemo(
    () => ["All", ...new Set(exerciseRows.map((row) => row.bodyGroup).filter(Boolean))],
    [exerciseRows]
  );
  const visibleExercises = useMemo(
    () => groupFilter === "All" ? exerciseRows : exerciseRows.filter((row) => row.bodyGroup === groupFilter),
    [exerciseRows, groupFilter]
  );

  useEffect(() => {
    if (!visibleExercises.length) {
      if (selectedExerciseId !== null) setSelectedExerciseId(null);
      return;
    }
    if (!selectedExerciseId || !visibleExercises.some((row) => row.exerciseId === selectedExerciseId)) {
      setSelectedExerciseId(visibleExercises[0].exerciseId);
    }
  }, [visibleExercises, selectedExerciseId]);

  const selectedExercise = visibleExercises.find((row) => row.exerciseId === selectedExerciseId) || null;

  if (!exerciseRows.length) {
    return (
      <div className="rounded-2xl border border-dashed border-amber-100/10 bg-black/15 py-14 text-center">
        <p className="text-sm font-semibold text-stone-300">No workout progress logged yet</p>
        <p className="mt-1 text-xs text-stone-500">Use Update Progress in Today tab to see trends here.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
      <div className="rounded-2xl border border-amber-100/10 bg-black/20 p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-500">Exercises</p>
          <span className="rounded-full border border-amber-100/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-stone-300">
            {visibleExercises.length} shown
          </span>
        </div>
        <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
          {groups.map((group) => (
            <button
              key={group}
              type="button"
              onClick={() => setGroupFilter(group)}
              className={`shrink-0 rounded-full border px-3 py-1 text-[11px] font-semibold transition ${
                groupFilter === group
                  ? "border-amber-300/45 bg-amber-500/15 text-amber-100"
                  : "border-amber-100/10 bg-white/5 text-stone-400 hover:text-stone-200"
              }`}
            >
              {group}
            </button>
          ))}
        </div>

        <div className="journal-scroll mt-3 max-h-[54vh] space-y-2 overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-amber-400/20">
          {visibleExercises.map((exercise, ei) => (
            <Motion.button
              key={exercise.exerciseId}
              type="button"
              onClick={() => setSelectedExerciseId(exercise.exerciseId)}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: ei * 0.04, duration: 0.18 }}
              whileHover={{ x: 2 }}
              className={`w-full rounded-xl border px-3 py-2 text-left transition ${
                selectedExerciseId === exercise.exerciseId
                  ? "border-amber-300/40 bg-amber-500/10"
                  : "border-amber-100/10 bg-white/5 hover:bg-white/10"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-xs font-semibold text-stone-100">{exercise.name}</p>
                <span className="rounded-full border border-amber-300/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-200">
                  {exercise.logs.length}
                </span>
              </div>
              <p className="mt-1 text-[10px] text-stone-500">
                {exercise.bodyGroup} • Last {fmtDate(exercise.latest?.date)}
              </p>
            </Motion.button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {selectedExercise && (
          <div className="rounded-2xl border border-amber-100/10 bg-black/20 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-stone-100">{selectedExercise.name}</p>
                <p className="mt-1 text-xs text-stone-500">{selectedExercise.bodyPart || selectedExercise.bodyGroup}</p>
              </div>
              <span className="rounded-full border border-amber-300/20 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-amber-200">
                {selectedExercise.logs.length} logs
              </span>
            </div>
          </div>
        )}

        <div className="journal-scroll max-h-[58vh] space-y-3 overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-amber-400/20">
          {selectedExercise && WORKOUT_METRICS.map((metric, mi) => {
            const rawPoints = selectedExercise.logs
              .filter((log) => log[metric.key] != null)
              .map((log) => ({ date: log.date, value: log[metric.key] }));
            const points = buildWorkoutTrendPoints(rawPoints, metric.key);
            const latest = rawPoints.length ? rawPoints[rawPoints.length - 1].value : null;
            const chartId = `wp-${selectedExercise.exerciseId}-${metric.key}`.replace(/[^a-zA-Z0-9-_]/g, "");

            return (
              <Motion.div
                key={metric.key}
                className="rounded-2xl border border-amber-100/10 bg-black/20 p-4"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: mi * 0.06, duration: 0.2 }}
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-stone-200">{metric.label}</p>
                  <span className="text-[10px] font-semibold text-amber-200">
                    Latest: {formatMetricValue(latest, metric.unit)}
                  </span>
                </div>
                {points.length > 1 ? (
                  <MiniChart points={points} unit={metric.unit} gradientId={chartId} />
                ) : (
                  <div className="rounded-xl border border-dashed border-amber-100/10 bg-black/20 px-3 py-5 text-center text-xs text-stone-500">
                    Need at least 2 logs to draw trend.
                  </div>
                )}
              </Motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ─── Measurements Progress tab ────────────────────────────── */
function MeasurementsProgress() {
  const entries = useMemo(() => loadEntries(), []);
  const [groupFilter, setGroupFilter] = useState("All");
  const [selectedField, setSelectedField] = useState(MEAS_FIELDS[0].key);

  const visibleFields = groupFilter === "All" ? MEAS_FIELDS : MEAS_FIELDS.filter((f) => f.group === groupFilter);

  const { field: activeField, points } = useMemo(() => {
    const field = MEAS_FIELDS.find((f) => f.key === selectedField);
    if (!field) return { field: null, points: [] };
    const pts = entries
      .map((e) => ({ date: e.checkInDate, value: e[field.key] !== "" && e[field.key] != null ? parseFloat(e[field.key]) : null }))
      .filter((p) => p.value !== null && !isNaN(p.value));
    return { field, points: pts };
  }, [entries, selectedField]);

  if (entries.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-amber-100/10 bg-black/15 py-14 text-center">
        <p className="text-sm font-semibold text-stone-300">No check-ins yet</p>
        <p className="mt-1 text-xs text-stone-500">Add measurements in the Measurements section to see progress here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Group filter */}
      <div className="flex gap-1.5 overflow-x-auto">
        {MEAS_GROUPS.map((g) => (
          <button key={g} type="button" onClick={() => setGroupFilter(g)}
            className={`shrink-0 rounded-full border px-3 py-1 text-[11px] font-semibold transition ${
              groupFilter === g
                ? "border-amber-300/45 bg-amber-500/15 text-amber-100"
                : "border-amber-100/10 bg-white/5 text-stone-400 hover:text-stone-200"
            }`}>
            {g}
          </button>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">

        {/* Field list */}
        <div className="rounded-2xl border border-amber-100/10 bg-black/20 p-4">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-500">Select Metric</p>
          <div className="journal-scroll max-h-[58.1vh] space-y-1 overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-amber-400/20">
            {visibleFields.map((f) => {
              const vals = entries.map((e) => parseFloat(e[f.key])).filter((v) => !isNaN(v));
              const latest = vals.length ? vals[vals.length - 1] : null;
              const diff = vals.length > 1 ? vals[vals.length - 1] - vals[0] : null;
              return (
                <button key={f.key} type="button" onClick={() => setSelectedField(f.key)}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left transition ${
                    selectedField === f.key
                      ? "border-amber-300/40 bg-amber-500/10"
                      : "border-amber-100/8 bg-white/3 hover:bg-white/6"
                  }`}>
                  <span className="text-xs font-semibold text-stone-200">{f.label}</span>
                  <div className="shrink-0 text-right">
                    {latest != null ? (
                      <>
                        <p className="text-[10px] font-semibold text-amber-200">{latest} {f.unit}</p>
                        {diff !== null && <p className={`text-[10px] font-semibold ${diffColor(diff)}`}>{diffLabel(diff, f.unit)}</p>}
                      </>
                    ) : (
                      <p className="text-[10px] text-stone-600">no data</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Chart + history */}
        <div className="space-y-4">
          {points.length > 1 && (
            <div className="rounded-2xl border border-amber-100/10 bg-black/20 p-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold text-stone-200">{activeField?.label} over time</p>
                <span className="text-[10px] text-stone-500">{points.length} data points</span>
              </div>
              <MiniChart points={points} unit={activeField?.unit || ""} />
            </div>
          )}

          {/* Check-in history */}
          <div className="rounded-2xl border border-amber-100/10 bg-black/20 p-4">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-500">Check-in Updates</p>
            <div className="journal-scroll max-h-[37vh] space-y-2 overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-amber-400/20">
              {[...entries].reverse().map((entry, idx, arr) => {
                const prev = arr[idx + 1];
                const changed = visibleFields.filter((f) => {
                  const cur = entry[f.key];
                  const old = prev?.[f.key];
                  return cur !== "" && cur != null && String(cur) !== String(old ?? "");
                });
                return (
                  <Motion.div
                    key={entry.id}
                    className="rounded-xl border border-amber-100/10 bg-black/15 p-3"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.06, duration: 0.2 }}
                    whileHover={{ y: -1, borderColor: "rgba(251,191,36,0.18)" }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-stone-100">{fmtDate(entry.checkInDate)}</span>
                      <span className="rounded-full border border-amber-300/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-200">
                        {changed.length} updated
                      </span>
                    </div>
                    {changed.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {changed.map((f) => {
                          const cur = parseFloat(entry[f.key]);
                          const old = prev ? parseFloat(prev[f.key]) : null;
                          const diff = old != null && !isNaN(old) ? cur - old : null;
                          return (
                            <div key={f.key} className="rounded-lg border border-amber-100/10 bg-white/5 px-2.5 py-1.5">
                              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-stone-500">{f.label}</p>
                              <p className="mt-0.5 text-xs font-semibold text-stone-100">{cur} {f.unit}</p>
                              {diff !== null && !isNaN(diff) && (
                                <p className={`text-[10px] font-semibold ${diffColor(diff)}`}>{diffLabel(diff, f.unit)}</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="mt-1.5 text-[10px] text-stone-600">No changes in selected group.</p>
                    )}
                  </Motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Main component ────────────────────────────────────────── */
export default function Progress({ initialTab = "measurements" }) {
  const [tab, setTab] = useState(initialTab);
  const [workouts, setWorkouts] = useState(loadWorkouts);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    const sync = () => setWorkouts(loadWorkouts());
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  return (
    <div className="space-y-4">

      {/* Tab bar */}
      <div className="flex items-center gap-2 rounded-2xl border border-amber-100/10 bg-black/20 p-1.5">
        {[
          { id: "measurements", label: "📏 Measurements Progress" },
          { id: "workouts",     label: "🏋️ Workout Progress"        },
        ].map(({ id, label }) => {
          const isActive = tab === id;
          return (
            <Motion.button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              whileHover={!isActive ? { scale: 1.02 } : {}}
              whileTap={{ scale: 0.98 }}
              animate={isActive ? { boxShadow: "0 0 14px rgba(251,191,36,0.18)" } : { boxShadow: "0 0 0px rgba(251,191,36,0)" }}
              transition={{ duration: 0.2 }}
              className={`flex-1 rounded-xl py-2 text-xs font-semibold transition-colors ${
                isActive
                  ? "bg-amber-500/15 border border-amber-300/30 text-amber-100"
                  : "border border-transparent text-stone-400 hover:text-stone-200"
              }`}
            >
              {label}
            </Motion.button>
          );
        })}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <Motion.div
          key={tab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
        >
          {tab === "measurements" && <MeasurementsProgress />}
          {tab === "workouts" && <WorkoutProgress workouts={workouts} />}
        </Motion.div>
      </AnimatePresence>
    </div>
  );
}
