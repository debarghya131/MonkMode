import { AnimatePresence, MotionConfig, motion as Motion } from "framer-motion";
import { useState } from "react";
import useMobileLowMotion from "../../hooks/useMobileLowMotion";
import GYMWeeklyReport from "./GYMWeeklyReport";
import GoalWeeklyReport from "./GoalWeeklyReport";
import HabitWeeklyReport from "./HabitWeeklyReport";
import JournalWeeklyReport from "./JournalWeeklyReport";
import ToDoWeeklyReport from "./ToDoWeeklyReport";

const REPORT_TABS = [
  { id: "journal", icon: "📝", label: "Journal", Component: JournalWeeklyReport },
  { id: "todo", icon: "✓", label: "ToDo", Component: ToDoWeeklyReport },
  { id: "habits", icon: "⚡", label: "Habits", Component: HabitWeeklyReport },
  { id: "goals", icon: "🎯", label: "Goals", Component: GoalWeeklyReport },
  { id: "gym", icon: "💪", label: "GYM", Component: GYMWeeklyReport },
];

export default function WeeklyReport() {
  const lowMotion = useMobileLowMotion();
  const [activeTab, setActiveTab] = useState("journal");
  const [menuOpen, setMenuOpen] = useState(false);
  const activeReport = REPORT_TABS.find((tab) => tab.id === activeTab) ?? REPORT_TABS[0];
  const ActiveReport = activeReport.Component;

  return (
    <MotionConfig reducedMotion={lowMotion ? "always" : "user"}>
    <div
      className="weekly-report-page w-full space-y-4 lg:-mt-6 xl:-mt-8"
      data-active={activeTab}
      data-low-motion={lowMotion ? "true" : "false"}
    >
      {/* Mobile: hamburger dropdown */}
      <div className="weekly-report-mobile-nav relative sm:hidden" data-demo-allow="true">
        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          className="dashboard-section-trigger flex w-full items-center justify-between gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold shadow-xl shadow-black/25"
        >
          <span className="flex items-center gap-2">
            <span className="text-base leading-none">{activeReport.icon}</span>
            <span>{activeReport.label}</span>
          </span>
          <svg className="h-4 w-4 shrink-0 text-stone-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
            <div className="absolute left-0 right-0 top-full z-50 mt-1.5 rounded-2xl border border-amber-100/10 bg-stone-950/95 p-1.5 shadow-2xl shadow-black/50 backdrop-blur">
              {REPORT_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => { setActiveTab(tab.id); setMenuOpen(false); }}
                  aria-pressed={activeTab === tab.id}
                  className="dashboard-section-tab flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold"
                >
                  <span className="text-base leading-none">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Desktop: horizontal scrollable nav */}
      <nav data-demo-allow="true" className="weekly-report-nav hidden sm:flex items-center gap-1 w-full overflow-x-auto rounded-2xl border border-amber-100/10 bg-white/6 p-1.5 shadow-xl shadow-black/25 backdrop-blur scrollbar-none">
        {REPORT_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              aria-pressed={activeTab === tab.id}
              className="dashboard-section-tab flex min-w-[6rem] flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-semibold"
            >
              <span className="text-base leading-none">{tab.icon}</span>
              {tab.label}
            </button>
        ))}
      </nav>

      <div className="weekly-report-content mt-6">
        {lowMotion ? (
          <div key={activeReport.id} className="weekly-report-active-panel">
            <ActiveReport lowMotion={lowMotion} />
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <Motion.div
              key={activeReport.id}
              className="weekly-report-active-panel"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: "easeInOut" }}
            >
              <ActiveReport lowMotion={lowMotion} />
            </Motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
    </MotionConfig>
  );
}
