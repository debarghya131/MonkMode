import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion as Motion } from "framer-motion";
import littleMonkLogo from "../../assets/littlemonklogo.webp";
import useGymWeeklyData from "./useGymWeeklyData";
import useAuth from "../../hooks/useAuth";

function LoadError({ message, retry }) {
  return <div role="alert" className="rounded-xl border border-rose-400/20 bg-rose-400/5 p-3 text-sm text-rose-200">
    <p>{message}</p><button type="button" onClick={retry} className="mt-2 rounded-lg border border-amber-400/30 px-3 py-1 text-xs font-semibold text-amber-300">Retry</button>
  </div>;
}

const BODY_GROUP_FILTERS = ["All", "Chest", "Back", "Legs", "Shoulders", "Arms", "Core", "Cardio", "Full Body", "Other"];
const BODY_PART_FILTERS  = ["All", "Overall", "Upper Body", "Core", "Arms", "Lower Body"];

function trendClass() { return "text-stone-300"; }

function useFade(ref, deps) {
  const [fade, setFade] = useState({ top: false, bottom: false });
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const update = () => {
      const canScroll = node.scrollHeight > node.clientHeight + 1;
      setFade({
        top: node.scrollTop > 1,
        bottom: canScroll && node.scrollTop + node.clientHeight < node.scrollHeight - 1,
      });
    };
    update();
    node.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      node.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return fade;
}

function FadeContainer({ refProp, fade, className = "", children }) {
  return (
    <div className={`relative min-h-0 flex-1 ${className}`}>
      <div ref={refProp} className="journal-scroll h-full overflow-y-auto scroll-smooth pr-1">
        {children}
      </div>
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-4 bg-gradient-to-b from-[#1d0f0c] to-transparent transition-opacity duration-200 ${fade.top ? "opacity-100" : "opacity-0"}`} />
      <div className={`pointer-events-none absolute inset-x-0 bottom-0 h-5 bg-gradient-to-t from-[#1d0f0c] to-transparent transition-opacity duration-200 ${fade.bottom ? "opacity-100" : "opacity-0"}`} />
    </div>
  );
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

export default function GYMWeeklyReport({ lowMotion = false }) {
  const { isDemoMode } = useAuth();
  const { summaries, loadingSummaries, summariesError, retrySummaries, selectedWeekId, setSelectedWeekId,
    weekData, loadingWeekData, weekError, retryWeek, analysis, generate } = useGymWeeklyData(isDemoMode);
  const aiSummary = analysis.text, loadingAi = analysis.loading;
  const [bodyGroupFilter, setBodyGroupFilter] = useState("All");
  const [bodyPartFilter, setBodyPartFilter]   = useState("All");
  const [showPhotos, setShowPhotos]         = useState(false);
  const [showFullScreen, setShowFullScreen] = useState(false);
  const [fsIndex, setFsIndex]               = useState(0);

  const aiRef       = useRef(null);
  const strengthRef = useRef(null);
  const bodyRef     = useRef(null);
  const photoDialogRef = useRef(null);
  const fullScreenRef = useRef(null);

  const selectedWeek      = weekData;
  const strengthProgress  = selectedWeek?.strengthProgress || [];
  const filteredStrength  = strengthProgress.filter(
    (ex) => bodyGroupFilter === "All" || ex.bodyGroup === bodyGroupFilter
  );

  const aiFade       = useFade(aiRef,       [selectedWeekId, aiSummary, analysis.error, loadingAi]);
  const strengthFade = useFade(strengthRef, [selectedWeekId, bodyGroupFilter, filteredStrength.length]);
  const bodyFade     = useFade(bodyRef,     [selectedWeekId, bodyPartFilter, (selectedWeek?.bodyProgress || []).length]);

  useEffect(() => {
    setBodyGroupFilter("All"); setBodyPartFilter("All");
    setShowPhotos(false); setShowFullScreen(false); setFsIndex(0);
  }, [selectedWeekId]);

  useEffect(() => {
    if (!showPhotos && !showFullScreen) return;
    const previousFocus = document.activeElement, previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const dialog = () => showFullScreen ? fullScreenRef.current : photoDialogRef.current;
    const frame = requestAnimationFrame(() => dialog()?.querySelector("button")?.focus());
    const keydown = event => {
      if (event.key === "Escape") { setShowPhotos(false); setShowFullScreen(false); }
      if (showFullScreen && event.key === "ArrowLeft") setFsIndex(index => Math.max(0, index - 1));
      if (showFullScreen && event.key === "ArrowRight") setFsIndex(index => Math.min((selectedWeek?.photoEntries.length || 1) - 1, index + 1));
      if (event.key === "Tab") {
        const buttons = [...(dialog()?.querySelectorAll("button:not(:disabled)") || [])];
        const first = buttons[0], last = buttons.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener("keydown", keydown);
    return () => {
      cancelAnimationFrame(frame); document.removeEventListener("keydown", keydown);
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [showPhotos, showFullScreen, selectedWeek]);

  useEffect(() => {
    if (aiRef.current) aiRef.current.scrollTop = 0;
    if (strengthRef.current) strengthRef.current.scrollTop = 0;
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
  }, [selectedWeekId]);

  useEffect(() => {
    if (strengthRef.current) strengthRef.current.scrollTop = 0;
  }, [bodyGroupFilter]);

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
  }, [bodyPartFilter]);

  return (
    <>
    {/* Progress Photos Modal */}
    {typeof document !== "undefined" &&
      createPortal(
        <AnimatePresence>
          {showPhotos && selectedWeek && (
            <Motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              data-demo-allow="true" className="weekly-gym-photos-backdrop fixed inset-0 z-[100] flex items-end justify-center overflow-y-auto bg-black/70 p-3 backdrop-blur-sm sm:items-center sm:p-4"
              onClick={() => { setShowPhotos(false); setShowFullScreen(false); }}
            >
              <Motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ duration: 0.2 }}
                ref={photoDialogRef} role="dialog" aria-modal="true" aria-label="Progress photos" data-demo-allow="true"
                className="weekly-gym-photos-modal journal-scroll relative max-h-[82vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-amber-100/10 bg-[#1a0d0a] p-4 shadow-2xl sm:p-6"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-label-md">Progress Photos</p>
                    <p className="mt-0.5 text-xs font-semibold text-stone-500">{selectedWeek.date}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setShowPhotos(false); setShowFullScreen(false); }}
                    className="shrink-0 rounded-full border border-stone-700 px-3 py-1 text-xs font-semibold text-stone-400 transition-colors hover:border-stone-500 hover:text-stone-200"
                  >
                    ✕ Close
                  </button>
                </div>

                {/* Mon–Sun thumbnail strip */}
                <div className="mb-5 rounded-xl border border-stone-800/60 bg-stone-950/60 p-3">
                  <div className="mb-2.5 flex items-center justify-between">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">Weekly Overview</p>
                    <button
                      type="button"
                      onClick={() => { setShowPhotos(false); setFsIndex(0); setShowFullScreen(true); }}
                      disabled={!selectedWeek.stats.photoCount}
                      className="rounded-full border border-violet-400/30 bg-violet-500/10 px-3 py-0.5 text-[10px] font-semibold text-violet-300 transition-colors hover:bg-violet-500/20"
                    >
                      View All
                    </button>
                  </div>
                  <div className="weekly-gym-photo-strip grid grid-cols-7 gap-2">
                    {(selectedWeek.progressPhotos || []).map((entry) => (
                      <div key={entry.day} className="flex flex-col items-center gap-1">
                        <div
                          className={`relative w-full overflow-hidden rounded-lg border ${
                            entry.photo
                              ? "border-amber-400/20 bg-stone-900"
                              : "border-dashed border-stone-700/40 bg-stone-900/40"
                          }`}
                          style={{ aspectRatio: "3/4" }}
                        >
                          {entry.photo ? (
                            <img src={entry.photo} alt={entry.day} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <span className="text-[10px] opacity-20">📷</span>
                            </div>
                          )}
                        </div>
                        <p className="text-center text-[9px] font-semibold text-stone-500">
                          {entry.day.split(",")[0]} {entry.count > 1 ? `(${entry.count})` : ""}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <p className="mt-2 text-center text-[11px] font-semibold text-stone-600">
                  {selectedWeek.stats.photoCount} photos across {selectedWeek.stats.photoDays} of 7 days
                </p>
              </Motion.div>
            </Motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

    {/* Full-screen carousel */}
    {typeof document !== "undefined" &&
      createPortal(
        <AnimatePresence>
          {showFullScreen && selectedWeek && (() => {
            const photos = selectedWeek.photoEntries || [];
            const entry  = photos[fsIndex];
            return (
              <Motion.div
                key="photos-fullscreen"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                ref={fullScreenRef} role="dialog" aria-modal="true" aria-label="Progress photo viewer" data-demo-allow="true"
                className="weekly-gym-fullscreen fixed inset-0 z-[200] flex flex-col bg-black"
              >
                {/* Close */}
                <button
                  type="button"
                  onClick={() => setShowFullScreen(false)}
                  className="absolute right-4 top-4 z-10 rounded-full border border-stone-600 bg-black/60 px-4 py-1.5 text-xs font-semibold text-stone-300 backdrop-blur-sm transition-colors hover:border-stone-400 hover:text-white"
                >
                  ✕ Close
                </button>

                {/* Main photo */}
                <div className="relative flex flex-1 items-center justify-center overflow-hidden">
                  <AnimatePresence mode="wait">
                    <Motion.div
                      key={fsIndex}
                      initial={{ opacity: 0, x: 40 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -40 }}
                      transition={{ duration: 0.18 }}
                      className="flex h-full w-full items-center justify-center"
                    >
                      {entry?.photo ? (
                        <img
                          src={entry.photo}
                          alt={entry.day}
                          className="max-h-full max-w-full object-contain"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-3">
                          <span className="text-5xl opacity-20">📷</span>
                          <p className="text-sm font-semibold text-stone-600">No photo uploaded</p>
                        </div>
                      )}
                    </Motion.div>
                  </AnimatePresence>

                  {/* Prev arrow */}
                  <button
                    type="button"
                    onClick={() => setFsIndex((i) => Math.max(0, i - 1))}
                    aria-label="Previous photo"
                    disabled={fsIndex === 0}
                    className="absolute left-4 flex h-10 w-10 items-center justify-center rounded-full border border-stone-700 bg-black/60 text-stone-300 backdrop-blur-sm transition-all hover:border-stone-400 hover:text-white disabled:opacity-20"
                  >
                    ‹
                  </button>

                  {/* Next arrow */}
                  <button
                    type="button"
                    onClick={() => setFsIndex((i) => Math.min(photos.length - 1, i + 1))}
                    aria-label="Next photo"
                    disabled={fsIndex === photos.length - 1}
                    className="absolute right-4 flex h-10 w-10 items-center justify-center rounded-full border border-stone-700 bg-black/60 text-stone-300 backdrop-blur-sm transition-all hover:border-stone-400 hover:text-white disabled:opacity-20"
                  >
                    ›
                  </button>
                </div>

                {/* Date + counter */}
                <div className="flex shrink-0 flex-col items-center gap-1 py-3">
                  <span className="rounded-full border border-amber-500/30 bg-amber-900/40 px-4 py-1 text-sm font-semibold text-amber-300">
                    {entry?.day}
                  </span>
                  <p className="text-xs font-semibold text-stone-600">{fsIndex + 1} / {photos.length}</p>
                </div>

                {/* Thumbnail strip */}
                <div className="weekly-gym-fullscreen-thumbs flex shrink-0 items-center justify-center gap-2 overflow-x-auto px-4 pb-5">
                  {photos.map((p, i) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setFsIndex(i)}
                      aria-label={`Photo ${i + 1}: ${p.day}`} aria-pressed={i === fsIndex}
                      className={`h-16 w-12 shrink-0 overflow-hidden rounded-lg border-2 transition-all ${
                        i === fsIndex ? "border-amber-400 opacity-100" : "border-stone-700 opacity-50 hover:opacity-80"
                      }`}
                    >
                      {p.photo ? (
                        <img src={p.photo} alt={p.day} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-stone-900">
                          <span className="text-xs opacity-30">📷</span>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </Motion.div>
            );
          })()}
        </AnimatePresence>,
        document.body
      )}

    <div data-demo-allow="true" className="weekly-gym-view flex flex-col gap-4 lg:flex-row lg:items-start">

      <div className="weekly-gym-quick-weeks rounded-[1.4rem] border border-amber-100/10 bg-white/6 p-3" data-demo-allow="true">
        <p className="text-label-md">Little Monk's Analysis</p>
        {loadingSummaries ? (
          <p className="mt-2 text-xs text-stone-500">Loading weeks...</p>
        ) : summariesError ? (
          <LoadError message={summariesError} retry={retrySummaries} />
        ) : summaries.length === 0 ? (
          <p className="mt-2 text-xs text-stone-500">No weekly summaries yet.</p>
        ) : (
          <div className="weekly-gym-quick-list mt-2 flex gap-2 overflow-x-auto pb-1">
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
                <span className="mt-0.5 block text-[10px] text-stone-500">{week.workoutDays} logged days · {week.photoCount || 0} photos</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── LEFT: Main content ─────────────────────────────────── */}
      <div className="weekly-gym-main journal-scroll min-w-0 flex-1 overflow-y-auto lg:max-h-[calc(100vh-170px)]">
        <AnimatePresence mode="wait">
          {loadingSummaries || loadingWeekData ? (
            <Motion.div
              key="gym-loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-5"
            >
              <div className="h-28 animate-pulse rounded-2xl border border-amber-100/10 bg-white/6" />
              <div className="h-36 animate-pulse rounded-2xl border border-amber-100/10 bg-white/6" />
              <div className="h-80 animate-pulse rounded-2xl border border-amber-100/10 bg-white/6" />
            </Motion.div>
          ) : weekError ? (
            <Motion.div key="gym-error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <LoadError message={weekError} retry={retryWeek} />
            </Motion.div>
          ) : !selectedWeek ? (
            <Motion.div
              key="gym-empty"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-2xl border border-dashed border-amber-100/15 bg-white/5 px-5 py-10 text-center text-sm text-stone-400"
            >
              Select a week to view your retained gym logs.
            </Motion.div>
          ) : (
          <Motion.div
            key={selectedWeek.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22 }}
              className="weekly-gym-main-body space-y-4 sm:space-y-5"
          >
            {/* Weekly Summary header */}
            <ReportCard className="weekly-gym-overview px-4 py-3.5 sm:px-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-base">
                    💪
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300/80">GYM Weekly Summary</p>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <span className="rounded-full border border-stone-700/60 bg-stone-900/50 px-3 py-1 text-[11px] font-semibold text-stone-400">
                    📅 {selectedWeek.date}
                  </span>
                  <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold text-amber-300">
                    ⚡ {selectedWeek.workoutDays} / {selectedWeek.totalDays} logged days
                  </span>
                  <Motion.button
                    type="button"
                    onClick={() => setShowPhotos(true)}
                    whileHover={{ scale: 1.05, boxShadow: "0 0 14px rgba(167,139,250,0.38)" }}
                    whileTap={{ scale: 0.95 }}
                    className="relative overflow-hidden rounded-full border border-violet-400/30 bg-violet-500/10 px-3 py-1 text-[11px] font-semibold text-violet-300 transition-colors hover:border-violet-400/50 hover:bg-violet-500/20"
                  >
                    <Motion.span
                      className="pointer-events-none absolute inset-y-0 left-[-40%] w-[30%] -skew-x-12 bg-white/25 blur-sm"
                      animate={{ left: ["-40%", "130%"] }}
                      transition={{ duration: lowMotion ? 0 : 1.8, repeat: lowMotion ? 0 : Infinity, repeatDelay: 1.5, ease: "easeInOut" }}
                    />
                    <span className="relative z-10">📸 Progress Photos</span>
                  </Motion.button>
                </div>
              </div>

              {(() => {
                const GROUP_COLORS = {
                  Chest:     { text: "text-sky-300",     border: "border-sky-400/30",     bg: "bg-sky-500/12" },
                  Back:      { text: "text-violet-300",  border: "border-violet-400/30",  bg: "bg-violet-500/12" },
                  Legs:      { text: "text-emerald-300", border: "border-emerald-400/30", bg: "bg-emerald-500/12" },
                  Shoulders: { text: "text-amber-300",   border: "border-amber-400/30",   bg: "bg-amber-500/12" },
                  Arms:      { text: "text-orange-300",  border: "border-orange-400/30",  bg: "bg-orange-500/12" },
                  Core:      { text: "text-rose-300",    border: "border-rose-400/30",    bg: "bg-rose-500/12" },
                };
                const counts = selectedWeek.stats.bodyGroupCounts;
                const sorted     = Object.entries(counts).sort((a, b) => b[1] - a[1]);
                const topMuscles = sorted.slice(0, 2).map(([g]) => g);

                return (
                  <div className="weekly-gym-summary-pills mt-3 flex flex-wrap items-center gap-2">
                    {selectedWeek.avgWorkoutTime && (
                      <div className="flex items-center gap-1.5 rounded-full border border-sky-400/20 bg-sky-500/10 px-3 py-1">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">Avg Logged Time</p>
                        <span className="text-xs font-bold text-sky-300">{selectedWeek.avgWorkoutTime}</span>
                      </div>
                    )}

                    {selectedWeek.totalVolume && (
                      <Motion.div
                        className="relative flex items-center gap-1.5 overflow-hidden rounded-full border border-violet-400/25 bg-violet-500/10 px-3 py-1"
                        animate={{ boxShadow: ["0 0 0px rgba(167,139,250,0)", "0 0 10px rgba(167,139,250,0.36)", "0 0 0px rgba(167,139,250,0)"] }}
                        transition={{ boxShadow: { duration: lowMotion ? 0 : 2.2, repeat: lowMotion ? 0 : Infinity, ease: "easeInOut" } }}
                      >
                        <Motion.span
                          className="pointer-events-none absolute inset-y-0 left-[-40%] w-[30%] -skew-x-12 bg-white/25 blur-sm"
                          animate={{ left: ["-40%", "130%"] }}
                          transition={{ duration: lowMotion ? 0 : 1.8, repeat: lowMotion ? 0 : Infinity, repeatDelay: 1.5, ease: "easeInOut" }}
                        />
                        <p className="relative z-10 text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">Estimated Total Volume</p>
                        <span className="relative z-10 text-xs font-bold text-violet-300">{selectedWeek.totalVolume}</span>
                      </Motion.div>
                    )}

                    <div className="flex items-center gap-1.5 rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">Activity Coverage</p>
                      <span className="text-xs font-bold text-amber-300">
                        {selectedWeek.consistencyScore}<span className="text-[10px] font-semibold text-stone-500"> /100</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">Exercise Logs</p>
                      <span className="text-xs font-bold text-emerald-300">{selectedWeek.stats.exerciseLogs}</span>
                    </div>

                    {topMuscles.length > 0 && (
                      <div className="flex w-full flex-wrap items-center gap-2 xl:ml-auto xl:w-auto">
                        <div className="hidden h-4 w-px bg-amber-100/15 xl:block" />
                        <p className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">
                          Most Logged Groups
                        </p>
                        {topMuscles.map((group) => {
                          const c = GROUP_COLORS[group] ?? { text: "text-stone-300", border: "border-stone-400/25", bg: "bg-stone-500/10" };
                          return (
                            <Motion.span
                              key={group}
                              className={`relative shrink-0 overflow-hidden rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${c.border} ${c.bg} ${c.text}`}
                              animate={{ boxShadow: ["0 0 0px rgba(251,146,60,0)", "0 0 9px rgba(251,146,60,0.32)", "0 0 0px rgba(251,146,60,0)"] }}
                              transition={{ boxShadow: { duration: lowMotion ? 0 : 2.2, repeat: lowMotion ? 0 : Infinity, ease: "easeInOut" } }}
                            >
                              <Motion.span
                                className="pointer-events-none absolute inset-y-0 left-[-40%] w-[30%] -skew-x-12 bg-white/25 blur-sm"
                                animate={{ left: ["-40%", "130%"] }}
                                transition={{ duration: lowMotion ? 0 : 1.8, repeat: lowMotion ? 0 : Infinity, repeatDelay: 1.5, ease: "easeInOut" }}
                              />
                              <span className="relative z-10">🔥 {group}</span>
                            </Motion.span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}
              <p className="mt-3 text-xs leading-relaxed text-stone-500">As of {selectedWeek.asOf} · {selectedWeek.stats.timedLogs}/{selectedWeek.stats.exerciseLogs} logs have recorded time · {selectedWeek.stats.volumeLogs}/{selectedWeek.stats.exerciseLogs} have calculable volume.</p>
              <p className="mt-1 text-[11px] leading-relaxed text-stone-500">{selectedWeek.dataNote}</p>
            </ReportCard>

            {/* Little Monk AI Summary */}
            <ReportCard className="weekly-gym-ai flex min-h-[14rem] flex-col overflow-hidden lg:h-[22vh]">
              <div className="mb-3 flex shrink-0 flex-wrap items-center gap-2">
                <Motion.img
                  src={littleMonkLogo}
                  alt="Little Monk"
                  className="h-14 w-17 object-contain"
                  animate={{ y: [0, -3, 0] }}
                  transition={{ duration: lowMotion ? 0 : 2.8, repeat: lowMotion ? 0 : Infinity, ease: "easeInOut" }}
                />
                <div>
                  <p className="text-label-md">Little Monk's Analysis</p>
                  <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-amber-300/70">{isDemoMode ? "Sample analysis" : "AI Generated · Verify insights"}</p>
                </div>
                {!isDemoMode && <button type="button" onClick={generate} disabled={loadingAi || !(selectedWeek.stats.exerciseLogs || selectedWeek.stats.measurementDays || selectedWeek.stats.photoCount)}
                  className="ml-auto rounded-lg border border-amber-400/30 px-3 py-1.5 text-xs font-semibold text-amber-300 disabled:opacity-40">
                  {aiSummary ? "↻ Regenerate" : "Generate analysis"}
                </button>}
              </div>
              <FadeContainer refProp={aiRef} fade={aiFade}>
                {analysis.stale && <p className="mb-2 text-xs text-amber-300">Saved analysis is out of date. Regenerate to use the current retained logs.</p>}
                {aiSummary && <p className="text-sm leading-relaxed text-stone-300">{aiSummary}</p>}
                {loadingAi && <p className="mt-2 text-xs text-stone-500">{aiSummary ? "Updating analysis…" : "Loading saved analysis…"}</p>}
                {!aiSummary && !loadingAi && !analysis.error && <p className="text-sm italic leading-relaxed text-stone-500">Generate an analysis from these recorded facts when you’re ready.</p>}
                {analysis.error && <div className="mt-2"><LoadError message={analysis.error} retry={analysis.retryWith === "generate" ? generate : retryWeek} /></div>}
                {analysis.warning && <p role="status" className="mt-2 text-xs text-amber-300">{analysis.warning}</p>}
              </FadeContainer>
            </ReportCard>

            {/* Strength Progress + Body Progress side by side */}
            <div className="weekly-gym-progress-grid flex flex-col items-start gap-4 2xl:flex-row">

              {/* Strength Progress */}
              <ReportCard className="weekly-gym-strength-card flex min-h-[20rem] min-w-0 flex-1 flex-col overflow-hidden lg:h-[44vh] 2xl:basis-0">
                <div className="mb-3 flex shrink-0 flex-col gap-3 bg-[#1d0f0c]/95 pb-2 backdrop-blur sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">Strength Progress</p>
                  <div className="weekly-gym-progress-filters flex w-full flex-wrap items-center gap-1 rounded-2xl border border-amber-100/10 bg-stone-900/60 p-0.5 sm:w-auto sm:rounded-full">
                    {BODY_GROUP_FILTERS.map((filter) => (
                      <button
                        key={filter}
                        type="button"
                        onClick={() => setBodyGroupFilter(filter)}
                        aria-pressed={bodyGroupFilter === filter}
                        className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-[10px] font-semibold transition-colors ${
                          bodyGroupFilter === filter
                            ? "bg-amber-500/20 text-amber-300"
                            : "text-stone-500 hover:text-stone-300"
                        }`}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>
                </div>
                <FadeContainer refProp={strengthRef} fade={strengthFade} className="space-y-2.5">
                  {filteredStrength.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-amber-100/10 py-8 text-center text-xs text-stone-600">
                      No strength progress found for this filter.
                    </p>
                  ) : (
                    filteredStrength.map((ex) => (
                      <div key={ex.id} className="rounded-xl border border-stone-700/35 bg-stone-950/35 px-3 py-2.5">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="break-words text-sm font-semibold text-stone-200">{ex.exercise}</p>
                            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-500">{ex.bodyGroup}</p>
                          </div>
                          {ex.isFirstEntry
                            ? <span className="rounded-full border border-sky-400/30 bg-sky-500/10 px-2 py-0.5 text-[10px] font-semibold text-sky-300">First Entry</span>
                            : <p className="text-xs font-bold text-stone-300">{ex.improvement ?? "No load comparison"}</p>
                          }
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] font-semibold sm:grid-cols-4">
                          <p className="rounded-md border border-stone-700/40 bg-black/15 px-2 py-1 text-stone-400">Last: {ex.previous}</p>
                          <p className="rounded-md border border-emerald-500/25 bg-emerald-500/8 px-2 py-1 text-emerald-200">Now: {ex.current}</p>
                          <p className="rounded-md border border-stone-700/40 bg-black/15 px-2 py-1 text-stone-400">🔁 {ex.repsChange === null ? "—" : `${ex.repsChange > 0 ? "+" : ""}${ex.repsChange}`} reps</p>
                          <p className="rounded-md border border-stone-700/40 bg-black/15 px-2 py-1 text-stone-400">⏱ {ex.timeChange === null ? "—" : `${ex.timeChange > 0 ? "+" : ""}${ex.timeChange}`} min</p>
                        </div>
                        <p className="mt-1 text-[10px] text-stone-500">{ex.previousDate ? `Baseline ${ex.previousDate} → ${ex.currentDate}` : `First retained reading · ${ex.currentDate}`}</p>
                        <p className="mt-1 text-[10px] text-stone-500">Recorded: {ex.sets ?? "—"} sets · {ex.totalTime}</p>
                      </div>
                    ))
                  )}
                </FadeContainer>
              </ReportCard>

              {/* Body Progress */}
              <ReportCard className="weekly-gym-body-card flex min-h-[20rem] min-w-0 flex-1 flex-col overflow-hidden lg:h-[44vh] 2xl:basis-0">
                <div className="mb-3 flex shrink-0 flex-col gap-2 bg-[#1d0f0c]/95 pb-2 backdrop-blur sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">Body Progress</p>
                  <div className="weekly-gym-progress-filters flex w-full flex-wrap items-center gap-1 rounded-2xl border border-amber-100/10 bg-stone-900/60 p-0.5 sm:w-auto sm:rounded-full">
                    {BODY_PART_FILTERS.map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setBodyPartFilter(f)}
                        aria-pressed={bodyPartFilter === f}
                        className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-[10px] font-semibold transition-colors ${
                          bodyPartFilter === f
                            ? "bg-amber-500/20 text-amber-300"
                            : "text-stone-500 hover:text-stone-300"
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
                <FadeContainer refProp={bodyRef} fade={bodyFade} className="space-y-2.5">
                  {(selectedWeek.bodyProgress || [])
                    .filter((item) => bodyPartFilter === "All" || item.category === bodyPartFilter)
                    .length === 0 ? (
                    <p className="rounded-xl border border-dashed border-amber-100/10 py-8 text-center text-xs text-stone-600">
                      No retained readings match this filter for the selected week.
                    </p>
                  ) : (
                    (selectedWeek.bodyProgress || [])
                      .filter((item) => bodyPartFilter === "All" || item.category === bodyPartFilter)
                      .map((item) => (
                        <div key={item.bodyPart} className="rounded-lg border border-stone-700/30 bg-stone-950/35 px-3 py-2.5">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-stone-200">{item.bodyPart}</p>
                              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-stone-600">{item.category}</p>
                            </div>
                            <p className={`text-xs font-bold ${trendClass(item.trend)}`}>{item.change}</p>
                          </div>
                          <p className="mt-1 text-[10px] font-semibold text-stone-500">
                            {item.previous} {"→"} {item.current} · {item.previousDate || "No baseline"} {"→"} {item.currentDate}
                          </p>
                        </div>
                      ))
                  )}
                </FadeContainer>
              </ReportCard>

            </div>
          </Motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── RIGHT: Week selector + Nutrition ──────────────────── */}
      <div className="weekly-gym-sidebar grid w-full items-start gap-4 lg:w-[360px] lg:shrink-0 xl:w-[380px]">

        {/* Week selector */}
        <ReportCard className="weekly-gym-weeks-card flex min-h-[18rem] flex-col overflow-hidden lg:h-[44vh]">
          <div className="mb-4 flex shrink-0 items-center gap-3">
            <Motion.div
              className="relative grid h-16 w-17 place-items-center"
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: lowMotion ? 0 : 2.8, repeat: lowMotion ? 0 : Infinity, ease: "easeInOut" }}
            >
              <Motion.span
                className="absolute inset-2 rounded-full bg-amber-400/15 blur-md"
                animate={{ opacity: [0.35, 0.8, 0.35], scale: [0.9, 1.12, 0.9] }}
                transition={{ duration: lowMotion ? 0 : 2.8, repeat: lowMotion ? 0 : Infinity, ease: "easeInOut" }}
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
              <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.14em] text-amber-300/70">AI Assistant</p>
            </div>
          </div>

          <div className="journal-scroll min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
            {summariesError && <LoadError message={summariesError} retry={retrySummaries} />}
            {loadingSummaries && <p className="text-xs text-stone-500">Loading weeks…</p>}
            {summaries.map((week) => {
              const isSelected = selectedWeekId === week.id;
              return (
                <Motion.div
                  key={week.id}
                  layout
                  className={`rounded-xl border p-3 text-sm transition-colors ${
                    isSelected
                      ? "border-amber-400/30 bg-amber-500/8"
                      : "border-amber-100/10 bg-stone-950/45 hover:border-amber-400/20"
                  }`}
                >
                  <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
                    <div className="min-w-0">
                      <span className="text-xs font-semibold text-amber-300/80">{week.workoutDays} logged days · {week.photoCount || 0} photos</span>
                      <p className="text-sm font-semibold text-stone-200">{week.date}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedWeekId(isSelected ? null : week.id)}
                      aria-pressed={isSelected}
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
            {!loadingSummaries && !summariesError && summaries.length === 0 && (
              <p className="rounded-xl border border-dashed border-amber-100/10 px-4 py-6 text-center text-xs text-stone-500">
                Completed weeks with workout, measurement or photo records appear here (last 12 weeks).
              </p>
            )}
          </div>
        </ReportCard>

        {/* Current Macro Plan */}
        {selectedWeek?.nutrition ? (
          <ReportCard className="weekly-gym-nutrition-card">
            <div className="mb-3 flex items-center gap-2">
              <span className="text-base">🥗</span>
              <p className="text-label-md">Current Macro Plan</p>
            </div>
            <p className="text-xs leading-relaxed text-stone-500">{selectedWeek.nutrition.note} {selectedWeek.nutrition.dayCount} configured days; each metric excludes missing values.</p>
            <div className="weekly-gym-nutrition-grid mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {[
                ["Avg Protein",  selectedWeek.nutrition.avgProtein],
                ["Avg Carbs",    selectedWeek.nutrition.avgCarbs],
                ["Avg Fats",     selectedWeek.nutrition.avgFats],
                ["Avg Fiber",    selectedWeek.nutrition.avgFiber],
                ["Avg Calories", selectedWeek.nutrition.avgCalories],
                ["Avg Water",    selectedWeek.nutrition.avgWater],
                ["Avg Sugar",    selectedWeek.nutrition.avgSugar],
                ["Avg Sodium",   selectedWeek.nutrition.avgSodium],
              ].filter(([, v]) => v).map(([label, value]) => (
                <div key={label} className="rounded-lg border border-amber-100/10 bg-stone-950/35 px-2.5 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-500">{label}</p>
                  <p className="mt-1 text-xs font-bold text-amber-200">{value}</p>
                </div>
              ))}
            </div>
          </ReportCard>
        ) : selectedWeek ? (
          <ReportCard className="weekly-gym-nutrition-card">
            <div className="mb-3 flex items-center gap-2">
              <span className="text-base">🥗</span>
              <p className="text-label-md">Current Macro Plan</p>
            </div>
            <p className="text-xs text-stone-500">No current active macro values are available. The diet chart stores plans, not dated intake; no historical nutrition average can be inferred.</p>
          </ReportCard>
        ) : null}

      </div>
    </div>
    </>
  );
}
