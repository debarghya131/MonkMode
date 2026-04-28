import { useMemo, useState } from "react";
import { motion as Motion } from "framer-motion";
import littleMonkLogo from "../../../assets/littlemonklogo.png";

const EXERCISE_PROGRESS_DATA = {
  "Bench Press": [
    { date: "2026-02-04", sets: 4, reps: 8, weight: 70 },
    { date: "2026-02-18", sets: 4, reps: 8, weight: 72.5 },
    { date: "2026-03-04", sets: 4, reps: 8, weight: 75 },
    { date: "2026-03-13", sets: 4, reps: 9, weight: 75 },
    { date: "2026-03-23", sets: 4, reps: 10, weight: 75 },
    { date: "2026-04-03", sets: 4, reps: 8, weight: 77.5 },
    { date: "2026-04-11", sets: 4, reps: 9, weight: 77.5 },
    { date: "2026-04-19", sets: 4, reps: 10, weight: 77.5 },
    { date: "2026-04-27", sets: 4, reps: 8, weight: 80 },
  ],
  "Squat": [
    { date: "2026-02-09", sets: 4, reps: 6, weight: 90 },
    { date: "2026-02-16", sets: 4, reps: 6, weight: 92.5 },
    { date: "2026-03-09", sets: 4, reps: 6, weight: 95 },
    { date: "2026-03-16", sets: 4, reps: 8, weight: 95 },
    { date: "2026-03-25", sets: 4, reps: 6, weight: 100 },
    { date: "2026-04-07", sets: 4, reps: 6, weight: 100 },
    { date: "2026-04-15", sets: 4, reps: 8, weight: 100 },
    { date: "2026-04-21", sets: 4, reps: 6, weight: 105 },
    { date: "2026-04-23", sets: 5, reps: 5, weight: 107.5 },
  ],
  "Deadlift": [
    { date: "2026-02-04", sets: 3, reps: 5, weight: 110 },
    { date: "2026-02-25", sets: 3, reps: 5, weight: 115 },
    { date: "2026-03-11", sets: 3, reps: 5, weight: 120 },
    { date: "2026-03-27", sets: 3, reps: 5, weight: 122.5 },
    { date: "2026-04-09", sets: 3, reps: 5, weight: 125 },
    { date: "2026-04-25", sets: 3, reps: 5, weight: 127.5 },
  ],
  "Pull-ups": [
    { date: "2026-02-04", sets: 4, reps: 6, weight: 0 },
    { date: "2026-02-18", sets: 4, reps: 7, weight: 0 },
    { date: "2026-03-02", sets: 4, reps: 8, weight: 0 },
    { date: "2026-03-11", sets: 4, reps: 9, weight: 0 },
    { date: "2026-03-20", sets: 4, reps: 10, weight: 0 },
    { date: "2026-04-01", sets: 4, reps: 10, weight: 5 },
    { date: "2026-04-09", sets: 4, reps: 10, weight: 7.5 },
    { date: "2026-04-17", sets: 4, reps: 10, weight: 10 },
  ],
  "Overhead Press": [
    { date: "2026-02-07", sets: 4, reps: 8, weight: 45 },
    { date: "2026-02-18", sets: 4, reps: 8, weight: 47.5 },
    { date: "2026-03-06", sets: 4, reps: 8, weight: 50 },
    { date: "2026-03-18", sets: 4, reps: 9, weight: 50 },
    { date: "2026-04-05", sets: 4, reps: 8, weight: 52.5 },
    { date: "2026-04-12", sets: 4, reps: 10, weight: 52.5 },
  ],
  "Barbell Row": [
    { date: "2026-02-04", sets: 4, reps: 10, weight: 55 },
    { date: "2026-02-14", sets: 4, reps: 10, weight: 57.5 },
    { date: "2026-03-02", sets: 4, reps: 10, weight: 60 },
    { date: "2026-03-11", sets: 4, reps: 12, weight: 60 },
    { date: "2026-03-20", sets: 4, reps: 10, weight: 62.5 },
    { date: "2026-04-01", sets: 4, reps: 10, weight: 65 },
    { date: "2026-04-09", sets: 4, reps: 12, weight: 65 },
    { date: "2026-04-17", sets: 4, reps: 10, weight: 67.5 },
  ],
  "Barbell Curl": [
    { date: "2026-02-04", sets: 3, reps: 12, weight: 30 },
    { date: "2026-02-18", sets: 3, reps: 12, weight: 32.5 },
    { date: "2026-03-04", sets: 3, reps: 12, weight: 35 },
    { date: "2026-03-20", sets: 3, reps: 12, weight: 37.5 },
    { date: "2026-04-03", sets: 3, reps: 12, weight: 37.5 },
    { date: "2026-04-19", sets: 3, reps: 12, weight: 40 },
  ],
  "Leg Press": [
    { date: "2026-02-09", sets: 4, reps: 12, weight: 120 },
    { date: "2026-02-23", sets: 4, reps: 12, weight: 130 },
    { date: "2026-03-09", sets: 4, reps: 12, weight: 140 },
    { date: "2026-03-25", sets: 4, reps: 12, weight: 150 },
    { date: "2026-04-07", sets: 4, reps: 12, weight: 160 },
    { date: "2026-04-21", sets: 4, reps: 12, weight: 170 },
  ],
};

const EXERCISE_GROUPS = {
  "Compound": ["Bench Press", "Squat", "Deadlift", "Pull-ups", "Overhead Press", "Barbell Row"],
  "Isolation": ["Barbell Curl", "Leg Press"],
};

const ALL_EXERCISES = Object.keys(EXERCISE_PROGRESS_DATA);
const GROUP_FILTERS = [
  { value: "All", label: "All Used Exercise" },
  ...Object.keys(EXERCISE_GROUPS).map((group) => ({ value: group, label: group })),
];

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
            <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.14em] text-amber-300/70">
              AI Assistant
            </p>
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

const METRICS = [
  { key: "weight", label: "Weight (kg)", color: "#f59e0b", stroke: "#fbbf24" },
  { key: "reps", label: "Reps", color: "#38bdf8", stroke: "#7dd3fc" },
  { key: "sets", label: "Sets", color: "#a78bfa", stroke: "#c4b5fd" },
  { key: "volume", label: "Volume (kg)", color: "#34d399", stroke: "#6ee7b7" },
];

function MiniLineChart({ data, metricKey, color, stroke, label }) {
  const [hovered, setHovered] = useState(null);
  const values = data.map((d) =>
    metricKey === "volume" ? d.sets * d.reps * d.weight : d[metricKey]
  );
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const isFlat = rawMin === rawMax;
  const padding = isFlat ? Math.max(1, Math.abs(rawMax) * 0.08) : (rawMax - rawMin) * 0.12;
  const minV = rawMin - padding;
  const maxV = rawMax + padding;
  const range = maxV - minV || 1;

  const width = 340;
  const height = 112;
  const pad = { top: 16, right: 18, bottom: 30, left: 48 };
  const cw = width - pad.left - pad.right;
  const ch = height - pad.top - pad.bottom;

  const xOf = (i) => (data.length === 1 ? pad.left + cw / 2 : pad.left + (i / (data.length - 1)) * cw);
  const yOf = (v) => pad.top + ((maxV - v) / range) * ch;
  const formatValue = (v) => {
    if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(1)}k`;
    return Number.isInteger(v) ? v : v.toFixed(1);
  };
  const yTicks = isFlat ? [rawMax] : [rawMin, rawMax];

  const linePath = values.map((v, i) => `${i === 0 ? "M" : "L"}${xOf(i).toFixed(1)},${yOf(v).toFixed(1)}`).join(" ");

  return (
    <div className="rounded-xl border border-white/6 bg-stone-950/40 p-3">
      <p className="mb-1 text-[10px] font-semibold text-stone-400">{label}</p>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
        <defs>
          <linearGradient id={`grad-${metricKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={hovered !== null ? "0.28" : "0.18"} />
            <stop offset="100%" stopColor={color} stopOpacity="0.01" />
          </linearGradient>
          <filter id={`glow-${metricKey}`} x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feColorMatrix
              in="blur"
              type="matrix"
              values="1 0 0 0 0.7 0 1 0 0 0.6 0 0 1 0 0.25 0 0 0 0.75 0"
            />
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {yTicks.map((tick) => (
          <g key={`tick-${tick}`}>
            <line
              x1={pad.left}
              y1={yOf(tick)}
              x2={width - pad.right}
              y2={yOf(tick)}
              stroke="rgba(255,255,255,0.06)"
              strokeDasharray="4 5"
            />
            <text
              x={pad.left - 8}
              y={yOf(tick) + 4}
              textAnchor="end"
              fontSize="9"
              fill="rgba(255,255,255,0.42)"
            >
              {formatValue(tick)}
            </text>
          </g>
        ))}
        {hovered !== null && (
          <Motion.rect
            x={Math.max(pad.left, xOf(hovered) - cw / data.length / 2)}
            y={pad.top}
            width={cw / data.length}
            height={ch}
            rx="6"
            fill={`${stroke}18`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.14 }}
            style={{ pointerEvents: "none" }}
          />
        )}
        <Motion.path
          d={`${linePath} L${xOf(data.length - 1).toFixed(1)},${(pad.top + ch).toFixed(1)} L${xOf(0).toFixed(1)},${(pad.top + ch).toFixed(1)} Z`}
          fill={`url(#grad-${metricKey})`}
          animate={{ opacity: hovered !== null ? 1 : 0.82 }}
          transition={{ duration: 0.16 }}
        />
        <Motion.path
          d={linePath}
          fill="none"
          stroke={stroke}
          strokeWidth={hovered !== null ? "2.8" : "2"}
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: hovered !== null ? 0.16 : 1.6, ease: "easeInOut" }}
        />
        {values.map((v, i) => (
          <Motion.circle
            key={i}
            cx={xOf(i)}
            cy={yOf(v)}
            r={hovered === i ? 6.5 : 3}
            fill={hovered === i ? stroke : "#0f172a"}
            stroke={stroke}
            strokeWidth={hovered === i ? 2.5 : 1.5}
            filter={hovered === i ? `url(#glow-${metricKey})` : undefined}
            animate={{ opacity: hovered !== null && hovered !== i ? 0.38 : 1 }}
            transition={{ duration: 0.14 }}
            style={{ cursor: "crosshair" }}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          />
        ))}
        {data.map((d, i) => (
          <text
            key={i}
            x={xOf(i)}
            y={height - 4}
            textAnchor="middle"
            fontSize="8"
            fill="rgba(255,255,255,0.32)"
          >
            {d.date.slice(5)}
          </text>
        ))}
        {hovered !== null && (
          <g style={{ pointerEvents: "none" }}>
            <line
              x1={xOf(hovered)}
              y1={pad.top}
              x2={xOf(hovered)}
              y2={pad.top + ch}
              stroke={`${stroke}66`}
              strokeWidth="1"
              strokeDasharray="3 3"
            />
            <rect
              x={Math.min(Math.max(xOf(hovered) - 36, pad.left), width - pad.right - 72)}
              y={Math.max(yOf(values[hovered]) - 32, pad.top)}
              width="72"
              height="26"
              rx="5"
              fill="rgba(15,23,42,0.94)"
              stroke={`${stroke}66`}
              strokeWidth="1"
            />
            <text
              x={Math.min(Math.max(xOf(hovered), pad.left + 38), width - pad.right - 38)}
              y={Math.max(yOf(values[hovered]) - 13, pad.top + 16)}
              textAnchor="middle"
              fontSize="10"
              fontWeight="700"
              fill={stroke}
            >
              {formatValue(values[hovered])}
            </text>
          </g>
        )}
        {data.map((d, i) => {
          const bandW = cw / data.length;
          return (
            <rect
              key={`hover-${d.date}`}
              x={Math.max(pad.left, xOf(i) - bandW / 2)}
              y={pad.top}
              width={bandW}
              height={ch}
              fill="transparent"
              style={{ cursor: "crosshair" }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            />
          );
        })}
      </svg>
    </div>
  );
}

function ExerciseProgressCharts({ exercise }) {
  const data = EXERCISE_PROGRESS_DATA[exercise] ?? [];

  if (!data.length) {
    return (
      <div className="flex h-40 items-center justify-center text-stone-500 text-sm">
        No data for this exercise yet.
      </div>
    );
  }

  const first = data[0];
  const last = data[data.length - 1];
  const weightGain = last.weight - first.weight;
  const repsGain = last.reps - first.reps;
  const bestVolume = Math.max(...data.map((d) => d.sets * d.reps * d.weight));

  return (
    <section className="rounded-[1.75rem] border border-sky-100/10 bg-stone-950/30 p-5 shadow-xl shadow-black/20">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-stone-500">Progress Charts</p>
          <h4 className="mt-2 text-xl font-semibold text-sky-50">{exercise}</h4>
          <p className="mt-1 text-[11px] text-stone-400">{data.length} sessions tracked</p>
        </div>
        <div className="flex flex-wrap gap-3 text-xs">
          <span className={`rounded-full border px-2.5 py-1 font-semibold ${weightGain >= 0 ? "border-emerald-400/30 text-emerald-300" : "border-rose-400/30 text-rose-300"}`}>
            Weight {weightGain >= 0 ? "+" : ""}{weightGain} kg
          </span>
          <span className={`rounded-full border px-2.5 py-1 font-semibold ${repsGain >= 0 ? "border-sky-400/30 text-sky-300" : "border-rose-400/30 text-rose-300"}`}>
            Reps {repsGain >= 0 ? "+" : ""}{repsGain}
          </span>
          <span className="rounded-full border border-amber-400/30 px-2.5 py-1 font-semibold text-amber-300">
            Best vol {bestVolume.toLocaleString()} kg
          </span>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {METRICS.map((m) => (
          <MiniLineChart
            key={m.key}
            data={data}
            metricKey={m.key}
            color={m.color}
            stroke={m.stroke}
            label={m.label}
          />
        ))}
      </div>
    </section>
  );
}

function PRBoard() {
  const prs = useMemo(
    () =>
      ALL_EXERCISES.map((exercise) => {
        const data = EXERCISE_PROGRESS_DATA[exercise];
        const bestWeight = Math.max(...data.map((d) => d.weight));
        const bestReps = Math.max(...data.map((d) => d.reps));
        const bestVolume = Math.max(...data.map((d) => d.sets * d.reps * d.weight));
        const latest = data[data.length - 1];
        return { exercise, bestWeight, bestReps, bestVolume, sessions: data.length, latestDate: latest.date };
      }).sort((a, b) => b.bestWeight - a.bestWeight),
    []
  );

  return (
    <section className="rounded-[1.75rem] border border-sky-100/10 bg-stone-950/30 p-5 shadow-xl shadow-black/20">
      <div>
        <p className="text-[11px] uppercase tracking-[0.22em] text-stone-500">All Time</p>
        <h4 className="mt-2 text-xl font-semibold text-sky-50">Personal Records Board</h4>
      </div>
      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[560px] text-xs">
          <thead>
            <tr className="border-b border-white/8 text-[10px] text-stone-500">
              <th className="pb-2 text-left font-semibold uppercase tracking-[0.12em]">Exercise</th>
              <th className="pb-2 text-right font-semibold uppercase tracking-[0.12em]">Best Weight</th>
              <th className="pb-2 text-right font-semibold uppercase tracking-[0.12em]">Best Reps</th>
              <th className="pb-2 text-right font-semibold uppercase tracking-[0.12em]">Best Volume</th>
              <th className="pb-2 text-right font-semibold uppercase tracking-[0.12em]">Sessions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/4">
            {prs.map((pr, index) => (
              <Motion.tr
                key={pr.exercise}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.04 }}
                className="group"
              >
                <td className="py-2.5 font-semibold text-stone-200">{pr.exercise}</td>
                <td className="py-2.5 text-right font-semibold text-amber-300">
                  {pr.bestWeight > 0 ? `${pr.bestWeight} kg` : "BW"}
                </td>
                <td className="py-2.5 text-right text-sky-300">{pr.bestReps}</td>
                <td className="py-2.5 text-right text-emerald-300">
                  {pr.bestVolume > 0 ? `${pr.bestVolume.toLocaleString()} kg` : "—"}
                </td>
                <td className="py-2.5 text-right text-stone-400">{pr.sessions}</td>
              </Motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function StrengthProgressAnalysis() {
  const [selectedExercise, setSelectedExercise] = useState(ALL_EXERCISES[0]);
  const [groupFilter, setGroupFilter] = useState("All");

  const filteredExercises = useMemo(() => {
    if (groupFilter === "All") return ALL_EXERCISES;
    return EXERCISE_GROUPS[groupFilter] ?? ALL_EXERCISES;
  }, [groupFilter]);

  const data = EXERCISE_PROGRESS_DATA[selectedExercise] ?? [];
  const first = data[0];
  const last = data[data.length - 1];

  const insights = useMemo(() => {
    if (!data.length) return [];
    const weightGain = last.weight - first.weight;
    const totalSessions = data.length;
    const bestVolume = Math.max(...data.map((d) => d.sets * d.reps * d.weight));
    const avgWeight = Number((data.reduce((s, d) => s + d.weight, 0) / data.length).toFixed(1));
    const weightGainPct = first.weight > 0 ? Number(((weightGain / first.weight) * 100).toFixed(1)) : 0;

    return [
      {
        title: "Total Sessions Tracked",
        value: `${totalSessions} sessions`,
        description: `${selectedExercise} has been logged ${totalSessions} times since ${first.date}.`,
      },
      {
        title: "Weight Gained",
        value: `${weightGain >= 0 ? "+" : ""}${weightGain} kg (${weightGainPct >= 0 ? "+" : ""}${weightGainPct}%)`,
        description: `Started at ${first.weight} kg, currently lifting ${last.weight} kg.`,
      },
      {
        title: "Best Volume Session",
        value: `${bestVolume.toLocaleString()} kg`,
        description: "Peak total volume (sets × reps × weight) in a single session.",
      },
      {
        title: "Average Weight Lifted",
        value: `${avgWeight} kg`,
        description: "Mean weight across all logged sessions for this exercise.",
      },
      {
        title: "Latest Session",
        value: `${last.date} — ${last.sets}×${last.reps} @ ${last.weight} kg`,
        description: `Most recent logged: ${last.sets} sets of ${last.reps} reps at ${last.weight} kg.`,
      },
    ];
  }, [selectedExercise, data, first, last]);

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        <div className="flex w-full shrink-0 flex-col gap-2 lg:w-52 lg:shrink-0">
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-500">Exercise Group</p>
            <div className="flex flex-wrap gap-1">
              {GROUP_FILTERS.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => {
                    setGroupFilter(filter.value);
                    const exercises = filter.value === "All" ? ALL_EXERCISES : EXERCISE_GROUPS[filter.value] ?? ALL_EXERCISES;
                    if (!exercises.includes(selectedExercise)) setSelectedExercise(exercises[0]);
                  }}
                  className={`rounded-full px-2.5 py-1 text-[10px] font-semibold transition-colors ${
                    groupFilter === filter.value
                      ? "bg-amber-500/20 text-amber-300"
                      : "text-stone-500 hover:text-stone-300"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
          <div className="journal-scroll overflow-y-auto rounded-2xl border border-white/8 bg-white/[0.03] p-2 max-h-48 lg:max-h-[calc(100vh-340px)]">
            {filteredExercises.map((exercise) => (
              <button
                key={exercise}
                type="button"
                onClick={() => setSelectedExercise(exercise)}
                className={`w-full rounded-xl px-3 py-2 text-left text-xs transition-colors ${
                  selectedExercise === exercise
                    ? "bg-amber-500/15 font-semibold text-amber-100"
                    : "text-stone-400 hover:bg-white/4 hover:text-stone-200"
                }`}
              >
                {exercise}
              </button>
            ))}
          </div>
        </div>

        <div
          className="journal-scroll min-w-0 flex-1 scroll-smooth overflow-y-auto rounded-[2rem] border border-sky-100/10 bg-white/[0.03] shadow-2xl shadow-black/30 backdrop-blur"
          style={{ maxHeight: "calc(100vh - 280px)" }}
        >
          <div className="space-y-6 p-6">
            <ExerciseProgressCharts exercise={selectedExercise} />
            <PRBoard />
          </div>
        </div>

        <div
          className="journal-scroll flex w-full w-full lg:max-w-[340px] lg:shrink-0 self-start flex-col gap-2 scroll-smooth overflow-y-auto"
          style={{ maxHeight: "calc(100vh - 180px)" }}
        >
          <InsightRail insights={insights} />
        </div>
      </div>
    </section>
  );
}
