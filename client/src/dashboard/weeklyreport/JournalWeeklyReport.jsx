import { useState } from "react";
import { motion as Motion, AnimatePresence } from "framer-motion";
import littleMonkLogo from "../../assets/littlemonklogo.png";

const MISSED_JOURNAL_DAYS = [
  { date: "2026-04-16", note: "No journal submitted" },
  { date: "2026-04-17", note: "Night reflection skipped" },
  { date: "2026-04-18", note: "Weekend entry still pending" },
  { date: "2026-04-19", note: "Sunday weekly close not submitted" },
];

const formatDate = (date) =>
  new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

const WEEKLY_AI_SUMMARIES = [
  {
    id: "2026-04-13",
    date: "Apr 13 - Apr 19",
    status: "Ready",
    summary: "Weekly Summary",
    signal: "5 logged days",
    detail: "Strong week when the morning started early. Best pattern: phone away, inbox closed, and one clear deep-work block before distractions.",
    topMood: { emoji: "😤", label: "Focused", days: 3 },
    weeklyScore: 73,
    longestStreak: 3,
    aiSummary: "Your strongest days this week shared one clear pattern: an early wake-up before 6 AM, a protected first work block, and no phone in the first hour. Wednesday stood out as the model day — high energy, high rating, and the most wins logged. The two missed days broke the streak, but the recovery is simple: a short 2-minute note is enough to keep the pattern visible. Your average sleep window is slightly late — pushing sleep to 22:30 would add roughly 25 minutes of recovery and likely raise your lowest-scoring days. Focus for next week: protect the first hour, close the day with one written reflection, and keep the sleep window tight.",
    stats: {
      energy:       { avg: 72, highest: { day: "Wed, Apr 15", value: 95 }, lowest: { day: "Sun, Apr 12", value: 38 } },
      rating:       { avg: 76, highest: { day: "Wed, Apr 15", value: 91 }, lowest: { day: "Sun, Apr 12", value: 45 } },
      wins:         { total: 14, highest: { day: "Wed, Apr 15", value: 3 }, lowest: { day: "Sun, Apr 12", value: 1 } },
      mistakes:     { total: 10, highest: { day: "Mon, Apr 13", value: 2 }, lowest: { day: "Fri, Apr 17", value: 1 } },
      achievements: { total: 10, highest: { day: "Wed, Apr 15", value: 3 }, lowest: { day: "Sun, Apr 12", value: 1 } },
      sleep:        { avgWakeUp: "06:00", avgSleepTime: "22:55", avgDuration: "7h 05m" },
    },
  },
  {
    id: "2026-04-06",
    date: "Apr 6 - Apr 12",
    status: "Ready",
    summary: "Weekly Summary",
    signal: "4 logged days",
    detail: "Consistency improved, but missed reflections made the pattern harder to read. Keep the evening journal short when energy is low.",
    topMood: { emoji: "😌", label: "Calm", days: 2 },
    weeklyScore: 63,
    longestStreak: 2,
    aiSummary: "This week had 4 logged days which is an improvement, but 3 missing entries made it harder to spot the full pattern. The data that exists shows Thursday as your best day — energy spiked to 88 and the rating followed. Monday was the weakest, likely due to a late Sunday night and no wind-down routine. The biggest lever here is the evening journal: even a 2-sentence entry on the difficult days would have made the pattern readable. For next week, commit to one sentence at bedtime on low-energy days — quantity matters less than consistency.",
    stats: {
      energy:       { avg: 65, highest: { day: "Thu, Apr 10", value: 88 }, lowest: { day: "Mon, Apr 7",  value: 42 } },
      rating:       { avg: 70, highest: { day: "Thu, Apr 10", value: 85 }, lowest: { day: "Mon, Apr 7",  value: 50 } },
      wins:         { total: 11, highest: { day: "Thu, Apr 10", value: 3 }, lowest: { day: "Mon, Apr 7",  value: 1 } },
      mistakes:     { total: 8,  highest: { day: "Tue, Apr 8",  value: 3 }, lowest: { day: "Thu, Apr 10", value: 1 } },
      achievements: { total: 8,  highest: { day: "Thu, Apr 10", value: 3 }, lowest: { day: "Mon, Apr 7",  value: 1 } },
      sleep:        { avgWakeUp: "06:45", avgSleepTime: "23:20", avgDuration: "6h 35m" },
    },
  },
  {
    id: "2026-03-30",
    date: "Mar 30 - Apr 5",
    status: "Ready",
    summary: "Weekly Summary",
    signal: "6 logged days",
    detail: "Most stable journal week. Your best entries included a win, mistake, lesson, and next-day plan.",
    topMood: { emoji: "🔥", label: "Motivated", days: 4 },
    weeklyScore: 83,
    longestStreak: 5,
    aiSummary: "This was your most consistent week — 6 logged days, high average energy, and the most achievements recorded in any single week. Wednesday April 2nd was an outlier in the best way: near-perfect energy, 4 wins, and 4 achievements. The structure you used — early start, single focus task, and a written close — is the template worth repeating. The one improvement area is Monday: it was your lowest-rated day despite being the start of the week. A Sunday evening planning session would help set Monday up with clarity before the week begins.",
    stats: {
      energy:       { avg: 80, highest: { day: "Wed, Apr 2",  value: 97 }, lowest: { day: "Mon, Mar 30", value: 55 } },
      rating:       { avg: 82, highest: { day: "Wed, Apr 2",  value: 94 }, lowest: { day: "Mon, Mar 30", value: 62 } },
      wins:         { total: 17, highest: { day: "Wed, Apr 2", value: 4 }, lowest: { day: "Mon, Mar 30", value: 1 } },
      mistakes:     { total: 9,  highest: { day: "Tue, Apr 1", value: 2 }, lowest: { day: "Sat, Apr 5",  value: 1 } },
      achievements: { total: 13, highest: { day: "Wed, Apr 2", value: 4 }, lowest: { day: "Mon, Mar 30", value: 1 } },
      sleep:        { avgWakeUp: "05:50", avgSleepTime: "22:40", avgDuration: "7h 10m" },
    },
  },
  {
    id: "2026-03-23",
    date: "Mar 23 - Mar 29",
    status: "Draft",
    summary: "Weekly Summary",
    signal: "3 logged days",
    detail: "Not enough entries for a full read, but the available notes show sleep and distractions were the biggest levers.",
    topMood: { emoji: "😰", label: "Anxious", days: 2 },
    weeklyScore: 53,
    longestStreak: 2,
    aiSummary: "Only 3 entries this week, which limits the analysis. From what was logged, the pattern is clear: late sleep times pushed wake-up later, and later mornings correlated with lower energy and lower ratings. Wednesday was the one bright spot — moderate energy and the highest rating of the week. The missing days are the real cost here: without the full picture, it is impossible to know what drove the low-scoring days. The single highest-impact change for this week type is a hard sleep deadline — setting a 23:00 cutoff would likely raise the floor on your lowest days significantly.",
    stats: {
      energy:       { avg: 58, highest: { day: "Wed, Mar 25", value: 75 }, lowest: { day: "Mon, Mar 23", value: 40 } },
      rating:       { avg: 62, highest: { day: "Wed, Mar 25", value: 78 }, lowest: { day: "Mon, Mar 23", value: 44 } },
      wins:         { total: 8,  highest: { day: "Wed, Mar 25", value: 3 }, lowest: { day: "Mon, Mar 23", value: 1 } },
      mistakes:     { total: 7,  highest: { day: "Mon, Mar 23", value: 3 }, lowest: { day: "Fri, Mar 27", value: 1 } },
      achievements: { total: 5,  highest: { day: "Wed, Mar 25", value: 2 }, lowest: { day: "Mon, Mar 23", value: 1 } },
      sleep:        { avgWakeUp: "07:20", avgSleepTime: "23:50", avgDuration: "6h 10m" },
    },
  },
];

const THIS_WEEK_START = new Date(`${WEEKLY_AI_SUMMARIES[0].id}T00:00:00`);
const THIS_WEEK_END = new Date(THIS_WEEK_START);
THIS_WEEK_END.setDate(THIS_WEEK_START.getDate() + 6);
THIS_WEEK_END.setHours(23, 59, 59, 999);

const THIS_WEEK_MISSED_DAYS = MISSED_JOURNAL_DAYS.filter((day) => {
  const d = new Date(`${day.date}T00:00:00`);
  return d >= THIS_WEEK_START && d <= THIS_WEEK_END;
});

function scoreColor(score) {
  if (score >= 75) return { text: "text-emerald-300", border: "border-emerald-400/20", bg: "bg-emerald-500/10" };
  if (score >= 55) return { text: "text-amber-300",   border: "border-amber-400/20",   bg: "bg-amber-500/10"   };
  return                   { text: "text-rose-300",   border: "border-rose-400/20",     bg: "bg-rose-500/10"    };
}

function clampPercent(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
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

function StatRow({ label, value, accent = "stone" }) {
  const colorMap = {
    amber:   "text-amber-300",
    emerald: "text-emerald-300",
    rose:    "text-rose-300",
    stone:   "text-stone-300",
  };
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-stone-500">{label}</span>
      <span className={`text-xs font-semibold ${colorMap[accent]}`}>{value}</span>
    </div>
  );
}

function AnalysisStatCard({ icon, title, mainLabel, mainValue, mainAccent = "amber", highest, lowest, unit = "", progressPercent = 0 }) {
  const progressColor =
    mainAccent === "emerald"
      ? "from-emerald-300 via-emerald-400 to-teal-400"
      : mainAccent === "rose"
        ? "from-rose-300 via-rose-400 to-orange-400"
        : "from-amber-300 via-amber-400 to-orange-400";

  return (
    <Motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      className="dashboard-glow-card rounded-2xl border border-amber-100/10 bg-stone-950/45 p-4"
    >
      <div className="mb-3 flex items-center gap-2">
        <span className="text-base leading-none">{icon}</span>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-400">{title}</p>
      </div>

      <div className="mb-3 flex items-end justify-between gap-2 rounded-xl border border-amber-400/15 bg-amber-500/8 px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-stone-500">{mainLabel}</p>
        <p className={`text-2xl font-bold leading-none ${mainAccent === "amber" ? "text-amber-300" : mainAccent === "emerald" ? "text-emerald-300" : mainAccent === "rose" ? "text-rose-300" : "text-stone-200"}`}>
          {mainValue}{unit}
        </p>
      </div>

      <div className="mb-3">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-500">Momentum</span>
          <span className="text-[10px] font-semibold text-stone-400">{clampPercent(progressPercent)}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/5">
          <Motion.div
            className={`progress-sheen h-full rounded-full bg-gradient-to-r ${progressColor}`}
            initial={{ width: 0, opacity: 0.7 }}
            animate={{ width: `${clampPercent(progressPercent)}%`, opacity: 1 }}
            transition={{ duration: 0.75, ease: "easeOut" }}
          />
        </div>
      </div>

      <div className="space-y-2">
        <StatRow
          label={`↑ Highest — ${highest.day}`}
          value={`${highest.value}${unit}`}
          accent="emerald"
        />
        <StatRow
          label={`↓ Lowest — ${lowest.day}`}
          value={`${lowest.value}${unit}`}
          accent="rose"
        />
      </div>
    </Motion.div>
  );
}

export default function JournalWeeklyReport() {
  const [selectedWeekId, setSelectedWeekId] = useState(WEEKLY_AI_SUMMARIES[0].id);
  const [expandedMissedDay, setExpandedMissedDay] = useState(null);
  const [reasons, setReasons] = useState({
    "2026-04-16": "Was too exhausted after the late client call. Planned to write but fell asleep.",
    "2026-04-17": "Skipped intentionally — needed a full mental reset after a tough week.",
  });
  const [inputValues, setInputValues] = useState({});

  const selectedWeek = WEEKLY_AI_SUMMARIES.find((w) => w.id === selectedWeekId) ?? null;

  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-start">

      {/* ── LEFT: Main analysis panel ─────────────────────────── */}
      <div className="journal-scroll min-w-0 flex-1 overflow-y-auto lg:max-h-[calc(100vh-180px)]">
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
              <div className="dashboard-glow-card rounded-2xl border border-amber-100/10 bg-white/6 px-6 py-4 shadow-xl shadow-black/25 backdrop-blur">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-label-md">Weekly Summary</p>
                    <p className="mt-1 text-xs font-semibold text-stone-500">{selectedWeek.date}</p>
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
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">Top Repeated Mood</p>
                  <div className="flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1">
                    <span className="text-base leading-none">{selectedWeek.topMood.emoji}</span>
                    <span className="text-xs font-bold text-amber-200">{selectedWeek.topMood.label}</span>
                    <span className="text-[10px] text-stone-500">· {selectedWeek.topMood.days} days</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">Weekly Score</p>
                    <div className={`flex items-center gap-1.5 rounded-full border px-3 py-1 ${scoreColor(selectedWeek.weeklyScore).border} ${scoreColor(selectedWeek.weeklyScore).bg}`}>
                      <span className={`text-xs font-bold ${scoreColor(selectedWeek.weeklyScore).text}`}>
                        {selectedWeek.weeklyScore}
                        <span className="text-[10px] font-semibold text-stone-500"> / 100</span>
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">Longest Streak</p>
                    <Motion.div
                      className="relative flex items-center gap-1.5 overflow-hidden rounded-full border border-orange-400/25 bg-orange-500/10 px-3 py-1"
                      animate={{
                        boxShadow: [
                          "0 0 0px rgba(251,146,60,0)",
                          "0 0 10px rgba(251,146,60,0.38)",
                          "0 0 0px rgba(251,146,60,0)",
                        ],
                      }}
                      transition={{
                        boxShadow: { duration: 2.2, repeat: Infinity, ease: "easeInOut" },
                      }}
                    >
                      <Motion.span
                        className="pointer-events-none absolute inset-y-0 left-[-40%] w-[30%] -skew-x-12 bg-white/25 blur-sm"
                        animate={{ left: ["-40%", "130%"] }}
                        transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 1.5, ease: "easeInOut" }}
                      />
                      <span className="text-base leading-none">🔥</span>
                      <span className="relative z-10 text-xs font-bold text-orange-300">
                        {selectedWeek.longestStreak}
                        <span className="text-[10px] font-semibold text-stone-500"> days</span>
                      </span>
                    </Motion.div>
                  </div>
                </div>
              </div>

              {/* AI Summary */}
              <Motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="flex max-h-48 flex-col rounded-2xl border border-amber-100/10 bg-white/6 p-4 shadow-xl shadow-black/25 backdrop-blur"
              >
                <div className="mb-2 flex items-center gap-2">
                  <Motion.img
                    src={littleMonkLogo}
                    alt="Little Monk"
                    className="h-12 w-14 object-contain"
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

              {/* Stat cards grid */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <AnalysisStatCard
                  icon="⚡"
                  title="Energy"
                  mainLabel="Avg Energy"
                  mainValue={selectedWeek.stats.energy.avg}
                  highest={selectedWeek.stats.energy.highest}
                  lowest={selectedWeek.stats.energy.lowest}
                  progressPercent={selectedWeek.stats.energy.avg}
                />
                <AnalysisStatCard
                  icon="⭐"
                  title="Day Rating"
                  mainLabel="Avg Day Rating"
                  mainValue={selectedWeek.stats.rating.avg}
                  highest={selectedWeek.stats.rating.highest}
                  lowest={selectedWeek.stats.rating.lowest}
                  progressPercent={selectedWeek.stats.rating.avg}
                />
                <AnalysisStatCard
                  icon="✅"
                  title="Wins"
                  mainLabel="Total Wins"
                  mainValue={selectedWeek.stats.wins.total}
                  mainAccent="emerald"
                  highest={selectedWeek.stats.wins.highest}
                  lowest={selectedWeek.stats.wins.lowest}
                  unit=" wins"
                  progressPercent={selectedWeek.stats.wins.total * 5}
                />
                <AnalysisStatCard
                  icon="×"
                  title="Mistakes"
                  mainLabel="Total Mistakes"
                  mainValue={selectedWeek.stats.mistakes.total}
                  mainAccent="rose"
                  highest={selectedWeek.stats.mistakes.highest}
                  lowest={selectedWeek.stats.mistakes.lowest}
                  unit=" mistakes"
                  progressPercent={100 - selectedWeek.stats.mistakes.total * 8}
                />
                <AnalysisStatCard
                  icon="🏆"
                  title="Achievements"
                  mainLabel="Total Achievements"
                  mainValue={selectedWeek.stats.achievements.total}
                  highest={selectedWeek.stats.achievements.highest}
                  lowest={selectedWeek.stats.achievements.lowest}
                  unit=" achieved"
                  progressPercent={selectedWeek.stats.achievements.total * 6}
                />
                <Motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -4 }}
                  className="dashboard-glow-card rounded-2xl border border-amber-100/10 bg-stone-950/45 p-4"
                >
                  <div className="mb-3 flex items-center gap-2">
                    <span className="text-base leading-none">🔥</span>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-400">Longest Streak</p>
                  </div>

                  <div className="mb-3 flex items-end justify-between gap-2 rounded-xl border border-orange-400/15 bg-orange-500/8 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-stone-500">Journal Streak</p>
                    <p className="text-2xl font-bold leading-none text-orange-300">
                      {selectedWeek.longestStreak}
                      <span className="ml-1 text-sm text-stone-400">days</span>
                    </p>
                  </div>

                  <div className="mb-3">
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-500">Weekly Consistency</span>
                      <span className="text-[10px] font-semibold text-stone-400">
                        {clampPercent((selectedWeek.longestStreak / 7) * 100)}%
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/5">
                      <Motion.div
                        className="progress-sheen h-full rounded-full bg-gradient-to-r from-orange-300 via-amber-400 to-yellow-300"
                        initial={{ width: 0, opacity: 0.7 }}
                        animate={{ width: `${clampPercent((selectedWeek.longestStreak / 7) * 100)}%`, opacity: 1 }}
                        transition={{ duration: 0.75, ease: "easeOut" }}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <StatRow label="Current Best Run" value={`${selectedWeek.longestStreak} days`} accent="amber" />
                    <StatRow label="Weekly Target" value="7 days" accent="emerald" />
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
              <span className="text-3xl opacity-30">📊</span>
              <p className="text-sm font-semibold text-stone-500">Select a week to view detailed analysis</p>
              <p className="text-xs text-stone-600">Click <span className="text-amber-400/70">View</span> on any weekly summary →</p>
            </Motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── RIGHT: Summary + Missed Days ──────────────────────── */}
      <div className="grid w-full items-start gap-4 lg:w-[360px] lg:shrink-0">
        <ReportCard className="flex h-[46vh] flex-col overflow-hidden">
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
              <h3 className="text-label-md">Little Monk's Summary</h3>
              <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.14em] text-amber-300/70">
                AI Assistant
              </p>
            </div>
          </div>

          <div className="journal-scroll min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
            {WEEKLY_AI_SUMMARIES.map((week) => {
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
                      <p className="text-sm font-semibold text-stone-200">{week.summary}</p>
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

        <ReportCard className="flex h-[36vh] flex-col overflow-hidden">
          <div className="mb-4 flex shrink-0 items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-base">📅</span>
              <div>
                <p className="text-label-md">Missed Days</p>
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-500">
                  Submit Journal
                </p>
              </div>
            </div>
            <span className="rounded-full border border-rose-400/20 bg-rose-400/10 px-3 py-1 text-sm font-bold text-rose-300">
              {THIS_WEEK_MISSED_DAYS.length}
            </span>
          </div>

          <div className="journal-scroll min-h-0 flex-1 overflow-y-auto pr-1">
            <div className="space-y-3">
              {THIS_WEEK_MISSED_DAYS.map((day) => {
                const isExpanded = expandedMissedDay === day.date;
                return (
                  <div
                    key={day.date}
                    className="rounded-xl border border-amber-100/10 bg-stone-950/45 p-4 transition-colors hover:border-rose-300/20"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-semibold text-stone-200">{formatDate(day.date)}</p>
                      <div className="flex flex-col items-end gap-1.5">
                        <span className="text-xs font-bold uppercase tracking-[0.1em] text-rose-300">Missed</span>
                        <button
                          type="button"
                          onClick={() => setExpandedMissedDay(isExpanded ? null : day.date)}
                          className="text-xs font-semibold text-amber-400/80 transition-colors hover:text-amber-300"
                        >
                          {isExpanded ? "Hide reason" : "Add reason"}
                        </button>
                      </div>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-stone-500">
                      {reasons[day.date] || day.note}
                    </p>
                    {isExpanded && (
                      <Motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-3 space-y-2"
                      >
                        <textarea
                          value={inputValues[day.date] || ""}
                          onChange={(e) => setInputValues((prev) => ({ ...prev, [day.date]: e.target.value }))}
                          placeholder="Add reason for missing this entry..."
                          className="w-full rounded-lg border border-amber-100/10 bg-black/20 px-3 py-2 text-xs text-stone-300 placeholder-stone-600 outline-none transition-colors focus:border-amber-400/30"
                          rows="2"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (inputValues[day.date]?.trim()) {
                              setReasons((prev) => ({ ...prev, [day.date]: inputValues[day.date].trim() }));
                              setExpandedMissedDay(null);
                            }
                          }}
                          className="rounded-lg border border-amber-400/25 bg-amber-400/10 px-3 py-1.5 text-xs font-semibold text-amber-300 transition-colors hover:bg-amber-400/20"
                        >
                          Add
                        </button>
                      </Motion.div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </ReportCard>
      </div>

    </div>
  );
}
