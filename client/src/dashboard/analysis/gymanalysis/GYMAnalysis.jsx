import { AnimatePresence, motion as Motion } from "framer-motion";
import { useState } from "react";
import WorkoutPerformanceAnalysis from "./WorkoutPerformanceAnalysis";
import StrengthProgressAnalysis from "./StrengthProgressAnalysis";
import MeasurementsAnalysis from "./MeasurementsAnalysis";
import NutritionConsistencyAnalysis from "./NutritionConsistencyAnalysis";

const GYM_ANALYSIS_SECTIONS = [
  { id: "workout-performance", label: "Workout Performance", icon: "💪", component: WorkoutPerformanceAnalysis },
  { id: "strength-progress", label: "Strength Progress", icon: "📈", component: StrengthProgressAnalysis },
  { id: "measurements", label: "Body Measurements", icon: "📏", component: MeasurementsAnalysis },
  { id: "nutrition-consistency", label: "Nutrition & Consistency", icon: "🥗", component: NutritionConsistencyAnalysis },
];

export default function GYMAnalysis() {
  const [activeSection, setActiveSection] = useState(GYM_ANALYSIS_SECTIONS[0].id);
  const [menuOpen, setMenuOpen] = useState(false);
  const activeTab =
    GYM_ANALYSIS_SECTIONS.find((section) => section.id === activeSection) ?? GYM_ANALYSIS_SECTIONS[0];
  const ActiveComponent = activeTab.component;

  return (
    <div className="space-y-5">
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
              {GYM_ANALYSIS_SECTIONS.map((section) => (
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
        {GYM_ANALYSIS_SECTIONS.map((section) => {
          const isActive = activeSection === section.id;
          return (
            <Motion.button
              key={section.id}
              type="button"
              onClick={() => setActiveSection(section.id)}
              whileHover={!isActive ? { scale: 1.01 } : {}}
              whileTap={{ scale: 0.98 }}
              animate={
                isActive
                  ? { boxShadow: "0 0 14px rgba(251,191,36,0.16)" }
                  : { boxShadow: "0 0 0px rgba(251,191,36,0)" }
              }
              transition={{ duration: 0.2 }}
              className={`flex min-w-[7rem] flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
                isActive
                  ? "border border-amber-300/30 bg-amber-500/15 text-amber-100"
                  : "border border-transparent text-stone-400 hover:text-stone-200"
              }`}
            >
              <span className="text-sm leading-none">{section.icon}</span>
              <span className="text-center">{section.label}</span>
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
