import { useState, useEffect } from "react";
import { motion as Motion, AnimatePresence } from "framer-motion";
import littleMonkLogo from "../../assets/littlemonklogo.webp";
import useAuth from "../../hooks/useAuth";
import api from "../../api/axios";

const DEMO_HABIT_DATA = [
  {
    id: "2026-04-13",
    date: "Apr 13 - Apr 19",
    signal: "7 Active days",
    totalInstances: 44,
    completed: 28,
    missed: 16,
    completionRate: 64,
    weeklyScore: 70,
    longestStreak: 4,
    aiSummary:
      "Your habit completion rate this week was 64% across 44 scheduled habit check-ins. Morning Routine and Study habits held strong with near-perfect execution. The biggest drops came from Mindfulness and Sleep — meditation was skipped 3 times and sleep discipline only lasted a few days. Streaks broke most often in the evening. A simple fix: anchor your evening habits to a single trigger, like brushing your teeth. If that cue fires, your sleep and mindfulness habits follow automatically. Focus on those two categories next week.",
    categories: [
      { name: "Morning Routine", total: 4, completed: 3, missed: 1 },
      { name: "Fitness",         total: 4, completed: 3, missed: 1 },
      { name: "Study",           total: 3, completed: 2, missed: 1 },
      { name: "Health",          total: 3, completed: 2, missed: 1 },
      { name: "Mindfulness",     total: 4, completed: 2, missed: 2 },
      { name: "Sleep",           total: 3, completed: 2, missed: 1 },
    ],
    dailyStats: [
      { day: "Mon", completed: 5, total: 6 },
      { day: "Tue", completed: 5, total: 6 },
      { day: "Wed", completed: 6, total: 6 },
      { day: "Thu", completed: 4, total: 6 },
      { day: "Fri", completed: 3, total: 6 },
      { day: "Sat", completed: 2, total: 7 },
      { day: "Sun", completed: 3, total: 7 },
    ],
    priorityStats: [
      { priority: "High",   total: 7, completed: 5, missed: 2 },
      { priority: "Medium", total: 7, completed: 5, missed: 2 },
      { priority: "Low",    total: 7, completed: 4, missed: 3 },
    ],
    habits: [
      { name: "Morning Walk",      priority: "High",   category: "Fitness",         timeOfDay: "Morning",   repeat: "Daily - never ends",    targetStreak: 365, completedDays: 6, totalDays: 7, missed: 1, streak: 4 },
      { name: "Sleep by 11 PM",    priority: "High",   category: "Sleep",           timeOfDay: "Night",     repeat: "Daily - never ends",    targetStreak: 365, completedDays: 4, totalDays: 7, missed: 3, streak: 0 },
      { name: "Read 30 min",       priority: "Medium", category: "Study",           timeOfDay: "Afternoon", repeat: "21-day challenge",       targetStreak: 21,  completedDays: 5, totalDays: 7, missed: 2, streak: 5 },
      { name: "Meditate",          priority: "Medium", category: "Mindfulness",     timeOfDay: "Morning",   repeat: "21-day challenge",       targetStreak: 21,  completedDays: 4, totalDays: 7, missed: 3, streak: 1 },
      { name: "Deep Work Sprint",  priority: "Medium", category: "Study",           timeOfDay: "Afternoon", repeat: "21-day challenge",       targetStreak: 21,  completedDays: 5, totalDays: 7, missed: 2, streak: 4 },
      { name: "Drink 3L Water",    priority: "Low",    category: "Health",          timeOfDay: "Morning",   repeat: "Daily - never ends",    targetStreak: 365, completedDays: 7, totalDays: 7, missed: 0, streak: 18 },
      { name: "Weekend Long Run",  priority: "Low",    category: "Fitness",         timeOfDay: "Morning",   repeat: "Weekend - ends 2028",   targetStreak: 104, completedDays: 1, totalDays: 2, missed: 1, streak: 0 },
      { name: "Weekend Planning",  priority: "Low",    category: "Morning Routine", timeOfDay: "Evening",   repeat: "Weekend - ends 2028",   targetStreak: 104, completedDays: 1, totalDays: 2, missed: 1, streak: 2 },
    ],
  },
  {
    id: "2026-04-06",
    date: "Apr 6 - Apr 12",
    signal: "5 Active days",
    totalInstances: 44,
    completed: 17,
    missed: 27,
    completionRate: 39,
    weeklyScore: 60,
    longestStreak: 3,
    aiSummary:
      "39% habit completion this week across 44 scheduled habit check-ins — below your usual pace. Tuesday and Friday had scheduled habits but no completions, which turned those check-ins into missed habits. Study and Fitness habits held their ground, but Sleep and Mindfulness dropped significantly. Two consecutive missed days in a week breaks momentum for streaks. Even a light habit day on off-days would preserve your streaks and lift your score next week.",
    categories: [
      { name: "Morning Routine", total: 3, completed: 2, missed: 1 },
      { name: "Fitness",         total: 2, completed: 1, missed: 1 },
      { name: "Study",           total: 3, completed: 2, missed: 1 },
      { name: "Health",          total: 2, completed: 1, missed: 1 },
      { name: "Mindfulness",     total: 2, completed: 1, missed: 1 },
      { name: "Sleep",           total: 2, completed: 1, missed: 1 },
    ],
    dailyStats: [
      { day: "Mon", completed: 5, total: 6 },
      { day: "Tue", completed: 0, total: 6 },
      { day: "Wed", completed: 5, total: 6 },
      { day: "Thu", completed: 4, total: 6 },
      { day: "Fri", completed: 0, total: 6 },
      { day: "Sat", completed: 2, total: 7 },
      { day: "Sun", completed: 1, total: 7 },
    ],
    priorityStats: [
      { priority: "High",   total: 5, completed: 3, missed: 2 },
      { priority: "Medium", total: 5, completed: 3, missed: 2 },
      { priority: "Low",    total: 4, completed: 2, missed: 2 },
    ],
    habits: [
      { name: "Morning Walk",      priority: "High",   category: "Fitness",         timeOfDay: "Morning",   repeat: "Daily - never ends",    targetStreak: 365, completedDays: 4, totalDays: 7, missed: 3, streak: 3 },
      { name: "Sleep by 11 PM",    priority: "High",   category: "Sleep",           timeOfDay: "Night",     repeat: "Daily - never ends",    targetStreak: 365, completedDays: 2, totalDays: 7, missed: 5, streak: 0 },
      { name: "Read 30 min",       priority: "Medium", category: "Study",           timeOfDay: "Afternoon", repeat: "21-day challenge",       targetStreak: 21,  completedDays: 3, totalDays: 7, missed: 4, streak: 3 },
      { name: "Meditate",          priority: "Medium", category: "Mindfulness",     timeOfDay: "Morning",   repeat: "21-day challenge",       targetStreak: 21,  completedDays: 2, totalDays: 7, missed: 5, streak: 0 },
      { name: "Deep Work Sprint",  priority: "Medium", category: "Study",           timeOfDay: "Afternoon", repeat: "21-day challenge",       targetStreak: 21,  completedDays: 4, totalDays: 7, missed: 3, streak: 2 },
      { name: "Weekend Long Run",  priority: "Low",    category: "Fitness",         timeOfDay: "Morning",   repeat: "Weekend - ends 2028",   targetStreak: 104, completedDays: 1, totalDays: 2, missed: 1, streak: 0 },
      { name: "Weekend Planning",  priority: "Low",    category: "Morning Routine", timeOfDay: "Evening",   repeat: "Weekend - ends 2028",   targetStreak: 104, completedDays: 1, totalDays: 2, missed: 1, streak: 1 },
      { name: "Take Vitamins",     priority: "Low",    category: "Health",          timeOfDay: "Morning",   repeat: "Daily - never ends",    targetStreak: 365, completedDays: 3, totalDays: 7, missed: 4, streak: 2 },
    ],
  },
  {
    id: "2026-03-30",
    date: "Mar 30 - Apr 5",
    signal: "7 Active days",
    totalInstances: 44,
    completed: 34,
    missed: 10,
    completionRate: 77,
    weeklyScore: 86,
    longestStreak: 6,
    aiSummary:
      "Best habit week in the past month — 77% completion across 44 scheduled habit check-ins with all 7 days active. Morning Routine and Fitness habits had near-perfect scores. Longest streak reached 6 days for your Morning Walk. Sleep discipline improved significantly from prior weeks. The only weak spot was Mindfulness — meditation was skipped 3 times. Keep the Sunday planning habit that preceded this week; it was the key driver of your consistency.",
    categories: [
      { name: "Morning Routine", total: 4, completed: 4, missed: 0 },
      { name: "Fitness",         total: 4, completed: 4, missed: 0 },
      { name: "Study",           total: 3, completed: 3, missed: 0 },
      { name: "Health",          total: 4, completed: 3, missed: 1 },
      { name: "Mindfulness",     total: 3, completed: 2, missed: 1 },
      { name: "Sleep",           total: 3, completed: 1, missed: 2 },
    ],
    dailyStats: [
      { day: "Mon", completed: 6, total: 6 },
      { day: "Tue", completed: 6, total: 6 },
      { day: "Wed", completed: 6, total: 6 },
      { day: "Thu", completed: 6, total: 6 },
      { day: "Fri", completed: 6, total: 6 },
      { day: "Sat", completed: 3, total: 7 },
      { day: "Sun", completed: 1, total: 7 },
    ],
    priorityStats: [
      { priority: "High",   total: 7, completed: 6, missed: 1 },
      { priority: "Medium", total: 7, completed: 6, missed: 1 },
      { priority: "Low",    total: 7, completed: 5, missed: 2 },
    ],
    habits: [
      { name: "Morning Walk",      priority: "High",   category: "Fitness",         timeOfDay: "Morning",   repeat: "Daily - never ends",    targetStreak: 365, completedDays: 7, totalDays: 7, missed: 0, streak: 6 },
      { name: "Sleep by 11 PM",    priority: "High",   category: "Sleep",           timeOfDay: "Night",     repeat: "Daily - never ends",    targetStreak: 365, completedDays: 5, totalDays: 7, missed: 2, streak: 3 },
      { name: "Read 30 min",       priority: "Medium", category: "Study",           timeOfDay: "Afternoon", repeat: "21-day challenge",       targetStreak: 21,  completedDays: 6, totalDays: 7, missed: 1, streak: 5 },
      { name: "Weekend Planning",  priority: "Low",    category: "Morning Routine", timeOfDay: "Evening",   repeat: "Weekend - ends 2028",   targetStreak: 104, completedDays: 2, totalDays: 2, missed: 0, streak: 6 },
    ],
  },
  {
    id: "2026-03-23",
    date: "Mar 23 - Mar 29",
    signal: "4 Active days",
    totalInstances: 44,
    completed: 12,
    missed: 32,
    completionRate: 27,
    weeklyScore: 48,
    longestStreak: 2,
    aiSummary:
      "27% completion across 44 scheduled habit check-ins — the weakest habit week of the past month. Monday, Friday, and Sunday had scheduled habits but no completions. Streaks broke across almost every habit category. The pattern here is inconsistency in showing up, not difficulty with the habits themselves. The fix is simpler than it seems: set one non-negotiable habit per day, even on rest days. Completing just one habit per day would have maintained streaks and improved your score.",
    categories: [
      { name: "Morning Routine", total: 2, completed: 1, missed: 1 },
      { name: "Fitness",         total: 2, completed: 1, missed: 1 },
      { name: "Study",           total: 2, completed: 1, missed: 1 },
      { name: "Health",          total: 2, completed: 2, missed: 0 },
      { name: "Mindfulness",     total: 2, completed: 1, missed: 1 },
      { name: "Sleep",           total: 2, completed: 0, missed: 2 },
    ],
    dailyStats: [
      { day: "Mon", completed: 0, total: 6 },
      { day: "Tue", completed: 4, total: 6 },
      { day: "Wed", completed: 4, total: 6 },
      { day: "Thu", completed: 3, total: 6 },
      { day: "Fri", completed: 0, total: 6 },
      { day: "Sat", completed: 1, total: 7 },
      { day: "Sun", completed: 0, total: 7 },
    ],
    priorityStats: [
      { priority: "High",   total: 4, completed: 2, missed: 2 },
      { priority: "Medium", total: 4, completed: 2, missed: 2 },
      { priority: "Low",    total: 4, completed: 2, missed: 2 },
    ],
    habits: [
      { name: "Morning Walk",      priority: "High",   category: "Fitness",         timeOfDay: "Morning",   repeat: "Daily - never ends",    targetStreak: 365, completedDays: 3, totalDays: 7, missed: 4, streak: 1 },
      { name: "Sleep by 11 PM",    priority: "High",   category: "Sleep",           timeOfDay: "Night",     repeat: "Daily - never ends",    targetStreak: 365, completedDays: 1, totalDays: 7, missed: 6, streak: 0 },
      { name: "Read 30 min",       priority: "Medium", category: "Study",           timeOfDay: "Afternoon", repeat: "21-day challenge",       targetStreak: 21,  completedDays: 2, totalDays: 7, missed: 5, streak: 2 },
      { name: "Meditate",          priority: "Medium", category: "Mindfulness",     timeOfDay: "Morning",   repeat: "21-day challenge",       targetStreak: 21,  completedDays: 2, totalDays: 7, missed: 5, streak: 1 },
      { name: "Deep Work Sprint",  priority: "Medium", category: "Study",           timeOfDay: "Afternoon", repeat: "21-day challenge",       targetStreak: 21,  completedDays: 3, totalDays: 7, missed: 4, streak: 1 },
      { name: "Weekend Long Run",  priority: "Low",    category: "Fitness",         timeOfDay: "Morning",   repeat: "Weekend - ends 2028",   targetStreak: 104, completedDays: 1, totalDays: 2, missed: 1, streak: 0 },
    ],
  },
];

function completionColor(rate) {
  if (rate >= 75) return "text-emerald-300";
  if (rate >= 55) return "text-amber-300";
  return "text-rose-300";
}

const getHabitSummary = (habits) => {
  const total     = habits.length;
  const completed = habits.filter((habit) => habit.streak > 0).length;
  return { total, completed, missed: Math.max(total - completed, 0) };
};

function ReportCard({ children, className = "" }) {
  return (
    <Motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3, boxShadow: "0 18px 36px rgba(0,0,0,0.34)" }}
      transition={{ duration: 0.22 }}
      className={`rounded-[1.4rem] border border-amber-100/10 bg-white/6 p-4 shadow-xl shadow-black/25 backdrop-blur sm:rounded-2xl sm:p-5 ${className}`}
    >
      {children}
    </Motion.section>
  );
}

export default function HabitWeeklyReport() {
  const { isDemoMode } = useAuth();
  const [selectedWeekId, setSelectedWeekId]     = useState(null);
  const [summaries, setSummaries]               = useState([]);
  const [loadingSummaries, setLoadingSummaries] = useState(true);
  const [weekData, setWeekData]                 = useState(null);
  const [loadingWeekData, setLoadingWeekData]   = useState(false);
  const [aiSummary, setAiSummary]               = useState(null);
  const [loadingAi, setLoadingAi]               = useState(false);
  const [habitFilter, setHabitFilter]           = useState("All");
  const TIME_FILTERS = ["All", "Morning", "Afternoon", "Evening", "Night"];
  const [priorityFilter, setPriorityFilter]         = useState("All");
  const [categoryPerfFilter, setCategoryPerfFilter] = useState("completion");

  // Load summaries on mount
  useEffect(() => {
    let active = true;

    if (isDemoMode) {
      const demoSummaries = DEMO_HABIT_DATA.map(w => ({
        id: w.id, date: w.date, signal: w.signal, habitCount: w.habits.length,
      }));
      if (active) {
        setSummaries(demoSummaries);
        setSelectedWeekId(demoSummaries[0]?.id ?? null);
        setLoadingSummaries(false);
      }
      return () => {
        active = false;
      };
    }

    api.get("/weekly-report/habits/summaries")
      .then(res => {
        if (!active) return;
        setSummaries(res.data);
        if (res.data.length > 0) setSelectedWeekId(res.data[0].id);
      })
      .catch(err => console.error("Failed to load habit weeks:", err))
      .finally(() => {
        if (active) setLoadingSummaries(false);
      });

    return () => {
      active = false;
    };
  }, [isDemoMode]);

  // Load week data when selection changes
  useEffect(() => {
    let active = true;

    if (!selectedWeekId) {
      setWeekData(null);
      setAiSummary(null);
      setLoadingWeekData(false);
      setLoadingAi(false);
      return;
    }
    if (isDemoMode) {
      const demo = DEMO_HABIT_DATA.find(w => w.id === selectedWeekId) ?? null;
      setWeekData(demo);
      setAiSummary(demo?.aiSummary ?? null);
      return;
    }
    setLoadingWeekData(true);
    setLoadingAi(true);
    setAiSummary(null);
    api.get(`/weekly-report/habits?week=${selectedWeekId}`)
      .then(res => {
        if (active) setWeekData(res.data);
      })
      .catch(err => {
        console.error("Failed to load habit week data:", err);
        if (active) setWeekData(null);
      })
      .finally(() => {
        if (active) setLoadingWeekData(false);
      });
    api.get(`/weekly-report/habits/ai-summary?week=${selectedWeekId}`)
      .then(res => {
        if (active) setAiSummary(res.data.aiSummary ?? null);
      })
      .catch(err => console.error("Failed to load habit AI summary:", err))
      .finally(() => {
        if (active) setLoadingAi(false);
      });

    return () => {
      active = false;
    };
  }, [selectedWeekId, isDemoMode]);

  const habitTotals = weekData ? getHabitSummary(weekData.habits ?? []) : null;

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">

      {/* ── LEFT: Main analysis panel ─────────────────────────── */}
      <div className="journal-scroll min-w-0 flex-1 overflow-y-auto lg:max-h-[calc(100vh-170px)]">
        <AnimatePresence mode="wait">
          {loadingWeekData ? (
            <Motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex h-64 items-center justify-center"
            >
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-amber-400/30 border-t-amber-400" />
            </Motion.div>
          ) : weekData ? (
            <Motion.div
              key={weekData.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22 }}
              className="space-y-4"
            >
              {/* Summary header */}
              <div className="dashboard-glow-card rounded-[1.4rem] border border-amber-100/10 bg-white/6 px-4 py-3 shadow-xl shadow-black/25 backdrop-blur sm:rounded-2xl sm:px-5 sm:py-2.5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-baseline gap-2">
                    <p className="text-label-md">Weekly Summary</p>
                    <p className="text-[11px] font-semibold text-stone-500">{weekData.date}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    <span className="rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300">
                      {weekData.habits?.length ?? 0} Habits Scheduled
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedWeekId(null)}
                      className="rounded-full border border-stone-700 px-3 py-1 text-xs font-semibold text-stone-400 transition-colors hover:border-stone-500 hover:text-stone-200"
                    >
                      ✕ Close
                    </button>
                  </div>
                </div>

                {/* Summary pills */}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {/* Streak Maintain */}
                  <div className="flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">Streak Maintain</p>
                    <span className={`text-xs font-bold ${completionColor(habitTotals.total > 0 ? Math.round((habitTotals.completed / habitTotals.total) * 100) : 0)}`}>
                      {habitTotals.completed}
                      <span className="text-[10px] font-semibold text-stone-500">/{habitTotals.total}</span>
                    </span>
                  </div>
                  {/* Streak Break */}
                  <Motion.div
                    className="relative flex items-center gap-1.5 overflow-hidden rounded-full border border-rose-400/25 bg-rose-500/10 px-3 py-1"
                    animate={{ boxShadow: ["0 0 0px rgba(251,113,133,0)", "0 0 10px rgba(251,113,133,0.36)", "0 0 0px rgba(251,113,133,0)"] }}
                    transition={{ boxShadow: { duration: 2.2, repeat: Infinity, ease: "easeInOut" } }}
                  >
                    <Motion.span
                      className="pointer-events-none absolute inset-y-0 left-[-40%] w-[30%] -skew-x-12 bg-white/25 blur-sm"
                      animate={{ left: ["-40%", "130%"] }}
                      transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 1.5, ease: "easeInOut" }}
                    />
                    <p className="relative z-10 text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">Streak Break</p>
                    <span className="relative z-10 text-xs font-bold text-rose-300">
                      {habitTotals.missed}
                      <span className="text-[10px] font-semibold text-stone-500">/{habitTotals.total}</span>
                    </span>
                  </Motion.div>
                  {/* Longest Streak */}
                  <div className="flex items-center gap-1.5 rounded-full border border-orange-400/20 bg-orange-500/10 px-3 py-1">
                    <span className="text-sm leading-none">🔥</span>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">Longest Streak</p>
                    <span className="text-xs font-bold text-orange-300">
                      {weekData.longestStreak}
                      <span className="text-[10px] font-semibold text-stone-500"> days</span>
                    </span>
                  </div>
                  {/* Consistency */}
                  {(() => {
                    const activeDays     = parseInt(weekData.signal ?? "0");
                    const consistencyPct = Math.round((activeDays / 7) * 100);
                    return (
                      <Motion.div
                        className={`relative flex items-center gap-1.5 overflow-hidden rounded-full border px-3 py-1 ${
                          consistencyPct >= 75 ? "border-violet-400/20 bg-violet-500/10" :
                          consistencyPct >= 55 ? "border-amber-400/20 bg-amber-500/10" :
                          "border-rose-400/20 bg-rose-500/10"
                        }`}
                        animate={{ boxShadow: ["0 0 0px rgba(167,139,250,0)", "0 0 10px rgba(167,139,250,0.36)", "0 0 0px rgba(167,139,250,0)"] }}
                        transition={{ boxShadow: { duration: 2.2, repeat: Infinity, ease: "easeInOut" } }}
                      >
                        <Motion.span
                          className="pointer-events-none absolute inset-y-0 left-[-40%] w-[30%] -skew-x-12 bg-white/25 blur-sm"
                          animate={{ left: ["-40%", "130%"] }}
                          transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 1.5, ease: "easeInOut" }}
                        />
                        <p className="relative z-10 text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">Consistency</p>
                        <span className={`relative z-10 text-xs font-bold ${
                          consistencyPct >= 75 ? "text-violet-300" :
                          consistencyPct >= 55 ? "text-amber-300" :
                          "text-rose-300"
                        }`}>
                          {consistencyPct}%
                          <span className="text-[10px] font-semibold text-stone-500"> ({activeDays}/7d)</span>
                        </span>
                      </Motion.div>
                    );
                  })()}
                  {/* Score */}
                  <div className={`flex items-center gap-1.5 rounded-full border px-3 py-1 ${
                    weekData.weeklyScore >= 75 ? "border-emerald-400/20 bg-emerald-500/10" :
                    weekData.weeklyScore >= 55 ? "border-amber-400/20 bg-amber-500/10" :
                    "border-rose-400/20 bg-rose-500/10"
                  }`}>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">Score</p>
                    <span className={`text-xs font-bold ${
                      weekData.weeklyScore >= 75 ? "text-emerald-300" :
                      weekData.weeklyScore >= 55 ? "text-amber-300" :
                      "text-rose-300"
                    }`}>
                      {weekData.weeklyScore}
                      <span className="text-[10px] font-semibold text-stone-500"> / 100</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* AI Summary */}
              <Motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="dashboard-glow-card flex min-h-[15rem] flex-col rounded-[1.4rem] border border-amber-100/10 bg-white/6 p-4 shadow-xl shadow-black/25 backdrop-blur sm:rounded-2xl sm:p-5 lg:h-[24vh]"
              >
                <div className="mb-3 flex items-center gap-2">
                  <Motion.img
                    src={littleMonkLogo}
                    alt="Little Monk"
                    className="h-14 w-17 object-contain"
                    animate={{ y: [0, -3, 0] }}
                    transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
                  />
                  <div>
                    <p className="text-label-md">Little Monk's Analysis</p>
                    <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-amber-300/70">AI Generated</p>
                  </div>
                </div>
                <div className="journal-scroll min-h-0 flex-1 overflow-y-auto pr-1">
                  {loadingAi ? (
                    <div className="flex h-full items-center justify-center">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-amber-400/30 border-t-amber-400" />
                    </div>
                  ) : aiSummary ? (
                    <p className="text-sm leading-relaxed text-stone-300">{aiSummary}</p>
                  ) : (
                    <p className="text-sm leading-relaxed text-stone-500 italic">
                      AI analysis will be available here once generated.
                    </p>
                  )}
                </div>
              </Motion.div>

              {/* 2×2 card grid */}
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">

                {/* Card 1 — Habit Summary */}
                <Motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}
                  className="dashboard-glow-card flex min-h-[12rem] flex-col rounded-[1.4rem] border border-amber-100/10 bg-white/6 p-4 shadow-xl shadow-black/25 backdrop-blur sm:rounded-2xl lg:h-[20vh]"
                >
                  <div className="mb-3 flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">Habit Summary</p>
                    <div className="flex w-full flex-wrap items-center gap-1 rounded-2xl border border-amber-100/10 bg-stone-900/60 p-0.5 sm:w-auto sm:flex-nowrap sm:rounded-full">
                      {["All", "High", "Medium", "Low"].map((p) => (
                        <button key={p} type="button" onClick={() => setPriorityFilter(p)}
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold transition-colors ${
                            priorityFilter === p ? "bg-amber-500/20 text-amber-300" : "text-stone-500 hover:text-stone-300"
                          }`}
                        >{p}</button>
                      ))}
                    </div>
                  </div>
                  <div className="min-h-0 flex-1 overflow-y-auto">
                    {(() => {
                      const priorityColor  = { High: "text-red-300",    Medium: "text-yellow-300", Low: "text-green-300" };
                      const priorityBorder = { High: "border-red-400/20", Medium: "border-yellow-400/20", Low: "border-green-400/20" };

                      if (priorityFilter === "All") {
                        const compPct = habitTotals.total > 0 ? Math.round((habitTotals.completed / habitTotals.total) * 100) : 0;
                        const missPct = habitTotals.total > 0 ? Math.round((habitTotals.missed    / habitTotals.total) * 100) : 0;
                        return (
                          <div className="rounded-xl border border-amber-400/15 bg-stone-950/40 p-3">
                            <div className="mb-1 flex items-center justify-between gap-2">
                              <p className="text-[10px] font-bold text-amber-300">All Habits This Week</p>
                            </div>
                            <div className="grid grid-cols-3 gap-1.5">
                              <div className="rounded-lg border border-stone-700/40 bg-stone-900/50 px-1.5 py-1 text-center">
                                <p className="text-[9px] text-stone-500">Scheduled Habits</p>
                                <p className="text-xs font-bold text-stone-200">{weekData.habits?.length ?? 0}</p>
                              </div>
                              <div className="rounded-lg border border-emerald-400/15 bg-emerald-500/8 px-1.5 py-1 text-center">
                                <p className="text-[9px] text-stone-500">Streak Maintain</p>
                                <p className="text-xs font-bold text-emerald-300">{habitTotals.completed}</p>
                                <p className="text-[8px] text-stone-500">{compPct}% of habits</p>
                              </div>
                              <div className="rounded-lg border border-rose-400/15 bg-rose-500/8 px-1.5 py-1 text-center">
                                <p className="text-[9px] text-stone-500">Streak Break</p>
                                <p className="text-xs font-bold text-rose-300">{habitTotals.missed}</p>
                                <p className="text-[8px] text-stone-500">{missPct}% of habits</p>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      const priorityHabits = (weekData.habits ?? []).filter((habit) => habit.priority === priorityFilter);
                      const row = { priority: priorityFilter, ...getHabitSummary(priorityHabits) };
                      const compPct = row.total > 0 ? Math.round((row.completed / row.total) * 100) : 0;
                      const missPct = row.total > 0 ? Math.round((row.missed / row.total) * 100) : 0;
                      return (
                        <div className={`rounded-xl border bg-stone-950/40 p-3 ${priorityBorder[row.priority]}`}>
                          <p className={`mb-2 text-[11px] font-bold ${priorityColor[row.priority]}`}>{row.priority} Priority Habits</p>
                          <div className="grid grid-cols-3 gap-1.5">
                            <div className="rounded-lg border border-stone-700/40 bg-stone-900/50 px-1.5 py-1 text-center">
                              <p className="text-[9px] text-stone-500">Scheduled Habits</p>
                              <p className="text-xs font-bold text-stone-200">{row.total}</p>
                            </div>
                            <div className="rounded-lg border border-emerald-400/15 bg-emerald-500/8 px-1.5 py-1 text-center">
                              <p className="text-[9px] text-stone-500">Streak Maintain</p>
                              <p className="text-xs font-bold text-emerald-300">{row.completed}</p>
                              <p className="text-[8px] text-stone-500">{compPct}% of habits</p>
                            </div>
                            <div className="rounded-lg border border-rose-400/15 bg-rose-500/8 px-1.5 py-1 text-center">
                              <p className="text-[9px] text-stone-500">Streak Break</p>
                              <p className="text-xs font-bold text-rose-300">{row.missed}</p>
                              <p className="text-[8px] text-stone-500">{missPct}% of habits</p>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </Motion.div>

                {/* Card 2 — Habit Performance + Streak */}
                <Motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.21 }}
                  className="dashboard-glow-card flex min-h-[17rem] flex-col rounded-[1.4rem] border border-amber-100/10 bg-white/6 p-4 shadow-xl shadow-black/25 backdrop-blur sm:rounded-2xl xl:row-span-2 xl:h-[44vh]"
                >
                  <div className="mb-3 flex shrink-0 flex-col gap-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">Habit Performance</p>
                    <div className="flex w-full flex-wrap items-center gap-1 rounded-2xl border border-amber-100/10 bg-stone-900/60 p-0.5 sm:flex-nowrap sm:rounded-full">
                      {TIME_FILTERS.map((f) => (
                        <button key={f} type="button" onClick={() => setHabitFilter(f)}
                          className={`flex-1 rounded-full py-0.5 text-[10px] font-semibold transition-colors ${
                            habitFilter === f ? "bg-amber-500/20 text-amber-300" : "text-stone-500 hover:text-stone-300"
                          }`}
                        >{f}</button>
                      ))}
                    </div>
                  </div>
                  <div className="journal-scroll min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
                    <AnimatePresence mode="wait">
                      <Motion.div key={habitFilter} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }} className="space-y-3">
                        {(() => {
                          const timeColor = {
                            Morning:   "bg-amber-500/15 text-amber-300 border-amber-400/20",
                            Afternoon: "bg-sky-500/15 text-sky-300 border-sky-400/20",
                            Evening:   "bg-violet-500/15 text-violet-300 border-violet-400/20",
                            Night:     "bg-indigo-500/15 text-indigo-300 border-indigo-400/20",
                          };
                          const habits = habitFilter === "All"
                            ? (weekData.habits ?? [])
                            : (weekData.habits ?? []).filter(h => h.timeOfDay === habitFilter);
                          if (habits.length === 0)
                            return <p className="text-center text-[11px] text-stone-600">No habits in this time slot</p>;
                          return habits.map((h) => {
                            const streakPct = Math.round((h.streak / h.targetStreak) * 100);
                            const broken    = h.streak === 0;
                            return (
                              <div key={h.name} className={`space-y-1.5 rounded-xl border p-2.5 ${broken ? "border-rose-400/20 bg-rose-500/5" : "border-stone-700/30 bg-stone-950/30"}`}>
                                <div className="flex items-center gap-2">
                                  <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-stone-300">{h.name}</span>
                                  <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] font-semibold ${timeColor[h.timeOfDay] ?? "bg-stone-500/15 text-stone-300 border-stone-400/20"}`}>
                                    {h.timeOfDay}
                                  </span>
                                </div>
                                <p className="truncate text-[9px] font-medium uppercase tracking-[0.12em] text-stone-500">{h.repeat}</p>
                                <div className="flex items-center gap-2">
                                  <div className="h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-stone-800/60">
                                    <Motion.div
                                      initial={{ width: 0 }}
                                      animate={{ width: `${streakPct}%` }}
                                      transition={{ duration: 0.5, ease: "easeOut" }}
                                      className={`h-full rounded-full ${broken ? "bg-rose-400" : streakPct >= 75 ? "bg-emerald-400" : streakPct >= 40 ? "bg-amber-400" : "bg-rose-400"}`}
                                    />
                                  </div>
                                  <span className="shrink-0 text-[10px] font-bold">
                                    {broken
                                      ? <span className="text-rose-400">💔 Streak Broken</span>
                                      : <span className="text-orange-300">🔥 {h.streak}d <span className="font-normal text-stone-500">/ {h.targetStreak}d</span></span>
                                    }
                                  </span>
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </Motion.div>
                    </AnimatePresence>
                  </div>
                </Motion.div>

                {/* Card 3 — Daily Breakdown */}
                <Motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }}
                  className="dashboard-glow-card flex min-h-[13rem] flex-col rounded-[1.4rem] border border-amber-100/10 bg-white/6 p-4 shadow-xl shadow-black/25 backdrop-blur sm:rounded-2xl lg:h-[23vh]"
                >
                  <p className="mb-2 shrink-0 text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">Daily Breakdown</p>
                  <div className="min-h-0 flex-1 space-y-1 overflow-y-auto">
                    {(() => {
                      const stats      = weekData.dailyStats ?? [];
                      const rates      = stats.map(d => d.total > 0 ? d.completed / d.total : -1);
                      const validRates = rates.filter(r => r >= 0);
                      const bestRate   = Math.max(...validRates);
                      const worstRate  = Math.min(...validRates);
                      return stats.map((d, i) => {
                        const pct     = d.total > 0 ? Math.round((d.completed / d.total) * 100) : null;
                        const rate    = d.total > 0 ? d.completed / d.total : -1;
                        const isBest  = rate === bestRate  && rate >= 0;
                        const isWorst = rate === worstRate && rate >= 0 && bestRate !== worstRate;
                        return (
                          <div key={d.day} className="flex items-center gap-2">
                            <span className="w-7 shrink-0 text-[11px] font-semibold text-stone-400">{d.day}</span>
                            {d.total === 0 ? (
                              <span className="text-[10px] text-stone-600">— no habits</span>
                            ) : (
                              <>
                                <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-stone-800/60">
                                  <Motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${pct}%` }}
                                    transition={{ duration: 0.5, ease: "easeOut", delay: i * 0.05 }}
                                    className={`h-full rounded-full ${pct >= 80 ? "bg-emerald-400" : pct >= 50 ? "bg-amber-400" : "bg-rose-400"}`}
                                  />
                                </div>
                                <span className="w-10 shrink-0 text-right text-[10px] font-semibold text-stone-300">{d.completed}/{d.total}</span>
                                <span className="w-6 shrink-0 text-center text-[11px]">
                                  {isBest ? "🔥" : isWorst ? "❌" : ""}
                                </span>
                              </>
                            )}
                          </div>
                        );
                      });
                    })()}
                  </div>
                </Motion.div>

              </div>
            </Motion.div>
          ) : (
            <Motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-amber-100/10 text-center"
            >
              <span className="text-3xl opacity-30">🔄</span>
              <p className="text-sm font-semibold text-stone-500">Select a week to view habit analysis</p>
              <p className="text-xs text-stone-600">Click <span className="text-amber-400/70">View</span> on any weekly summary →</p>
            </Motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── RIGHT: Two cards ──────────────────────────────────── */}
      <div className="grid w-full items-start gap-4 lg:w-[360px] lg:shrink-0 xl:w-[380px]">

        {/* Card 1 — Week Selector */}
        <ReportCard className="flex min-h-[16rem] flex-col overflow-hidden lg:h-[38vh]">
          <div className="mb-4 flex shrink-0 items-center gap-3">
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
              <h3 className="text-label-md">Little Monk's Analysis</h3>
              <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.14em] text-amber-300/70">
                Selected week
              </p>
            </div>
          </div>

          <div className="journal-scroll min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
            {loadingSummaries ? (
              <div className="flex h-full items-center justify-center">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-amber-400/30 border-t-amber-400" />
              </div>
            ) : summaries.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                <span className="text-2xl opacity-20">🔄</span>
                <p className="text-xs text-stone-600">No completed weeks yet</p>
              </div>
            ) : (
              summaries.map((week) => {
                const isSelected   = selectedWeekId === week.id;
                const displaySignal = week.signal || (isSelected && weekData?.signal ? weekData.signal : null);
                return (
                  <Motion.div
                    key={week.id}
                    layout
                    className={`rounded-xl border p-3 text-sm text-stone-400 transition-colors ${
                      isSelected
                        ? "border-amber-400/30 bg-amber-500/8"
                        : "border-amber-100/10 bg-stone-950/45 hover:border-amber-400/20"
                    }`}
                  >
                    <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
                      <div className="min-w-0">
                        {displaySignal && <span className="text-xs font-semibold text-amber-300/80">{displaySignal}</span>}
                        <p className="text-sm font-semibold text-stone-200">{week.date}</p>
                      </div>
                      <button
                        type="button"
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
              })
            )}
          </div>
        </ReportCard>

        {/* Card 2 — Category Performance */}
        <ReportCard className="flex min-h-[18rem] flex-col overflow-hidden lg:h-[42vh]">
          <div className="mb-4 shrink-0 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-base">📊</span>
              <div>
                <p className="text-label-md">Category Performance</p>
                <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-500">
                  {weekData ? weekData.date : "Select a week"}
                </p>
              </div>
            </div>
            <div className="flex w-full flex-wrap items-center rounded-2xl border border-amber-100/10 bg-stone-900/60 p-0.5 sm:flex-nowrap sm:rounded-full">
              {["completion", "miss"].map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setCategoryPerfFilter(f)}
                  className={`flex-1 rounded-full py-1 text-[11px] font-semibold transition-colors ${
                    categoryPerfFilter === f
                      ? f === "completion"
                        ? "bg-emerald-500/20 text-emerald-300"
                        : "bg-rose-500/20 text-rose-300"
                      : "text-stone-500 hover:text-stone-300"
                  }`}
                >
                  {f === "completion" ? "Streak Maintain" : "Streak Break"}
                </button>
              ))}
            </div>
          </div>

          <div className="journal-scroll min-h-0 flex-1 overflow-y-auto pr-1">
            {weekData ? (
              <AnimatePresence mode="wait">
                <Motion.div
                  key={categoryPerfFilter}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18 }}
                  className="space-y-2.5"
                >
                  {(weekData.categories ?? [])
                    .filter((cat) => categoryPerfFilter === "completion" || cat.missed > 0)
                    .map((cat) => {
                      const pct = categoryPerfFilter === "completion"
                        ? Math.round((cat.completed / cat.total) * 100)
                        : Math.round((cat.missed / cat.total) * 100);
                      const isCompletion = categoryPerfFilter === "completion";
                      return (
                        <div key={cat.name}>
                          <div className="mb-1 flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
                            <span className="text-xs font-semibold text-stone-300">{cat.name}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-stone-500">
                                {isCompletion ? `${cat.completed}/${cat.total} done` : `${cat.missed}/${cat.total} missed`}
                              </span>
                              <span className={`text-xs font-bold ${
                                isCompletion
                                  ? completionColor(pct)
                                  : pct <= 15 ? "text-emerald-300" : pct <= 30 ? "text-amber-300" : "text-rose-300"
                              }`}>
                                {pct}%
                              </span>
                            </div>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-800/60">
                            <Motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.5, ease: "easeOut" }}
                              className={`h-full rounded-full ${
                                isCompletion
                                  ? (pct >= 75 ? "bg-emerald-400" : pct >= 55 ? "bg-amber-400" : "bg-rose-400")
                                  : (pct <= 15 ? "bg-emerald-400" : pct <= 30 ? "bg-amber-400" : "bg-rose-400")
                              }`}
                            />
                          </div>
                        </div>
                      );
                    })}
                </Motion.div>
              </AnimatePresence>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                <span className="text-2xl opacity-20">📊</span>
                <p className="text-xs text-stone-600">Select a week to see category performance</p>
              </div>
            )}
          </div>
        </ReportCard>

      </div>
    </div>
  );
}
