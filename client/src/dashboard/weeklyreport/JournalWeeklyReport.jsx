import { motion as Motion, AnimatePresence } from "framer-motion";
import useJournalWeeklyData from "./useJournalWeeklyData";
import { reportDayLabel } from "../../../../shared/journalWeeklyStats.js";
import useAuth from "../../hooks/useAuth";
import littleMonkLogo from "../../assets/littlemonklogo.webp";

const formatDate = reportDayLabel;
function LoadError({ message, retry }) {
  return <div role="alert" className="rounded-xl border border-rose-400/20 bg-rose-400/5 p-3 text-sm text-rose-200">
    <p>{message}</p>
    <button type="button" onClick={retry} className="mt-2 rounded-lg border border-amber-400/30 px-3 py-1 text-xs font-semibold text-amber-300">Retry</button>
  </div>;
}

function scoreColor(score) {
  if (score == null) return { text: "text-stone-400", border: "border-stone-700", bg: "bg-white/5" };
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
      className={`rounded-[1.4rem] border border-amber-100/10 bg-white/6 p-4 shadow-xl shadow-black/25 backdrop-blur sm:rounded-2xl sm:p-5 ${className}`}
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

function AnalysisStatCard({ icon, title, mainLabel, mainValue, mainAccent = "amber", highest, lowest, unit = "", progressPercent = 0, progressLabel = "Average / 100", inverse = false }) {
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
      className="dashboard-glow-card rounded-[1.4rem] border border-amber-100/10 bg-stone-950/45 p-4 sm:rounded-2xl"
    >
      <div className="mb-3 flex items-center gap-2">
        <span className="text-base leading-none">{icon}</span>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-400">{title}</p>
      </div>

      <div className="mb-3 flex items-end justify-between gap-2 rounded-xl border border-amber-400/15 bg-amber-500/8 px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-stone-500">{mainLabel}</p>
        <p className={`text-2xl font-bold leading-none ${mainAccent === "amber" ? "text-amber-300" : mainAccent === "emerald" ? "text-emerald-300" : mainAccent === "rose" ? "text-rose-300" : "text-stone-200"}`}>
          {mainValue ?? "—"}{mainValue == null ? "" : unit}
        </p>
      </div>

      <div className="mb-3">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-500">{progressLabel}</span>
          <span className="text-[10px] font-semibold text-stone-400">{mainValue == null ? "—" : `${clampPercent(progressPercent)}%`}</span>
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
          value={highest.value == null ? "—" : `${highest.value}${unit}`}
          accent={inverse ? "rose" : "emerald"}
        />
        <StatRow
          label={`↓ Lowest — ${lowest.day}`}
          value={lowest.value == null ? "—" : `${lowest.value}${unit}`}
          accent={inverse ? "emerald" : "rose"}
        />
      </div>
    </Motion.div>
  );
}

export default function JournalWeeklyReport({ lowMotion = false }) {
  const { isDemoMode } = useAuth();
  const { summaries, loadingSummaries, summariesError, retrySummaries, selectedWeekId, setSelectedWeekId,
    weekData, loadingWeekData, weekError, retryWeek, analysis, generate } = useJournalWeeklyData(isDemoMode);
  const aiSummary = analysis.text, loadingAi = analysis.loading;
  const missedDays = weekData?.missedDays || [];
  const loadingMissedDays = loadingWeekData;
  const dayPercent = days => weekData?.loggedDays ? days / weekData.loggedDays * 100 : 0;

  return (
    <div className="weekly-journal-view flex flex-col gap-4 lg:flex-row lg:items-stretch">

      <div className="weekly-journal-quick-weeks rounded-[1.4rem] border border-amber-100/10 bg-white/6 p-3" data-demo-allow="true">
        <p className="text-label-md">Little Monk's Summary</p>
        {loadingSummaries ? (
          <p className="mt-2 text-xs text-stone-500">Loading weeks...</p>
        ) : summariesError ? (
          <LoadError message={summariesError} retry={retrySummaries} />
        ) : summaries.length === 0 ? (
          <p className="mt-2 text-xs text-stone-500">Completed weeks with journal entries appear here (last 12 weeks).</p>
        ) : (
          <div className="weekly-journal-quick-list mt-2 flex gap-2 overflow-x-auto pb-1">
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
                <span className="mt-0.5 block text-[10px] text-stone-500">{week.signal}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── LEFT: Main analysis panel ─────────────────────────── */}
      <div className="weekly-journal-main min-w-0 flex-1">
        <AnimatePresence mode="wait">
          {!selectedWeekId ? (
            <Motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex h-56 flex-col items-center justify-center gap-3 rounded-[1.4rem] border border-dashed border-amber-100/10 px-4 text-center sm:h-64 sm:rounded-2xl"
            >
              <span className="text-3xl opacity-30">📊</span>
              <p className="text-sm font-semibold text-stone-500">{loadingSummaries ? "Loading journal weeks…" : summariesError ? "Journal weeks could not be loaded" : summaries.length ? "Select a week to view detailed analysis" : "No completed journal week yet"}</p>
              <p className="text-xs text-stone-600">Click <span className="text-amber-400/70">View</span> on any weekly summary →</p>
            </Motion.div>
          ) : loadingWeekData ? (
            <Motion.div
              key="skeleton"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="weekly-journal-main-body space-y-4"
            >
              <div className="animate-pulse rounded-[1.4rem] border border-amber-100/10 bg-white/6 px-4 py-4 h-32 sm:rounded-2xl sm:px-6 sm:h-28" />
              <div className="animate-pulse rounded-[1.4rem] border border-amber-100/10 bg-white/6 p-4 h-56 sm:rounded-2xl sm:h-48" />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="animate-pulse rounded-[1.4rem] border border-amber-100/10 bg-stone-950/45 h-40 sm:rounded-2xl" />
                ))}
              </div>
            </Motion.div>
          ) : weekError ? (
            <div key="error" className="weekly-journal-main-body"><LoadError message={weekError} retry={retryWeek} /></div>
          ) : weekData ? (
            <Motion.div
              key={weekData.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22 }}
              className="weekly-journal-main-body space-y-4"
            >
              {/* Heading */}
              <div className="weekly-journal-overview dashboard-glow-card rounded-[1.4rem] border border-amber-100/10 bg-white/6 px-4 py-4 shadow-xl shadow-black/25 backdrop-blur sm:rounded-2xl sm:px-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <div>
                    <p className="text-label-md">Weekly Summary</p>
                    <p className="mt-1 text-xs font-semibold text-stone-500">{weekData.date}</p>
                  </div>
                  <div className="weekly-journal-heading-actions flex flex-col gap-2 sm:flex-row sm:items-center">
                    <span className="rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300">
                      {weekData.signal}
                    </span>
                    <button
                      type="button"
                      data-demo-allow="true"
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
                        {weekData.weeklyScore ?? "—"}
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
                      transition={{ boxShadow: { duration: lowMotion ? 0 : 2.2, repeat: lowMotion ? 0 : Infinity, ease: "easeInOut" } }}
                    >
                      <Motion.span
                        className="pointer-events-none absolute inset-y-0 left-[-40%] w-[30%] -skew-x-12 bg-white/25 blur-sm"
                        animate={{ left: ["-40%", "130%"] }}
                        transition={{ duration: lowMotion ? 0 : 1.8, repeat: lowMotion ? 0 : Infinity, repeatDelay: 1.5, ease: "easeInOut" }}
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
                className="weekly-journal-ai-analysis flex flex-col rounded-[1.4rem] border border-amber-100/10 bg-white/6 p-4 shadow-xl shadow-black/25 backdrop-blur sm:max-h-48 sm:rounded-2xl"
              >
                <div className="mb-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
                  <div className="flex items-center gap-2">
                    <Motion.img
                      src={littleMonkLogo}
                      alt="Little Monk"
                      className="h-12 w-14 object-contain"
                      animate={{ y: [0, -3, 0] }}
                      transition={{ duration: lowMotion ? 0 : 2.8, repeat: lowMotion ? 0 : Infinity, ease: "easeInOut" }}
                    />
                    <div>
                      <p className="text-label-md">Little Monk's Analysis</p>
                      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-amber-300/70">{isDemoMode ? "Sample analysis · Demo" : aiSummary ? "AI Generated · Verify insights" : "On-demand AI"}</p>
                    </div>
                  </div>
                  {!isDemoMode && (
                    <button
                      type="button"
                      disabled={loadingAi || !weekData.loggedDays}
                      onClick={generate}
                      className="shrink-0 rounded-lg border border-amber-400/20 bg-amber-500/8 px-2.5 py-1 text-[10px] font-semibold text-amber-400/70 transition hover:border-amber-400/40 hover:text-amber-300 disabled:opacity-40"
                    >
                      {loadingAi ? "Please wait…" : aiSummary ? "↻ Regenerate" : "Generate analysis"}
                    </button>
                  )}
                </div>
                <div className="journal-scroll min-h-0 flex-1 overflow-y-auto pr-1">
                  {loadingAi && !aiSummary ? (
                    <div className="space-y-2 animate-pulse" aria-label="Loading analysis">
                      <div className="h-3 rounded bg-white/10 w-full" />
                      <div className="h-3 rounded bg-white/10 w-5/6" />
                      <div className="h-3 rounded bg-white/10 w-4/6" />
                      <div className="h-3 rounded bg-white/10 w-3/4" />
                    </div>
                  ) : (
                    <p className="text-sm leading-relaxed text-stone-300">
                      {aiSummary || "Generate an optional AI analysis for this week. Opening reports does not use your AI allowance."}
                    </p>
                  )}
                  {analysis.stale && <p role="status" className="mt-2 text-xs text-amber-300">Journal data changed. Regenerate to update this saved analysis.</p>}
                  {analysis.error && <div className="mt-2"><LoadError message={analysis.error} retry={analysis.retryWith === "generate" ? generate : retryWeek} /></div>}
                  {analysis.warning && <p role="status" className="mt-2 text-xs text-amber-300">{analysis.warning}</p>}
                  {loadingAi && aiSummary && <p role="status" className="mt-2 text-xs text-stone-400">Updating analysis…</p>}
                </div>
              </Motion.div>

              {/* Stat cards grid */}
              <div className="weekly-journal-stats grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
                  progressLabel="Days with wins"
                  progressPercent={dayPercent(weekData.stats.wins.activeDays)}
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
                  inverse
                  progressLabel="Days without mistakes"
                  progressPercent={dayPercent(weekData.loggedDays - weekData.stats.mistakes.activeDays)}
                />
                <AnalysisStatCard
                  icon="🏆"
                  title="Achievements"
                  mainLabel="Total Achievements"
                  mainValue={weekData.stats.achievements.total}
                  highest={weekData.stats.achievements.highest}
                  lowest={weekData.stats.achievements.lowest}
                  unit=" achieved"
                  progressLabel="Days with achievements"
                  progressPercent={dayPercent(weekData.stats.achievements.activeDays)}
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
                        {clampPercent(weekData.consistency)}%
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/5">
                      <Motion.div
                        className="progress-sheen h-full rounded-full bg-gradient-to-r from-orange-300 via-amber-400 to-yellow-300"
                        initial={{ width: 0, opacity: 0.7 }}
                        animate={{ width: `${clampPercent(weekData.consistency)}%`, opacity: 1 }}
                        transition={{ duration: 0.75, ease: "easeOut" }}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <StatRow label="Longest run this week" value={`${weekData.longestStreak} days`} accent="amber" />
                    <StatRow label="Logged days" value={`${weekData.loggedDays} / ${weekData.expectedDays} days`} accent="emerald" />
                  </div>
                </Motion.div>
              </div>
            </Motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      {/* ── RIGHT: Summary + Missed Days ──────────────────────── */}
      <div className="weekly-journal-sidebar flex w-full flex-col gap-4 lg:w-[360px] lg:shrink-0 lg:self-stretch">
        <ReportCard className="weekly-journal-summary flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="mb-3 flex shrink-0 items-center gap-2.5">
            <Motion.img
              src={littleMonkLogo}
              alt="Little Monk"
              className="h-10 w-10 shrink-0 object-contain"
              animate={{ y: [0, -3, 0] }}
              transition={{ duration: lowMotion ? 0 : 2.8, repeat: lowMotion ? 0 : Infinity, ease: "easeInOut" }}
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
            ) : summariesError ? (
          <LoadError message={summariesError} retry={retrySummaries} />
        ) : summaries.length === 0 ? (
              <p className="pt-8 text-center text-xs text-stone-500">Completed weeks with journal entries appear here (last 12 weeks).</p>
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
                    <div className="weekly-journal-week-row flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-stone-200 truncate">Weekly Summary</p>
                        <p className="text-[11px] text-stone-500">{week.date} · {week.signal}</p>
                      </div>
                      <button
                        type="button"
                        data-demo-allow="true"
                        aria-pressed={isSelected}
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

        <ReportCard className="weekly-journal-missed flex min-h-0 flex-1 flex-col overflow-hidden">
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
              {weekData ? missedDays.length : "—"}
            </span>
          </div>

          <div className="relative min-h-0 flex-1">
          <div className="journal-scroll h-full overflow-y-auto pr-1">
            {!selectedWeekId ? (
              <p className="text-xs text-stone-500">Select a week to view missed days.</p>
            ) : weekError ? (
              <p role="status" className="text-xs text-stone-500">Missed days are unavailable until the report loads.</p>
            ) : loadingMissedDays ? (
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
                    <div className="weekly-journal-missed-row flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-xs font-semibold text-stone-200">
                        {day.label || formatDate(day.date)}
                      </p>
                      <span className="dashboard-card-status" data-tone="danger">Missed</span>
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
