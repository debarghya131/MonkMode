import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion as Motion } from "framer-motion";
import littleMonkLogo from "../../assets/littlemonklogo.webp";
import useGoalWeeklyData from "./useGoalWeeklyData";
import { goalReportRisk } from "../../../../shared/goalWeeklyStats";

function LoadError({ message, retry }) {
  return <div role="alert" className="rounded-xl border border-rose-400/20 bg-rose-400/5 p-3 text-sm text-rose-200">
    <p>{message}</p><button type="button" onClick={retry} className="mt-2 rounded-lg border border-amber-400/30 px-3 py-1 text-xs font-semibold text-amber-300">Retry</button>
  </div>;
}
import useAuth from "../../hooks/useAuth";

const riskInfo = goal => {
  const label = goalReportRisk(goal);
  const colors = {
    "On Track": ["🟢", "text-emerald-300", "bg-emerald-400"],
    Completed: ["✅", "text-emerald-300", "bg-emerald-400"],
    "Slightly Behind": ["🟡", "text-amber-300", "bg-amber-400"],
    "Behind Schedule": ["🔴", "text-rose-300", "bg-rose-400"],
  };
  const [icon, color, bar] = colors[label] || ["⚪", "text-stone-400", "bg-stone-600"];
  return { label, icon, color, bar };
};

const scoreColor = (score) => {
  if (score == null) return "text-stone-400";
  if (score >= 75) return "text-emerald-300";
  if (score >= 55) return "text-amber-300";
  return "text-rose-300";
};

const GOAL_FILTERS = ["All", "Short Term", "Long Term", "High", "Medium", "Low"];

function ReportCard({ children, className = "", style }) {
  return (
    <Motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3, boxShadow: "0 18px 36px rgba(0,0,0,0.34)" }}
      transition={{ duration: 0.22 }}
      style={style}
      className={`rounded-[1.4rem] border border-amber-100/10 bg-white/6 p-4 shadow-xl shadow-black/25 backdrop-blur sm:rounded-2xl sm:p-5 ${className}`}
    >
      {children}
    </Motion.section>
  );
}

export default function GoalWeeklyReport({ lowMotion = false }) {
  const { isDemoMode } = useAuth();
  const { summaries, loadingSummaries, summariesError, retrySummaries, selectedWeekId, setSelectedWeekId,
    weekData, loadingWeekData, weekError, retryWeek, analysis, generate } = useGoalWeeklyData(isDemoMode);
  const aiSummary = analysis.text, loadingAi = analysis.loading;
  const [goalFilter, setGoalFilter] = useState("All");
  const [riskFilter, setRiskFilter] = useState("Behind Schedule");
  const goalListRef = useRef(null);
  const summaryRef = useRef(null);
  const [goalListFade, setGoalListFade] = useState({ top: false, bottom: false });
  const [summaryFade, setSummaryFade] = useState({ top: false, bottom: false });
  const selectedWeek = weekData;
  const selectedGoals = selectedWeek?.goals || [];
  const filteredGoals = selectedGoals.filter((goal) =>
    goalFilter === "All" || goal.type === goalFilter || goal.priority === goalFilter
  );
  const filteredRiskGoals = selectedGoals.filter((goal) => riskInfo(goal).label === riskFilter);

  const stats = selectedWeek?.stats;
  const goalCount = stats?.goalCount ?? 0;
  const completedGoals = stats?.completedGoals ?? 0;
  const totalMilestones = stats?.totalMilestones ?? 0;
  const pendingMilestones = stats?.pendingMilestones ?? 0;
  const completedMilestonesThisWeek = stats?.completedMilestonesThisWeek ?? 0;
  const avgProgress = stats?.avgProgress;
  const riskCounts = stats?.riskCounts ?? {};

  useEffect(() => { setGoalFilter("All"); setRiskFilter("Behind Schedule"); }, [selectedWeekId]);

  useEffect(() => {
    const node = goalListRef.current;
    if (!node) return;

    const updateFade = () => {
      const canScroll = node.scrollHeight > node.clientHeight + 1;
      setGoalListFade({
        top: node.scrollTop > 1,
        bottom: canScroll && node.scrollTop + node.clientHeight < node.scrollHeight - 1,
      });
    };

    updateFade();
    node.addEventListener("scroll", updateFade, { passive: true });
    window.addEventListener("resize", updateFade);
    return () => {
      node.removeEventListener("scroll", updateFade);
      window.removeEventListener("resize", updateFade);
    };
  }, [selectedWeekId, goalFilter, filteredGoals.length]);

  useEffect(() => {
    const node = summaryRef.current;
    if (!node) return;

    const updateFade = () => {
      const canScroll = node.scrollHeight > node.clientHeight + 1;
      setSummaryFade({
        top: node.scrollTop > 1,
        bottom: canScroll && node.scrollTop + node.clientHeight < node.scrollHeight - 1,
      });
    };

    updateFade();
    node.addEventListener("scroll", updateFade, { passive: true });
    window.addEventListener("resize", updateFade);
    return () => {
      node.removeEventListener("scroll", updateFade);
      window.removeEventListener("resize", updateFade);
    };
  }, [selectedWeekId, aiSummary, analysis.error, loadingAi]);

  return (
    <div className="weekly-goal-view flex flex-col gap-4 xl:flex-row xl:items-start" data-demo-allow="true">
      <div className="weekly-goal-quick-weeks rounded-[1.4rem] border border-amber-100/10 bg-white/6 p-3" data-demo-allow="true">
        <p className="text-label-md">Little Monk's Analysis</p>
        {loadingSummaries ? (
          <p className="mt-2 text-xs text-stone-500">Loading weeks...</p>
        ) : summariesError ? (
          <LoadError message={summariesError} retry={retrySummaries} />
        ) : summaries.length === 0 ? (
          <p className="mt-2 text-xs text-stone-500">Completed weeks with goals appear here (last 12 weeks).</p>
        ) : (
          <div className="weekly-goal-quick-list mt-2 flex gap-2 overflow-x-auto pb-1">
            {summaries.map((week) => (
              <button
                key={week.id}
                type="button"
                onClick={() => setSelectedWeekId(week.id)}
                aria-pressed={selectedWeekId === week.id}
                className={`min-w-[8.5rem] shrink-0 rounded-xl border px-3 py-2 text-left transition-colors ${
                  selectedWeekId === week.id
                    ? "border-amber-400/40 bg-amber-500/10 text-amber-100"
                    : "border-amber-100/10 bg-black/20 text-stone-300 hover:border-amber-400/25"
                }`}
              >
                <span className="block text-xs font-semibold">{week.date}</span>
                <span className="mt-0.5 block text-[10px] text-stone-500">
                  {week.goals?.length ?? week.goalCount ?? 0} goals reviewed
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="weekly-goal-main journal-scroll min-w-0 flex-1 overflow-y-auto xl:max-h-[calc(100vh-170px)]">
        <AnimatePresence mode="wait">
          {loadingSummaries || loadingWeekData ? (
            <Motion.div
              key="goal-report-loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-5"
            >
              <div className="h-28 animate-pulse rounded-2xl border border-amber-100/10 bg-white/6" />
              <div className="h-44 animate-pulse rounded-2xl border border-amber-100/10 bg-white/6" />
              <div className="h-96 animate-pulse rounded-2xl border border-amber-100/10 bg-white/6" />
            </Motion.div>
          ) : weekError ? (
            <Motion.div
              key="goal-report-error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <LoadError message={weekError} retry={retryWeek} />
            </Motion.div>
          ) : !selectedWeek ? (
            <Motion.div
              key="goal-report-empty"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-2xl border border-dashed border-amber-100/15 bg-white/5 px-5 py-10 text-center text-sm text-stone-400"
            >
              Select a week to view your goal report.
            </Motion.div>
          ) : (
          <Motion.div
            key={selectedWeek.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22 }}
            className="weekly-goal-main-body space-y-4 sm:space-y-6"
          >
            <ReportCard className="weekly-goal-overview px-4 py-4 sm:px-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-label-md">Goal Weekly Summary</p>
                  <p className="mt-1 text-xs font-semibold text-stone-500">{selectedWeek.date}</p>
                </div>
              </div>

              <p className="mt-2 text-xs text-stone-400">As of {selectedWeek.asOf} · {goalCount} goals reviewed · {completedMilestonesThisWeek} milestone completions · {stats.progressUpdatesThisWeek} progress updates</p>
              {selectedWeek.historyNote && <p role="status" className="mt-2 text-xs text-amber-200/80">{selectedWeek.historyNote}</p>}
              {stats.unknownProgressGoals > 0 && <p className="mt-1 text-xs text-stone-400">Average uses {stats.knownProgressGoals}/{goalCount} goals with known progress. Unknown history is not zero progress.</p>}
              {stats.unknownMilestoneGoals > 0 && <p className="mt-1 text-xs text-stone-400">Milestone totals exclude {stats.unknownMilestoneGoals} goals whose historical milestone counts are unknown.</p>}
              <div className="weekly-goal-summary-pills mt-3 flex flex-wrap items-center gap-2">
                <Motion.div
                  className="relative flex items-center gap-1.5 overflow-hidden rounded-full border border-sky-400/25 bg-sky-500/10 px-3 py-1"
                  animate={{
                    boxShadow: [
                      "0 0 0px rgba(56,189,248,0)",
                      "0 0 10px rgba(56,189,248,0.36)",
                      "0 0 0px rgba(56,189,248,0)",
                    ],
                  }}
                  transition={{
                    boxShadow: { duration: lowMotion ? 0 : 2.2, repeat: lowMotion ? 0 : Infinity, ease: "easeInOut" },
                  }}
                >
                  <Motion.span
                    className="pointer-events-none absolute inset-y-0 left-[-40%] w-[30%] -skew-x-12 bg-white/25 blur-sm"
                    animate={{ left: ["-40%", "130%"] }}
                    transition={{ duration: lowMotion ? 0 : 1.8, repeat: lowMotion ? 0 : Infinity, repeatDelay: 1.5, ease: "easeInOut" }}
                  />
                  <p className="relative z-10 text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">Avg Progress</p>
                  <span className="relative z-10 text-xs font-bold text-sky-300">{avgProgress == null ? "—" : `${avgProgress}%`}</span>
                </Motion.div>
                <div className="flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">Goals Completed</p>
                  <span className="text-xs font-bold text-emerald-300">
                    {completedGoals}<span className="text-[10px] font-semibold text-stone-500">/{goalCount}</span>
                  </span>
                </div>
                <Motion.div
                  className="relative flex items-center gap-1.5 overflow-hidden rounded-full border border-rose-400/25 bg-rose-500/10 px-3 py-1"
                  animate={{
                    boxShadow: [
                      "0 0 0px rgba(251,113,133,0)",
                      "0 0 10px rgba(251,113,133,0.36)",
                      "0 0 0px rgba(251,113,133,0)",
                    ],
                  }}
                  transition={{
                    boxShadow: { duration: lowMotion ? 0 : 2.2, repeat: lowMotion ? 0 : Infinity, ease: "easeInOut" },
                  }}
                >
                  <Motion.span
                    className="pointer-events-none absolute inset-y-0 left-[-40%] w-[30%] -skew-x-12 bg-white/25 blur-sm"
                    animate={{ left: ["-40%", "130%"] }}
                    transition={{ duration: lowMotion ? 0 : 1.8, repeat: lowMotion ? 0 : Infinity, repeatDelay: 1.5, ease: "easeInOut" }}
                  />
                  <p className="relative z-10 text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">Known Milestones Pending</p>
                  <span className="relative z-10 text-xs font-bold text-rose-300">
                    {pendingMilestones}<span className="text-[10px] font-semibold text-stone-500">/{totalMilestones}</span>
                  </span>
                </Motion.div>
                <div className="flex items-center gap-1.5 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">Milestones Completed This Week</p>
                  <span className="text-xs font-bold text-violet-300">{completedMilestonesThisWeek}</span>
                </div>
                <div className="flex items-center gap-1.5 rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">Score</p>
                  <span className={`text-xs font-bold ${scoreColor(selectedWeek.weeklyScore)}`}>
                    {selectedWeek.weeklyScore ?? "—"}<span className="text-[10px] font-semibold text-stone-500"> /100</span>
                  </span>
                </div>
              </div>
            </ReportCard>

            <ReportCard className="weekly-goal-ai flex min-h-[13rem] flex-col overflow-hidden xl:h-[20vh]">
              <div className="mb-3 flex shrink-0 flex-wrap items-center gap-2">
                <Motion.img
                  src={littleMonkLogo}
                  alt="Little Monk"
                  className="h-14 w-17 object-contain"
                  animate={{ y: [0, -3, 0] }}
                  transition={{ duration: lowMotion ? 0 : 2.8, repeat: lowMotion ? 0 : Infinity, ease: "easeInOut" }}
                />
                <div>
                  <p className="text-label-md">Little Monk's Goal Summary</p>
                  <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-amber-300/70">{isDemoMode ? "Demo sample analysis" : aiSummary ? "AI generated · verify insights" : "On-demand analysis"}</p>
                </div>
                {!isDemoMode && <button type="button" disabled={loadingAi || !goalCount} onClick={generate} className="ml-auto rounded-lg border border-amber-400/30 px-3 py-1.5 text-xs font-semibold text-amber-300 disabled:opacity-40">{loadingAi ? "Please wait…" : aiSummary ? "↻ Regenerate" : "Generate analysis"}</button>}
              </div>
              <div className="relative min-h-0 flex-1">
                <div ref={summaryRef} className="journal-scroll h-full overflow-y-auto scroll-smooth pr-1">
                  {loadingAi && !aiSummary ? (
                    <div className="flex items-center gap-2 text-xs text-stone-500">
                      <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      Loading saved analysis…
                    </div>
                  ) : aiSummary ? (
                    <p className="text-sm leading-relaxed text-stone-300">{aiSummary}</p>
                  ) : (
                    <p className="text-sm italic leading-relaxed text-stone-500">Generate an optional analysis. Opening this report does not generate AI text.</p>
                  )}
                  {analysis.stale && <p role="status" className="mt-2 text-xs text-amber-300">Saved analysis is out of date. Regenerate to reflect this report.</p>}
                  {analysis.error && <LoadError message={analysis.error} retry={analysis.retryWith === "generate" ? generate : retryWeek} />}
                  {analysis.warning && <p role="status" className="mt-2 text-xs text-amber-300">{analysis.warning}</p>}
                  {loadingAi && aiSummary && <p role="status" className="mt-2 text-xs text-stone-400">Generating updated analysis…</p>}
                </div>
                <div
                  className={`pointer-events-none absolute inset-x-0 top-0 h-3 bg-gradient-to-b from-[#1d0f0c] to-transparent transition-opacity duration-200 ${
                    summaryFade.top ? "opacity-100" : "opacity-0"
                  }`}
                />
                <div
                  className={`pointer-events-none absolute inset-x-0 bottom-0 h-4 bg-gradient-to-t from-[#1d0f0c] to-transparent transition-opacity duration-200 ${
                    summaryFade.bottom ? "opacity-100" : "opacity-0"
                  }`}
                />
              </div>
            </ReportCard>

            <ReportCard className="weekly-goal-progress-card flex min-h-[22rem] flex-col overflow-hidden xl:h-[47vh]">
              <div className="mb-3 flex shrink-0 flex-col gap-3 bg-[#1d0f0c]/95 pb-2 backdrop-blur sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">Goal Progress</p>
                <div className="weekly-goal-filters flex w-full flex-wrap items-center gap-1 rounded-2xl border border-amber-100/10 bg-stone-900/60 p-0.5 sm:w-auto sm:rounded-full">
                  {GOAL_FILTERS.map((filter) => (
                    <button
                      key={filter}
                      type="button"
                      aria-pressed={goalFilter === filter}
                      onClick={() => setGoalFilter(filter)}
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold transition-colors ${
                        goalFilter === filter
                          ? "bg-amber-500/20 text-amber-300"
                          : "text-stone-500 hover:text-stone-300"
                      }`}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              </div>
              <div className="relative min-h-0 flex-1">
                <div ref={goalListRef} className="weekly-goal-list journal-scroll min-h-0 h-full space-y-3 overflow-y-auto scroll-smooth pr-1">
                  {filteredGoals.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-amber-100/10 py-8 text-center text-xs text-stone-600">
                      No goals found for this filter.
                    </p>
                  ) : filteredGoals.map((goal) => {
                    const risk = riskInfo(goal);
                    return (
                      <div key={goal.id} className="rounded-xl border border-stone-700/35 bg-stone-950/35 px-3 py-2">
                        <div className="mb-1.5 min-w-0 space-y-1.5">
                          <div className="flex min-w-0 items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-stone-200">{goal.title}</p>
                              <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.12em] leading-relaxed text-stone-500">
                                {goal.type} • {goal.priority} Priority • Due {goal.deadline || "Not set"}
                              </p>
                            </div>
                            <p className={`hidden shrink-0 text-xs font-bold ${risk.color} sm:block`}>{risk.icon} {risk.label}</p>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                            <p className="text-[10px] font-semibold text-stone-500">{goal.total === 0 ? `Numeric goal · ${goal.currentValue ?? "—"}/${goal.targetValue ?? "—"}` : `${goal.completed ?? "—"}/${goal.total ?? "—"} milestones`}</p>
                            <p className="text-[10px] font-semibold text-stone-500">{goal.progress === null ? "History unavailable" : `${goal.progress}% progress`}</p>
                            {goal.historyLimited && <p className="text-[10px] text-amber-200/70">Partial history · {goal.progressBasis}</p>}
                            <p className={`text-xs font-bold ${risk.color} sm:hidden`}>{risk.icon} {risk.label}</p>
                          </div>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-stone-800/70">
                          <Motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${goal.progress ?? 0}%` }}
                            transition={{ duration: 0.5, ease: "easeOut" }}
                            className={`h-full rounded-full ${risk.bar}`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div
                  className={`pointer-events-none absolute inset-x-0 top-0 h-4 bg-gradient-to-b from-[#1d0f0c] to-transparent transition-opacity duration-200 ${
                    goalListFade.top ? "opacity-100" : "opacity-0"
                  }`}
                />
                <div
                  className={`pointer-events-none absolute inset-x-0 bottom-0 h-5 bg-gradient-to-t from-[#1d0f0c] to-transparent transition-opacity duration-200 ${
                    goalListFade.bottom ? "opacity-100" : "opacity-0"
                  }`}
                />
              </div>
            </ReportCard>
          </Motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="weekly-goal-sidebar grid w-full items-start gap-4 xl:w-[360px] xl:shrink-0">
        <ReportCard className="weekly-goal-weeks-card flex min-h-[20rem] flex-col overflow-hidden xl:h-[38vh]">
          <div className="mb-4 flex shrink-0 items-center gap-3">
            <Motion.img
              src={littleMonkLogo}
              alt="Little Monk AI Assistant"
              className="h-16 w-16 object-contain"
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: lowMotion ? 0 : 2.8, repeat: lowMotion ? 0 : Infinity, ease: "easeInOut" }}
            />
            <div>
              <h3 className="text-label-md">Little Monk's Analysis</h3>
              <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.14em] text-amber-300/70">AI Assistant</p>
            </div>
          </div>
          <div className="journal-scroll min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
            {summaries.map((week) => {
              const isSelected = selectedWeekId === week.id;
              const goalsReviewed = week.goals?.length ?? week.goalCount ?? 0;
              return (
                <Motion.div
                  key={week.id}
                  layout
                  className={`rounded-xl border p-3 text-sm transition-colors ${
                    isSelected ? "border-amber-400/30 bg-amber-500/8" : "border-amber-100/10 bg-stone-950/45 hover:border-amber-400/20"
                  }`}
                >
                  <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
                    <div className="min-w-0">
                      <span className="text-xs font-semibold text-amber-300/80">{goalsReviewed} Goals Reviewed</span>
                      <p className="text-sm font-semibold text-stone-200">{week.date}</p>
                    </div>
                    <button
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => setSelectedWeekId(isSelected ? null : week.id)}
                      className={`w-full rounded-full border px-3 py-1 text-xs font-semibold transition-colors sm:w-fit ${
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
            {loadingSummaries && <p className="text-xs text-stone-500">Loading weeks…</p>}
            {summariesError && <LoadError message={summariesError} retry={retrySummaries} />}
            {!loadingSummaries && !summariesError && summaries.length === 0 && (
              <p className="rounded-xl border border-dashed border-amber-100/10 px-4 py-6 text-center text-xs text-stone-500">
                No goals in the last 12 completed weeks.
              </p>
            )}
          </div>
        </ReportCard>

        <ReportCard className="weekly-goal-risk-card flex min-h-[22rem] flex-col overflow-hidden xl:h-[42vh]">
          <div className="mb-4 shrink-0">
            <p className="text-label-md">Risk Indicator</p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-500">Recorded progress vs calendar pace</p>
          </div>
          <div className="weekly-goal-risk-buttons grid shrink-0 grid-cols-1 gap-2 text-center sm:grid-cols-3">
            {Object.entries(riskCounts).map(([label, count]) => {
              const info = riskInfo({ progress: label === "History unavailable" ? null : 0, expected: label === "No schedule" ? null : 0, isCompleted: label === "Completed" });
              const status = label === "On Track" || label === "Completed"
                ? { text: "text-emerald-300", border: "border-emerald-400/20", bg: "bg-emerald-500/8", icon: label === "Completed" ? "✅" : "🟢" }
                : label === "Slightly Behind" ? { text: "text-amber-300", border: "border-amber-400/20", bg: "bg-amber-500/8", icon: "🟡" }
                : label === "Behind Schedule" ? { text: "text-rose-300", border: "border-rose-400/20", bg: "bg-rose-500/8", icon: "🔴" }
                : { text: info.color, border: "border-stone-400/20", bg: "bg-stone-500/8", icon: "⚪" };
              const active = riskFilter === label;
              return (
                <button
                  key={label}
                  type="button"
                  aria-pressed={riskFilter === label}
                  onClick={() => setRiskFilter(label)}
                  className={`flex h-[72px] w-full flex-col items-center justify-center gap-1 rounded-xl border px-2 py-1.5 transition sm:w-auto ${
                    active
                      ? `${status.border} ${status.bg} shadow-[0_0_18px_rgba(251,191,36,0.14)]`
                      : "border-amber-100/10 bg-stone-950/35 hover:border-amber-400/20"
                  }`}
                >
                  <p className={`text-base font-bold leading-none ${status.text}`}>{count}</p>
                  <p className="text-[8.5px] font-semibold leading-none text-stone-500 whitespace-nowrap">
                    {status.icon} {label}
                  </p>
                </button>
              );
            })}
          </div>
          <div className="journal-scroll mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
            {filteredRiskGoals.map((goal) => {
              const risk = riskInfo(goal);
              return (
                <div key={goal.id} className="rounded-lg border border-stone-700/30 bg-stone-950/35 px-2.5 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="min-w-0 truncate text-xs font-semibold text-stone-300">{goal.title}</p>
                    <span
                      className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                        risk.label === "On Track" || risk.label === "Completed"
                          ? "bg-emerald-400"
                          : risk.label === "Slightly Behind"
                            ? "bg-amber-400"
                            : risk.label === "Behind Schedule" ? "bg-rose-400" : "bg-stone-500"
                      }`}
                    />
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <p className={`text-[10px] font-semibold ${risk.color}`}>{risk.icon} {risk.label}</p>
                    <p className="shrink-0 text-[10px] font-semibold text-stone-500">
                      {goal.progress === null ? "—" : `${goal.progress}%`} / {goal.expected === null ? "No schedule" : `${goal.expected}% pace`}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </ReportCard>
      </div>
    </div>
  );
}
