import { AnimatePresence, motion as Motion } from "framer-motion";
import { useState } from "react";
import GoalAnalysis from "./goalanalysis/GoalAnalysis";
import GYMAnalysis from "./gymanalysis/GYMAnalysis";
import HabitAnalysis from "./habitanalysis/HabitAnalysis";
import JournalAnalysis from "./journalanalysis/JournalAnalysis";
import ToDoAnalysis from "./todoanalysis/ToDoAnalysis";

const ANALYTICS_TABS = [
  { id: "journal", icon: "📝", label: "Journal Analysis" },
  { id: "todo", icon: "✓", label: "To-Do Analysis" },
  { id: "habit", icon: "⚡", label: "Habit Analysis" },
  { id: "goal", icon: "🎯", label: "Goal Analysis" },
  { id: "gym", icon: "💪", label: "GYM Analysis" },
];

export default function Analytics() {
  const [activeTab, setActiveTab] = useState("journal");
  const [menuOpen, setMenuOpen] = useState(false);
  const activeAnalytics =
    ANALYTICS_TABS.find((tab) => tab.id === activeTab) ?? ANALYTICS_TABS[0];

  const renderAnalyticsContent = () => {
    if (activeAnalytics.id === "journal") {
      return <JournalAnalysis />;
    }
    if (activeAnalytics.id === "todo") {
      return <ToDoAnalysis />;
    }
    if (activeAnalytics.id === "habit") {
      return <HabitAnalysis />;
    }
    if (activeAnalytics.id === "goal") {
      return <GoalAnalysis />;
    }
    if (activeAnalytics.id === "gym") {
      return <GYMAnalysis />;
    }

    return (
      <Motion.div
        key={activeAnalytics.id}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.22, ease: "easeInOut" }}
      >
        <p className="text-label-lg">Analysis</p>
        <h2 className="mt-2 text-heading-xl">{activeAnalytics.label} Analytics</h2>
        <p className="mt-4 text-body-md">
          Coming soon - Visualize your {activeAnalytics.label.toLowerCase()} progress with detailed analytics and insights.
        </p>
      </Motion.div>
    );
  };

  return (
    <div className="w-full space-y-3">
      {/* Mobile: hamburger dropdown */}
      <div className="relative sm:hidden" data-demo-allow="true">
        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex w-full items-center justify-between gap-2 rounded-2xl border border-amber-100/10 bg-white/6 px-4 py-2.5 text-sm font-semibold text-amber-300 shadow-xl shadow-black/25 backdrop-blur"
        >
          <span className="flex min-w-0 items-center gap-2">
            <span className="text-base leading-none">{activeAnalytics.icon}</span>
            <span className="min-w-0 truncate">{activeAnalytics.label}</span>
          </span>
          <svg className="h-4 w-4 shrink-0 text-stone-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
            <div className="absolute left-0 right-0 top-full z-50 mt-1.5 rounded-2xl border border-amber-100/10 bg-stone-950/95 p-1.5 shadow-2xl shadow-black/50 backdrop-blur">
              {ANALYTICS_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => { setActiveTab(tab.id); setMenuOpen(false); }}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                    activeTab === tab.id
                      ? "bg-gradient-to-r from-amber-400/20 to-orange-400/15 text-amber-300"
                      : "text-stone-400 hover:bg-white/5 hover:text-stone-200"
                  }`}
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
      <nav data-demo-allow="true" className="hidden sm:flex w-full items-center gap-1 overflow-x-auto rounded-2xl border border-amber-100/10 bg-white/6 p-1.5 shadow-xl shadow-black/25 backdrop-blur scrollbar-none">
        {ANALYTICS_TABS.map((tab) => {
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
              className={`flex min-w-[7rem] flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors duration-200 ${
                isActive
                  ? "border border-amber-400/30 bg-gradient-to-r from-amber-400/20 to-orange-400/15 text-amber-300"
                  : "border border-transparent text-stone-400 hover:text-amber-200"
              }`}
            >
              <span className="text-base leading-none">{tab.icon}</span>
              <span>{tab.label}</span>
            </Motion.button>
          );
        })}
      </nav>

      {activeAnalytics.id === "journal" ||
      activeAnalytics.id === "todo" ||
      activeAnalytics.id === "habit" ||
      activeAnalytics.id === "goal" ||
      activeAnalytics.id === "gym" ? (
        <AnimatePresence mode="wait">{renderAnalyticsContent()}</AnimatePresence>
      ) : (
        <div className="rounded-[2rem] border border-amber-100/10 bg-white/6 p-8 shadow-2xl shadow-black/25 backdrop-blur">
          <AnimatePresence mode="wait">{renderAnalyticsContent()}</AnimatePresence>
        </div>
      )}
    </div>
  );
}
