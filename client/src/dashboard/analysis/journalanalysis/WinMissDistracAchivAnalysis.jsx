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

const BAR_H = 190;
const LABEL_H = 56;

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

function MonthlyCountGraph({ title, subtitle, series, theme }) {
  const maxValue = Math.max(6, Math.max(...series.map((item) => item.value), 0));
  const CHART_TOP_PAD = 18;
  const drawableBarH = BAR_H - CHART_TOP_PAD;
  const markSet = new Set([0, maxValue]);
  for (let value = 2; value <= maxValue; value += 2) {
    markSet.add(value);
  }
  const marks = [...markSet].sort((a, b) => a - b);

  const yLabelBottom = (mark) => {
    if (mark === maxValue) return drawableBarH - 2;
    if (mark === 0) return 0;
    return (mark / maxValue) * drawableBarH - 7;
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
        <div
          className="relative z-10 shrink-0 w-9 text-right text-[11px] font-semibold text-stone-300"
          style={{ height: BAR_H, marginBottom: LABEL_H }}
        >
          {marks.map((mark) => (
            <span
              key={mark}
              className="absolute right-0 rounded bg-stone-950/55 px-0.5"
              style={{ bottom: `${yLabelBottom(mark)}px` }}
            >
              {mark}
            </span>
          ))}
        </div>

        <div className="relative flex-1 overflow-x-auto">
          <div style={{ minWidth: `${Math.max(760, series.length * 28)}px` }}>
            <div className="relative" style={{ height: BAR_H + LABEL_H }}>
              {marks.map((mark) => (
                <div
                  key={mark}
                  className="absolute left-0 right-0 border-t border-dashed border-white/6"
                  style={{ bottom: LABEL_H + (mark / maxValue) * drawableBarH }}
                />
              ))}

              <div className="absolute inset-0 flex items-end gap-1.5" style={{ paddingBottom: `${LABEL_H}px` }}>
                {series.map((item, index) => (
                  <div key={item.date} className="flex min-w-0 flex-1 flex-col items-center justify-end">
                    <span className={`mb-1 text-[10px] font-semibold ${theme.value}`}>{item.value}</span>
                    <Motion.div
                      className={`w-full max-w-[20px] rounded-t-lg border ${theme.border} ${theme.fill}`}
                      style={theme.barStyle}
                      initial={{ height: 0 }}
                      animate={{ height: Math.max(10, Math.round((item.value / maxValue) * drawableBarH)) }}
                      transition={{ duration: 0.45, delay: index * 0.02 }}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-1 flex items-center text-[10px] text-stone-500">
              {series.map((item) => (
                <span key={`label-${item.date}`} className="flex-1 text-center">
                  {item.day}
                </span>
              ))}
            </div>
          </div>
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
            <MonthlyCountGraph
              title="No. Of Wins This Month"
              subtitle="Wins"
              series={winSeries}
              theme={{
                dot: "bg-emerald-300",
                fill: "bg-emerald-500/70 bg-gradient-to-t from-emerald-900/95 to-emerald-300/90",
                border: "border-emerald-200/25",
                value: "text-emerald-200",
              }}
            />

            <MonthlyCountGraph
              title="No. Of Mistakes This Month"
              subtitle="Mistakes"
              series={mistakeSeries}
              theme={{
                dot: "bg-red-400",
                fill: "bg-red-500/90",
                border: "border-red-300/40",
                value: "text-red-200",
                barStyle: {
                  backgroundColor: "rgba(239, 68, 68, 0.9)",
                  backgroundImage: "linear-gradient(to top, rgba(127, 29, 29, 0.95), rgba(239, 68, 68, 0.95))",
                  borderColor: "rgba(252, 165, 165, 0.45)",
                  boxShadow: "0 0 12px rgba(239, 68, 68, 0.35)",
                },
              }}
            />

            <MonthlyCountGraph
              title="Total Achievements This Month"
              subtitle="Achievements"
              series={achievementSeries}
              theme={{
                dot: "bg-amber-300",
                fill: "bg-amber-500/70 bg-gradient-to-t from-amber-900/95 to-amber-300/90",
                border: "border-amber-200/25",
                value: "text-amber-200",
              }}
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
