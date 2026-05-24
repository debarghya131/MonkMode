import { useEffect, useMemo, useState } from "react";
import { motion as Motion } from "framer-motion";
import littleMonkLogo from "../../../assets/littlemonklogo.webp";
import api from "../../../api/axios";
import useAuth from "../../../hooks/useAuth";

const DAY_ORDER = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const BAR_H = 190;
const LABEL_H = 58;
const CHART_HEADROOM = 18;
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

const NOW = new Date();
const YEARS = Array.from({ length: 4 }, (_, i) => String(NOW.getFullYear() - i));

const DEMO_HABIT_COMPLETION_WEEKLY_DATA = [
  {
    id: "2026-04-13",
    year: "2026",
    month: "04",
    label: "Apr 13 - Apr 19",
    habits: [
      { name: "Morning Walk", completed: 6, total: 7 },
      { name: "Sleep by 11 PM", completed: 4, total: 7 },
      { name: "Read 30 min", completed: 5, total: 7 },
      { name: "Meditate", completed: 4, total: 7 },
      { name: "Deep Work Sprint", completed: 5, total: 7 },
      { name: "Drink 3L Water", completed: 7, total: 7 },
      { name: "Weekend Long Run", completed: 1, total: 2 },
      { name: "Weekend Planning", completed: 1, total: 2 },
    ],
    dailyStats: [
      { day: "Mon", completed: 5, total: 6 },
      { day: "Tue", completed: 5, total: 6 },
      { day: "Wed", completed: 6, total: 6 },
      { day: "Thu", completed: 4, total: 6 },
      { day: "Fri", completed: 3, total: 6 },
      { day: "Sat", completed: 2, total: 7 },
      { day: "Sun", completed: 3, total: 7 },
    ],
  },
  {
    id: "2026-04-06",
    year: "2026",
    month: "04",
    label: "Apr 6 - Apr 12",
    habits: [
      { name: "Morning Walk", completed: 4, total: 7 },
      { name: "Sleep by 11 PM", completed: 2, total: 7 },
      { name: "Read 30 min", completed: 3, total: 7 },
      { name: "Meditate", completed: 2, total: 7 },
      { name: "Deep Work Sprint", completed: 4, total: 7 },
      { name: "Weekend Long Run", completed: 1, total: 2 },
      { name: "Weekend Planning", completed: 1, total: 2 },
      { name: "Take Vitamins", completed: 3, total: 7 },
    ],
    dailyStats: [
      { day: "Mon", completed: 5, total: 6 },
      { day: "Tue", completed: 0, total: 6 },
      { day: "Wed", completed: 5, total: 6 },
      { day: "Thu", completed: 4, total: 6 },
      { day: "Fri", completed: 0, total: 6 },
      { day: "Sat", completed: 2, total: 7 },
      { day: "Sun", completed: 1, total: 7 },
    ],
  },
  {
    id: "2026-03-30",
    year: "2026",
    month: "03",
    label: "Mar 30 - Apr 5",
    habits: [
      { name: "Morning Walk", completed: 7, total: 7 },
      { name: "Sleep by 11 PM", completed: 5, total: 7 },
      { name: "Read 30 min", completed: 6, total: 7 },
      { name: "Meditate", completed: 4, total: 7 },
      { name: "Deep Work Sprint", completed: 6, total: 7 },
      { name: "Drink 3L Water", completed: 7, total: 7 },
      { name: "Weekend Planning", completed: 2, total: 2 },
    ],
    dailyStats: [
      { day: "Mon", completed: 6, total: 6 },
      { day: "Tue", completed: 6, total: 6 },
      { day: "Wed", completed: 6, total: 6 },
      { day: "Thu", completed: 6, total: 6 },
      { day: "Fri", completed: 6, total: 6 },
      { day: "Sat", completed: 3, total: 7 },
      { day: "Sun", completed: 1, total: 7 },
    ],
  },
  {
    id: "2026-02-16",
    year: "2026",
    month: "02",
    label: "Feb 16 - Feb 22",
    habits: [
      { name: "Morning Walk", completed: 5, total: 7 },
      { name: "Sleep by 11 PM", completed: 3, total: 7 },
      { name: "Read 30 min", completed: 4, total: 7 },
      { name: "Meditate", completed: 3, total: 7 },
      { name: "Deep Work Sprint", completed: 4, total: 7 },
      { name: "Drink 3L Water", completed: 6, total: 7 },
      { name: "Stretching", completed: 5, total: 7 },
      { name: "Plan Tomorrow", completed: 4, total: 7 },
    ],
    dailyStats: [
      { day: "Mon", completed: 4, total: 7 },
      { day: "Tue", completed: 5, total: 7 },
      { day: "Wed", completed: 5, total: 7 },
      { day: "Thu", completed: 4, total: 7 },
      { day: "Fri", completed: 3, total: 7 },
      { day: "Sat", completed: 4, total: 7 },
      { day: "Sun", completed: 4, total: 7 },
    ],
  },
  {
    id: "2026-01-19",
    year: "2026",
    month: "01",
    label: "Jan 19 - Jan 25",
    habits: [
      { name: "Morning Walk", completed: 7, total: 7 },
      { name: "Sleep by 11 PM", completed: 6, total: 7 },
      { name: "Read 30 min", completed: 5, total: 7 },
      { name: "Meditate", completed: 6, total: 7 },
      { name: "Deep Work Sprint", completed: 5, total: 7 },
      { name: "Drink 3L Water", completed: 7, total: 7 },
      { name: "No Sugar", completed: 4, total: 7 },
      { name: "Night Journal", completed: 5, total: 7 },
    ],
    dailyStats: [
      { day: "Mon", completed: 6, total: 8 },
      { day: "Tue", completed: 6, total: 8 },
      { day: "Wed", completed: 7, total: 8 },
      { day: "Thu", completed: 6, total: 8 },
      { day: "Fri", completed: 6, total: 8 },
      { day: "Sat", completed: 5, total: 8 },
      { day: "Sun", completed: 4, total: 8 },
    ],
  },
  {
    id: "2025-12-15",
    year: "2025",
    month: "12",
    label: "Dec 15 - Dec 21",
    habits: [
      { name: "Morning Walk", completed: 4, total: 7 },
      { name: "Sleep by 11 PM", completed: 2, total: 7 },
      { name: "Read 30 min", completed: 3, total: 7 },
      { name: "Meditate", completed: 3, total: 7 },
      { name: "Deep Work Sprint", completed: 3, total: 7 },
      { name: "Drink 3L Water", completed: 5, total: 7 },
      { name: "Gratitude Note", completed: 4, total: 7 },
      { name: "Digital Detox", completed: 2, total: 7 },
    ],
    dailyStats: [
      { day: "Mon", completed: 4, total: 8 },
      { day: "Tue", completed: 3, total: 8 },
      { day: "Wed", completed: 4, total: 8 },
      { day: "Thu", completed: 3, total: 8 },
      { day: "Fri", completed: 2, total: 8 },
      { day: "Sat", completed: 4, total: 8 },
      { day: "Sun", completed: 3, total: 8 },
    ],
  },
];

const CURRENT_MONTH = String(NOW.getMonth() + 1).padStart(2, "0");

const round = (value, precision = 1) => Number(value.toFixed(precision));

function toPercent(part, total) {
  if (!total) return 0;
  return round((part / total) * 100);
}

function InsightRail({ insights }) {
  const [selectedInsight, setSelectedInsight] = useState(null);

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
              alt="Little Monk AI Assistant"
              className="relative z-10 h-20 w-20 object-contain drop-shadow-[0_10px_18px_rgba(245,158,11,0.16)]"
              whileHover={{ scale: 1.08, rotate: -3 }}
              transition={{ type: "spring", stiffness: 260, damping: 14 }}
            />
          </Motion.div>
          <div>
            <h3 className="text-label-md">Little Monk's Analysis</h3>
            <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.14em] text-amber-300/70">
              AI Assistant
            </p>
          </div>
        </div>
      </div>

      <div className="journal-scroll space-y-3 px-4 pb-4 pr-3 sm:px-5 sm:pb-5 sm:pr-4">
        {insights.map((insight) => {
          const isSelected = selectedInsight === insight.title;
          return (
            <Motion.div
              key={insight.title}
              layout
              className={`rounded-xl border p-3 text-sm transition-colors ${
                isSelected
                  ? "border-sky-400/30 bg-sky-500/8"
                  : "border-sky-100/10 bg-stone-950/45 hover:border-sky-300/20"
              }`}
            >
              <div className="grid items-start gap-3 sm:grid-cols-[1fr_auto]">
                <div className="min-w-0">
                  <span className="text-xs font-semibold text-sky-200">{insight.title}</span>
                  <p className="text-sm font-semibold text-stone-200">{insight.value}</p>
                  {isSelected && (
                    <Motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-1.5 text-xs leading-relaxed text-stone-400"
                    >
                      {insight.description}
                    </Motion.p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedInsight(isSelected ? null : insight.title)}
                  className={`w-full rounded-full border px-3 py-1 text-xs font-semibold transition-colors sm:w-fit ${
                    isSelected
                      ? "border-sky-400/40 bg-sky-400/15 text-sky-100"
                      : "border-sky-400/20 text-sky-200 hover:border-sky-300/45 hover:bg-sky-400/10"
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

function DayCompletionGraph({ series }) {
  const [hovered, setHovered] = useState(null);
  const drawableBarH = BAR_H - CHART_HEADROOM;
  const ticks = [0, 20, 40, 60, 80, 100];

  const yLabelBottom = (mark) => {
    if (mark === 100) return drawableBarH - 2;
    if (mark === 0) return 0;
    return (mark / 100) * drawableBarH - 7;
  };

  return (
    <section className="rounded-[1.4rem] border border-sky-100/10 bg-stone-950/30 p-4 shadow-xl shadow-black/20 sm:rounded-[1.75rem] sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-stone-500">Monthly Overview</p>
          <h4 className="mt-2 text-xl font-semibold text-sky-50">Completion & Miss Rate by Day</h4>
        </div>
        <div className="flex items-center gap-3 text-xs text-stone-400">
          <span className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
            Completion rate
          </span>
          <span className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-300" />
            Miss rate
          </span>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto pb-1">
        <div className="flex min-w-[620px] gap-3 pr-1">
          <div
            className="relative z-10 w-9 shrink-0 text-right text-[11px] font-semibold text-stone-300"
            style={{ height: BAR_H, marginBottom: LABEL_H }}
          >
            {ticks.map((tick) => (
              <span
                key={tick}
                className="absolute right-0 rounded bg-stone-950/55 px-0.5"
                style={{ bottom: `${yLabelBottom(tick)}px` }}
              >
                {tick}
              </span>
            ))}
          </div>

          <div className="relative flex-1">
            <div className="relative" style={{ height: BAR_H + LABEL_H }}>
              {ticks.map((tick) => (
                <div
                  key={tick}
                  className="absolute left-0 right-0 border-t border-dashed border-white/6"
                  style={{ bottom: LABEL_H + (tick / 100) * drawableBarH }}
                />
              ))}

              <div className="absolute inset-0 flex items-end gap-2" style={{ paddingBottom: `${LABEL_H}px` }}>
                {series.map((item, index) => (
                  <div
                    key={item.label}
                    className="flex min-w-0 flex-1 cursor-default items-end justify-center gap-1.5"
                    style={{
                      opacity: hovered !== null && hovered !== index ? 0.4 : 1,
                      transition: "opacity 0.18s ease",
                    }}
                    onMouseEnter={() => setHovered(index)}
                    onMouseLeave={() => setHovered(null)}
                  >
                    <div className="flex w-full max-w-[22px] flex-col items-center justify-end">
                      <span className="mb-1 text-[10px] font-semibold text-emerald-200">{item.completionRate}%</span>
                      <Motion.div
                        className="w-full rounded-t-lg border border-emerald-200/25 bg-gradient-to-t from-emerald-900/95 to-emerald-300/90"
                        initial={{ height: 0 }}
                        animate={{ height: Math.max(10, Math.round((item.completionRate / 100) * drawableBarH)) }}
                        transition={{ duration: 0.4, delay: index * 0.04 }}
                      />
                    </div>
                    <div className="flex w-full max-w-[22px] flex-col items-center justify-end">
                      <span className="mb-1 text-[10px] font-semibold text-rose-200">{item.missedRate}%</span>
                      <Motion.div
                        className="w-full rounded-t-lg border border-rose-200/25 bg-gradient-to-t from-rose-900/95 to-rose-300/90"
                        initial={{ height: 0 }}
                        animate={{ height: Math.max(10, Math.round((item.missedRate / 100) * drawableBarH)) }}
                        transition={{ duration: 0.4, delay: index * 0.04 + 0.05 }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-1 flex items-center text-[10px] text-stone-500">
              {series.map((item) => (
                <span key={`x-${item.label}`} className="flex-1 text-center">
                  {item.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function HabitWiseRateGraph({ series }) {
  const ticks = [0, 20, 40, 60, 80, 100];

  return (
    <section className="rounded-[1.4rem] border border-sky-100/10 bg-stone-950/30 p-4 shadow-xl shadow-black/20 sm:rounded-[1.75rem] sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-stone-500">Active Habits</p>
          <h4 className="mt-2 text-xl font-semibold text-sky-50">Habit Wise Miss Rate & Completion Rate</h4>
        </div>
        <div className="flex items-center gap-3 text-xs text-stone-400">
          <span className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
            Completion
          </span>
          <span className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-300" />
            Miss
          </span>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto">
        <div className="min-w-[700px]">
          <div className="ml-36 grid grid-cols-6 text-[10px] font-semibold text-stone-500">
            {ticks.map((tick) => (
              <span key={tick} className="text-right">
                {tick}
              </span>
            ))}
          </div>

          <div className="journal-scroll mt-2 space-y-4 overflow-y-auto pr-3 lg:max-h-[48vh]">
            {series.map((habit, index) => (
              <div key={habit.name} className="grid items-center gap-3 sm:grid-cols-[9rem_1fr]">
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-stone-200">{habit.name}</p>
                  <p className="mt-0.5 text-[10px] text-stone-500">
                    {habit.completed}/{habit.total} check-ins
                  </p>
                </div>
                <div className="relative space-y-1.5 border-l border-white/8 pl-3">
                  <div className="absolute bottom-0 top-0 grid w-[calc(100%-0.75rem)] grid-cols-5">
                    {[20, 40, 60, 80, 100].map((tick) => (
                      <span key={tick} className="border-r border-dashed border-white/6" />
                    ))}
                  </div>
                  <div className="relative flex items-center gap-2">
                    <Motion.div
                      className="h-3 rounded-full border border-emerald-200/25 bg-gradient-to-r from-emerald-900/95 to-emerald-300/90"
                      initial={{ width: 0 }}
                      animate={{ width: `${habit.completionRate}%` }}
                      transition={{ duration: 0.45, delay: index * 0.04 }}
                    />
                    <span className="w-9 text-[10px] font-semibold text-emerald-200">{habit.completionRate}%</span>
                  </div>
                  <div className="relative flex items-center gap-2">
                    <Motion.div
                      className="h-3 rounded-full border border-rose-200/25 bg-gradient-to-r from-rose-900/95 to-rose-300/90"
                      initial={{ width: 0 }}
                      animate={{ width: `${habit.missedRate}%` }}
                      transition={{ duration: 0.45, delay: index * 0.04 + 0.05 }}
                    />
                    <span className="w-9 text-[10px] font-semibold text-rose-200">{habit.missedRate}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function ComplationMissAnalysis() {
  const { isDemoMode } = useAuth();
  const [selectedYear,  setSelectedYear]  = useState(YEARS[0]);
  const [selectedMonth, setSelectedMonth] = useState(isDemoMode ? "04" : CURRENT_MONTH);
  const [apiData,  setApiData]  = useState(null);
  const [loading,  setLoading]  = useState(false);

  useEffect(() => {
    if (isDemoMode) {
      setApiData(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const loadAnalysis = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/habits/analysis?year=${selectedYear}&month=${parseInt(selectedMonth, 10)}`);
        if (!cancelled) setApiData(res.data);
      } catch {
        if (!cancelled) setApiData(null);
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
    window.addEventListener("monkmode:habits-updated", refreshAnalysis);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", refreshAnalysis);
      window.removeEventListener("storage", refreshAnalysis);
      window.removeEventListener("monkmode:habits-updated", refreshAnalysis);
    };
  }, [isDemoMode, selectedYear, selectedMonth]);

  const { daySeries, habitSeries } = useMemo(() => {
    let rawDays, rawHabits;

    if (isDemoMode) {
      const demo = DEMO_HABIT_COMPLETION_WEEKLY_DATA.find(e => e.year === selectedYear && e.month === selectedMonth)
        ?? DEMO_HABIT_COMPLETION_WEEKLY_DATA[0];
      const dataMap = new Map(DAY_ORDER.map(day => [day, { label: day, completed: 0, total: 0 }]));
      [demo].forEach(entry => entry.dailyStats.forEach(day => {
        const cur = dataMap.get(day.day) ?? { label: day.day, completed: 0, total: 0 };
        dataMap.set(day.day, { ...cur, completed: cur.completed + day.completed, total: cur.total + day.total });
      }));
      rawDays = DAY_ORDER.map(day => dataMap.get(day));
      rawHabits = demo.habits.map(h => ({ name: h.name, completed: h.completed, total: h.total }));
    } else if (apiData) {
      const dataMap = new Map(DAY_ORDER.map(day => [day, { label: day, completed: 0, total: 0 }]));
      for (const d of apiData.days) {
        const cur = dataMap.get(d.weekday) ?? { label: d.weekday, completed: 0, total: 0 };
        dataMap.set(d.weekday, { ...cur, completed: cur.completed + d.completed, total: cur.total + d.total });
      }
      rawDays = DAY_ORDER.map(day => dataMap.get(day)).filter(Boolean);
      rawHabits = apiData.habits;
    } else {
      return { daySeries: [], habitSeries: [] };
    }

    const daySeries = rawDays.map(item => {
      const missed = Math.max(0, item.total - item.completed);
      return { ...item, missed, completionRate: toPercent(item.completed, item.total), missedRate: toPercent(missed, item.total) };
    });
    const habitSeries = rawHabits.map(h => {
      const missed = Math.max(0, h.total - h.completed);
      return { ...h, missed, completionRate: toPercent(h.completed, h.total), missedRate: toPercent(missed, h.total) };
    });
    return { daySeries, habitSeries };
  }, [isDemoMode, apiData, selectedYear, selectedMonth]);

  const totals = habitSeries.reduce(
    (acc, h) => ({ total: acc.total + h.total, completed: acc.completed + h.completed, missed: acc.missed + h.missed }),
    { total: 0, completed: 0, missed: 0 }
  );
  const completionRate = toPercent(totals.completed, totals.total);
  const missedRate     = toPercent(totals.missed,    totals.total);
  const highestCompletionHabit = habitSeries.length ? habitSeries.reduce((b, h) => h.completionRate > b.completionRate ? h : b) : null;
  const mostMissedHabit        = habitSeries.length ? habitSeries.reduce((b, h) => h.missedRate     > b.missedRate     ? h : b) : null;

  const isCurrentMonth = selectedYear === String(NOW.getFullYear()) && selectedMonth === CURRENT_MONTH;

  const insights = [
    { title: "Total Active Habit On This Month", value: habitSeries.length ? `${habitSeries.length} habits` : "No data", description: `${habitSeries.length} active habits generated ${totals.total} scheduled check-ins this month.` },
    { title: "Completion Rate On This Month",    value: totals.total ? `${completionRate}%` : "No data", description: `${totals.completed} of ${totals.total} habit check-ins were completed.` },
    { title: "Miss Rate On This Month",          value: totals.total ? `${missedRate}%`     : "No data", description: `${totals.missed} of ${totals.total} habit check-ins were missed.` },
    ...(highestCompletionHabit ? [{ title: "Highest Completion Rate Habit", value: `${highestCompletionHabit.name} (${highestCompletionHabit.completionRate}%)`, description: `${highestCompletionHabit.completed} of ${highestCompletionHabit.total} check-ins completed — your most consistent habit this month.` }] : []),
    ...(mostMissedHabit        ? [{ title: "Most Missed Rate Habit",        value: `${mostMissedHabit.name} (${mostMissedHabit.missedRate}%)`,                 description: `${mostMissedHabit.missed} of ${mostMissedHabit.total} check-ins missed — needs the most attention this month.` }] : []),
  ];

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        {isCurrentMonth && (
          <span className="flex w-full items-center justify-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-300 sm:w-auto">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            Live · updates daily
          </span>
        )}
        <label className="flex w-full items-center gap-2 rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2 text-sm text-stone-300 sm:w-auto">
          <span className="text-stone-400">Year</span>
          <select
            value={selectedYear}
            onChange={(event) => {
              const newYear = event.target.value;
              setSelectedYear(newYear);
              if (newYear === String(NOW.getFullYear()) && parseInt(selectedMonth) > NOW.getMonth() + 1) {
                setSelectedMonth(CURRENT_MONTH);
              }
            }}
            className="bg-transparent text-sky-100 outline-none"
          >
            {YEARS.map(year => (
              <option key={year} value={year} className="bg-stone-950 text-stone-200">{year}</option>
            ))}
          </select>
        </label>

        <label className="flex w-full items-center gap-2 rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2 text-sm text-stone-300 sm:w-auto">
          <span className="text-stone-400">Month</span>
          <select
            value={selectedMonth}
            onChange={(event) => setSelectedMonth(event.target.value)}
            className="bg-transparent text-sky-100 outline-none"
          >
            {(selectedYear === String(NOW.getFullYear())
              ? MONTH_OPTIONS.filter(m => parseInt(m.value) <= NOW.getMonth() + 1)
              : MONTH_OPTIONS
            ).map(month => (
              <option key={month.value} value={month.value} className="bg-stone-950 text-stone-200">{month.label}</option>
            ))}
          </select>
        </label>
      </div>

      {loading ? (
        <div className="space-y-3">
          <div className="h-48 animate-pulse rounded-2xl border border-sky-100/10 bg-white/[0.03]" />
          <div className="h-36 animate-pulse rounded-2xl border border-sky-100/10 bg-white/[0.03]" />
        </div>
      ) : (
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-5">
        <div
          className="journal-scroll min-w-0 flex-1 scroll-smooth overflow-y-auto rounded-[1.6rem] border border-sky-100/10 bg-white/[0.03] shadow-2xl shadow-black/30 backdrop-blur sm:rounded-[2rem] lg:max-h-[calc(100vh-350px)]"
        >
          <div className="space-y-4 p-4 sm:space-y-6 sm:p-6">
            <DayCompletionGraph series={daySeries} />
            <HabitWiseRateGraph series={habitSeries} />
          </div>
        </div>

        <div
          className="journal-scroll self-start flex w-full flex-col gap-2 scroll-smooth overflow-y-auto lg:max-h-[calc(100vh-180px)] lg:max-w-[380px] lg:shrink-0"
        >
          <InsightRail insights={insights} />
        </div>
      </div>
      )}
    </section>
  );
}
