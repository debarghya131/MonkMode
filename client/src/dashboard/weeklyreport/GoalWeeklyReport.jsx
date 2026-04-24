import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion as Motion } from "framer-motion";
import monkGreetingsLogo from "../../assets/monkgreetingslogo.png";

const WEEKLY_GOAL_DATA = [
  {
    id: "2026-04-13",
    date: "Apr 13 - Apr 19",
    weeklyScore: 74,
    summary:
      "Goal momentum was solid this week. Web Dev and SQL Mastery moved forward, while GATE and System Design need tighter weekly milestones. The main risk is deadline pressure on short-term goals where progress is below the expected pace.",
    goals: [
      { title: "Crack GATE 2027", type: "Long Term", priority: "High", progress: 34, expected: 28, deadline: "Jan 4, 2027", completed: 1, total: 3, completedThisWeek: 1 },
      { title: "Learn Web Dev", type: "Short Term", priority: "Medium", progress: 42, expected: 58, deadline: "May 30, 2026", completed: 1, total: 3, completedThisWeek: 1 },
      { title: "Build Production APIs", type: "Short Term", priority: "High", progress: 46, expected: 44, deadline: "Jun 28, 2026", completed: 1, total: 3, completedThisWeek: 1 },
      { title: "SQL Mastery", type: "Short Term", priority: "High", progress: 55, expected: 49, deadline: "Jun 5, 2026", completed: 1, total: 3, completedThisWeek: 1 },
      { title: "Upgrade Resume + Portfolio", type: "Short Term", priority: "Medium", progress: 40, expected: 63, deadline: "May 27, 2026", completed: 1, total: 3, completedThisWeek: 1 },
    ],
  },
  {
    id: "2026-04-06",
    date: "Apr 6 - Apr 12",
    weeklyScore: 61,
    summary:
      "Progress was uneven. Long-term goals stayed stable, but urgent short-term goals lost ground against their deadlines. Next week should focus on closing one milestone from Resume, Web Dev, and SQL instead of spreading effort too thin.",
    goals: [
      { title: "Crack GATE 2027", type: "Long Term", priority: "High", progress: 30, expected: 26, deadline: "Jan 4, 2027", completed: 1, total: 3, completedThisWeek: 1 },
      { title: "Learn Web Dev", type: "Short Term", priority: "Medium", progress: 35, expected: 54, deadline: "May 30, 2026", completed: 1, total: 3, completedThisWeek: 1 },
      { title: "SQL Mastery", type: "Short Term", priority: "High", progress: 41, expected: 45, deadline: "Jun 5, 2026", completed: 1, total: 3, completedThisWeek: 1 },
      { title: "React Native App", type: "Short Term", priority: "Medium", progress: 28, expected: 36, deadline: "Jul 10, 2026", completed: 1, total: 3, completedThisWeek: 1 },
    ],
  },
  {
    id: "2026-03-30",
    date: "Mar 30 - Apr 5",
    weeklyScore: 82,
    summary:
      "This was the strongest goal week. Most goals met or exceeded their expected progress, and milestone completion improved without sacrificing long-term preparation. Keep this rhythm: one high-priority goal block daily and one short review at night.",
    goals: [
      { title: "Crack GATE 2027", type: "Long Term", priority: "High", progress: 27, expected: 24, deadline: "Jan 4, 2027", completed: 1, total: 3, completedThisWeek: 1 },
      { title: "Build Production APIs", type: "Short Term", priority: "High", progress: 48, expected: 39, deadline: "Jun 28, 2026", completed: 2, total: 3, completedThisWeek: 2 },
      { title: "SQL Mastery", type: "Short Term", priority: "High", progress: 46, expected: 41, deadline: "Jun 5, 2026", completed: 2, total: 3, completedThisWeek: 2 },
      { title: "AI/ML Roadmap", type: "Long Term", priority: "Medium", progress: 32, expected: 28, deadline: "Dec 15, 2026", completed: 1, total: 3, completedThisWeek: 1 },
      { title: "Fitness Cut", type: "Long Term", priority: "Low", progress: 36, expected: 34, deadline: "Aug 30, 2026", completed: 1, total: 3, completedThisWeek: 1 },
      { title: "Competitive Programming", type: "Short Term", priority: "Low", progress: 31, expected: 29, deadline: "Jun 15, 2026", completed: 1, total: 3, completedThisWeek: 1 },
    ],
  },
];

const riskInfo = (goal) => {
  const delta = goal.progress - goal.expected;
  if (delta >= 0) return { label: "On Track", icon: "🟢", color: "text-emerald-300", bar: "bg-emerald-400" };
  if (delta >= -12) return { label: "Slightly Behind", icon: "🟡", color: "text-amber-300", bar: "bg-amber-400" };
  return { label: "Behind Schedule", icon: "🔴", color: "text-rose-300", bar: "bg-rose-400" };
};

const scoreColor = (score) => {
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
      className={`rounded-2xl border border-amber-100/10 bg-white/6 p-5 shadow-xl shadow-black/25 backdrop-blur ${className}`}
    >
      {children}
    </Motion.section>
  );
}

export default function GoalWeeklyReport() {
  const [selectedWeekId, setSelectedWeekId] = useState(WEEKLY_GOAL_DATA[0].id);
  const [goalFilter, setGoalFilter] = useState("All");
  const [riskFilter, setRiskFilter] = useState("Behind Schedule");
  const goalListRef = useRef(null);
  const summaryRef = useRef(null);
  const [goalListFade, setGoalListFade] = useState({ top: false, bottom: false });
  const [summaryFade, setSummaryFade] = useState({ top: false, bottom: false });
  const selectedWeek = WEEKLY_GOAL_DATA.find((week) => week.id === selectedWeekId) ?? WEEKLY_GOAL_DATA[0];
  const filteredGoals = selectedWeek.goals.filter((goal) =>
    goalFilter === "All" || goal.type === goalFilter || goal.priority === goalFilter
  );
  const filteredRiskGoals = selectedWeek.goals.filter((goal) => riskInfo(goal).label === riskFilter);

  const goalCount = selectedWeek.goals.length;
  const completedGoals = selectedWeek.goals.filter((goal) => goal.completed === goal.total).length;
  const completedMilestones = selectedWeek.goals.reduce((sum, goal) => sum + goal.completed, 0);
  const totalMilestones = selectedWeek.goals.reduce((sum, goal) => sum + goal.total, 0);
  const pendingMilestones = totalMilestones - completedMilestones;
  const completedMilestonesThisWeek = selectedWeek.goals.reduce((sum, goal) => sum + goal.completedThisWeek, 0);
  const avgProgress = Math.round(selectedWeek.goals.reduce((sum, goal) => sum + goal.progress, 0) / goalCount);
  const riskCounts = selectedWeek.goals.reduce(
    (counts, goal) => {
      const risk = riskInfo(goal).label;
      return { ...counts, [risk]: counts[risk] + 1 };
    },
    { "On Track": 0, "Slightly Behind": 0, "Behind Schedule": 0 }
  );

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
  }, [selectedWeekId, selectedWeek.summary]);

  return (
    <div className="flex items-start gap-5">
      <div className="journal-scroll min-w-0 flex-1 overflow-y-auto" style={{ maxHeight: "calc(100vh - 170px)" }}>
        <AnimatePresence mode="wait">
          <Motion.div
            key={selectedWeek.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22 }}
            className="space-y-6"
          >
            <ReportCard className="px-5 py-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-label-md">Goal Weekly Summary</p>
                  <p className="mt-1 text-xs font-semibold text-stone-500">{selectedWeek.date}</p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 rounded-full border border-sky-400/20 bg-sky-500/10 px-3 py-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">Avg Progress</p>
                  <span className="text-xs font-bold text-sky-300">{avgProgress}%</span>
                </div>
                <div className="flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">Goals Completed</p>
                  <span className="text-xs font-bold text-emerald-300">
                    {completedGoals}<span className="text-[10px] font-semibold text-stone-500">/{goalCount}</span>
                  </span>
                </div>
                <div className="flex items-center gap-1.5 rounded-full border border-rose-400/20 bg-rose-500/10 px-3 py-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">Sub Goal Pending</p>
                  <span className="text-xs font-bold text-rose-300">
                    {pendingMilestones}<span className="text-[10px] font-semibold text-stone-500">/{totalMilestones}</span>
                  </span>
                </div>
                <div className="flex items-center gap-1.5 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">Sub Goal Done This Week</p>
                  <span className="text-xs font-bold text-violet-300">{completedMilestonesThisWeek}</span>
                </div>
                <div className="flex items-center gap-1.5 rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">Score</p>
                  <span className={`text-xs font-bold ${scoreColor(selectedWeek.weeklyScore)}`}>
                    {selectedWeek.weeklyScore}<span className="text-[10px] font-semibold text-stone-500"> /100</span>
                  </span>
                </div>
              </div>
            </ReportCard>

            <ReportCard className="flex h-[155px] flex-col overflow-hidden">
              <div className="mb-3 flex shrink-0 items-center gap-2">
                <Motion.img
                  src={monkGreetingsLogo}
                  alt="Little Monk"
                  className="h-14 w-17 object-contain"
                  animate={{ y: [0, -3, 0] }}
                  transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
                />
                <div>
                  <p className="text-label-md">Little Monk's Goal Summary</p>
                  <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-amber-300/70">AI Generated</p>
                </div>
              </div>
              <div className="relative min-h-0 flex-1">
                <div ref={summaryRef} className="journal-scroll h-full overflow-y-auto scroll-smooth pr-1">
                  <p className="text-sm leading-relaxed text-stone-300">{selectedWeek.summary}</p>
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

            <ReportCard className="flex h-[420px] flex-col overflow-hidden">
              <div className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-3 bg-[#1d0f0c]/95 pb-2 backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">Goal Progress</p>
                <div className="flex items-center gap-1 rounded-full border border-amber-100/10 bg-stone-900/60 p-0.5">
                  {GOAL_FILTERS.map((filter) => (
                    <button
                      key={filter}
                      type="button"
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
                <div ref={goalListRef} className="journal-scroll min-h-0 h-full space-y-3 overflow-y-auto scroll-smooth pr-1">
                  {filteredGoals.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-amber-100/10 py-8 text-center text-xs text-stone-600">
                      No goals found for this filter.
                    </p>
                  ) : filteredGoals.map((goal) => {
                    const risk = riskInfo(goal);
                    return (
                      <div key={goal.title} className="rounded-xl border border-stone-700/35 bg-stone-950/35 px-3 py-2">
                        <div className="mb-1.5 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-stone-200">{goal.title}</p>
                            <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-stone-500">
                              {goal.type} • {goal.priority} Priority • Due {goal.deadline}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-3 text-right">
                            <p className="text-[10px] font-semibold text-stone-500">{goal.completed}/{goal.total} milestones</p>
                            <p className="text-[10px] font-semibold text-stone-500">{goal.progress}% progress</p>
                            <p className={`text-xs font-bold ${risk.color}`}>{risk.icon} {risk.label}</p>
                          </div>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-stone-800/70">
                          <Motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${goal.progress}%` }}
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
        </AnimatePresence>
      </div>

      <div className="grid w-full max-w-[360px] shrink-0 items-start gap-4">
        <ReportCard className="flex h-[340px] flex-col overflow-hidden">
          <div className="mb-4 flex shrink-0 items-center gap-3">
            <Motion.img
              src={monkGreetingsLogo}
              alt="Little Monk AI Assistant"
              className="h-16 w-16 object-contain"
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
            />
            <div>
              <h3 className="text-label-md">Little Monk's Analysis</h3>
              <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.14em] text-amber-300/70">AI Assistant</p>
            </div>
          </div>
          <div className="journal-scroll min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
            {WEEKLY_GOAL_DATA.map((week) => {
              const isSelected = selectedWeekId === week.id;
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
                      <span className="text-xs font-semibold text-amber-300/80">{week.goals.length} Goals Reviewed</span>
                      <p className="text-sm font-semibold text-stone-200">Weekly Summary</p>
                      <p className="text-xs text-stone-500">({week.date})</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedWeekId(week.id)}
                      className={`w-fit rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                        isSelected
                          ? "border-amber-400/40 bg-amber-400/15 text-amber-200"
                          : "border-amber-400/20 text-amber-300 hover:border-amber-300/45 hover:bg-amber-400/10"
                      }`}
                    >
                      {isSelected ? "Open" : "View"}
                    </button>
                  </div>
                </Motion.div>
              );
            })}
          </div>
        </ReportCard>

        <ReportCard className="flex h-[380px] flex-col overflow-hidden">
          <div className="mb-4 shrink-0">
            <p className="text-label-md">Risk Indicator</p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-500">Progress vs deadline</p>
          </div>
          <div className="flex shrink-0 items-center justify-center gap-2 text-center">
            {Object.entries(riskCounts).map(([label, count]) => {
              const status =
                label === "On Track"
                  ? { dot: "bg-emerald-400", text: "text-emerald-300", border: "border-emerald-400/20", bg: "bg-emerald-500/8", icon: "🟢" }
                  : label === "Slightly Behind"
                    ? { dot: "bg-amber-400", text: "text-amber-300", border: "border-amber-400/20", bg: "bg-amber-500/8", icon: "🟡" }
                    : { dot: "bg-rose-400", text: "text-rose-300", border: "border-rose-400/20", bg: "bg-rose-500/8", icon: "🔴" };
              const active = riskFilter === label;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => setRiskFilter(label)}
                  className={`flex h-[72px] w-[98px] flex-col items-center justify-center gap-1 rounded-xl border px-2 py-1.5 transition ${
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
                <div key={goal.title} className="rounded-lg border border-stone-700/30 bg-stone-950/35 px-2.5 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="min-w-0 truncate text-xs font-semibold text-stone-300">{goal.title}</p>
                    <span
                      className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                        risk.label === "On Track"
                          ? "bg-emerald-400"
                          : risk.label === "Slightly Behind"
                            ? "bg-amber-400"
                            : "bg-rose-400"
                      }`}
                    />
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <p className={`text-[10px] font-semibold ${risk.color}`}>{risk.icon} {risk.label}</p>
                    <p className="shrink-0 text-[10px] font-semibold text-stone-500">
                      {goal.progress}% / {goal.expected}%
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
