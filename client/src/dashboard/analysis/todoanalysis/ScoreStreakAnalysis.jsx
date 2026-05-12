import { useEffect, useMemo, useState } from "react";
import { motion as Motion } from "framer-motion";
import littleMonkLogo from "../../../assets/littlemonklogo.png";
import api from "../../../api/axios";
import useAuth from "../../../hooks/useAuth";

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

const DEMO_SCORE_MONTH_CONFIG = [
  { year: "2026", month: "04", seed: 5, skippedDays: [6, 14, 21, 30] },
  { year: "2026", month: "03", seed: 3, skippedDays: [2, 11, 18, 24, 29] },
  { year: "2026", month: "02", seed: 1, skippedDays: [4, 9, 15, 23] },
  { year: "2025", month: "12", seed: 6, skippedDays: [5, 12, 19, 26] },
];

const BAR_H = 190;
const LABEL_H = 56;
const CHART_HEADROOM = 16;

const NOW = new Date();
const YEARS = Array.from({ length: 4 }, (_, i) => String(NOW.getFullYear() - i));

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const round = (value, precision = 1) => Number(value.toFixed(precision));
const average = (values) => (values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0);

function getDaysInMonth(year, month) {
  return new Date(Number(year), Number(month), 0).getDate();
}

function generateMonthLogs(year, month, seed, skippedDays) {
  const days = getDaysInMonth(year, month);
  return Array.from({ length: days }, (_, index) => {
    const day = index + 1;
    const date = `${year}-${month}-${String(day).padStart(2, "0")}`;
    const weekday = new Date(`${date}T00:00:00`).toLocaleDateString("en-US", { weekday: "short" });
    const submitted = !skippedDays.includes(day);
    const weekendBoost = weekday === "Sun" || weekday === "Sat" ? 3 : 0;
    const dip = day % 6 === 0 ? 4 : 0;
    const consistencyScore = submitted ? clamp(58 + ((day * 7 + seed * 9) % 36) + weekendBoost - dip, 40, 98) : 0;

    return {
      day,
      date,
      weekday,
      submitted,
      consistencyScore,
    };
  });
}

const DEMO_SCORE_MONTH_LOGS = DEMO_SCORE_MONTH_CONFIG.map((entry) => ({
  year: entry.year,
  month: entry.month,
  logs: generateMonthLogs(entry.year, entry.month, entry.seed, entry.skippedDays),
}));

function buildWeekdayConsistencySeries(logs) {
  return DAY_ORDER.map((day) => {
    const values = logs.filter((item) => item.submitted && item.weekday === day).map((item) => item.consistencyScore);
    return {
      label: day,
      value: values.length ? round(average(values)) : 0,
    };
  });
}

function buildWeeklyScoreSeries(logs) {
  return [1, 2, 3, 4].map((weekNumber) => {
    const start = (weekNumber - 1) * 7 + 1;
    const end = weekNumber * 7;
    const values = logs
      .filter((item) => item.day >= start && item.day <= end && item.submitted)
      .map((item) => item.consistencyScore);

    return {
      label: `W${weekNumber}`,
      value: values.length ? round(average(values)) : 0,
    };
  });
}

function buildStreakSeries(logs) {
  const series = [];
  let streak = 0;
  for (const item of logs) {
    streak = item.submitted ? streak + 1 : 0;
    series.push({ day: item.day, streak, submitted: item.submitted });
  }
  return series;
}

function countStreakBreaks(logs) {
  let breaks = 0;
  for (let index = 1; index < logs.length; index += 1) {
    if (logs[index - 1].submitted && !logs[index].submitted) breaks += 1;
  }
  return breaks;
}

function maxStreak(logs) {
  let current = 0;
  let best = 0;
  for (const item of logs) {
    current = item.submitted ? current + 1 : 0;
    best = Math.max(best, current);
  }
  return best;
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

function VerticalScoreGraph({ title, subtitle, series, theme }) {
  const [hovered, setHovered] = useState(null);
  const yMax = 100;
  const ticks = [0, 20, 40, 60, 80, 100];
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
          <span className={`h-2.5 w-2.5 rounded-full ${theme.dot}`} />
          Score
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
                style={{ bottom: LABEL_H + (tick / yMax) * drawableBarH }}
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
                  <span className={`mb-1 text-[10px] font-semibold ${theme.value}`}>{item.value}</span>
                  <Motion.div
                    className={`w-full max-w-[42px] rounded-t-xl border ${theme.border} ${theme.fill}`}
                    initial={{ height: 0 }}
                    animate={{ height: Math.max(10, Math.round((item.value / yMax) * drawableBarH)) }}
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

function StreakBreakLineGraph({ series, daysInMonth }) {
  const [hovered, setHovered] = useState(null);
  const width = Math.max(920, daysInMonth * 28);
  const height = 304;
  const pad = { top: 24, right: 20, bottom: 42, left: 42 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;
  const maxStreakValue = Math.max(7, ...series.map((item) => item.streak));
  const yMarks = Array.from({ length: maxStreakValue + 1 }, (_, index) => index).filter(
    (value) => value % 2 === 0 || value === maxStreakValue
  );

  const xOf = (index) => (series.length === 1 ? pad.left + chartW / 2 : pad.left + (index / (series.length - 1)) * chartW);
  const yOf = (value) => pad.top + ((maxStreakValue - value) / maxStreakValue) * chartH;
  const linePath = series
    .map((point, index) => `${index === 0 ? "M" : "L"}${xOf(index).toFixed(1)},${yOf(point.streak).toFixed(1)}`)
    .join(" ");

  return (
    <section className="rounded-[1.75rem] border border-sky-100/10 bg-stone-950/30 p-5 shadow-xl shadow-black/20">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-stone-500">Streak</p>
          <h4 className="mt-2 text-xl font-semibold text-sky-50">Streak Break Analysis</h4>
          <p className="mt-1 text-[11px] text-stone-400">x-axis shows date number (1 to {daysInMonth}).</p>
        </div>
        <div className="flex items-center gap-3 text-xs text-stone-400">
          <span className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-sky-400" />
            Streak count
          </span>
          <span className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-300" />
            Break day
          </span>
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
            transition={{ duration: 2.8, ease: "easeInOut" }}
          />

          {series.map((point, index) => {
            const x = xOf(index);
            const y = yOf(point.streak);
            const isBreak = !point.submitted;
            return (
              <circle
                key={`pt-${point.day}`}
                cx={x}
                cy={y}
                r={hovered === index ? 7 : 4.2}
                fill={hovered === index ? (isBreak ? "#fda4af" : "#38bdf8") : (isBreak ? "rgba(251,113,133,0.3)" : "#0f172a")}
                stroke={isBreak ? "#fda4af" : "#7dd3fc"}
                strokeWidth="2"
                style={{ transition: "r 0.15s ease, fill 0.15s ease" }}
              />
            );
          })}

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

          {(() => {
            if (hovered === null || !series[hovered]) return null;
            const point = series[hovered];
            const x = xOf(hovered);
            const y = yOf(point.streak);
            const ttW = 76;
            const ttH = 34;
            const ttX = Math.min(Math.max(x - ttW / 2, pad.left + 2), width - pad.right - ttW - 2);
            const ttY = Math.max(y - ttH - 10, pad.top + 2);
            return (
              <g style={{ pointerEvents: "none" }}>
                <line x1={x} y1={pad.top} x2={x} y2={pad.top + chartH} stroke="rgba(56,189,248,0.4)" strokeWidth="1" strokeDasharray="4 3" />
                <rect x={ttX} y={ttY} width={ttW} height={ttH} rx="6" fill="rgba(15,23,42,0.92)" stroke="rgba(56,189,248,0.4)" strokeWidth="1" />
                <text x={ttX + ttW / 2} y={ttY + 13} textAnchor="middle" fontSize="11" fontWeight="700" fill={point.submitted ? "#bae6fd" : "#fda4af"}>
                  {point.submitted ? `Streak: ${point.streak}` : "Break"}
                </text>
                <text x={ttX + ttW / 2} y={ttY + 26} textAnchor="middle" fontSize="9" fill="rgba(148,163,184,0.8)">
                  Day {point.day}
                </text>
              </g>
            );
          })()}

          {(() => {
            const stepW = series.length > 1 ? chartW / (series.length - 1) : chartW;
            return series.map((point, index) => (
              <rect
                key={`hz-${index}`}
                x={Math.max(pad.left, xOf(index) - stepW / 2)}
                y={pad.top}
                width={stepW}
                height={chartH}
                fill="transparent"
                style={{ cursor: "crosshair" }}
                onMouseEnter={() => setHovered(index)}
                onMouseLeave={() => setHovered(null)}
              />
            ));
          })()}
        </svg>
      </div>
    </section>
  );
}

export default function ScoreStreakAnalysis() {
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

  const logs = useMemo(() => {
    if (isDemoMode) {
      const demo = DEMO_SCORE_MONTH_LOGS.find(d => d.year === selectedYear && d.month === selectedMonth)
        ?? DEMO_SCORE_MONTH_LOGS[0];
      return demo.logs;
    }
    if (!apiData) return [];
    const isCurrentMonthSelected = selectedYear === String(NOW.getFullYear()) && selectedMonth === String(NOW.getMonth() + 1).padStart(2, "0");
    const todayStr = `${NOW.getFullYear()}-${String(NOW.getMonth() + 1).padStart(2, "0")}-${String(NOW.getDate()).padStart(2, "0")}`;
    return apiData.days
      .filter(d => !isCurrentMonthSelected || d.date <= todayStr)
      .map(d => ({
        day: parseInt(d.date.slice(8), 10),
        date: d.date,
        weekday: d.weekday,
        // Exclude today: pending tasks are stripped from today's total in the API,
        // making completed > 0 trivially true. Only past days count toward streak.
        submitted: d.completed > 0 && d.date < todayStr,
        consistencyScore: d.score ?? 0,
      }));
  }, [isDemoMode, apiData, selectedYear, selectedMonth]);

  const daysInMonth = logs.length;
  const weekdayConsistencySeries = useMemo(() => buildWeekdayConsistencySeries(logs), [logs]);
  const weeklyScoreSeries        = useMemo(() => buildWeeklyScoreSeries(logs),        [logs]);
  const streakSeries             = useMemo(() => buildStreakSeries(logs),              [logs]);

  const avgConsistencyScore = round(average(logs.filter(l => l.submitted).map(l => l.consistencyScore)));
  const avgWeeklyScore      = round(average(weeklyScoreSeries.map(s => s.value)));
  const sortableDays        = weekdayConsistencySeries.filter(d => d.value > 0);
  const highestConsistentDay = sortableDays.length ? sortableDays.reduce((b, c) => c.value > b.value ? c : b) : null;
  const lowestConsistentDay  = sortableDays.length ? sortableDays.reduce((b, c) => c.value < b.value ? c : b) : null;
  const thisWeekStart        = Math.max(1, daysInMonth - 6);
  const thisWeekLogs         = logs.filter(l => l.day >= thisWeekStart);
  const streakBreaksThisWeek = countStreakBreaks(thisWeekLogs);
  const highestStreakThisWeek = maxStreak(thisWeekLogs);

  const isCurrentMonth = selectedYear === String(NOW.getFullYear()) && selectedMonth === String(NOW.getMonth() + 1).padStart(2, "0");

  const insights = [
    { title: "Avg Consistency Score",        value: logs.length ? `${avgConsistencyScore}` : "No data",                                            description: "Average day consistency score for the selected month." },
    { title: "Highest Consistent Day",       value: highestConsistentDay ? `${highestConsistentDay.label} (${highestConsistentDay.value})` : "No data", description: "Weekday with the highest average consistency score." },
    { title: "Lowest Consistent Day",        value: lowestConsistentDay  ? `${lowestConsistentDay.label} (${lowestConsistentDay.value})`   : "No data", description: "Weekday with the lowest average consistency score." },
    { title: "No. of Streak Break (This Week)", value: `${streakBreaksThisWeek}`,  description: `Break count from day ${thisWeekStart} to day ${daysInMonth}.` },
    { title: "Highest Streak (This Week)",   value: `${highestStreakThisWeek}`,    description: "Highest consecutive submitted-day streak in the current week window." },
    { title: "Avg Weekly Score",             value: logs.length ? `${avgWeeklyScore}` : "No data", description: "Average of W1 to W4 weekly score values." },
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

      {loading ? (
        <div className="space-y-3">
          <div className="h-48 animate-pulse rounded-2xl border border-sky-100/10 bg-white/[0.03]" />
          <div className="h-36 animate-pulse rounded-2xl border border-sky-100/10 bg-white/[0.03]" />
        </div>
      ) : (
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        <div
          className="journal-scroll min-w-0 flex-1 scroll-smooth overflow-y-auto rounded-[2rem] border border-sky-100/10 bg-white/[0.03] shadow-2xl shadow-black/30 backdrop-blur"
          style={{ maxHeight: "calc(100vh - 350px)" }}
        >
          <div className="space-y-6 p-6">
            <StreakBreakLineGraph series={streakSeries} daysInMonth={daysInMonth} />
            <VerticalScoreGraph
              title="Consistency Score Analysis"
              subtitle="Consistency by Day"
              series={weekdayConsistencySeries}
              theme={{ dot: "bg-emerald-300", fill: "bg-gradient-to-t from-emerald-900/95 to-emerald-300/90", border: "border-emerald-200/25", value: "text-emerald-200" }}
            />
            <VerticalScoreGraph
              title="Weekly Score Analysis"
              subtitle="4 Week Breakdown"
              series={weeklyScoreSeries}
              theme={{ dot: "bg-amber-300", fill: "bg-gradient-to-t from-amber-900/95 to-amber-300/90", border: "border-amber-200/25", value: "text-amber-200" }}
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
