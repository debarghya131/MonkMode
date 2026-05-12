import { useEffect, useState } from "react";
import { motion as Motion } from "framer-motion";
import littleMonkLogo from "../../../assets/littlemonklogo.png";
import api from "../../../api/axios";
import useAuth from "../../../hooks/useAuth";

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
          <Motion.div className="relative grid h-16 w-16 place-items-center" animate={{ y: [0, -4, 0] }} transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}>
            <Motion.span className="absolute inset-2 rounded-full bg-amber-400/15 blur-md" animate={{ opacity: [0.35, 0.8, 0.35], scale: [0.9, 1.12, 0.9] }} transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }} />
            <Motion.img src={littleMonkLogo} alt="Little Monk AI Assistant" className="relative z-10 h-20 w-20 object-contain drop-shadow-[0_10px_18px_rgba(245,158,11,0.16)]" whileHover={{ scale: 1.08, rotate: -3 }} transition={{ type: "spring", stiffness: 260, damping: 14 }} />
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
            <Motion.div key={insight.title} layout className={`rounded-xl border p-3 text-sm transition-colors ${isSelected ? "border-sky-400/30 bg-sky-500/8" : "border-sky-100/10 bg-stone-950/45 hover:border-sky-300/20"}`}>
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
          <div className="journal-scroll mt-2 max-h-[43vh] min-h-40 space-y-4 overflow-y-auto pr-3">
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
                    <Motion.div className="h-4 rounded-full border border-emerald-200/25 bg-gradient-to-r from-emerald-900/95 to-emerald-300/90" initial={{ width: 0 }} animate={{ width: `${goal.consistency}%` }} transition={{ duration: 0.45, delay: index * 0.04 }} />
                    <span className="w-10 text-[10px] font-semibold text-emerald-200">{goal.consistency}%</span>
                  </div>
                </div>
              </div>
            ))}
            {goals.length === 0 && (
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
        </div>
      </div>
    </section>
  );
}

function EmptyDeadlineChart() {
  return (
    <div className="grid grid-cols-[11rem_1fr] items-center gap-3 opacity-60">
      <div className="h-8 rounded-lg border border-dashed border-white/8 bg-white/[0.02]" />
      <div className="space-y-1.5">
        <div className="h-3 rounded-full border border-white/8 bg-white/[0.03]" />
        <div className="h-3 rounded-full border border-white/8 bg-white/[0.03]" />
      </div>
    </div>
  );
}

function DeadlineAnalysisGraph({ goals }) {
  const goalsWithDeadline = goals.filter((g) => g.deadlineDays !== null);

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
          <div className="journal-scroll max-h-[48vh] min-h-40 space-y-4 overflow-y-auto pr-3">
            {goalsWithDeadline.map((goal, index) => {
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
                      <Motion.div className="h-3 rounded-full border border-sky-200/25 bg-gradient-to-r from-sky-900/95 to-sky-300/90" initial={{ width: 0 }} animate={{ width: `${goal.progress}%` }} transition={{ duration: 0.45, delay: index * 0.04 }} />
                      <span className="w-10 text-[10px] font-semibold text-sky-200">{goal.progress}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Motion.div className={`h-3 rounded-full border ${behind ? "border-rose-200/25 bg-gradient-to-r from-rose-900/95 to-rose-300/90" : "border-amber-200/25 bg-gradient-to-r from-amber-900/95 to-amber-300/90"}`} initial={{ width: 0 }} animate={{ width: `${goal.expected}%` }} transition={{ duration: 0.45, delay: index * 0.04 + 0.05 }} />
                      <span className={`w-10 text-[10px] font-semibold ${behind ? "text-rose-200" : "text-amber-200"}`}>{goal.expected}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
            {goalsWithDeadline.length === 0 && <EmptyDeadlineChart />}
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
          <h4 className="mt-2 text-xl font-semibold text-sky-50">Weekly Activity Score</h4>
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
                <div key={item.label} className="flex min-w-0 flex-1 flex-col items-center justify-end" style={{ opacity: hovered !== null && hovered !== index ? 0.4 : 1, transition: "opacity 0.18s ease", cursor: "default" }} onMouseEnter={() => setHovered(index)} onMouseLeave={() => setHovered(null)}>
                  <span className="mb-1 text-[10px] font-semibold text-amber-200">{item.value}</span>
                  <Motion.div className="w-full max-w-[42px] rounded-t-xl border border-amber-200/25 bg-gradient-to-t from-amber-900/95 to-amber-300/90" initial={{ height: 0 }} animate={{ height: Math.max(10, Math.round((item.value / 100) * barH)) }} transition={{ duration: 0.42, delay: index * 0.04 }} />
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
  const { user } = useAuth();
  const [selectedYear, setSelectedYear] = useState(String(NOW.getFullYear()));
  const [selectedMonth, setSelectedMonth] = useState(CURRENT_MONTH);
  const [apiData, setApiData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
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
  }, [user, selectedYear, selectedMonth]);

  const goals = apiData?.goals ?? [];
  const weeklyScores = apiData?.weeklyScores ?? [0, 0, 0, 0];

  const weeklyScoreSeries = weeklyScores.map((value, i) => ({ label: `W${i + 1}`, value }));
  const avgWeeklyScore = round(average(weeklyScores));
  const mostConsistentGoal = goals.length ? goals.reduce((best, g) => g.consistency > best.consistency ? g : best) : null;
  const lessConsistentGoal = goals.length ? goals.reduce((worst, g) => g.consistency < worst.consistency ? g : worst) : null;
  const behindGoals = goals.filter((g) => riskLabel(g) === "Behind Schedule");
  const onTrackGoals = goals.filter((g) => riskLabel(g) === "On Track");

  const insights = [
    {
      title: "Most Consistent Goal",
      value: mostConsistentGoal ? `${mostConsistentGoal.title} (${mostConsistentGoal.consistency}%)` : "—",
      description: "Goal with the most days of progress activity this month.",
    },
    {
      title: "Least Consistent Goal",
      value: lessConsistentGoal ? `${lessConsistentGoal.title} (${lessConsistentGoal.consistency}%)` : "—",
      description: "Goal with the fewest days of progress activity this month.",
    },
    {
      title: "Avg Weekly Activity Score",
      value: `${avgWeeklyScore}`,
      description: "Average % of goals that had any progress activity per week.",
    },
    {
      title: "Behind Schedule Goals",
      value: `${behindGoals.length} goals`,
      description: behindGoals.length
        ? `${behindGoals.map((g) => g.title).join(", ")} need faster progress.`
        : "No goals are currently behind schedule.",
    },
    {
      title: "On Track Goals",
      value: `${onTrackGoals.length} goals`,
      description: onTrackGoals.length
        ? `${onTrackGoals.map((g) => g.title).join(", ")} are meeting or exceeding expected pace.`
        : "No goals are on track.",
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
              <HorizontalRateGraph title="Goal Consistency Analysis" subtitle="Consistency Rate" goals={goals} />
              <DeadlineAnalysisGraph goals={goals} />
              <WeeklyScoreGraph series={weeklyScoreSeries} />
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
