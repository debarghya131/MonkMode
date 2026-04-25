import { useMemo, useState } from "react";
import { motion as Motion } from "framer-motion";
import monkGreetingsLogo from "../../../assets/monkgreetingslogo.png";

const DAY_ORDER = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const TIME_RANGES = ["6 AM - 9 AM", "9 AM - 12 PM", "12 PM - 3 PM", "3 PM - 6 PM", "6 PM - 12 AM"];
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

const TODO_ANALYSIS_MONTHLY_DATA = [
  {
    year: "2026",
    month: "04",
    weekTaskDistribution: [
      { day: "Sun", total: 4, completed: 1 },
      { day: "Mon", total: 6, completed: 4 },
      { day: "Tue", total: 7, completed: 5 },
      { day: "Wed", total: 8, completed: 7 },
      { day: "Thu", total: 6, completed: 5 },
      { day: "Fri", total: 6, completed: 4 },
      { day: "Sat", total: 5, completed: 2 },
    ],
    timeTaskDistribution: [
      { range: "6 AM - 9 AM", total: 10, completed: 8 },
      { range: "9 AM - 12 PM", total: 14, completed: 10 },
      { range: "12 PM - 3 PM", total: 8, completed: 5 },
      { range: "3 PM - 6 PM", total: 6, completed: 3 },
      { range: "6 PM - 12 AM", total: 4, completed: 2 },
    ],
  },
  {
    year: "2026",
    month: "03",
    weekTaskDistribution: [
      { day: "Sun", total: 5, completed: 2 },
      { day: "Mon", total: 6, completed: 5 },
      { day: "Tue", total: 7, completed: 6 },
      { day: "Wed", total: 8, completed: 8 },
      { day: "Thu", total: 7, completed: 6 },
      { day: "Fri", total: 6, completed: 5 },
      { day: "Sat", total: 5, completed: 3 },
    ],
    timeTaskDistribution: [
      { range: "6 AM - 9 AM", total: 11, completed: 10 },
      { range: "9 AM - 12 PM", total: 15, completed: 13 },
      { range: "12 PM - 3 PM", total: 9, completed: 7 },
      { range: "3 PM - 6 PM", total: 5, completed: 3 },
      { range: "6 PM - 12 AM", total: 4, completed: 2 },
    ],
  },
  {
    year: "2026",
    month: "02",
    weekTaskDistribution: [
      { day: "Sun", total: 3, completed: 0 },
      { day: "Mon", total: 6, completed: 3 },
      { day: "Tue", total: 6, completed: 4 },
      { day: "Wed", total: 7, completed: 5 },
      { day: "Thu", total: 7, completed: 4 },
      { day: "Fri", total: 6, completed: 3 },
      { day: "Sat", total: 4, completed: 2 },
    ],
    timeTaskDistribution: [
      { range: "6 AM - 9 AM", total: 7, completed: 4 },
      { range: "9 AM - 12 PM", total: 12, completed: 8 },
      { range: "12 PM - 3 PM", total: 8, completed: 4 },
      { range: "3 PM - 6 PM", total: 7, completed: 3 },
      { range: "6 PM - 12 AM", total: 5, completed: 2 },
    ],
  },
  {
    year: "2025",
    month: "12",
    weekTaskDistribution: [
      { day: "Sun", total: 4, completed: 1 },
      { day: "Mon", total: 5, completed: 3 },
      { day: "Tue", total: 6, completed: 3 },
      { day: "Wed", total: 6, completed: 4 },
      { day: "Thu", total: 6, completed: 3 },
      { day: "Fri", total: 5, completed: 2 },
      { day: "Sat", total: 4, completed: 1 },
    ],
    timeTaskDistribution: [
      { range: "6 AM - 9 AM", total: 8, completed: 5 },
      { range: "9 AM - 12 PM", total: 10, completed: 6 },
      { range: "12 PM - 3 PM", total: 7, completed: 3 },
      { range: "3 PM - 6 PM", total: 6, completed: 2 },
      { range: "6 PM - 12 AM", total: 5, completed: 1 },
    ],
  },
];

const YEARS = [...new Set(TODO_ANALYSIS_MONTHLY_DATA.map((entry) => entry.year))].sort().reverse();
const CURRENT_YEAR = String(new Date().getFullYear());
const CURRENT_MONTH = String(new Date().getMonth() + 1).padStart(2, "0");

function getAvailableMonthsForYear(year) {
  return MONTH_OPTIONS.filter((month) =>
    TODO_ANALYSIS_MONTHLY_DATA.some((entry) => entry.year === year && entry.month === month.value)
  );
}

const INITIAL_YEAR = YEARS.includes(CURRENT_YEAR) ? CURRENT_YEAR : YEARS[0];
const INITIAL_MONTH = (() => {
  const months = getAvailableMonthsForYear(INITIAL_YEAR);
  if (months.some((month) => month.value === CURRENT_MONTH)) return CURRENT_MONTH;
  return months[0]?.value ?? MONTH_OPTIONS[0].value;
})();

const BAR_H = 190;
const LABEL_H = 58;
const CHART_HEADROOM = 18;

const round = (value, precision = 1) => Number(value.toFixed(precision));

function toPercent(part, total) {
  if (!total) return 0;
  return round((part / total) * 100);
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
              src={monkGreetingsLogo}
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

function RateByDayGraph({ title, subtitle, series, theme }) {
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
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-stone-500">{subtitle}</p>
          <h4 className="mt-2 text-xl font-semibold text-sky-50">{title}</h4>
        </div>
        <span className="flex items-center gap-2 text-xs text-stone-400">
          <span className={`h-2.5 w-2.5 rounded-full ${theme.dot}`} />Rate
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
                  className="flex min-w-0 flex-1 flex-col items-center justify-end"
                  style={{ opacity: hovered !== null && hovered !== index ? 0.4 : 1, transition: "opacity 0.18s ease", cursor: "default" }}
                  onMouseEnter={() => setHovered(index)}
                  onMouseLeave={() => setHovered(null)}
                >
                  <span className={`mb-1 text-[10px] font-semibold ${theme.value}`}>{item.value}%</span>
                  <Motion.div
                    className={`w-full max-w-[42px] rounded-t-xl border ${theme.border} ${theme.fill}`}
                    initial={{ height: 0 }}
                    animate={{ height: Math.max(10, Math.round((item.value / 100) * drawableBarH)) }}
                    transition={{ duration: 0.4, delay: index * 0.04 }}
                  />
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
    </section>
  );
}

function TimeWiseAnalysisGraph({ series }) {
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
          <p className="text-[11px] uppercase tracking-[0.22em] text-stone-500">Time Slots</p>
          <h4 className="mt-2 text-xl font-semibold text-sky-50">Time Wise Analysis</h4>
        </div>
        <div className="flex items-center gap-3 text-xs text-stone-400">
          <span className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
            Completion rate
          </span>
          <span className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-300" />
            Missed rate
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
          <div style={{ minWidth: `${Math.max(760, series.length * 150)}px` }}>
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
                    className="flex min-w-0 flex-1 items-end justify-center gap-2"
                    style={{ opacity: hovered !== null && hovered !== index ? 0.4 : 1, transition: "opacity 0.18s ease", cursor: "default" }}
                    onMouseEnter={() => setHovered(index)}
                    onMouseLeave={() => setHovered(null)}
                  >
                    <div className="flex w-full max-w-[28px] flex-col items-center justify-end">
                      <span className="mb-1 text-[10px] font-semibold text-emerald-200">{item.completionRate}%</span>
                      <Motion.div
                        className="w-full rounded-t-lg border border-emerald-200/25 bg-gradient-to-t from-emerald-900/95 to-emerald-300/90"
                        initial={{ height: 0 }}
                        animate={{ height: Math.max(10, Math.round((item.completionRate / 100) * drawableBarH)) }}
                        transition={{ duration: 0.4, delay: index * 0.06 }}
                      />
                    </div>
                    <div className="flex w-full max-w-[28px] flex-col items-center justify-end">
                      <span className="mb-1 text-[10px] font-semibold text-rose-200">{item.missedRate}%</span>
                      <Motion.div
                        className="w-full rounded-t-lg border border-rose-200/25 bg-gradient-to-t from-rose-900/95 to-rose-300/90"
                        initial={{ height: 0 }}
                        animate={{ height: Math.max(10, Math.round((item.missedRate / 100) * drawableBarH)) }}
                        transition={{ duration: 0.4, delay: index * 0.06 + 0.05 }}
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

export default function CompleteMissTime() {
  const [selectedYear, setSelectedYear] = useState(INITIAL_YEAR);
  const [selectedMonth, setSelectedMonth] = useState(INITIAL_MONTH);

  const availableMonths = useMemo(
    () => getAvailableMonthsForYear(selectedYear),
    [selectedYear]
  );

  const selectedPeriod = useMemo(
    () =>
      TODO_ANALYSIS_MONTHLY_DATA.find((entry) => entry.year === selectedYear && entry.month === selectedMonth) ??
      TODO_ANALYSIS_MONTHLY_DATA.find((entry) => entry.year === selectedYear) ??
      TODO_ANALYSIS_MONTHLY_DATA[0],
    [selectedMonth, selectedYear]
  );

  const orderedWeekData = useMemo(() => {
    const dataMap = new Map(
      selectedPeriod.weekTaskDistribution.map((entry) => {
        const missed = Math.max(0, entry.total - entry.completed);
        return [
          entry.day,
          {
            ...entry,
            missed,
            completionRate: toPercent(entry.completed, entry.total),
            missedRate: toPercent(missed, entry.total),
          },
        ];
      })
    );

    return DAY_ORDER.map((day) => dataMap.get(day)).filter(Boolean);
  }, [selectedPeriod]);

  const timeWiseData = useMemo(() => {
    const dataMap = new Map(
      selectedPeriod.timeTaskDistribution.map((slot) => {
        const missed = Math.max(0, slot.total - slot.completed);
        return [
          slot.range,
          {
            label: slot.range,
            total: slot.total,
            completed: slot.completed,
            missed,
            completionRate: toPercent(slot.completed, slot.total),
            missedRate: toPercent(missed, slot.total),
          },
        ];
      })
    );

    return TIME_RANGES.map((range) => dataMap.get(range)).filter(Boolean);
  }, [selectedPeriod]);

  const totals = useMemo(
    () =>
      orderedWeekData.reduce(
        (acc, item) => ({
          total: acc.total + item.total,
          completed: acc.completed + item.completed,
          missed: acc.missed + item.missed,
        }),
        { total: 0, completed: 0, missed: 0 }
      ),
    [orderedWeekData]
  );

  const completionRate = toPercent(totals.completed, totals.total);
  const missedRate = toPercent(totals.missed, totals.total);

  const bestDay = useMemo(
    () =>
      orderedWeekData.reduce((best, current) => (current.completionRate > best.completionRate ? current : best)),
    [orderedWeekData]
  );

  const worstDay = useMemo(
    () =>
      orderedWeekData.reduce((worst, current) => (current.completionRate < worst.completionRate ? current : worst)),
    [orderedWeekData]
  );

  const bestTimeSlot = useMemo(
    () => timeWiseData.reduce((best, current) => (current.completionRate > best.completionRate ? current : best)),
    [timeWiseData]
  );

  const completionRateSeries = orderedWeekData.map((item) => ({ label: item.day, value: item.completionRate }));
  const missedRateSeries = orderedWeekData.map((item) => ({ label: item.day, value: item.missedRate }));

  const insights = [
    {
      title: "Total Tasks This Week",
      value: `${totals.total} (${completionRate}% completion)`,
      description: `${totals.completed} completed out of ${totals.total} planned tasks.`,
    },
    {
      title: "Total Tasks Missed",
      value: `${totals.missed} (${missedRate}% missed)`,
      description: `${totals.missed} tasks were not completed in this weekly cycle.`,
    },
    {
      title: "Best Day",
      value: `${bestDay.day} (${bestDay.completionRate}%)`,
      description: `${bestDay.completed}/${bestDay.total} tasks completed on ${bestDay.day}.`,
    },
    {
      title: "Worst Day",
      value: `${worstDay.day} (${worstDay.completionRate}%)`,
      description: `${worstDay.completed}/${worstDay.total} tasks completed on ${worstDay.day}.`,
    },
    {
      title: "Best Performance Time",
      value: `${bestTimeSlot.label} (${bestTimeSlot.completionRate}%)`,
      description: `${bestTimeSlot.completed}/${bestTimeSlot.total} tasks completed in this time slot.`,
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

      <div className="flex items-start gap-5">
        <div
          className="journal-scroll min-w-0 flex-1 scroll-smooth overflow-y-auto rounded-[2rem] border border-sky-100/10 bg-white/[0.03] shadow-2xl shadow-black/30 backdrop-blur"
          style={{ maxHeight: "calc(100vh - 350px)" }}
        >
          <div className="space-y-6 p-6">
            <RateByDayGraph
              title="Completion Rate by Day"
              subtitle="Weekly Completion"
              series={completionRateSeries}
              theme={{
                dot: "bg-emerald-300",
                fill: "bg-gradient-to-t from-emerald-900/95 to-emerald-300/90",
                border: "border-emerald-200/25",
                value: "text-emerald-200",
              }}
            />

            <RateByDayGraph
              title="Missed Rate by Day"
              subtitle="Weekly Missed"
              series={missedRateSeries}
              theme={{
                dot: "bg-rose-300",
                fill: "bg-gradient-to-t from-rose-900/95 to-rose-300/90",
                border: "border-rose-200/25",
                value: "text-rose-200",
              }}
            />

            <TimeWiseAnalysisGraph series={timeWiseData} />
          </div>
        </div>

        <div
          className="journal-scroll flex w-full max-w-[360px] shrink-0 self-start flex-col gap-2 scroll-smooth overflow-y-auto"
          style={{ maxHeight: "calc(100vh - 180px)" }}
        >
          <InsightRail insights={insights} />
        </div>
      </div>
    </section>
  );
}
