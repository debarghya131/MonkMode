import { useEffect, useState } from "react";
import { motion as Motion } from "framer-motion";
import littleMonkLogo from "../../../assets/littlemonklogo.png";
import api from "../../../api/axios";
import useAuth from "../../../hooks/useAuth";
import { buildDemoGoalAnalysis } from "./demoGoalAnalysis";

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

const NOW = new Date();
const YEARS = Array.from({ length: NOW.getFullYear() - 2023 }, (_, i) => String(NOW.getFullYear() - i));
const CURRENT_MONTH = String(NOW.getMonth() + 1).padStart(2, "0");

const round = (value, precision = 1) => Number(value.toFixed(precision));
const average = (values) => (values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : 0);
const getDaysInMonth = (year, month) => new Date(Number(year), Number(month), 0).getDate();
const buildEmptySubgoalSeries = (daysInMonth) =>
  Array.from({ length: daysInMonth }, (_, index) => ({
    day: index + 1,
    completed: 0,
  }));

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

  const filtered = goals.filter((g) =>
    activeFilter === "All" || g.type === activeFilter || g.priority === activeFilter
  );

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
              className="journal-scroll mt-2 max-h-[40vh] min-h-40 space-y-4 overflow-y-auto pr-3"
              onScroll={(e) => {
                const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
                setAtBottom(scrollHeight - scrollTop - clientHeight < 10);
              }}
            >
              {filtered.map((goal, index) => (
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
              {filtered.length === 0 && (
                <div className="grid grid-cols-[11rem_1fr] items-center gap-3 opacity-60">
                  <div className="h-8 rounded-lg border border-dashed border-white/8 bg-white/[0.02]" />
                  <div className="relative h-12 border-l border-white/8 pl-3">
                    <div className="absolute bottom-0 top-0 grid w-[calc(100%-0.75rem)] grid-cols-5">
                      {[20, 40, 60, 80, 100].map((tick) => <span key={tick} className="border-r border-dashed border-white/6" />)}
                    </div>
                    <div className="relative top-4 h-4 rounded-full border border-white/8 bg-white/[0.03]" />
                  </div>
                </div>
              )}
            </div>
            {!atBottom && filtered.length > 5 && (
              <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-14 rounded-b-xl bg-gradient-to-t from-stone-950/90 to-transparent" />
            )}
          </div>
          {filtered.length > 5 && (
            <p className="mt-2 text-center text-[10px] text-stone-600">{filtered.length} goals · scroll to see all</p>
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
  const yMarks = Array.from({ length: maxValue + 1 }, (_, i) => i).filter((v) => v % Math.max(1, Math.floor(maxValue / 5)) === 0 || v === maxValue);
  const xOf = (index) => (series.length === 1 ? pad.left + chartW / 2 : pad.left + (index / (series.length - 1)) * chartW);
  const yOf = (value) => pad.top + ((maxValue - value) / maxValue) * chartH;
  const linePath = series.map((point, index) => `${index === 0 ? "M" : "L"}${xOf(index).toFixed(1)},${yOf(point.completed).toFixed(1)}`).join(" ");

  return (
    <section className="rounded-[1.75rem] border border-sky-100/10 bg-stone-950/30 p-5 shadow-xl shadow-black/20">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-stone-500">Sub Goals</p>
          <h4 className="mt-2 text-xl font-semibold text-sky-50">Sub Goal Completion Analysis</h4>
          <p className="mt-1 text-[11px] text-stone-400">Cumulative sub-goals completed through the month.</p>
        </div>
        <span className="flex items-center gap-2 text-xs text-stone-400"><span className="h-2.5 w-2.5 rounded-full bg-sky-400" />Cumulative completed</span>
      </div>

      <div className="mt-6 overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ minWidth: `${width}px` }}>
          {yMarks.map((mark) => {
            const y = yOf(mark);
            return <g key={mark}><line x1={pad.left} y1={y} x2={width - pad.right} y2={y} stroke="rgba(255,255,255,0.08)" strokeDasharray="4 6" /><text x={pad.left - 10} y={y + 4} textAnchor="end" fontSize="10" fill="rgba(255,255,255,0.45)">{mark}</text></g>;
          })}
          <Motion.path d={linePath} fill="none" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }} transition={{ duration: 2.4, ease: "easeInOut" }} />
          {series.map((point, index) => (
            <circle key={point.day} cx={xOf(index)} cy={yOf(point.completed)} r={hovered === index ? 7 : 4.2} fill={hovered === index ? "#38bdf8" : "#0f172a"} stroke="#7dd3fc" strokeWidth="2" style={{ transition: "r 0.15s ease, fill 0.15s ease" }} />
          ))}
          {series.map((point, index) => <text key={`x-${point.day}`} x={xOf(index)} y={height - 12} textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.42)">{point.day}</text>)}
          {series.map((point, index) => {
            const stepW = series.length > 1 ? chartW / (series.length - 1) : chartW;
            return (
              <rect key={`hit-${point.day}`} x={Math.max(pad.left, xOf(index) - stepW / 2)} y={pad.top} width={stepW} height={chartH} fill="rgba(255,255,255,0.001)" style={{ cursor: "crosshair" }} onMouseEnter={() => setHovered(index)} onMouseMove={() => setHovered(index)} onMouseLeave={() => setHovered(null)} />
            );
          })}
          {hovered !== null && series[hovered] ? (
            <g style={{ pointerEvents: "none" }}>
              <line x1={xOf(hovered)} y1={pad.top} x2={xOf(hovered)} y2={pad.top + chartH} stroke="rgba(56,189,248,0.4)" strokeWidth="1" strokeDasharray="4 3" />
              <rect x={Math.min(Math.max(xOf(hovered) - 54, pad.left + 2), width - pad.right - 108)} y={Math.max(yOf(series[hovered].completed) - 48, pad.top + 2)} width="108" height="38" rx="7" fill="rgba(15,23,42,0.94)" stroke="rgba(56,189,248,0.45)" strokeWidth="1" />
              <text x={Math.min(Math.max(xOf(hovered), pad.left + 56), width - pad.right - 54)} y={Math.max(yOf(series[hovered].completed) - 28, pad.top + 22)} textAnchor="middle" fontSize="11" fontWeight="700" fill="#bae6fd">Day {series[hovered].day}</text>
              <text x={Math.min(Math.max(xOf(hovered), pad.left + 56), width - pad.right - 54)} y={Math.max(yOf(series[hovered].completed) - 14, pad.top + 36)} textAnchor="middle" fontSize="10" fill="rgba(226,232,240,0.86)">{series[hovered].completed} completed</text>
            </g>
          ) : null}
        </svg>
      </div>
    </section>
  );
}

export default function GoalProgressAnalysis() {
  const { isDemoMode, user } = useAuth();
  const [selectedYear, setSelectedYear] = useState(String(NOW.getFullYear()));
  const [selectedMonth, setSelectedMonth] = useState(isDemoMode ? "05" : CURRENT_MONTH);
  const [goalFilter, setGoalFilter] = useState("All");
  const [apiData, setApiData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (isDemoMode) {
      setApiData(buildDemoGoalAnalysis(selectedYear, selectedMonth));
      setLoading(false);
      return;
    }

    let active = true;

    async function loadGoalAnalysis() {
      setLoading(true);
      setApiData(null);
      try {
        const res = await api.get("/goals/analysis", { params: { year: selectedYear, month: selectedMonth } });
        if (active) setApiData(res.data);
      } catch {
        if (active) setApiData(null);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadGoalAnalysis();

    return () => {
      active = false;
    };
  }, [isDemoMode, user, selectedYear, selectedMonth]);

  const goals = apiData?.goals ?? [];
  const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);
  const subgoalByDay = apiData?.subgoalByDay?.length
    ? apiData.subgoalByDay
    : buildEmptySubgoalSeries(daysInMonth);

  const totalGoals = goals.length;
  const completedGoals = goals.filter((g) => g.isCompleted).length;
  const totalSubgoals = goals.reduce((sum, g) => sum + g.totalSubgoals, 0);
  const completedSubgoals = goals.reduce((sum, g) => sum + g.completedSubgoals, 0);
  const lateCompleted = goals.reduce((sum, g) => sum + g.lateCompletedSubgoals, 0);
  const avgProgress = round(average(goals.map((g) => g.progress)));
  const mostProgressedGoal = goals.length ? goals.reduce((best, g) => g.progress > best.progress ? g : best) : null;
  const slowProgressGoal = goals.length ? goals.reduce((slow, g) => g.progress < slow.progress ? g : slow) : null;

  const insights = [
    { title: "Total Active Goals", value: `${totalGoals} goals`, description: "Total non-deleted goals in your account." },
    { title: "Goals Completed", value: `${completedGoals} goals`, description: `${completedGoals} of ${totalGoals} goals reached 100% progress or all sub-goals done.` },
    { title: "Total Sub-Goals", value: `${totalSubgoals} sub-goals`, description: "Total sub-goals across all active goals." },
    { title: "Sub-Goals Completed", value: `${completedSubgoals} completed`, description: `${completedSubgoals} of ${totalSubgoals} sub-goals have been completed.` },
    { title: "Late Completed Sub-Goals", value: `${lateCompleted} late`, description: "Sub-goals completed after their planned deadline." },
    { title: "Avg Progress", value: `${avgProgress}%`, description: "Average progress percentage across all active goals." },
    {
      title: "Most Progressed Goal",
      value: mostProgressedGoal ? `${mostProgressedGoal.title} (${mostProgressedGoal.progress}%)` : "—",
      description: "Goal with the highest current progress.",
    },
    {
      title: "Slowest Progress Goal",
      value: slowProgressGoal ? `${slowProgressGoal.title} (${slowProgressGoal.progress}%)` : "—",
      description: "Goal with the lowest current progress.",
    },
  ];

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2 text-sm text-stone-300">
          <span className="text-stone-400">Year</span>
          <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="bg-transparent text-sky-100 outline-none">
            {YEARS.map((year) => <option key={year} value={year} className="bg-stone-950 text-stone-200">{year}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-2 rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2 text-sm text-stone-300">
          <span className="text-stone-400">Month</span>
          <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="bg-transparent text-sky-100 outline-none">
            {MONTH_OPTIONS.map((month) => <option key={month.value} value={month.value} className="bg-stone-950 text-stone-200">{month.label}</option>)}
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
          <div className="journal-scroll min-w-0 flex-1 scroll-smooth overflow-y-auto rounded-[2rem] border border-sky-100/10 bg-white/[0.03] shadow-2xl shadow-black/30 backdrop-blur" style={{ maxHeight: "calc(100vh - 350px)" }}>
            <div className="space-y-6 p-6">
              <SubgoalLineGraph series={subgoalByDay} daysInMonth={daysInMonth} />
              <GoalProgressGraph goals={goals} activeFilter={goalFilter} onFilterChange={setGoalFilter} />
            </div>
          </div>

          <div className="journal-scroll flex w-full lg:max-w-[360px] lg:shrink-0 self-start flex-col gap-2 scroll-smooth overflow-y-auto" style={{ maxHeight: "calc(100vh - 180px)" }}>
            <InsightRail insights={insights} />
          </div>
        </div>
      )}
    </section>
  );
}
