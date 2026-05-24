import { useEffect, useMemo, useState } from "react";
import { motion as Motion } from "framer-motion";
import littleMonkLogo from "../../../assets/littlemonklogo.png";
import api from "../../../api/axios";
import useAuth from "../../../hooks/useAuth";
import { buildDemoExerciseAnalysis } from "./demoGymAnalysis";


function InsightRail({ insights }) {
  const [selected, setSelected] = useState(null);

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
      <div className="journal-scroll space-y-3 px-4 pb-4 pr-3 sm:px-5 sm:pb-5 sm:pr-4">
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
                  onClick={() => setSelected(isSelected ? null : insight.title)}
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

const METRICS = [
  { key: "weight", label: "Weight (kg)", color: "#f59e0b", stroke: "#fbbf24" },
  { key: "reps", label: "Reps", color: "#38bdf8", stroke: "#7dd3fc" },
  { key: "sets", label: "Sets", color: "#a78bfa", stroke: "#c4b5fd" },
];

function MiniLineChart({ data, color, stroke, label }) {
  const [hovered, setHovered] = useState(null);
  const chartId = label.toLowerCase().replace(/[^a-z0-9]/g, "-");
  const values = data.map((d) => d.value);
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
          <linearGradient id={`grad-${chartId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={hovered !== null ? "0.28" : "0.18"} />
            <stop offset="100%" stopColor={color} stopOpacity="0.01" />
          </linearGradient>
          <filter id={`glow-${chartId}`} x="-80%" y="-80%" width="260%" height="260%">
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
          fill={`url(#grad-${chartId})`}
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
            key={`c-${i}`}
            cx={xOf(i)}
            cy={yOf(v)}
            r={hovered === i ? 6.5 : 3}
            fill={hovered === i ? stroke : "#0f172a"}
            stroke={stroke}
            strokeWidth={hovered === i ? 2.5 : 1.5}
            filter={hovered === i ? `url(#glow-${chartId})` : undefined}
            animate={{ opacity: hovered !== null && hovered !== i ? 0.38 : 1 }}
            transition={{ duration: 0.14 }}
            style={{ cursor: "crosshair" }}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          />
        ))}
        {data.map((d, i) => (
          <text
            key={`l-${i}`}
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
  if (!exercise) {
    return (
      <div className="flex h-40 items-center justify-center text-stone-500 text-sm">
        Select an exercise to view progress charts.
      </div>
    );
  }

  const metrics = exercise.metrics || {};
  const weightData = metrics.weight || [];
  const repsData = metrics.reps || [];
  const setsData = metrics.sets || [];

  if (!weightData.length && !repsData.length) {
    return (
      <div className="flex h-40 items-center justify-center text-stone-500 text-sm">
        No data for this exercise yet.
      </div>
    );
  }

  const firstWeight = weightData[0]?.value ?? 0;
  const lastWeight = weightData[weightData.length - 1]?.value ?? 0;
  const weightGain = Number((lastWeight - firstWeight).toFixed(1));
  const firstReps = repsData[0]?.value ?? 0;
  const lastReps = repsData[repsData.length - 1]?.value ?? 0;
  const repsGain = Number((lastReps - firstReps).toFixed(0));

  const metricCharts = [
    { key: "weight", label: "Weight (kg)", color: "#f59e0b", stroke: "#fbbf24", data: weightData },
    { key: "reps", label: "Reps", color: "#38bdf8", stroke: "#7dd3fc", data: repsData },
    { key: "sets", label: "Sets", color: "#a78bfa", stroke: "#c4b5fd", data: setsData },
  ].filter((m) => m.data.length > 0);

  return (
    <section className="rounded-[1.4rem] border border-sky-100/10 bg-stone-950/30 p-4 shadow-xl shadow-black/20 sm:rounded-[1.75rem] sm:p-5">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-stone-500">Progress Charts</p>
          <h4 className="mt-2 text-xl font-semibold text-sky-50">{exercise.name}</h4>
          <p className="mt-1 text-[11px] text-stone-400">{exercise.logsCount} sessions tracked</p>
        </div>
        <div className="flex flex-wrap gap-3 text-xs">
          <span className={`rounded-full border px-2.5 py-1 font-semibold ${weightGain >= 0 ? "border-emerald-400/30 text-emerald-300" : "border-rose-400/30 text-rose-300"}`}>
            Weight {weightGain >= 0 ? "+" : ""}{weightGain} kg
          </span>
          <span className={`rounded-full border px-2.5 py-1 font-semibold ${repsGain >= 0 ? "border-sky-400/30 text-sky-300" : "border-rose-400/30 text-rose-300"}`}>
            Reps {repsGain >= 0 ? "+" : ""}{repsGain}
          </span>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {metricCharts.map((m) => (
          <MiniLineChart key={m.key} data={m.data} color={m.color} stroke={m.stroke} label={m.label} />
        ))}
      </div>
    </section>
  );
}

function PRBoard({ exercises }) {
  const sorted = useMemo(
    () => [...exercises].sort((a, b) => (b.latest?.weight ?? 0) - (a.latest?.weight ?? 0)),
    [exercises]
  );

  return (
    <section className="rounded-[1.4rem] border border-sky-100/10 bg-stone-950/30 p-4 shadow-xl shadow-black/20 sm:rounded-[1.75rem] sm:p-5">
      <div>
        <p className="text-[11px] uppercase tracking-[0.22em] text-stone-500">All Exercises</p>
        <h4 className="mt-2 text-xl font-semibold text-sky-50">Exercise Summary Board</h4>
      </div>
      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[560px] text-xs">
          <thead>
            <tr className="border-b border-white/8 text-[10px] text-stone-500">
              <th className="pb-2 text-left font-semibold uppercase tracking-[0.12em]">Exercise</th>
              <th className="pb-2 text-right font-semibold uppercase tracking-[0.12em]">Latest Weight</th>
              <th className="pb-2 text-right font-semibold uppercase tracking-[0.12em]">Latest Reps</th>
              <th className="pb-2 text-right font-semibold uppercase tracking-[0.12em]">Body Group</th>
              <th className="pb-2 text-right font-semibold uppercase tracking-[0.12em]">Sessions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/4">
            {sorted.map((ex, index) => (
              <Motion.tr
                key={ex.exerciseId}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.04 }}
              >
                <td className="py-2.5 font-semibold text-stone-200">{ex.name}</td>
                <td className="py-2.5 text-right font-semibold text-amber-300">
                  {(ex.latest?.weight ?? 0) > 0 ? `${ex.latest.weight} kg` : "BW"}
                </td>
                <td className="py-2.5 text-right text-sky-300">{ex.latest?.reps ?? "—"}</td>
                <td className="py-2.5 text-right text-stone-400">{ex.bodyGroup || "—"}</td>
                <td className="py-2.5 text-right text-stone-400">{ex.logsCount}</td>
              </Motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function StrengthProgressAnalysis() {
  const { user, isDemoMode } = useAuth();
  const [exercises, setExercises] = useState([]);
  const [groups, setGroups] = useState(["All"]);
  const [groupFilter, setGroupFilter] = useState("All");
  const [selectedExerciseId, setSelectedExerciseId] = useState(null);
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isDemoMode) {
      const demo = buildDemoExerciseAnalysis(selectedExerciseId, groupFilter);
      setExercises(demo.exercises);
      setGroups(demo.groups);
      setSelectedExercise(demo.selectedExercise);
      if (!selectedExerciseId && demo.selectedExerciseId) setSelectedExerciseId(demo.selectedExerciseId);
      setLoading(false);
      return;
    }
    if (!user) {
      setExercises([]);
      setGroups(["All"]);
      setSelectedExercise(null);
      setSelectedExerciseId(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const loadAnalysis = async () => {
      setLoading(true);
      try {
        const query = `${selectedExerciseId ? `?exerciseId=${selectedExerciseId}` : ""}${groupFilter !== "All" ? `${selectedExerciseId ? "&" : "?"}group=${groupFilter}` : ""}`;
        const res = await api.get(`/gym/exercise-progress/analytics${query}`);
        if (cancelled) return;
        setExercises(res.data.exercises || []);
        setGroups(res.data.groups || ["All"]);
        setSelectedExercise(res.data.selectedExercise || null);
        if (!selectedExerciseId && res.data.selectedExerciseId) {
          setSelectedExerciseId(res.data.selectedExerciseId);
        }
      } catch {
        if (!cancelled) {
          setExercises([]);
          setSelectedExercise(null);
        }
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
    window.addEventListener("monkmode:exercise-progress-updated", refreshAnalysis);
    window.addEventListener("monkmode:gym-workouts-updated", refreshAnalysis);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", refreshAnalysis);
      window.removeEventListener("storage", refreshAnalysis);
      window.removeEventListener("monkmode:exercise-progress-updated", refreshAnalysis);
      window.removeEventListener("monkmode:gym-workouts-updated", refreshAnalysis);
    };
  }, [isDemoMode, user, selectedExerciseId, groupFilter]);

  const insights = useMemo(() => {
    if (!selectedExercise) return [];
    const weightData = selectedExercise.metrics?.weight || [];
    const firstWeight = weightData[0]?.value ?? 0;
    const lastWeight = weightData[weightData.length - 1]?.value ?? 0;
    const weightGain = Number((lastWeight - firstWeight).toFixed(1));
    const weightGainPct = firstWeight > 0 ? Number(((weightGain / firstWeight) * 100).toFixed(1)) : 0;
    const avgWeight = weightData.length
      ? Number((weightData.reduce((s, d) => s + d.value, 0) / weightData.length).toFixed(1))
      : 0;
    const latest = selectedExercise.latest || {};
    return [
      {
        title: "Total Sessions Tracked",
        value: `${selectedExercise.logsCount} sessions`,
        description: `${selectedExercise.name} has been logged ${selectedExercise.logsCount} times. Last logged: ${selectedExercise.lastLoggedDate}.`,
      },
      {
        title: "Weight Progression",
        value: `${weightGain >= 0 ? "+" : ""}${weightGain} kg (${weightGainPct >= 0 ? "+" : ""}${weightGainPct}%)`,
        description: `Started at ${firstWeight} kg, currently lifting ${lastWeight} kg.`,
      },
      {
        title: "Average Weight Lifted",
        value: `${avgWeight} kg`,
        description: "Mean weight across all logged sessions for this exercise.",
      },
      ...(latest.weight || latest.reps || latest.sets ? [{
        title: "Latest Session",
        value: `${latest.sets || "—"}×${latest.reps || "—"} @ ${latest.weight > 0 ? `${latest.weight} kg` : "BW"}`,
        description: `Most recent logged session: ${latest.sets} sets of ${latest.reps} reps at ${latest.weight > 0 ? `${latest.weight} kg` : "bodyweight"}.`,
      }] : []),
    ];
  }, [selectedExercise]);

  const filteredExercises = groupFilter === "All" ? exercises : exercises.filter((e) => e.bodyGroup === groupFilter);

  return (
    <section className="space-y-4">
      {loading && !exercises.length ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />
        </div>
      ) : (
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-5">
          <div className="flex w-full shrink-0 flex-col gap-2 lg:w-52 lg:shrink-0">
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-500">Body Group</p>
              <div className="flex flex-wrap gap-1">
                {groups.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => { setGroupFilter(g); setSelectedExerciseId(null); }}
                    className={`rounded-full px-2.5 py-1 text-[10px] font-semibold transition-colors ${groupFilter === g ? "bg-amber-500/20 text-amber-300" : "text-stone-500 hover:text-stone-300"}`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
            <div className="journal-scroll max-h-48 overflow-y-auto rounded-2xl border border-white/8 bg-white/[0.03] p-2 lg:max-h-[calc(100vh-340px)]">
              {filteredExercises.map((ex) => (
                <button
                  key={ex.exerciseId}
                  type="button"
                  onClick={() => setSelectedExerciseId(ex.exerciseId)}
                  className={`w-full rounded-xl px-3 py-2 text-left text-xs transition-colors ${selectedExerciseId === ex.exerciseId ? "bg-amber-500/15 font-semibold text-amber-100" : "text-stone-400 hover:bg-white/4 hover:text-stone-200"}`}
                >
                  <p className="font-medium">{ex.name}</p>
                  <p className="mt-0.5 text-[10px] text-stone-500">{ex.logsCount} sessions</p>
                </button>
              ))}
              {filteredExercises.length === 0 && (
                <p className="px-3 py-4 text-center text-[11px] text-stone-500">No exercises logged yet.</p>
              )}
            </div>
          </div>

          <div className="journal-scroll min-w-0 flex-1 scroll-smooth overflow-y-auto rounded-[1.6rem] border border-sky-100/10 bg-white/[0.03] shadow-2xl shadow-black/30 backdrop-blur sm:rounded-[2rem] lg:max-h-[calc(100vh-280px)]">
            <div className="space-y-4 p-4 sm:space-y-6 sm:p-6">
              <ExerciseProgressCharts exercise={selectedExercise} />
              <PRBoard exercises={exercises} />
            </div>
          </div>

          <div className="journal-scroll self-start flex w-full flex-col gap-2 scroll-smooth overflow-y-auto lg:max-h-[calc(100vh-180px)] lg:max-w-[380px] lg:shrink-0">
            <InsightRail insights={insights} />
          </div>
        </div>
      )}
    </section>
  );
}
