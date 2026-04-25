import { useMemo, useState } from "react";
import { motion as Motion } from "framer-motion";
import monkGreetingsLogo from "../../../assets/monkgreetingslogo.png";

const MONTH_OPTIONS = [
  { value: "01", label: "January" },
  { value: "02", label: "February" },
  { value: "03", label: "March" },
  { value: "04", label: "April" },
];

const WEEKDAY_ORDER = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const BAR_H = 190;
const LABEL_H = 56;
const CHART_HEADROOM = 16;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function average(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function round(value, precision = 1) {
  return Number(value.toFixed(precision));
}

function getDaysInMonth(year, month) {
  return new Date(Number(year), Number(month), 0).getDate();
}

function formatDay(date) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", { weekday: "short" });
}

function generateMonthScoreLogs(year, month, seed, missedDays) {
  const days = getDaysInMonth(year, month);

  return Array.from({ length: days }, (_, index) => {
    const day = index + 1;
    const date = `${year}-${month}-${String(day).padStart(2, "0")}`;
    const weekdayIndex = new Date(`${date}T00:00:00`).getDay();
    const logged = !missedDays.includes(day);

    const base = 64 + ((day * 7 + seed * 5) % 30);
    const weekendBoost = weekdayIndex === 0 || weekdayIndex === 6 ? 2 : 0;
    const dip = day % 6 === 0 ? 3 : 0;
    const rating = logged ? clamp(base + weekendBoost - dip, 50, 96) : null;

    return {
      date,
      day,
      weekday: WEEKDAY_ORDER[weekdayIndex],
      logged,
      rating,
    };
  });
}

const SCORE_LOGS = [
  ...generateMonthScoreLogs("2026", "02", 1, [4, 9, 15, 23]),
  ...generateMonthScoreLogs("2026", "03", 3, [2, 11, 18, 24, 29]),
  ...generateMonthScoreLogs("2026", "04", 5, [6, 14, 21, 30]),
];

const YEARS = [...new Set(SCORE_LOGS.map((entry) => entry.date.slice(0, 4)))].sort().reverse();

function buildOverallWeekdayRatingSeries(logs) {
  return WEEKDAY_ORDER.map((weekday) => {
    const values = logs.filter((entry) => entry.logged && entry.weekday === weekday).map((entry) => entry.rating);
    return {
      label: weekday,
      value: values.length ? round(average(values)) : 0,
    };
  });
}

function buildWeeklyScoreSeries(logs) {
  return [1, 2, 3, 4].map((week) => {
    const startDay = (week - 1) * 7 + 1;
    const endDay = week * 7;
    const values = logs
      .filter((entry) => entry.day >= startDay && entry.day <= endDay && entry.logged)
      .map((entry) => entry.rating);

    return {
      label: `W${week}`,
      week,
      value: values.length ? round(average(values)) : 0,
    };
  });
}

function buildStreakSeries(logs, year, month) {
  const daysInMonth = getDaysInMonth(year, month);
  const entryMap = new Map(logs.map((entry) => [entry.day, entry]));
  const series = [{ day: 0, value: 0, logged: true, isStart: true }];
  let streak = 0;

  for (let day = 1; day <= daysInMonth; day += 1) {
    const entry = entryMap.get(day);
    const logged = Boolean(entry?.logged);
    streak = logged ? streak + 1 : 0;
    series.push({ day, value: streak, logged, isStart: false });
  }

  return series;
}

function buildMissedByWeekdaySeries(logs) {
  return WEEKDAY_ORDER.map((weekday) => ({
    label: weekday,
    value: logs.filter((entry) => !entry.logged && entry.weekday === weekday).length,
  }));
}

function countStreakBreaks(logs) {
  let breaks = 0;
  for (let index = 1; index < logs.length; index += 1) {
    if (logs[index - 1].logged && !logs[index].logged) breaks += 1;
  }
  return breaks;
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

function VerticalBarGraph({ title, subtitle, series, yMax, ticks, theme, valueSuffix = "" }) {
  const drawableBarH = BAR_H - CHART_HEADROOM;

  const yLabelBottom = (mark) => {
    if (mark === yMax) return drawableBarH - 2;
    if (mark === 0) return 0;
    return (mark / yMax) * drawableBarH - 7;
  };

  return (
    <section className="rounded-[1.75rem] border border-sky-100/10 bg-stone-950/30 p-5 shadow-xl shadow-black/20">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-stone-500">{subtitle}</p>
          <h4 className="mt-2 text-xl font-semibold text-sky-50">{title}</h4>
        </div>
        <span className="flex items-center gap-2 text-xs text-stone-400">
          <span className={`h-2.5 w-2.5 rounded-full ${theme.dot}`} />Daily count
        </span>
      </div>

      <div className="mt-6 flex gap-3">
        <div className="relative z-10 shrink-0 w-9 text-right text-[11px] font-semibold text-stone-300" style={{ height: BAR_H, marginBottom: LABEL_H }}>
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
                style={{ bottom: LABEL_H + (tick / yMax) * drawableBarH }}
              />
            ))}

            <div className="absolute inset-0 flex items-end gap-2" style={{ paddingBottom: `${LABEL_H}px` }}>
              {series.map((item, index) => (
                <div key={`${item.label}-${index}`} className="flex min-w-0 flex-1 flex-col items-center justify-end">
                  <span className={`mb-1 text-[10px] font-semibold ${theme.value}`}>
                    {item.value}
                    {valueSuffix}
                  </span>
                  <Motion.div
                    className={`w-full max-w-[42px] rounded-t-xl border ${theme.border} ${theme.fill}`}
                    initial={{ height: 0 }}
                    animate={{ height: Math.max(10, Math.round((item.value / yMax) * drawableBarH)) }}
                    transition={{ duration: 0.4, delay: index * 0.04 }}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="mt-1 flex items-center text-[10px] text-stone-500">
            {series.map((item, index) => (
              <span key={`x-${item.label}-${index}`} className="flex-1 text-center">
                {item.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function StreakLineGraph({ series, daysInMonth }) {
  const width = Math.max(920, (daysInMonth + 1) * 28);
  const height = 304;
  const pad = { top: 24, right: 20, bottom: 42, left: 42 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;
  const maxStreak = Math.max(7, Math.max(...series.map((item) => item.value), 0));
  const yMarks = Array.from({ length: maxStreak + 1 }, (_, index) => index).filter((value) => value % 2 === 0 || value === maxStreak);

  const xOf = (index) => (series.length === 1 ? pad.left + chartW / 2 : pad.left + (index / (series.length - 1)) * chartW);
  const yOf = (value) => pad.top + ((maxStreak - value) / maxStreak) * chartH;
  const linePath = series
    .map((point, index) => `${index === 0 ? "M" : "L"}${xOf(index).toFixed(1)},${yOf(point.value).toFixed(1)}`)
    .join(" ");

  return (
    <section className="rounded-[1.75rem] border border-sky-100/10 bg-stone-950/30 p-5 shadow-xl shadow-black/20">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-stone-500">Streak</p>
          <h4 className="mt-2 text-xl font-semibold text-sky-50">Streak Analysis (Breaks shown at 0)</h4>
        </div>
        <div className="flex items-center gap-3 text-xs text-stone-400">
          <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-sky-400" />Streak count</span>
          <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-rose-300" />Break day</span>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ minWidth: `${width}px` }}>
          {yMarks.map((mark) => {
            const y = yOf(mark);
            return (
              <g key={mark}>
                <line x1={pad.left} y1={y} x2={width - pad.right} y2={y} stroke="rgba(255,255,255,0.08)" strokeDasharray="4 6" />
                <text x={pad.left - 10} y={y + 4} textAnchor="end" fontSize="10" fill="rgba(255,255,255,0.45)">
                  {mark}
                </text>
              </g>
            );
          })}

          <Motion.path
            d={linePath}
            fill="none"
            stroke="#38bdf8"
            strokeWidth="3"
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 3.2, ease: "easeInOut" }}
          />

          {series.map((point, index) => {
            if (point.day === 0) return null;
            const x = xOf(index);
            const y = yOf(point.value);
            const isBreak = !point.logged;

            return (
              <g key={`pt-${point.day}`}>
                <circle
                  cx={x}
                  cy={y}
                  r="4.5"
                  fill={isBreak ? "rgba(251,113,133,0.3)" : "#0f172a"}
                  stroke={isBreak ? "#fda4af" : "#7dd3fc"}
                  strokeWidth="2"
                />
              </g>
            );
          })}

          {series.map((point, index) => {
            if (point.day === 0) return null;
            return (
              <text
                key={`x-label-${point.day}`}
                x={xOf(index)}
                y={height - 12}
                textAnchor="middle"
                fontSize="10"
                fill="rgba(255,255,255,0.45)"
              >
                {point.day}
              </text>
            );
          })}
        </svg>
      </div>
    </section>
  );
}

export default function ScoreStreakAnalysis() {
  const [selectedYear, setSelectedYear] = useState(YEARS[0]);
  const [selectedMonth, setSelectedMonth] = useState("04");

  const availableMonths = useMemo(() => {
    const months = new Set(
      SCORE_LOGS.filter((entry) => entry.date.startsWith(selectedYear)).map((entry) => entry.date.slice(5, 7))
    );
    return MONTH_OPTIONS.filter((month) => months.has(month.value));
  }, [selectedYear]);

  const monthLogs = useMemo(
    () =>
      SCORE_LOGS.filter(
        (entry) => entry.date.startsWith(selectedYear) && entry.date.slice(5, 7) === selectedMonth
      ).sort((a, b) => a.date.localeCompare(b.date)),
    [selectedMonth, selectedYear]
  );

  const overallDayRatingSeries = useMemo(() => buildOverallWeekdayRatingSeries(monthLogs), [monthLogs]);
  const weeklyScoreSeries = useMemo(() => buildWeeklyScoreSeries(monthLogs), [monthLogs]);
  const streakSeries = useMemo(() => buildStreakSeries(monthLogs, selectedYear, selectedMonth), [monthLogs, selectedMonth, selectedYear]);
  const missedDaySeries = useMemo(() => buildMissedByWeekdaySeries(monthLogs), [monthLogs]);

  const validWeekdayRatings = overallDayRatingSeries.filter((item) => item.value > 0);
  const highestRatedDay = validWeekdayRatings.length
    ? [...validWeekdayRatings].sort((a, b) => b.value - a.value)[0]
    : null;
  const lowestRatedDay = validWeekdayRatings.length
    ? [...validWeekdayRatings].sort((a, b) => a.value - b.value)[0]
    : null;

  const avgDayRating = round(average(monthLogs.filter((entry) => entry.logged).map((entry) => entry.rating)));
  const avgWeeklyScore = round(average(weeklyScoreSeries.filter((item) => item.value > 0).map((item) => item.value)));
  const longestJournalStreak = Math.max(...streakSeries.map((item) => item.value), 0);
  const streakBreaks = countStreakBreaks(monthLogs);
  const totalMissedDays = monthLogs.filter((entry) => !entry.logged).length;

  const insights = [
    {
      title: "Highest Rated Day",
      value: highestRatedDay ? `${highestRatedDay.label} · ${highestRatedDay.value}%` : "No data",
      description: "Weekday with the highest average overall rating this month.",
    },
    {
      title: "Lowest Rated Day",
      value: lowestRatedDay ? `${lowestRatedDay.label} · ${lowestRatedDay.value}%` : "No data",
      description: "Weekday with the lowest average overall rating this month.",
    },
    {
      title: "Avg Day Rating This Month",
      value: `${avgDayRating}%`,
      description: "Average overall day rating across all logged days this month.",
    },
    {
      title: "Avg Weekly Score",
      value: `${avgWeeklyScore}%`,
      description: "Average of Week 1 to Week 4 score values.",
    },
    {
      title: "Longest Journal Streak",
      value: `${longestJournalStreak} days`,
      description: "Longest consecutive logged-day streak in this month.",
    },
    {
      title: "Streak Breaks This Month",
      value: `${streakBreaks}`,
      description: "Number of times a logged streak ended with a missed day.",
    },
    {
      title: "Total Missed Days This Month",
      value: `${totalMissedDays}`,
      description: "Total days in the selected month where no journal entry was logged.",
    },
  ];

  const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);

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
              const nextMonths = MONTH_OPTIONS.filter((month) =>
                SCORE_LOGS.some((entry) => entry.date.startsWith(nextYear) && entry.date.slice(5, 7) === month.value)
              );
              setSelectedMonth(nextMonths[0]?.value ?? "01");
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
            <StreakLineGraph series={streakSeries} daysInMonth={daysInMonth} />

            <VerticalBarGraph
              title="Overall Day Rating Analysis"
              subtitle="Overall Rating by Weekday"
              series={overallDayRatingSeries}
              yMax={100}
              ticks={[0, 20, 40, 60, 80, 100]}
              valueSuffix="%"
              theme={{
                dot: "bg-cyan-300",
                fill: "bg-cyan-500/70 bg-gradient-to-t from-cyan-900/95 to-cyan-300/90",
                border: "border-cyan-200/25",
                value: "text-cyan-200",
              }}
            />

            <VerticalBarGraph
              title="Weekly Score Analysis (4 Weeks)"
              subtitle="Week-wise Score"
              series={weeklyScoreSeries}
              yMax={100}
              ticks={[0, 20, 40, 60, 80, 100]}
              valueSuffix="%"
              theme={{
                dot: "bg-amber-300",
                fill: "bg-amber-500/70 bg-gradient-to-t from-amber-900/95 to-amber-300/90",
                border: "border-amber-200/25",
                value: "text-amber-200",
              }}
            />

            <VerticalBarGraph
              title="Missed Day Analysis"
              subtitle="Missed Logs by Weekday"
              series={missedDaySeries}
              yMax={Math.max(4, Math.max(...missedDaySeries.map((item) => item.value), 0))}
              ticks={[0, 1, 2, 3, 4]}
              theme={{
                dot: "bg-red-400",
                fill: "bg-red-500/90 bg-gradient-to-t from-red-700/95 via-red-500/95 to-red-300/95 shadow-[0_0_12px_rgba(239,68,68,0.35)]",
                border: "border-red-300/40",
                value: "text-red-200",
              }}
            />
          </div>
        </div>

        <div
          className="-mt-12 journal-scroll flex w-full max-w-[360px] shrink-0 self-start flex-col gap-2 scroll-smooth overflow-y-auto"
          style={{ maxHeight: "calc(100vh - 180px)" }}
        >
          <InsightRail insights={insights} />
        </div>
      </div>
    </section>
  );
}
