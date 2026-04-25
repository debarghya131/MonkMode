import { useMemo, useState } from "react";
import { motion as Motion } from "framer-motion";
import monkGreetingsLogo from "../../../assets/monkgreetingslogo.png";

const MONTH_OPTIONS = [
  { value: "01", label: "January" },
  { value: "02", label: "February" },
  { value: "03", label: "March" },
  { value: "04", label: "April" },
];

const MISTAKE_POOL = [
  "Late start",
  "Skipped planning",
  "Context switching",
  "Over-committing",
  "Phone checking",
  "Delayed deep work",
  "Poor time blocking",
  "No evening review",
  "Multitasking",
];

const DISTRACTION_POOL = [
  "Instagram",
  "YouTube",
  "WhatsApp",
  "Email refresh",
  "Random browsing",
  "Notification checks",
  "Unplanned calls",
  "News feed",
  "Chat hopping",
];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getDaysInMonth(year, month) {
  return new Date(Number(year), Number(month), 0).getDate();
}

function getTagSet(pool, daySeed, shift) {
  const first = pool[(daySeed + shift) % pool.length];
  const second = pool[(daySeed * 3 + shift + 2) % pool.length];
  const picks = daySeed % 4 === 0 ? [first, second] : [first];
  return [...new Set(picks)];
}

function generateMonthLogs(year, month, baseShift) {
  const days = getDaysInMonth(year, month);
  return Array.from({ length: days }, (_, index) => {
    const day = index + 1;
    const date = `${year}-${month}-${String(day).padStart(2, "0")}`;

    const wins = clamp(2 + ((day * 2 + baseShift) % 5), 1, 6);
    const mistakes = clamp(1 + ((day + baseShift) % 4), 0, 5);
    const achievements = clamp(1 + ((day * 3 + baseShift) % 5), 1, 6);

    return {
      date,
      wins,
      mistakes,
      achievements,
      mistakeTags: getTagSet(MISTAKE_POOL, day, baseShift),
      distractionTags: getTagSet(DISTRACTION_POOL, day + 2, baseShift),
    };
  });
}

const REFLECTION_LOGS = [
  ...generateMonthLogs("2026", "02", 1),
  ...generateMonthLogs("2026", "03", 3),
  ...generateMonthLogs("2026", "04", 5),
];

const YEARS = [...new Set(REFLECTION_LOGS.map((entry) => entry.date.slice(0, 4)))].sort().reverse();

function buildMonthlySeries(logs, year, month, key) {
  const entryMap = new Map(logs.map((entry) => [Number(entry.date.slice(8, 10)), entry]));
  const daysInMonth = getDaysInMonth(year, month);

  return Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1;
    const item = entryMap.get(day);
    return {
      date: `${year}-${month}-${String(day).padStart(2, "0")}`,
      day,
      value: item?.[key] ?? 0,
    };
  });
}

function sumBy(logs, key) {
  return logs.reduce((total, entry) => total + (entry[key] ?? 0), 0);
}

function topRepeated(logs, key, limit = 5) {
  const counts = new Map();

  logs.forEach((entry) => {
    (entry[key] ?? []).forEach((label) => {
      counts.set(label, (counts.get(label) ?? 0) + 1);
    });
  });

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, count]) => ({ label, count }));
}

function toListSummary(items, emptyText) {
  if (!items.length) return emptyText;
  return items.map((item, index) => `${index + 1}. ${item.label} (${item.count})`).join("\n");
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
                      className="mt-1.5 whitespace-pre-line text-xs leading-relaxed text-stone-400"
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

function MonthlyLineGraph({ title, subtitle, series, theme }) {
  const [hovered, setHovered] = useState(null);

  const maxValue = Math.max(6, ...series.map((item) => item.value));
  const markSet = new Set([0, maxValue]);
  for (let v = 2; v <= maxValue; v += 2) markSet.add(v);
  const marks = [...markSet].sort((a, b) => a - b);

  const VW = 900;
  const PLOT_TOP = 24;
  const PLOT_H = 160;
  const PLOT_BOTTOM = PLOT_TOP + PLOT_H;
  const X_LABEL_H = 20;
  const SVG_H = PLOT_TOP + PLOT_H + X_LABEL_H;
  const PL = 34;
  const PR = 10;
  const plotW = VW - PL - PR;
  const n = series.length;
  const xOf = (i) => PL + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const yOf = (val) => PLOT_BOTTOM - (val / maxValue) * PLOT_H;

  const linePath = series.map((item, i) => `${i === 0 ? "M" : "L"} ${xOf(i).toFixed(1)} ${yOf(item.value).toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L ${xOf(n - 1).toFixed(1)} ${PLOT_BOTTOM} L ${xOf(0).toFixed(1)} ${PLOT_BOTTOM} Z`;
  const hovItem = hovered !== null ? series[hovered] : null;
  const gradId = `area-grad-${subtitle.replace(/\s+/g, "")}`;
  const glowId = `glow-${subtitle.replace(/\s+/g, "")}`;

  return (
    <section className="rounded-[1.75rem] border border-sky-100/10 bg-stone-950/30 p-5 shadow-xl shadow-black/20">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-stone-500">{subtitle}</p>
          <h4 className="mt-2 text-xl font-semibold text-sky-50">{title}</h4>
        </div>
        <span className="flex items-center gap-2 text-xs text-stone-400">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: theme.stroke }} />
          Daily count
        </span>
      </div>

      <div className="mt-5 w-full overflow-x-auto">
        <div style={{ minWidth: "600px" }}>
          <svg viewBox={`0 0 ${VW} ${SVG_H}`} style={{ width: "100%", height: "auto", overflow: "visible" }}>
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={theme.stroke} stopOpacity="0.28" />
                <stop offset="100%" stopColor={theme.stroke} stopOpacity="0.02" />
              </linearGradient>
              <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="2.5" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>

            {/* Y-axis labels */}
            {marks.map((mark) => (
              <text key={`yl-${mark}`} x={PL - 5} y={yOf(mark) + 4}
                textAnchor="end" fontSize="9" fill="rgba(120,113,108,0.9)" fontWeight="600">
                {mark}
              </text>
            ))}

            {/* Grid lines */}
            {marks.map((mark) => (
              <line key={`grid-${mark}`} x1={PL} x2={VW - PR} y1={yOf(mark)} y2={yOf(mark)}
                stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="4 4" />
            ))}

            {/* Area fill */}
            <Motion.path d={areaPath} fill={`url(#${gradId})`}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.5 }} />

            {/* Line */}
            <Motion.path d={linePath} fill="none" stroke={theme.stroke}
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              filter={`url(#${glowId})`}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 1.4, ease: "easeInOut" }} />

            {/* Dots */}
            {series.map((item, i) => (
              <Motion.circle key={item.date}
                cx={xOf(i)} cy={yOf(item.value)}
                r={hovered === i ? 5 : 3}
                fill={hovered === i ? theme.stroke : "#0c0a09"}
                stroke={theme.stroke} strokeWidth="1.5"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 1.2 + i * 0.015, duration: 0.18 }}
                style={{ transformOrigin: `${xOf(i)}px ${yOf(item.value)}px`, cursor: "pointer" }}
              />
            ))}

            {/* Hover vertical line + tooltip */}
            {hovItem && (
              <>
                <line x1={xOf(hovered)} x2={xOf(hovered)} y1={PLOT_TOP} y2={PLOT_BOTTOM}
                  stroke="rgba(255,255,255,0.18)" strokeWidth="1" strokeDasharray="3 3" />
                <rect x={xOf(hovered) - 18} y={yOf(hovItem.value) - 28}
                  width={36} height={20} rx={5}
                  fill="rgba(15,15,15,0.92)" stroke={theme.stroke} strokeWidth="0.8" strokeOpacity="0.6" />
                <text x={xOf(hovered)} y={yOf(hovItem.value) - 13}
                  textAnchor="middle" fontSize="10" fontWeight="700" fill="white">
                  {hovItem.value}
                </text>
              </>
            )}

            {/* Invisible hover zones */}
            {series.map((item, i) => {
              const colW = n > 1 ? plotW / (n - 1) : plotW;
              return (
                <rect key={`hr-${item.date}`}
                  x={xOf(i) - colW / 2} y={PLOT_TOP}
                  width={colW} height={PLOT_H}
                  fill="transparent" style={{ cursor: "crosshair" }}
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered(null)} />
              );
            })}

            {/* X-axis labels */}
            {series.map((item, i) =>
              i % 3 === 0 || i === n - 1 ? (
                <text key={`xl-${item.date}`} x={xOf(i)} y={SVG_H - 4}
                  textAnchor="middle" fontSize="9" fill="rgba(120,113,108,0.8)">
                  {item.day}
                </text>
              ) : null
            )}
          </svg>
        </div>
      </div>
    </section>
  );
}

export default function WinMissDistracAchivAnalysis() {
  const [selectedYear, setSelectedYear] = useState(YEARS[0]);
  const [selectedMonth, setSelectedMonth] = useState("04");

  const availableMonths = useMemo(() => {
    const months = new Set(
      REFLECTION_LOGS.filter((entry) => entry.date.startsWith(selectedYear)).map((entry) => entry.date.slice(5, 7))
    );
    return MONTH_OPTIONS.filter((month) => months.has(month.value));
  }, [selectedYear]);

  const filteredLogs = useMemo(
    () =>
      REFLECTION_LOGS.filter(
        (entry) => entry.date.startsWith(selectedYear) && entry.date.slice(5, 7) === selectedMonth
      ).sort((a, b) => a.date.localeCompare(b.date)),
    [selectedMonth, selectedYear]
  );

  const winSeries = useMemo(
    () => buildMonthlySeries(filteredLogs, selectedYear, selectedMonth, "wins"),
    [filteredLogs, selectedMonth, selectedYear]
  );
  const mistakeSeries = useMemo(
    () => buildMonthlySeries(filteredLogs, selectedYear, selectedMonth, "mistakes"),
    [filteredLogs, selectedMonth, selectedYear]
  );
  const achievementSeries = useMemo(
    () => buildMonthlySeries(filteredLogs, selectedYear, selectedMonth, "achievements"),
    [filteredLogs, selectedMonth, selectedYear]
  );

  const totalWins = sumBy(filteredLogs, "wins");
  const totalMistakes = sumBy(filteredLogs, "mistakes");
  const totalAchievements = sumBy(filteredLogs, "achievements");
  const topMistakes = topRepeated(filteredLogs, "mistakeTags", 5);
  const topDistractions = topRepeated(filteredLogs, "distractionTags", 5);

  const insights = [
    {
      title: "Total Wins This Month",
      value: `${totalWins}`,
      description: "Total number of wins recorded in the selected month.",
    },
    {
      title: "Total Achievements This Month",
      value: `${totalAchievements}`,
      description: "Total number of achievements recorded in the selected month.",
    },
    {
      title: "Total Mistakes This Month",
      value: `${totalMistakes}`,
      description: "Total number of mistakes recorded in the selected month.",
    },
    {
      title: "Top 5 Repeated Mistakes",
      value: topMistakes.length ? topMistakes.map((item) => item.label).join(", ") : "No data",
      description: toListSummary(topMistakes, "No repeated mistakes found."),
    },
    {
      title: "Top 5 Repeated Distractions",
      value: topDistractions.length ? topDistractions.map((item) => item.label).join(", ") : "No data",
      description: toListSummary(topDistractions, "No repeated distractions found."),
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
              const nextMonths = MONTH_OPTIONS.filter((month) =>
                REFLECTION_LOGS.some(
                  (entry) => entry.date.startsWith(nextYear) && entry.date.slice(5, 7) === month.value
                )
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
            <MonthlyLineGraph
              title="No. Of Wins This Month"
              subtitle="Wins"
              series={winSeries}
              theme={{ stroke: "#10b981" }}
            />

            <MonthlyLineGraph
              title="No. Of Mistakes This Month"
              subtitle="Mistakes"
              series={mistakeSeries}
              theme={{ stroke: "#ef4444" }}
            />

            <MonthlyLineGraph
              title="Total Achievements This Month"
              subtitle="Achievements"
              series={achievementSeries}
              theme={{ stroke: "#f59e0b" }}
            />
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
