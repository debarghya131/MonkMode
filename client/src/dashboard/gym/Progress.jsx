import { AnimatePresence, motion as Motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { createDemoWorkoutProgressMap } from "../../../data/GymDummyData";
import api from "../../api/axios";
import useAuth from "../../hooks/useAuth";

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
    return [...parsed]
      .filter((entry) => !entry?.deletedAt)
      .sort((a, b) => (a.checkInDate || "").localeCompare(b.checkInDate || ""));
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

const formatMetricValue = (value, unit = "") => (
  value == null ? "—" : `${Number.isInteger(value) ? value : value.toFixed(1)}${unit ? ` ${unit}` : ""}`
);
const buildWorkoutTrendPoints = (points) => points;

const getBodyGroup = (bodyPart = "") => {
  if (!bodyPart) return "Other";
  return bodyPart.split(" - ")[0]?.trim() || "Other";
};

const stableExerciseKey = (exercise = {}) => {
  const id = exercise?.id || "";
  if (id && !id.startsWith("custom-") && !id.startsWith("ex-")) return id;
  return (exercise?.name || "").toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
};

const mergeDemoWorkoutProgressSource = (source = {}) => {
  const storedSource = source && typeof source === "object" && !Array.isArray(source) ? source : {};
  return { ...createDemoWorkoutProgressMap(), ...storedSource };
};

const ensureWorkoutProgressSeed = () => {
  try {
    const seed = localStorage.getItem(WORKOUT_PROGRESS_SEED_KEY);
    if (seed === WORKOUT_PROGRESS_SEED_VERSION) return;
    const stored = localStorage.getItem(WORKOUT_PROGRESS_KEY);
    const parsed = stored ? JSON.parse(stored) : {};
    localStorage.setItem(
      WORKOUT_PROGRESS_KEY,
      JSON.stringify(mergeDemoWorkoutProgressSource(parsed))
    );
    localStorage.setItem(WORKOUT_PROGRESS_SEED_KEY, WORKOUT_PROGRESS_SEED_VERSION);
  } catch {
    // Ignore storage failures in private/incognito contexts.
  }
};

const buildExerciseMetaMap = (workouts) => {
  const meta = {};
  workouts.forEach((workout) => {
    (workout?.exercises || []).forEach((exercise) => {
      const metadata = {
        name: exercise.name || "",
        bodyPart: exercise.bodyPart || "",
      };
      if (exercise?.id) meta[exercise.id] = metadata;
      const stableKey = stableExerciseKey(exercise);
      if (stableKey) meta[stableKey] = metadata;
    });
  });
  return meta;
};

const mapWorkoutProgressEntries = (source, workouts = []) => {
  const metaMap = buildExerciseMetaMap(workouts);
  return Object.entries(source)
    .map(([entryKey, raw]) => {
      if (typeof entryKey !== "string" || entryKey.length < 12 || entryKey[10] !== "_") return null;
      const date = entryKey.slice(0, 10);
      const exerciseId = entryKey.slice(11);
      if (!exerciseId) return null;
      const value = raw && typeof raw === "object" ? raw : {};
      const fallback = metaMap[exerciseId] || {};

      const bodyPart = value.bodyPart || fallback.bodyPart || "";

      return {
        id: `${date}_${exerciseId}`,
        date,
        exerciseId,
        name: value.exerciseName || fallback.name || exerciseId,
        bodyPart,
        bodyGroup: getBodyGroup(bodyPart),
        sets: parseNum(value.sets),
        reps: parseNum(value.reps),
        weight: parseNum(value.lastSetWeight ?? value.weight),
        totalTime: parseNum(value.totalTime),
        restBetweenSets: parseNum(value.restBetweenSets),
        savedAt: value.savedAt || `${date}T00:00:00.000Z`,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.date.localeCompare(b.date));
};

const loadWorkoutProgressEntries = (workouts = []) => {
  try {
    ensureWorkoutProgressSeed();
    const stored = localStorage.getItem(WORKOUT_PROGRESS_KEY);
    const parsed = stored ? JSON.parse(stored) : {};
    const source = mergeDemoWorkoutProgressSource(parsed);
    return mapWorkoutProgressEntries(source, workouts);
  } catch {
    return [];
  }
};

const loadStoredWorkoutProgressSource = ({ includeDemoEntries = true } = {}) => {
  try {
    const stored = localStorage.getItem(WORKOUT_PROGRESS_KEY);
    const parsed = stored ? JSON.parse(stored) : {};
    const source = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    if (includeDemoEntries) return source;

    return Object.fromEntries(
      Object.entries(source).filter(([entryKey, raw]) => {
        const exerciseIdFromKey = typeof entryKey === "string" && entryKey.length > 11
          ? entryKey.slice(11)
          : "";
        const exerciseId = String(raw?.exerciseId || exerciseIdFromKey || "");
        return !exerciseId.startsWith("demo-");
      })
    );
  } catch {
    return {};
  }
};

const mapApiWorkoutProgressEntries = (payload, workouts = []) => {
  const source = payload && typeof payload === "object" && !Array.isArray(payload) ? payload : {};
  return mapWorkoutProgressEntries({ ...source, ...loadStoredWorkoutProgressSource({ includeDemoEntries: false }) }, workouts);
};

const buildExerciseProgressRows = (entries) => {
  const grouped = {};
  entries.forEach((entry) => {
    const nameKey = (entry.name || entry.exerciseId).toLowerCase().trim();
    if (!grouped[nameKey]) {
      grouped[nameKey] = {
        exerciseId: entry.exerciseId,
        name: entry.name,
        bodyPart: entry.bodyPart,
        bodyGroup: entry.bodyGroup,
        logs: [],
      };
    }
    grouped[nameKey].logs.push(entry);
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
  const { isDemoMode } = useAuth();
  const [progressEntries, setProgressEntries] = useState(() => (isDemoMode ? loadWorkoutProgressEntries(workouts) : []));
  const [groupFilter, setGroupFilter] = useState("All");
  const [selectedExerciseId, setSelectedExerciseId] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const syncDemo = () => {
      if (cancelled) return;
      setProgressEntries(loadWorkoutProgressEntries(loadWorkouts()));
    };

    const syncReal = async () => {
      try {
        const { data } = await api.get("/gym/exercise-progress");
        if (!cancelled) setProgressEntries(mapApiWorkoutProgressEntries(data, workouts));
      } catch {
        if (!cancelled) setProgressEntries([]);
      }
    };

    if (isDemoMode) {
      syncDemo();
    } else {
      void syncReal();
    }

    const sync = () => {
      if (isDemoMode) {
        syncDemo();
      } else {
        void syncReal();
      }
    };

    window.addEventListener("storage", sync);
    window.addEventListener("focus", sync);
    window.addEventListener("monkmode:exercise-progress-updated", sync);
    return () => {
      cancelled = true;
      window.removeEventListener("storage", sync);
      window.removeEventListener("focus", sync);
      window.removeEventListener("monkmode:exercise-progress-updated", sync);
    };
  }, [isDemoMode, workouts]);

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
    <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
      <div className="min-w-0 rounded-[1.4rem] border border-amber-100/10 bg-black/20 p-4 sm:rounded-2xl">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-500">Exercises</p>
          <span className="shrink-0 rounded-full border border-amber-100/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-stone-300">
            {visibleExercises.length} shown
          </span>
        </div>
        <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1 pr-1">
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

        <div className="journal-scroll mt-3 max-h-[40vh] space-y-2 overflow-y-auto pr-1 sm:max-h-[54vh] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-amber-400/20">
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
              <div className="flex min-w-0 flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="min-w-0 truncate text-xs font-semibold text-stone-100">{exercise.name}</p>
                <span className="rounded-full border border-amber-300/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-200">
                  {exercise.logs.length}
                </span>
              </div>
              <p className="mt-1 text-[10px] text-stone-500">
                {exercise.bodyGroup}
              </p>
            </Motion.button>
          ))}
        </div>
      </div>

      <div className="min-w-0 space-y-4">
        {selectedExercise && (
          <div className="rounded-[1.4rem] border border-amber-100/10 bg-black/20 p-4 sm:rounded-2xl">
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
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

        <div className="journal-scroll max-h-[42vh] space-y-3 overflow-y-auto pr-1 sm:max-h-[58vh] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-amber-400/20">
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
                className="rounded-[1.4rem] border border-amber-100/10 bg-black/20 p-4 sm:rounded-2xl"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: mi * 0.06, duration: 0.2 }}
              >
                <div className="mb-2 flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
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
  const { isDemoMode } = useAuth();
  const [entries, setEntries] = useState(() => (isDemoMode ? loadEntries() : []));
  const [groupFilter, setGroupFilter] = useState("All");
  const [selectedField, setSelectedField] = useState(MEAS_FIELDS[0].key);

  useEffect(() => {
    if (isDemoMode) {
      setEntries(loadEntries());
      return;
    }
    let cancelled = false;
    const fetch = async () => {
      try {
        const { data } = await api.get("/gym/measurements");
        if (!cancelled) {
          const sorted = (Array.isArray(data) ? data : [])
            .filter((entry) => !entry?.deletedAt)
            .slice()
            .sort((a, b) => (a.checkInDate || "").localeCompare(b.checkInDate || ""));
          setEntries(sorted);
        }
      } catch { if (!cancelled) setEntries([]); }
    };
    fetch();
    const onUpdate = () => fetch();
    window.addEventListener("monkmode:gym-measurements-updated", onUpdate);
    return () => { cancelled = true; window.removeEventListener("monkmode:gym-measurements-updated", onUpdate); };
  }, [isDemoMode]);

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
        <div className="rounded-[1.4rem] border border-amber-100/10 bg-black/20 p-4 sm:rounded-2xl">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-500">Select Metric</p>
          <div className="journal-scroll max-h-[42vh] space-y-1 overflow-y-auto pr-1 sm:max-h-[58.1vh] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-amber-400/20">
            {visibleFields.map((f) => {
              const vals = entries.map((e) => parseFloat(e[f.key])).filter((v) => !isNaN(v));
              const latest = vals.length ? vals[vals.length - 1] : null;
              const diff = vals.length > 1 ? vals[vals.length - 1] - vals[0] : null;
              return (
                <button key={f.key} type="button" onClick={() => setSelectedField(f.key)}
                  className={`flex w-full flex-col items-start gap-2 rounded-xl border px-3 py-2 text-left transition sm:flex-row sm:items-center sm:justify-between sm:gap-3 ${
                    selectedField === f.key
                      ? "border-amber-300/40 bg-amber-500/10"
                      : "border-amber-100/8 bg-white/3 hover:bg-white/6"
                  }`}>
                  <span className="text-xs font-semibold text-stone-200">{f.label}</span>
                  <div className="text-left sm:shrink-0 sm:text-right">
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
          <div className="rounded-[1.4rem] border border-amber-100/10 bg-black/20 p-4 sm:rounded-2xl">
            <div className="mb-2 flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs font-semibold text-stone-200">{activeField?.label} over time</p>
              {points.length > 1 && (
                <span className="text-[10px] text-stone-500">{points.length} data points</span>
              )}
            </div>
            {points.length > 1 ? (
              <MiniChart points={points} unit={activeField?.unit || ""} />
            ) : (
              <div className="rounded-xl border border-dashed border-amber-100/10 bg-black/20 px-3 py-5 text-center text-xs text-stone-500">
                Need at least 2 check-ins to draw trend.
              </div>
            )}
          </div>

          {/* Check-in history */}
          <div className="rounded-[1.4rem] border border-amber-100/10 bg-black/20 p-4 sm:rounded-2xl">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-500">Check-in Updates</p>
            <div className="journal-scroll max-h-[37vh] space-y-2 overflow-y-auto pr-1 sm:max-h-[42vh] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-amber-400/20">
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
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
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
                        <div key={f.key} className="min-w-0 rounded-lg border border-amber-100/10 bg-white/5 px-2.5 py-1.5">
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
    window.addEventListener("monkmode:gym-workouts-updated", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("monkmode:gym-workouts-updated", sync);
    };
  }, []);

  return (
    <div className="space-y-4">

      {/* Tab bar */}
      <div className="flex flex-col gap-2 rounded-[1.4rem] border border-amber-100/10 bg-black/20 p-1.5 sm:flex-row sm:items-center sm:rounded-2xl">
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
              animate={isActive
                ? { scale: 1, boxShadow: "0 0 20px rgba(251,191,36,0.35)" }
                : {
                    scale: [1, 1.04, 1],
                    boxShadow: [
                      "0 0 0px rgba(251,191,36,0)",
                      "0 0 12px rgba(251,191,36,0.4)",
                      "0 0 0px rgba(251,191,36,0)",
                    ],
                  }
              }
              transition={isActive
                ? { duration: 0.2 }
                : { duration: 2, repeat: Infinity, ease: "easeInOut" }
              }
              whileHover={!isActive ? {
                scale: 1.06,
                boxShadow: "0 0 18px rgba(251,191,36,0.55), 0 0 36px rgba(251,191,36,0.2)",
              } : {}}
              whileTap={{ scale: 0.95 }}
              className={`relative w-full overflow-hidden rounded-xl py-2.5 text-xs font-semibold transition duration-200 sm:flex-1 ${
                isActive
                  ? "border border-amber-300/40 bg-gradient-to-r from-[#ffd86b] via-[#f5b52f] to-[#ea8a17] text-stone-950"
                  : "border border-amber-100/10 text-stone-400 hover:border-amber-300/25 hover:bg-amber-500/10 hover:text-amber-200"
              }`}
            >
              {!isActive && (
                <Motion.span
                  className="pointer-events-none absolute inset-y-0 left-[-40%] w-[30%] -skew-x-12 bg-white/15 blur-sm"
                  animate={{ left: ["-40%", "130%"] }}
                  transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 1.4, ease: "easeInOut" }}
                />
              )}
              <span className="relative z-10">{label}</span>
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
