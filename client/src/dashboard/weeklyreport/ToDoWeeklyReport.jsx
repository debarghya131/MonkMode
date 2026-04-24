import { useState } from "react";
import { motion as Motion, AnimatePresence } from "framer-motion";
import monkGreetingsLogo from "../../assets/monkgreetingslogo.png";

const WEEKLY_TODO_DATA = [
  {
    id: "2026-04-13",
    date: "Apr 13 - Apr 19",
    signal: "6 days with tasks",
    totalTasks: 42,
    completed: 28,
    pending: 6,
    missed: 8,
    completionRate: 67,
    weeklyScore: 70,
    longestStreak: 3,
    completionTiming: [
      { range: "6 AM – 9 AM",  count: 8,  total: 9  },
      { range: "9 AM – 12 PM", count: 11, total: 13 },
      { range: "12 PM – 3 PM", count: 5,  total: 7  },
      { range: "3 PM – 6 PM",  count: 3,  total: 5  },
      { range: "6 PM – 12 AM", count: 1,  total: 2  },
    ],
    missedTiming: [
      { range: "6 AM – 9 AM",  count: 1, total: 9  },
      { range: "9 AM – 12 PM", count: 2, total: 13 },
      { range: "12 PM – 3 PM", count: 2, total: 7  },
      { range: "3 PM – 6 PM",  count: 2, total: 5  },
      { range: "6 PM – 12 AM", count: 1, total: 2  },
    ],
    aiSummary:
      "Your task completion rate this week sat at 67%, with 28 out of 42 tasks closed. Study and Work categories performed best — nearly every high-priority item was cleared. The biggest drag came from Health and Personal tasks: vitamins, journaling, and sleep routines were the most frequently skipped. Missed tasks clustered on Wednesday and Thursday, both days with heavy Work loads. The fix is structural: batch your low-effort personal tasks into a single 10-minute morning block so they don't compete with deep-work hours. Next week, front-load your Health tasks before 9 AM.",
    categories: [
      { name: "Study",          total: 9,  completed: 8, missed: 1 },
      { name: "Work",           total: 10, completed: 8, missed: 1 },
      { name: "Fitness",        total: 8,  completed: 5, missed: 2 },
      { name: "Health",         total: 6,  completed: 3, missed: 2 },
      { name: "Bill & Payment", total: 4,  completed: 2, missed: 1 },
      { name: "Personal",       total: 3,  completed: 1, missed: 1 },
      { name: "Shopping",       total: 2,  completed: 1, missed: 0 },
    ],
    priorityStats: [
      { priority: "High",   total: 14, completed: 10, missed: 2 },
      { priority: "Medium", total: 16, completed: 11, missed: 3 },
      { priority: "Low",    total: 12, completed: 7,  missed: 3 },
    ],
    importantCategories: [
      { name: "Bill & Payment", total: 4, completed: 2, missed: 1 },
      { name: "Health",         total: 6, completed: 3, missed: 2 },
    ],
    dailyStats: [
      { day: "Mon", completed: 4, total: 6  },
      { day: "Tue", completed: 5, total: 7  },
      { day: "Wed", completed: 6, total: 8  },
      { day: "Thu", completed: 7, total: 7  },
      { day: "Fri", completed: 4, total: 7  },
      { day: "Sat", completed: 2, total: 5  },
      { day: "Sun", completed: 0, total: 2  },
    ],
    missedTasks: [
      { title: "Take Mock Interview",      category: "Study",   priority: "High",   day: "Mon, Apr 14" },
      { title: "Evening Run",              category: "Fitness", priority: "Medium", day: "Tue, Apr 15" },
      { title: "Take Vitamins",            category: "Health",  priority: "Low",    day: "Wed, Apr 16" },
      { title: "Morning Stretch",          category: "Fitness", priority: "Low",    day: "Thu, Apr 17" },
      { title: "Pay Electricity Bill",     category: "Bill & Payment", priority: "High", day: "Thu, Apr 17" },
      { title: "Write Journal Entry",      category: "Personal", priority: "Low",   day: "Fri, Apr 18" },
      { title: "Order Groceries",          category: "Shopping", priority: "Low",   day: "Sat, Apr 19" },
      { title: "Sleep by 11 PM",           category: "Health",  priority: "Medium", day: "Sun, Apr 13" },
    ],
  },
  {
    id: "2026-04-06",
    date: "Apr 6 - Apr 12",
    signal: "5 days with tasks",
    totalTasks: 38,
    completed: 22,
    pending: 9,
    missed: 7,
    completionRate: 58,
    weeklyScore: 63,
    longestStreak: 3,
    completionTiming: [
      { range: "6 AM – 9 AM",  count: 5,  total: 6  },
      { range: "9 AM – 12 PM", count: 9,  total: 10 },
      { range: "12 PM – 3 PM", count: 4,  total: 7  },
      { range: "3 PM – 6 PM",  count: 3,  total: 4  },
      { range: "6 PM – 12 AM", count: 1,  total: 2  },
    ],
    missedTiming: [
      { range: "6 AM – 9 AM",  count: 1, total: 6  },
      { range: "9 AM – 12 PM", count: 1, total: 10 },
      { range: "12 PM – 3 PM", count: 3, total: 7  },
      { range: "3 PM – 6 PM",  count: 1, total: 4  },
      { range: "6 PM – 12 AM", count: 1, total: 2  },
    ],
    aiSummary:
      "58% completion this week — below your typical pace. Work tasks held up well but Study slipped mid-week with two missed deep-work sessions. The pending pile grew because of carryover tasks that were never explicitly deferred. A simple rule helps here: if a task stays pending for two days in a row, either do it first thing or delete it. The 7 missed tasks were all low-to-medium priority, which suggests avoidance rather than overload. Tighten your daily review habit to catch these before they stack.",
    categories: [
      { name: "Study",          total: 8,  completed: 4, missed: 2 },
      { name: "Work",           total: 9,  completed: 7, missed: 1 },
      { name: "Fitness",        total: 6,  completed: 3, missed: 2 },
      { name: "Health",         total: 5,  completed: 3, missed: 1 },
      { name: "Bill & Payment", total: 4,  completed: 3, missed: 0 },
      { name: "Personal",       total: 4,  completed: 1, missed: 1 },
      { name: "Shopping",       total: 2,  completed: 1, missed: 0 },
    ],
    priorityStats: [
      { priority: "High",   total: 13, completed: 8, missed: 2 },
      { priority: "Medium", total: 15, completed: 9, missed: 3 },
      { priority: "Low",    total: 10, completed: 5, missed: 2 },
    ],
    importantCategories: [
      { name: "Bill & Payment", total: 4, completed: 3, missed: 0 },
      { name: "Health",         total: 5, completed: 3, missed: 1 },
    ],
    dailyStats: [
      { day: "Mon", completed: 3, total: 6 },
      { day: "Tue", completed: 4, total: 6 },
      { day: "Wed", completed: 5, total: 7 },
      { day: "Thu", completed: 4, total: 7 },
      { day: "Fri", completed: 4, total: 6 },
      { day: "Sat", completed: 2, total: 4 },
      { day: "Sun", completed: 0, total: 2 },
    ],
    missedTasks: [
      { title: "Read OS Concepts",         category: "Study",   priority: "Medium", day: "Tue, Apr 8"  },
      { title: "Take Mock Interview",      category: "Study",   priority: "High",   day: "Wed, Apr 9"  },
      { title: "Morning Stretch",          category: "Fitness", priority: "Low",    day: "Mon, Apr 7"  },
      { title: "Evening Run",              category: "Fitness", priority: "Medium", day: "Thu, Apr 10" },
      { title: "Take Vitamins",            category: "Health",  priority: "Low",    day: "Fri, Apr 11" },
      { title: "Clean Workspace",          category: "Personal", priority: "Low",   day: "Sat, Apr 12" },
      { title: "Deploy to Staging",        category: "Work",    priority: "Medium", day: "Wed, Apr 9"  },
    ],
  },
  {
    id: "2026-03-30",
    date: "Mar 30 - Apr 5",
    signal: "7 days with tasks",
    totalTasks: 45,
    completed: 36,
    pending: 4,
    missed: 5,
    completionRate: 80,
    weeklyScore: 88,
    longestStreak: 5,
    completionTiming: [
      { range: "6 AM – 9 AM",  count: 12, total: 12 },
      { range: "9 AM – 12 PM", count: 14, total: 15 },
      { range: "12 PM – 3 PM", count: 6,  total: 8  },
      { range: "3 PM – 6 PM",  count: 3,  total: 4  },
      { range: "6 PM – 12 AM", count: 1,  total: 2  },
    ],
    missedTiming: [
      { range: "6 AM – 9 AM",  count: 0, total: 12 },
      { range: "9 AM – 12 PM", count: 1, total: 15 },
      { range: "12 PM – 3 PM", count: 2, total: 8  },
      { range: "3 PM – 6 PM",  count: 1, total: 4  },
      { range: "6 PM – 12 AM", count: 1, total: 2  },
    ],
    aiSummary:
      "Your best task week in the past month — 80% completion with all seven days active. Every high-priority item was resolved. The 5 missed tasks were all low-priority and non-urgent, which is an acceptable trade-off when the important things got done. Wednesday April 2nd was your standout day: 8 tasks completed, zero missed, and the earliest start time of the week. The pattern that drove this was a pre-written task list the night before. Replicate that Sunday planning habit and you should hold this completion rate into next week.",
    categories: [
      { name: "Study",          total: 9,  completed: 8, missed: 0 },
      { name: "Work",           total: 10, completed: 9, missed: 0 },
      { name: "Fitness",        total: 7,  completed: 6, missed: 1 },
      { name: "Health",         total: 7,  completed: 6, missed: 1 },
      { name: "Bill & Payment", total: 4,  completed: 3, missed: 1 },
      { name: "Personal",       total: 5,  completed: 3, missed: 1 },
      { name: "Shopping",       total: 3,  completed: 1, missed: 1 },
    ],
    priorityStats: [
      { priority: "High",   total: 15, completed: 13, missed: 1 },
      { priority: "Medium", total: 18, completed: 14, missed: 2 },
      { priority: "Low",    total: 12, completed: 9,  missed: 2 },
    ],
    importantCategories: [
      { name: "Bill & Payment", total: 4, completed: 3, missed: 1 },
      { name: "Health",         total: 7, completed: 6, missed: 1 },
    ],
    dailyStats: [
      { day: "Mon", completed: 5, total: 6 },
      { day: "Tue", completed: 6, total: 7 },
      { day: "Wed", completed: 8, total: 8 },
      { day: "Thu", completed: 7, total: 7 },
      { day: "Fri", completed: 6, total: 7 },
      { day: "Sat", completed: 3, total: 5 },
      { day: "Sun", completed: 1, total: 5 },
    ],
    missedTasks: [
      { title: "Evening Run",              category: "Fitness", priority: "Medium", day: "Mon, Mar 30" },
      { title: "Sleep by 11 PM",           category: "Health",  priority: "Medium", day: "Wed, Apr 2"  },
      { title: "Cancel Unused Subscription", category: "Bill & Payment", priority: "Low", day: "Thu, Apr 3" },
      { title: "Write Journal Entry",      category: "Personal", priority: "Low",   day: "Sat, Apr 5"  },
      { title: "Buy Earphones",            category: "Shopping", priority: "Medium", day: "Fri, Apr 4" },
    ],
  },
  {
    id: "2026-03-23",
    date: "Mar 23 - Mar 29",
    signal: "4 days with tasks",
    totalTasks: 35,
    completed: 17,
    pending: 8,
    missed: 10,
    completionRate: 49,
    weeklyScore: 52,
    longestStreak: 2,
    completionTiming: [
      { range: "6 AM – 9 AM",  count: 3, total: 5  },
      { range: "9 AM – 12 PM", count: 7, total: 10 },
      { range: "12 PM – 3 PM", count: 4, total: 6  },
      { range: "3 PM – 6 PM",  count: 2, total: 4  },
      { range: "6 PM – 12 AM", count: 1, total: 2  },
    ],
    missedTiming: [
      { range: "6 AM – 9 AM",  count: 2, total: 5  },
      { range: "9 AM – 12 PM", count: 3, total: 10 },
      { range: "12 PM – 3 PM", count: 2, total: 6  },
      { range: "3 PM – 6 PM",  count: 2, total: 4  },
      { range: "6 PM – 12 AM", count: 1, total: 2  },
    ],
    aiSummary:
      "49% completion is the lowest of the past four weeks. Only 4 active days with significant gaps on Tuesday and Friday. The missed task count of 10 is high, and unlike other weeks, several high-priority items were in that group — two Study tasks and a Work deadline. The root cause appears to be an overloaded task list: 35 tasks across 4 active days is an unrealistic pace. For weeks with fewer active days, cut the list to match your actual capacity. Better to complete 80% of 20 tasks than 49% of 35.",
    categories: [
      { name: "Study",          total: 8,  completed: 3, missed: 3 },
      { name: "Work",           total: 8,  completed: 4, missed: 2 },
      { name: "Fitness",        total: 5,  completed: 2, missed: 2 },
      { name: "Health",         total: 5,  completed: 3, missed: 2 },
      { name: "Bill & Payment", total: 3,  completed: 2, missed: 1 },
      { name: "Personal",       total: 4,  completed: 2, missed: 0 },
      { name: "Shopping",       total: 2,  completed: 1, missed: 0 },
    ],
    priorityStats: [
      { priority: "High",   total: 12, completed: 5, missed: 4 },
      { priority: "Medium", total: 13, completed: 7, missed: 4 },
      { priority: "Low",    total: 10, completed: 5, missed: 2 },
    ],
    importantCategories: [
      { name: "Bill & Payment", total: 3, completed: 2, missed: 1 },
      { name: "Health",         total: 5, completed: 3, missed: 2 },
    ],
    dailyStats: [
      { day: "Mon", completed: 0, total: 0 },
      { day: "Tue", completed: 2, total: 6 },
      { day: "Wed", completed: 5, total: 8 },
      { day: "Thu", completed: 3, total: 6 },
      { day: "Fri", completed: 0, total: 0 },
      { day: "Sat", completed: 5, total: 7 },
      { day: "Sun", completed: 2, total: 8 },
    ],
    missedTasks: [
      { title: "Revise Graph Algorithms",  category: "Study",   priority: "High",   day: "Mon, Mar 23" },
      { title: "Take Mock Interview",      category: "Study",   priority: "High",   day: "Tue, Mar 24" },
      { title: "Read OS Concepts",         category: "Study",   priority: "Medium", day: "Thu, Mar 26" },
      { title: "Deploy to Staging",        category: "Work",    priority: "Medium", day: "Wed, Mar 25" },
      { title: "Frontend Team Sync",       category: "Work",    priority: "High",   day: "Mon, Mar 23" },
      { title: "Morning Stretch",          category: "Fitness", priority: "Low",    day: "Fri, Mar 27" },
      { title: "Evening Run",              category: "Fitness", priority: "Medium", day: "Sat, Mar 28" },
      { title: "Take Vitamins",            category: "Health",  priority: "Low",    day: "Mon, Mar 23" },
      { title: "Track Water Intake",       category: "Health",  priority: "Low",    day: "Wed, Mar 25" },
      { title: "Pay Electricity Bill",     category: "Bill & Payment", priority: "High", day: "Thu, Mar 26" },
    ],
  },
];


function completionColor(rate) {
  if (rate >= 75) return "text-emerald-300";
  if (rate >= 55) return "text-amber-300";
  return "text-rose-300";
}


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

export default function ToDoWeeklyReport() {
  const [selectedWeekId, setSelectedWeekId] = useState(WEEKLY_TODO_DATA[0].id);
  const [timingFilter, setTimingFilter] = useState("completed");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("completion");
  const [keyCategoryFilter, setKeyCategoryFilter] = useState("All");

  const selectedWeek = WEEKLY_TODO_DATA.find((w) => w.id === selectedWeekId) ?? null;

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
              {/* Heading */}
              <div className="rounded-2xl border border-amber-100/10 bg-white/6 px-5 py-2.5 shadow-xl shadow-black/25 backdrop-blur">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-baseline gap-2">
                    <p className="text-label-md">Weekly Summary</p>
                    <p className="text-[11px] font-semibold text-stone-500">{selectedWeek.date}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300">
                      {selectedWeek.signal}
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

                {/* Summary pills row */}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {/* Completion Rate */}
                  <div className="flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">Completion</p>
                    <span className={`text-xs font-bold ${completionColor(selectedWeek.completionRate)}`}>
                      {selectedWeek.completionRate}%
                    </span>
                  </div>
                  {/* Miss Rate */}
                  <div className="flex items-center gap-1.5 rounded-full border border-rose-400/20 bg-rose-500/10 px-3 py-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">Miss Rate</p>
                    <span className="text-xs font-bold text-rose-300">
                      {Math.round((selectedWeek.missed / selectedWeek.totalTasks) * 100)}%
                    </span>
                  </div>
                  {/* Longest Streak */}
                  <div className="flex items-center gap-1.5 rounded-full border border-orange-400/20 bg-orange-500/10 px-3 py-1">
                    <span className="text-sm leading-none">🔥</span>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">Longest Streak</p>
                    <span className="text-xs font-bold text-orange-300">
                      {selectedWeek.longestStreak}
                      <span className="text-[10px] font-semibold text-stone-500"> days</span>
                    </span>
                  </div>
                  {/* Weekly Score */}
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

                {/* Card 1 — Priority Breakdown */}
                <Motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}
                  className="flex h-[178px] flex-col rounded-2xl border border-amber-100/10 bg-white/6 p-4 shadow-xl shadow-black/25 backdrop-blur"
                >
                  <div className="mb-3 flex shrink-0 items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">By Priority</p>
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
                  <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto">
                    {(() => {
                      const priorityColor = { High: "text-red-300", Medium: "text-yellow-300", Low: "text-green-300" };
                      const priorityBorder = { High: "border-red-400/20", Medium: "border-yellow-400/20", Low: "border-green-400/20" };

                      if (priorityFilter === "All") {
                        const compPct = Math.round((selectedWeek.completed / selectedWeek.totalTasks) * 100);
                        const missPct = Math.round((selectedWeek.missed / selectedWeek.totalTasks) * 100);
                        return (
                          <div className="rounded-xl border border-amber-400/15 bg-stone-950/40 p-3">
                            <p className="mb-1 text-[10px] font-bold text-amber-300">All Tasks This Week</p>
                            <div className="grid grid-cols-3 gap-1.5">
                              <div className="rounded-lg border border-stone-700/40 bg-stone-900/50 px-1.5 py-1 text-center">
                                <p className="text-[9px] text-stone-500">Total</p>
                                <p className="text-xs font-bold text-stone-200">{selectedWeek.totalTasks}</p>
                              </div>
                              <div className="rounded-lg border border-emerald-400/15 bg-emerald-500/8 px-1.5 py-1 text-center">
                                <p className="text-[9px] text-stone-500">Completed</p>
                                <p className="text-xs font-bold text-emerald-300">{selectedWeek.completed}</p>
                                <p className="text-[8px] text-stone-500">{compPct}%</p>
                              </div>
                              <div className="rounded-lg border border-rose-400/15 bg-rose-500/8 px-1.5 py-1 text-center">
                                <p className="text-[9px] text-stone-500">Missed</p>
                                <p className="text-xs font-bold text-rose-300">{selectedWeek.missed}</p>
                                <p className="text-[8px] text-stone-500">{missPct}%</p>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      const row = selectedWeek.priorityStats.find(p => p.priority === priorityFilter);
                      if (!row) return null;
                      const compPct = Math.round((row.completed / row.total) * 100);
                      const missPct = Math.round((row.missed / row.total) * 100);
                      return (
                        <div className={`rounded-xl border bg-stone-950/40 p-3 ${priorityBorder[row.priority]}`}>
                          <p className={`mb-2 text-[11px] font-bold ${priorityColor[row.priority]}`}>{row.priority} Priority Tasks</p>
                          <div className="grid grid-cols-3 gap-1.5">
                            <div className="rounded-lg border border-stone-700/40 bg-stone-900/50 px-1.5 py-1 text-center">
                              <p className="text-[9px] text-stone-500">Total</p>
                              <p className="text-xs font-bold text-stone-200">{row.total}</p>
                            </div>
                            <div className="rounded-lg border border-emerald-400/15 bg-emerald-500/8 px-1.5 py-1 text-center">
                              <p className="text-[9px] text-stone-500">Completed</p>
                              <p className="text-xs font-bold text-emerald-300">{row.completed}</p>
                              <p className="text-[8px] text-stone-500">{compPct}%</p>
                            </div>
                            <div className="rounded-lg border border-rose-400/15 bg-rose-500/8 px-1.5 py-1 text-center">
                              <p className="text-[9px] text-stone-500">Missed</p>
                              <p className="text-xs font-bold text-rose-300">{row.missed}</p>
                              <p className="text-[8px] text-stone-500">{missPct}%</p>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </Motion.div>

                {/* Card 2 — Important Categories */}
                <Motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.21 }}
                  className="flex h-[178px] flex-col rounded-2xl border border-amber-100/10 bg-white/6 p-4 shadow-xl shadow-black/25 backdrop-blur"
                >
                  <div className="mb-3 flex shrink-0 items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">Important Categories</p>
                    <div className="flex items-center gap-1 rounded-full border border-amber-100/10 bg-stone-900/60 p-0.5">
                      {["All", ...selectedWeek.importantCategories.map((c) => c.name)].map((opt) => (
                        <button key={opt} type="button" onClick={() => setKeyCategoryFilter(opt)}
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold transition-colors ${
                            keyCategoryFilter === opt ? "bg-amber-500/20 text-amber-300" : "text-stone-500 hover:text-stone-300"
                          }`}
                        >{opt}</button>
                      ))}
                    </div>
                  </div>
                  <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto">
                    <AnimatePresence mode="wait">
                      <Motion.div key={keyCategoryFilter} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }} className="space-y-2.5">
                        {(() => {
                          if (keyCategoryFilter === "All") {
                            const allTotal = selectedWeek.importantCategories.reduce((s, c) => s + c.total, 0);
                            const allComp  = selectedWeek.importantCategories.reduce((s, c) => s + c.completed, 0);
                            const allMiss  = selectedWeek.importantCategories.reduce((s, c) => s + c.missed, 0);
                            const compPct  = Math.round((allComp / allTotal) * 100);
                            const missPct  = Math.round((allMiss / allTotal) * 100);
                            return (
                              <div className="rounded-xl border border-amber-400/15 bg-stone-950/40 p-3">
                                <p className="mb-1 text-[10px] font-bold text-amber-300">All Important Categories Tasks in This Week </p>
                                <div className="grid grid-cols-3 gap-1.5">
                                  <div className="rounded-lg border border-stone-700/40 bg-stone-900/50 px-1.5 py-1 text-center">
                                    <p className="text-[9px] text-stone-500">Total</p>
                                    <p className="text-xs font-bold text-stone-200">{allTotal}</p>
                                  </div>
                                  <div className="rounded-lg border border-emerald-400/15 bg-emerald-500/8 px-1.5 py-1 text-center">
                                    <p className="text-[9px] text-stone-500">Completed</p>
                                    <p className="text-xs font-bold text-emerald-300">{allComp}</p>
                                    <p className="text-[8px] text-stone-500">{compPct}%</p>
                                  </div>
                                  <div className="rounded-lg border border-rose-400/15 bg-rose-500/8 px-1.5 py-1 text-center">
                                    <p className="text-[9px] text-stone-500">Missed</p>
                                    <p className="text-xs font-bold text-rose-300">{allMiss}</p>
                                    <p className="text-[8px] text-stone-500">{missPct}%</p>
                                  </div>
                                </div>
                              </div>
                            );
                          }
                          const cat = selectedWeek.importantCategories.find((c) => c.name === keyCategoryFilter);
                          if (!cat) return null;
                          const compPct = Math.round((cat.completed / cat.total) * 100);
                          const missPct = Math.round((cat.missed / cat.total) * 100);
                          return (
                            <div className="rounded-xl border border-amber-400/15 bg-stone-950/40 p-3">
                              <p className="mb-1 text-[10px] font-bold text-amber-300">{cat.name}</p>
                              <div className="grid grid-cols-3 gap-1.5">
                                <div className="rounded-lg border border-stone-700/40 bg-stone-900/50 px-1.5 py-1 text-center">
                                  <p className="text-[9px] text-stone-500">Total</p>
                                  <p className="text-xs font-bold text-stone-200">{cat.total}</p>
                                </div>
                                <div className="rounded-lg border border-emerald-400/15 bg-emerald-500/8 px-1.5 py-1 text-center">
                                  <p className="text-[9px] text-stone-500">Completed</p>
                                  <p className="text-xs font-bold text-emerald-300">{cat.completed}</p>
                                  <p className="text-[8px] text-stone-500">{compPct}%</p>
                                </div>
                                <div className="rounded-lg border border-rose-400/15 bg-rose-500/8 px-1.5 py-1 text-center">
                                  <p className="text-[9px] text-stone-500">Missed</p>
                                  <p className="text-xs font-bold text-rose-300">{cat.missed}</p>
                                  <p className="text-[8px] text-stone-500">{missPct}%</p>
                                </div>
                              </div>
                            </div>
                          );
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
                      const bestRate = Math.max(...validRates);
                      const worstRate = Math.min(...validRates);
                      return stats.map((d, i) => {
                        const pct = d.total > 0 ? Math.round((d.completed / d.total) * 100) : null;
                        const rate = d.total > 0 ? d.completed / d.total : -1;
                        const isBest  = rate === bestRate && rate >= 0;
                        const isWorst = rate === worstRate && rate >= 0 && bestRate !== worstRate;
                        return (
                          <div key={d.day} className="flex items-center gap-2">
                            <span className="w-7 shrink-0 text-[11px] font-semibold text-stone-400">{d.day}</span>
                            {d.total === 0 ? (
                              <span className="text-[10px] text-stone-600">— no tasks</span>
                            ) : (
                              <>
                                <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-stone-800/60">
                                  <Motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.5, ease: "easeOut", delay: i * 0.05 }}
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
                {/* Card 4 — Task Timing Report */}
                <Motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                  className="flex h-[206px] flex-col rounded-2xl border border-amber-100/10 bg-white/6 p-4 shadow-xl shadow-black/25 backdrop-blur"
                >
                  <div className="mb-3 flex shrink-0 items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">Task Timing Report</p>
                    <div className="flex items-center rounded-full border border-amber-100/10 bg-stone-900/60 p-0.5">
                      {["completed", "missed"].map((f) => (
                        <button key={f} type="button" onClick={() => setTimingFilter(f)}
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold transition-colors ${
                            timingFilter === f
                              ? f === "completed" ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"
                              : "text-stone-500 hover:text-stone-300"
                          }`}
                        >
                          {f === "completed" ? "✅ Done" : "❌ Missed"}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
                    <AnimatePresence mode="wait">
                      <Motion.div key={timingFilter} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }} className="space-y-2">
                        {(() => {
                          const data = timingFilter === "completed" ? selectedWeek.completionTiming : selectedWeek.missedTiming;
                          const isCompleted = timingFilter === "completed";
                          return data.map((slot) => {
                            const pct = slot.total > 0 ? Math.round((slot.count / slot.total) * 100) : 0;
                            const barColor = isCompleted ? "bg-emerald-400" : pct <= 15 ? "bg-emerald-400" : pct <= 30 ? "bg-amber-400" : "bg-rose-400";
                            const textColor = isCompleted ? "text-emerald-300" : pct <= 15 ? "text-emerald-300" : pct <= 30 ? "text-amber-300" : "text-rose-300";
                            return (
                              <div key={slot.range} className="flex items-center gap-2">
                                <span className="w-24 shrink-0 text-[10px] text-stone-400">{slot.range}</span>
                                <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-stone-800/60">
                                  <Motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.5, ease: "easeOut" }} className={`h-full rounded-full ${barColor}`} />
                                </div>
                                <span className={`w-16 shrink-0 text-right text-[10px] font-bold ${textColor}`}>
                                  {slot.count}<span className="font-normal text-stone-500">/{slot.total}</span>
                                  <span className="ml-1 text-stone-500">({pct}%)</span>
                                </span>
                              </div>
                            );
                          });
                        })()}
                      </Motion.div>
                    </AnimatePresence>
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
              <span className="text-3xl opacity-30">✅</span>
              <p className="text-sm font-semibold text-stone-500">Select a week to view task analysis</p>
              <p className="text-xs text-stone-600">Click <span className="text-amber-400/70">View</span> on any weekly summary →</p>
            </Motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── RIGHT: Two cards ──────────────────────────────────── */}
      <div className="grid w-full max-w-[360px] shrink-0 items-start gap-4">

        {/* Card 1 — Little Monk Analysis */}
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
            {WEEKLY_TODO_DATA.map((week) => {
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
                      <span className="text-xs font-semibold text-amber-300/80">{week.signal}</span>
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

        {/* Card 2 — Categorywise Performance */}
        <ReportCard className="flex h-[380px] flex-col overflow-hidden">
          <div className="mb-4 shrink-0 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-base">📊</span>
              <div>
                <p className="text-label-md">Categorywise Performance</p>
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
                  onClick={() => setCategoryFilter(f)}
                  className={`flex-1 rounded-full py-1 text-[11px] font-semibold transition-colors ${
                    categoryFilter === f
                      ? f === "completion"
                        ? "bg-emerald-500/20 text-emerald-300"
                        : "bg-rose-500/20 text-rose-300"
                      : "text-stone-500 hover:text-stone-300"
                  }`}
                >
                  {f === "completion" ? "Completion Rate" : "Miss Rate"}
                </button>
              ))}
            </div>
          </div>

          <div className="journal-scroll min-h-0 flex-1 overflow-y-auto pr-1">
            {selectedWeek ? (
              <AnimatePresence mode="wait">
                <Motion.div
                  key={categoryFilter}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18 }}
                  className="space-y-2.5"
                >
                  {selectedWeek.categories
                    .filter((cat) => categoryFilter === "completion" || cat.missed > 0)
                    .map((cat) => {
                      const pct = categoryFilter === "completion"
                        ? Math.round((cat.completed / cat.total) * 100)
                        : Math.round((cat.missed / cat.total) * 100);
                      const isCompletion = categoryFilter === "completion";
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
