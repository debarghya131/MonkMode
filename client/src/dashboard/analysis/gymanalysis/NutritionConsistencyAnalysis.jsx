import { useEffect, useMemo, useState } from "react";
import { motion as Motion } from "framer-motion";
import littleMonkLogo from "../../../assets/littlemonklogo.webp";
import api from "../../../api/axios";
import useAuth from "../../../hooks/useAuth";
import { buildDemoGymMonthAnalysis } from "./demoGymAnalysis";

const MONTH_OPTIONS = [
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

const NOW = new Date();
const YEARS = Array.from({ length: NOW.getFullYear() - 2023 }, (_, i) => String(NOW.getFullYear() - i));
const CURRENT_MONTH = String(NOW.getMonth() + 1);

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const MACRO_COLORS = {
  Protein: { color: "#38bdf8", text: "text-sky-300", border: "border-sky-400/30" },
  Carbs: { color: "#f59e0b", text: "text-amber-300", border: "border-amber-400/30" },
  Fats: { color: "#fb7185", text: "text-rose-300", border: "border-rose-400/30" },
  Calories: { color: "#c084fc", text: "text-violet-300", border: "border-violet-400/30" },
};

function InsightRail({ insights }) {
  const [selected, setSelected] = useState(null);
  return (
    <aside className="flex w-full flex-col overflow-hidden rounded-[1.4rem] border border-amber-100/10 bg-white/6 shadow-xl shadow-black/25 backdrop-blur sm:rounded-2xl">
      <div className="shrink-0 p-4 pb-3 sm:p-5 sm:pb-4">
        <div className="flex items-center gap-3">
          <Motion.div
            className="relative grid h-16 w-16 place-items-center"
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
          >
            <Motion.span
              className="absolute inset-2 rounded-full bg-amber-400/15 blur-md"
              animate={{ opacity: [0.35, 0.8, 0.35], scale: [0.9, 1.12, 0.9] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
            />
            <Motion.img
              src={littleMonkLogo}
              alt="Little Monk"
              className="relative z-10 h-20 w-20 object-contain drop-shadow-[0_10px_18px_rgba(245,158,11,0.16)]"
              whileHover={{ scale: 1.08, rotate: -3 }}
              transition={{ type: "spring", stiffness: 260, damping: 14 }}
            />
          </Motion.div>
          <div>
            <h3 className="text-label-md">Little Monk's Analysis</h3>
            <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.14em] text-amber-300/70">AI Assistant</p>
          </div>
        </div>
      </div>
      <div className="journal-scroll space-y-3 px-4 pb-4 pr-3 sm:px-5 sm:pb-5 sm:pr-4">
        {insights.map((insight) => {
          const isSelected = selected === insight.title;
          return (
            <Motion.div
              key={insight.title}
              layout
              className={`rounded-xl border p-3 text-sm transition-colors ${
                isSelected ? "border-sky-400/30 bg-sky-500/8" : "border-sky-100/10 bg-stone-950/45 hover:border-sky-300/20"
              }`}
            >
              <div className="grid items-start gap-3 sm:grid-cols-[1fr_auto]">
                <div className="min-w-0">
                  <span className="text-xs font-semibold text-sky-200">{insight.title}</span>
                  <p className="text-sm font-semibold text-stone-200">{insight.value}</p>
                  {isSelected && (
                    <Motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="mt-1.5 text-xs leading-relaxed text-stone-400">
                      {insight.description}
                    </Motion.p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setSelected(isSelected ? null : insight.title)}
                  className={`w-full rounded-full border px-3 py-1 text-xs font-semibold transition-colors sm:w-fit ${
                    isSelected ? "border-sky-400/40 bg-sky-400/15 text-sky-100" : "border-sky-400/20 text-sky-200 hover:border-sky-300/45 hover:bg-sky-400/10"
                  }`}
                >
                  {isSelected ? "Hide" : "View"}
                </button>
              </div>
            </Motion.div>
          );
        })}
      </div>
    </aside>
  );
}

function MacroTargetsChart({ macros }) {
  const [hoveredMacro, setHoveredMacro] = useState(null);

  if (!macros) {
    return (
      <section className="rounded-[1.4rem] border border-sky-100/10 bg-stone-950/30 p-4 shadow-xl shadow-black/20 sm:rounded-[1.75rem] sm:p-5">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-stone-500">Nutrition Targets</p>
          <h4 className="mt-2 text-xl font-semibold text-sky-50">Active Macro Plan</h4>
          <p className="mt-1 text-[11px] text-stone-400">Set up a macro diet plan in the Gym module to see your targets here</p>
        </div>
        <div className="mt-6 flex h-24 items-center justify-center text-sm text-stone-500">
          No active macro plan found.
        </div>
      </section>
    );
  }

  const protein = parseFloat(macros.protein) || 0;
  const carbs = parseFloat(macros.carbs) || 0;
  const fats = parseFloat(macros.fats) || 0;
  const calories = parseFloat(macros.calories) || 0;

  const pieMacros = [
    { macro: "Protein", value: protein, unit: "g" },
    { macro: "Carbs", value: carbs, unit: "g" },
    { macro: "Fats", value: fats, unit: "g" },
  ];

  const totalMacroGrams = pieMacros.reduce((sum, m) => sum + m.value, 0) || 1;
  const activeMacro = hoveredMacro ?? "Protein";
  const activeItem = pieMacros.find((m) => m.macro === activeMacro) ?? pieMacros[0];
  const circumference = 2 * Math.PI * 68;
  let runningOffset = 0;

  return (
    <section className="rounded-[1.4rem] border border-sky-100/10 bg-stone-950/30 p-4 shadow-xl shadow-black/20 sm:rounded-[1.75rem] sm:p-5">
      <div>
        <p className="text-[11px] uppercase tracking-[0.22em] text-stone-500">Nutrition Targets</p>
        <h4 className="mt-2 text-xl font-semibold text-sky-50">Active Macro Plan</h4>
        <p className="mt-1 text-[11px] text-stone-400">Daily macro targets from your active diet plan</p>
      </div>

      <div className="mt-6 grid gap-4 sm:gap-6 lg:grid-cols-[minmax(220px,0.75fr)_1fr] lg:items-center">
        <div className="relative mx-auto aspect-square w-full max-w-[280px]">
          <Motion.div
            className="absolute inset-5 rounded-full bg-sky-400/8 blur-2xl"
            animate={{ opacity: [0.25, 0.55, 0.25], scale: [0.92, 1.05, 0.92] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
          />
          <svg viewBox="0 0 180 180" className="relative z-10 h-full w-full -rotate-90 drop-shadow-[0_16px_35px_rgba(0,0,0,0.32)]">
            <circle cx="90" cy="90" r="68" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="28" />
            {pieMacros.map((item, index) => {
              const slice = (item.value / totalMacroGrams) * circumference;
              const dashOffset = -runningOffset;
              runningOffset += slice;
              const isActive = activeMacro === item.macro;
              return (
                <Motion.circle
                  key={item.macro}
                  cx="90"
                  cy="90"
                  r="68"
                  fill="none"
                  stroke={MACRO_COLORS[item.macro].color}
                  strokeWidth={isActive ? 32 : 26}
                  strokeDasharray={`${slice} ${circumference - slice}`}
                  strokeDashoffset={dashOffset}
                  strokeLinecap="round"
                  initial={{ strokeDasharray: `0 ${circumference}`, opacity: 0 }}
                  animate={{
                    strokeDasharray: `${slice} ${circumference - slice}`,
                    opacity: hoveredMacro && !isActive ? 0.34 : 0.96,
                  }}
                  transition={{ duration: 0.8, delay: index * 0.08, ease: "easeOut" }}
                  className="cursor-pointer transition-[stroke-width]"
                  onMouseEnter={() => setHoveredMacro(item.macro)}
                  onMouseLeave={() => setHoveredMacro(null)}
                />
              );
            })}
          </svg>
          <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center text-center">
            <Motion.div
              key={activeItem.macro}
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.22 }}
              className="rounded-2xl border border-white/8 bg-stone-950/70 px-4 py-3 shadow-xl shadow-black/30 backdrop-blur"
            >
              <p className={`text-sm font-bold ${MACRO_COLORS[activeItem.macro].text}`}>{activeItem.macro}</p>
              <p className="mt-1 text-2xl font-black text-stone-50">{activeItem.value}{activeItem.unit}</p>
              <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-500">
                {Math.round((activeItem.value / totalMacroGrams) * 100)}% of macros
              </p>
            </Motion.div>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {[...pieMacros, { macro: "Calories", value: calories, unit: "kcal" }].map((item, index) => {
            const isActive = item.macro !== "Calories" && activeMacro === item.macro;
            return (
              <Motion.button
                key={item.macro}
                type="button"
                onMouseEnter={() => item.macro !== "Calories" ? setHoveredMacro(item.macro) : null}
                onMouseLeave={() => setHoveredMacro(null)}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: hoveredMacro && !isActive ? 0.45 : 1, x: 0 }}
                transition={{ duration: 0.25, delay: index * 0.04 }}
                className={`flex items-center justify-between gap-3 rounded-xl border p-3 text-left transition-colors ${
                  isActive ? `${MACRO_COLORS[item.macro].border} bg-white/8` : "border-white/8 bg-stone-950/35 hover:border-white/16"
                }`}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className="h-3 w-3 shrink-0 rounded-full shadow-[0_0_14px_currentColor]"
                    style={{ backgroundColor: MACRO_COLORS[item.macro].color, color: MACRO_COLORS[item.macro].color }}
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-semibold text-stone-200">{item.macro}</span>
                    <span className="text-[10px] text-stone-500">Daily target</span>
                  </span>
                </span>
                <span className={`text-sm font-bold ${MACRO_COLORS[item.macro].text}`}>
                  {item.value}{item.unit === "kcal" ? " kcal" : item.unit}
                </span>
              </Motion.button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function DayWiseWorkoutFrequency({ sessions }) {
  const [hovered, setHovered] = useState(null);

  const series = useMemo(
    () => DAY_NAMES.map((day) => ({ day, count: sessions.filter((s) => s.day === day).length })),
    [sessions],
  );

  const maxCount = Math.max(...series.map((s) => s.count), 1);
  const barH = 150;
  const labelH = 44;
  const yTicks = [...new Set([0, Math.ceil(maxCount / 2), maxCount])];

  return (
    <section className="journal-scroll overflow-y-auto rounded-[1.4rem] border border-sky-100/10 bg-stone-950/30 p-4 shadow-xl shadow-black/20 sm:rounded-[1.75rem] sm:p-5 lg:max-h-[310px]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-stone-500">Workout Frequency</p>
          <h4 className="mt-2 text-xl font-semibold text-sky-50">Sessions per Weekday</h4>
        </div>
        <span className="flex items-center gap-2 text-xs text-stone-400">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
          Sessions
        </span>
      </div>

      <div className="mt-5 flex gap-3">
        <div className="relative z-10 w-9 shrink-0 text-right text-[11px] font-semibold text-stone-300" style={{ height: barH, marginBottom: labelH }}>
          {yTicks.map((tick) => (
            <span key={tick} className="absolute right-0 rounded bg-stone-950/55 px-0.5" style={{ bottom: `${(tick / maxCount) * barH - (tick === 0 ? 0 : 7)}px` }}>
              {tick}
            </span>
          ))}
        </div>

        <div className="relative flex-1 overflow-x-auto">
          <div className="relative min-w-[520px]" style={{ height: barH + labelH }}>
            {yTicks.map((tick) => (
              <div key={tick} className="absolute left-0 right-0 border-t border-dashed border-white/6" style={{ bottom: labelH + (tick / maxCount) * barH }} />
            ))}

            <div className="absolute left-0 right-0 flex items-end gap-2.5" style={{ top: 0, bottom: labelH }}>
              {series.map((item, index) => (
                <div
                  key={item.day}
                  className="flex min-w-0 flex-1 flex-col items-center justify-end"
                  style={{ height: "100%", opacity: hovered !== null && hovered !== index ? 0.4 : 1, transition: "opacity 0.18s ease", cursor: "default" }}
                  onMouseEnter={() => setHovered(index)}
                  onMouseLeave={() => setHovered(null)}
                >
                  <span className="mb-1 text-[10px] font-semibold text-emerald-200">{item.count}</span>
                  <Motion.div
                    className="w-full max-w-[42px] rounded-t-xl border border-emerald-200/25 bg-gradient-to-t from-emerald-900/95 to-emerald-300/90"
                    initial={{ height: 0 }}
                    animate={{ height: item.count > 0 ? Math.max(10, Math.round((item.count / maxCount) * barH)) : 3 }}
                    transition={{ duration: 0.42, delay: index * 0.04 }}
                  />
                </div>
              ))}
            </div>

            <div className="absolute bottom-0 left-0 right-0 flex items-center text-[10px] text-stone-500" style={{ height: `${labelH}px` }}>
              {series.map((item) => (
                <span key={`x-${item.day}`} className="flex-1 text-center">{item.day}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function NutritionConsistencyAnalysis() {
  const { user, isDemoMode } = useAuth();
  const [selectedYear, setSelectedYear] = useState(isDemoMode ? "2026" : String(NOW.getFullYear()));
  const [selectedMonth, setSelectedMonth] = useState(isDemoMode ? "4" : CURRENT_MONTH);
  const [sessions, setSessions] = useState([]);
  const [weeklyStats, setWeeklyStats] = useState([]);
  const [macros, setMacros] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isDemoMode) {
      const demo = buildDemoGymMonthAnalysis();
      setSessions(demo.sessions);
      setWeeklyStats(demo.weeklyStats);
      setMacros(demo.macros);
      setLoading(false);
      return;
    }
    if (!user) {
      setSessions([]);
      setWeeklyStats([]);
      setMacros(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const loadAnalysis = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/gym/analysis?year=${selectedYear}&month=${Number(selectedMonth)}`);
        if (!cancelled) {
          setSessions(res.data.sessions || []);
          setWeeklyStats(res.data.weeklyStats || []);
          setMacros(res.data.macros || null);
        }
      } catch {
        if (!cancelled) {
          setSessions([]);
          setWeeklyStats([]);
          setMacros(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    const refreshAnalysis = () => {
      loadAnalysis();
    };

    loadAnalysis();
    window.addEventListener("focus", refreshAnalysis);
    window.addEventListener("storage", refreshAnalysis);
    window.addEventListener("monkmode:gym-diet-updated", refreshAnalysis);
    window.addEventListener("monkmode:exercise-progress-updated", refreshAnalysis);
    window.addEventListener("monkmode:gym-workouts-updated", refreshAnalysis);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", refreshAnalysis);
      window.removeEventListener("storage", refreshAnalysis);
      window.removeEventListener("monkmode:gym-diet-updated", refreshAnalysis);
      window.removeEventListener("monkmode:exercise-progress-updated", refreshAnalysis);
      window.removeEventListener("monkmode:gym-workouts-updated", refreshAnalysis);
    };
  }, [isDemoMode, user, selectedYear, selectedMonth]);

  const insights = useMemo(() => {
    const avgConsistency = weeklyStats.length
      ? Math.round(weeklyStats.reduce((s, w) => s + w.consistencyScore, 0) / weeklyStats.length)
      : 0;
    const totalWorkoutDays = weeklyStats.reduce((s, w) => s + w.workoutDays, 0);
    const bestWeek = weeklyStats.length
      ? weeklyStats.reduce((best, w) => (w.consistencyScore > best.consistencyScore ? w : best), weeklyStats[0])
      : null;
    const protein = macros ? (parseFloat(macros.protein) || 0) : 0;
    const calories = macros ? (parseFloat(macros.calories) || 0) : 0;

    return [
      {
        title: "Avg Consistency Score",
        value: weeklyStats.length ? `${avgConsistency} / 100` : "—",
        description: weeklyStats.length
          ? `Average consistency score across ${weeklyStats.length} week${weeklyStats.length !== 1 ? "s" : ""} this month. Scores ≥80 indicate excellent adherence.`
          : "No workout data for this month.",
      },
      {
        title: "Total Workout Days",
        value: `${totalWorkoutDays} days`,
        description: "Total days with at least one workout logged this month.",
      },
      {
        title: "Protein Target",
        value: protein ? `${protein}g / day` : "—",
        description: macros ? "Daily protein target from your active macro plan." : "No active macro plan found.",
      },
      {
        title: "Calorie Target",
        value: calories ? `${calories.toLocaleString()} kcal` : "—",
        description: macros ? "Daily calorie target from your active macro plan." : "No active macro plan found.",
      },
      {
        title: "Best Week",
        value: bestWeek ? `${bestWeek.weekLabel} (${bestWeek.consistencyScore}%)` : "—",
        description: bestWeek
          ? `Your most consistent week this month with ${bestWeek.workoutDays} out of ${bestWeek.totalDays} days active.`
          : "No workout data for this month.",
      },
    ];
  }, [weeklyStats, macros]);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex w-full items-center gap-2 rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2 text-sm text-stone-300 sm:w-auto">
          <span className="text-stone-400">Year</span>
          <select
            value={selectedYear}
            onChange={(e) => {
              const y = e.target.value;
              setSelectedYear(y);
              if (Number(y) === NOW.getFullYear() && Number(selectedMonth) > NOW.getMonth() + 1) {
                setSelectedMonth(CURRENT_MONTH);
              }
            }}
            className="bg-transparent text-sky-100 outline-none"
          >
            {YEARS.map((y) => (
              <option key={y} value={y} className="bg-stone-950 text-stone-200">{y}</option>
            ))}
          </select>
        </label>
        <label className="flex w-full items-center gap-2 rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2 text-sm text-stone-300 sm:w-auto">
          <span className="text-stone-400">Month</span>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-transparent text-sky-100 outline-none"
          >
            {(Number(selectedYear) < NOW.getFullYear() ? MONTH_OPTIONS : MONTH_OPTIONS.filter((m) => Number(m.value) <= NOW.getMonth() + 1))
              .map((m) => (
                <option key={m.value} value={m.value} className="bg-stone-950 text-stone-200">{m.label}</option>
              ))}
          </select>
        </label>
        {loading && <span className="animate-pulse text-xs text-stone-500">Loading…</span>}
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-5">
        <div
          className="journal-scroll min-w-0 flex-1 scroll-smooth overflow-y-auto rounded-[1.6rem] border border-sky-100/10 bg-white/[0.03] shadow-2xl shadow-black/30 backdrop-blur sm:rounded-[2rem] lg:max-h-[calc(100vh-350px)]"
        >
          <div className="space-y-4 p-4 sm:space-y-6 sm:p-6">
            <MacroTargetsChart macros={macros} />
            <DayWiseWorkoutFrequency sessions={sessions} />
          </div>
        </div>

        <div className="journal-scroll self-start flex w-full flex-col gap-2 scroll-smooth overflow-y-auto lg:max-h-[calc(100vh-180px)] lg:max-w-[380px] lg:shrink-0">
          <InsightRail insights={insights} />
        </div>
      </div>
    </section>
  );
}
