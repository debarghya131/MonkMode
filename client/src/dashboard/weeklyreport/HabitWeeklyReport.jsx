import { useState } from "react";
import { motion as Motion, AnimatePresence } from "framer-motion";
import monkGreetingsLogo from "../../assets/monkgreetingslogo.png";

const WEEKLY_HABIT_DATA = [
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

const getWeekHabitCount = (week) => week.habits.length;

const getHabitSummary = (habits) => {
  const total = habits.length;
  const completed = habits.filter((habit) => habit.streak > 0).length;

  return {
    total,
    completed,
    missed: Math.max(total - completed, 0),
  };
};

const getLongestHabitStreak = (week) =>
  Math.max(0, ...week.habits.map((habit) => habit.streak || 0));

function ReportCard({ children, className = "" }) {
  return (
    <Motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3, boxShadow: "0 18px 36px rgba(0,0,0,0.34)" }}
      transition={{ duration: 0.22 }}
      className={`rounded-2xl border border-amber-100/10 bg-white/6 p-5 shadow-xl shadow-black/25 backdrop-blur ${className}`}
    >
      {children}
    </Motion.section>
  );
}

export default function HabitWeeklyReport() {
  const [selectedWeekId, setSelectedWeekId] = useState(WEEKLY_HABIT_DATA[0].id);
  const [habitFilter, setHabitFilter]       = useState("All");
  const TIME_FILTERS = ["All", "Morning", "Afternoon", "Evening", "Night"];
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [categoryPerfFilter, setCategoryPerfFilter] = useState("completion");

  const selectedWeek = WEEKLY_HABIT_DATA.find((w) => w.id === selectedWeekId) ?? null;

  const habitTotals = selectedWeek ? getHabitSummary(selectedWeek.habits) : null;

  return (
    <div className="flex items-start gap-5">

      {/* ── LEFT: Main analysis panel ─────────────────────────── */}
      <div className="journal-scroll min-w-0 flex-1 overflow-y-auto" style={{ maxHeight: "calc(100vh - 170px)" }}>
        <AnimatePresence mode="wait">
          {selectedWeek ? (
            <Motion.div
              key={selectedWeek.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22 }}
              className="space-y-4"
            >
              {/* Summary header */}
              <div className="rounded-2xl border border-amber-100/10 bg-white/6 px-5 py-2.5 shadow-xl shadow-black/25 backdrop-blur">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-baseline gap-2">
                    <p className="text-label-md">Weekly Summary</p>
                    <p className="text-[11px] font-semibold text-stone-500">{selectedWeek.date}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300">
                      {getWeekHabitCount(selectedWeek)} Habits Scheduled
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
                    <span className={`text-xs font-bold ${completionColor(Math.round((habitTotals.completed / habitTotals.total) * 100))}`}>
                      {habitTotals.completed}
                      <span className="text-[10px] font-semibold text-stone-500">/{habitTotals.total}</span>
                    </span>
                  </div>
                  {/* Streak Break */}
                  <div className="flex items-center gap-1.5 rounded-full border border-rose-400/20 bg-rose-500/10 px-3 py-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">Streak Break</p>
                    <span className="text-xs font-bold text-rose-300">
                      {habitTotals.missed}
                      <span className="text-[10px] font-semibold text-stone-500">/{habitTotals.total}</span>
                    </span>
                  </div>
                  {/* Longest Streak */}
                  <div className="flex items-center gap-1.5 rounded-full border border-orange-400/20 bg-orange-500/10 px-3 py-1">
                    <span className="text-sm leading-none">🔥</span>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">Longest Streak</p>
                    <span className="text-xs font-bold text-orange-300">
                      {getLongestHabitStreak(selectedWeek)}
                      <span className="text-[10px] font-semibold text-stone-500"> days</span>
                    </span>
                  </div>
                  {/* Consistency */}
                  {(() => {
                    const activeDays = parseInt(selectedWeek.signal);
                    const consistencyPct = Math.round((activeDays / 7) * 100);
                    return (
                      <div className={`flex items-center gap-1.5 rounded-full border px-3 py-1 ${
                        consistencyPct >= 75 ? "border-violet-400/20 bg-violet-500/10" :
                        consistencyPct >= 55 ? "border-amber-400/20 bg-amber-500/10" :
                        "border-rose-400/20 bg-rose-500/10"
                      }`}>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">Consistency</p>
                        <span className={`text-xs font-bold ${
                          consistencyPct >= 75 ? "text-violet-300" :
                          consistencyPct >= 55 ? "text-amber-300" :
                          "text-rose-300"
                        }`}>
                          {consistencyPct}%
                          <span className="text-[10px] font-semibold text-stone-500"> ({activeDays}/7d)</span>
                        </span>
                      </div>
                    );
                  })()}
                  {/* Score */}
                  <div className={`flex items-center gap-1.5 rounded-full border px-3 py-1 ${
                    selectedWeek.weeklyScore >= 75 ? "border-emerald-400/20 bg-emerald-500/10" :
                    selectedWeek.weeklyScore >= 55 ? "border-amber-400/20 bg-amber-500/10" :
                    "border-rose-400/20 bg-rose-500/10"
                  }`}>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">Score</p>
                    <span className={`text-xs font-bold ${
                      selectedWeek.weeklyScore >= 75 ? "text-emerald-300" :
                      selectedWeek.weeklyScore >= 55 ? "text-amber-300" :
                      "text-rose-300"
                    }`}>
                      {selectedWeek.weeklyScore}
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
                className="rounded-2xl border border-amber-100/10 bg-white/6 p-5 shadow-xl shadow-black/25 backdrop-blur flex flex-col h-[220px]"
              >
                <div className="mb-3 flex items-center gap-2">
                  <Motion.img
                    src={monkGreetingsLogo}
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
                  <p className="text-sm leading-relaxed text-stone-300">{selectedWeek.aiSummary}</p>
                </div>
              </Motion.div>

              {/* 2×2 card grid */}
              <div className="grid grid-cols-2 gap-4">

                {/* Card 1 — Habit Summary */}
                <Motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}
                  className="flex h-[178px] flex-col rounded-2xl border border-amber-100/10 bg-white/6 p-4 shadow-xl shadow-black/25 backdrop-blur"
                >
                  <div className="mb-3 flex shrink-0 items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">Habit Summary</p>
                    <div className="flex items-center gap-1 rounded-full border border-amber-100/10 bg-stone-900/60 p-0.5">
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
                        const compPct = Math.round((habitTotals.completed / habitTotals.total) * 100);
                        const missPct = Math.round((habitTotals.missed    / habitTotals.total) * 100);
                        return (
                          <div className="rounded-xl border border-amber-400/15 bg-stone-950/40 p-3">
                            <div className="mb-1 flex items-center justify-between gap-2">
                              <p className="text-[10px] font-bold text-amber-300">All Habits This Week</p>
                            </div>
                            <div className="grid grid-cols-3 gap-1.5">
                              <div className="rounded-lg border border-stone-700/40 bg-stone-900/50 px-1.5 py-1 text-center">
                                <p className="text-[9px] text-stone-500">Scheduled Habits</p>
                                <p className="text-xs font-bold text-stone-200">{getWeekHabitCount(selectedWeek)}</p>
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

                      const priorityHabits = selectedWeek.habits.filter((habit) => habit.priority === priorityFilter);
                      const row = {
                        priority: priorityFilter,
                        ...getHabitSummary(priorityHabits),
                      };
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

                {/* Card 2 — Habit Performance + Streak (merged, spans both rows) */}
                <Motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.21 }}
                  className="row-span-2 flex h-[400px] flex-col rounded-2xl border border-amber-100/10 bg-white/6 p-4 shadow-xl shadow-black/25 backdrop-blur"
                >
                  <div className="mb-3 flex shrink-0 flex-col gap-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">Habit Performance</p>
                    <div className="flex items-center gap-1 rounded-full border border-amber-100/10 bg-stone-900/60 p-0.5">
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
                            ? selectedWeek.habits
                            : selectedWeek.habits.filter(h => h.timeOfDay === habitFilter);
                          if (habits.length === 0)
                            return <p className="text-center text-[11px] text-stone-600">No habits in this time slot</p>;
                          return habits.map((h) => {
                            const pct = Math.round((h.completedDays / h.totalDays) * 100);
                            const streakPct = Math.round((h.streak / h.targetStreak) * 100);
                            const broken = h.streak === 0;
                            return (
                              <div key={h.name} className={`space-y-1.5 rounded-xl border p-2.5 ${broken ? "border-rose-400/20 bg-rose-500/5" : "border-stone-700/30 bg-stone-950/30"}`}>
                                <div className="flex items-center gap-2">
                                  <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-stone-300">{h.name}</span>
                                  <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] font-semibold ${timeColor[h.timeOfDay]}`}>
                                    {h.timeOfDay}
                                  </span>
                                </div>
                                <p className="truncate text-[9px] font-medium uppercase tracking-[0.12em] text-stone-500">{h.repeat}</p>
                                {/* Streak bar */}
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
                  className="flex h-[206px] flex-col rounded-2xl border border-amber-100/10 bg-white/6 p-4 shadow-xl shadow-black/25 backdrop-blur"
                >
                  <p className="mb-2 shrink-0 text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">Daily Breakdown</p>
                  <div className="min-h-0 flex-1 space-y-1 overflow-y-auto">
                    {(() => {
                      const stats = selectedWeek.dailyStats;
                      const rates = stats.map(d => d.total > 0 ? d.completed / d.total : -1);
                      const validRates = rates.filter(r => r >= 0);
                      const bestRate  = Math.max(...validRates);
                      const worstRate = Math.min(...validRates);
                      return stats.map((d, i) => {
                        const pct  = d.total > 0 ? Math.round((d.completed / d.total) * 100) : null;
                        const rate = d.total > 0 ? d.completed / d.total : -1;
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
      <div className="grid w-full max-w-[360px] shrink-0 items-start gap-4">

        {/* Card 1 — Week Selector */}
        <ReportCard className="flex h-[340px] flex-col overflow-hidden">
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

          <div className="journal-scroll min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
            {WEEKLY_HABIT_DATA.map((week) => {
              const isSelected = selectedWeekId === week.id;
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
                      <span className="text-xs font-semibold text-amber-300/80">{getWeekHabitCount(week)} Habits Scheduled</span>
                      <p className="text-sm font-semibold text-stone-200">Weekly Summary</p>
                      <p className="text-xs text-stone-500">({week.date})</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedWeekId(isSelected ? null : week.id)}
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
        </ReportCard>

        {/* Card 2 — Category Performance */}
        <ReportCard className="flex h-[380px] flex-col overflow-hidden">
          <div className="mb-4 shrink-0 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-base">📊</span>
              <div>
                <p className="text-label-md">Category Performance</p>
                <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-500">
                  {selectedWeek ? selectedWeek.date : "Select a week"}
                </p>
              </div>
            </div>
            <div className="flex w-full items-center rounded-full border border-amber-100/10 bg-stone-900/60 p-0.5">
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
            {selectedWeek ? (
              <AnimatePresence mode="wait">
                <Motion.div
                  key={categoryPerfFilter}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18 }}
                  className="space-y-2.5"
                >
                  {selectedWeek.categories
                    .filter((cat) => categoryPerfFilter === "completion" || cat.missed > 0)
                    .map((cat) => {
                      const pct = categoryPerfFilter === "completion"
                        ? Math.round((cat.completed / cat.total) * 100)
                        : Math.round((cat.missed / cat.total) * 100);
                      const isCompletion = categoryPerfFilter === "completion";
                      return (
                        <div key={cat.name}>
                          <div className="mb-1 flex items-center justify-between gap-2">
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
