import { AnimatePresence, motion as Motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import api from "../../api/axios";
import useAuth from "../../hooks/useAuth";
import CreateHabit from "./CreateHabit";
import HabitTracking from "./HabitTracking";
import HabitsNav from "./HabitsNav";
import TodaysHabit from "./TodaysHabit";

export default function Habits() {
  const location = useLocation();
  const { isDemoMode } = useAuth();
  const requestedTab = location.state?.tab;
  const initialTab = requestedTab === "today" || requestedTab === "create" || requestedTab === "track"
    ? requestedTab
    : "today";
  const [activeTab, setActiveTab] = useState(initialTab);
  const [consistency, setConsistency] = useState({
    completedToday: 0,
    expectedToday: 0,
    totalCompletedLifetime: 0,
    totalExpectedLifetime: 0,
    lifetimeConsistency: 0
  });

  useEffect(() => {
    if (requestedTab === "today" || requestedTab === "create" || requestedTab === "track") {
      setActiveTab(requestedTab);
    }
  }, [requestedTab]);

  useEffect(() => {
    if (isDemoMode) return;
    let cancelled = false;
    const refreshConsistency = async () => {
      try {
        const res = await api.get("/habits/consistency");
        if (cancelled) return;
        setConsistency({
          completedToday: Number(res?.data?.completedToday || 0),
          expectedToday: Number(res?.data?.expectedToday || 0),
          totalCompletedLifetime: Number(res?.data?.totalCompletedLifetime || 0),
          totalExpectedLifetime: Number(res?.data?.totalExpectedLifetime || 0),
          lifetimeConsistency: Number(res?.data?.lifetimeConsistency || 0)
        });
      } catch {
        // keep existing values
      }
    };

    refreshConsistency();
    const intervalId = window.setInterval(refreshConsistency, 60 * 1000);
    window.addEventListener("focus", refreshConsistency);
    window.addEventListener("monkmode:habits-updated", refreshConsistency);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshConsistency);
      window.removeEventListener("monkmode:habits-updated", refreshConsistency);
    };
  }, [isDemoMode]);

  const renderContent = () => {
    if (activeTab === "create") return <CreateHabit />;
    if (activeTab === "track") return <HabitTracking />;
    return <TodaysHabit />;
  };

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-6">
        <Motion.div
          className="flex w-full items-center gap-2 rounded-xl border border-amber-500/25 bg-amber-950/50 px-4 py-2.5 shadow-lg md:w-auto md:min-w-[265px] md:shrink-0"
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          whileHover={{ boxShadow: "0 0 20px rgba(251,191,36,0.25)" }}
        >
          <Motion.div
            className="text-xl"
            animate={{ scale: [1, 1.25, 1] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          >📊</Motion.div>
          <div className="flex flex-col">
            <span className="text-base font-bold text-amber-400 sm:text-lg">
              Consistency {isDemoMode ? "--" : `${consistency.lifetimeConsistency}%`}
            </span>
            {isDemoMode ? (
              <span className="text-[11px] text-amber-200/80">Demo mode</span>
            ) : (
              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
                <span
                  title="Today uses active habits only."
                  className="rounded-full border border-amber-100/20 bg-black/20 px-2 py-0.5 text-amber-100/90"
                >
                  Today {consistency.completedToday}/{consistency.expectedToday}
                </span>
                <span
                  title="Lifetime uses all-time historical habits."
                  className="rounded-full border border-amber-100/20 bg-black/20 px-2 py-0.5 text-amber-100/90"
                >
                  Lifetime {consistency.totalCompletedLifetime}/{consistency.totalExpectedLifetime}
                </span>
              </div>
            )}
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
