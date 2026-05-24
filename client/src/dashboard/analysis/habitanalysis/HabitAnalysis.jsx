import { AnimatePresence, motion as Motion } from "framer-motion";
import { useState } from "react";
import CategPrioTimeAnalysis from "./CategPrioTimeAnalysis";
import ComplationMissAnalysis from "./ComplationMissAnalysis";
import ScoreStreakAnalysis from "./ScoreStreakAnalysis";

const HABIT_ANALYSIS_SECTIONS = [
  {
    id: "completion-miss",
    label: "Completion & Miss Analysis",
    icon: "✓",
    component: ComplationMissAnalysis,
  },
  {
    id: "category-priority-time",
    label: "Category | Priority | Time of Day Analysis",
    icon: "📊",
    component: CategPrioTimeAnalysis,
  },
  {
    id: "streak-score",
    label: "Streak & Score",
    icon: "🔥",
    component: ScoreStreakAnalysis,
  },
];

export default function HabitAnalysis() {
  const [activeSection, setActiveSection] = useState(HABIT_ANALYSIS_SECTIONS[0].id);
  const [menuOpen, setMenuOpen] = useState(false);
  const activeTab =
    HABIT_ANALYSIS_SECTIONS.find((section) => section.id === activeSection) ??
    HABIT_ANALYSIS_SECTIONS[0];
  const ActiveComponent = activeTab.component;

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Mobile: hamburger dropdown */}
      <div className="relative sm:hidden">
        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
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
              {HABIT_ANALYSIS_SECTIONS.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => { setActiveSection(section.id); setMenuOpen(false); }}
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
      <nav className="hidden sm:flex w-full items-center gap-1.5 overflow-x-auto rounded-2xl border border-amber-100/10 bg-black/20 p-1.5 scrollbar-none">
        {HABIT_ANALYSIS_SECTIONS.map((section) => {
          const isActive = activeSection === section.id;
          return (
            <Motion.button
              key={section.id}
              type="button"
              onClick={() => setActiveSection(section.id)}
              whileHover={!isActive ? { scale: 1.01, boxShadow: "0 0 14px rgba(251,191,36,0.14)" } : {}}
              whileTap={{ scale: 0.98 }}
              animate={
                isActive
                  ? { boxShadow: "0 0 14px rgba(251,191,36,0.16)" }
                  : { boxShadow: "0 0 0px rgba(251,191,36,0)" }
              }
              transition={{ duration: 0.2 }}
              className={`relative flex min-w-[7rem] items-center justify-center gap-2 overflow-hidden whitespace-nowrap rounded-xl px-3 py-2 text-xs font-semibold transition-colors md:flex-1 ${
                isActive
                  ? "border border-amber-300/30 bg-amber-500/15 text-amber-100"
                  : "border border-transparent text-stone-400 hover:text-stone-200"
              }`}
            >
              {!isActive && (
                <Motion.span
                  className="pointer-events-none absolute inset-y-0 left-[-40%] w-[30%] -skew-x-12 bg-white/20 blur-sm"
                  animate={{ left: ["-40%", "130%"] }}
                  transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 1.5, ease: "easeInOut" }}
                />
              )}
              <span className="relative z-10 text-sm leading-none">{section.icon}</span>
              <span className="relative z-10 text-center">{section.label}</span>
            </Motion.button>
          );
        })}
      </nav>

      <AnimatePresence mode="wait">
        <Motion.div
          key={activeTab.id}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.22, ease: "easeInOut" }}
        >
          <ActiveComponent />
        </Motion.div>
      </AnimatePresence>
    </div>
  );
}
