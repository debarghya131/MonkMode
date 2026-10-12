import { AnimatePresence, MotionConfig, motion as Motion } from "framer-motion";
import { useEffect, useId, useRef, useState } from "react";
import useAuth from "../../../hooks/useAuth";
import useMobileLowMotion from "../../../hooks/useMobileLowMotion";
import { HabitAnalysisContext } from "./habitAnalysisContext";
import useHabitAnalysisData from "./useHabitAnalysisData";
import ComplationMissAnalysis from "./ComplationMissAnalysis";
import CategPrioTimeAnalysis from "./CategPrioTimeAnalysis";
import ScoreStreakAnalysis from "./ScoreStreakAnalysis";
import { HabitPeriodFilters } from "./HabitAnalysisUI";
import "./habitAnalysis.css";

const HABIT_ANALYSIS_SECTIONS = [
  { id: "completion-miss", label: "Completion & Miss Analysis", shortLabel: "Completion & Miss", icon: "✓", component: ComplationMissAnalysis },
  { id: "category-priority-time", label: "Category | Priority | Time of Day Analysis", shortLabel: "Category & Time", icon: "📊", component: CategPrioTimeAnalysis },
  { id: "streak-score", label: "Streak & Score", shortLabel: "Streak & Score", icon: "🔥", component: ScoreStreakAnalysis },
];

export default function HabitAnalysis() {
  const { isDemoMode, user } = useAuth();
  return <HabitSession key={isDemoMode ? "demo" : user?.id || user?._id || "user"} isDemoMode={isDemoMode} />;
}
function HabitSession({ isDemoMode }) {
  const resource = useHabitAnalysisData(isDemoMode);
  const lowMotion = useMobileLowMotion();
  const [activeSection, setActiveSection] = useState(HABIT_ANALYSIS_SECTIONS[0].id);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();
  const menuTriggerRef = useRef(null);
  const activeTab =
    HABIT_ANALYSIS_SECTIONS.find((section) => section.id === activeSection) ??
    HABIT_ANALYSIS_SECTIONS[0];
  const ActiveComponent = activeTab.component;

  useEffect(() => {
    const wideScreen = window.matchMedia("(min-width: 640px)");
    const closeMenu = () => setMenuOpen(false);
    wideScreen.addEventListener("change", closeMenu);
    return () => wideScreen.removeEventListener("change", closeMenu);
  }, []);

  return (
    <HabitAnalysisContext.Provider value={resource}>
    <MotionConfig reducedMotion={lowMotion ? "always" : "user"}>
    <div data-demo-allow="true" data-section={activeSection} className="habit-analysis-page space-y-4 sm:space-y-5">
      <div className="habit-analysis-toolbar">
      {/* Mobile: hamburger dropdown */}
      <div className="habit-analysis-mobile-nav relative sm:hidden" onKeyDown={event => {
        if (event.key === "Escape" && menuOpen) { event.stopPropagation(); setMenuOpen(false); menuTriggerRef.current?.focus(); }
      }}>
        <button
          ref={menuTriggerRef}
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-expanded={menuOpen}
          aria-controls={menuOpen ? menuId : undefined}
          aria-label="Habit Analysis section"
          title={activeTab.label}
          className="flex w-full items-center justify-between gap-2 rounded-2xl border border-amber-100/10 bg-black/20 px-4 py-2.5 text-sm font-semibold text-amber-300 shadow-xl shadow-black/25 backdrop-blur"
        >
          <span className="flex min-w-0 items-center gap-2">
            <span className="text-base leading-none">{activeTab.icon}</span>
            <span className="min-w-0">{activeTab.shortLabel}</span>
          </span>
          <svg className="h-4 w-4 shrink-0 text-stone-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
            <nav id={menuId} aria-label="Habit Analysis sections" className="habit-analysis-menu absolute left-0 right-0 top-full z-50 mt-1.5 rounded-2xl border border-amber-100/10 bg-stone-950/95 p-1.5 shadow-2xl shadow-black/50 backdrop-blur">
              {HABIT_ANALYSIS_SECTIONS.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => { setActiveSection(section.id); setMenuOpen(false); menuTriggerRef.current?.focus(); }}
                  aria-pressed={activeSection === section.id}
                  aria-label={section.label}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                    activeSection === section.id
                      ? "bg-amber-500/15 text-amber-300"
                      : "text-stone-400 hover:bg-white/5 hover:text-stone-200"
                  }`}
                >
                  <span className="shrink-0 text-base leading-none">{section.icon}</span>
                  <span className="min-w-0 text-left">{section.label}</span>
                </button>
              ))}
            </nav>
          </>
        )}
      </div>

      {/* Desktop: horizontal scrollable nav */}
      <nav aria-label="Habit Analysis sections" className="habit-analysis-desktop-nav hidden w-full overflow-x-auto rounded-2xl border border-amber-100/10 bg-white/6 p-1.5 shadow-xl shadow-black/25 backdrop-blur scrollbar-none sm:flex sm:items-center sm:gap-1">
        {HABIT_ANALYSIS_SECTIONS.map((section) => {
          const isActive = activeSection === section.id;
          return (
            <Motion.button
              key={section.id}
              type="button"
              onClick={() => setActiveSection(section.id)}
              whileTap={{ scale: 0.98 }}
              aria-pressed={isActive}
              aria-label={section.label}
              title={section.label}
              className="dashboard-section-tab flex min-w-[7rem] flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-semibold"
            >
              <span className="text-base leading-none">{section.icon}</span>
              <span className="min-w-0">{section.shortLabel}</span>
            </Motion.button>
          );
        })}
      </nav>

      <HabitPeriodFilters />
      </div>

      <AnimatePresence mode="wait">
        <Motion.div
          key={activeTab.id}
          className="habit-analysis-content"
          initial={lowMotion ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.22, ease: "easeInOut" }}
        >
          <ActiveComponent />
        </Motion.div>
      </AnimatePresence>
    </div>
    </MotionConfig>
    </HabitAnalysisContext.Provider>
  );
}
