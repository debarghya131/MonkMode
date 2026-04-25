import { AnimatePresence, motion as Motion } from "framer-motion";
import { useState } from "react";
import MoodAnalysis from "./MoodAnalysis";
import ScoreStreakAnalysis from "./ScoreStreakAnalysis";
import SleepEnergyAnalysis from "./SleepEnergyAnalysis";
import WinMissDistracAchivAnalysis from "./WinMissDistracAchivAnalysis";

const JOURNAL_ANALYSIS_SECTIONS = [
  { id: "mood", label: "Mood", icon: "🙂", component: MoodAnalysis },
  { id: "sleep-energy", label: "Sleep & Energy", icon: "🌙", component: SleepEnergyAnalysis },
  {
    id: "wins-mistake-achievement-distraction",
    label: "Wins | Mistake | Achievement | Distraction",
    icon: "📘",
    component: WinMissDistracAchivAnalysis,
  },
  { id: "score-streak", label: "Score & Streak", icon: "🔥", component: ScoreStreakAnalysis },
];

export default function JournalAnalysis() {
  const [activeSection, setActiveSection] = useState(JOURNAL_ANALYSIS_SECTIONS[0].id);
  const activeTab =
    JOURNAL_ANALYSIS_SECTIONS.find((section) => section.id === activeSection) ??
    JOURNAL_ANALYSIS_SECTIONS[0];
  const ActiveComponent = activeTab.component;

  return (
    <div className="space-y-5">
      <nav className="flex w-full flex-wrap items-center gap-1.5 rounded-2xl border border-amber-100/10 bg-black/20 p-1.5">
        {JOURNAL_ANALYSIS_SECTIONS.map((section) => {
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
              className={`flex min-w-fit flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
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
