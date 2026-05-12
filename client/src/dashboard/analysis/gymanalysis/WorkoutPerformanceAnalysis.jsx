import { useEffect, useMemo, useState } from "react";
import { motion as Motion } from "framer-motion";
import littleMonkLogo from "../../../assets/littlemonklogo.png";
import api from "../../../api/axios";
import useAuth from "../../../hooks/useAuth";

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

const BODY_GROUPS = ["Chest", "Back", "Shoulders", "Arms", "Legs", "Core"];
const DAY_ORDER = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const REST_DAYS = ["Sun"];

const NOW = new Date();
const YEARS = Array.from({ length: NOW.getFullYear() - 2023 }, (_, i) => String(NOW.getFullYear() - i));
const CURRENT_MONTH = String(NOW.getMonth() + 1).padStart(2, "0");

const round = (v, p = 1) => Number(v.toFixed(p));

function InsightRail({ insights }) {
  const [selected, setSelected] = useState(null);

  return (
    <aside className="flex w-full flex-col overflow-hidden rounded-2xl border border-amber-100/10 bg-white/6 shadow-xl shadow-black/25 backdrop-blur">
      <div className="shrink-0 px-4 pb-3 pt-4">
        <div className="flex items-center gap-3">
          <Motion.div
            className="relative grid h-12 w-12 place-items-center"
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
      <div className="journal-scroll max-h-[450px] space-y-2.5 overflow-y-auto px-4 pb-4 pr-3">
        {insights.map((insight) => {
          const isSelected = selected === insight.title;
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
                  onClick={() => setSelected(isSelected ? null : insight.title)}
                  className={`w-fit rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors ${
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

const DAY_PERFORMANCE_BAR_H = 170;
const DAY_PERFORMANCE_LABEL_H = 24;
const DAY_PERFORMANCE_CHART_HEADROOM = 18;

function DayWisePerformanceChart({ sessions }) {
  const [hovered, setHovered] = useState(null);
  const drawableBarH = DAY_PERFORMANCE_BAR_H - DAY_PERFORMANCE_CHART_HEADROOM;

  const dayPerformance = useMemo(() => {
    const stats = Object.fromEntries(DAY_ORDER.map((d) => [d, { day: d, sessions: 0, volume: 0, exercises: 0 }]));
    sessions.forEach((s) => {
      if (!stats[s.day] || REST_DAYS.includes(s.day)) return;
      stats[s.day].sessions += 1;
      stats[s.day].volume += s.volume;
      stats[s.day].exercises += s.exerciseCount;
    });
    return DAY_ORDER.map((day) => ({
      ...stats[day],
      isRestDay: REST_DAYS.includes(day),
      avgExercises: stats[day].sessions ? Math.round(stats[day].exercises / stats[day].sessions) : 0,
    }));
  }, [sessions]);

  const maxVolume = Math.max(1, ...dayPerformance.map((d) => d.volume));
  const formatVolume = (value) => (value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value);

  return (
    <section className="rounded-[1.75rem] border border-sky-100/10 bg-stone-950/30 p-5 shadow-xl shadow-black/20">
      <div>
        <p className="text-[11px] uppercase tracking-[0.22em] text-stone-500">Monthly Performance</p>
        <h4 className="mt-2 text-xl font-semibold text-sky-50">Day Wise Performance</h4>
        <p className="mt-1 text-[11px] text-stone-400">Total training volume by weekday</p>
      </div>
      <div className="mt-6 overflow-x-auto pb-1">
        <div
          className="grid min-w-[620px] grid-cols-[2rem_1fr] gap-3"
          style={{ gridTemplateRows: `${DAY_PERFORMANCE_BAR_H}px ${DAY_PERFORMANCE_LABEL_H}px` }}
        >
          <div
            className="relative text-right text-[11px] font-semibold text-stone-400"
            style={{ height: DAY_PERFORMANCE_BAR_H }}
          >
            {[0, Math.round(maxVolume / 2), maxVolume].map((tick) => (
              <span
                key={tick}
                className="absolute right-0 rounded bg-stone-950/70 px-1"
                style={{ bottom: tick === 0 ? -6 : Math.round((tick / maxVolume) * drawableBarH) - 6 }}
              >
                {formatVolume(tick)}
              </span>
            ))}
          </div>

          <div className="relative" style={{ height: DAY_PERFORMANCE_BAR_H }}>
            {[0, 0.5, 1].map((ratio) => (
              <div
                key={ratio}
                className="absolute left-0 right-0 border-t border-dashed border-white/6"
                style={{ bottom: ratio * drawableBarH }}
              />
            ))}
            <div className="absolute inset-0 flex items-end justify-between gap-4">
              {dayPerformance.map((item, index) => (
                <div
                  key={item.day}
                  className="relative flex h-full min-w-0 flex-1 cursor-default flex-col items-center justify-end"
                  style={{ opacity: hovered !== null && hovered !== index ? 0.4 : 1, transition: "opacity 0.18s ease" }}
                  onMouseEnter={() => setHovered(index)}
                  onMouseLeave={() => setHovered(null)}
                >
                  {hovered === index && (
                    <Motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`absolute bottom-full z-10 mb-2 w-max rounded-lg border px-2.5 py-1.5 text-center shadow-xl shadow-black/35 ${
                        item.isRestDay
                          ? "border-stone-500/25 bg-stone-950/95"
                          : "border-amber-300/25 bg-stone-950/95"
                      }`}
                    >
                      {item.isRestDay ? (
                        <>
                          <p className="text-[10px] font-bold text-stone-300">Rest Day</p>
                          <p className="text-[9px] text-stone-500">Recovery locked for Sunday</p>
                        </>
                      ) : (
                        <>
                          <p className="text-[10px] font-bold text-amber-200">{formatVolume(item.volume)} kg</p>
                          <p className="text-[9px] text-stone-400">{item.sessions} sessions · {item.avgExercises} ex avg</p>
                        </>
                      )}
                    </Motion.div>
                  )}
                  <span className={`mb-1 text-[10px] font-semibold ${item.isRestDay ? "text-stone-500" : "text-amber-200"}`}>
                    {item.isRestDay ? "Rest" : formatVolume(item.volume)}
                  </span>
                  <Motion.div
                    className={`w-full max-w-[44px] rounded-t-lg border ${
                      item.isRestDay
                        ? "border-stone-500/20 bg-gradient-to-t from-stone-900/70 to-stone-600/55"
                        : "border-amber-200/25 bg-gradient-to-t from-amber-900/95 to-amber-300/85"
                    }`}
                    initial={{ height: 0 }}
                    animate={{
                      height: item.isRestDay ? 16 : item.volume === 0 ? 4 : Math.max(8, Math.round((item.volume / maxVolume) * drawableBarH)),
                    }}
                    transition={{ duration: 0.4, delay: index * 0.05 }}
                  />
                </div>
              ))}
            </div>
          </div>

          <div />
          <div className="grid grid-cols-7 gap-4 pt-2 text-center text-[11px] font-semibold text-stone-400">
            {dayPerformance.map((item) => (
              <span key={item.day} className={item.isRestDay ? "text-stone-500" : ""}>
                {item.day}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function VolumeTrendChart({ sessions }) {
  const [hovered, setHovered] = useState(null);
  if (!sessions.length) return null;

  const width = Math.max(600, sessions.length * 56);
  const height = 280;
  const pad = { top: 24, right: 22, bottom: 42, left: 52 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;
  const maxVol = Math.max(1, ...sessions.map((s) => s.volume));
  const minVol = Math.min(...sessions.map((s) => s.volume));
  const volRange = maxVol - minVol || 1;

  const xOf = (i) =>
    sessions.length === 1 ? pad.left + chartW / 2 : pad.left + (i / (sessions.length - 1)) * chartW;
  const yOf = (v) => pad.top + ((maxVol - v) / volRange) * chartH;

  const linePath = sessions
    .map((s, i) => `${i === 0 ? "M" : "L"}${xOf(i).toFixed(1)},${yOf(s.volume).toFixed(1)}`)
    .join(" ");

  const areaPath = `${linePath} L${xOf(sessions.length - 1).toFixed(1)},${(pad.top + chartH).toFixed(1)} L${xOf(0).toFixed(1)},${(pad.top + chartH).toFixed(1)} Z`;

  const yTicks = [minVol, Math.round((minVol + maxVol) / 2), maxVol];

  return (
    <section className="rounded-[1.75rem] border border-sky-100/10 bg-stone-950/30 p-5 shadow-xl shadow-black/20">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-stone-500">Session Volume</p>
          <h4 className="mt-2 text-xl font-semibold text-sky-50">Total Volume Lifted Per Session</h4>
          <p className="mt-1 text-[11px] text-stone-400">Volume = sets × reps × weight (kg) per session</p>
        </div>
        <span className="flex items-center gap-2 text-xs text-stone-400">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          Volume (kg)
        </span>
      </div>
      <div className="mt-5 overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ minWidth: `${width}px` }}>
          <defs>
            <linearGradient id="volAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity={hovered !== null ? "0.34" : "0.22"} />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.01" />
            </linearGradient>
            <filter id="volPointGlow" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feColorMatrix
                in="blur"
                type="matrix"
                values="1 0 0 0 0.96 0 0.72 0 0 0.58 0 0 0.32 0 0.05 0 0 0 0.75 0"
              />
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {yTicks.map((tick) => {
            const y = yOf(tick);
            return (
              <g key={tick}>
                <line x1={pad.left} y1={y} x2={width - pad.right} y2={y} stroke="rgba(255,255,255,0.07)" strokeDasharray="4 6" />
                <text x={pad.left - 8} y={y + 4} textAnchor="end" fontSize="10" fill="rgba(255,255,255,0.4)">
                  {tick >= 1000 ? `${(tick / 1000).toFixed(1)}k` : tick}
                </text>
              </g>
            );
          })}
          {hovered !== null && sessions[hovered] ? (
            <Motion.rect
              x={Math.max(pad.left, xOf(hovered) - chartW / sessions.length / 2)}
              y={pad.top}
              width={chartW / sessions.length}
              height={chartH}
              rx="8"
              fill="rgba(251,191,36,0.08)"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.16 }}
              style={{ pointerEvents: "none" }}
            />
          ) : null}
          <Motion.path
            d={areaPath}
            fill="url(#volAreaGrad)"
            animate={{ opacity: hovered !== null ? 1 : 0.82 }}
            transition={{ duration: 0.18 }}
          />
          <Motion.path
            d={linePath}
            fill="none"
            stroke="#f59e0b"
            strokeWidth={hovered !== null ? "3.2" : "2.5"}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: hovered !== null ? 0.18 : 2.2, ease: "easeInOut" }}
          />
          {sessions.map((s, i) => (
            <Motion.circle
              key={s.date}
              cx={xOf(i)}
              cy={yOf(s.volume)}
              r={hovered === i ? 8 : 4}
              fill={hovered === i ? "#f59e0b" : "#0f172a"}
              stroke="#fbbf24"
              strokeWidth={hovered === i ? 3 : 2}
              filter={hovered === i ? "url(#volPointGlow)" : undefined}
              animate={{ opacity: hovered !== null && hovered !== i ? 0.42 : 1 }}
              transition={{ duration: 0.16 }}
              style={{ cursor: "crosshair" }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            />
          ))}
          {sessions.map((s, i) => (
            <text
              key={`x-${s.date}`}
              x={xOf(i)}
              y={height - 10}
              textAnchor="middle"
              fontSize="9"
              fill="rgba(255,255,255,0.38)"
            >
              {s.date.slice(5)}
            </text>
          ))}
          {hovered !== null && sessions[hovered] ? (
            <g style={{ pointerEvents: "none" }}>
              <line
                x1={xOf(hovered)}
                y1={pad.top}
                x2={xOf(hovered)}
                y2={pad.top + chartH}
                stroke="rgba(251,191,36,0.38)"
                strokeWidth="1"
                strokeDasharray="4 3"
              />
              <rect
                x={Math.min(Math.max(xOf(hovered) - 58, pad.left), width - pad.right - 116)}
                y={Math.max(yOf(sessions[hovered].volume) - 52, pad.top + 2)}
                width="116"
                height="42"
                rx="7"
                fill="rgba(15,23,42,0.94)"
                stroke="rgba(251,191,36,0.4)"
                strokeWidth="1"
              />
              <text
                x={Math.min(Math.max(xOf(hovered), pad.left + 60), width - pad.right - 58)}
                y={Math.max(yOf(sessions[hovered].volume) - 32, pad.top + 20)}
                textAnchor="middle"
                fontSize="11"
                fontWeight="700"
                fill="#fde68a"
              >
                {sessions[hovered].date.slice(5)}
              </text>
              <text
                x={Math.min(Math.max(xOf(hovered), pad.left + 60), width - pad.right - 58)}
                y={Math.max(yOf(sessions[hovered].volume) - 16, pad.top + 36)}
                textAnchor="middle"
                fontSize="10"
                fill="rgba(226,232,240,0.86)"
              >
                {sessions[hovered].volume.toLocaleString()} kg vol
              </text>
            </g>
          ) : null}
          {sessions.map((s, i) => {
            const bandW = chartW / sessions.length;
            return (
              <rect
                key={`hover-${s.date}`}
                x={Math.max(pad.left, xOf(i) - bandW / 2)}
                y={pad.top}
                width={bandW}
                height={chartH}
                fill="transparent"
                style={{ cursor: "crosshair" }}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              />
            );
          })}
        </svg>
      </div>
    </section>
  );
}

function BodyPartSplitChart({ sessions }) {
  const [hoveredGroup, setHoveredGroup] = useState(null);

  const groupCounts = useMemo(() => {
    const counts = Object.fromEntries(BODY_GROUPS.map((g) => [g, 0]));
    sessions.forEach((s) => s.bodyGroups.forEach((g) => { if (counts[g] !== undefined) counts[g]++; }));
    const total = sessions.length || 1;
    return BODY_GROUPS.map((g) => ({
      group: g,
      count: counts[g],
      pct: Math.round((counts[g] / total) * 100),
    })).sort((a, b) => b.count - a.count);
  }, [sessions]);

  const totalTargets = groupCounts.reduce((sum, item) => sum + item.count, 0) || 1;
  const topGroup = groupCounts[0] ?? { group: "—", count: 0, pct: 0 };
  const activeGroup = hoveredGroup ?? topGroup.group;
  const activeItem = groupCounts.find((item) => item.group === activeGroup) ?? topGroup;
  const circumference = 2 * Math.PI * 68;

  const GROUP_COLORS = {
    Chest: "#fb7185",
    Back: "#38bdf8",
    Shoulders: "#a78bfa",
    Arms: "#f59e0b",
    Legs: "#34d399",
    Core: "#fb923c",
  };

  const GROUP_TEXT_COLORS = {
    Chest: "text-rose-200",
    Back: "text-sky-200",
    Shoulders: "text-violet-200",
    Arms: "text-amber-200",
    Legs: "text-emerald-200",
    Core: "text-orange-200",
  };

  let runningOffset = 0;

  return (
    <section className="rounded-[1.75rem] border border-sky-100/10 bg-stone-950/30 p-5 shadow-xl shadow-black/20">
      <div>
        <p className="text-[11px] uppercase tracking-[0.22em] text-stone-500">Training Split</p>
        <h4 className="mt-2 text-xl font-semibold text-sky-50">Body Group Distribution</h4>
        <p className="mt-1 text-[11px] text-stone-400">Sessions that targeted each muscle group</p>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(220px,0.8fr)_1fr] lg:items-center">
        <div className="relative mx-auto aspect-square w-full max-w-[280px]">
          <Motion.div
            className="absolute inset-4 rounded-full bg-amber-400/8 blur-2xl"
            animate={{ opacity: [0.25, 0.55, 0.25], scale: [0.92, 1.04, 0.92] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
          />
          <svg viewBox="0 0 180 180" className="relative z-10 h-full w-full -rotate-90 drop-shadow-[0_16px_35px_rgba(0,0,0,0.32)]">
            <circle cx="90" cy="90" r="68" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="28" />
            {groupCounts.map((item, index) => {
              const slice = (item.count / totalTargets) * circumference;
              const dashOffset = -runningOffset;
              runningOffset += slice;
              const isActive = activeGroup === item.group;

              return (
                <Motion.circle
                  key={item.group}
                  cx="90"
                  cy="90"
                  r="68"
                  fill="none"
                  stroke={GROUP_COLORS[item.group] ?? "#a8a29e"}
                  strokeWidth={isActive ? 32 : 26}
                  strokeDasharray={`${slice} ${circumference - slice}`}
                  strokeDashoffset={dashOffset}
                  strokeLinecap="round"
                  initial={{ strokeDasharray: `0 ${circumference}`, opacity: 0 }}
                  animate={{
                    strokeDasharray: `${slice} ${circumference - slice}`,
                    opacity: hoveredGroup && !isActive ? 0.34 : 0.96,
                  }}
                  transition={{ duration: 0.8, delay: index * 0.08, ease: "easeOut" }}
                  className="cursor-pointer transition-[stroke-width]"
                  onMouseEnter={() => setHoveredGroup(item.group)}
                  onMouseLeave={() => setHoveredGroup(null)}
                />
              );
            })}
          </svg>
          <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center text-center">
            <Motion.div
              key={activeItem.group}
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.22 }}
              className="rounded-2xl border border-white/8 bg-stone-950/70 px-4 py-3 shadow-xl shadow-black/30 backdrop-blur"
            >
              <p className={`text-sm font-bold ${GROUP_TEXT_COLORS[activeItem.group] ?? "text-stone-200"}`}>
                {activeItem.group}
              </p>
              <p className="mt-1 text-2xl font-black text-stone-50">
                {Math.round((activeItem.count / totalTargets) * 100)}%
              </p>
              <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-500">
                {activeItem.count} targets
              </p>
            </Motion.div>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {groupCounts.map((item, index) => {
            const isActive = activeGroup === item.group;
            return (
              <Motion.button
                key={item.group}
                type="button"
                onMouseEnter={() => setHoveredGroup(item.group)}
                onMouseLeave={() => setHoveredGroup(null)}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: hoveredGroup && !isActive ? 0.45 : 1, x: 0 }}
                transition={{ duration: 0.25, delay: index * 0.04 }}
                className={`flex items-center justify-between gap-3 rounded-xl border p-3 text-left transition-colors ${
                  isActive
                    ? "border-amber-300/25 bg-white/8"
                    : "border-white/8 bg-stone-950/35 hover:border-white/16"
                }`}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className="h-3 w-3 shrink-0 rounded-full shadow-[0_0_14px_currentColor]"
                    style={{ backgroundColor: GROUP_COLORS[item.group] ?? "#a8a29e", color: GROUP_COLORS[item.group] ?? "#a8a29e" }}
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-semibold text-stone-200">{item.group}</span>
                    <span className="text-[10px] text-stone-500">{item.count} targeted sessions</span>
                  </span>
                </span>
                <span className={`text-sm font-bold ${GROUP_TEXT_COLORS[item.group] ?? "text-stone-300"}`}>
                  {item.pct}%
                </span>
              </Motion.button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default function WorkoutPerformanceAnalysis() {
  const { user } = useAuth();
  const [selectedYear, setSelectedYear] = useState(String(NOW.getFullYear()));
  const [selectedMonth, setSelectedMonth] = useState(CURRENT_MONTH);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    api
      .get(`/gym/analysis?year=${selectedYear}&month=${Number(selectedMonth)}`)
      .then((res) => { if (!cancelled) setSessions(res.data.sessions || []); })
      .catch(() => { if (!cancelled) setSessions([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user, selectedYear, selectedMonth]);

  const totalVolume = sessions.reduce((sum, s) => sum + s.volume, 0);
  const avgExercises = sessions.length ? round(sessions.reduce((sum, s) => sum + s.exerciseCount, 0) / sessions.length, 1) : 0;
  const bestVolumeSession = sessions.length ? sessions.reduce((best, s) => s.volume > best.volume ? s : best) : null;

  const mostFreqDay = (() => {
    const counts = {};
    sessions.forEach((s) => { counts[s.day] = (counts[s.day] ?? 0) + 1; });
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    return top ? `${top[0]} (${top[1]}x)` : "—";
  })();

  const bodyGroupRanking = (() => {
    const counts = Object.fromEntries(BODY_GROUPS.map((g) => [g, 0]));
    sessions.forEach((s) => s.bodyGroups.forEach((g) => { if (counts[g] !== undefined) counts[g]++; }));
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  })();
  const topGroup = bodyGroupRanking[0] ? `${bodyGroupRanking[0][0]} (${bodyGroupRanking[0][1]} sessions)` : "—";
  const leastGroupEntry = [...bodyGroupRanking].sort((a, b) => a[1] - b[1])[0];
  const leastGroup = leastGroupEntry ? `${leastGroupEntry[0]} (${leastGroupEntry[1]} sessions)` : "—";

  const dayPerformanceRanking = (() => {
    const stats = Object.fromEntries(DAY_ORDER.map((day) => [day, { day, sessions: 0, volume: 0 }]));
    sessions.forEach((s) => {
      if (!stats[s.day] || REST_DAYS.includes(s.day)) return;
      stats[s.day].sessions += 1;
      stats[s.day].volume += s.volume;
    });
    return Object.values(stats).filter((item) => !REST_DAYS.includes(item.day));
  })();
  const bestPerformanceDayEntry = [...dayPerformanceRanking].sort((a, b) => b.volume - a.volume)[0];
  const weakPerformanceDayEntry = [...dayPerformanceRanking].sort((a, b) => a.volume - b.volume)[0];
  const bestPerformanceDay = bestPerformanceDayEntry ? `${bestPerformanceDayEntry.day} (${bestPerformanceDayEntry.volume.toLocaleString()} kg)` : "—";
  const weakPerformanceDay = weakPerformanceDayEntry ? `${weakPerformanceDayEntry.day} (${weakPerformanceDayEntry.volume.toLocaleString()} kg)` : "—";

  const insights = [
    {
      title: "Total Sessions This Month",
      value: `${sessions.length} sessions`,
      description: `You trained ${sessions.length} times this month, averaging once every ${round(30 / (sessions.length || 1), 1)} days.`,
    },
    {
      title: "Total Volume Lifted",
      value: `${totalVolume.toLocaleString()} kg`,
      description: "Total volume is calculated as sets × reps × weight across all sessions.",
    },
    {
      title: "Avg Exercises Per Session",
      value: `${avgExercises} exercises`,
      description: "Average number of exercises logged per workout session this month.",
    },
    {
      title: "Most Frequent Training Day",
      value: mostFreqDay,
      description: "The day of the week you trained on most often this month.",
    },
    {
      title: "Best Performance Day",
      value: bestPerformanceDay,
      description: `Your strongest weekday by total training volume this month, across ${bestPerformanceDayEntry?.sessions ?? 0} sessions.`,
    },
    {
      title: "Weak Performance Day",
      value: weakPerformanceDay,
      description: "Your lowest-volume training weekday this month. Sunday is excluded because it is treated as a rest day.",
    },
    {
      title: "Most Targeted Body Group",
      value: topGroup,
      description: "The muscle group you hit the most times across all sessions this month.",
    },
    {
      title: "Least Targeted Body Group",
      value: leastGroup,
      description: "The muscle group you trained the least this month. Consider adding volume here if it fits your program.",
    },
    ...(bestVolumeSession ? [{
      title: "Best Volume Session",
      value: `${bestVolumeSession.date} — ${bestVolumeSession.volume.toLocaleString()} kg`,
      description: `Your highest output session this month, targeting ${bestVolumeSession.bodyGroups.join(" + ") || "various groups"}.`,
    }] : []),
  ];

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2 text-sm text-stone-300">
          <span className="text-stone-400">Year</span>
          <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="bg-transparent text-sky-100 outline-none">
            {YEARS.map((y) => <option key={y} value={y} className="bg-stone-950 text-stone-200">{y}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-2 rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2 text-sm text-stone-300">
          <span className="text-stone-400">Month</span>
          <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="bg-transparent text-sky-100 outline-none">
            {MONTH_OPTIONS.map((m) => <option key={m.value} value={m.value} className="bg-stone-950 text-stone-200">{m.label}</option>)}
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
      ) : (
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
          <div
            className="journal-scroll min-w-0 flex-1 scroll-smooth overflow-y-auto rounded-[2rem] border border-sky-100/10 bg-white/[0.03] shadow-2xl shadow-black/30 backdrop-blur"
            style={{ maxHeight: "calc(100vh - 350px)" }}
          >
            <div className="space-y-6 p-6">
              <BodyPartSplitChart sessions={sessions} />
              <DayWisePerformanceChart sessions={sessions} />
              <VolumeTrendChart sessions={sessions} />
            </div>
          </div>

          <div
            className="flex w-full lg:max-w-[360px] lg:shrink-0 self-start flex-col gap-2"
            style={{ maxHeight: "calc(100vh - 230px)" }}
          >
            <InsightRail insights={insights} />
          </div>
        </div>
      )}
    </section>
  );
}
