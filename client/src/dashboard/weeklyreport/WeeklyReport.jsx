import { AnimatePresence, motion as Motion } from "framer-motion";
import { useState } from "react";
import GYMWeeklyReport from "./GYMWeeklyReport";
import GoalWeeklyReport from "./GoalWeeklyReport";
import HabitWeeklyReport from "./HabitWeeklyReport";
import JournalWeeklyReport from "./JournalWeeklyReport";
import ToDoWeeklyReport from "./ToDoWeeklyReport";

const REPORT_TABS = [
  { id: "journal", icon: "📝", label: "Journal", component: <JournalWeeklyReport /> },
  { id: "todo", icon: "✓", label: "ToDo", component: <ToDoWeeklyReport /> },
  { id: "habits", icon: "⚡", label: "Habits", component: <HabitWeeklyReport /> },
  { id: "goals", icon: "🎯", label: "Goals", component: <GoalWeeklyReport /> },
  { id: "gym", icon: "💪", label: "GYM", component: <GYMWeeklyReport /> },
];

export default function WeeklyReport() {
  const [activeTab, setActiveTab] = useState("journal");
  const activeReport = REPORT_TABS.find((tab) => tab.id === activeTab) ?? REPORT_TABS[0];

  return (
    <div className="mx-auto max-w-8xl space-y-4">
      <nav className="flex items-center gap-1 w-full rounded-2xl border border-amber-100/10 bg-white/6 p-1.5 shadow-xl shadow-black/25 backdrop-blur">
        {REPORT_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <Motion.button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              whileHover={!isActive ? { scale: 1.03, backgroundColor: "rgba(255,255,255,0.06)" } : {}}
              whileTap={{ scale: 0.97 }}
              animate={
                isActive
                  ? { boxShadow: "0 0 18px rgba(251,191,36,0.22)" }
                  : { boxShadow: "0 0 0px rgba(251,191,36,0)" }
              }
              transition={{ duration: 0.2 }}
              className={`flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors duration-200 ${
                isActive
                  ? "bg-gradient-to-r from-amber-400/20 to-orange-400/15 border border-amber-400/30 text-amber-300"
                  : "border border-transparent text-stone-400 hover:text-amber-200"
              }`}
            >
              <span className="text-base leading-none">{tab.icon}</span>
              {tab.label}
            </Motion.button>
          );
        })}
      </nav>

      <div className="mt-6">
        <AnimatePresence mode="wait">
          <Motion.div
            key={activeReport.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
          >
            {activeReport.component}
          </Motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
