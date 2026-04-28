import { useMemo, useState } from "react";
import { motion as Motion } from "framer-motion";
import littleMonkLogo from "../../../assets/littlemonklogo.png";

const FILTERS = ["All", "Short Term", "Long Term", "High", "Medium", "Low"];
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

const GOAL_PROGRESS_MONTHLY_DATA = [
  {
    year: "2026",
    month: "04",
    goals: [
      { title: "Crack GATE 2027", type: "Long Term", priority: "High", progress: 34, completed: 2, total: 5, lateCompleted: 1 },
      { title: "Learn Web Dev", type: "Short Term", priority: "Medium", progress: 42, completed: 3, total: 6, lateCompleted: 1 },
      { title: "Build Production APIs", type: "Short Term", priority: "High", progress: 46, completed: 4, total: 6, lateCompleted: 0 },
      { title: "SQL Mastery", type: "Short Term", priority: "High", progress: 55, completed: 4, total: 5, lateCompleted: 1 },
      { title: "Upgrade Resume + Portfolio", type: "Short Term", priority: "Medium", progress: 40, completed: 2, total: 5, lateCompleted: 2 },
      { title: "AI/ML Roadmap", type: "Long Term", priority: "Medium", progress: 32, completed: 2, total: 6, lateCompleted: 0 },
      { title: "Fitness Cut", type: "Long Term", priority: "Low", progress: 36, completed: 3, total: 5, lateCompleted: 1 },
    ],
    subgoalByDay: [
      { day: 2, completed: 1 }, { day: 4, completed: 2 }, { day: 7, completed: 3 }, { day: 10, completed: 5 },
      { day: 13, completed: 7 }, { day: 16, completed: 9 }, { day: 19, completed: 11 }, { day: 22, completed: 13 },
      { day: 25, completed: 15 }, { day: 28, completed: 18 }, { day: 30, completed: 20 },
    ],
  },
  {
    year: "2026",
    month: "03",
    goals: [
      { title: "Crack GATE 2027", type: "Long Term", priority: "High", progress: 30, completed: 2, total: 5, lateCompleted: 0 },
      { title: "Learn Web Dev", type: "Short Term", priority: "Medium", progress: 35, completed: 2, total: 6, lateCompleted: 2 },
      { title: "SQL Mastery", type: "Short Term", priority: "High", progress: 41, completed: 3, total: 5, lateCompleted: 1 },
      { title: "React Native App", type: "Short Term", priority: "Medium", progress: 28, completed: 1, total: 5, lateCompleted: 1 },
      { title: "AI/ML Roadmap", type: "Long Term", priority: "Medium", progress: 32, completed: 2, total: 6, lateCompleted: 0 },
    ],
    subgoalByDay: [
      { day: 3, completed: 1 }, { day: 6, completed: 2 }, { day: 9, completed: 3 }, { day: 12, completed: 5 },
      { day: 16, completed: 6 }, { day: 20, completed: 8 }, { day: 24, completed: 10 }, { day: 29, completed: 12 },
    ],
  },
  {
    year: "2026",
    month: "02",
    goals: [
      { title: "Crack GATE 2027", type: "Long Term", priority: "High", progress: 26, completed: 1, total: 5, lateCompleted: 1 },
      { title: "Learn Web Dev", type: "Short Term", priority: "Medium", progress: 31, completed: 2, total: 6, lateCompleted: 2 },
      { title: "SQL Mastery", type: "Short Term", priority: "High", progress: 34, completed: 2, total: 5, lateCompleted: 1 },
      { title: "Fitness Cut", type: "Long Term", priority: "Low", progress: 30, completed: 2, total: 5, lateCompleted: 0 },
    ],
    subgoalByDay: [
      { day: 2, completed: 1 }, { day: 5, completed: 2 }, { day: 9, completed: 3 }, { day: 14, completed: 4 },
      { day: 18, completed: 6 }, { day: 22, completed: 7 }, { day: 27, completed: 9 },
    ],
  },
  {
    year: "2025",
    month: "12",
    goals: [
      { title: "Crack GATE 2027", type: "Long Term", priority: "High", progress: 20, completed: 1, total: 5, lateCompleted: 1 },
      { title: "System Design", type: "Long Term", priority: "Medium", progress: 24, completed: 1, total: 4, lateCompleted: 0 },
      { title: "Portfolio Refresh", type: "Short Term", priority: "Medium", progress: 38, completed: 2, total: 5, lateCompleted: 2 },
      { title: "Competitive Programming", type: "Short Term", priority: "Low", progress: 29, completed: 2, total: 5, lateCompleted: 1 },
    ],
    subgoalByDay: [
      { day: 4, completed: 1 }, { day: 8, completed: 2 }, { day: 12, completed: 3 }, { day: 17, completed: 4 },
      { day: 21, completed: 5 }, { day: 26, completed: 7 }, { day: 30, completed: 8 },
    ],
  },
];

const YEARS = [...new Set(GOAL_PROGRESS_MONTHLY_DATA.map((entry) => entry.year))].sort().reverse();
const CURRENT_YEAR = String(new Date().getFullYear());
const CURRENT_MONTH = String(new Date().getMonth() + 1).padStart(2, "0");

const round = (value, precision = 1) => Number(value.toFixed(precision));
const average = (values) => (values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0);

function getDaysInMonth(year, month) {
  return new Date(Number(year), Number(month), 0).getDate();
}

function getAvailableMonthsForYear(year) {
  return MONTH_OPTIONS.filter((month) =>
    GOAL_PROGRESS_MONTHLY_DATA.some((entry) => entry.year === year && entry.month === month.value)
  );
}

const INITIAL_YEAR = YEARS.includes(CURRENT_YEAR) ? CURRENT_YEAR : YEARS[0];
const INITIAL_MONTH = (() => {
  const months = getAvailableMonthsForYear(INITIAL_YEAR);
  if (months.some((month) => month.value === CURRENT_MONTH)) return CURRENT_MONTH;
  return months[0]?.value ?? MONTH_OPTIONS[0].value;
})();

function InsightRail({ insights }) {
  const [selectedInsight, setSelectedInsight] = useState(null);

  return (
    <aside className="flex max-h-[67vh] w-full flex-col overflow-hidden rounded-2xl border border-amber-100/10 bg-white/6 shadow-xl shadow-black/25 backdrop-blur">
      <div className="shrink-0 p-4 pb-3">
        <div className="flex items-center gap-3">
          <Motion.div className="relative grid h-14 w-14 place-items-center" animate={{ y: [0, -4, 0] }} transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}>
            <Motion.span className="absolute inset-2 rounded-full bg-amber-400/15 blur-md" animate={{ opacity: [0.35, 0.8, 0.35], scale: [0.9, 1.12, 0.9] }} transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }} />
            <Motion.img src={littleMonkLogo} alt="Little Monk AI Assistant" className="relative z-10 h-16 w-16 object-contain drop-shadow-[0_10px_18px_rgba(245,158,11,0.16)]" whileHover={{ scale: 1.08, rotate: -3 }} transition={{ type: "spring", stiffness: 260, damping: 14 }} />
          </Motion.div>
          <div>
            <h3 className="text-label-md">Little Monk's Analysis</h3>
            <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.14em] text-amber-300/70">AI Assistant</p>
          </div>
        </div>
      </div>

      <div className="journal-scroll min-h-0 flex-1 space-y-2.5 overflow-y-auto px-4 pb-4 pr-3">
        {insights.map((insight) => {
          const isSelected = selectedInsight === insight.title;
          return (
            <Motion.div key={insight.title} layout className={`rounded-xl border p-2.5 text-sm transition-colors ${isSelected ? "border-sky-400/30 bg-sky-500/8" : "border-sky-100/10 bg-stone-950/45 hover:border-sky-300/20"}`}>
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
                <button type="button" onClick={() => setSelectedInsight(isSelected ? null : insight.title)} className={`w-fit rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${isSelected ? "border-sky-400/40 bg-sky-400/15 text-sky-100" : "border-sky-400/20 text-sky-200 hover:border-sky-300/45 hover:bg-sky-400/10"}`}>
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

function GoalProgressGraph({ goals, activeFilter, onFilterChange }) {
  const [atBottom, setAtBottom] = useState(false);

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    setAtBottom(scrollHeight - scrollTop - clientHeight < 10);
  };

  return (
    <section className="rounded-[1.75rem] border border-sky-100/10 bg-stone-950/30 p-5 shadow-xl shadow-black/20">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-stone-500">Active Goals</p>
          <h4 className="mt-2 text-xl font-semibold text-sky-50">Goal Progress Analysis</h4>
        </div>
        <div className="flex flex-wrap items-center gap-1 rounded-full border border-amber-100/10 bg-stone-900/60 p-0.5">
          {FILTERS.map((filter) => (
            <button key={filter} type="button" onClick={() => onFilterChange(filter)} className={`rounded-full px-2.5 py-1 text-[10px] font-semibold transition-colors ${activeFilter === filter ? "bg-amber-500/20 text-amber-300" : "text-stone-500 hover:text-stone-300"}`}>
              {filter}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 overflow-x-auto">
        <div className="min-w-[760px]">
          <div className="sticky top-0 z-10 ml-44 grid grid-cols-6 rounded-md bg-stone-950/80 py-1 text-[10px] font-semibold text-stone-500 backdrop-blur">
            {[0, 20, 40, 60, 80, 100].map((tick) => <span key={tick} className="text-right">{tick}</span>)}
          </div>
          <div className="relative">
            <div
              className="journal-scroll mt-2 max-h-[40vh] space-y-4 overflow-y-auto pr-3"
              onScroll={handleScroll}
            >
              {goals.map((goal, index) => (
                <div key={goal.title} className="grid grid-cols-[11rem_1fr] items-center gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-stone-200">{goal.title}</p>
                    <p className="mt-0.5 text-[10px] text-stone-500">{goal.type} • {goal.priority}</p>
                  </div>
                  <div className="relative border-l border-white/8 pl-3">
                    <div className="absolute bottom-0 top-0 grid w-[calc(100%-0.75rem)] grid-cols-5">
                      {[20, 40, 60, 80, 100].map((tick) => <span key={tick} className="border-r border-dashed border-white/6" />)}
                    </div>
                    <div className="relative flex items-center gap-2">
                      <Motion.div className="h-4 rounded-full border border-emerald-200/25 bg-gradient-to-r from-emerald-900/95 to-emerald-300/90" initial={{ width: 0 }} animate={{ width: `${goal.progress}%` }} transition={{ duration: 0.45, delay: index * 0.04 }} />
                      <span className="w-10 text-[10px] font-semibold text-emerald-200">{goal.progress}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {!atBottom && goals.length > 5 && (
              <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-14 rounded-b-xl bg-gradient-to-t from-stone-950/90 to-transparent" />
            )}
          </div>
          {goals.length > 5 && (
            <p className="mt-2 text-center text-[10px] text-stone-600">
              {goals.length} goals · scroll to see all
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function SubgoalLineGraph({ series, daysInMonth }) {
  const [hovered, setHovered] = useState(null);
  const width = Math.max(920, daysInMonth * 30);
  const height = 304;
  const pad = { top: 24, right: 22, bottom: 42, left: 42 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;
  const maxValue = Math.max(5, ...series.map((item) => item.completed));
  const yMarks = Array.from({ length: maxValue + 1 }, (_, index) => index).filter((value) => value % 5 === 0 || value === maxValue);
  const xOf = (index) => (series.length === 1 ? pad.left + chartW / 2 : pad.left + (index / (series.length - 1)) * chartW);
  const yOf = (value) => pad.top + ((maxValue - value) / maxValue) * chartH;
  const linePath = series.map((point, index) => `${index === 0 ? "M" : "L"}${xOf(index).toFixed(1)},${yOf(point.completed).toFixed(1)}`).join(" ");

  return (
    <section className="rounded-[1.75rem] border border-sky-100/10 bg-stone-950/30 p-5 shadow-xl shadow-black/20">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-stone-500">Sub Goals</p>
          <h4 className="mt-2 text-xl font-semibold text-sky-50">Sub Goal Completion Analysis</h4>
          <p className="mt-1 text-[11px] text-stone-400">x-axis shows all dates of the selected month.</p>
        </div>
        <span className="flex items-center gap-2 text-xs text-stone-400"><span className="h-2.5 w-2.5 rounded-full bg-sky-400" />Completed sub goals</span>
      </div>

      <div className="mt-6 overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ minWidth: `${width}px` }}>
          {yMarks.map((mark) => {
            const y = yOf(mark);
            return <g key={mark}><line x1={pad.left} y1={y} x2={width - pad.right} y2={y} stroke="rgba(255,255,255,0.08)" strokeDasharray="4 6" /><text x={pad.left - 10} y={y + 4} textAnchor="end" fontSize="10" fill="rgba(255,255,255,0.45)">{mark}</text></g>;
          })}
          <Motion.path d={linePath} fill="none" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }} transition={{ duration: 2.4, ease: "easeInOut" }} />
          {series.map((point, index) => (
            <circle
              key={point.day}
              cx={xOf(index)}
              cy={yOf(point.completed)}
              r={hovered === index ? 7 : 4.2}
              fill={hovered === index ? "#38bdf8" : "#0f172a"}
              stroke="#7dd3fc"
              strokeWidth="2"
              style={{ transition: "r 0.15s ease, fill 0.15s ease" }}
            />
          ))}
          {series.map((point, index) => <text key={`x-${point.day}`} x={xOf(index)} y={height - 12} textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.42)">{point.day}</text>)}
          {series.map((point, index) => {
            const stepW = series.length > 1 ? chartW / (series.length - 1) : chartW;
            return (
              <rect
                key={`hit-${point.day}`}
                x={Math.max(pad.left, xOf(index) - stepW / 2)}
                y={pad.top}
                width={stepW}
                height={chartH}
                fill="rgba(255,255,255,0.001)"
                style={{ cursor: "crosshair" }}
                onMouseEnter={() => setHovered(index)}
                onMouseMove={() => setHovered(index)}
                onMouseLeave={() => setHovered(null)}
              />
            );
          })}
          {hovered !== null && series[hovered] ? (
            <g style={{ pointerEvents: "none" }}>
              <line
                x1={xOf(hovered)}
                y1={pad.top}
                x2={xOf(hovered)}
                y2={pad.top + chartH}
                stroke="rgba(56,189,248,0.4)"
                strokeWidth="1"
                strokeDasharray="4 3"
              />
              <rect
                x={Math.min(Math.max(xOf(hovered) - 54, pad.left + 2), width - pad.right - 108)}
                y={Math.max(yOf(series[hovered].completed) - 48, pad.top + 2)}
                width="108"
                height="38"
                rx="7"
                fill="rgba(15,23,42,0.94)"
                stroke="rgba(56,189,248,0.45)"
                strokeWidth="1"
              />
              <text
                x={Math.min(Math.max(xOf(hovered), pad.left + 56), width - pad.right - 54)}
                y={Math.max(yOf(series[hovered].completed) - 28, pad.top + 22)}
                textAnchor="middle"
                fontSize="11"
                fontWeight="700"
                fill="#bae6fd"
              >
                Day {series[hovered].day}
              </text>
              <text
                x={Math.min(Math.max(xOf(hovered), pad.left + 56), width - pad.right - 54)}
                y={Math.max(yOf(series[hovered].completed) - 14, pad.top + 36)}
                textAnchor="middle"
                fontSize="10"
                fill="rgba(226,232,240,0.86)"
              >
                {series[hovered].completed} completed
              </text>
            </g>
          ) : null}
        </svg>
      </div>
    </section>
  );
}

export default function GoalProgressAnalysis() {
  const [selectedYear, setSelectedYear] = useState(INITIAL_YEAR);
  const [selectedMonth, setSelectedMonth] = useState(INITIAL_MONTH);
  const [goalFilter, setGoalFilter] = useState("All");

  const availableMonths = useMemo(() => getAvailableMonthsForYear(selectedYear), [selectedYear]);
  const selectedPeriod = useMemo(
    () => GOAL_PROGRESS_MONTHLY_DATA.find((entry) => entry.year === selectedYear && entry.month === selectedMonth) ?? GOAL_PROGRESS_MONTHLY_DATA[0],
    [selectedMonth, selectedYear]
  );

  const filteredGoals = selectedPeriod.goals.filter((goal) => goalFilter === "All" || goal.type === goalFilter || goal.priority === goalFilter);
  const daysInMonth = getDaysInMonth(selectedPeriod.year, selectedPeriod.month);

  const subgoalSeries = useMemo(() => {
    const completionMap = new Map(selectedPeriod.subgoalByDay.map((item) => [item.day, item.completed]));
    return Array.from({ length: daysInMonth }, (_, index) => {
      const day = index + 1;
      return { day, completed: completionMap.get(day) };
    }).reduce((acc, item) => {
      const last = acc.length > 0 ? acc[acc.length - 1].completed : 0;
      acc.push({ day: item.day, completed: item.completed ?? last });
      return acc;
    }, []);
  }, [selectedPeriod, daysInMonth]);

  const totalGoals = selectedPeriod.goals.length;
  const completedGoals = selectedPeriod.goals.filter((goal) => goal.progress >= 100 || goal.completed === goal.total).length;
  const totalSubgoals = selectedPeriod.goals.reduce((sum, goal) => sum + goal.total, 0);
  const completedSubgoals = selectedPeriod.goals.reduce((sum, goal) => sum + goal.completed, 0);
  const lateCompleted = selectedPeriod.goals.reduce((sum, goal) => sum + goal.lateCompleted, 0);
  const avgProgress = round(average(selectedPeriod.goals.map((goal) => goal.progress)));
  const mostProgressedGoal = selectedPeriod.goals.reduce((best, goal) => goal.progress > best.progress ? goal : best);
  const slowProgressGoal = selectedPeriod.goals.reduce((slow, goal) => goal.progress < slow.progress ? goal : slow);

  const insights = [
    { title: "Total Active Goal On This Month", value: `${totalGoals} goals`, description: "Active goals included in the selected month." },
    { title: "Goal Complete On This Month", value: `${completedGoals} goals`, description: `${completedGoals} of ${totalGoals} goals reached all sub-goals or 100% progress.` },
    { title: "Total Active Subgoal On This Month", value: `${totalSubgoals} sub goals`, description: "Total sub-goals attached to active goals this month." },
    { title: "Total Sub Goal Completed On This Section", value: `${completedSubgoals} completed`, description: `${completedSubgoals} of ${totalSubgoals} sub-goals are completed.` },
    { title: "No Of Late Completed Subgoal", value: `${lateCompleted} late`, description: "Sub-goals completed after their planned deadline." },
    { title: "Avg Progress All Over Goal", value: `${avgProgress}%`, description: "Average progress across all active goals." },
    { title: "Most Progressed Goal", value: `${mostProgressedGoal.title} (${mostProgressedGoal.progress}%)`, description: "Goal with the highest progress rate this month." },
    { title: "Slow Progress Goal", value: `${slowProgressGoal.title} (${slowProgressGoal.progress}%)`, description: "Goal with the lowest progress rate this month." },
  ];

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2 text-sm text-stone-300">
          <span className="text-stone-400">Year</span>
          <select value={selectedYear} onChange={(event) => {
            const nextYear = event.target.value;
            setSelectedYear(nextYear);
            const nextMonths = getAvailableMonthsForYear(nextYear);
            setSelectedMonth(nextMonths.some((month) => month.value === selectedMonth) ? selectedMonth : nextMonths[0]?.value ?? MONTH_OPTIONS[0].value);
          }} className="bg-transparent text-sky-100 outline-none">
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
        <div className="journal-scroll min-w-0 flex-1 scroll-smooth overflow-y-auto rounded-[2rem] border border-sky-100/10 bg-white/[0.03] shadow-2xl shadow-black/30 backdrop-blur" style={{ maxHeight: "calc(100vh - 350px)" }}>
          <div className="space-y-6 p-6">
            <SubgoalLineGraph series={subgoalSeries} daysInMonth={daysInMonth} />
            <GoalProgressGraph goals={filteredGoals} activeFilter={goalFilter} onFilterChange={setGoalFilter} />
          </div>
        </div>

        <div className="journal-scroll flex w-full w-full lg:max-w-[360px] lg:shrink-0 self-start flex-col gap-2 scroll-smooth overflow-y-auto" style={{ maxHeight: "calc(100vh - 180px)" }}>
          <InsightRail insights={insights} />
        </div>
      </div>
    </section>
  );
}
