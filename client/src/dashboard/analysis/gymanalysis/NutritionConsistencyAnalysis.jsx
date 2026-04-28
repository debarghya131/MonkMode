import { useMemo, useState } from "react";
import { motion as Motion } from "framer-motion";
import littleMonkLogo from "../../../assets/littlemonklogo.png";

const MONTH_OPTIONS = [
  { value: "01", label: "January" },
  { value: "02", label: "February" },
  { value: "03", label: "March" },
  { value: "04", label: "April" },
  { value: "05", label: "May" },
  { value: "06", label: "June" },
  { value: "07", label: "July" },
  { value: "08", label: "August" },
  { value: "09", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

const WEEKLY_GYM_REPORTS = [
  {
    year: "2026",
    month: "04",
    weekLabel: "Apr 1–5",
    workoutDays: 3,
    totalDays: 7,
    consistencyScore: 74,
    weeklyScore: 72,
    avgProtein: 136,
    avgCarbs: 204,
    avgFats: 50,
    avgCalories: 1820,
    proteinTarget: 150,
    carbsTarget: 220,
    fatsTarget: 55,
    caloriesTarget: 2000,
  },
  {
    year: "2026",
    month: "04",
    weekLabel: "Apr 21–27",
    workoutDays: 4,
    totalDays: 7,
    consistencyScore: 84,
    weeklyScore: 81,
    avgProtein: 148,
    avgCarbs: 218,
    avgFats: 54,
    avgCalories: 1960,
    proteinTarget: 150,
    carbsTarget: 220,
    fatsTarget: 55,
    caloriesTarget: 2000,
  },
  {
    year: "2026",
    month: "04",
    weekLabel: "Apr 13–19",
    workoutDays: 5,
    totalDays: 7,
    consistencyScore: 88,
    weeklyScore: 85,
    avgProtein: 152,
    avgCarbs: 222,
    avgFats: 56,
    avgCalories: 2010,
    proteinTarget: 150,
    carbsTarget: 220,
    fatsTarget: 55,
    caloriesTarget: 2000,
  },
  {
    year: "2026",
    month: "04",
    weekLabel: "Apr 6–12",
    workoutDays: 4,
    totalDays: 7,
    consistencyScore: 80,
    weeklyScore: 76,
    avgProtein: 140,
    avgCarbs: 210,
    avgFats: 52,
    avgCalories: 1880,
    proteinTarget: 150,
    carbsTarget: 220,
    fatsTarget: 55,
    caloriesTarget: 2000,
  },
  {
    year: "2026",
    month: "03",
    weekLabel: "Mar 23–29",
    workoutDays: 4,
    totalDays: 7,
    consistencyScore: 78,
    weeklyScore: 74,
    avgProtein: 138,
    avgCarbs: 205,
    avgFats: 50,
    avgCalories: 1840,
    proteinTarget: 150,
    carbsTarget: 220,
    fatsTarget: 55,
    caloriesTarget: 2000,
  },
  {
    year: "2026",
    month: "03",
    weekLabel: "Mar 16–22",
    workoutDays: 5,
    totalDays: 7,
    consistencyScore: 82,
    weeklyScore: 79,
    avgProtein: 144,
    avgCarbs: 212,
    avgFats: 53,
    avgCalories: 1910,
    proteinTarget: 150,
    carbsTarget: 220,
    fatsTarget: 55,
    caloriesTarget: 2000,
  },
  {
    year: "2026",
    month: "03",
    weekLabel: "Mar 9–15",
    workoutDays: 4,
    totalDays: 7,
    consistencyScore: 76,
    weeklyScore: 72,
    avgProtein: 135,
    avgCarbs: 200,
    avgFats: 49,
    avgCalories: 1800,
    proteinTarget: 150,
    carbsTarget: 220,
    fatsTarget: 55,
    caloriesTarget: 2000,
  },
  {
    year: "2026",
    month: "02",
    weekLabel: "Feb 23–Mar 1",
    workoutDays: 4,
    totalDays: 7,
    consistencyScore: 74,
    weeklyScore: 70,
    avgProtein: 132,
    avgCarbs: 198,
    avgFats: 48,
    avgCalories: 1780,
    proteinTarget: 150,
    carbsTarget: 220,
    fatsTarget: 55,
    caloriesTarget: 2000,
  },
  {
    year: "2026",
    month: "02",
    weekLabel: "Feb 16–22",
    workoutDays: 3,
    totalDays: 7,
    consistencyScore: 68,
    weeklyScore: 65,
    avgProtein: 126,
    avgCarbs: 192,
    avgFats: 47,
    avgCalories: 1720,
    proteinTarget: 150,
    carbsTarget: 220,
    fatsTarget: 55,
    caloriesTarget: 2000,
  },
  {
    year: "2025",
    month: "12",
    weekLabel: "Dec 15–21",
    workoutDays: 3,
    totalDays: 7,
    consistencyScore: 62,
    weeklyScore: 60,
    avgProtein: 120,
    avgCarbs: 185,
    avgFats: 45,
    avgCalories: 1680,
    proteinTarget: 150,
    carbsTarget: 220,
    fatsTarget: 55,
    caloriesTarget: 2000,
  },
  {
    year: "2025",
    month: "12",
    weekLabel: "Dec 8–14",
    workoutDays: 3,
    totalDays: 7,
    consistencyScore: 64,
    weeklyScore: 61,
    avgProtein: 122,
    avgCarbs: 188,
    avgFats: 46,
    avgCalories: 1700,
    proteinTarget: 150,
    carbsTarget: 220,
    fatsTarget: 55,
    caloriesTarget: 2000,
  },
];

const YEARS = [...new Set(WEEKLY_GYM_REPORTS.map((e) => e.year))].sort().reverse();
const CURRENT_YEAR = String(new Date().getFullYear());
const CURRENT_MONTH = String(new Date().getMonth() + 1).padStart(2, "0");

function getAvailableMonthsForYear(year) {
  return MONTH_OPTIONS.filter((m) =>
    WEEKLY_GYM_REPORTS.some((e) => e.year === year && e.month === m.value)
  );
}

const INITIAL_YEAR = YEARS.includes(CURRENT_YEAR) ? CURRENT_YEAR : YEARS[0];
const INITIAL_MONTH = (() => {
  const months = getAvailableMonthsForYear(INITIAL_YEAR);
  if (months.some((m) => m.value === CURRENT_MONTH)) return CURRENT_MONTH;
  return months[0]?.value ?? MONTH_OPTIONS[0].value;
})();

const round = (v, p = 1) => Number(v.toFixed(p));

function getWeekStartDay(weekLabel) {
  const match = weekLabel.match(/\b(\d{1,2})/);
  return match ? Number(match[1]) : 0;
}

function sortWeeksChronologically(weeks) {
  return [...weeks].sort((a, b) => getWeekStartDay(a.weekLabel) - getWeekStartDay(b.weekLabel));
}

function InsightRail({ insights }) {
  const [selected, setSelected] = useState(null);
  return (
    <aside className="flex w-full flex-col overflow-hidden rounded-2xl border border-amber-100/10 bg-white/6 shadow-xl shadow-black/25 backdrop-blur">
      <div className="shrink-0 p-5 pb-4">
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
      <div className="journal-scroll space-y-3 px-5 pb-5 pr-4">
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
              <div className="grid grid-cols-[1fr_auto] items-start gap-3">
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
                  className={`w-fit rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
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

const MACRO_COLORS = {
  Protein: { color: "#38bdf8", text: "text-sky-300", border: "border-sky-400/30" },
  Carbs: { color: "#f59e0b", text: "text-amber-300", border: "border-amber-400/30" },
  Fats: { color: "#fb7185", text: "text-rose-300", border: "border-rose-400/30" },
  Fiber: { color: "#34d399", text: "text-emerald-300", border: "border-emerald-400/30" },
  Sugar: { color: "#a78bfa", text: "text-violet-300", border: "border-violet-400/30" },
  Calories: { color: "#c084fc", text: "text-violet-300", border: "border-violet-400/30" },
  "Water Intake": { color: "#22d3ee", text: "text-cyan-300", border: "border-cyan-400/30" },
  Sodium: { color: "#f97316", text: "text-orange-300", border: "border-orange-400/30" },
};

const averageBy = (weeks, getValue, precision = 0) =>
  weeks.length ? round(weeks.reduce((sum, week) => sum + getValue(week), 0) / weeks.length, precision) : 0;

const CONSISTENCY_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function buildDayWiseConsistency(weeks) {
  if (!weeks.length) {
    return CONSISTENCY_DAYS.map((day) => ({ day, value: 0 }));
  }

  const totalConsistency = weeks.reduce((sum, week) => sum + week.consistencyScore, 0);
  const avgConsistency = totalConsistency / weeks.length;
  const workoutRatio = weeks.reduce((sum, week) => sum + week.workoutDays / week.totalDays, 0) / weeks.length;

  const dayBias = {
    Sun: 0.92,
    Mon: 1.06,
    Tue: 1.02,
    Wed: 1.04,
    Thu: 1.03,
    Fri: 0.98,
    Sat: 0.95,
  };

  return CONSISTENCY_DAYS.map((day) => {
    const rawScore = avgConsistency * (0.82 + workoutRatio * 0.28) * dayBias[day];
    const value = Math.max(0, Math.min(100, round(rawScore, 0)));
    return { day, value };
  });
}

function AverageMacroIntakeChart({ weeks }) {
  const [hoveredMacro, setHoveredMacro] = useState(null);

  const nutritionAverages = [
    {
      macro: "Protein",
      value: averageBy(weeks, (w) => w.avgProtein),
      unit: "g",
      pie: true,
    },
    {
      macro: "Carbs",
      value: averageBy(weeks, (w) => w.avgCarbs),
      unit: "g",
      pie: true,
    },
    {
      macro: "Fats",
      value: averageBy(weeks, (w) => w.avgFats),
      unit: "g",
      pie: true,
    },
    {
      macro: "Fiber",
      value: averageBy(weeks, (w) => w.avgFiber ?? w.avgCarbs * 0.14),
      unit: "g",
      pie: true,
    },
    {
      macro: "Sugar",
      value: averageBy(weeks, (w) => w.avgSugar ?? w.avgCarbs * 0.16),
      unit: "g",
      pie: true,
    },
    {
      macro: "Calories",
      value: averageBy(weeks, (w) => w.avgCalories),
      unit: "kcal",
      pie: false,
    },
    {
      macro: "Water Intake",
      value: averageBy(weeks, (w) => w.avgWater ?? 2.6 + w.workoutDays * 0.12, 1),
      unit: "L",
      pie: false,
    },
    {
      macro: "Sodium",
      value: averageBy(weeks, (w) => w.avgSodium ?? w.avgCalories * 0.92),
      unit: "mg",
      pie: false,
    },
  ];

  const pieMacros = nutritionAverages.filter((item) => item.pie);
  const totalMacroGrams = pieMacros.reduce((sum, item) => sum + item.value, 0) || 1;
  const topMacro = pieMacros.reduce((top, item) => (item.value > top.value ? item : top), pieMacros[0]);
  const activeMacro = hoveredMacro ?? topMacro.macro;
  const activeItem = pieMacros.find((item) => item.macro === activeMacro) ?? topMacro;
  const circumference = 2 * Math.PI * 68;
  let runningOffset = 0;
  const formatIntakeValue = (item) => `${item.value.toLocaleString()}${item.unit === "kcal" ? " kcal" : item.unit}`;

  return (
    <section className="rounded-[1.75rem] border border-sky-100/10 bg-stone-950/30 p-5 shadow-xl shadow-black/20">
      <div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-stone-500">Nutrition Tracking</p>
          <h4 className="mt-2 text-xl font-semibold text-sky-50">Average Nutrition Intake</h4>
          <p className="mt-1 text-[11px] text-stone-400">Daily average across selected weekly reports</p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(220px,0.75fr)_1fr] lg:items-center">
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
              <p className="mt-1 text-2xl font-black text-stone-50">{formatIntakeValue(activeItem)}</p>
              <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-500">
                {Math.round((activeItem.value / totalMacroGrams) * 100)}% of grams
              </p>
            </Motion.div>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {nutritionAverages.map((item, index) => {
            const isActive = item.pie && activeMacro === item.macro;
            return (
              <Motion.button
                key={item.macro}
                type="button"
                onMouseEnter={() => setHoveredMacro(item.pie ? item.macro : null)}
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
                    <span className="text-[10px] text-stone-500">Avg daily intake</span>
                  </span>
                </span>
                <span className={`text-sm font-bold ${MACRO_COLORS[item.macro].text}`}>
                  {formatIntakeValue(item)}
                </span>
              </Motion.button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function DayWiseConsistencyChart({ weeks }) {
  const [hovered, setHovered] = useState(null);
  const series = useMemo(() => buildDayWiseConsistency(weeks), [weeks]);
  const barH = 150;
  const labelH = 44;
  const ticks = [0, 20, 40, 60, 80, 100];

  return (
    <section className="journal-scroll max-h-[310px] overflow-y-auto rounded-[1.75rem] border border-sky-100/10 bg-stone-950/30 p-5 shadow-xl shadow-black/20">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-stone-500">Consistency by Day</p>
          <h4 className="mt-2 text-xl font-semibold text-sky-50">Day Wise Consistency</h4>
        </div>
        <span className="flex items-center gap-2 text-xs text-stone-400">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
          Score
        </span>
      </div>

      <div className="mt-5 flex gap-3">
        <div className="relative z-10 w-9 shrink-0 text-right text-[11px] font-semibold text-stone-300" style={{ height: barH, marginBottom: labelH }}>
          {ticks.map((tick) => (
            <span key={tick} className="absolute right-0 rounded bg-stone-950/55 px-0.5" style={{ bottom: `${(tick / 100) * barH - (tick === 0 ? 0 : 7)}px` }}>
              {tick}
            </span>
          ))}
        </div>

        <div className="relative flex-1 overflow-x-auto">
          <div className="relative min-w-[520px]" style={{ height: barH + labelH }}>
            {ticks.map((tick) => (
              <div key={tick} className="absolute left-0 right-0 border-t border-dashed border-white/6" style={{ bottom: labelH + (tick / 100) * barH }} />
            ))}

            <div className="absolute inset-0 flex items-end gap-2.5" style={{ paddingBottom: `${labelH}px` }}>
              {series.map((item, index) => (
                <div
                  key={item.day}
                  className="flex min-w-0 flex-1 flex-col items-center justify-end"
                  style={{ opacity: hovered !== null && hovered !== index ? 0.4 : 1, transition: "opacity 0.18s ease", cursor: "default" }}
                  onMouseEnter={() => setHovered(index)}
                  onMouseLeave={() => setHovered(null)}
                >
                  <span className="mb-1 text-[10px] font-semibold text-emerald-200">{item.value}</span>
                  <Motion.div
                    className="w-full max-w-[42px] rounded-t-xl border border-emerald-200/25 bg-gradient-to-t from-emerald-900/95 to-emerald-300/90"
                    initial={{ height: 0 }}
                    animate={{ height: Math.max(10, Math.round((item.value / 100) * barH)) }}
                    transition={{ duration: 0.42, delay: index * 0.04 }}
                  />
                </div>
              ))}
            </div>

            <div className="mt-0.5 flex items-center text-[10px] text-stone-500">
              {series.map((item) => (
                <span key={`x-${item.day}`} className="flex-1 text-center">
                  {item.day}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function NutritionConsistencyAnalysis() {
  const [selectedYear, setSelectedYear] = useState(INITIAL_YEAR);
  const [selectedMonth, setSelectedMonth] = useState(INITIAL_MONTH);

  const availableMonths = useMemo(() => getAvailableMonthsForYear(selectedYear), [selectedYear]);

  const weeks = useMemo(
    () => sortWeeksChronologically(WEEKLY_GYM_REPORTS.filter((e) => e.year === selectedYear && e.month === selectedMonth)),
    [selectedYear, selectedMonth]
  );

  const displayWeeks = weeks.length ? weeks.slice(0, 4) : sortWeeksChronologically(WEEKLY_GYM_REPORTS.slice(0, 4));

  const avgConsistency = displayWeeks.length
    ? round(displayWeeks.reduce((s, w) => s + w.consistencyScore, 0) / displayWeeks.length, 0)
    : 0;
  const avgWeeklyScore = displayWeeks.length
    ? round(displayWeeks.reduce((s, w) => s + w.weeklyScore, 0) / displayWeeks.length, 0)
    : 0;
  const avgProtein = displayWeeks.length
    ? round(displayWeeks.reduce((s, w) => s + w.avgProtein, 0) / displayWeeks.length, 0)
    : 0;
  const avgCarbs = displayWeeks.length
    ? round(displayWeeks.reduce((s, w) => s + w.avgCarbs, 0) / displayWeeks.length, 0)
    : 0;
  const avgCalories = displayWeeks.length
    ? round(displayWeeks.reduce((s, w) => s + w.avgCalories, 0) / displayWeeks.length, 0)
    : 0;

  const insights = [
    {
      title: "Avg Consistency Score",
      value: `${avgConsistency} / 100`,
      description: `Average consistency score across ${displayWeeks.length} weeks this month. Scores ≥80 indicate excellent adherence.`,
    },
    {
      title: "Avg Weekly Score",
      value: `${avgWeeklyScore} / 100`,
      description: "Combined performance score factoring in training volume, consistency, and nutrition adherence.",
    },
    {
      title: "Avg Protein Intake",
      value: `${avgProtein}g`,
      description: `Average daily protein intake across ${displayWeeks.length} weeks in this month.`,
    },
    {
      title: "Avg Calorie Intake",
      value: `${avgCalories.toLocaleString()} kcal`,
      description: `Average daily calorie intake across ${displayWeeks.length} weeks in this month.`,
    },
    {
      title: "Avg Carbs Intake",
      value: `${avgCarbs}g`,
      description: `Average daily carbohydrate intake across ${displayWeeks.length} weeks in this month.`,
    },
  ];

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2 text-sm text-stone-300">
          <span className="text-stone-400">Year</span>
          <select
            value={selectedYear}
            onChange={(e) => {
              const nextYear = e.target.value;
              setSelectedYear(nextYear);
              const nextMonths = getAvailableMonthsForYear(nextYear);
              const has = nextMonths.some((m) => m.value === selectedMonth);
              setSelectedMonth(has ? selectedMonth : nextMonths[0]?.value ?? MONTH_OPTIONS[0].value);
            }}
            className="bg-transparent text-sky-100 outline-none"
          >
            {YEARS.map((y) => (
              <option key={y} value={y} className="bg-stone-950 text-stone-200">{y}</option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2 text-sm text-stone-300">
          <span className="text-stone-400">Month</span>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-transparent text-sky-100 outline-none"
          >
            {availableMonths.map((m) => (
              <option key={m.value} value={m.value} className="bg-stone-950 text-stone-200">{m.label}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        <div
          className="journal-scroll min-w-0 flex-1 scroll-smooth overflow-y-auto rounded-[2rem] border border-sky-100/10 bg-white/[0.03] shadow-2xl shadow-black/30 backdrop-blur"
          style={{ maxHeight: "calc(100vh - 350px)" }}
        >
          <div className="space-y-6 p-6">
            <AverageMacroIntakeChart weeks={displayWeeks} />
            <DayWiseConsistencyChart weeks={displayWeeks} />
          </div>
        </div>

        <div
          className="journal-scroll flex w-full w-full lg:max-w-[360px] lg:shrink-0 self-start flex-col gap-2 scroll-smooth overflow-y-auto"
          style={{ maxHeight: "calc(100vh - 180px)" }}
        >
          <InsightRail insights={insights} />
        </div>
      </div>
    </section>
  );
}
