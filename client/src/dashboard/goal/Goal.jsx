import { useState } from "react";
import { GOALS } from "./goalDemoData";
import CreateGoal from "./CreateGoal";
import GoalNav from "./GoalNav";
import Mygoals from "./Mygoals";
import Progress from "./Progress";

export default function Goal() {
  const [activeTab, setActiveTab] = useState("my-goals");
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
      <div>{renderContent()}</div>
    </div>
  );
}
