import { AnimatePresence, motion as Motion } from "framer-motion";
import { useState } from "react";
import { useLocation } from "react-router-dom";
import { GOALS } from "./goalDemoData";
import CreateGoal from "./CreateGoal";
import GoalNav from "./GoalNav";
import Mygoals from "./Mygoals";
import Progress from "./Progress";

const GOAL_TABS = new Set(["my-goals", "create-goals", "progress"]);

export default function Goal() {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(location.search);
    const requestedTab = params.get("tab") || location.state?.tab;
    return GOAL_TABS.has(requestedTab) ? requestedTab : "my-goals";
  });
  const [importantByGoal, setImportantByGoal] = useState({ "gate-2027": true });
  const [milestonesByGoal, setMilestonesByGoal] = useState(() =>
    Object.fromEntries(GOALS.map((goal) => [goal.id, goal.milestones]))
  );

  const renderContent = () => {
    if (activeTab === "create-goals") return <CreateGoal />;
    if (activeTab === "progress")
      return (
        <Progress
          importantByGoal={importantByGoal}
          milestonesByGoal={milestonesByGoal}
        />
      );
    return (
      <Mygoals
        importantByGoal={importantByGoal}
        setImportantByGoal={setImportantByGoal}
        milestonesByGoal={milestonesByGoal}
        setMilestonesByGoal={setMilestonesByGoal}
      />
    );
  };

  return (
    <div className="mx-auto max-w-8xl space-y-4">
      <div className="min-w-0 flex-1">
        <GoalNav activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
      <AnimatePresence mode="wait">
        <Motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.22, ease: "easeInOut" }}
        >
          {renderContent()}
        </Motion.div>
      </AnimatePresence>
    </div>
  );
}
