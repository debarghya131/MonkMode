import { motion as Motion } from "framer-motion";
import { useEffect, useState } from "react";
import { WORKOUT_SPLITS } from "./workoutLibraryData";

const getSplitLabel = (val) => WORKOUT_SPLITS.find((s) => s.value === val)?.label || val || "";

const loadWorkouts = () => {
  try {
    const stored = localStorage.getItem("monkmode_workouts");
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
};

const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const todayDay = () => WEEK_DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];

const formatDate = (day) => {
  const today = todayDay();
  if (day === today) return "Today";
  return day;
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

/* ── Demo Diet Data ── */
const DEMO_FULL_DIET = {
  Mon: { morning: ["Warm lemon water", "Soaked almonds (10)"], breakfast: ["Oats with banana & honey", "2 boiled eggs"], lunch: ["Brown rice (1 cup)", "Grilled chicken (150g)", "Cucumber salad"], evening: ["Whey protein shake", "Apple"], dinner: ["Grilled salmon (120g)", "Steamed broccoli"] },
  Tue: { morning: ["Green tea"], breakfast: ["Multigrain toast (2)", "Peanut butter (1 tbsp)"], lunch: ["Quinoa bowl", "Grilled paneer (100g)"], evening: ["Greek yogurt with nuts"], dinner: ["Dal (1 bowl)", "Chapati (2)"] },
  Wed: { morning: ["Apple cider vinegar water"], breakfast: ["Protein pancakes (3)", "Mixed berries"], lunch: ["Chicken wrap", "Side salad"], evening: ["Casein protein shake"], dinner: ["Egg white omelette", "Sauteed spinach"] },
  Thu: { morning: ["Warm water + lemon"], breakfast: ["Scrambled eggs (3)", "Whole wheat toast"], lunch: ["Grilled chicken rice bowl"], evening: ["Protein shake"], dinner: ["Stir fry veggies + tofu"] },
  Fri: { morning: ["Coconut water"], breakfast: ["Avocado toast", "2 eggs"], lunch: ["Tuna salad wrap"], evening: ["Trail mix"], dinner: ["Grilled fish + sweet potato"] },
  Sat: { morning: ["Black coffee"], breakfast: ["Pancakes + honey"], lunch: ["Pasta + chicken"], evening: ["Banana + peanut butter"], dinner: ["Rice + dal + sabzi"] },
  Sun: { morning: ["Herbal tea"], breakfast: ["Poha + curd"], lunch: ["Rajma chawal"], evening: ["Sprouts chaat"], dinner: ["Soup + bread"] },
};

const DEMO_SUPPLEMENTS = {
  Mon: ["Creatine (5g) — 8:00 AM", "Vitamin D3 (2000 IU) — 8:30 AM", "Omega-3 (1000mg) — 1:00 PM", "Magnesium (400mg) — 9:00 PM"],
  Tue: ["Creatine (5g) — 8:00 AM", "Vitamin D3 (2000 IU) — 8:30 AM", "Zinc (25mg) — 9:00 PM"],
  Wed: ["Creatine (5g) — 8:00 AM", "Omega-3 (1000mg) — 1:00 PM"],
  Thu: ["Creatine (5g) — 8:00 AM", "Vitamin D3 (2000 IU) — 8:30 AM", "Magnesium (400mg) — 9:00 PM"],
  Fri: ["Pre-workout (1 scoop) — 4:30 PM", "Whey protein (30g) — 6:30 PM"],
  Sat: ["Creatine (5g) — 8:00 AM", "Omega-3 (1000mg) — 1:00 PM"],
  Sun: ["Vitamin D3 (2000 IU) — 8:30 AM", "Magnesium (400mg) — 9:00 PM"],
};

const DEMO_PREWORKOUT = {
  Mon: { pre: ["Banana + black coffee — 4:30 PM", "BCAA drink — 4:45 PM"], post: ["Whey protein shake — 6:30 PM", "Rice cakes (3) — 6:35 PM"] },
  Tue: { pre: ["Oats + honey — 6:45 AM", "Espresso — 7:00 AM"], post: ["Protein shake + milk — 9:00 AM"] },
  Wed: { pre: ["Toast + jam — 9:00 AM"], post: ["Chocolate milk (300ml) — 11:00 AM", "Handful of almonds — 11:10 AM"] },
  Thu: { pre: ["Banana — 5:00 PM", "Black coffee — 5:10 PM"], post: ["Whey isolate — 7:00 PM"] },
  Fri: { pre: ["Pre-workout — 4:30 PM"], post: ["Protein shake — 6:30 PM", "Banana — 6:35 PM"] },
  Sat: { pre: ["Coffee + banana — 8:00 AM"], post: ["Protein shake — 10:30 AM"] },
  Sun: { pre: ["Light snack — 9:00 AM"], post: ["Protein smoothie — 11:00 AM"] },
};

const DEMO_MACROS = {
  Mon: { protein: "180g", carbs: "280g", fats: "65g", fiber: "35g", calories: "2450 kcal", water: "3.5L", sugar: "40g", sodium: "1800mg" },
  Tue: { protein: "175g", carbs: "260g", fats: "60g", fiber: "32g", calories: "2300 kcal", water: "3L", sugar: "35g", sodium: "1700mg" },
  Wed: { protein: "160g", carbs: "200g", fats: "55g", fiber: "30g", calories: "1950 kcal", water: "3L", sugar: "30g", sodium: "1500mg" },
  Thu: { protein: "185g", carbs: "290g", fats: "68g", fiber: "36g", calories: "2500 kcal", water: "3.5L", sugar: "42g", sodium: "1850mg" },
  Fri: { protein: "170g", carbs: "240g", fats: "58g", fiber: "28g", calories: "2200 kcal", water: "3L", sugar: "33g", sodium: "1600mg" },
  Sat: { protein: "165g", carbs: "270g", fats: "62g", fiber: "30g", calories: "2350 kcal", water: "3L", sugar: "38g", sodium: "1750mg" },
  Sun: { protein: "150g", carbs: "230g", fats: "55g", fiber: "28g", calories: "2100 kcal", water: "2.5L", sugar: "30g", sodium: "1550mg" },
};

/* ── Diet Modal ── */
function DietModal({ type, day, onClose }) {
  const titles = { diet: "Full Day Diet", supps: "Supplements", preworkout: "Pre & Post Workout", macros: "Macros" };

  const renderContent = () => {
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
          {items.length === 0 ? <p className="text-xs text-stone-500">No supplements for {day}.</p> : items.map((item, i) => (
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

/* ── Exercise Detail Modal ── */
const PROGRESS_KEY = "monkmode_exercise_progress";

const loadProgress = () => {
  try { return JSON.parse(localStorage.getItem(PROGRESS_KEY)) || {}; }
  catch { return {}; }
};

const saveProgress = (data) => {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(data));
  window.dispatchEvent(new Event("monkmode:exercise-progress-updated"));
};

function UpdateProgressModal({ exercise, onClose }) {
  const today = new Date().toISOString().slice(0, 10);
  const key = `${today}_${exercise.id}`;
  const all = loadProgress();
  const existing = all[key] || {};

  const numSets = parseInt(existing.sets ?? exercise.sets) || 0;
  const initRepsBreakdown = existing.repsBreakdown ?? Array(numSets).fill("");

  const [sets, setSets] = useState(existing.sets ?? exercise.sets ?? "");
  const reps = existing.reps ?? exercise.reps ?? "";
  const weight = existing.weight ?? (exercise.weight !== "0" ? exercise.weight : "");
  const [lastSetWeight, setLastSetWeight] = useState(existing.lastSetWeight ?? "");
  const [repsBreakdown, setRepsBreakdown] = useState(initRepsBreakdown);
  const [totalTime, setTotalTime] = useState(existing.totalTime ?? "");
  const [restBetweenSets, setRestBetweenSets] = useState(existing.restBetweenSets ?? "");
  const [notes, setNotes] = useState(existing.notes ?? "");

  const setsCount = parseInt(sets) || 0;
  const breakdown = Array.from({ length: setsCount }, (_, i) => repsBreakdown[i] ?? "");
  const lastSetReps = breakdown[breakdown.length - 1] ?? "";

  const handleBreakdown = (i, val) => {
    setRepsBreakdown((prev) => { const next = [...prev]; next[i] = val; return next; });
  };

  const handleSave = () => {
    const updated = {
      ...loadProgress(),
      [key]: {
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        bodyPart: exercise.bodyPart || "",
        sets,
        reps,
        weight,
        lastSetReps,
        lastSetWeight,
        repsBreakdown: breakdown,
        totalTime,
        restBetweenSets,
        notes,
        savedAt: new Date().toISOString(),
      },
    };
    saveProgress(updated);
    onClose();
  };

  const vol = sets && reps && weight
    ? (parseInt(sets) * parseInt(reps) * parseFloat(weight)).toFixed(0) + " kg"
    : sets && reps
    ? parseInt(sets) * parseInt(reps) + " reps"
    : null;

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
          <div className="rounded-xl border border-amber-100/10 bg-black/20 px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-500 mb-1">Sets done</p>
            <input
              type="number"
              value={sets}
              onChange={(e) => setSets(e.target.value)}
              placeholder={exercise.sets}
              className="w-full bg-transparent text-xs font-semibold text-stone-100 outline-none placeholder:text-stone-600"
            />
          </div>

          {/* Reps Breakdown */}
          {setsCount > 0 && (
            <div className="rounded-xl border border-amber-100/10 bg-black/20 px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-500 mb-2">Reps Breakdown</p>
              <div className="flex flex-wrap gap-3">
                {breakdown.map((val, i) => {
                  const target = parseInt(exercise.reps) || 0;
                  const done = parseInt(val) || 0;
                  const remaining = target > 0 && val !== "" ? Math.max(target - done, 0) : null;
                  const over = target > 0 && val !== "" && done > target;
                  return (
                    <div key={i} className="flex flex-col items-center gap-1">
                      <span className="text-[9px] text-stone-600">S{i + 1}</span>
                      <input
                        type="number"
                        value={val}
                        onChange={(e) => handleBreakdown(i, e.target.value)}
                        placeholder="—"
                        className={`w-10 rounded-lg border py-1 text-center text-xs font-semibold text-stone-100 outline-none placeholder:text-stone-700 bg-black/30 ${
                          val === "" ? "border-amber-100/10" : over ? "border-emerald-400/40" : remaining === 0 ? "border-emerald-400/40" : "border-rose-400/40"
                        }`}
                      />
                      {remaining !== null && (
                        <span className={`text-[8px] font-semibold leading-none ${over ? "text-emerald-400" : remaining === 0 ? "text-emerald-400" : "text-rose-400/80"}`}>
                          {over ? `+${done - target}/${target}` : `${done}+${remaining}/${target}`}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Last Set Weight */}
          <div className="rounded-xl border border-amber-100/10 bg-black/20 px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-500 mb-1">Last Set Weight</p>
            <input
              type="number"
              value={lastSetWeight}
              onChange={(e) => setLastSetWeight(e.target.value)}
              placeholder="kg"
              className="w-full bg-transparent text-xs font-semibold text-stone-100 outline-none placeholder:text-stone-600"
            />
          </div>

          {/* Total Time & Rest */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-amber-100/10 bg-black/20 px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-500 mb-1">Total Time (min)</p>
              <input
                type="number"
                value={totalTime}
                onChange={(e) => setTotalTime(e.target.value)}
                placeholder="—"
                className="w-full bg-transparent text-xs font-semibold text-stone-100 outline-none placeholder:text-stone-600"
              />
            </div>
            <div className="rounded-xl border border-amber-100/10 bg-black/20 px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-500 mb-1">Rest b/w Sets (sec)</p>
              <input
                type="number"
                value={restBetweenSets}
                onChange={(e) => setRestBetweenSets(e.target.value)}
                placeholder="—"
                className="w-full bg-transparent text-xs font-semibold text-stone-100 outline-none placeholder:text-stone-600"
              />
            </div>
          </div>

          {vol && (
            <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/8 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-500">Volume</p>
              <p className="mt-0.5 text-xs font-semibold text-emerald-300">{vol}</p>
            </div>
          )}
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes (optional)…"
            rows={2}
            className="w-full rounded-xl border border-amber-100/10 bg-black/20 px-3 py-2.5 text-xs text-stone-200 outline-none placeholder:text-stone-600 resize-none"
          />
          <button
            type="button"
            onClick={handleSave}
            className="w-full rounded-xl border border-amber-400/30 bg-amber-500/15 py-2 text-xs font-semibold text-amber-200 transition hover:bg-amber-500/25"
          >
            Save Progress
          </button>
        </div>
      </div>
    </div>
  );
}

function ViewProgressModal({ exercise, onClose }) {
  const all = loadProgress();
  const entries = Object.entries(all)
    .filter(([k]) => k.endsWith(`_${exercise.id}`))
    .sort(([a], [b]) => b.localeCompare(a));
  const [date, data] = entries[0] ?? [null, null];
  const logDate = date ? date.split("_")[0] : null;

  const rows = [
    { label: "Sets Done",         value: data?.sets },
    { label: "Last Set Reps",     value: data?.repsBreakdown?.filter(Boolean).slice(-1)[0] },
    { label: "Last Set Weight",   value: data?.lastSetWeight ? `${data.lastSetWeight} kg` : null },
    { label: "Total Time",        value: data?.totalTime ? `${data.totalTime} min` : null },
    { label: "Rest b/w Sets",     value: data?.restBetweenSets ? `${data.restBetweenSets} sec` : null },
  ].filter((r) => r.value);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-2xl border border-amber-100/10 bg-[linear-gradient(180deg,rgba(28,16,12,0.98),rgba(10,8,8,0.99))] shadow-2xl shadow-black/60"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-amber-100/10 px-5 py-4">
          <div>
            <h3 className="text-sm font-semibold text-amber-100">{exercise.name}</h3>
            <p className="text-[10px] text-stone-500">{logDate ? `Last logged: ${logDate}` : "No progress logged yet"}</p>
          </div>
          <button type="button" onClick={onClose}
            className="rounded border border-amber-100/15 bg-white/5 px-2.5 py-1 text-xs font-semibold text-stone-300 transition hover:text-stone-100">
            Close
          </button>
        </div>
        <div className="p-5 space-y-3">
          {!data ? (
            <p className="text-center text-xs text-stone-500 py-4">No progress logged for today yet.</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2">
                {rows.map(({ label, value }) => {
                  const isLastSetReps   = label === "Last Set Reps";
                  const isSetsDone      = label === "Sets Done";
                  const isWeight        = label === "Last Set Weight";
                  const isTime          = label === "Total Time";
                  const isRest          = label === "Rest b/w Sets";

                  const targetWeight = parseFloat(exercise.weight) || 0;
                  const targetTime   = parseFloat(exercise.duration) || 0;
                  const targetRest   = parseFloat(exercise.restTime) || 0;

                  const done = (isLastSetReps || isSetsDone)
                    ? parseInt(value) || 0
                    : isWeight ? parseFloat(data?.lastSetWeight) || 0
                    : isTime   ? parseFloat(data?.totalTime) || 0
                    : isRest   ? parseFloat(data?.restBetweenSets) || 0
                    : 0;

                  const target = isLastSetReps ? parseInt(exercise.reps) || 0
                    : isSetsDone ? parseInt(exercise.sets) || 0
                    : isWeight   ? targetWeight
                    : isTime     ? targetTime
                    : isRest     ? targetRest
                    : 0;

                  const hit = target > 0 && (
                    (isRest || isTime) ? done <= target : done >= target
                  );

                  const unit = isWeight ? " kg" : isTime ? " min" : isRest ? " sec" : "";

                  const indicator = isSetsDone && target > 0
                    ? `${done}/${target}`
                    : isLastSetReps && target > 0
                    ? `${done}+${Math.max(target - done, 0)}/${target}`
                    : (isWeight || isTime || isRest) && target > 0
                    ? `${done}${unit} / ${target}${unit}`
                    : null;
                  return (
                    <div key={label} className="rounded-xl border border-amber-100/10 bg-black/20 px-3 py-2.5">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-500">{label}</p>
                      <p className={`mt-1 text-xs font-semibold ${indicator ? (hit ? "text-emerald-400" : "text-rose-400/80") : "text-stone-100"}`}>
                        {indicator ?? value}
                      </p>
                    </div>
                  );
                })}
              </div>
              {data.repsBreakdown?.some(Boolean) && (
                <div className="rounded-xl border border-amber-100/10 bg-black/20 px-3 py-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-500 mb-2">Reps Breakdown</p>
                  <div className="flex flex-wrap gap-2">
                    {data.repsBreakdown.map((r, i) => {
                      if (!r) return null;
                      const target = parseInt(exercise.reps) || 0;
                      const done = parseInt(r) || 0;
                      const hit = done >= target;
                      const over = done > target;
                      const remaining = target > 0 ? Math.max(target - done, 0) : null;
                      const label = target > 0
                        ? over ? `+${done - target}/${target}` : `${done}+${remaining}/${target}`
                        : null;
                      return (
                        <div key={i} className="flex flex-col items-center gap-0.5">
                          <span className="text-[9px] text-stone-600">S{i + 1}</span>
                          <span className={`rounded-lg border px-2 py-0.5 text-xs font-semibold ${
                            hit ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-300"
                               : "border-rose-400/30 bg-rose-500/10 text-rose-300"
                          }`}>{r}</span>
                          {label && (
                            <span className={`text-[8px] font-semibold leading-none ${hit ? "text-emerald-400" : "text-rose-400/80"}`}>
                              {label}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {data.notes && (
                <div className="rounded-xl border border-amber-100/10 bg-black/20 px-3 py-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-500">Notes</p>
                  <p className="mt-1 text-xs text-stone-300">{data.notes}</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ExerciseModal({ exercise, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-2xl border border-amber-100/10 bg-[linear-gradient(180deg,rgba(28,16,12,0.98),rgba(10,8,8,0.99))] shadow-2xl shadow-black/60"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-amber-100/10 px-5 py-4">
          <h3 className="text-sm font-semibold text-amber-100">{exercise.name}</h3>
          <button type="button" onClick={onClose}
            className="rounded border border-amber-100/15 bg-white/5 px-2.5 py-1 text-xs font-semibold text-stone-300 transition hover:text-stone-100">
            Close
          </button>
        </div>
        <div className="space-y-3 p-5">
          <div className="grid grid-cols-2 gap-2">
            {[
              ["Body Part", exercise.bodyPart],
              ["Sets", exercise.sets],
              ["Reps", exercise.reps],
              ["Weight", exercise.weight !== "0" ? `${exercise.weight} kg` : "Bodyweight"],
              ["Rest", `${exercise.restTime}s`],
            ].map(([label, val]) => (
              <div key={label} className="rounded-xl border border-amber-100/10 bg-black/20 px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-500">{label}</p>
                <p className="mt-1 text-xs font-semibold text-stone-100">{val}</p>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-amber-100/10 bg-black/20 px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-500">Volume</p>
            <p className="mt-1 text-xs font-semibold text-amber-200">
              {exercise.weight !== "0"
                ? `${parseInt(exercise.sets) * parseInt(exercise.reps) * parseFloat(exercise.weight)} kg total`
                : `${parseInt(exercise.sets) * parseInt(exercise.reps)} total reps`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Main Component ── */
export default function TodaysWorkout() {
  const [selectedDay, setSelectedDay] = useState(todayDay);
  const [dietModal, setDietModal] = useState(null);
  const [exerciseModal, setExerciseModal] = useState(null);
  const [progressModal, setProgressModal] = useState(null);
  const [viewProgressModal, setViewProgressModal] = useState(null);
  const [allWorkouts, setAllWorkouts] = useState(loadWorkouts);
  const [bodyFilter, setBodyFilter] = useState("all");

  useEffect(() => {
    const onStorage = () => setAllWorkouts(loadWorkouts());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const today = new Date().toISOString().slice(0, 10);

  const todayWorkouts = allWorkouts.filter(
    (w) =>
      w.days?.includes(selectedDay) &&
      w.isActive &&
      (w.neverEnds || !w.endDate || w.endDate >= today)
  );

  const allBodyGroups = [...new Set(
    todayWorkouts.flatMap((w) =>
      (w.exercises || []).map((ex) => ex.bodyPart?.split(" - ")[0]?.trim()).filter(Boolean)
    )
  )].sort();

  const filteredWorkouts = todayWorkouts.map((w) => ({
    ...w,
    exercises: bodyFilter === "all"
      ? (w.exercises || [])
      : (w.exercises || []).filter((ex) => ex.bodyPart?.split(" - ")[0]?.trim() === bodyFilter),
  })).filter((w) => w.exercises.length > 0);

  const dietCards = [
    { type: "diet",       label: "Full Day Diet",  icon: "🥗", color: "border-emerald-400/25 bg-emerald-500/10 text-emerald-200" },
    { type: "supps",      label: "Supplements",    icon: "💊", color: "border-sky-400/25 bg-sky-500/10 text-sky-200" },
    { type: "preworkout", label: "Pre / Post",     icon: "⚡", color: "border-amber-400/25 bg-amber-500/10 text-amber-200" },
    { type: "macros",     label: "Macros",         icon: "📊", color: "border-violet-400/25 bg-violet-500/10 text-violet-200" },
  ];

  return (
    <>
      <div className="flex min-h-0 flex-col gap-4 md:max-h-[calc(100vh-17rem)]">

        {/* ── Day selector ── */}
        <div className="shrink-0 flex flex-wrap items-center gap-2 rounded-2xl border border-amber-100/10 bg-black/20 px-4 py-3">
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

          {/* ── Workout column ── */}
          <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-2xl border border-amber-100/10 bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.06),transparent_40%),linear-gradient(180deg,rgba(20,12,10,0.97),rgba(10,8,8,0.98))]">
            <div className="shrink-0 border-b border-amber-100/10 px-5 py-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-stone-100">
                  {formatDate(selectedDay)}'s Workouts
                </h3>
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-amber-300/20 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-amber-200">
                    {todayWorkouts.length} plan{todayWorkouts.length !== 1 ? "s" : ""}
                  </span>
                  <span className="rounded-full border border-stone-500/20 bg-white/5 px-2.5 py-0.5 text-[10px] font-semibold text-stone-400">
                    {todayWorkouts.reduce((sum, w) => sum + (w.exercises?.length || 0), 0)} exercises
                  </span>
                </div>
              </div>
            </div>

            <div className="journal-scroll min-h-0 flex-1 overflow-y-auto p-4 scroll-smooth pr-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-amber-400/20 hover:[&::-webkit-scrollbar-thumb]:bg-amber-400/40">
              {filteredWorkouts.length === 0 ? (
                <div className="flex h-full items-center justify-center">
                  <div className="text-center">
                    <p className="text-sm font-semibold text-stone-300">Rest day 🙌</p>
                    <p className="mt-1 text-xs text-stone-500">No workouts scheduled for {selectedDay}.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredWorkouts.map((workout, wi) => (
                    <Motion.div
                      key={workout.id}
                      className="rounded-2xl border border-amber-100/10 bg-white/5 p-4"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: wi * 0.07, duration: 0.25 }}
                      whileHover={{ y: -2, boxShadow: "0 10px 28px rgba(0,0,0,0.4)", borderColor: "rgba(251,191,36,0.2)" }}
                    >
                      {/* Workout header */}
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <h4 className="text-sm font-semibold text-stone-100">{workout.title}</h4>
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${DIFFICULTY_STYLES[workout.difficulty]}`}>
                              {workout.difficulty}
                            </span>
                            <span className="rounded-full border border-amber-100/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-stone-400">
                              {GOAL_LABELS[workout.goalType] || workout.goalType}
                            </span>
                            {workout.workoutSplit && (
                              <span className="rounded-full border border-violet-400/30 bg-violet-500/10 px-2 py-0.5 text-[10px] font-semibold text-violet-300">
                                {getSplitLabel(workout.workoutSplit)}
                              </span>
                            )}
                            <span className="rounded-full border border-amber-100/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-stone-400">
                              ~{workout.totalEstimatedTime} min
                            </span>
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
                              bodyFilter === "all"
                                ? "border-amber-300/45 bg-amber-500/15 text-amber-100"
                                : "border-amber-100/10 bg-white/5 text-stone-400 hover:text-stone-200"
                            }`}>
                            All
                          </button>
                          {allBodyGroups.map((g) => (
                            <button key={g} type="button" onClick={() => setBodyFilter(g)}
                              className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold transition ${
                                bodyFilter === g
                                  ? "border-amber-300/45 bg-amber-500/15 text-amber-100"
                                  : "border-amber-100/10 bg-white/5 text-stone-400 hover:text-stone-200"
                              }`}>
                              {g}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Exercise list */}
                      <div className="journal-scroll mt-3 max-h-85 space-y-2 overflow-y-auto scroll-smooth pr-1.5 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-amber-400/25 hover:[&::-webkit-scrollbar-thumb]:bg-amber-400/45 md:max-h-98">
                        {workout.exercises.map((ex, idx) => (
                          <Motion.div
                            key={ex.id}
                            className="rounded-xl border border-amber-100/8 bg-black/20 px-3 py-2.5"
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: wi * 0.07 + idx * 0.05, duration: 0.2 }}
                            whileHover={{ y: -1, borderColor: "rgba(251,191,36,0.18)", boxShadow: "0 6px 16px rgba(0,0,0,0.3)" }}
                          >
                            <div className="flex items-center gap-3">
                              <span className="shrink-0 text-[10px] font-bold text-amber-400/50">{idx + 1}.</span>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-semibold text-stone-100">{ex.name}</p>
                                <p className="mt-0.5 text-[10px] text-stone-500">{ex.bodyPart}</p>
                              </div>
                              <div className="flex shrink-0 gap-1.5">
                                <Motion.button
                                  type="button"
                                  onClick={() => setViewProgressModal(ex)}
                                  whileHover={{
                                    scale: 1.08,
                                    boxShadow: "0 0 16px rgba(251,191,36,0.5), 0 0 32px rgba(251,191,36,0.15)",
                                  }}
                                  whileTap={{ scale: 0.93 }}
                                  transition={{ duration: 0.18 }}
                                  className="rounded-full border border-amber-300/30 bg-amber-500/10 px-2.5 py-1 text-[10px] font-semibold text-amber-200 transition duration-200 hover:border-transparent hover:bg-gradient-to-r hover:from-[#ffd86b] hover:via-[#f5b52f] hover:to-[#ea8a17] hover:text-stone-950 hover:shadow-[0_0_18px_rgba(251,191,36,0.45)]"
                                >
                                  View Progress
                                </Motion.button>
                                <Motion.button
                                  type="button"
                                  onClick={() => setProgressModal(ex)}
                                  animate={{
                                    boxShadow: [
                                      "0 0 0px rgba(52,211,153,0)",
                                      "0 0 8px rgba(52,211,153,0.4)",
                                      "0 0 0px rgba(52,211,153,0)",
                                    ],
                                  }}
                                  transition={{
                                    boxShadow: { duration: 2.2, repeat: Infinity, ease: "easeInOut" },
                                  }}
                                  whileHover={{
                                    scale: 1.08,
                                    boxShadow: "0 0 18px rgba(52,211,153,0.65), 0 0 36px rgba(52,211,153,0.2)",
                                  }}
                                  whileTap={{ scale: 0.88, boxShadow: "0 0 26px rgba(52,211,153,0.8)" }}
                                  className="relative overflow-hidden rounded-full border border-emerald-300/40 bg-emerald-500/15 px-2.5 py-1 text-[10px] font-bold text-emerald-200 transition-colors duration-200 hover:border-emerald-300/70 hover:bg-emerald-500/30 hover:text-emerald-100"
                                >
                                  <Motion.span
                                    className="pointer-events-none absolute inset-y-0 left-[-40%] w-[30%] -skew-x-12 bg-white/25 blur-sm"
                                    animate={{ left: ["-40%", "130%"] }}
                                    transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 1.5, ease: "easeInOut" }}
                                  />
                                  <span className="relative z-10">Update Progress</span>
                                </Motion.button>
                              </div>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <span className="rounded-md border border-amber-100/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-amber-200/80">
                                {ex.sets} sets
                              </span>
                              <span className="rounded-md border border-amber-100/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-stone-300">
                                {ex.reps} reps
                              </span>
                              {ex.weight && ex.weight !== "0" && (
                                <span className="rounded-md border border-amber-100/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-stone-300">
                                  {ex.weight} kg
                                </span>
                              )}
                              {ex.duration && (
                                <span className="rounded-md border border-sky-400/20 bg-sky-500/8 px-2 py-0.5 text-[10px] font-semibold text-sky-300">
                                  {ex.duration} min
                                </span>
                              )}
                              {ex.restTime && (
                                <span className="rounded-md border border-violet-400/20 bg-violet-500/8 px-2 py-0.5 text-[10px] font-semibold text-violet-300">
                                  {ex.restTime}s rest
                                </span>
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

          {/* ── Diet column ── */}
          <div className="journal-scroll w-full shrink-0 overflow-y-auto scroll-smooth xl:w-44 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-amber-400/20 hover:[&::-webkit-scrollbar-thumb]:bg-amber-400/40">
            <p className="mb-2 shrink-0 text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-500">Diet</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1">
              {dietCards.map(({ type, label, icon, color }, di) => (
                <Motion.div
                  key={type}
                  className={`dashboard-glow-card flex shrink-0 flex-col items-start gap-2 rounded-2xl border p-3 ${color}`}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: di * 0.08, duration: 0.25 }}
                  whileHover={{ y: -2, boxShadow: "0 8px 20px rgba(0,0,0,0.35)" }}
                >
                  <span className="text-2xl">{icon}</span>
                  <p className="text-xs font-semibold leading-snug">{label}</p>
                  <p className="text-[10px] opacity-60">{formatDate(selectedDay)}</p>
                  <Motion.button
                    type="button"
                    onClick={() => setDietModal({ type, day: selectedDay })}
                    whileHover={{ scale: 1.03, boxShadow: "0 0 12px rgba(255,255,255,0.22)" }}
                    whileTap={{ scale: 0.95 }}
                    className="relative mt-1 w-full overflow-hidden rounded-lg border border-current/30 bg-black/20 py-1 text-[10px] font-semibold transition hover:bg-black/40"
                  >
                    <Motion.span
                      className="pointer-events-none absolute inset-y-0 left-[-40%] w-[30%] -skew-x-12 bg-white/25 blur-sm"
                      animate={{ left: ["-40%", "130%"] }}
                      transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 1.5, ease: "easeInOut" }}
                    />
                    <span className="relative z-10">View</span>
                  </Motion.button>
                </Motion.div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {dietModal && (
        <DietModal type={dietModal.type} day={dietModal.day} onClose={() => setDietModal(null)} />
      )}
      {exerciseModal && (
        <ExerciseModal exercise={exerciseModal} onClose={() => setExerciseModal(null)} />
      )}
      {progressModal && (
        <UpdateProgressModal exercise={progressModal} onClose={() => setProgressModal(null)} />
      )}
      {viewProgressModal && (
        <ViewProgressModal exercise={viewProgressModal} onClose={() => setViewProgressModal(null)} />
      )}
    </>
  );
}
