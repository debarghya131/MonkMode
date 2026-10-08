import { AnimatePresence, motion as Motion } from "framer-motion";
import { useSearchParams } from "react-router-dom";
import GoalAnalysis from "./goalanalysis/GoalAnalysis";
import GYMAnalysis from "./gymanalysis/GYMAnalysis";
import HabitAnalysis from "./habitanalysis/HabitAnalysis";
import JournalAnalysis from "./journalanalysis/JournalAnalysis";
import ToDoAnalysis from "./todoanalysis/ToDoAnalysis";
import { ANALYTICS_TABS } from "./analysisTabs";

export default function Analytics() {
  const [searchParams] = useSearchParams();
  const activeAnalytics =
    ANALYTICS_TABS.find((tab) => tab.id === searchParams.get("tab")) ?? ANALYTICS_TABS[0];
  const activeTab = activeAnalytics.id;

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
    <div className="analytics-page w-full space-y-3" data-active={activeTab}>
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
