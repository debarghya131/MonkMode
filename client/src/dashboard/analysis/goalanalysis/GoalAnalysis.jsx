import { AnimatePresence, MotionConfig, motion as Motion } from "framer-motion";
import { useState } from "react";
import useAuth from "../../../hooks/useAuth";
import useMobileLowMotion from "../../../hooks/useMobileLowMotion";
import { GoalAnalysisContext } from "./goalAnalysisContext";
import useGoalAnalysisData from "./useGoalAnalysisData";
import GoalProgressAnalysis from "./GoalProgressAnalysis";
import ScoreConsisteDeadAnalysis from "./ScoreConsisteDeadAnalysis";
const GOAL_ANALYSIS_SECTIONS = [
  { id: "goal-progress", label: "Goal Progress Analysis", icon: "🎯", component: GoalProgressAnalysis },
  { id: "consistency-deadline-score", label: "Consistency | Deadline | Score Analysis", icon: "📈", component: ScoreConsisteDeadAnalysis },
];

export default function GoalAnalysis() {
  const { isDemoMode, user } = useAuth();
  return <GoalSession key={isDemoMode ? "demo" : user?.id || user?._id || "user"} isDemoMode={isDemoMode} />;
}
function GoalSession({ isDemoMode }) {
  const resource = useGoalAnalysisData(isDemoMode);
  const lowMotion = useMobileLowMotion();
  const [activeSection, setActiveSection] = useState(GOAL_ANALYSIS_SECTIONS[0].id);
  const [menuOpen, setMenuOpen] = useState(false);
  const activeTab =
    GOAL_ANALYSIS_SECTIONS.find((section) => section.id === activeSection) ??
    GOAL_ANALYSIS_SECTIONS[0];
  const ActiveComponent = activeTab.component;

  return (
    <GoalAnalysisContext.Provider value={resource}>
    <MotionConfig reducedMotion={lowMotion ? "always" : "user"}>
    <div data-demo-allow="true" data-section={activeSection} data-active={activeSection} className="goal-analysis-page space-y-4 sm:space-y-5">
      {/* Mobile: hamburger dropdown */}
      <div className="goal-analysis-mobile-nav relative sm:hidden" onKeyDown={event => { if (event.key === "Escape") setMenuOpen(false); }}>
        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-expanded={menuOpen}
          aria-label="Goal Analysis section"
          className="flex w-full items-center justify-between gap-2 rounded-2xl border border-amber-100/10 bg-black/20 px-4 py-2.5 text-sm font-semibold text-amber-300 shadow-xl shadow-black/25 backdrop-blur"
        >
          <span className="flex min-w-0 items-center gap-2">
            <span className="text-base leading-none">{activeTab.icon}</span>
            <span className="min-w-0 truncate">{activeTab.label}</span>
          </span>
          <svg className="h-4 w-4 shrink-0 text-stone-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
            <div className="absolute left-0 right-0 top-full z-50 mt-1.5 rounded-2xl border border-amber-100/10 bg-stone-950/95 p-1.5 shadow-2xl shadow-black/50 backdrop-blur">
              {GOAL_ANALYSIS_SECTIONS.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => { setActiveSection(section.id); setMenuOpen(false); }}
                  aria-pressed={activeSection === section.id}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                    activeSection === section.id
                      ? "bg-amber-500/15 text-amber-300"
                      : "text-stone-400 hover:bg-white/5 hover:text-stone-200"
                  }`}
                >
                  <span className="text-base leading-none">{section.icon}</span>
                  {section.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Desktop: horizontal scrollable nav */}
      <nav className="hidden w-full overflow-x-auto rounded-2xl border border-amber-100/10 bg-white/6 p-1.5 shadow-xl shadow-black/25 backdrop-blur scrollbar-none sm:flex sm:items-center sm:gap-1">
        {GOAL_ANALYSIS_SECTIONS.map((section) => {
          const isActive = activeSection === section.id;
          return (
            <Motion.button
              key={section.id}
              type="button"
              onClick={() => setActiveSection(section.id)}
              whileTap={{ scale: 0.98 }}
              aria-pressed={isActive}
              className="dashboard-section-tab flex min-w-[7rem] flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-semibold"
            >
              <span className="text-base leading-none">{section.icon}</span>
              <span className="min-w-0 truncate" title={section.label}>{section.label}</span>
            </Motion.button>
          );
        })}
      </nav>

      <AnimatePresence mode="wait">
        <Motion.div
          key={activeTab.id}
          className="goal-analysis-content"
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
    </GoalAnalysisContext.Provider>
  );
}
