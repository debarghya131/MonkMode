import { motion as Motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { DEMO_DIETS, DEMO_WORKOUT_NUTRITION, DEMO_SUPP_PLANS, DEMO_MACRO_PLANS } from "../../../data/GymDummyData";
import api from "../../api/axios";
import useAuth from "../../hooks/useAuth";

const MEAL_SECTIONS = [
  { key: "morning",   label: "Morning"   },
  { key: "breakfast", label: "Breakfast" },
  { key: "lunch",     label: "Lunch"     },
  { key: "evening",   label: "Evening"   },
  { key: "dinner",    label: "Dinner"    },
];

const WORKOUT_SECTIONS = [
  { key: "preWorkout",  label: "Pre-workout"  },
  { key: "postWorkout", label: "Post-workout" },
];

const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const PLAN_TYPES = {
  DIET: "diet",
  WORKOUT_NUTRITION: "workoutNutrition",
  SUPPLEMENTS: "supplements",
  MACROS: "macros"
};
const DIET_PLANS_CACHE_KEY = "monkmode_gym_diet_plans_cache_v1";
const DIET_DRAFT_CACHE_KEY = "monkmode_gym_diet_draft_cache_v1";
const notifyGymDietUpdated = () => window.dispatchEvent(new Event("monkmode:gym-diet-updated"));

const MACRO_FIELDS = [
  { key: "protein",  label: "Protein",      unit: "g"    },
  { key: "carbs",    label: "Carbs",        unit: "g"    },
  { key: "fats",     label: "Fats",         unit: "g"    },
  { key: "fiber",    label: "Fiber",        unit: "g"    },
  { key: "calories", label: "Calories",     unit: "kcal" },
  { key: "water",    label: "Water Intake", unit: "L"    },
  { key: "sugar",    label: "Sugar",        unit: "g"    },
  { key: "sodium",   label: "Sodium",       unit: "mg"   },
];

const makeMealState  = (sections) => Object.fromEntries(sections.map(({ key }) => [key, []]));
const makeInputState = (sections) => Object.fromEntries(sections.map(({ key }) => [key, { name: "", time: "" }]));
const BLANK_MACROS   = Object.fromEntries(MACRO_FIELDS.map(({ key }) => [key, ""]));

const fmtTime = (t) => {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
};

function ModalPortal({ children }) {
  if (typeof document === "undefined") return null;
  return createPortal(children, document.body);
}

/* ── Shared Plan View Modal ──────────────────────────────── */
function PlanViewModal({ title, plans, dayFilter, setDayFilter, copyingId, setCopyingId, onToggleActive, onDelete, onCopy, onEdit, onClose, getRemainingDays, renderPlanContent }) {
  const filtered = dayFilter === "all" ? plans : plans.filter((p) => p.day === dayFilter);

  return (
    <ModalPortal>
    <div className="fixed inset-0 z-[1000] flex items-end justify-center bg-black/70 p-3 backdrop-blur-sm sm:items-center sm:p-4">
      <div
        className="flex w-full max-w-2xl flex-col rounded-2xl border border-amber-100/10 bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.08),transparent_35%),linear-gradient(180deg,rgba(30,18,14,0.97),rgba(12,8,8,0.98))] shadow-2xl shadow-black/60 max-h-[calc(100dvh-1.5rem)] sm:max-h-[85vh]"
      >
        {/* Header */}
        <div className="shrink-0 border-b border-amber-100/10 px-5 pb-4 pt-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-amber-100">{title}</h3>
              <p className="mt-0.5 text-xs text-stone-400">{plans.length} plan{plans.length !== 1 ? "s" : ""} saved</p>
            </div>
            <button
              type="button"
              onClick={() => { onClose(); setCopyingId(null); }}
              className="shrink-0 rounded border border-amber-100/20 bg-white/5 px-2.5 py-1 text-xs font-semibold text-stone-300 transition hover:text-stone-100"
            >
              Close
            </button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {["all", ...WEEK_DAYS].map((day) => (
              <button
                key={day}
                type="button"
                onClick={() => setDayFilter(day)}
                className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize transition ${
                  dayFilter === day
                    ? "border-amber-300/45 bg-amber-500/15 text-amber-100"
                    : "border-amber-100/10 bg-white/5 text-stone-400 hover:text-amber-200"
                }`}
              >
                {day === "all" ? "All Days" : day}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable body */}
        <div className="journal-scroll min-h-0 flex-1 overflow-y-auto p-5">
          {filtered.length === 0 ? (
            <p className="mt-8 text-center text-xs text-stone-500">
              {plans.length === 0 ? "No plans saved yet." : `No plans saved for ${dayFilter}.`}
            </p>
          ) : (
            <div className="space-y-4">
              {filtered.map((plan) => {
                const remaining = getRemainingDays(plan);
                const isCopying = copyingId === plan.id;
                return (
                  <article key={plan.id} className="dashboard-glow-card rounded-xl border border-amber-100/10 bg-white/5 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="rounded-full border border-amber-300/40 bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-bold text-amber-200">{plan.day}</span>
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${plan.isActive ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200" : "border-stone-500/20 bg-white/5 text-stone-400"}`}>
                          {plan.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                        <button type="button" onClick={() => onToggleActive(plan.id)}
                          className={`rounded border px-2 py-0.5 text-[10px] font-semibold transition ${plan.isActive ? "border-stone-400/25 bg-white/5 text-stone-300 hover:text-stone-100" : "border-emerald-400/25 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20"}`}>
                          {plan.isActive ? "Deactivate" : "Activate"}
                        </button>
                        <button type="button" onClick={() => setCopyingId(isCopying ? null : plan.id)}
                          className="rounded border border-sky-300/25 bg-sky-500/10 px-2 py-0.5 text-[10px] font-semibold text-sky-200 transition hover:bg-sky-500/20">
                          Copy
                        </button>
                        {onEdit && (
                          <button type="button" onClick={() => onEdit(plan)}
                            className="rounded border border-amber-300/25 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold text-amber-200 transition hover:bg-amber-400/20">
                            Edit
                          </button>
                        )}
                        <button type="button" onClick={() => onDelete(plan.id)}
                          className="rounded border border-rose-400/25 bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-300 transition hover:bg-rose-500/20">
                          Delete
                        </button>
                      </div>
                    </div>

                    {isCopying && (
                      <div className="mt-3 rounded-lg border border-sky-300/15 bg-sky-500/5 p-3">
                        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-sky-200/70">Copy to day</p>
                        {remaining.length === 0 ? (
                          <p className="text-xs text-stone-400">Already copied to all days.</p>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {remaining.map((day) => (
                              <button key={day} type="button" onClick={() => { onCopy(plan, day); setCopyingId(null); }}
                                className="rounded-full border border-sky-300/30 bg-sky-500/10 px-3 py-1 text-[11px] font-semibold text-sky-200 transition hover:bg-sky-500/25">
                                {day}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="mt-3">{renderPlanContent(plan)}</div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
    </ModalPortal>
  );
}

/* ── MealGroup ───────────────────────────────────────────── */
function MealGroup({ sections, meals, setMeals, inputs, setInputs }) {
  const [viewingKey, setViewingKey] = useState(null);

  const addMeal = (key) => {
    const inp = inputs[key];
    if (!inp.name.trim() || !inp.time) return;
    setMeals((prev) => ({
      ...prev,
      [key]: [...prev[key], { id: `${key}-${Date.now()}`, name: inp.name.trim(), time: inp.time }],
    }));
    setInputs((prev) => ({ ...prev, [key]: { name: "", time: "" } }));
  };

  const removeMeal = (key, id) => {
    setMeals((prev) => ({ ...prev, [key]: prev[key].filter((m) => m.id !== id) }));
  };

  const viewingSection = sections.find((s) => s.key === viewingKey);

  return (
    <>
      <div className="space-y-4">
        {sections.map(({ key, label }) => (
          <div key={key}>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-200/70">{label}</p>
              {meals[key].length > 0 && (
                <Motion.button type="button" onClick={() => setViewingKey(key)}
                  animate={{ scale: [1, 1.06, 1], boxShadow: ["0 0 0px rgba(251,191,36,0)", "0 0 10px rgba(251,191,36,0.45)", "0 0 0px rgba(251,191,36,0)"] }}
                  transition={{ scale: { duration: 2, repeat: Infinity, ease: "easeInOut" }, boxShadow: { duration: 2, repeat: Infinity, ease: "easeInOut" } }}
                  whileHover={{ scale: 1.1, boxShadow: "0 0 14px rgba(251,191,36,0.65)", transition: { duration: 0.18 } }}
                  whileTap={{ scale: 0.93, transition: { duration: 0.1 } }}
                  className="rounded-full border border-amber-300/30 bg-amber-400/10 px-2.5 py-0.5 text-[9px] font-semibold text-amber-200 transition duration-200 hover:border-transparent hover:bg-gradient-to-r hover:from-[#ffd86b] hover:via-[#f5b52f] hover:to-[#ea8a17] hover:text-stone-950 hover:shadow-[0_0_14px_rgba(251,191,36,0.4)]">
                  View ({meals[key].length})
                </Motion.button>
              )}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:gap-1.5">
              <input type="text" value={inputs[key].name}
                onChange={(e) => setInputs((p) => ({ ...p, [key]: { ...p[key], name: e.target.value } }))}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addMeal(key); } }}
                placeholder="Add meal…"
                className="min-w-0 flex-1 rounded-lg border border-amber-100/15 bg-white/5 px-2.5 py-1 text-xs text-stone-100 outline-none transition focus:border-amber-300/35" />
              <input type="time" value={inputs[key].time}
                onChange={(e) => setInputs((p) => ({ ...p, [key]: { ...p[key], time: e.target.value } }))}
                className="w-full rounded-lg border border-amber-100/15 bg-white/5 px-2 py-1 text-xs text-stone-100 outline-none transition focus:border-amber-300/35 sm:w-24" />
              <button type="button" onClick={() => addMeal(key)}
                className="rounded-lg border border-amber-300/25 bg-amber-400/10 px-2.5 py-2 text-[11px] font-semibold text-amber-200 transition hover:bg-amber-400/20 sm:py-1">
                Add
              </button>
            </div>
          </div>
        ))}
      </div>

      {viewingKey && viewingSection && (
        <ModalPortal>
        <div className="fixed inset-0 z-[1000] flex items-end justify-center bg-black/70 p-3 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="flex w-full max-w-sm flex-col rounded-2xl border border-amber-100/10 bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.07),transparent_35%),linear-gradient(180deg,rgba(30,18,14,0.97),rgba(12,8,8,0.98))] shadow-2xl shadow-black/60 max-h-[calc(100dvh-1.5rem)] sm:max-h-[75vh]">
            <div className="shrink-0 border-b border-amber-100/10 px-5 pb-4 pt-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-200/50">Meal Section</p>
                  <h3 className="mt-0.5 text-base font-semibold text-amber-100">{viewingSection.label}</h3>
                </div>
                <button type="button" onClick={() => setViewingKey(null)}
                  className="rounded border border-amber-100/20 bg-white/5 px-2.5 py-1 text-xs font-semibold text-stone-300 transition hover:text-stone-100">
                  Close
                </button>
              </div>
              <p className="mt-1 text-xs text-stone-400">{meals[viewingKey].length} meal{meals[viewingKey].length !== 1 ? "s" : ""} added</p>
            </div>
            <div className="journal-scroll min-h-0 flex-1 overflow-y-auto p-5">
              <div className="space-y-2">
                {meals[viewingKey].map((meal, idx) => (
                  <div key={meal.id} className="flex items-center justify-between rounded-xl border border-amber-100/10 bg-white/5 px-3 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <span className="text-[10px] font-bold text-amber-400/60">{idx + 1}.</span>
                      <div>
                        <p className="text-xs font-semibold text-stone-100">{meal.name}</p>
                        {meal.time && <p className="mt-0.5 text-[10px] text-stone-400">{fmtTime(meal.time)}</p>}
                      </div>
                    </div>
                    <button type="button" onClick={() => { removeMeal(viewingKey, meal.id); if (meals[viewingKey].length === 1) setViewingKey(null); }}
                      className="rounded border border-rose-400/25 bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-rose-300 transition hover:bg-rose-500/20">
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}
    </>
  );
}

function SupplementDraftModal({ items, onRemove, onClose }) {
  return (
    <ModalPortal>
    <div className="fixed inset-0 z-[1000] flex items-end justify-center bg-black/70 p-3 backdrop-blur-sm sm:items-center sm:p-4">
      <div
        className="flex w-full max-w-sm flex-col rounded-2xl border border-amber-100/10 bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.07),transparent_35%),linear-gradient(180deg,rgba(30,18,14,0.97),rgba(12,8,8,0.98))] shadow-2xl shadow-black/60 max-h-[calc(100dvh-1.5rem)] sm:max-h-[75vh]"
      >
        <div className="shrink-0 border-b border-amber-100/10 px-5 pb-4 pt-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-200/50">Draft Plan</p>
              <h3 className="mt-0.5 text-base font-semibold text-amber-100">Supplements</h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-amber-100/20 bg-white/5 px-2.5 py-1 text-xs font-semibold text-stone-300 transition hover:text-stone-100"
            >
              Close
            </button>
          </div>
          <p className="mt-1 text-xs text-stone-400">{items.length} supplement{items.length !== 1 ? "s" : ""} added</p>
        </div>
        <div className="journal-scroll min-h-0 flex-1 overflow-y-auto p-5">
          <div className="space-y-2">
            {items.map((item, idx) => (
              <div key={item.id} className="flex items-center justify-between rounded-xl border border-amber-100/10 bg-white/5 px-3 py-2.5">
                <div className="flex items-center gap-2.5">
                  <span className="text-[10px] font-bold text-amber-400/60">{idx + 1}.</span>
                  <div>
                    <p className="text-xs font-semibold text-stone-100">{item.name}</p>
                    {item.time && <p className="mt-0.5 text-[10px] text-stone-400">{fmtTime(item.time)}</p>}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(item.id)}
                  className="rounded border border-rose-400/25 bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-rose-300 transition hover:bg-rose-500/20"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
}

/* ── Helpers for plan state ──────────────────────────────── */
const makeGetRemaining = (plans) => (plan) => {
  const sourceId = plan.copiedFromId || plan.id;
  const used = new Set(plans.filter((p) => (p.copiedFromId || p.id) === sourceId).map((p) => p.day));
  used.add(plan.day);
  return WEEK_DAYS.filter((d) => !used.has(d));
};

const makeSavePlan = (setSaved, payload) => {
  setSaved((prev) => [{ ...payload, id: `plan-${Date.now()}`, isActive: false, copiedFromId: null }, ...prev]);
};

const stripPlanType = (plan) => {
  if (!plan || typeof plan !== "object") return plan;
  const { planType: _planType, ...rest } = plan;
  return rest;
};

const loadDietPlansCache = () => {
  try {
    const stored = localStorage.getItem(DIET_PLANS_CACHE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    if (!parsed || typeof parsed !== "object") return null;
    return {
      diets: Array.isArray(parsed.diets) ? parsed.diets : [],
      workoutNutrition: Array.isArray(parsed.workoutNutrition) ? parsed.workoutNutrition : [],
      supplements: Array.isArray(parsed.supplements) ? parsed.supplements : [],
      macros: Array.isArray(parsed.macros) ? parsed.macros : []
    };
  } catch {
    return null;
  }
};

const persistDietPlansCache = (value) => {
  try {
    localStorage.setItem(DIET_PLANS_CACHE_KEY, JSON.stringify(value));
  } catch {
    // ignore storage quota/private mode issues
  }
};

const loadDietDraftCache = () => {
  try {
    const stored = localStorage.getItem(DIET_DRAFT_CACHE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
};

const persistDietDraftCache = (value) => {
  try {
    localStorage.setItem(DIET_DRAFT_CACHE_KEY, JSON.stringify(value));
  } catch {
    // ignore storage quota/private mode issues
  }
};

/* ── Day selector ───────────────────────────────────────── */
function DaySelector({ selected, onSelect, compact = false, inline = false, disabled = false }) {
  return (
    <div
      className={
        compact
          ? "grid grid-cols-4 gap-1 sm:grid-cols-7"
          : inline
            ? "grid min-w-0 w-full grid-cols-4 gap-1 sm:flex-1 sm:grid-cols-7"
            : "mb-4 grid grid-cols-4 gap-1 sm:flex sm:items-center sm:gap-1"
      }
    >
      {WEEK_DAYS.map((day) => (
        <button key={day} type="button"
          onClick={() => {
            if (disabled) return;
            onSelect((prev) => (prev === day ? "" : day));
          }}
          disabled={disabled}
          className={`rounded border font-semibold transition ${
            compact
              ? "min-w-0 px-1.5 py-1 text-[10px]"
              : inline
                ? "min-w-0 px-1.5 py-1.5 text-[10px]"
                : "flex-1 py-1.5 text-[10px]"
          } ${
            selected === day
              ? "border-amber-300/55 bg-amber-400/15 text-amber-100"
              : "border-amber-100/15 bg-white/5 text-stone-400 hover:text-stone-200"
          } ${disabled ? "cursor-not-allowed opacity-70" : ""}`}>
          {day}
        </button>
      ))}
    </div>
  );
}

/* ── Save button ─────────────────────────────────────────── */
function SaveBtn({ label, selectedDay, onClick, disabled }) {
  return (
    <div>
      <button type="button" onClick={onClick} disabled={disabled || !selectedDay}
        className={`w-full rounded-lg border px-4 py-2.5 text-xs font-semibold transition ${
          selectedDay && !disabled
            ? "border-amber-400/35 bg-gradient-to-r from-amber-400/20 to-orange-400/15 text-amber-200 hover:from-amber-400/25 hover:to-orange-400/20"
            : "cursor-not-allowed border-amber-100/10 bg-white/5 text-stone-500"
        }`}>
        {selectedDay ? `${label} ${selectedDay}` : "Select a day above to save."}
      </button>
    </div>
  );
}

/* ── Main Component ──────────────────────────────────────── */
export default function DietChart() {
  const { isDemoMode } = useAuth();
  const draftCache = useMemo(() => loadDietDraftCache(), []);

  /* Full Day Diet */
  const [selectedDietDay, setSelectedDietDay]   = useState(() => String(draftCache?.selectedDietDay || ""));
  const [meals, setMeals]                       = useState(() => {
    const base = makeMealState(MEAL_SECTIONS);
    const raw = draftCache?.meals && typeof draftCache.meals === "object" ? draftCache.meals : {};
    return Object.fromEntries(
      MEAL_SECTIONS.map(({ key }) => [key, Array.isArray(raw[key]) ? raw[key] : base[key]])
    );
  });
  const [mealInputs, setMealInputs]             = useState(() => {
    const base = makeInputState(MEAL_SECTIONS);
    const raw = draftCache?.mealInputs && typeof draftCache.mealInputs === "object" ? draftCache.mealInputs : {};
    return Object.fromEntries(
      MEAL_SECTIONS.map(({ key }) => {
        const item = raw[key];
        return [key, {
          name: typeof item?.name === "string" ? item.name : base[key].name,
          time: typeof item?.time === "string" ? item.time : base[key].time
        }];
      })
    );
  });
  const [savedDiets, setSavedDiets]             = useState(() => (isDemoMode ? DEMO_DIETS : []));
  const [showDietView, setShowDietView]         = useState(false);
  const [dietDayFilter, setDietDayFilter]       = useState("all");
  const [copyingDietId, setCopyingDietId]       = useState(null);
  const [editingDietId, setEditingDietId]       = useState(null);

  /* Workout Nutrition */
  const [selectedWnDay, setSelectedWnDay]       = useState(() => String(draftCache?.selectedWnDay || ""));
  const [workoutMeals, setWorkoutMeals]         = useState(() => {
    const base = makeMealState(WORKOUT_SECTIONS);
    const raw = draftCache?.workoutMeals && typeof draftCache.workoutMeals === "object" ? draftCache.workoutMeals : {};
    return Object.fromEntries(
      WORKOUT_SECTIONS.map(({ key }) => [key, Array.isArray(raw[key]) ? raw[key] : base[key]])
    );
  });
  const [workoutInputs, setWorkoutInputs]       = useState(() => {
    const base = makeInputState(WORKOUT_SECTIONS);
    const raw = draftCache?.workoutInputs && typeof draftCache.workoutInputs === "object" ? draftCache.workoutInputs : {};
    return Object.fromEntries(
      WORKOUT_SECTIONS.map(({ key }) => {
        const item = raw[key];
        return [key, {
          name: typeof item?.name === "string" ? item.name : base[key].name,
          time: typeof item?.time === "string" ? item.time : base[key].time
        }];
      })
    );
  });
  const [savedWn, setSavedWn]                   = useState(() => (isDemoMode ? DEMO_WORKOUT_NUTRITION : []));
  const [showWnView, setShowWnView]             = useState(false);
  const [wnDayFilter, setWnDayFilter]           = useState("all");
  const [copyingWnId, setCopyingWnId]           = useState(null);
  const [editingWnId, setEditingWnId]           = useState(null);

  /* Supplements */
  const [selectedSuppDay, setSelectedSuppDay]   = useState(() => String(draftCache?.selectedSuppDay || ""));
  const [suppItems, setSuppItems]               = useState(() => (Array.isArray(draftCache?.suppItems) ? draftCache.suppItems : []));
  const [suppInput, setSuppInput]               = useState(() => ({
    name: typeof draftCache?.suppInput?.name === "string" ? draftCache.suppInput.name : "",
    time: typeof draftCache?.suppInput?.time === "string" ? draftCache.suppInput.time : ""
  }));
  const [savedSupps, setSavedSupps]             = useState(() => (isDemoMode ? DEMO_SUPP_PLANS : []));
  const [showSuppView, setShowSuppView]         = useState(false);
  const [suppDayFilter, setSuppDayFilter]       = useState("all");
  const [copyingSuppId, setCopyingSuppId]       = useState(null);
  const [showSuppDraftView, setShowSuppDraftView] = useState(false);
  const [editingSuppId, setEditingSuppId]       = useState(null);

  /* Macros */
  const [selectedMacroDay, setSelectedMacroDay] = useState(() => String(draftCache?.selectedMacroDay || ""));
  const [macros, setMacros]                     = useState(() => ({
    ...BLANK_MACROS,
    ...(draftCache?.macros && typeof draftCache.macros === "object" ? draftCache.macros : {})
  }));
  const [savedMacros, setSavedMacros]           = useState(() => (isDemoMode ? DEMO_MACRO_PLANS : []));
  const [showMacrosView, setShowMacrosView]     = useState(false);
  const [macrosDayFilter, setMacrosDayFilter]   = useState("all");
  const [copyingMacroId, setCopyingMacroId]     = useState(null);
  const [editingMacroId, setEditingMacroId]     = useState(null);

  const refreshPlans = useCallback(async () => {
    if (isDemoMode) {
      setSavedDiets(DEMO_DIETS);
      setSavedWn(DEMO_WORKOUT_NUTRITION);
      setSavedSupps(DEMO_SUPP_PLANS);
      setSavedMacros(DEMO_MACRO_PLANS);
      return;
    }

    try {
      const { data } = await api.get("/gym/diet-plans");
      const plans = Array.isArray(data) ? data : [];
      setSavedDiets(plans.filter((plan) => plan.planType === PLAN_TYPES.DIET).map(stripPlanType));
      setSavedWn(plans.filter((plan) => plan.planType === PLAN_TYPES.WORKOUT_NUTRITION).map(stripPlanType));
      setSavedSupps(plans.filter((plan) => plan.planType === PLAN_TYPES.SUPPLEMENTS).map(stripPlanType));
      setSavedMacros(plans.filter((plan) => plan.planType === PLAN_TYPES.MACROS).map(stripPlanType));
    } catch (error) {
      console.error("Failed to fetch diet plans:", error);
      const cached = loadDietPlansCache();
      if (cached) {
        setSavedDiets(cached.diets);
        setSavedWn(cached.workoutNutrition);
        setSavedSupps(cached.supplements);
        setSavedMacros(cached.macros);
      }
    }
  }, [isDemoMode]);

  useEffect(() => {
    void refreshPlans();
  }, [refreshPlans]);

  useEffect(() => {
    if (isDemoMode) return;
    persistDietPlansCache({
      diets: savedDiets,
      workoutNutrition: savedWn,
      supplements: savedSupps,
      macros: savedMacros
    });
  }, [isDemoMode, savedDiets, savedWn, savedSupps, savedMacros]);

  useEffect(() => {
    persistDietDraftCache({
      selectedDietDay,
      meals,
      mealInputs,
      selectedWnDay,
      workoutMeals,
      workoutInputs,
      selectedSuppDay,
      suppItems,
      suppInput,
      selectedMacroDay,
      macros
    });
  }, [
    selectedDietDay, meals, mealInputs,
    selectedWnDay, workoutMeals, workoutInputs,
    selectedSuppDay, suppItems, suppInput,
    selectedMacroDay, macros
  ]);

  const setPlansByType = (planType, updater) => {
    const apply = (setter) => setter((prev) => (typeof updater === "function" ? updater(prev) : updater));
    if (planType === PLAN_TYPES.DIET) apply(setSavedDiets);
    if (planType === PLAN_TYPES.WORKOUT_NUTRITION) apply(setSavedWn);
    if (planType === PLAN_TYPES.SUPPLEMENTS) apply(setSavedSupps);
    if (planType === PLAN_TYPES.MACROS) apply(setSavedMacros);
  };

  const handleTogglePlan = async (planType, id) => {
    if (isDemoMode) {
      setPlansByType(planType, (prev) => prev.map((plan) => (
        plan.id === id ? { ...plan, isActive: !plan.isActive } : plan
      )));
      notifyGymDietUpdated();
      return;
    }

    try {
      const { data } = await api.patch(`/gym/diet-plans/${id}/active`);
      const plans = Array.isArray(data) ? data.map(stripPlanType) : [];
      setPlansByType(planType, plans);
      notifyGymDietUpdated();
    } catch (error) {
      console.error("Failed to toggle diet plan:", error);
    }
  };

  const handleDeletePlan = async (planType, id, setCopying) => {
    if (isDemoMode) {
      setPlansByType(planType, (prev) => prev.filter((plan) => plan.id !== id));
      setCopying((current) => (current === id ? null : current));
      notifyGymDietUpdated();
      return;
    }

    try {
      await api.delete(`/gym/diet-plans/${id}`);
      setPlansByType(planType, (prev) => prev.filter((plan) => plan.id !== id));
      setCopying((current) => (current === id ? null : current));
      notifyGymDietUpdated();
    } catch (error) {
      console.error("Failed to delete diet plan:", error);
    }
  };

  const handleCopyPlan = async (planType, plan, targetDay) => {
    if (isDemoMode) {
      setPlansByType(planType, (prev) => [
        { ...plan, id: `plan-${Date.now()}-copy`, day: targetDay, isActive: false, copiedFromId: plan.copiedFromId || plan.id },
        ...prev
      ]);
      notifyGymDietUpdated();
      return;
    }

    try {
      const { data } = await api.post(`/gym/diet-plans/${plan.id}/copy`, { day: targetDay });
      setPlansByType(planType, (prev) => [stripPlanType(data), ...prev]);
      notifyGymDietUpdated();
    } catch (error) {
      console.error("Failed to copy diet plan:", error);
    }
  };

  /* ── Diet handlers ── */
  const startEditDiet = (plan) => {
    const nextMeals = Object.fromEntries(
      MEAL_SECTIONS.map(({ key }) => [key, (plan.meals?.[key] || []).map((item) => ({ ...item }))])
    );
    setMeals(nextMeals);
    setMealInputs(makeInputState(MEAL_SECTIONS));
    setSelectedDietDay(plan.day || "");
    setEditingDietId(plan.id);
    setCopyingDietId(null);
    setShowDietView(false);
  };

  const saveDiet = async () => {
    if (!selectedDietDay) return;

    const payload = {
      planType: PLAN_TYPES.DIET,
      day: selectedDietDay,
      meals: JSON.parse(JSON.stringify(meals))
    };

    if (isDemoMode) {
      if (editingDietId) {
        setSavedDiets((prev) => prev.map((plan) => (
          plan.id === editingDietId
            ? { ...plan, day: selectedDietDay, meals: JSON.parse(JSON.stringify(meals)) }
            : plan
        )));
        setEditingDietId(null);
      } else {
        makeSavePlan(setSavedDiets, { day: selectedDietDay, meals: JSON.parse(JSON.stringify(meals)) });
      }
      notifyGymDietUpdated();
      setMeals(makeMealState(MEAL_SECTIONS));
      setMealInputs(makeInputState(MEAL_SECTIONS));
      setSelectedDietDay("");
      return;
    } else {
      try {
        const request = editingDietId
        ? api.patch(`/gym/diet-plans/${editingDietId}`, payload)
        : api.post("/gym/diet-plans", payload);
        const { data } = await request;
        const saved = stripPlanType(data);
        setSavedDiets((prev) => (
          editingDietId
            ? prev.map((plan) => (plan.id === editingDietId ? saved : plan))
            : [saved, ...prev]
        ));
        setEditingDietId(null);
        notifyGymDietUpdated();
      } catch (error) {
        console.error("Failed to save full day diet:", error);
        return;
      }
    }

    setMeals(makeMealState(MEAL_SECTIONS));
    setMealInputs(makeInputState(MEAL_SECTIONS));
    setSelectedDietDay("");
  };

  /* ── Workout Nutrition handlers ── */
  const startEditWn = (plan) => {
    const nextMeals = Object.fromEntries(
      WORKOUT_SECTIONS.map(({ key }) => [key, (plan.meals?.[key] || []).map((item) => ({ ...item }))])
    );
    setWorkoutMeals(nextMeals);
    setWorkoutInputs(makeInputState(WORKOUT_SECTIONS));
    setSelectedWnDay(plan.day || "");
    setEditingWnId(plan.id);
    setCopyingWnId(null);
    setShowWnView(false);
  };

  const saveWn = async () => {
    if (!selectedWnDay) return;

    const payload = {
      planType: PLAN_TYPES.WORKOUT_NUTRITION,
      day: selectedWnDay,
      meals: JSON.parse(JSON.stringify(workoutMeals))
    };

    if (isDemoMode) {
      if (editingWnId) {
        setSavedWn((prev) => prev.map((plan) => (
          plan.id === editingWnId
            ? { ...plan, day: selectedWnDay, meals: JSON.parse(JSON.stringify(workoutMeals)) }
            : plan
        )));
        setEditingWnId(null);
      } else {
        makeSavePlan(setSavedWn, { day: selectedWnDay, meals: JSON.parse(JSON.stringify(workoutMeals)) });
      }
      notifyGymDietUpdated();
      setWorkoutMeals(makeMealState(WORKOUT_SECTIONS));
      setWorkoutInputs(makeInputState(WORKOUT_SECTIONS));
      setSelectedWnDay("");
      return;
    } else {
      try {
        const request = editingWnId
        ? api.patch(`/gym/diet-plans/${editingWnId}`, payload)
        : api.post("/gym/diet-plans", payload);
        const { data } = await request;
        const saved = stripPlanType(data);
        setSavedWn((prev) => (
          editingWnId
            ? prev.map((plan) => (plan.id === editingWnId ? saved : plan))
            : [saved, ...prev]
        ));
        setEditingWnId(null);
        notifyGymDietUpdated();
      } catch (error) {
        console.error("Failed to save workout nutrition:", error);
        return;
      }
    }

    setWorkoutMeals(makeMealState(WORKOUT_SECTIONS));
    setWorkoutInputs(makeInputState(WORKOUT_SECTIONS));
    setSelectedWnDay("");
  };

  /* ── Supplement handlers ── */
  const startEditSupp = (plan) => {
    setSuppItems((plan.items || []).map((item) => ({ ...item })));
    setSuppInput({ name: "", time: "" });
    setSelectedSuppDay(plan.day || "");
    setEditingSuppId(plan.id);
    setCopyingSuppId(null);
    setShowSuppDraftView(false);
    setShowSuppView(false);
  };

  const addSuppItem = () => {
    if (!suppInput.name.trim() || !suppInput.time) return;
    setSuppItems((prev) => [...prev, { id: `si-${Date.now()}`, name: suppInput.name.trim(), time: suppInput.time }]);
    setSuppInput({ name: "", time: "" });
  };

  const removeSuppItem = (id) => {
    setSuppItems((prev) => {
      const next = prev.filter((item) => item.id !== id);
      if (next.length === 0) setShowSuppDraftView(false);
      return next;
    });
  };

  const saveSupp = async () => {
    if (!selectedSuppDay || suppItems.length === 0) return;

    const payload = {
      planType: PLAN_TYPES.SUPPLEMENTS,
      day: selectedSuppDay,
      items: [...suppItems]
    };

    if (isDemoMode) {
      if (editingSuppId) {
        setSavedSupps((prev) => prev.map((plan) => (
          plan.id === editingSuppId
            ? { ...plan, day: selectedSuppDay, items: [...suppItems] }
            : plan
        )));
        setEditingSuppId(null);
      } else {
        makeSavePlan(setSavedSupps, { day: selectedSuppDay, items: [...suppItems] });
      }
      notifyGymDietUpdated();
      setShowSuppView(false);
      setShowSuppDraftView(false);
      setSuppItems([]);
      setSuppInput({ name: "", time: "" });
      setSelectedSuppDay("");
      return;
    } else {
      try {
        const request = editingSuppId
        ? api.patch(`/gym/diet-plans/${editingSuppId}`, payload)
        : api.post("/gym/diet-plans", payload);
        const { data } = await request;
        const saved = stripPlanType(data);
        setSavedSupps((prev) => (
          editingSuppId
            ? prev.map((plan) => (plan.id === editingSuppId ? saved : plan))
            : [saved, ...prev]
        ));
        setEditingSuppId(null);
        notifyGymDietUpdated();
      } catch (error) {
        console.error("Failed to save supplements plan:", error);
        return;
      }
    }

    setShowSuppView(false);
    setShowSuppDraftView(false);
    setSuppItems([]);
    setSuppInput({ name: "", time: "" });
    setSelectedSuppDay("");
  };

  /* ── Macro handlers ── */
  const startEditMacro = (plan) => {
    setMacros({ ...BLANK_MACROS, ...(plan.values || {}) });
    setSelectedMacroDay(plan.day || "");
    setEditingMacroId(plan.id);
    setCopyingMacroId(null);
    setShowMacrosView(false);
  };

  const saveMacro = async () => {
    if (!selectedMacroDay) return;

    const payload = {
      planType: PLAN_TYPES.MACROS,
      day: selectedMacroDay,
      values: { ...macros }
    };

    if (isDemoMode) {
      if (editingMacroId) {
        setSavedMacros((prev) => prev.map((plan) => (
          plan.id === editingMacroId
            ? { ...plan, day: selectedMacroDay, values: { ...macros } }
            : plan
        )));
        setEditingMacroId(null);
      } else {
        makeSavePlan(setSavedMacros, { day: selectedMacroDay, values: { ...macros } });
      }
      notifyGymDietUpdated();
      setMacros(BLANK_MACROS);
      setSelectedMacroDay("");
      return;
    } else {
      try {
        const request = editingMacroId
        ? api.patch(`/gym/diet-plans/${editingMacroId}`, payload)
        : api.post("/gym/diet-plans", payload);
        const { data } = await request;
        const saved = stripPlanType(data);
        setSavedMacros((prev) => (
          editingMacroId
            ? prev.map((plan) => (plan.id === editingMacroId ? saved : plan))
            : [saved, ...prev]
        ));
        setEditingMacroId(null);
        notifyGymDietUpdated();
      } catch (error) {
        console.error("Failed to save macro plan:", error);
        return;
      }
    }

    setMacros(BLANK_MACROS);
    setSelectedMacroDay("");
  };

  /* card shell shared classes */
  const card = "flex flex-col overflow-hidden rounded-[1.4rem] border border-amber-100/10 bg-gradient-to-b from-black/20 to-black/10 shadow-xl shadow-black/20 sm:rounded-2xl";

  return (
    /* Full-height wrapper on larger screens */
    <div className="flex flex-col gap-4 xl:h-[calc(100vh-19rem)] xl:min-h-0">

      {/* ── Responsive 4-card layout ── */}
      <div className="grid gap-4 xl:min-h-0 xl:flex-1 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">

        <div className="flex min-h-0 flex-col">
          {/* ── Container 1: Full Day Diet ── */}
          <div className={`${card} min-h-0 xl:flex-1`}>
            {/* sticky header */}
            <div className="shrink-0 border-b border-amber-100/10 px-4 pb-4 pt-4 sm:px-5 sm:pt-5">
              <div className="flex flex-col gap-3">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-amber-200">Full Day Diet</h3>
                  <p className="mt-2 text-xs text-stone-400">Select a day and plan your meals.</p>
                </div>
                <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                  <DaySelector selected={selectedDietDay} onSelect={setSelectedDietDay} inline disabled={Boolean(editingDietId)} />
                  <Motion.button type="button" onClick={() => { setShowDietView(true); setDietDayFilter("all"); setCopyingDietId(null); }}
                    animate={{ scale: [1, 1.05, 1], boxShadow: ["0 0 0px rgba(251,191,36,0)", "0 0 12px rgba(251,191,36,0.5)", "0 0 0px rgba(251,191,36,0)"] }}
                    transition={{ scale: { duration: 2, repeat: Infinity, ease: "easeInOut" }, boxShadow: { duration: 2, repeat: Infinity, ease: "easeInOut" } }}
                    whileHover={{ scale: 1.1, boxShadow: "0 0 18px rgba(251,191,36,0.65), 0 0 36px rgba(251,191,36,0.2)", transition: { duration: 0.18 } }}
                    whileTap={{ scale: 0.93, transition: { duration: 0.1 } }}
                    className="w-full rounded-full border border-amber-300/30 bg-amber-400/10 px-3 py-1.5 text-[11px] font-semibold text-amber-200 transition duration-200 hover:border-transparent hover:bg-gradient-to-r hover:from-[#ffd86b] hover:via-[#f5b52f] hover:to-[#ea8a17] hover:text-stone-950 hover:shadow-[0_0_18px_rgba(251,191,36,0.45)] sm:w-auto sm:shrink-0">
                    View ({savedDiets.length})
                  </Motion.button>
                </div>
              </div>
            </div>
            {/* scrollable body */}
            <div className="journal-scroll min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
              <MealGroup sections={MEAL_SECTIONS} meals={meals} setMeals={setMeals} inputs={mealInputs} setInputs={setMealInputs} />
            </div>
            {/* sticky footer */}
            <div className="shrink-0 border-t border-amber-100/10 px-4 pb-4 pt-3 sm:px-5 sm:pb-5">
              <div className="space-y-2">
                <SaveBtn label={editingDietId ? "Update this Diet for" : "Add this Diet for"} selectedDay={selectedDietDay} onClick={saveDiet} />
                {editingDietId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingDietId(null);
                      setMeals(makeMealState(MEAL_SECTIONS));
                      setMealInputs(makeInputState(MEAL_SECTIONS));
                      setSelectedDietDay("");
                    }}
                    className="w-full rounded-lg border border-stone-500/20 bg-white/5 px-4 py-2 text-xs font-semibold text-stone-300 transition hover:text-stone-100"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>
            </div>
          </div>

        </div>

        <div className="flex min-h-0 flex-col gap-4">
          {/* ── Container 2 + 3: Workout Nutrition & Supplements side by side ── */}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* ── Workout Nutrition ── */}
            <div className={`${card} h-full`}>
              <div className="shrink-0 border-b border-amber-100/10 px-4 pb-4 pt-4 sm:px-5 sm:pt-5">
                <div className="flex flex-col gap-3">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-amber-200">Workout Nutrition</h3>
                    <p className="mt-2 text-xs text-stone-400">Pre &amp; post workout meals.</p>
                  </div>
                  <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                    <DaySelector selected={selectedWnDay} onSelect={setSelectedWnDay} inline disabled={Boolean(editingWnId)} />
                    <Motion.button type="button" onClick={() => { setShowWnView(true); setWnDayFilter("all"); setCopyingWnId(null); }}
                      animate={{ scale: [1, 1.05, 1], boxShadow: ["0 0 0px rgba(251,191,36,0)", "0 0 12px rgba(251,191,36,0.5)", "0 0 0px rgba(251,191,36,0)"] }}
                      transition={{ scale: { duration: 2, repeat: Infinity, ease: "easeInOut" }, boxShadow: { duration: 2, repeat: Infinity, ease: "easeInOut" } }}
                      whileHover={{ scale: 1.1, boxShadow: "0 0 18px rgba(251,191,36,0.65), 0 0 36px rgba(251,191,36,0.2)", transition: { duration: 0.18 } }}
                      whileTap={{ scale: 0.93, transition: { duration: 0.1 } }}
                      className="w-full rounded-full border border-amber-300/30 bg-amber-400/10 px-3 py-1.5 text-[11px] font-semibold text-amber-200 transition duration-200 hover:border-transparent hover:bg-gradient-to-r hover:from-[#ffd86b] hover:via-[#f5b52f] hover:to-[#ea8a17] hover:text-stone-950 hover:shadow-[0_0_18px_rgba(251,191,36,0.45)] sm:w-auto sm:shrink-0">
                      View ({savedWn.length})
                    </Motion.button>
                  </div>
                </div>
              </div>
              <div className="journal-scroll px-4 py-4 sm:px-5">
                <MealGroup sections={WORKOUT_SECTIONS} meals={workoutMeals} setMeals={setWorkoutMeals} inputs={workoutInputs} setInputs={setWorkoutInputs} />
              </div>
              <div className="shrink-0 border-t border-amber-100/10 px-4 pb-4 pt-3 sm:px-5 sm:pb-5">
                <div className="space-y-2">
                  <SaveBtn label={editingWnId ? "Update this Nutrition for" : "Add this Nutrition for"} selectedDay={selectedWnDay} onClick={saveWn} />
                  {editingWnId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingWnId(null);
                        setWorkoutMeals(makeMealState(WORKOUT_SECTIONS));
                        setWorkoutInputs(makeInputState(WORKOUT_SECTIONS));
                        setSelectedWnDay("");
                      }}
                      className="w-full rounded-lg border border-stone-500/20 bg-white/5 px-4 py-2 text-xs font-semibold text-stone-300 transition hover:text-stone-100"
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* ── Supplements ── */}
            <div className={`${card} xl:shrink-0`}>
            <div className="shrink-0 border-b border-amber-100/10 px-4 pb-4 pt-4 sm:px-5 sm:pt-5">
              <div className="flex flex-col gap-3">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-amber-200">Supplements</h3>
                  <p className="mt-2 text-xs text-stone-400">Plan your daily supplement intake.</p>
                </div>
                <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                  <DaySelector selected={selectedSuppDay} onSelect={setSelectedSuppDay} inline disabled={Boolean(editingSuppId)} />
                  <div className="w-full sm:w-auto sm:shrink-0">
                    <Motion.button type="button" onClick={() => { setShowSuppView(true); setSuppDayFilter("all"); setCopyingSuppId(null); setShowSuppDraftView(false); }}
                      animate={{ scale: [1, 1.05, 1], boxShadow: ["0 0 0px rgba(251,191,36,0)", "0 0 12px rgba(251,191,36,0.5)", "0 0 0px rgba(251,191,36,0)"] }}
                      transition={{ scale: { duration: 2, repeat: Infinity, ease: "easeInOut" }, boxShadow: { duration: 2, repeat: Infinity, ease: "easeInOut" } }}
                      whileHover={{ scale: 1.1, boxShadow: "0 0 18px rgba(251,191,36,0.65), 0 0 36px rgba(251,191,36,0.2)", transition: { duration: 0.18 } }}
                      whileTap={{ scale: 0.93, transition: { duration: 0.1 } }}
                      className="w-full rounded-full border border-amber-300/30 bg-amber-400/10 px-3 py-1.5 text-[11px] font-semibold text-amber-200 transition duration-200 hover:border-transparent hover:bg-gradient-to-r hover:from-[#ffd86b] hover:via-[#f5b52f] hover:to-[#ea8a17] hover:text-stone-950 hover:shadow-[0_0_18px_rgba(251,191,36,0.45)]">
                      View ({savedSupps.length})
                    </Motion.button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col">
              <div className="px-4 pt-4 sm:px-5">
                {suppItems.length === 0 ? (
                  <p className="text-xs text-stone-500">No supplements added yet.</p>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowSuppDraftView(true)}
                    className="rounded-full border border-amber-300/30 bg-amber-400/10 px-2.5 py-0.5 text-[9px] font-semibold text-amber-200 transition duration-200 hover:border-transparent hover:bg-gradient-to-r hover:from-[#ffd86b] hover:via-[#f5b52f] hover:to-[#ea8a17] hover:text-stone-950 hover:shadow-[0_0_14px_rgba(251,191,36,0.4)]"
                  >
                    View ({suppItems.length})
                  </button>
                )}
              </div>
              <div className="px-4 pb-3 pt-3 sm:px-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:gap-1.5">
                  <input type="text" value={suppInput.name}
                    onChange={(e) => setSuppInput((p) => ({ ...p, name: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSuppItem(); } }}
                    placeholder="Add supplement…"
                    className="min-w-0 flex-1 rounded-lg border border-amber-100/15 bg-white/5 px-2.5 py-1 text-xs text-stone-100 outline-none transition focus:border-amber-300/35" />
                  <input type="time" value={suppInput.time}
                    onChange={(e) => setSuppInput((p) => ({ ...p, time: e.target.value }))}
                    className="w-full rounded-lg border border-amber-100/15 bg-white/5 px-2 py-1 text-xs text-stone-100 outline-none transition focus:border-amber-300/35 sm:w-24" />
                  <button type="button" onClick={addSuppItem}
                    className="rounded-lg border border-amber-300/25 bg-amber-400/10 px-2.5 py-2 text-[11px] font-semibold text-amber-200 transition hover:bg-amber-400/20 sm:py-1">Add</button>
                </div>
              </div>
            </div>
            <div className="shrink-0 border-t border-amber-100/10 px-4 pb-4 pt-3 sm:px-5 sm:pb-5">
              <div className="space-y-2">
                <SaveBtn label={editingSuppId ? "Update this Plan for" : "Add this Plan for"} selectedDay={selectedSuppDay} onClick={saveSupp} disabled={suppItems.length === 0} />
                {editingSuppId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingSuppId(null);
                      setSuppItems([]);
                      setSuppInput({ name: "", time: "" });
                      setSelectedSuppDay("");
                      setShowSuppDraftView(false);
                    }}
                    className="w-full rounded-lg border border-stone-500/20 bg-white/5 px-4 py-2 text-xs font-semibold text-stone-300 transition hover:text-stone-100"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>
            </div>
            </div>
          </div>

          {/* ── Container 4: Macros ── */}
          <div className={`${card} min-h-[18rem] xl:shrink-0`}>
            {/* sticky header */}
            <div className="shrink-0 border-b border-amber-100/10 px-4 pb-4 pt-4 sm:px-5 sm:pt-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-amber-200">Macros</h3>
                </div>
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
                  <DaySelector selected={selectedMacroDay} onSelect={setSelectedMacroDay} compact disabled={Boolean(editingMacroId)} />
                  <Motion.button type="button" onClick={() => { setShowMacrosView(true); setMacrosDayFilter("all"); setCopyingMacroId(null); }}
                    animate={{ scale: [1, 1.05, 1], boxShadow: ["0 0 0px rgba(251,191,36,0)", "0 0 12px rgba(251,191,36,0.5)", "0 0 0px rgba(251,191,36,0)"] }}
                    transition={{ scale: { duration: 2, repeat: Infinity, ease: "easeInOut" }, boxShadow: { duration: 2, repeat: Infinity, ease: "easeInOut" } }}
                    whileHover={{ scale: 1.1, boxShadow: "0 0 18px rgba(251,191,36,0.65), 0 0 36px rgba(251,191,36,0.2)", transition: { duration: 0.18 } }}
                    whileTap={{ scale: 0.93, transition: { duration: 0.1 } }}
                    className="w-full rounded-full border border-amber-300/30 bg-amber-400/10 px-3 py-1.5 text-[11px] font-semibold text-amber-200 transition duration-200 hover:border-transparent hover:bg-gradient-to-r hover:from-[#ffd86b] hover:via-[#f5b52f] hover:to-[#ea8a17] hover:text-stone-950 hover:shadow-[0_0_18px_rgba(251,191,36,0.45)] sm:w-auto sm:shrink-0">
                    View ({savedMacros.length})
                  </Motion.button>
                </div>
              </div>
              <p className="mt-2 text-xs text-stone-400">Set your daily macro targets.</p>
            </div>
            {/* scrollable body */}
            <div className="journal-scroll min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {MACRO_FIELDS.map(({ key, label, unit }) => (
                  <div key={key}>
                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-stone-400">
                      {label} <span className="font-normal normal-case text-stone-500">({unit})</span>
                    </label>
                    <input type="number" min="0" step="0.1" value={macros[key]}
                      onChange={(e) => setMacros((prev) => ({ ...prev, [key]: e.target.value }))}
                      placeholder="0"
                      className="w-full rounded-lg border border-amber-100/15 bg-white/5 px-2 py-1.5 text-sm text-stone-100 outline-none transition focus:border-amber-300/35 focus:ring-1 focus:ring-amber-300/30" />
                  </div>
                ))}
              </div>
            </div>
            {/* sticky footer */}
            <div className="shrink-0 border-t border-amber-100/10 px-4 pb-4 pt-3 sm:px-5 sm:pb-5">
              <div className="space-y-2">
                <button type="button" onClick={saveMacro} disabled={!selectedMacroDay}
                  className={`w-full rounded-lg border px-4 py-2 text-xs font-semibold transition ${
                    selectedMacroDay
                      ? "border-amber-400/35 bg-gradient-to-r from-amber-400/20 to-orange-400/15 text-amber-200 hover:from-amber-400/25 hover:to-orange-400/20"
                      : "cursor-not-allowed border-amber-100/10 bg-white/5 text-stone-500"
                  }`}>
                  {editingMacroId ? "Update this Macro Plan for" : "Add this Macro Plan for"} {selectedMacroDay || "Selected Day"}
                </button>
                {editingMacroId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingMacroId(null);
                      setMacros(BLANK_MACROS);
                      setSelectedMacroDay("");
                    }}
                    className="w-full rounded-lg border border-stone-500/20 bg-white/5 px-4 py-2 text-xs font-semibold text-stone-300 transition hover:text-stone-100"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Diet View Modal ── */}
      {showDietView && (
        <PlanViewModal
          title="Saved Diets" plans={savedDiets}
          dayFilter={dietDayFilter} setDayFilter={setDietDayFilter}
          copyingId={copyingDietId} setCopyingId={setCopyingDietId}
          onToggleActive={(id) => { void handleTogglePlan(PLAN_TYPES.DIET, id); }}
          onDelete={(id) => { void handleDeletePlan(PLAN_TYPES.DIET, id, setCopyingDietId); }}
          onCopy={(plan, day) => { void handleCopyPlan(PLAN_TYPES.DIET, plan, day); }}
          onEdit={startEditDiet}
          onClose={() => setShowDietView(false)}
          getRemainingDays={makeGetRemaining(savedDiets)}
          renderPlanContent={(plan) => (
            <div className="space-y-2.5">
              {MEAL_SECTIONS.map(({ key, label }) => {
                const items = plan.meals[key] || [];
                if (!items.length) return null;
                return (
                  <div key={key}>
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-amber-200/60">{label}</p>
                    <div className="space-y-1">
                      {items.map((meal) => (
                        <div key={meal.id} className="flex items-center justify-between rounded-md border border-amber-100/8 bg-black/20 px-2.5 py-1">
                          <p className="text-xs text-stone-100">{meal.name}</p>
                          {meal.time && <p className="text-[10px] text-stone-400">{fmtTime(meal.time)}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              {MEAL_SECTIONS.every(({ key }) => !(plan.meals[key] || []).length) && (
                <p className="text-xs text-stone-500">No meals added.</p>
              )}
            </div>
          )}
        />
      )}

      {/* ── Workout Nutrition View Modal ── */}
      {showWnView && (
        <PlanViewModal
          title="Saved Workout Nutrition" plans={savedWn}
          dayFilter={wnDayFilter} setDayFilter={setWnDayFilter}
          copyingId={copyingWnId} setCopyingId={setCopyingWnId}
          onToggleActive={(id) => { void handleTogglePlan(PLAN_TYPES.WORKOUT_NUTRITION, id); }}
          onDelete={(id) => { void handleDeletePlan(PLAN_TYPES.WORKOUT_NUTRITION, id, setCopyingWnId); }}
          onCopy={(plan, day) => { void handleCopyPlan(PLAN_TYPES.WORKOUT_NUTRITION, plan, day); }}
          onEdit={startEditWn}
          onClose={() => setShowWnView(false)}
          getRemainingDays={makeGetRemaining(savedWn)}
          renderPlanContent={(plan) => (
            <div className="space-y-2.5">
              {WORKOUT_SECTIONS.map(({ key, label }) => {
                const items = plan.meals[key] || [];
                if (!items.length) return null;
                return (
                  <div key={key}>
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-amber-200/60">{label}</p>
                    <div className="space-y-1">
                      {items.map((meal) => (
                        <div key={meal.id} className="flex items-center justify-between rounded-md border border-amber-100/8 bg-black/20 px-2.5 py-1">
                          <p className="text-xs text-stone-100">{meal.name}</p>
                          {meal.time && <p className="text-[10px] text-stone-400">{fmtTime(meal.time)}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        />
      )}

      {showSuppView && (
        <PlanViewModal
          title="Saved Supplement Plans" plans={savedSupps}
          dayFilter={suppDayFilter} setDayFilter={setSuppDayFilter}
          copyingId={copyingSuppId} setCopyingId={setCopyingSuppId}
          onToggleActive={(id) => { void handleTogglePlan(PLAN_TYPES.SUPPLEMENTS, id); }}
          onDelete={(id) => { void handleDeletePlan(PLAN_TYPES.SUPPLEMENTS, id, setCopyingSuppId); }}
          onCopy={(plan, day) => { void handleCopyPlan(PLAN_TYPES.SUPPLEMENTS, plan, day); }}
          onEdit={startEditSupp}
          onClose={() => setShowSuppView(false)}
          getRemainingDays={makeGetRemaining(savedSupps)}
          renderPlanContent={(plan) => (
            <div className="space-y-1">
              {(plan.items || []).map((s, idx) => (
                <div key={s.id} className="flex items-center justify-between rounded-md border border-amber-100/8 bg-black/20 px-2.5 py-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-amber-400/50">{idx + 1}.</span>
                    <p className="text-xs text-stone-100">{s.name}</p>
                  </div>
                  {s.time && <p className="text-[10px] text-stone-400">{fmtTime(s.time)}</p>}
                </div>
              ))}
              {!(plan.items || []).length && <p className="text-xs text-stone-500">No supplements added.</p>}
            </div>
          )}
        />
      )}

      {showSuppDraftView && suppItems.length > 0 && (
        <SupplementDraftModal
          items={suppItems}
          onRemove={removeSuppItem}
          onClose={() => setShowSuppDraftView(false)}
        />
      )}


      {/* ── Macros View Modal ── */}
      {showMacrosView && (
        <PlanViewModal
          title="Saved Macro Plans" plans={savedMacros}
          dayFilter={macrosDayFilter} setDayFilter={setMacrosDayFilter}
          copyingId={copyingMacroId} setCopyingId={setCopyingMacroId}
          onToggleActive={(id) => { void handleTogglePlan(PLAN_TYPES.MACROS, id); }}
          onDelete={(id) => { void handleDeletePlan(PLAN_TYPES.MACROS, id, setCopyingMacroId); }}
          onCopy={(plan, day) => { void handleCopyPlan(PLAN_TYPES.MACROS, plan, day); }}
          onEdit={startEditMacro}
          onClose={() => setShowMacrosView(false)}
          getRemainingDays={makeGetRemaining(savedMacros)}
          renderPlanContent={(plan) => (
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
              {MACRO_FIELDS.map(({ key, label, unit }) => (
                plan.values[key] ? (
                  <div key={key} className="rounded-md border border-amber-100/8 bg-black/20 px-2.5 py-1.5">
                    <p className="text-[9px] font-semibold uppercase tracking-wide text-stone-400">{label}</p>
                    <p className="mt-0.5 text-xs font-semibold text-stone-100">{plan.values[key]} <span className="text-[10px] font-normal text-stone-400">{unit}</span></p>
                  </div>
                ) : null
              ))}
            </div>
          )}
        />
      )}
    </div>
  );
}
