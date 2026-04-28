import { AnimatePresence, motion as Motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import CreateHabit from "./CreateHabit";
import HabitTracking from "./HabitTracking";
import HabitsNav from "./HabitsNav";
import TodaysHabit from "./TodaysHabit";

export default function Habits() {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("today");
  const streakDays = 7;

  useEffect(() => {
    const requestedTab = location.state?.tab;
    if (requestedTab === "today" || requestedTab === "create" || requestedTab === "track") {
      setActiveTab(requestedTab);
    }
  }, [location.state]);

  const renderContent = () => {
    if (activeTab === "create") return <CreateHabit />;
    if (activeTab === "track") return <HabitTracking />;
    return <TodaysHabit />;
  };

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-6">
        <Motion.div
          className="flex w-full items-center gap-2 rounded-xl border border-amber-500/25 bg-amber-950/50 px-4 py-2 shadow-lg md:w-auto md:shrink-0"
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          whileHover={{ boxShadow: "0 0 20px rgba(251,191,36,0.25)" }}
        >
          <Motion.div
            className="text-xl"
            animate={{ scale: [1, 1.25, 1] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          >🔥</Motion.div>
          <div className="flex flex-col leading-tight">
            <span className="text-base font-bold text-amber-400 sm:text-lg">{streakDays} day streak</span>
          </div>
        </Motion.div>
        <div className="w-full min-w-0 flex-1">
          <HabitsNav activeTab={activeTab} onTabChange={setActiveTab} />
        </div>
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
