import { AnimatePresence, motion as Motion } from "framer-motion";
import { useState } from "react";
import JournalAnalysis from "./journalanalysis/JournalAnalysis";

const ANALYTICS_TABS = [
  { id: "journal", icon: "📝", label: "Journal Analysis" },
  { id: "todo", icon: "✓", label: "To-Do Analysis" },
  { id: "habit", icon: "⚡", label: "Habit Analysis" },
  { id: "goal", icon: "🎯", label: "Goal Analysis" },
  { id: "gym", icon: "💪", label: "GYM Analysis" },
];

export default function Analytics() {
  const [activeTab, setActiveTab] = useState("journal");
  const activeAnalytics =
    ANALYTICS_TABS.find((tab) => tab.id === activeTab) ?? ANALYTICS_TABS[0];

  const renderAnalyticsContent = () => {
    if (activeAnalytics.id === "journal") {
      return <JournalAnalysis />;
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
    <div className="mx-auto max-w-8xl space-y-3">
      <nav className="flex w-full items-center gap-1 rounded-2xl border border-amber-100/10 bg-white/6 p-1.5 shadow-xl shadow-black/25 backdrop-blur">
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
              className={`flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors duration-200 ${
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

      {activeAnalytics.id === "journal" ? (
        <AnimatePresence mode="wait">{renderAnalyticsContent()}</AnimatePresence>
      ) : (
        <div className="rounded-[2rem] border border-amber-100/10 bg-white/6 p-8 shadow-2xl shadow-black/25 backdrop-blur">
          <AnimatePresence mode="wait">{renderAnalyticsContent()}</AnimatePresence>
        </div>
      )}
    </div>
  );
}
