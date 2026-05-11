import { useState, useEffect } from "react";
import { motion as Motion, AnimatePresence } from "framer-motion";
import api from "../../api/axios";
import useAuth from "../../hooks/useAuth";
import littleMonkLogo from "../../assets/littlemonklogo.png";

const DEMO_SUMMARIES = [
  { id: "2026-04-27", date: "Apr 27 - May 3",  signal: "6 logged days", loggedDays: 6, weeklyScore: 84, longestStreak: 5, topMood: { label: "Focused",   emoji: "😤", days: 3 } },
  { id: "2026-04-20", date: "Apr 20 - Apr 26",  signal: "5 logged days", loggedDays: 5, weeklyScore: 72, longestStreak: 4, topMood: { label: "Motivated", emoji: "🔥", days: 2 } },
  { id: "2026-04-13", date: "Apr 13 - Apr 19",  signal: "4 logged days", loggedDays: 4, weeklyScore: 60, longestStreak: 3, topMood: { label: "Calm",      emoji: "😌", days: 2 } },
];

const DEMO_WEEK_DATA = {
  "2026-04-27": {
    id: "2026-04-27", date: "Apr 27 - May 3", signal: "6 logged days",
    weeklyScore: 84, longestStreak: 5,
    topMood: { label: "Focused", emoji: "😤", days: 3 },
    stats: {
      energy:       { avg: 76, highest: { day: "Wed, Apr 29", value: 88 }, lowest: { day: "Mon, Apr 27", value: 62 } },
      rating:       { avg: 80, highest: { day: "Thu, Apr 30", value: 90 }, lowest: { day: "Sat, May 2",  value: 68 } },
      wins:         { total: 14, highest: { day: "Thu, Apr 30", value: 4 }, lowest: { day: "Mon, Apr 27", value: 1 } },
      mistakes:     { total: 5,  highest: { day: "Sat, May 2",  value: 2 }, lowest: { day: "Wed, Apr 29", value: 0 } },
      achievements: { total: 6,  highest: { day: "Thu, Apr 30", value: 2 }, lowest: { day: "Mon, Apr 27", value: 0 } },
    },
  },
  "2026-04-20": {
    id: "2026-04-20", date: "Apr 20 - Apr 26", signal: "5 logged days",
    weeklyScore: 72, longestStreak: 4,
    topMood: { label: "Motivated", emoji: "🔥", days: 2 },
    stats: {
      energy:       { avg: 70, highest: { day: "Tue, Apr 21", value: 85 }, lowest: { day: "Fri, Apr 24", value: 55 } },
      rating:       { avg: 73, highest: { day: "Tue, Apr 21", value: 84 }, lowest: { day: "Fri, Apr 24", value: 60 } },
      wins:         { total: 10, highest: { day: "Tue, Apr 21", value: 3 }, lowest: { day: "Fri, Apr 24", value: 1 } },
      mistakes:     { total: 7,  highest: { day: "Fri, Apr 24", value: 3 }, lowest: { day: "Tue, Apr 21", value: 0 } },
      achievements: { total: 4,  highest: { day: "Wed, Apr 22", value: 2 }, lowest: { day: "Mon, Apr 20", value: 0 } },
    },
  },
  "2026-04-13": {
    id: "2026-04-13", date: "Apr 13 - Apr 19", signal: "4 logged days",
    weeklyScore: 60, longestStreak: 3,
    topMood: { label: "Calm", emoji: "😌", days: 2 },
    stats: {
      energy:       { avg: 64, highest: { day: "Mon, Apr 13", value: 78 }, lowest: { day: "Thu, Apr 16", value: 50 } },
      rating:       { avg: 68, highest: { day: "Mon, Apr 13", value: 80 }, lowest: { day: "Thu, Apr 16", value: 55 } },
      wins:         { total: 8,  highest: { day: "Mon, Apr 13", value: 3 }, lowest: { day: "Thu, Apr 16", value: 1 } },
      mistakes:     { total: 6,  highest: { day: "Thu, Apr 16", value: 2 }, lowest: { day: "Mon, Apr 13", value: 1 } },
      achievements: { total: 3,  highest: { day: "Wed, Apr 15", value: 2 }, lowest: { day: "Mon, Apr 13", value: 0 } },
    },
  },
};

const DEMO_AI_SUMMARIES = {
  "2026-04-27": "Strong week overall. Focus mode dominated with 6 out of 7 days logged — a clear sign of consistent discipline. Thursday was the standout day with the highest rating and most achievements. The one missed day (Sunday) coincides with the lowest energy readings mid-week, suggesting rest was needed. Next week: protect the Thursday momentum and aim for 7/7.",
  "2026-04-20": "A solid but uneven week. Tuesday peaked with high energy and wins, but Friday dragged — too many mistakes and low energy. The pattern suggests late-week fatigue. Consider shifting harder tasks to Mon–Wed and using Thu–Fri for reviews and lighter work.",
  "2026-04-13": "Decent week with room to grow. Consistency improved to 4 days but streak broke mid-week. Monday was the best day, Thursday the weakest. The calm mood dominating this week may reflect steady work, but low achievements suggest effort wasn't translating into results. Add one specific goal to complete each day.",
};

const DEMO_MISSED_DAYS = {
  "2026-04-27": [
    { date: "2026-05-03", label: "Sun, May 3", note: "No journal submitted", reason: "Rest day — intentional break after a full week" },
  ],
  "2026-04-20": [
    { date: "2026-04-22", label: "Wed, Apr 22", note: "No journal submitted", reason: null },
    { date: "2026-04-25", label: "Sat, Apr 25", note: "No journal submitted", reason: "Weekend trip, forgot to log" },
  ],
  "2026-04-13": [
    { date: "2026-04-14", label: "Tue, Apr 14", note: "No journal submitted", reason: null },
    { date: "2026-04-17", label: "Fri, Apr 17", note: "No journal submitted", reason: null },
    { date: "2026-04-19", label: "Sun, Apr 19", note: "No journal submitted", reason: "Sick day" },
  ],
};

const formatDate = (date) =>
  new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
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
  const { isDemoMode } = useAuth();
  const [summaries, setSummaries] = useState([]);
  const [loadingSummaries, setLoadingSummaries] = useState(true);

  const [selectedWeekId, setSelectedWeekId] = useState(null);
  const [weekData, setWeekData] = useState(null);
  const [loadingWeekData, setLoadingWeekData] = useState(false);

  const [aiSummary, setAiSummary] = useState(null);
  const [loadingAi, setLoadingAi] = useState(false);

  const [missedDays, setMissedDays] = useState([]);
  const [loadingMissedDays, setLoadingMissedDays] = useState(true);


  // On mount: fetch summaries list
  useEffect(() => {
    if (isDemoMode) {
      setSummaries(DEMO_SUMMARIES);
      setSelectedWeekId(DEMO_SUMMARIES[0].id);
      setLoadingSummaries(false);
      return;
    }
    api.get("/weekly-report/journal/summaries")
      .then((res) => {
        setSummaries(res.data);
        if (res.data.length > 0) setSelectedWeekId(res.data[0].id);
      })
      .catch((err) => console.error("Journal weekly report init error:", err))
      .finally(() => setLoadingSummaries(false));
  }, [isDemoMode]);

  // When selected week changes: fetch detailed stats, AI summary, and missed days for that week
  useEffect(() => {
    setWeekData(null);
    setAiSummary(null);
    setMissedDays([]);

    if (!selectedWeekId) {
      setLoadingWeekData(false);
      setLoadingAi(false);
      setLoadingMissedDays(false);
      return;
    }

    if (isDemoMode) {
      setWeekData(DEMO_WEEK_DATA[selectedWeekId] || null);
      setAiSummary(DEMO_AI_SUMMARIES[selectedWeekId] || null);
      setMissedDays(DEMO_MISSED_DAYS[selectedWeekId] || []);
      setLoadingWeekData(false);
      setLoadingAi(false);
      setLoadingMissedDays(false);
      return;
    }

    setLoadingWeekData(true);
    setLoadingAi(true);
    setLoadingMissedDays(true);

    api
      .get(`/weekly-report/journal?week=${selectedWeekId}`)
      .then((res) => setWeekData(res.data))
      .catch((err) => console.error("Failed to load week data:", err))
      .finally(() => setLoadingWeekData(false));

    api
      .get(`/weekly-report/journal/ai-summary?week=${selectedWeekId}`)
      .then((res) => setAiSummary(res.data.aiSummary ?? null))
      .catch((err) => console.error("Failed to load AI summary:", err))
      .finally(() => setLoadingAi(false));

    api
      .get(`/weekly-report/journal/missed-days?week=${selectedWeekId}`)
      .then((res) => setMissedDays(Array.isArray(res.data) ? res.data : []))
      .catch((err) => console.error("Failed to load missed days:", err))
      .finally(() => setLoadingMissedDays(false));
  }, [selectedWeekId, isDemoMode]);

  const handleRegenerate = async () => {
    if (!selectedWeekId || isDemoMode) return;
    setLoadingAi(true);
    setAiSummary(null);
    try {
      const res = await api.get(`/weekly-report/journal/ai-summary?week=${selectedWeekId}&regenerate=true`);
      setAiSummary(res.data.aiSummary ?? null);
    } catch (err) {
      console.error("Failed to regenerate AI summary:", err);
    } finally {
      setLoadingAi(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-stretch">

      {/* ── LEFT: Main analysis panel ─────────────────────────── */}
      <div className="min-w-0 flex-1">
        <AnimatePresence mode="wait">
          {!selectedWeekId ? (
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
          ) : loadingWeekData ? (
            <Motion.div
              key="skeleton"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <div className="animate-pulse rounded-2xl border border-amber-100/10 bg-white/6 px-6 py-4 h-28" />
              <div className="animate-pulse rounded-2xl border border-amber-100/10 bg-white/6 p-4 h-48" />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="animate-pulse rounded-2xl border border-amber-100/10 bg-stone-950/45 h-40" />
                ))}
              </div>
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
              {/* Heading */}
              <div className="dashboard-glow-card rounded-2xl border border-amber-100/10 bg-white/6 px-6 py-4 shadow-xl shadow-black/25 backdrop-blur">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-label-md">Weekly Summary</p>
                    <p className="mt-1 text-xs font-semibold text-stone-500">{weekData.date}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300">
                      {weekData.signal}
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
                  {weekData.topMood ? (
                    <div className="flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1">
                      <span className="text-base leading-none">{weekData.topMood.emoji}</span>
                      <span className="text-xs font-bold text-amber-200">{weekData.topMood.label}</span>
                      <span className="text-[10px] text-stone-500">· {weekData.topMood.days} days</span>
                    </div>
                  ) : (
                    <span className="text-xs text-stone-500">—</span>
                  )}
                  <div className="flex items-center gap-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">Weekly Score</p>
                    <div className={`flex items-center gap-1.5 rounded-full border px-3 py-1 ${scoreColor(weekData.weeklyScore).border} ${scoreColor(weekData.weeklyScore).bg}`}>
                      <span className={`text-xs font-bold ${scoreColor(weekData.weeklyScore).text}`}>
                        {weekData.weeklyScore}
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
                      transition={{ boxShadow: { duration: 2.2, repeat: Infinity, ease: "easeInOut" } }}
                    >
                      <Motion.span
                        className="pointer-events-none absolute inset-y-0 left-[-40%] w-[30%] -skew-x-12 bg-white/25 blur-sm"
                        animate={{ left: ["-40%", "130%"] }}
                        transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 1.5, ease: "easeInOut" }}
                      />
                      <span className="text-base leading-none">🔥</span>
                      <span className="relative z-10 text-xs font-bold text-orange-300">
                        {weekData.longestStreak}
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
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
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
                  {!isDemoMode && (
                    <button
                      type="button"
                      disabled={loadingAi}
                      onClick={handleRegenerate}
                      className="shrink-0 rounded-lg border border-amber-400/20 bg-amber-500/8 px-2.5 py-1 text-[10px] font-semibold text-amber-400/70 transition hover:border-amber-400/40 hover:text-amber-300 disabled:opacity-40"
                    >
                      {loadingAi ? "Generating…" : "↻ Regenerate"}
                    </button>
                  )}
                </div>
                <div className="journal-scroll min-h-0 flex-1 overflow-y-auto pr-1">
                  {loadingAi ? (
                    <div className="space-y-2 animate-pulse">
                      <div className="h-3 rounded bg-white/10 w-full" />
                      <div className="h-3 rounded bg-white/10 w-5/6" />
                      <div className="h-3 rounded bg-white/10 w-4/6" />
                      <div className="h-3 rounded bg-white/10 w-3/4" />
                    </div>
                  ) : (
                    <p className="text-sm leading-relaxed text-stone-300">
                      {aiSummary || "No analysis available for this week."}
                    </p>
                  )}
                </div>
              </Motion.div>

              {/* Stat cards grid */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <AnalysisStatCard
                  icon="⚡"
                  title="Energy"
                  mainLabel="Avg Energy"
                  mainValue={weekData.stats.energy.avg}
                  highest={weekData.stats.energy.highest}
                  lowest={weekData.stats.energy.lowest}
                  progressPercent={weekData.stats.energy.avg}
                />
                <AnalysisStatCard
                  icon="⭐"
                  title="Day Rating"
                  mainLabel="Avg Day Rating"
                  mainValue={weekData.stats.rating.avg}
                  highest={weekData.stats.rating.highest}
                  lowest={weekData.stats.rating.lowest}
                  progressPercent={weekData.stats.rating.avg}
                />
                <AnalysisStatCard
                  icon="✅"
                  title="Wins"
                  mainLabel="Total Wins"
                  mainValue={weekData.stats.wins.total}
                  mainAccent="emerald"
                  highest={weekData.stats.wins.highest}
                  lowest={weekData.stats.wins.lowest}
                  unit=" wins"
                  progressPercent={weekData.stats.wins.total * 5}
                />
                <AnalysisStatCard
                  icon="×"
                  title="Mistakes"
                  mainLabel="Total Mistakes"
                  mainValue={weekData.stats.mistakes.total}
                  mainAccent="rose"
                  highest={weekData.stats.mistakes.highest}
                  lowest={weekData.stats.mistakes.lowest}
                  unit=" mistakes"
                  progressPercent={100 - weekData.stats.mistakes.total * 8}
                />
                <AnalysisStatCard
                  icon="🏆"
                  title="Achievements"
                  mainLabel="Total Achievements"
                  mainValue={weekData.stats.achievements.total}
                  highest={weekData.stats.achievements.highest}
                  lowest={weekData.stats.achievements.lowest}
                  unit=" achieved"
                  progressPercent={weekData.stats.achievements.total * 6}
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
                      {weekData.longestStreak}
                      <span className="ml-1 text-sm text-stone-400">days</span>
                    </p>
                  </div>

                  <div className="mb-3">
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-500">Weekly Consistency</span>
                      <span className="text-[10px] font-semibold text-stone-400">
                        {clampPercent((weekData.longestStreak / 7) * 100)}%
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/5">
                      <Motion.div
                        className="progress-sheen h-full rounded-full bg-gradient-to-r from-orange-300 via-amber-400 to-yellow-300"
                        initial={{ width: 0, opacity: 0.7 }}
                        animate={{ width: `${clampPercent((weekData.longestStreak / 7) * 100)}%`, opacity: 1 }}
                        transition={{ duration: 0.75, ease: "easeOut" }}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <StatRow label="Current Best Run" value={`${weekData.longestStreak} days`} accent="amber" />
                    <StatRow label="Weekly Target" value="7 days" accent="emerald" />
                  </div>
                </Motion.div>
              </div>
            </Motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      {/* ── RIGHT: Summary + Missed Days ──────────────────────── */}
      <div className="flex w-full flex-col gap-4 lg:w-[360px] lg:shrink-0 lg:self-stretch">
        <ReportCard className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="mb-3 flex shrink-0 items-center gap-2.5">
            <Motion.img
              src={littleMonkLogo}
              alt="Little Monk"
              className="h-10 w-10 shrink-0 object-contain"
              animate={{ y: [0, -3, 0] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
            />
            <div>
              <h3 className="text-label-md leading-tight">Little Monk's Summary</h3>
              <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-amber-300/70">
                AI Assistant
              </p>
            </div>
          </div>

          <div className="relative min-h-0 flex-1">
          <div className="journal-scroll h-full space-y-2 overflow-y-auto pr-1">
            {loadingSummaries ? (
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="animate-pulse rounded-xl border border-amber-100/10 bg-stone-950/45 h-14" />
                ))}
              </div>
            ) : summaries.length === 0 ? (
              <p className="pt-8 text-center text-xs text-stone-500">No weekly summaries yet.</p>
            ) : (
              summaries.map((week) => {
                const isSelected = selectedWeekId === week.id;
                return (
                  <Motion.div
                    key={week.id}
                    layout
                    className={`rounded-xl border px-3 py-2.5 transition-colors ${
                      isSelected
                        ? "border-amber-400/30 bg-amber-500/8"
                        : "border-amber-100/10 bg-stone-950/45 hover:border-amber-400/20"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-stone-200 truncate">Weekly Summary</p>
                        <p className="text-[11px] text-stone-500">{week.date} · {week.signal}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedWeekId(isSelected ? null : week.id)}
                        className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
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
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-6 rounded-b-xl bg-gradient-to-t from-[#1a1008] to-transparent" />
          </div>
        </ReportCard>

        <ReportCard className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="mb-3 flex shrink-0 items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-base">📅</span>
              <div>
                <p className="text-label-md leading-tight">Missed Days</p>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-500">
                  Selected week
                </p>
              </div>
            </div>
            <span className="rounded-full border border-rose-400/20 bg-rose-400/10 px-3 py-1 text-sm font-bold text-rose-300">
              {missedDays.length}
            </span>
          </div>

          <div className="relative min-h-0 flex-1">
          <div className="journal-scroll h-full overflow-y-auto pr-1">
            {loadingMissedDays ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse rounded-xl border border-amber-100/10 bg-stone-950/45 h-16" />
                ))}
              </div>
            ) : missedDays.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                <span className="text-2xl">✅</span>
                <p className="text-xs font-semibold text-stone-500">No missed days this week!</p>
              </div>
            ) : (
              <div className="space-y-1">
                {missedDays.map((day) => (
                  <div
                    key={day.date}
                    className="rounded-lg border border-amber-100/10 bg-stone-950/45 px-3 py-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-stone-200">
                        {day.label || formatDate(day.date)}
                      </p>
                      <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-rose-300">Missed</span>
                    </div>
                    {day.reason ? (
                      <p className="text-[10px] leading-snug text-stone-400 italic">&ldquo;{day.reason}&rdquo;</p>
                    ) : (
                      <p className="text-[10px] text-stone-600">No reason added</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-6 rounded-b-xl bg-gradient-to-t from-[#1a1008] to-transparent" />
          </div>
        </ReportCard>
      </div>

    </div>
  );
}
