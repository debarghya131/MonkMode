import { useEffect, useMemo, useState } from "react";
import { motion as Motion } from "framer-motion";
import littleMonkLogo from "../../../assets/littlemonklogo.png";
import api from "../../../api/axios";
import useAuth from "../../../hooks/useAuth";
import { DEMO_MEASUREMENTS } from "./demoGymAnalysis";

const MEASUREMENT_FIELDS = [
  { key: "bodyWeight", label: "Body Weight", unit: "kg", group: "Weight" },
  { key: "chest", label: "Chest", unit: "cm", group: "Upper Body" },
  { key: "upperWaist", label: "Upper Waist", unit: "cm", group: "Upper Body" },
  { key: "waist", label: "Waist", unit: "cm", group: "Upper Body" },
  { key: "lowerWaist", label: "Lower Waist", unit: "cm", group: "Upper Body" },
  { key: "shoulders", label: "Shoulders", unit: "cm", group: "Upper Body" },
  { key: "armsBiceps", label: "Biceps", unit: "cm", group: "Arms" },
  { key: "forearms", label: "Forearms", unit: "cm", group: "Arms" },
  { key: "thighs", label: "Thighs", unit: "cm", group: "Lower Body" },
  { key: "calves", label: "Calves", unit: "cm", group: "Lower Body" },
];

const FIELD_GROUPS = ["All", "Weight", "Upper Body", "Arms", "Lower Body"];

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

function MeasurementTrendChart({ checkins, fieldKey, fieldLabel, unit }) {
  const [hovered, setHovered] = useState(null);

  const data = useMemo(
    () =>
      checkins
        .filter((d) => {
          const v = parseFloat(d[fieldKey]);
          return !isNaN(v) && v > 0;
        })
        .map((d) => ({ date: d.checkInDate, value: parseFloat(d[fieldKey]) })),
    [checkins, fieldKey],
  );

  if (data.length === 0) {
    return (
      <section className="rounded-[1.5rem] border border-sky-100/10 bg-stone-950/30 p-4 shadow-xl shadow-black/20">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-stone-500">Trend Over Time</p>
          <h4 className="mt-1.5 text-lg font-semibold text-sky-50">{fieldLabel}</h4>
        </div>
        <div className="mt-6 flex h-32 items-center justify-center text-sm text-stone-500">
          No {fieldLabel.toLowerCase()} data recorded yet.
        </div>
      </section>
    );
  }

  const values = data.map((d) => d.value);
  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const range = maxV - minV || 1;

  const width = 560;
  const height = 170;
  const pad = { top: 16, right: 18, bottom: 30, left: 42 };
  const cw = width - pad.left - pad.right;
  const ch = height - pad.top - pad.bottom;

  const xOf = (i) => (data.length === 1 ? pad.left + cw / 2 : pad.left + (i / (data.length - 1)) * cw);
  const yOf = (v) => pad.top + ((maxV - v) / range) * ch;

  const linePath = values.map((v, i) => `${i === 0 ? "M" : "L"}${xOf(i).toFixed(1)},${yOf(v).toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${xOf(data.length - 1).toFixed(1)},${(pad.top + ch).toFixed(1)} L${xOf(0).toFixed(1)},${(pad.top + ch).toFixed(1)} Z`;

  const yTicks = minV === maxV ? [minV] : [minV, Number(((minV + maxV) / 2).toFixed(1)), maxV];

  const first = values[0];
  const last = values[values.length - 1];
  const diff = Number((last - first).toFixed(1));
  const isUp = diff > 0;

  return (
    <section className="rounded-[1.5rem] border border-sky-100/10 bg-stone-950/30 p-4 shadow-xl shadow-black/20">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-stone-500">Trend Over Time</p>
          <h4 className="mt-1.5 text-lg font-semibold text-sky-50">{fieldLabel}</h4>
          <p className="mt-0.5 text-[10px] text-stone-400">{data.length} check-ins recorded</p>
        </div>
        <div className="flex flex-wrap gap-1.5 text-[10px]">
          <span className="rounded-full border border-stone-600/40 px-2 py-0.5 text-stone-300">
            Start: {first} {unit}
          </span>
          <span className="rounded-full border border-stone-600/40 px-2 py-0.5 text-stone-300">
            Now: {last} {unit}
          </span>
          <span
            className={`rounded-full border px-2 py-0.5 font-semibold ${
              diff === 0
                ? "border-stone-500/40 text-stone-400"
                : isUp
                ? "border-emerald-400/30 text-emerald-300"
                : "border-sky-400/30 text-sky-300"
            }`}
          >
            {diff >= 0 ? "+" : ""}{diff} {unit}
          </span>
        </div>
      </div>
      <div className="mt-3 overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ minWidth: `${width}px` }}>
          <defs>
            <linearGradient id="measGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.01" />
            </linearGradient>
          </defs>
          {yTicks.map((tick) => {
            const y = yOf(tick);
            return (
              <g key={tick}>
                <line x1={pad.left} y1={y} x2={width - pad.right} y2={y} stroke="rgba(255,255,255,0.07)" strokeDasharray="4 6" />
                <text x={pad.left - 6} y={y + 4} textAnchor="end" fontSize="10" fill="rgba(255,255,255,0.38)">{tick}</text>
              </g>
            );
          })}
          <path d={areaPath} fill="url(#measGrad)" />
          <Motion.path
            d={linePath}
            fill="none"
            stroke="#38bdf8"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 1.8, ease: "easeInOut" }}
          />
          {data.map((d, i) => (
            <circle
              key={d.date}
              cx={xOf(i)}
              cy={yOf(values[i])}
              r={hovered === i ? 7 : 4.5}
              fill={hovered === i ? "#38bdf8" : "#0f172a"}
              stroke="#7dd3fc"
              strokeWidth="2"
              style={{ transition: "r 0.13s ease", cursor: "crosshair" }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            />
          ))}
          {data.map((d, i) => (
            <text key={`x-${d.date}`} x={xOf(i)} y={height - 6} textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.35)">
              {d.date.slice(5)}
            </text>
          ))}
          {hovered !== null && (
            <g style={{ pointerEvents: "none" }}>
              <line x1={xOf(hovered)} y1={pad.top} x2={xOf(hovered)} y2={pad.top + ch} stroke="rgba(56,189,248,0.35)" strokeWidth="1" strokeDasharray="4 3" />
              <rect
                x={Math.min(Math.max(xOf(hovered) - 50, pad.left), width - pad.right - 100)}
                y={Math.max(yOf(values[hovered]) - 50, pad.top + 2)}
                width="100"
                height="40"
                rx="7"
                fill="rgba(15,23,42,0.94)"
                stroke="rgba(56,189,248,0.4)"
                strokeWidth="1"
              />
              <text
                x={Math.min(Math.max(xOf(hovered), pad.left + 52), width - pad.right - 52)}
                y={Math.max(yOf(values[hovered]) - 30, pad.top + 18)}
                textAnchor="middle"
                fontSize="11"
                fontWeight="700"
                fill="#bae6fd"
              >
                {data[hovered].date.slice(5)}
              </text>
              <text
                x={Math.min(Math.max(xOf(hovered), pad.left + 52), width - pad.right - 52)}
                y={Math.max(yOf(values[hovered]) - 14, pad.top + 34)}
                textAnchor="middle"
                fontSize="10"
                fill="rgba(226,232,240,0.86)"
              >
                {values[hovered]} {unit}
              </text>
            </g>
          )}
        </svg>
      </div>
    </section>
  );
}

function FirstVsLatestCards({ checkins, groupFilter }) {
  if (checkins.length === 0) {
    return (
      <section className="rounded-[1.5rem] border border-sky-100/10 bg-stone-950/30 p-4 shadow-xl shadow-black/20">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-stone-500">Transformation</p>
          <h4 className="mt-1.5 text-lg font-semibold text-sky-50">First vs Latest Check-in</h4>
        </div>
        <div className="mt-6 flex h-20 items-center justify-center text-sm text-stone-500">
          No check-ins recorded yet.
        </div>
      </section>
    );
  }

  const first = checkins[0];
  const last = checkins[checkins.length - 1];

  const fields = MEASUREMENT_FIELDS.filter(
    (f) => groupFilter === "All" || f.group === groupFilter,
  );

  return (
    <section className="rounded-[1.5rem] border border-sky-100/10 bg-stone-950/30 p-4 shadow-xl shadow-black/20">
      <div>
        <p className="text-[10px] uppercase tracking-[0.2em] text-stone-500">Transformation</p>
        <h4 className="mt-1.5 text-lg font-semibold text-sky-50">First vs Latest Check-in</h4>
        <p className="mt-0.5 text-[10px] text-stone-400">{first.checkInDate} → {last.checkInDate}</p>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {fields.map((field, index) => {
          const firstVal = parseFloat(first[field.key]) || null;
          const lastVal = parseFloat(last[field.key]) || null;

          if (lastVal === null && firstVal === null) {
            return (
              <Motion.div
                key={field.key}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                className="rounded-xl border border-stone-700/40 bg-stone-950/30 px-2.5 py-2"
              >
                <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-stone-500">{field.label}</p>
                <div className="mt-1">
                  <span className="text-sm font-bold text-stone-600">—</span>
                </div>
              </Motion.div>
            );
          }

          const displayFirst = firstVal ?? lastVal;
          const displayLast = lastVal ?? firstVal;
          const diff = displayFirst !== null && displayLast !== null ? Number((displayLast - displayFirst).toFixed(1)) : null;
          const isUp = diff !== null && diff > 0;
          const isNeutral = diff === null || diff === 0;
          const isGoodUp = ["armsBiceps", "forearms", "chest", "shoulders"].includes(field.key);

          const borderColor = isNeutral
            ? "border-stone-700/40"
            : isUp === isGoodUp
            ? "border-emerald-400/30"
            : "border-sky-400/30";

          const diffColor = isNeutral
            ? "text-stone-400"
            : isUp === isGoodUp
            ? "text-emerald-300"
            : "text-sky-300";

          return (
            <Motion.div
              key={field.key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              className={`rounded-xl border px-2.5 py-2 ${borderColor} bg-stone-950/30`}
            >
              <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-stone-500">{field.label}</p>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-base font-bold text-stone-100">{displayLast}</span>
                <span className="text-[10px] text-stone-500">{field.unit}</span>
              </div>
              <div className="mt-0.5 flex items-center gap-1.5 text-[10px]">
                <span className="text-stone-500">from {displayFirst}</span>
                {diff !== null && (
                  <span className={`font-semibold ${diffColor}`}>
                    {diff >= 0 ? "+" : ""}{diff}
                  </span>
                )}
              </div>
            </Motion.div>
          );
        })}
      </div>
    </section>
  );
}

export default function MeasurementsAnalysis() {
  const { user, isDemoMode } = useAuth();
  const [selectedField, setSelectedField] = useState(MEASUREMENT_FIELDS[0].key);
  const [groupFilter, setGroupFilter] = useState("All");
  const [checkins, setCheckins] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isDemoMode) {
      setCheckins(DEMO_MEASUREMENTS);
      setLoading(false);
      return;
    }
    if (!user) {
      setCheckins([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const loadMeasurements = async () => {
      setLoading(true);
      try {
        const res = await api.get("/gym/measurements");
        if (!cancelled) {
          const filtered = (res.data || []).filter((d) => !d.deletedAt);
          setCheckins([...filtered].reverse());
        }
      } catch {
        if (!cancelled) setCheckins([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    const refreshMeasurements = () => {
      loadMeasurements();
    };

    loadMeasurements();
    window.addEventListener("focus", refreshMeasurements);
    window.addEventListener("storage", refreshMeasurements);
    window.addEventListener("monkmode:gym-measurements-updated", refreshMeasurements);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", refreshMeasurements);
      window.removeEventListener("storage", refreshMeasurements);
      window.removeEventListener("monkmode:gym-measurements-updated", refreshMeasurements);
    };
  }, [isDemoMode, user]);

  const filteredFields = useMemo(
    () => MEASUREMENT_FIELDS.filter((f) => groupFilter === "All" || f.group === groupFilter),
    [groupFilter],
  );

  const activeField = MEASUREMENT_FIELDS.find((f) => f.key === selectedField) ?? MEASUREMENT_FIELDS[0];

  const insights = useMemo(() => {
    const totalCheckins = checkins.length;
    if (totalCheckins === 0) {
      return [
        { title: "Total Check-ins Recorded", value: "0 check-ins", description: "No measurements recorded yet. Start tracking to see your progress." },
        { title: "Total Weight Lost", value: "—", description: "No weight data available yet." },
        { title: "Most Changed Measurement", value: "—", description: "Track multiple check-ins to see which measurement changed the most." },
        { title: "Tracking Duration", value: "—", description: "No check-ins recorded yet." },
        { title: "Latest Body Weight", value: "—", description: "No body weight data recorded yet." },
      ];
    }

    const first = checkins[0];
    const last = checkins[checkins.length - 1];
    const daySpan = Math.round(
      (new Date(last.checkInDate) - new Date(first.checkInDate)) / (1000 * 60 * 60 * 24),
    );

    const firstWeight = parseFloat(first.bodyWeight) || null;
    const lastWeight = parseFloat(last.bodyWeight) || null;
    const weightLost = firstWeight !== null && lastWeight !== null
      ? Number((firstWeight - lastWeight).toFixed(1))
      : null;

    let mostChanged = { label: "—", pct: 0 };
    MEASUREMENT_FIELDS.forEach((f) => {
      const fv = parseFloat(first[f.key]);
      const lv = parseFloat(last[f.key]);
      if (!isNaN(fv) && !isNaN(lv) && fv > 0) {
        const pct = Math.abs(((lv - fv) / fv) * 100);
        if (pct > mostChanged.pct) mostChanged = { label: f.label, pct: Number(pct.toFixed(1)) };
      }
    });

    return [
      {
        title: "Total Check-ins Recorded",
        value: `${totalCheckins} check-ins`,
        description: `Measurements logged over ${daySpan} days — from ${first.checkInDate} to ${last.checkInDate}.`,
      },
      {
        title: "Total Weight Lost",
        value: weightLost !== null ? `${weightLost} kg` : "—",
        description: weightLost !== null
          ? `Body weight changed from ${firstWeight} kg to ${lastWeight} kg over the tracking period.`
          : "No body weight data recorded yet.",
      },
      {
        title: "Most Changed Measurement",
        value: mostChanged.pct > 0 ? `${mostChanged.label} (${mostChanged.pct}%)` : "—",
        description: "The body measurement that has changed the most as a percentage since your first check-in.",
      },
      {
        title: "Tracking Duration",
        value: `${daySpan} days`,
        description: `You've been tracking measurements for ${daySpan} days since your first check-in.`,
      },
      {
        title: "Latest Body Weight",
        value: lastWeight !== null ? `${lastWeight} kg` : "—",
        description: lastWeight !== null
          ? `Your most recent check-in on ${last.checkInDate} recorded ${lastWeight} kg.`
          : "No body weight data recorded yet.",
      },
    ];
  }, [checkins]);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 rounded-2xl border border-white/8 bg-white/[0.03] p-1.5">
          {FIELD_GROUPS.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => {
                setGroupFilter(g);
                const filtered = MEASUREMENT_FIELDS.filter((f) => g === "All" || f.group === g);
                if (!filtered.find((f) => f.key === selectedField)) setSelectedField(filtered[0]?.key ?? MEASUREMENT_FIELDS[0].key);
              }}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
                groupFilter === g
                  ? "bg-amber-500/20 text-amber-300"
                  : "text-stone-500 hover:text-stone-300"
              }`}
            >
              {g}
            </button>
          ))}
        </div>
        {loading && <span className="animate-pulse text-xs text-stone-500">Loading…</span>}
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-5">
        <div className="flex w-full shrink-0 flex-col gap-2 lg:w-48 lg:shrink-0">
          <div className="journal-scroll max-h-40 overflow-y-auto rounded-2xl border border-white/8 bg-white/[0.03] p-2 lg:max-h-[calc(100vh-280px)]">
            {filteredFields.map((field) => (
              <button
                key={field.key}
                type="button"
                onClick={() => setSelectedField(field.key)}
                className={`w-full rounded-xl px-3 py-2 text-left transition-colors ${
                  selectedField === field.key
                    ? "bg-amber-500/15 text-amber-100"
                    : "text-stone-400 hover:bg-white/4 hover:text-stone-200"
                }`}
              >
                <p className={`text-xs font-semibold ${selectedField === field.key ? "text-amber-100" : ""}`}>{field.label}</p>
                <p className="mt-0.5 text-[10px] text-stone-500">{field.unit}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="journal-scroll min-w-0 flex-1 scroll-smooth overflow-y-auto rounded-[1.6rem] border border-sky-100/10 bg-white/[0.03] shadow-2xl shadow-black/30 backdrop-blur sm:rounded-[2rem] lg:max-h-[calc(100vh-350px)]">
          <div className="space-y-4 p-4">
            <MeasurementTrendChart
              checkins={checkins}
              fieldKey={activeField.key}
              fieldLabel={activeField.label}
              unit={activeField.unit}
            />
            <FirstVsLatestCards checkins={checkins} groupFilter={groupFilter} />
          </div>
        </div>

        <div className="journal-scroll self-start flex w-full flex-col gap-2 scroll-smooth overflow-y-auto lg:max-h-[calc(100vh-180px)] lg:max-w-[380px] lg:shrink-0">
          <InsightRail insights={insights} />
        </div>
      </div>
    </section>
  );
}
