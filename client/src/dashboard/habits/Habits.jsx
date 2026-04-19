import { useState } from "react";
import CreateHabit from "./CreateHabit";
import HabitTracking from "./HabitTracking";
import HabitsNav from "./HabitsNav";
import TodaysHabit from "./TodaysHabit";

export default function Habits() {
  const [activeTab, setActiveTab] = useState("today");
  const streakDays = 7;

  const renderContent = () => {
    if (activeTab === "create") return <CreateHabit />;
    if (activeTab === "track") return <HabitTracking />;
    return <TodaysHabit />;
  };

  return (
    <div className="mx-auto max-w-8xl space-y-4">
      <div className="flex items-center gap-20">
        <div className="flex shrink-0 items-center gap-2 rounded-xl border border-amber-500/25 bg-amber-950/50 px-4 py-2 shadow-lg">
          <div className="text-xl">🔥</div>
          <div className="flex flex-col leading-tight">
            <span className="text-lg font-bold text-amber-400">{streakDays} day streak</span>
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <HabitsNav activeTab={activeTab} onTabChange={setActiveTab} />
        </div>
      </div>

      <div>{renderContent()}</div>
    </div>
  );
}
