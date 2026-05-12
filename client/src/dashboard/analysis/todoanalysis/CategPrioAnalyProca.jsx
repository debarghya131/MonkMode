import { useEffect, useMemo, useState } from "react";
import { motion as Motion } from "framer-motion";
import littleMonkLogo from "../../../assets/littlemonklogo.png";
import api from "../../../api/axios";
import useAuth from "../../../hooks/useAuth";

const DAY_ORDER = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const PRIORITY_ORDER = ["High", "Medium", "Low"];
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

const DEMO_TODO_CATEGORY_MONTHLY_DATA = [
  {
    year: "2026",
    month: "04",
    categories: [
      { name: "Study", total: 12, completed: 10, late: 2, important: true },
      { name: "Work", total: 13, completed: 11, late: 1, important: true },
      { name: "Fitness", total: 9, completed: 6, late: 3, important: false },
      { name: "Health", total: 8, completed: 5, late: 2, important: false },
      { name: "Personal", total: 6, completed: 4, late: 2, important: false },
      { name: "Bill & Payment", total: 5, completed: 3, late: 1, important: true },
      { name: "Shopping", total: 4, completed: 2, late: 1, important: false },
    ],
    priorities: [
      { name: "High", total: 18, completed: 14 },
      { name: "Medium", total: 22, completed: 15 },
      { name: "Low", total: 17, completed: 12 },
    ],
    lateByDay: [
      { day: "Sun", count: 2 },
      { day: "Mon", count: 1 },
      { day: "Tue", count: 2 },
      { day: "Wed", count: 1 },
      { day: "Thu", count: 3 },
      { day: "Fri", count: 2 },
      { day: "Sat", count: 3 },
    ],
  },
  {
    year: "2026",
    month: "03",
    categories: [
      { name: "Study", total: 11, completed: 9, late: 1, important: true },
      { name: "Work", total: 12, completed: 10, late: 1, important: true },
      { name: "Fitness", total: 8, completed: 6, late: 2, important: false },
      { name: "Health", total: 7, completed: 5, late: 1, important: false },
      { name: "Personal", total: 6, completed: 4, late: 1, important: false },
      { name: "Bill & Payment", total: 4, completed: 3, late: 1, important: true },
      { name: "Shopping", total: 3, completed: 2, late: 0, important: false },
    ],
    priorities: [
      { name: "High", total: 17, completed: 14 },
      { name: "Medium", total: 19, completed: 15 },
      { name: "Low", total: 15, completed: 10 },
    ],
    lateByDay: [
      { day: "Sun", count: 1 },
      { day: "Mon", count: 1 },
      { day: "Tue", count: 1 },
      { day: "Wed", count: 2 },
      { day: "Thu", count: 1 },
      { day: "Fri", count: 1 },
      { day: "Sat", count: 1 },
    ],
  },
  {
    year: "2026",
    month: "02",
    categories: [
      { name: "Study", total: 10, completed: 6, late: 3, important: true },
      { name: "Work", total: 10, completed: 7, late: 2, important: true },
      { name: "Fitness", total: 7, completed: 4, late: 2, important: false },
      { name: "Health", total: 7, completed: 4, late: 2, important: false },
      { name: "Personal", total: 5, completed: 2, late: 2, important: false },
      { name: "Bill & Payment", total: 4, completed: 2, late: 1, important: true },
      { name: "Shopping", total: 3, completed: 1, late: 1, important: false },
    ],
    priorities: [
      { name: "High", total: 15, completed: 9 },
      { name: "Medium", total: 17, completed: 10 },
      { name: "Low", total: 14, completed: 7 },
    ],
    lateByDay: [
      { day: "Sun", count: 3 },
      { day: "Mon", count: 2 },
      { day: "Tue", count: 2 },
      { day: "Wed", count: 3 },
      { day: "Thu", count: 2 },
      { day: "Fri", count: 3 },
      { day: "Sat", count: 2 },
    ],
  },
  {
    year: "2025",
    month: "12",
    categories: [
      { name: "Study", total: 9, completed: 5, late: 3, important: true },
      { name: "Work", total: 10, completed: 6, late: 2, important: true },
      { name: "Fitness", total: 6, completed: 3, late: 2, important: false },
      { name: "Health", total: 6, completed: 3, late: 2, important: false },
      { name: "Personal", total: 5, completed: 2, late: 2, important: false },
      { name: "Bill & Payment", total: 4, completed: 2, late: 1, important: true },
      { name: "Shopping", total: 3, completed: 1, late: 1, important: false },
    ],
    priorities: [
      { name: "High", total: 14, completed: 8 },
      { name: "Medium", total: 16, completed: 9 },
      { name: "Low", total: 13, completed: 5 },
    ],
    lateByDay: [
      { day: "Sun", count: 2 },
      { day: "Mon", count: 3 },
      { day: "Tue", count: 2 },
      { day: "Wed", count: 2 },
      { day: "Thu", count: 3 },
      { day: "Fri", count: 2 },
      { day: "Sat", count: 2 },
    ],
  },
];

const NOW = new Date();
const YEARS = Array.from({ length: 4 }, (_, i) => String(NOW.getFullYear() - i));

const BAR_H = 190;
const LABEL_H = 62;
const CHART_HEADROOM = 18;

const round = (value, precision = 1) => Number(value.toFixed(precision));

function toPercent(part, total) {
  if (!total) return 0;
  return round((part / total) * 100);
}

function getCountScale(maxValue) {
  const yMax = Math.max(6, maxValue);
  const step = yMax <= 8 ? 1 : yMax <= 16 ? 2 : 4;
  const ticks = [];
  for (let value = 0; value <= yMax; value += step) ticks.push(value);
  if (ticks[ticks.length - 1] !== yMax) ticks.push(yMax);
  return { yMax, ticks };
}

function InsightRail({ insights }) {
  const [selectedInsight, setSelectedInsight] = useState(null);

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

      <div className="journal-scroll space-y-3 px-5 pb-5 pr-4">
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
              <div className="grid grid-cols-[1fr_auto] items-start gap-3">
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
                  className={`w-fit rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
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

function DualBarCountGraph({ title, subtitle, series, legends, theme, note }) {
  const [hovered, setHovered] = useState(null);
  const maxValue = Math.max(...series.map((item) => Math.max(item.valueA, item.valueB)), 0);
  const { yMax, ticks } = getCountScale(maxValue);
  const drawableBarH = BAR_H - CHART_HEADROOM;

  const yLabelBottom = (mark) => {
    if (mark === yMax) return drawableBarH - 2;
    if (mark === 0) return 0;
    return (mark / yMax) * drawableBarH - 7;
  };

  return (
    <section className="overflow-hidden rounded-[1.75rem] border border-sky-100/10 bg-stone-950/30 p-5 shadow-xl shadow-black/20">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-stone-500">{subtitle}</p>
          <h4 className="mt-2 text-xl font-semibold text-sky-50">{title}</h4>
          {note ? <p className="mt-1 text-[11px] text-stone-400">{note}</p> : null}
        </div>
        <div className="flex items-center gap-3 text-xs text-stone-400">
          <span className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${theme.aDot}`} />
            {legends.a}
          </span>
          <span className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${theme.bDot}`} />
            {legends.b}
          </span>
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        <div
          className="relative z-10 shrink-0 w-9 text-right text-[11px] font-semibold text-stone-300"
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

        <div className="relative min-w-0 flex-1 overflow-x-auto">
          <div style={{ minWidth: `${Math.max(760, series.length * 140)}px` }}>
            <div className="relative" style={{ height: BAR_H + LABEL_H }}>
              {ticks.map((tick) => (
                <div
                  key={tick}
                  className="absolute left-0 right-0 border-t border-dashed border-white/6"
                  style={{ bottom: LABEL_H + (tick / yMax) * drawableBarH }}
                />
              ))}

              <div className="absolute inset-0 flex items-end gap-2.5" style={{ paddingBottom: `${LABEL_H}px` }}>
                {series.map((item, index) => (
                  <div
                    key={item.label}
                    className="flex min-w-0 flex-1 items-end justify-center gap-2"
                    style={{ opacity: hovered !== null && hovered !== index ? 0.4 : 1, transition: "opacity 0.18s ease", cursor: "default" }}
                    onMouseEnter={() => setHovered(index)}
                    onMouseLeave={() => setHovered(null)}
                  >
                    <div className="flex w-full max-w-[28px] flex-col items-center justify-end">
                      <span className={`mb-1 text-[10px] font-semibold ${theme.aValue}`}>{item.valueA}</span>
                      <Motion.div
                        className={`w-full rounded-t-lg border ${theme.aBorder} ${theme.aFill}`}
                        initial={{ height: 0 }}
                        animate={{ height: Math.max(10, Math.round((item.valueA / yMax) * drawableBarH)) }}
                        transition={{ duration: 0.42, delay: index * 0.05 }}
                      />
                    </div>
                    <div className="flex w-full max-w-[28px] flex-col items-center justify-end">
                      <span className={`mb-1 text-[10px] font-semibold ${theme.bValue}`}>{item.valueB}</span>
                      <Motion.div
                        className={`w-full rounded-t-lg border ${theme.bBorder} ${theme.bFill}`}
                        initial={{ height: 0 }}
                        animate={{ height: Math.max(10, Math.round((item.valueB / yMax) * drawableBarH)) }}
                        transition={{ duration: 0.42, delay: index * 0.05 + 0.05 }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-1 flex items-center text-[10px] text-stone-500">
              {series.map((item) => (
                <span key={`x-${item.label}`} className="flex-1 px-1 text-center">
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

function SingleBarCountGraph({ title, subtitle, series, colorTheme, note }) {
  const [hovered, setHovered] = useState(null);
  const maxValue = Math.max(...series.map((item) => item.value), 0);
  const { yMax, ticks } = getCountScale(maxValue);
  const drawableBarH = BAR_H - CHART_HEADROOM;

  const yLabelBottom = (mark) => {
    if (mark === yMax) return drawableBarH - 2;
    if (mark === 0) return 0;
    return (mark / yMax) * drawableBarH - 7;
  };

  return (
    <section className="overflow-hidden rounded-[1.75rem] border border-sky-100/10 bg-stone-950/30 p-5 shadow-xl shadow-black/20">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-stone-500">{subtitle}</p>
          <h4 className="mt-2 text-xl font-semibold text-sky-50">{title}</h4>
          {note ? <p className="mt-1 text-[11px] text-stone-400">{note}</p> : null}
        </div>
        <span className="flex items-center gap-2 text-xs text-stone-400">
          <span className={`h-2.5 w-2.5 rounded-full ${colorTheme.dot}`} />
          Late submitted tasks
        </span>
      </div>

      <div className="mt-6 flex gap-3">
        <div
          className="relative z-10 shrink-0 w-9 text-right text-[11px] font-semibold text-stone-300"
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

        <div className="relative min-w-0 flex-1 overflow-x-auto">
          <div style={{ minWidth: `${Math.max(760, series.length * 120)}px` }}>
            <div className="relative" style={{ height: BAR_H + LABEL_H }}>
              {ticks.map((tick) => (
                <div
                  key={tick}
                  className="absolute left-0 right-0 border-t border-dashed border-white/6"
                  style={{ bottom: LABEL_H + (tick / yMax) * drawableBarH }}
                />
              ))}

              <div className="absolute inset-0 flex items-end gap-2.5" style={{ paddingBottom: `${LABEL_H}px` }}>
                {series.map((item, index) => (
                  <div
                    key={item.label}
                    className="flex min-w-0 flex-1 flex-col items-center justify-end"
                    style={{ opacity: hovered !== null && hovered !== index ? 0.4 : 1, transition: "opacity 0.18s ease", cursor: "default" }}
                    onMouseEnter={() => setHovered(index)}
                    onMouseLeave={() => setHovered(null)}
                  >
                    <span className={`mb-1 text-[10px] font-semibold ${colorTheme.value}`}>{item.value}</span>
                    <Motion.div
                      className={`w-full max-w-[42px] rounded-t-xl border ${colorTheme.border} ${colorTheme.fill}`}
                      initial={{ height: 0 }}
                      animate={{ height: Math.max(10, Math.round((item.value / yMax) * drawableBarH)) }}
                      transition={{ duration: 0.4, delay: index * 0.04 }}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-1 flex items-center text-[10px] text-stone-500">
              {series.map((item) => (
                <span key={`x-${item.label}`} className="flex-1 px-1 text-center">
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

export default function CategPrioAnalyProca() {
  const { isDemoMode } = useAuth();
  const [selectedYear,  setSelectedYear]  = useState(YEARS[0]);
  const [selectedMonth, setSelectedMonth] = useState(isDemoMode ? "04" : String(NOW.getMonth() + 1).padStart(2, "0"));
  const [apiData,  setApiData]  = useState(null);
  const [loading,  setLoading]  = useState(false);

  useEffect(() => {
    if (isDemoMode) { setApiData(null); return; }
    let cancelled = false;
    setLoading(true);
    api.get(`/todos/analysis?year=${selectedYear}&month=${parseInt(selectedMonth, 10)}`)
      .then(res  => { if (!cancelled) setApiData(res.data); })
      .catch(()  => { if (!cancelled) setApiData(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [isDemoMode, selectedYear, selectedMonth]);

  const { categoriesWithRates, prioritiesRaw, lateByDay } = useMemo(() => {
    let categories, priorities, lateByDayArr;

    if (isDemoMode) {
      const demo = DEMO_TODO_CATEGORY_MONTHLY_DATA.find(e => e.year === selectedYear && e.month === selectedMonth)
        ?? DEMO_TODO_CATEGORY_MONTHLY_DATA[0];
      categories   = demo.categories.map(c => ({ ...c, lateCompleted: c.late }));
      priorities   = demo.priorities;
      lateByDayArr = demo.lateByDay;
    } else if (apiData) {
      categories   = apiData.categories.map(c => ({ ...c, lateCompleted: c.lateCompleted ?? 0 }));
      priorities   = apiData.priorities;
      // build lateByDay from days array
      const byDay = {};
      for (const d of apiData.days) {
        if (!byDay[d.weekday]) byDay[d.weekday] = 0;
        byDay[d.weekday] += d.lateCompleted ?? 0;
      }
      lateByDayArr = DAY_ORDER.map(day => ({ day, count: byDay[day] ?? 0 }));
    } else {
      return { categoriesWithRates: [], prioritiesRaw: [], lateByDay: [] };
    }

    const categoriesWithRates = categories.map(item => {
      const missed = Math.max(0, item.total - item.completed);
      return { ...item, missed, completionRate: toPercent(item.completed, item.total), missRate: toPercent(missed, item.total) };
    });

    return { categoriesWithRates, prioritiesRaw: priorities, lateByDay: lateByDayArr };
  }, [isDemoMode, apiData, selectedYear, selectedMonth]);

  const categorySeries = categoriesWithRates.map(item => ({
    label: item.important ? `${item.name} ★` : item.name,
    valueA: item.completed,
    valueB: item.missed,
  }));

  const prioritySeries = PRIORITY_ORDER.map(priority => {
    const entry    = prioritiesRaw.find(p => p.name === priority);
    const total    = entry?.total    ?? 0;
    const completed = entry?.completed ?? 0;
    const missed   = Math.max(0, total - completed);
    return { label: priority, valueA: completed, valueB: missed };
  });

  const procrastinationCategorySeries = categoriesWithRates.map(item => ({
    label: item.name,
    value: item.lateCompleted ?? item.late ?? 0,
  }));

  const dayLateMap = new Map((lateByDay ?? []).map(item => [item.day, item.count]));
  const procrastinationDaySeries = DAY_ORDER.map(day => ({ label: day, value: dayLateMap.get(day) ?? 0 }));

  const totals = categoriesWithRates.reduce(
    (acc, item) => ({ totalTasks: acc.totalTasks + item.total, lateTasks: acc.lateTasks + (item.lateCompleted ?? item.late ?? 0) }),
    { totalTasks: 0, lateTasks: 0 }
  );

  const strongCategory   = categoriesWithRates.length ? categoriesWithRates.reduce((b, c) => c.completionRate > b.completionRate ? c : b) : null;
  const weakCategory     = categoriesWithRates.length ? categoriesWithRates.reduce((b, c) => c.missRate     > b.missRate     ? c : b) : null;
  const lateRate         = toPercent(totals.lateTasks, totals.totalTasks);
  const maxDayLate       = Math.max(0, ...procrastinationDaySeries.map(d => d.value));
  const mostProcrastinateDays = maxDayLate > 0 ? procrastinationDaySeries.filter(d => d.value === maxDayLate) : [];
  const maxCatLate       = Math.max(0, ...procrastinationCategorySeries.map(c => c.value));
  const mostProcrastinateCategories = maxCatLate > 0 ? procrastinationCategorySeries.filter(c => c.value === maxCatLate) : [];

  const isCurrentMonth = selectedYear === String(NOW.getFullYear()) && selectedMonth === String(NOW.getMonth() + 1).padStart(2, "0");

  const insights = [
    { title: "Strong Category",           value: strongCategory  ? `${strongCategory.name} (${strongCategory.completionRate}% completion)` : "No data", description: strongCategory  ? `${strongCategory.completed}/${strongCategory.total} tasks completed in this category.` : "" },
    { title: "Weak Category",             value: weakCategory    ? `${weakCategory.name} (${weakCategory.missRate}% miss rate)`             : "No data", description: weakCategory    ? `${weakCategory.missed}/${weakCategory.total} tasks were missed in this category.`     : "" },
    { title: "No. of Late Completion",    value: `${totals.lateTasks} (${lateRate}% rate)`, description: `${totals.lateTasks} late completed tasks out of ${totals.totalTasks} total tasks.` },
    { title: "Most Procrastinate Day",    value: mostProcrastinateDays.length    ? `${mostProcrastinateDays.map(d => d.label).join(", ")} (${maxDayLate} late)`    : "No late completions", description: mostProcrastinateDays.length    ? `${mostProcrastinateDays.map(d => d.label).join(" and ")} had the highest late submissions.`    : "" },
    { title: "Most Procrastinate Category", value: mostProcrastinateCategories.length ? `${mostProcrastinateCategories.map(c => c.label).join(", ")} (${maxCatLate} late)` : "No late completions", description: mostProcrastinateCategories.length ? `${mostProcrastinateCategories.map(c => c.label).join(" and ")} had the most late completions.` : "" },
  ];

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        {isCurrentMonth && (
          <span className="flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-300">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            Live · updates daily
          </span>
        )}
        <label className="flex items-center gap-2 rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2 text-sm text-stone-300">
          <span className="text-stone-400">Year</span>
          <select
            value={selectedYear}
            onChange={(event) => {
              const newYear = event.target.value;
              setSelectedYear(newYear);
              if (newYear === String(NOW.getFullYear()) && parseInt(selectedMonth) > NOW.getMonth() + 1) {
                setSelectedMonth(String(NOW.getMonth() + 1).padStart(2, "0"));
              }
            }}
            className="bg-transparent text-sky-100 outline-none"
          >
            {YEARS.map((year) => (
              <option key={year} value={year} className="bg-stone-950 text-stone-200">{year}</option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2 text-sm text-stone-300">
          <span className="text-stone-400">Month</span>
          <select
            value={selectedMonth}
            onChange={(event) => setSelectedMonth(event.target.value)}
            className="bg-transparent text-sky-100 outline-none"
          >
            {(selectedYear === String(NOW.getFullYear())
              ? MONTH_OPTIONS.filter(m => parseInt(m.value) <= NOW.getMonth() + 1)
              : MONTH_OPTIONS
            ).map((month) => (
              <option key={month.value} value={month.value} className="bg-stone-950 text-stone-200">{month.label}</option>
            ))}
          </select>
        </label>
      </div>

      {loading && (
        <div className="space-y-3">
          <div className="h-48 animate-pulse rounded-2xl border border-sky-100/10 bg-white/[0.03]" />
          <div className="h-36 animate-pulse rounded-2xl border border-sky-100/10 bg-white/[0.03]" />
        </div>
      )}
      {!loading && (

      <div className="flex flex-col gap-5 xl:flex-row xl:items-start">
        <div className="journal-scroll min-w-0 flex-1 scroll-smooth overflow-y-auto rounded-[2rem] border border-sky-100/10 bg-white/[0.03] shadow-2xl shadow-black/30 backdrop-blur xl:max-h-[calc(100vh-350px)]">
          <div className="space-y-6 p-6">
            <DualBarCountGraph
              title="Category Wise Analysis (Complete & Miss)"
              subtitle="Category"
              series={categorySeries}
              legends={{ a: "Completed", b: "Missed" }}
              note="Categories marked with ★ are important categories."
              theme={{
                aDot: "bg-emerald-300",
                bDot: "bg-rose-300",
                aFill: "bg-gradient-to-t from-emerald-900/95 to-emerald-300/90",
                bFill: "bg-gradient-to-t from-rose-900/95 to-rose-300/90",
                aBorder: "border-emerald-200/25",
                bBorder: "border-rose-200/25",
                aValue: "text-emerald-200",
                bValue: "text-rose-200",
              }}
            />

            <DualBarCountGraph
              title="Priority Wise Analysis"
              subtitle="Priority"
              series={prioritySeries}
              legends={{ a: "Completed", b: "Missed" }}
              theme={{
                aDot: "bg-sky-300",
                bDot: "bg-amber-300",
                aFill: "bg-gradient-to-t from-sky-900/95 to-sky-300/90",
                bFill: "bg-gradient-to-t from-amber-900/95 to-amber-300/90",
                aBorder: "border-sky-200/25",
                bBorder: "border-amber-200/25",
                aValue: "text-sky-200",
                bValue: "text-amber-200",
              }}
            />

            <SingleBarCountGraph
              title="Procastination Analysis (Category Wise)"
              subtitle="Late Submission"
              series={procrastinationCategorySeries}
              colorTheme={{
                dot: "bg-orange-300",
                fill: "bg-gradient-to-t from-orange-900/95 to-orange-300/90",
                border: "border-orange-200/25",
                value: "text-orange-200",
              }}
            />

            <SingleBarCountGraph
              title="Procastination Analysis (Day Wise)"
              subtitle="Late Submission Timeline"
              series={procrastinationDaySeries}
              colorTheme={{
                dot: "bg-violet-300",
                fill: "bg-gradient-to-t from-violet-900/95 to-violet-300/90",
                border: "border-violet-200/25",
                value: "text-violet-200",
              }}
              note="Shows number of late submitted tasks by weekday."
            />
          </div>
        </div>

        <div className="journal-scroll flex w-full flex-col gap-2 scroll-smooth overflow-y-auto xl:max-h-[calc(100vh-180px)] xl:max-w-[360px] xl:shrink-0 xl:self-start">
          <InsightRail insights={insights} />
        </div>
      </div>
      )}
    </section>
  );
}
