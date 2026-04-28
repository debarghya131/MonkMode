import { useMemo, useState } from "react";
import { motion as Motion } from "framer-motion";
import littleMonkLogo from "../../../assets/littlemonklogo.png";

const TIME_ORDER = ["Morning", "Afternoon", "Evening", "Night"];
const PRIORITY_ORDER = ["High", "Medium", "Low"];
const BAR_H = 190;
const LABEL_H = 62;
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

const HABIT_CATEGORY_MONTHLY_DATA = [
  {
    year: "2026",
    month: "04",
    categories: [
      { name: "Fitness", total: 40, completed: 28 },
      { name: "Sleep", total: 28, completed: 14 },
      { name: "Study", total: 42, completed: 30 },
      { name: "Mindfulness", total: 35, completed: 18 },
      { name: "Health", total: 32, completed: 27 },
      { name: "Morning Routine", total: 22, completed: 17 },
    ],
    times: [
      { name: "Morning", total: 82, completed: 62 },
      { name: "Afternoon", total: 48, completed: 34 },
      { name: "Evening", total: 37, completed: 22 },
      { name: "Night", total: 32, completed: 18 },
    ],
    priorities: [
      { name: "High", total: 72, completed: 50 },
      { name: "Medium", total: 78, completed: 54 },
      { name: "Low", total: 49, completed: 32 },
    ],
  },
  {
    year: "2026",
    month: "03",
    categories: [
      { name: "Fitness", total: 38, completed: 33 },
      { name: "Sleep", total: 30, completed: 22 },
      { name: "Study", total: 39, completed: 32 },
      { name: "Mindfulness", total: 31, completed: 20 },
      { name: "Health", total: 34, completed: 29 },
      { name: "Morning Routine", total: 24, completed: 22 },
    ],
    times: [
      { name: "Morning", total: 80, completed: 69 },
      { name: "Afternoon", total: 45, completed: 35 },
      { name: "Evening", total: 36, completed: 27 },
      { name: "Night", total: 35, completed: 27 },
    ],
    priorities: [
      { name: "High", total: 70, completed: 58 },
      { name: "Medium", total: 76, completed: 59 },
      { name: "Low", total: 50, completed: 39 },
    ],
  },
  {
    year: "2026",
    month: "02",
    categories: [
      { name: "Fitness", total: 32, completed: 21 },
      { name: "Sleep", total: 28, completed: 12 },
      { name: "Study", total: 35, completed: 22 },
      { name: "Mindfulness", total: 30, completed: 16 },
      { name: "Health", total: 28, completed: 19 },
      { name: "Morning Routine", total: 20, completed: 14 },
    ],
    times: [
      { name: "Morning", total: 72, completed: 50 },
      { name: "Afternoon", total: 40, completed: 25 },
      { name: "Evening", total: 34, completed: 18 },
      { name: "Night", total: 27, completed: 11 },
    ],
    priorities: [
      { name: "High", total: 62, completed: 38 },
      { name: "Medium", total: 68, completed: 42 },
      { name: "Low", total: 43, completed: 24 },
    ],
  },
  {
    year: "2026",
    month: "01",
    categories: [
      { name: "Fitness", total: 35, completed: 29 },
      { name: "Sleep", total: 29, completed: 23 },
      { name: "Study", total: 38, completed: 27 },
      { name: "Mindfulness", total: 31, completed: 25 },
      { name: "Health", total: 35, completed: 31 },
      { name: "Personal", total: 26, completed: 18 },
    ],
    times: [
      { name: "Morning", total: 78, completed: 64 },
      { name: "Afternoon", total: 44, completed: 31 },
      { name: "Evening", total: 39, completed: 29 },
      { name: "Night", total: 33, completed: 29 },
    ],
    priorities: [
      { name: "High", total: 68, completed: 55 },
      { name: "Medium", total: 74, completed: 54 },
      { name: "Low", total: 52, completed: 43 },
    ],
  },
  {
    year: "2025",
    month: "12",
    categories: [
      { name: "Fitness", total: 30, completed: 18 },
      { name: "Sleep", total: 28, completed: 11 },
      { name: "Study", total: 33, completed: 19 },
      { name: "Mindfulness", total: 26, completed: 13 },
      { name: "Health", total: 29, completed: 18 },
      { name: "Personal", total: 24, completed: 12 },
    ],
    times: [
      { name: "Morning", total: 70, completed: 43 },
      { name: "Afternoon", total: 38, completed: 22 },
      { name: "Evening", total: 34, completed: 18 },
      { name: "Night", total: 28, completed: 8 },
    ],
    priorities: [
      { name: "High", total: 60, completed: 34 },
      { name: "Medium", total: 65, completed: 38 },
      { name: "Low", total: 45, completed: 20 },
    ],
  },
];

const YEARS = [...new Set(HABIT_CATEGORY_MONTHLY_DATA.map((entry) => entry.year))].sort().reverse();
const CURRENT_YEAR = String(new Date().getFullYear());
const CURRENT_MONTH = String(new Date().getMonth() + 1).padStart(2, "0");

const round = (value, precision = 1) => Number(value.toFixed(precision));

function toPercent(part, total) {
  if (!total) return 0;
  return round((part / total) * 100);
}

function withRates(item) {
  const missed = Math.max(0, item.total - item.completed);
  return {
    ...item,
    missed,
    completionRate: toPercent(item.completed, item.total),
    missedRate: toPercent(missed, item.total),
  };
}

function getAvailableMonthsForYear(year) {
  return MONTH_OPTIONS.filter((month) =>
    HABIT_CATEGORY_MONTHLY_DATA.some((entry) => entry.year === year && entry.month === month.value)
  );
}

const INITIAL_YEAR = YEARS.includes(CURRENT_YEAR) ? CURRENT_YEAR : YEARS[0];
const INITIAL_MONTH = (() => {
  const months = getAvailableMonthsForYear(INITIAL_YEAR);
  if (months.some((month) => month.value === CURRENT_MONTH)) return CURRENT_MONTH;
  return months[0]?.value ?? MONTH_OPTIONS[0].value;
})();

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

function RateBarGraph({ title, subtitle, series, minWidth = 760 }) {
  const [hovered, setHovered] = useState(null);
  const drawableBarH = BAR_H - CHART_HEADROOM;
  const ticks = [0, 20, 40, 60, 80, 100];

  const yLabelBottom = (mark) => {
    if (mark === 100) return drawableBarH - 2;
    if (mark === 0) return 0;
    return (mark / 100) * drawableBarH - 7;
  };

  return (
    <section className="rounded-[1.75rem] border border-sky-100/10 bg-stone-950/30 p-5 shadow-xl shadow-black/20">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-stone-500">{subtitle}</p>
          <h4 className="mt-2 text-xl font-semibold text-sky-50">{title}</h4>
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

      <div className="mt-6 flex gap-3">
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

        <div className="relative min-w-0 flex-1 overflow-x-auto">
          <div style={{ minWidth: `${Math.max(minWidth, series.length * 140)}px` }}>
            <div className="relative" style={{ height: BAR_H + LABEL_H }}>
              {ticks.map((tick) => (
                <div
                  key={tick}
                  className="absolute left-0 right-0 border-t border-dashed border-white/6"
                  style={{ bottom: LABEL_H + (tick / 100) * drawableBarH }}
                />
              ))}

              <div className="absolute inset-0 flex items-end gap-2.5" style={{ paddingBottom: `${LABEL_H}px` }}>
                {series.map((item, index) => (
                  <div
                    key={item.label}
                    className="flex min-w-0 flex-1 cursor-default items-end justify-center gap-2"
                    style={{
                      opacity: hovered !== null && hovered !== index ? 0.4 : 1,
                      transition: "opacity 0.18s ease",
                    }}
                    onMouseEnter={() => setHovered(index)}
                    onMouseLeave={() => setHovered(null)}
                  >
                    <div className="flex w-full max-w-[28px] flex-col items-center justify-end">
                      <span className="mb-1 text-[10px] font-semibold text-emerald-200">{item.completionRate}%</span>
                      <Motion.div
                        className="w-full rounded-t-lg border border-emerald-200/25 bg-gradient-to-t from-emerald-900/95 to-emerald-300/90"
                        initial={{ height: 0 }}
                        animate={{ height: Math.max(10, Math.round((item.completionRate / 100) * drawableBarH)) }}
                        transition={{ duration: 0.42, delay: index * 0.05 }}
                      />
                    </div>
                    <div className="flex w-full max-w-[28px] flex-col items-center justify-end">
                      <span className="mb-1 text-[10px] font-semibold text-rose-200">{item.missedRate}%</span>
                      <Motion.div
                        className="w-full rounded-t-lg border border-rose-200/25 bg-gradient-to-t from-rose-900/95 to-rose-300/90"
                        initial={{ height: 0 }}
                        animate={{ height: Math.max(10, Math.round((item.missedRate / 100) * drawableBarH)) }}
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

export default function CategPrioTimeAnalysis() {
  const [selectedYear, setSelectedYear] = useState(INITIAL_YEAR);
  const [selectedMonth, setSelectedMonth] = useState(INITIAL_MONTH);

  const availableMonths = useMemo(() => getAvailableMonthsForYear(selectedYear), [selectedYear]);

  const selectedPeriod = useMemo(
    () =>
      HABIT_CATEGORY_MONTHLY_DATA.find((entry) => entry.year === selectedYear && entry.month === selectedMonth) ??
      HABIT_CATEGORY_MONTHLY_DATA.find((entry) => entry.year === selectedYear) ??
      HABIT_CATEGORY_MONTHLY_DATA[0],
    [selectedMonth, selectedYear]
  );

  const categorySeries = useMemo(
    () => selectedPeriod.categories.map((category) => ({ label: category.name, ...withRates(category) })),
    [selectedPeriod]
  );

  const timeSeries = useMemo(() => {
    const dataMap = new Map(selectedPeriod.times.map((time) => [time.name, time]));
    return TIME_ORDER.map((time) => {
      const entry = dataMap.get(time) ?? { name: time, total: 0, completed: 0 };
      return { label: time, ...withRates(entry) };
    });
  }, [selectedPeriod]);

  const prioritySeries = useMemo(() => {
    const dataMap = new Map(selectedPeriod.priorities.map((priority) => [priority.name, priority]));
    return PRIORITY_ORDER.map((priority) => {
      const entry = dataMap.get(priority) ?? { name: priority, total: 0, completed: 0 };
      return { label: priority, ...withRates(entry) };
    });
  }, [selectedPeriod]);

  const bestCategory = categorySeries.reduce((best, current) =>
    current.completionRate > best.completionRate ? current : best
  );
  const worstCategory = categorySeries.reduce((worst, current) =>
    current.missedRate > worst.missedRate ? current : worst
  );
  const bestTime = timeSeries.reduce((best, current) =>
    current.completionRate > best.completionRate ? current : best
  );
  const worstTime = timeSeries.reduce((worst, current) =>
    current.missedRate > worst.missedRate ? current : worst
  );

  const insights = [
    {
      title: "Best Category",
      value: `${bestCategory.name} (${bestCategory.completionRate}%)`,
      description: `${bestCategory.completed}/${bestCategory.total} habit check-ins completed in ${bestCategory.name}.`,
    },
    {
      title: "Worst Category",
      value: `${worstCategory.name} (${worstCategory.missedRate}% miss)`,
      description: `${worstCategory.missed}/${worstCategory.total} habit check-ins were missed in ${worstCategory.name}.`,
    },
    {
      title: "Best Time In Day",
      value: `${bestTime.name} (${bestTime.completionRate}%)`,
      description: `${bestTime.completed}/${bestTime.total} habit check-ins completed during ${bestTime.name.toLowerCase()}.`,
    },
    {
      title: "Worst Time Of Day",
      value: `${worstTime.name} (${worstTime.missedRate}% miss)`,
      description: `${worstTime.missed}/${worstTime.total} habit check-ins were missed during ${worstTime.name.toLowerCase()}.`,
    },
  ];

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2 text-sm text-stone-300">
          <span className="text-stone-400">Year</span>
          <select
            value={selectedYear}
            onChange={(event) => {
              const nextYear = event.target.value;
              setSelectedYear(nextYear);
              const nextMonths = getAvailableMonthsForYear(nextYear);
              const monthSet = new Set(nextMonths.map((month) => month.value));
              if (monthSet.has(selectedMonth)) {
                setSelectedMonth(selectedMonth);
                return;
              }
              if (monthSet.has(CURRENT_MONTH)) {
                setSelectedMonth(CURRENT_MONTH);
                return;
              }
              setSelectedMonth(nextMonths[0]?.value ?? MONTH_OPTIONS[0].value);
            }}
            className="bg-transparent text-sky-100 outline-none"
          >
            {YEARS.map((year) => (
              <option key={year} value={year} className="bg-stone-950 text-stone-200">
                {year}
              </option>
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
            {availableMonths.map((month) => (
              <option key={month.value} value={month.value} className="bg-stone-950 text-stone-200">
                {month.label}
              </option>
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
            <RateBarGraph
              title="Category Wise Analysis"
              subtitle="Completion & Miss Rate"
              series={categorySeries}
            />

            <RateBarGraph
              title="Time Of The Day Analysis"
              subtitle="Morning | Afternoon | Evening | Night"
              series={timeSeries}
              minWidth={620}
            />

            <RateBarGraph
              title="Priority Wise Analysis"
              subtitle="Completion & Miss Rate"
              series={prioritySeries}
              minWidth={520}
            />
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
