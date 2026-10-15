import { AnimatePresence, motion as Motion } from "framer-motion";
import { lazy, Suspense } from "react";
import { useSearchParams } from "react-router-dom";
import { ANALYTICS_TABS } from "./analysisTabs";

// Only download the analysis section the visitor opens. Each section retains
// its own loading/data lifecycle; switching tabs does not fetch the others.
const analysisComponents = {
  journal: lazy(() => import("./journalanalysis/JournalAnalysis")),
  todo: lazy(() => import("./todoanalysis/ToDoAnalysis")),
  habit: lazy(() => import("./habitanalysis/HabitAnalysis")),
  goal: lazy(() => import("./goalanalysis/GoalAnalysis")),
  gym: lazy(() => import("./gymanalysis/GYMAnalysis")),
};

export default function Analytics() {
  const [searchParams] = useSearchParams();
  const activeAnalytics =
    ANALYTICS_TABS.find((tab) => tab.id === searchParams.get("tab")) ?? ANALYTICS_TABS[0];
  const activeTab = activeAnalytics.id;
  const ActiveComponent = analysisComponents[activeTab];

  const renderAnalyticsContent = () => {
    if (ActiveComponent) {
      return <Suspense fallback={<div role="status" className="rounded-2xl border border-white/10 p-6 text-stone-300">Loading analysis…</div>}>
        <ActiveComponent />
      </Suspense>;
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
