import { useMemo, useState } from "react";
import { motion as Motion } from "framer-motion";
import littleMonkLogo from "../../../assets/littlemonklogo.png";

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

const GOAL_SCORE_MONTHLY_DATA = [
  {
    year: "2026",
    month: "04",
    goals: [
      { title: "Crack GATE 2027", consistency: 78, progress: 34, expected: 28, deadlineDays: 253 },
      { title: "Learn Web Dev", consistency: 62, progress: 42, expected: 58, deadlineDays: 34 },
      { title: "Build Production APIs", consistency: 84, progress: 46, expected: 44, deadlineDays: 63 },
      { title: "SQL Mastery", consistency: 89, progress: 55, expected: 49, deadlineDays: 40 },
      { title: "Upgrade Resume + Portfolio", consistency: 58, progress: 40, expected: 63, deadlineDays: 31 },
      { title: "AI/ML Roadmap", consistency: 72, progress: 32, expected: 28, deadlineDays: 233 },
      { title: "Fitness Cut", consistency: 67, progress: 36, expected: 34, deadlineDays: 126 },
    ],
    weeklyScores: [72, 64, 82, 76],
  },
  {
    year: "2026",
    month: "03",
    goals: [
      { title: "Crack GATE 2027", consistency: 74, progress: 30, expected: 26, deadlineDays: 284 },
      { title: "Learn Web Dev", consistency: 54, progress: 35, expected: 54, deadlineDays: 65 },
      { title: "SQL Mastery", consistency: 71, progress: 41, expected: 45, deadlineDays: 71 },
      { title: "React Native App", consistency: 48, progress: 28, expected: 36, deadlineDays: 101 },
      { title: "AI/ML Roadmap", consistency: 76, progress: 32, expected: 28, deadlineDays: 264 },
    ],
    weeklyScores: [58, 62, 71, 67],
  },
  {
    year: "2026",
    month: "02",
    goals: [
      { title: "Crack GATE 2027", consistency: 66, progress: 26, expected: 24, deadlineDays: 312 },
      { title: "Learn Web Dev", consistency: 52, progress: 31, expected: 49, deadlineDays: 93 },
      { title: "SQL Mastery", consistency: 61, progress: 34, expected: 39, deadlineDays: 99 },
      { title: "Fitness Cut", consistency: 64, progress: 30, expected: 31, deadlineDays: 154 },
    ],
    weeklyScores: [54, 59, 63, 60],
  },
  {
    year: "2025",
    month: "12",
    goals: [
      { title: "Crack GATE 2027", consistency: 58, progress: 20, expected: 21, deadlineDays: 371 },
      { title: "System Design", consistency: 65, progress: 24, expected: 28, deadlineDays: 245 },
      { title: "Portfolio Refresh", consistency: 50, progress: 38, expected: 55, deadlineDays: 38 },
      { title: "Competitive Programming", consistency: 56, progress: 29, expected: 34, deadlineDays: 82 },
    ],
    weeklyScores: [49, 53, 60, 56],
  },
];

const YEARS = [...new Set(GOAL_SCORE_MONTHLY_DATA.map((entry) => entry.year))].sort().reverse();
const CURRENT_YEAR = String(new Date().getFullYear());
const CURRENT_MONTH = String(new Date().getMonth() + 1).padStart(2, "0");

const round = (value, precision = 1) => Number(value.toFixed(precision));
const average = (values) => (values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0);

function getAvailableMonthsForYear(year) {
  return MONTH_OPTIONS.filter((month) =>
    GOAL_SCORE_MONTHLY_DATA.some((entry) => entry.year === year && entry.month === month.value)
  );
}

const INITIAL_YEAR = YEARS.includes(CURRENT_YEAR) ? CURRENT_YEAR : YEARS[0];
const INITIAL_MONTH = (() => {
  const months = getAvailableMonthsForYear(INITIAL_YEAR);
  if (months.some((month) => month.value === CURRENT_MONTH)) return CURRENT_MONTH;
  return months[0]?.value ?? MONTH_OPTIONS[0].value;
})();

function riskLabel(goal) {
  const delta = goal.progress - goal.expected;
  if (delta >= 0) return "On Track";
  if (delta >= -12) return "Slightly Behind";
  return "Behind Schedule";
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
            <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.14em] text-amber-300/70">AI Assistant</p>
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
                isSelected ? "border-sky-400/30 bg-sky-500/8" : "border-sky-100/10 bg-stone-950/45 hover:border-sky-300/20"
              }`}
            >
              <div className="grid grid-cols-[1fr_auto] items-start gap-3">
                <div className="min-w-0">
                  <span className="text-xs font-semibold text-sky-200">{insight.title}</span>
                  <p className="text-sm font-semibold text-stone-200">{insight.value}</p>
                  {isSelected ? (
                    <Motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="mt-1.5 text-xs leading-relaxed text-stone-400">
                      {insight.description}
                    </Motion.p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedInsight(isSelected ? null : insight.title)}
                  className={`w-fit rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                    isSelected ? "border-sky-400/40 bg-sky-400/15 text-sky-100" : "border-sky-400/20 text-sky-200 hover:border-sky-300/45 hover:bg-sky-400/10"
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

function HorizontalRateGraph({ title, subtitle, goals }) {
  return (
    <section className="rounded-[1.75rem] border border-sky-100/10 bg-stone-950/30 p-5 shadow-xl shadow-black/20">
      <div>
        <p className="text-[11px] uppercase tracking-[0.22em] text-stone-500">{subtitle}</p>
        <h4 className="mt-2 text-xl font-semibold text-sky-50">{title}</h4>
      </div>

      <div className="mt-6 overflow-x-auto">
        <div className="min-w-[760px]">
          <div className="ml-44 grid grid-cols-6 text-[10px] font-semibold text-stone-500">
            {[0, 20, 40, 60, 80, 100].map((tick) => <span key={tick} className="text-right">{tick}</span>)}
          </div>
          <div className="journal-scroll mt-2 max-h-[43vh] space-y-4 overflow-y-auto pr-3">
            {goals.map((goal, index) => (
              <div key={goal.title} className="grid grid-cols-[11rem_1fr] items-center gap-3">
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-stone-200">{goal.title}</p>
                  <p className="mt-0.5 text-[10px] text-stone-500">{riskLabel(goal)}</p>
                </div>
                <div className="relative border-l border-white/8 pl-3">
                  <div className="absolute bottom-0 top-0 grid w-[calc(100%-0.75rem)] grid-cols-5">
                    {[20, 40, 60, 80, 100].map((tick) => <span key={tick} className="border-r border-dashed border-white/6" />)}
                  </div>
                  <div className="relative flex items-center gap-2">
                    <Motion.div
                      className="h-4 rounded-full border border-emerald-200/25 bg-gradient-to-r from-emerald-900/95 to-emerald-300/90"
                      initial={{ width: 0 }}
                      animate={{ width: `${goal.consistency}%` }}
                      transition={{ duration: 0.45, delay: index * 0.04 }}
                    />
                    <span className="w-10 text-[10px] font-semibold text-emerald-200">{goal.consistency}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function DeadlineAnalysisGraph({ goals }) {
  return (
    <section className="rounded-[1.75rem] border border-sky-100/10 bg-stone-950/30 p-5 shadow-xl shadow-black/20">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-stone-500">Deadline Pressure</p>
          <h4 className="mt-2 text-xl font-semibold text-sky-50">Deadline Analysis</h4>
        </div>
        <div className="flex items-center gap-3 text-xs text-stone-400">
          <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-sky-300" />Progress</span>
          <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-amber-300" />Expected</span>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto">
        <div className="min-w-[760px]">
          <div className="journal-scroll max-h-[48vh] space-y-4 overflow-y-auto pr-3">
            {goals.map((goal, index) => {
              const behind = goal.progress < goal.expected;
              return (
                <div key={goal.title} className="grid grid-cols-[11rem_1fr] items-center gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-stone-200">{goal.title}</p>
                    <p className={`mt-0.5 text-[10px] font-semibold ${behind ? "text-rose-300" : "text-emerald-300"}`}>
                      {riskLabel(goal)} • {goal.deadlineDays}d left
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Motion.div
                        className="h-3 rounded-full border border-sky-200/25 bg-gradient-to-r from-sky-900/95 to-sky-300/90"
                        initial={{ width: 0 }}
                        animate={{ width: `${goal.progress}%` }}
                        transition={{ duration: 0.45, delay: index * 0.04 }}
                      />
                      <span className="w-10 text-[10px] font-semibold text-sky-200">{goal.progress}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Motion.div
                        className={`h-3 rounded-full border ${behind ? "border-rose-200/25 bg-gradient-to-r from-rose-900/95 to-rose-300/90" : "border-amber-200/25 bg-gradient-to-r from-amber-900/95 to-amber-300/90"}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${goal.expected}%` }}
                        transition={{ duration: 0.45, delay: index * 0.04 + 0.05 }}
                      />
                      <span className={`w-10 text-[10px] font-semibold ${behind ? "text-rose-200" : "text-amber-200"}`}>{goal.expected}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function WeeklyScoreGraph({ series }) {
  const [hovered, setHovered] = useState(null);
  const barH = 190;
  const labelH = 56;
  const ticks = [0, 20, 40, 60, 80, 100];

  return (
    <section className="rounded-[1.75rem] border border-sky-100/10 bg-stone-950/30 p-5 shadow-xl shadow-black/20">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-stone-500">4 Week Breakdown</p>
          <h4 className="mt-2 text-xl font-semibold text-sky-50">Weekly Score Analysis</h4>
        </div>
        <span className="flex items-center gap-2 text-xs text-stone-400"><span className="h-2.5 w-2.5 rounded-full bg-amber-300" />Score</span>
      </div>

      <div className="mt-6 flex gap-3">
        <div className="relative z-10 w-9 shrink-0 text-right text-[11px] font-semibold text-stone-300" style={{ height: barH, marginBottom: labelH }}>
          {ticks.map((tick) => <span key={tick} className="absolute right-0 rounded bg-stone-950/55 px-0.5" style={{ bottom: `${(tick / 100) * barH - (tick === 0 ? 0 : 7)}px` }}>{tick}</span>)}
        </div>
        <div className="relative flex-1">
          <div className="relative" style={{ height: barH + labelH }}>
            {ticks.map((tick) => <div key={tick} className="absolute left-0 right-0 border-t border-dashed border-white/6" style={{ bottom: labelH + (tick / 100) * barH }} />)}
            <div className="absolute inset-0 flex items-end gap-2.5" style={{ paddingBottom: `${labelH}px` }}>
              {series.map((item, index) => (
                <div
                  key={item.label}
                  className="flex min-w-0 flex-1 flex-col items-center justify-end"
                  style={{ opacity: hovered !== null && hovered !== index ? 0.4 : 1, transition: "opacity 0.18s ease", cursor: "default" }}
                  onMouseEnter={() => setHovered(index)}
                  onMouseLeave={() => setHovered(null)}
                >
                  <span className="mb-1 text-[10px] font-semibold text-amber-200">{item.value}</span>
                  <Motion.div
                    className="w-full max-w-[42px] rounded-t-xl border border-amber-200/25 bg-gradient-to-t from-amber-900/95 to-amber-300/90"
                    initial={{ height: 0 }}
                    animate={{ height: Math.max(10, Math.round((item.value / 100) * barH)) }}
                    transition={{ duration: 0.42, delay: index * 0.04 }}
                  />
                </div>
              ))}
            </div>
          </div>
          <div className="mt-1 flex items-center text-[10px] text-stone-500">
            {series.map((item) => <span key={`x-${item.label}`} className="flex-1 text-center">{item.label}</span>)}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function ScoreConsisteDeadAnalysis() {
  const [selectedYear, setSelectedYear] = useState(INITIAL_YEAR);
  const [selectedMonth, setSelectedMonth] = useState(INITIAL_MONTH);

  const availableMonths = useMemo(() => getAvailableMonthsForYear(selectedYear), [selectedYear]);
  const selectedPeriod = useMemo(
    () =>
      GOAL_SCORE_MONTHLY_DATA.find((entry) => entry.year === selectedYear && entry.month === selectedMonth) ??
      GOAL_SCORE_MONTHLY_DATA.find((entry) => entry.year === selectedYear) ??
      GOAL_SCORE_MONTHLY_DATA[0],
    [selectedMonth, selectedYear]
  );

  const weeklyScoreSeries = selectedPeriod.weeklyScores.map((value, index) => ({ label: `W${index + 1}`, value }));
  const avgWeeklyScore = round(average(selectedPeriod.weeklyScores));
  const mostConsistentGoal = selectedPeriod.goals.reduce((best, goal) => goal.consistency > best.consistency ? goal : best);
  const lessConsistentGoal = selectedPeriod.goals.reduce((worst, goal) => goal.consistency < worst.consistency ? goal : worst);
  const behindGoals = selectedPeriod.goals.filter((goal) => riskLabel(goal) === "Behind Schedule");

  const insights = [
    {
      title: "Most Consistent Goal",
      value: `${mostConsistentGoal.title} (${mostConsistentGoal.consistency}%)`,
      description: "Goal with the strongest consistency rate this month.",
    },
    {
      title: "Less Consistent Goal",
      value: `${lessConsistentGoal.title} (${lessConsistentGoal.consistency}%)`,
      description: "Goal with the lowest consistency rate this month.",
    },
    {
      title: "Avg Weekly Score",
      value: `${avgWeeklyScore}`,
      description: "Average of the four weekly goal score values.",
    },
    {
      title: "Behind Schedule Goals",
      value: `${behindGoals.length} goals`,
      description: behindGoals.length
        ? `${behindGoals.map((goal) => goal.title).join(", ")} need faster progress against deadline pace.`
        : "No goals are currently behind schedule.",
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
              const nextMonths = getAvailableMonthsForYear(nextYear);
              const monthSet = new Set(nextMonths.map((month) => month.value));
              if (monthSet.has(selectedMonth)) {
                setSelectedMonth(selectedMonth);
                return;
              }
              if (monthSet.has(CURRENT_MONTH)) {
                setSelectedMonth(CURRENT_MONTH);
                return;
              }
              setSelectedMonth(nextMonths[0]?.value ?? MONTH_OPTIONS[0].value);
            }}
            className="bg-transparent text-sky-100 outline-none"
          >
            {YEARS.map((year) => <option key={year} value={year} className="bg-stone-950 text-stone-200">{year}</option>)}
          </select>
        </label>

        <label className="flex items-center gap-2 rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2 text-sm text-stone-300">
          <span className="text-stone-400">Month</span>
          <select value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} className="bg-transparent text-sky-100 outline-none">
            {availableMonths.map((month) => <option key={month.value} value={month.value} className="bg-stone-950 text-stone-200">{month.label}</option>)}
          </select>
        </label>
      </div>

      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        <div
          className="journal-scroll min-w-0 flex-1 scroll-smooth overflow-y-auto rounded-[2rem] border border-sky-100/10 bg-white/[0.03] shadow-2xl shadow-black/30 backdrop-blur"
          style={{ maxHeight: "calc(100vh - 350px)" }}
        >
          <div className="space-y-6 p-6">
            <HorizontalRateGraph title="Goal Consistency Analysis" subtitle="Consistency Rate" goals={selectedPeriod.goals} />
            <DeadlineAnalysisGraph goals={selectedPeriod.goals} />
            <WeeklyScoreGraph series={weeklyScoreSeries} />
          </div>
        </div>

        <div
          className="journal-scroll flex w-full w-full lg:max-w-[360px] lg:shrink-0 self-start flex-col gap-2 scroll-smooth overflow-y-auto"
          style={{ maxHeight: "calc(100vh - 180px)" }}
        >
          <InsightRail insights={insights} />
        </div>
      </div>
    </section>
  );
}
