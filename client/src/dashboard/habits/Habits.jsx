import { AnimatePresence, motion as Motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import api from "../../api/axios";
import useAuth from "../../hooks/useAuth";
import useMobileLowMotion from "../../hooks/useMobileLowMotion";
import CreateHabit from "./CreateHabit";
import HabitTracking from "./HabitTracking";
import HabitsNav from "./HabitsNav";
import TodaysHabit from "./TodaysHabit";
import { HABIT_TABS } from "./habitTabs";

export default function Habits() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isDemoMode } = useAuth();
  const lowMotion = useMobileLowMotion();
  const requestedView = searchParams.get("view");
  const requestedStateTab = location.state?.tab;
  const requestedTab = HABIT_TABS.some((tab) => tab.id === requestedView)
    ? requestedView
    : HABIT_TABS.some((tab) => tab.id === requestedStateTab)
      ? requestedStateTab
      : null;
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
    if (requestedTab) {
      setActiveTab(requestedTab);
      if (!HABIT_TABS.some((tab) => tab.id === requestedView)) {
        setSearchParams((current) => {
          const next = new URLSearchParams(current);
          next.set("view", requestedTab);
          return next;
        }, { replace: true });
      }
    } else {
      setActiveTab("today");
    }
  }, [requestedTab, requestedView, setSearchParams]);

  const changeActiveTab = (tab) => {
    setActiveTab(tab);
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set("view", tab);
      if (tab !== "today") next.delete("habitToday");
      if (tab !== "create") next.delete("habitCreate");
      return next;
    });
  };

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
    return <TodaysHabit consistency={consistency} />;
  };

  return (
    <div className="habits-page w-full space-y-4" data-active={activeTab}>
      <div className="habits-top-row hidden flex-col gap-3 sm:flex md:flex-row md:items-center md:gap-6">
        <div className="w-full min-w-0 flex-1">
          <HabitsNav activeTab={activeTab} onTabChange={changeActiveTab} />
        </div>
      </div>

      {lowMotion ? (
        <div key={activeTab} className="habits-content">{renderContent()}</div>
      ) : (
        <AnimatePresence mode="wait">
          <Motion.div
            key={activeTab}
            className="habits-content"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
          >
            {renderContent()}
          </Motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
