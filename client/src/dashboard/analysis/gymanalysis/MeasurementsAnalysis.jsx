import { useMemo, useState } from "react";
import { motion as Motion } from "framer-motion";
import littleMonkLogo from "../../../assets/littlemonklogo.png";

const MEASUREMENT_CHECKINS = [
  {
    date: "2025-12-01",
    bodyWeight: 78.2,
    chest: 98,
    upperWaist: 86,
    waist: 88,
    lowerBelly: 90,
    shoulders: 120,
    biceps: 34,
    forearms: 29,
    thighs: 58,
    calves: 36,
  },
  {
    date: "2026-01-05",
    bodyWeight: 77.0,
    chest: 97.5,
    upperWaist: 85,
    waist: 87,
    lowerBelly: 88,
    shoulders: 120,
    biceps: 34.5,
    forearms: 29.5,
    thighs: 57.5,
    calves: 36.5,
  },
  {
    date: "2026-02-02",
    bodyWeight: 75.8,
    chest: 97,
    upperWaist: 84,
    waist: 86,
    lowerBelly: 87,
    shoulders: 120.5,
    biceps: 35,
    forearms: 29.5,
    thighs: 57,
    calves: 37,
  },
  {
    date: "2026-02-23",
    bodyWeight: 75.0,
    chest: 96.5,
    upperWaist: 83,
    waist: 85,
    lowerBelly: 86,
    shoulders: 121,
    biceps: 35.5,
    forearms: 30,
    thighs: 56.5,
    calves: 37,
  },
  {
    date: "2026-03-16",
    bodyWeight: 74.2,
    chest: 96,
    upperWaist: 82,
    waist: 84,
    lowerBelly: 85,
    shoulders: 121,
    biceps: 35.5,
    forearms: 30,
    thighs: 56,
    calves: 37.5,
  },
  {
    date: "2026-04-06",
    bodyWeight: 73.5,
    chest: 95.5,
    upperWaist: 81,
    waist: 83,
    lowerBelly: 84,
    shoulders: 121.5,
    biceps: 36,
    forearms: 30.5,
    thighs: 55.5,
    calves: 37.5,
  },
  {
    date: "2026-04-21",
    bodyWeight: 73.0,
    chest: 95,
    upperWaist: 80,
    waist: 82,
    lowerBelly: 83,
    shoulders: 122,
    biceps: 36.5,
    forearms: 31,
    thighs: 55,
    calves: 38,
  },
];

const MEASUREMENT_FIELDS = [
  { key: "bodyWeight", label: "Body Weight", unit: "kg", group: "Weight" },
  { key: "chest", label: "Chest", unit: "cm", group: "Upper Body" },
  { key: "upperWaist", label: "Upper Waist", unit: "cm", group: "Upper Body" },
  { key: "waist", label: "Waist", unit: "cm", group: "Upper Body" },
  { key: "lowerBelly", label: "Lower Belly", unit: "cm", group: "Upper Body" },
  { key: "shoulders", label: "Shoulders", unit: "cm", group: "Upper Body" },
  { key: "biceps", label: "Biceps", unit: "cm", group: "Arms" },
  { key: "forearms", label: "Forearms", unit: "cm", group: "Arms" },
  { key: "thighs", label: "Thighs", unit: "cm", group: "Lower Body" },
  { key: "calves", label: "Calves", unit: "cm", group: "Lower Body" },
];

const FIELD_GROUPS = ["All", "Weight", "Upper Body", "Arms", "Lower Body"];

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

function MeasurementTrendChart({ fieldKey, fieldLabel, unit }) {
  const [hovered, setHovered] = useState(null);
  const data = MEASUREMENT_CHECKINS;

  const values = data.map((d) => d[fieldKey]);
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

  const yTicks = [minV, Number(((minV + maxV) / 2).toFixed(1)), maxV];

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

function FirstVsLatestCards({ groupFilter }) {
  const first = MEASUREMENT_CHECKINS[0];
  const last = MEASUREMENT_CHECKINS[MEASUREMENT_CHECKINS.length - 1];

  const fields = MEASUREMENT_FIELDS.filter(
    (f) => groupFilter === "All" || f.group === groupFilter
  );

  return (
    <section className="rounded-[1.5rem] border border-sky-100/10 bg-stone-950/30 p-4 shadow-xl shadow-black/20">
      <div>
        <p className="text-[10px] uppercase tracking-[0.2em] text-stone-500">Transformation</p>
        <h4 className="mt-1.5 text-lg font-semibold text-sky-50">First vs Latest Check-in</h4>
        <p className="mt-0.5 text-[10px] text-stone-400">{first.date} → {last.date}</p>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {fields.map((field, index) => {
          const firstVal = first[field.key];
          const lastVal = last[field.key];
          const diff = Number((lastVal - firstVal).toFixed(1));
          const isUp = diff > 0;
          const isNeutral = diff === 0;
          const isGoodUp = ["biceps", "forearms", "chest", "shoulders"].includes(field.key);

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
                <span className="text-base font-bold text-stone-100">{lastVal}</span>
                <span className="text-[10px] text-stone-500">{field.unit}</span>
              </div>
              <div className="mt-0.5 flex items-center gap-1.5 text-[10px]">
                <span className="text-stone-500">from {firstVal}</span>
                <span className={`font-semibold ${diffColor}`}>
                  {diff >= 0 ? "+" : ""}{diff}
                </span>
              </div>
            </Motion.div>
          );
        })}
      </div>
    </section>
  );
}

export default function MeasurementsAnalysis() {
  const [selectedField, setSelectedField] = useState(MEASUREMENT_FIELDS[0].key);
  const [groupFilter, setGroupFilter] = useState("All");

  const filteredFields = useMemo(
    () => MEASUREMENT_FIELDS.filter((f) => groupFilter === "All" || f.group === groupFilter),
    [groupFilter]
  );

  const activeField = MEASUREMENT_FIELDS.find((f) => f.key === selectedField) ?? MEASUREMENT_FIELDS[0];

  const first = MEASUREMENT_CHECKINS[0];
  const last = MEASUREMENT_CHECKINS[MEASUREMENT_CHECKINS.length - 1];
  const weightLost = Number((first.bodyWeight - last.bodyWeight).toFixed(1));
  const totalCheckins = MEASUREMENT_CHECKINS.length;
  const daySpan = Math.round(
    (new Date(last.date) - new Date(first.date)) / (1000 * 60 * 60 * 24)
  );

  const mostChangedField = useMemo(() => {
    let best = { label: "—", pct: 0 };
    MEASUREMENT_FIELDS.forEach((f) => {
      const fv = first[f.key];
      const lv = last[f.key];
      const pct = fv ? Math.abs(((lv - fv) / fv) * 100) : 0;
      if (pct > best.pct) best = { label: f.label, pct: Number(pct.toFixed(1)) };
    });
    return best;
  }, []);

  const insights = [
    {
      title: "Total Check-ins Recorded",
      value: `${totalCheckins} check-ins`,
      description: `Measurements logged over ${daySpan} days — from ${first.date} to ${last.date}.`,
    },
    {
      title: "Total Weight Lost",
      value: `${weightLost} kg`,
      description: `Body weight dropped from ${first.bodyWeight} kg to ${last.bodyWeight} kg over the tracking period.`,
    },
    {
      title: "Most Changed Measurement",
      value: `${mostChangedField.label} (${mostChangedField.pct}%)`,
      description: "The body measurement that has changed the most as a percentage since your first check-in.",
    },
    {
      title: "Tracking Duration",
      value: `${daySpan} days`,
      description: `You've been tracking measurements consistently for ${daySpan} days since your first check-in.`,
    },
    {
      title: "Latest Body Weight",
      value: `${last.bodyWeight} kg`,
      description: `Your most recent check-in on ${last.date} recorded ${last.bodyWeight} kg.`,
    },
  ];

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
      </div>

      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
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

        <div
          className="journal-scroll min-w-0 flex-1 scroll-smooth overflow-y-auto rounded-[2rem] border border-sky-100/10 bg-white/[0.03] shadow-2xl shadow-black/30 backdrop-blur"
          style={{ maxHeight: "calc(100vh - 350px)" }}
        >
          <div className="space-y-4 p-4">
            <MeasurementTrendChart
              fieldKey={activeField.key}
              fieldLabel={activeField.label}
              unit={activeField.unit}
            />
            <FirstVsLatestCards groupFilter={groupFilter} />
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
