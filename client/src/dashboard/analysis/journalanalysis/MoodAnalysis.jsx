import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion as Motion } from "framer-motion";
import littleMonkLogo from "../../../assets/littlemonklogo.png";
import api from "../../../api/axios";
import useAuth from "../../../hooks/useAuth";

const MOOD_META = {
  Motivated: { emoji: "🔥", color: "#f59e0b", text: "text-amber-200", glow: "rgba(245,158,11,0.28)" },
  Focused: { emoji: "😤", color: "#a855f7", text: "text-violet-200", glow: "rgba(168,85,247,0.28)" },
  Calm: { emoji: "😌", color: "#10b981", text: "text-emerald-200", glow: "rgba(16,185,129,0.28)" },
  Happy: { emoji: "😊", color: "#facc15", text: "text-yellow-200", glow: "rgba(250,204,21,0.26)" },
  Tired: { emoji: "😴", color: "#94a3b8", text: "text-slate-200", glow: "rgba(148,163,184,0.24)" },
  Peaceful: { emoji: "🧘", color: "#38bdf8", text: "text-sky-200", glow: "rgba(56,189,248,0.24)" },
  Anxious: { emoji: "😰", color: "#fb7185", text: "text-rose-200", glow: "rgba(251,113,133,0.26)" },
  Neutral: { emoji: "😐", color: "#a8a29e", text: "text-stone-200", glow: "rgba(168,162,158,0.24)" },
  Inspired: { emoji: "✨", color: "#22d3ee", text: "text-cyan-200", glow: "rgba(34,211,238,0.26)" },
};

const MONTH_OPTIONS = [
  { value: "01", label: "January" }, { value: "02", label: "February" },
  { value: "03", label: "March" },   { value: "04", label: "April" },
  { value: "05", label: "May" },     { value: "06", label: "June" },
  { value: "07", label: "July" },    { value: "08", label: "August" },
  { value: "09", label: "September" },{ value: "10", label: "October" },
  { value: "11", label: "November" },{ value: "12", label: "December" },
];

const NOW = new Date();
const YEARS = Array.from({ length: 4 }, (_, i) => String(NOW.getFullYear() - i));

const DEMO_MOOD_ENTRIES = [
  { date: "2026-04-01", mood: "Motivated", energy: 84, rating: 82 },
  { date: "2026-04-02", mood: "Focused",   energy: 88, rating: 90 },
  { date: "2026-04-03", mood: "Happy",     energy: 76, rating: 79 },
  { date: "2026-04-04", mood: "Calm",      energy: 71, rating: 73 },
  { date: "2026-04-05", mood: "Motivated", energy: 86, rating: 84 },
  { date: "2026-04-06", mood: "Tired",     energy: 58, rating: 60 },
  { date: "2026-04-07", mood: "Focused",   energy: 89, rating: 91 },
  { date: "2026-04-08", mood: "Anxious",   energy: 54, rating: 52 },
  { date: "2026-04-09", mood: "Calm",      energy: 74, rating: 76 },
  { date: "2026-04-10", mood: "Motivated", energy: 83, rating: 81 },
  { date: "2026-03-12", mood: "Focused",   energy: 82, rating: 84 },
  { date: "2026-03-13", mood: "Happy",     energy: 77, rating: 79 },
  { date: "2026-03-14", mood: "Inspired",  energy: 86, rating: 88 },
  { date: "2026-03-15", mood: "Calm",      energy: 69, rating: 72 },
  { date: "2026-03-16", mood: "Anxious",   energy: 55, rating: 53 },
  { date: "2026-03-17", mood: "Focused",   energy: 90, rating: 91 },
  { date: "2026-02-18", mood: "Tired",     energy: 57, rating: 59 },
  { date: "2026-02-19", mood: "Motivated", energy: 82, rating: 84 },
  { date: "2026-02-20", mood: "Calm",      energy: 72, rating: 74 },
  { date: "2026-02-21", mood: "Happy",     energy: 78, rating: 80 },
];
const DAY_ORDER = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const formatDayLabel = (date) =>
  new Date(`${date}T00:00:00`).toLocaleDateString("en-US", { weekday: "short" });

const average = (values) =>
  values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;

function buildMoodVsSeries(entries) {
  const grouped = entries.reduce((acc, entry) => {
    if (!acc[entry.mood]) acc[entry.mood] = [];
    acc[entry.mood].push(entry);
    return acc;
  }, {});

  return Object.entries(grouped)
    .map(([mood, moodEntries]) => ({
      mood,
      count: moodEntries.length,
      energy: average(moodEntries.map((entry) => entry.energy)),
      rating: average(moodEntries.map((entry) => entry.rating)),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
}

function buildDayWiseSeries(entries) {
  const grouped = entries.reduce((acc, entry) => {
    if (!acc[entry.date]) acc[entry.date] = [];
    acc[entry.date].push(entry);
    return acc;
  }, {});

  return Object.entries(grouped)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-7)
    .map(([date, dayEntries]) => {
      const countByMood = dayEntries.reduce((acc, entry) => {
        acc[entry.mood] = (acc[entry.mood] || 0) + 1;
        return acc;
      }, {});

      const [topMood] = Object.entries(countByMood).sort((a, b) => b[1] - a[1])[0];
      // Use avg energy as the bar value so each day shows real variation
      const avgEnergy = average(dayEntries.map((e) => e.energy));
      return {
        date,
        day: formatDayLabel(date),
        mood: topMood,
        percentage: avgEnergy, // bar height = avg energy (0-100)
      };
    })
    .sort((a, b) => DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day));
}

function buildDistribution(entries) {
  const total = entries.length || 1;
  const grouped = entries.reduce((acc, entry) => {
    acc[entry.mood] = (acc[entry.mood] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(grouped)
    .map(([mood, count]) => ({
      mood,
      count,
      percentage: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.count - a.count);
}

function InsightRail({ insights }) {
  const [selectedInsight, setSelectedInsight] = useState(null);

  return (
    <aside
      className="flex w-full flex-col overflow-hidden rounded-2xl border border-amber-100/10 bg-white/6 shadow-xl shadow-black/25 backdrop-blur"
    >
      {/* Monk header — matches JournalWeeklyReport exactly */}
      <div className="shrink-0 p-5 pb-4">
        <div className="flex items-center gap-3">
          <Motion.div
            className="relative grid h-16 w-17 place-items-center"
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
            <h3 className="text-label-md">Little Monk's Summary</h3>
            <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.14em] text-amber-300/70">
              AI Assistant
            </p>
          </div>
        </div>
      </div>

      {/* Scrollable insight cards */}
      <div className="journal-scroll space-y-3 px-5 pb-5 pr-4">
        {insights.map((insight) => {
          const isSelected = selectedInsight === insight.title;
          return (
            <Motion.div
              key={insight.title}
              layout
              className={`rounded-xl border p-3 text-sm transition-colors ${
                isSelected
                  ? "border-amber-400/30 bg-amber-500/8"
                  : "border-amber-100/10 bg-stone-950/45 hover:border-amber-400/20"
              }`}
            >
              <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-start">
                <div className="min-w-0">
                  <span className={`text-xs font-semibold ${insight.meta.text}`}>
                    {insight.title}
                  </span>
                  <p className="text-sm font-semibold text-stone-200 break-words">{insight.value}</p>
                  {isSelected && (
                    <Motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-1.5 text-xs leading-relaxed text-stone-500"
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
                      ? "border-amber-400/40 bg-amber-400/15 text-amber-200"
                      : "border-amber-400/20 text-amber-300 hover:border-amber-300/45 hover:bg-amber-400/10"
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

// BAR_H is the true chart area height. All bars and grid lines share this reference.
const BAR_H = 200;
const LABEL_H = 56; // space below bars for emoji + mood name + log count

function MoodVsGraph({ data, daysLogged }) {
  const [hovered, setHovered] = useState(null);
  return (
    <section className="rounded-[1.75rem] border border-amber-100/10 bg-stone-950/30 p-5 shadow-xl shadow-black/20">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-stone-500">Comparison</p>
          <div className="mt-2 flex flex-wrap items-center gap-2.5">
            <h4 className="text-lg font-semibold leading-tight text-amber-50 sm:text-xl">Mood vs Energy and Overall Day Rate</h4>
            <span className="rounded-full border border-amber-400/25 bg-amber-400/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-300">
              {data.length} mood type{data.length !== 1 ? "s" : ""} logged
            </span>
            <span className="rounded-full border border-stone-600/40 bg-stone-800/50 px-2.5 py-0.5 text-[11px] font-semibold text-stone-300">
              {daysLogged} day{daysLogged !== 1 ? "s" : ""} logged
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs text-stone-400">
          <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-amber-400" />Energy</span>
          <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-cyan-400" />Overall Day Rate</span>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto pb-1">
        <div className="flex min-w-[560px] gap-3 pr-1">
          {/* Y-axis labels — aligned to bar area only */}
          <div
            className="flex shrink-0 flex-col justify-between text-right text-[11px] text-stone-500"
            style={{ height: BAR_H, marginBottom: LABEL_H }}
          >
            {[100, 80, 60, 40, 20, 0].map((mark) => (
              <span key={mark}>{mark}</span>
            ))}
          </div>

          {/* Chart area */}
          <div className="relative flex-1" style={{ height: BAR_H + LABEL_H }}>
            {/* Grid lines — positioned from bottom of bar area only */}
            {[0, 20, 40, 60, 80, 100].map((mark) => (
              <div
                key={mark}
                className="absolute left-0 right-0 border-t border-dashed border-white/6"
                style={{ bottom: LABEL_H + (mark / 100) * BAR_H }}
              />
            ))}

            {/* Bars + labels */}
            <div className="absolute inset-0 flex items-end justify-around gap-2">
              {data.map((item, idx) => {
                const meta = MOOD_META[item.mood];
                const eH = Math.round((item.energy / 100) * BAR_H);
                const rH = Math.round((item.rating / 100) * BAR_H);
                return (
                  <Motion.div
                    key={item.mood}
                    className="flex min-w-0 flex-1 flex-col items-center"
                    style={{
                      height: BAR_H + LABEL_H,
                      opacity: hovered !== null && hovered !== idx ? 0.35 : 1,
                      transition: "opacity 0.18s ease",
                    }}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: hovered !== null && hovered !== idx ? 0.35 : 1, y: 0 }}
                    transition={{ duration: 0.35, delay: idx * 0.07, ease: "easeOut" }}
                    onMouseEnter={() => setHovered(idx)}
                    onMouseLeave={() => setHovered(null)}
                  >
                    {/* Bars sit at the bottom of the bar area */}
                    <div className="flex items-end justify-center gap-1.5" style={{ height: BAR_H, marginBottom: 0 }}>
                      <div className="flex flex-col items-center justify-end gap-1">
                        <Motion.span
                          className="text-[10px] font-semibold text-amber-300"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: idx * 0.07 + 0.35 }}
                        >
                          {item.energy}
                        </Motion.span>
                        <Motion.div
                          className="w-6 rounded-t-lg border border-amber-200/20 bg-gradient-to-t from-amber-700/90 to-amber-300/90"
                          initial={{ height: 0 }}
                          animate={{ height: eH }}
                          transition={{ duration: 0.5, delay: idx * 0.07, ease: [0.34, 1.56, 0.64, 1] }}
                        />
                      </div>
                      <div className="flex flex-col items-center justify-end gap-1">
                        <Motion.span
                          className="text-[10px] font-semibold text-cyan-300"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: idx * 0.07 + 0.35 }}
                        >
                          {item.rating}
                        </Motion.span>
                        <Motion.div
                          className="w-6 rounded-t-lg border border-cyan-200/20 bg-gradient-to-t from-cyan-700/90 to-cyan-300/90"
                          initial={{ height: 0 }}
                          animate={{ height: rH }}
                          transition={{ duration: 0.5, delay: idx * 0.07 + 0.05, ease: [0.34, 1.56, 0.64, 1] }}
                        />
                      </div>
                    </div>
                    {/* Labels below */}
                    <div className="flex flex-col items-center pt-2" style={{ height: LABEL_H }}>
                      <p className="text-base leading-none">{meta?.emoji ?? "•"}</p>
                      <p className="mt-1 max-w-[4.5rem] text-center text-[10px] font-semibold leading-tight text-stone-200 sm:text-[11px] break-words">{item.mood}</p>
                      <p className="text-[10px] text-stone-500">{item.count} day{item.count !== 1 ? "s" : ""}</p>
                    </div>
                  </Motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const TOP_LABEL_H = 52;  // emoji + mood + % above the bar
const DAY_LABEL_H  = 22;  // day name below the bar

function DayWiseMoodGraph({ data }) {
  const [hovered, setHovered] = useState(null);
  return (
    <section className="rounded-[1.75rem] border border-amber-100/10 bg-stone-950/30 p-5 shadow-xl shadow-black/20">
      <div>
        <p className="text-[11px] uppercase tracking-[0.22em] text-stone-500">Timeline</p>
        <h4 className="mt-2 text-xl font-semibold text-amber-50">Day-wise Mood Analysis</h4>
      </div>

      <div className="mt-6 overflow-x-auto pb-1">
        <div className="flex min-w-[620px] gap-3 pr-1">
          {/* Y-axis — aligned to bar area only */}
          <div
            className="flex shrink-0 flex-col justify-between text-right text-[11px] text-stone-500"
            style={{ height: BAR_H, marginTop: TOP_LABEL_H, marginBottom: DAY_LABEL_H }}
          >
            {[100, 80, 60, 40, 20, 0].map((mark) => (
              <span key={mark}>{mark}%</span>
            ))}
          </div>

          {/* Chart area: top-labels + bars + day-labels */}
          <div className="relative flex-1" style={{ height: TOP_LABEL_H + BAR_H + DAY_LABEL_H }}>
            {/* Grid lines sit inside the bar area */}
            {[0, 20, 40, 60, 80, 100].map((mark) => (
              <div
                key={mark}
                className="absolute left-0 right-0 border-t border-dashed border-white/6"
                style={{ bottom: DAY_LABEL_H + (mark / 100) * BAR_H }}
              />
            ))}

            {/* Columns */}
            <div className="absolute inset-0 flex items-end justify-around gap-2">
              {data.map((item, idx) => {
                const meta = MOOD_META[item.mood];
                const barH = Math.max(8, Math.round((item.percentage / 100) * BAR_H));
                return (
                  <Motion.div
                    key={item.date}
                    className="flex min-w-0 flex-1 flex-col items-center"
                    style={{
                      height: TOP_LABEL_H + BAR_H + DAY_LABEL_H,
                      opacity: hovered !== null && hovered !== idx ? 0.35 : 1,
                      transition: "opacity 0.18s ease",
                    }}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: hovered !== null && hovered !== idx ? 0.35 : 1, y: 0 }}
                    transition={{ duration: 0.35, delay: idx * 0.07, ease: "easeOut" }}
                    onMouseEnter={() => setHovered(idx)}
                    onMouseLeave={() => setHovered(null)}
                  >
                    {/* Top: emoji + mood + % — above the bar */}
                    <Motion.div
                      className="flex flex-col items-center justify-end pb-1"
                      style={{ height: TOP_LABEL_H }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.07 + 0.4 }}
                    >
                      <span className="text-base leading-none">{meta?.emoji}</span>
                      <span className={`mt-0.5 hidden max-w-[3.9rem] text-center text-[10px] font-semibold leading-tight sm:block ${meta?.text ?? "text-stone-200"} break-words`}>
                        {item.mood}
                      </span>
                      <span className="text-[10px] text-stone-500">{item.percentage}%</span>
                    </Motion.div>

                    {/* Bar — grows from the 0% baseline */}
                    <div className="flex w-full items-end justify-center" style={{ height: BAR_H }}>
                      <Motion.div
                        className="w-full max-w-[56px] rounded-t-2xl border border-white/10"
                        style={{
                          background: `linear-gradient(180deg, ${meta?.color ?? "#a8a29e"}, ${meta?.color ?? "#a8a29e"}66)`,
                        }}
                        initial={{ height: 0 }}
                        animate={{ height: barH }}
                        transition={{ duration: 0.55, delay: idx * 0.07, ease: [0.34, 1.56, 0.64, 1] }}
                      />
                    </div>

                    {/* Bottom: day name */}
                    <div className="flex items-start justify-center pt-1.5" style={{ height: DAY_LABEL_H }}>
                      <span className="text-[11px] font-bold text-stone-300">{item.day}</span>
                    </div>
                  </Motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// Build SVG donut arc path for a slice between two angles (in degrees)
function describeArc(cx, cy, r, startDeg, endDeg) {
  const toRad = (d) => ((d - 90) * Math.PI) / 180;
  const x1 = cx + r * Math.cos(toRad(startDeg));
  const y1 = cy + r * Math.sin(toRad(startDeg));
  const x2 = cx + r * Math.cos(toRad(endDeg));
  const y2 = cy + r * Math.sin(toRad(endDeg));
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
}

function MoodDistributionGraph({ data, moodTypesLogged }) {
  const [hovered, setHovered] = useState(null);

  // Build slice angles
  const slices = [];
  let cursor = 0;
  data.forEach((item) => {
    const sweep = (item.percentage / 100) * 360;
    slices.push({ ...item, startDeg: cursor, endDeg: cursor + sweep });
    cursor += sweep;
  });

  const CX = 100, CY = 100, R = 80, INNER = 52;
  const hoveredItem = hovered !== null ? data[hovered] : null;

  return (
    <section className="rounded-[1.75rem] border border-amber-100/10 bg-stone-950/30 p-5 shadow-xl shadow-black/20">
      <div>
        <p className="text-[11px] uppercase tracking-[0.22em] text-stone-500">Distribution</p>
        <h4 className="mt-2 text-xl font-semibold text-amber-50">Mood Distribution</h4>
      </div>

      <div className="mt-6 flex justify-center">
        <Motion.div
          className="relative"
          initial={{ opacity: 0, scale: 0.75, rotate: -20 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ duration: 0.55, ease: [0.34, 1.56, 0.64, 1] }}
        >
            <svg width="200" height="200" viewBox="0 0 200 200">
              {slices.map((slice, i) => {
                const meta = MOOD_META[slice.mood];
                const color = meta?.color ?? "#a8a29e";
                const isHovered = hovered === i;
                const outerR = isHovered ? R + 7 : R;
                const outerPath = describeArc(CX, CY, outerR, slice.startDeg, slice.endDeg);
                const innerPath = describeArc(CX, CY, INNER, slice.endDeg, slice.startDeg);
                const d = `${outerPath} L ${CX + INNER * Math.cos(((slice.endDeg - 90) * Math.PI) / 180)} ${CY + INNER * Math.sin(((slice.endDeg - 90) * Math.PI) / 180)} ${innerPath} Z`;

                return (
                  <Motion.path
                    key={slice.mood}
                    d={d}
                    fill={color}
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{
                      opacity: hovered !== null && !isHovered ? 0.3 : 1,
                      scale: 1,
                    }}
                    transition={{
                      opacity: { duration: 0.2 },
                      scale: { duration: 0.45, delay: i * 0.07, ease: [0.34, 1.56, 0.64, 1] },
                    }}
                    style={{
                      cursor: "pointer",
                      transformOrigin: `${CX}px ${CY}px`,
                      filter: isHovered ? `drop-shadow(0 0 10px ${color}cc)` : "none",
                      transition: "filter 0.2s",
                    }}
                    onMouseEnter={() => setHovered(i)}
                    onMouseLeave={() => setHovered(null)}
                  />
                );
              })}

              {/* Inner circle */}
              <Motion.circle
                cx={CX} cy={CY} r={INNER - 2}
                fill="#0c0a09"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.4, delay: 0.25, ease: "easeOut" }}
                style={{ transformOrigin: `${CX}px ${CY}px` }}
              />

              {/* Subtle inner ring pulse */}
              <Motion.circle
                cx={CX} cy={CY} r={INNER - 1}
                fill="none"
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="1"
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              />

              {/* Centre text — animated on hover change */}
              <AnimatePresence mode="wait">
                {hoveredItem ? (
                  <Motion.g
                    key="hovered"
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    transition={{ duration: 0.18 }}
                    style={{ transformOrigin: `${CX}px ${CY}px` }}
                  >
                    <text x={CX} y={CY - 10} textAnchor="middle" fontSize="18" fill="white">
                      {MOOD_META[hoveredItem.mood]?.emoji}
                    </text>
                    <text x={CX} y={CY + 8} textAnchor="middle" fontSize="9" fill={MOOD_META[hoveredItem.mood]?.color ?? "#fff"} fontWeight="700" letterSpacing="0.5">
                      {hoveredItem.mood.toUpperCase()}
                    </text>
                    <text x={CX} y={CY + 22} textAnchor="middle" fontSize="13" fill="white" fontWeight="700">
                      {hoveredItem.percentage}%
                    </text>
                  </Motion.g>
                ) : (
                  <Motion.g
                    key="idle"
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    transition={{ duration: 0.18 }}
                    style={{ transformOrigin: `${CX}px ${CY}px` }}
                  >
                    <text x={CX} y={CY - 6} textAnchor="middle" fontSize="8.5" fill="rgba(255,255,255,0.35)" letterSpacing="1">
                      MOODS LOGGED
                    </text>
                    <text x={CX} y={CY + 14} textAnchor="middle" fontSize="22" fill="white" fontWeight="600">
                      {moodTypesLogged}
                    </text>
                  </Motion.g>
                )}
              </AnimatePresence>
            </svg>
        </Motion.div>
      </div>
    </section>
  );
}

export default function MoodAnalysis() {
  const { isDemoMode } = useAuth();
  const [selectedYear, setSelectedYear]   = useState(YEARS[0]);
  const [selectedMonth, setSelectedMonth] = useState(isDemoMode ? "04" : String(NOW.getMonth() + 1).padStart(2, "0"));
  const [entries, setEntries]             = useState([]);
  const [loading, setLoading]             = useState(false);

  useEffect(() => {
    if (isDemoMode) {
      setEntries(DEMO_MOOD_ENTRIES.filter(
        e => e.date.startsWith(selectedYear) && e.date.slice(5, 7) === selectedMonth
      ));
      return;
    }
    let cancelled = false;
    setLoading(true);
    api.get(`/journal/analysis?year=${selectedYear}&month=${parseInt(selectedMonth, 10)}`)
      .then(res => { if (!cancelled) setEntries(res.data.entries || []); })
      .catch(() => { if (!cancelled) setEntries([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [isDemoMode, selectedYear, selectedMonth]);

  const filteredEntries = entries;

  const moodVsSeries = useMemo(() => buildMoodVsSeries(filteredEntries), [filteredEntries]);
  const dayWiseSeries = useMemo(() => buildDayWiseSeries(filteredEntries), [filteredEntries]);
  const distribution = useMemo(() => buildDistribution(filteredEntries), [filteredEntries]);
  const moodTypesLogged = useMemo(() => new Set(filteredEntries.map((e) => e.mood)).size, [filteredEntries]);
  const daysLogged = useMemo(() => new Set(filteredEntries.map((e) => e.date)).size, [filteredEntries]);

  const topMood = distribution[0];
  const strongestMood = [...moodVsSeries].sort((a, b) => b.rating - a.rating)[0] ?? moodVsSeries[0];
  const lowEnergyMood = [...moodVsSeries].sort((a, b) => a.energy - b.energy)[0] ?? moodVsSeries[0];

  const littleMonkInsights = [
    {
      title: "Most Frequent Mood",
      value: topMood ? `${MOOD_META[topMood.mood]?.emoji} ${topMood.mood}` : "No mood",
      meta: MOOD_META[topMood?.mood] ?? MOOD_META.Neutral,
      description: topMood
        ? `${topMood.percentage}% of this period leans into ${topMood.mood.toLowerCase()}, so that mood is currently setting the tone.`
        : "Start journaling to surface your dominant emotional pattern.",
    },
    {
      title: "Strongest Day Pattern",
      value: strongestMood ? `${strongestMood.mood} ${strongestMood.rating}%` : "No signal",
      meta: MOOD_META[strongestMood?.mood] ?? MOOD_META.Neutral,
      description: strongestMood
        ? `${strongestMood.mood} is linked with your strongest overall day rating in the selected period.`
        : "The strongest day pattern will appear here after more logs are added.",
    },
    {
      title: "Energy Dip Watch",
      value: lowEnergyMood ? `${lowEnergyMood.mood} ${lowEnergyMood.energy}%` : "No signal",
      meta: MOOD_META[lowEnergyMood?.mood] ?? MOOD_META.Neutral,
      description: lowEnergyMood
        ? `${lowEnergyMood.mood} has the lowest average energy, so it is worth reviewing what tends to happen around those entries.`
        : "This insight will start working when energy data is available.",
    },
  ];

  return (
    <section className="space-y-4">
      {/* Filters — outside the container */}
      <div className="flex flex-wrap items-center gap-3">
        {String(NOW.getFullYear()) === selectedYear && String(NOW.getMonth() + 1).padStart(2, "0") === selectedMonth && (
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
              setSelectedYear(event.target.value);
            }}
            className="bg-transparent text-amber-100 outline-none"
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
            className="bg-transparent text-amber-100 outline-none"
          >
            {MONTH_OPTIONS.map((month) => (
              <option key={month.value} value={month.value} className="bg-stone-950 text-stone-200">
                {month.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {loading ? (
        <div className="space-y-3">
          <div className="h-48 animate-pulse rounded-2xl border border-amber-100/10 bg-white/[0.03]" />
          <div className="h-36 animate-pulse rounded-2xl border border-amber-100/10 bg-white/[0.03]" />
        </div>
      ) : (
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        {/* LEFT — one big scrollable container */}
        <div
          className="journal-scroll min-w-0 flex-1 rounded-[2rem] border border-amber-100/10 bg-white/[0.03] shadow-2xl shadow-black/30 backdrop-blur lg:max-h-[calc(100vh-360px)] lg:overflow-y-auto"
        >
          <div className="space-y-6 p-6">
            <MoodVsGraph data={moodVsSeries} daysLogged={daysLogged} />
            <DayWiseMoodGraph data={dayWiseSeries} />
          </div>
        </div>

        {/* RIGHT — Little Monk panel + Mood Distribution */}
        <div
          className="journal-scroll flex w-full self-start flex-col gap-2 lg:-mt-14 lg:max-h-[calc(100vh-180px)] lg:max-w-[360px] lg:shrink-0 lg:overflow-y-auto"
        >
          <InsightRail insights={littleMonkInsights} />
          <MoodDistributionGraph data={distribution} moodTypesLogged={moodTypesLogged} />
        </div>
      </div>
      )}
    </section>
  );
}
