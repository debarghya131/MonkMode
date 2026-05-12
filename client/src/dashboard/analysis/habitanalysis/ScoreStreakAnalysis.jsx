import { useEffect, useMemo, useState } from "react";
import { motion as Motion } from "framer-motion";
import littleMonkLogo from "../../../assets/littlemonklogo.png";
import api from "../../../api/axios";
import useAuth from "../../../hooks/useAuth";
import { INITIAL_HABITS } from "../../../../data/HabitDummyData";

const DAY_ORDER = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
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
const YEARS = Array.from({ length: NOW.getFullYear() - 2023 }, (_, i) =>
  String(NOW.getFullYear() - i)
);
const CURRENT_MONTH = String(NOW.getMonth() + 1).padStart(2, "0");

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const round = (value, precision = 1) => Number(value.toFixed(precision));
const average = (values) =>
  values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

function getDaysInMonth(year, month) {
  return new Date(Number(year), Number(month), 0).getDate();
}

function buildDemoHabitAnalysis(year, month) {
  const daysInMonth = getDaysInMonth(year, month);
  const habitStats = INITIAL_HABITS.map((habit) => ({
    name: habit.title,
    total: 0,
    completed: 0,
    missed: 0,
  }));

  const days = Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1;
    const date = `${year}-${month}-${String(day).padStart(2, "0")}`;
    const weekday = new Date(`${date}T00:00:00`).toLocaleDateString("en-US", { weekday: "short" });
    let total = 0;
    let completed = 0;

    INITIAL_HABITS.forEach((habit, habitIndex) => {
      const isWeekend = weekday === "Sat" || weekday === "Sun";
      const expected = habit.category === "Fitness" ? !isWeekend || day % 2 === 0 : true;
      if (!expected) return;

      const missed = [6, 13, 21, 27].includes(day) && habitIndex % 2 === 0;
      const lightDay = [9, 18, 24].includes(day) && habitIndex > 2;
      const completedHabit = !missed && !lightDay && ((day + habitIndex) % 11 !== 0);

      total++;
      habitStats[habitIndex].total++;
      if (completedHabit) {
        completed++;
        habitStats[habitIndex].completed++;
      } else {
        habitStats[habitIndex].missed++;
      }
    });

    const missed = Math.max(0, total - completed);
    const score = total ? Math.round((completed / total) * 100) : null;

    return {
      date,
      weekday,
      total,
      completed,
      missed,
      pending: 0,
      score,
      submitted: completed > 0,
    };
  });

  return {
    year,
    month,
    days,
    habits: habitStats,
    categories: [],
    priorities: [],
    times: [],
  };
}

function buildWeeklyScoreSeries(daily) {
  return [1, 2, 3, 4].map((week) => {
    const start = (week - 1) * 7 + 1;
    const end = week * 7;
    const values = daily
      .filter((day) => day.day >= start && day.day <= end)
      .map((day) => day.consistencyScore);
    return {
      label: `W${week}`,
      value: round(average(values)),
    };
  });
}

function buildWeekdayConsistencySeries(daily) {
  return DAY_ORDER.map((weekday) => {
    const values = daily
      .filter((day) => day.weekday === weekday)
      .map((day) => day.consistencyScore);
    return {
      label: weekday,
      value: round(average(values)),
    };
  });
}

function getMostCommonBreakLength(breakLengths) {
  if (!breakLengths.length) return { length: 0, count: 0 };
  const counts = new Map();
  breakLengths.forEach((length) => counts.set(length, (counts.get(length) ?? 0) + 1));
  return Array.from(counts.entries()).reduce(
    (best, [length, count]) => (count > best.count ? { length, count } : best),
    { length: 0, count: 0 }
  );
}

function InsightRail({ insights }) {
  const [selectedInsight, setSelectedInsight] = useState(null);

  return (
    <aside className="flex max-h-[67vh] w-full flex-col overflow-hidden rounded-2xl border border-amber-100/10 bg-white/6 shadow-xl shadow-black/25 backdrop-blur">
      <div className="shrink-0 p-4 pb-3">
        <div className="flex items-center gap-3">
          <Motion.div
            className="relative grid h-14 w-14 place-items-center"
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
              className="relative z-10 h-16 w-16 object-contain drop-shadow-[0_10px_18px_rgba(245,158,11,0.16)]"
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

      <div className="journal-scroll min-h-0 flex-1 space-y-2.5 overflow-y-auto px-4 pb-4 pr-3">
        {insights.map((insight) => {
          const isSelected = selectedInsight === insight.title;
          return (
            <Motion.div
              key={insight.title}
              layout
              className={`rounded-xl border p-2.5 text-sm transition-colors ${
                isSelected
                  ? "border-sky-400/30 bg-sky-500/8"
                  : "border-sky-100/10 bg-stone-950/45 hover:border-sky-300/20"
              }`}
            >
              <div className="grid grid-cols-[1fr_auto] items-start gap-3">
                <div className="min-w-0">
                  <span className="text-xs font-semibold text-sky-200">{insight.title}</span>
                  <p className="text-sm font-semibold text-stone-200">{insight.value}</p>
                  {isSelected ? (
                    <Motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-1.5 text-xs leading-relaxed text-stone-400"
                    >
                      {insight.description}
                    </Motion.p>
                  ) : null}
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

function StreakLineGraph({ series, daysInMonth }) {
  const [hovered, setHovered] = useState(null);
  const width = Math.max(920, daysInMonth * 30);
  const height = 304;
  const pad = { top: 24, right: 22, bottom: 42, left: 42 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;
  const maxValue = Math.max(8, ...series.map((item) => item.value));
  const yMarks = Array.from({ length: Math.ceil(maxValue) + 1 }, (_, index) => index).filter(
    (value) => value % 2 === 0 || value === Math.ceil(maxValue)
  );

  const xOf = (index) =>
    series.length === 1 ? pad.left + chartW / 2 : pad.left + (index / (series.length - 1)) * chartW;
  const yOf = (value) => pad.top + ((maxValue - value) / maxValue) * chartH;
  const linePath = series
    .map((point, index) => `${index === 0 ? "M" : "L"}${xOf(index).toFixed(1)},${yOf(point.value).toFixed(1)}`)
    .join(" ");

  return (
    <section className="rounded-[1.75rem] border border-sky-100/10 bg-stone-950/30 p-5 shadow-xl shadow-black/20">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-stone-500">Streak</p>
          <h4 className="mt-2 text-xl font-semibold text-sky-50">Streak Graph</h4>
          <p className="mt-1 text-[11px] text-stone-400">x-axis shows all days of the month.</p>
        </div>
        <span className="flex items-center gap-2 text-xs text-stone-400">
          <span className="h-2.5 w-2.5 rounded-full bg-sky-400" />
          Full completion streak (days)
        </span>
      </div>

      <div className="mt-6 overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ minWidth: `${width}px` }}>
          {yMarks.map((mark) => {
            const y = yOf(mark);
            return (
              <g key={mark}>
                <line
                  x1={pad.left}
                  y1={y}
                  x2={width - pad.right}
                  y2={y}
                  stroke="rgba(255,255,255,0.08)"
                  strokeDasharray="4 6"
                />
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
            transition={{ duration: 2.4, ease: "easeInOut" }}
          />

          {series.map((point, index) => (
            <circle
              key={point.day}
              cx={xOf(index)}
              cy={yOf(point.value)}
              r={hovered === index ? 7 : 4.2}
              fill={hovered === index ? "#38bdf8" : "#0f172a"}
              stroke="#7dd3fc"
              strokeWidth="2"
              style={{ transition: "r 0.15s ease, fill 0.15s ease" }}
            />
          ))}

          {series.map((point, index) => (
            <text
              key={`x-${point.day}`}
              x={xOf(index)}
              y={height - 12}
              textAnchor="middle"
              fontSize="9"
              fill="rgba(255,255,255,0.42)"
            >
              {point.day}
            </text>
          ))}

          {hovered !== null && series[hovered] ? (
            <g style={{ pointerEvents: "none" }}>
              <rect
                x={Math.min(Math.max(xOf(hovered) - 42, pad.left), width - pad.right - 84)}
                y={Math.max(yOf(series[hovered].value) - 42, pad.top)}
                width="84"
                height="34"
                rx="6"
                fill="rgba(15,23,42,0.92)"
                stroke="rgba(56,189,248,0.4)"
              />
              <text
                x={Math.min(Math.max(xOf(hovered), pad.left + 42), width - pad.right - 42)}
                y={Math.max(yOf(series[hovered].value) - 21, pad.top + 21)}
                textAnchor="middle"
                fontSize="11"
                fontWeight="700"
                fill="#bae6fd"
              >
                Day {series[hovered].value}
              </text>
            </g>
          ) : null}

          {series.map((point, index) => {
            const stepW = series.length > 1 ? chartW / (series.length - 1) : chartW;
            return (
              <rect
                key={`hit-${point.day}`}
                x={Math.max(pad.left, xOf(index) - stepW / 2)}
                y={pad.top}
                width={stepW}
                height={chartH}
                fill="transparent"
                onMouseEnter={() => setHovered(index)}
                onMouseLeave={() => setHovered(null)}
              />
            );
          })}
        </svg>
      </div>
    </section>
  );
}

function VerticalScoreGraph({ title, subtitle, series, theme }) {
  const [hovered, setHovered] = useState(null);
  const barH = 190;
  const labelH = 56;
  const ticks = [0, 20, 40, 60, 80, 100];

  return (
    <section className="rounded-[1.75rem] border border-sky-100/10 bg-stone-950/30 p-5 shadow-xl shadow-black/20">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-stone-500">{subtitle}</p>
          <h4 className="mt-2 text-xl font-semibold text-sky-50">{title}</h4>
        </div>
        <span className="flex items-center gap-2 text-xs text-stone-400">
          <span className={`h-2.5 w-2.5 rounded-full ${theme.dot}`} />
          Score
        </span>
      </div>

      <div className="mt-6 flex gap-3">
        <div
          className="relative z-10 w-9 shrink-0 text-right text-[11px] font-semibold text-stone-300"
          style={{ height: barH, marginBottom: labelH }}
        >
          {ticks.map((tick) => (
            <span
              key={tick}
              className="absolute right-0 rounded bg-stone-950/55 px-0.5"
              style={{ bottom: `${(tick / 100) * barH - (tick === 0 ? 0 : 7)}px` }}
            >
              {tick}
            </span>
          ))}
        </div>

        <div className="relative flex-1">
          <div className="relative" style={{ height: barH + labelH }}>
            {ticks.map((tick) => (
              <div
                key={tick}
                className="absolute left-0 right-0 border-t border-dashed border-white/6"
                style={{ bottom: labelH + (tick / 100) * barH }}
              />
            ))}

            <div className="absolute inset-0 flex items-end gap-2.5" style={{ paddingBottom: `${labelH}px` }}>
              {series.map((item, index) => (
                <div
                  key={item.label}
                  className="flex min-w-0 flex-1 flex-col items-center justify-end"
                  style={{
                    opacity: hovered !== null && hovered !== index ? 0.4 : 1,
                    transition: "opacity 0.18s ease",
                    cursor: "default",
                  }}
                  onMouseEnter={() => setHovered(index)}
                  onMouseLeave={() => setHovered(null)}
                >
                  <span className={`mb-1 text-[10px] font-semibold ${theme.value}`}>{item.value}</span>
                  <Motion.div
                    className={`w-full max-w-[42px] rounded-t-xl border ${theme.border} ${theme.fill}`}
                    initial={{ height: 0 }}
                    animate={{ height: Math.max(10, Math.round((item.value / 100) * barH)) }}
                    transition={{ duration: 0.42, delay: index * 0.04 }}
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

export default function ScoreStreakAnalysis() {
  const { isDemoMode, user } = useAuth();
  const [selectedYear, setSelectedYear] = useState(String(NOW.getFullYear()));
  const [selectedMonth, setSelectedMonth] = useState(isDemoMode ? "04" : CURRENT_MONTH);
  const [apiData, setApiData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (isDemoMode) {
      setApiData(buildDemoHabitAnalysis(selectedYear, selectedMonth));
      setLoading(false);
      return;
    }

    setLoading(true);
    setApiData(null);
    api
      .get("/habits/analysis", { params: { year: selectedYear, month: selectedMonth } })
      .then((res) => setApiData(res.data))
      .catch(() => setApiData(null))
      .finally(() => setLoading(false));
  }, [isDemoMode, user, selectedYear, selectedMonth]);

  const { daily, breakLengths, longestStreak } = useMemo(() => {
    if (!apiData?.days?.length) return { daily: [], breakLengths: [], longestStreak: 0 };

    const isCurrentMonth =
      selectedYear === String(NOW.getFullYear()) &&
      selectedMonth === String(NOW.getMonth() + 1).padStart(2, "0");
    const todayStr = `${NOW.getFullYear()}-${String(NOW.getMonth() + 1).padStart(2, "0")}-${String(NOW.getDate()).padStart(2, "0")}`;

    const sourceDays = apiData.days.filter((d) => !isCurrentMonth || d.date <= todayStr);

    const breaks = [];
    let longestSt = 0;
    let currentSt = 0;

    const builtDaily = sourceDays.map((d) => {
      const dayNum = parseInt(d.date.split("-")[2], 10);
      const isToday = d.date === todayStr;
      const fullyCompleted = d.total > 0 && d.completed >= d.total;
      // Match navbar streak behavior: keep yesterday's streak visible until today is fully completed
      // or the day actually rolls over into a miss.
      const shouldCarryTodayStreak = isToday && d.total > 0 && d.completed < d.total;

      if (fullyCompleted) {
        currentSt++;
        longestSt = Math.max(longestSt, currentSt);
      } else if (d.total > 0 && !shouldCarryTodayStreak) {
        if (currentSt > 0) breaks.push(currentSt);
        currentSt = 0;
      }

      return {
        day: dayNum,
        weekday: d.weekday,
        maintained: d.completed,
        breaks: d.missed,
        avgStreak: currentSt,
        consistencyScore: clamp(d.score ?? 0, 0, 100),
        fullyCompleted,
      };
    });

    return { daily: builtDaily, breakLengths: breaks, longestStreak: longestSt };
  }, [apiData, selectedYear, selectedMonth]);

  const weeklyScoreSeries = useMemo(() => buildWeeklyScoreSeries(daily), [daily]);
  const weekdayConsistencySeries = useMemo(() => buildWeekdayConsistencySeries(daily), [daily]);
  const streakSeries = daily.map((day) => ({ day: day.day, value: day.avgStreak }));

  const hasData = daily.length > 0;
  const fullCompletionDays = daily.filter((d) => d.fullyCompleted).length;
  const maintainedHabitCount = apiData?.habits?.filter((h) => h.missed === 0).length ?? 0;
  const brokenHabitCount = apiData?.habits?.filter((h) => h.missed > 0).length ?? 0;
  const commonBreakLength = getMostCommonBreakLength(breakLengths);
  const longestHabitStreak = longestStreak;
  const avgStreakLength = round(average(daily.map((day) => day.avgStreak)));
  const avgWeeklyScore = round(average(weeklyScoreSeries.map((week) => week.value)));
  const avgConsistencyScore = round(average(daily.map((day) => day.consistencyScore)));
  const bestConsistentDay = weekdayConsistencySeries.length
    ? weekdayConsistencySeries.reduce((best, current) => (current.value > best.value ? current : best))
    : { label: "—", value: 0 };
  const worstConsistentDay = weekdayConsistencySeries.length
    ? weekdayConsistencySeries.reduce((worst, current) => (current.value < worst.value ? current : worst))
    : { label: "—", value: 0 };

  const insights = [
    {
      title: "Full Completion Days",
      value: `${fullCompletionDays} days`,
      description: "Days where every expected habit was completed — matches the streak counter in the navbar.",
    },
    {
      title: "Avg Frequency Of Streak Break",
      value: commonBreakLength.length ? `After ${commonBreakLength.length} days` : "No breaks",
      description: commonBreakLength.length
        ? `Most habit streak breaks happened after ${commonBreakLength.length} consecutive days (${commonBreakLength.count} times).`
        : "No habit streak broke in this selected month.",
    },
    {
      title: "Longest Habit Streak This Month",
      value: `${longestHabitStreak} days`,
      description: "Longest consecutive full-completion-day streak in this month.",
    },
    {
      title: "Habits With No Break",
      value: `${maintainedHabitCount} habits`,
      description: "Habits with no missed days in the selected month.",
    },
    {
      title: "Habits With Streak Break",
      value: `${brokenHabitCount} habits`,
      description: "Habits that had at least one missed day in the selected month.",
    },
    {
      title: "Avg Streak Length",
      value: `${avgStreakLength} days`,
      description: "Average daily running streak length across the selected month.",
    },
    {
      title: "Avg Weekly Score",
      value: `${avgWeeklyScore}`,
      description: "Average consistency score across W1 to W4.",
    },
    {
      title: "Avg Consistency Score",
      value: `${avgConsistencyScore}`,
      description: "Average daily consistency score based on habits completed vs. expected.",
    },
    {
      title: "Best Consistent Day",
      value: `${bestConsistentDay.label} (${bestConsistentDay.value})`,
      description: "Weekday with the highest average consistency score.",
    },
    {
      title: "Worst Consistent Day",
      value: `${worstConsistentDay.label} (${worstConsistentDay.value})`,
      description: "Weekday with the lowest average consistency score.",
    },
  ];

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2 text-sm text-stone-300">
          <span className="text-stone-400">Year</span>
          <select
            value={selectedYear}
            onChange={(event) => setSelectedYear(event.target.value)}
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
            {MONTH_OPTIONS.map((month) => (
              <option key={month.value} value={month.value} className="bg-stone-950 text-stone-200">
                {month.label}
              </option>
            ))}
          </select>
        </label>

        <span className="ml-auto flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          Live
        </span>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />
        </div>
      ) : !hasData ? (
        <div className="flex h-64 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.03]">
          <p className="text-sm text-stone-500">No habit data for this period.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
          <div
            className="journal-scroll min-w-0 flex-1 scroll-smooth overflow-y-auto rounded-[2rem] border border-sky-100/10 bg-white/[0.03] shadow-2xl shadow-black/30 backdrop-blur"
            style={{ maxHeight: "calc(100vh - 350px)" }}
          >
            <div className="space-y-6 p-6">
              <StreakLineGraph series={streakSeries} daysInMonth={daily.length} />

              <VerticalScoreGraph
                title="Avg Weekly Score"
                subtitle="4 Week Breakdown"
                series={weeklyScoreSeries}
                theme={{
                  dot: "bg-amber-300",
                  fill: "bg-gradient-to-t from-amber-900/95 to-amber-300/90",
                  border: "border-amber-200/25",
                  value: "text-amber-200",
                }}
              />

              <VerticalScoreGraph
                title="Consistency Score Analysis"
                subtitle="Consistency by Weekday"
                series={weekdayConsistencySeries}
                theme={{
                  dot: "bg-emerald-300",
                  fill: "bg-gradient-to-t from-emerald-900/95 to-emerald-300/90",
                  border: "border-emerald-200/25",
                  value: "text-emerald-200",
                }}
              />
            </div>
          </div>

          <div
            className="journal-scroll flex w-full lg:max-w-[360px] lg:shrink-0 self-start flex-col gap-2 scroll-smooth overflow-y-auto"
            style={{ maxHeight: "calc(100vh - 180px)" }}
          >
            <InsightRail insights={insights} />
          </div>
        </div>
      )}
    </section>
  );
}
