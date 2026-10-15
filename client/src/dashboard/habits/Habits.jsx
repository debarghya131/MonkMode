import { AnimatePresence, motion as Motion } from "framer-motion";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import api from "../../api/axios";
import useAuth from "../../hooks/useAuth";
import useMobileLowMotion from "../../hooks/useMobileLowMotion";
import HabitsNav from "./HabitsNav";
import { HABIT_TABS } from "./habitTabs";
import { HabitContext } from "./habitContext";
import { buildDemoHabits, DEFAULT_HABIT_TIMEZONE, habitClock } from "./habitUtils";
import { validHabitConsistency, habitFailureMessage } from "./habitResponse";

const loadToday = () => import("./TodaysHabit");
const loadCreate = () => import("./CreateHabit");
const loadTrack = () => import("./HabitTracking");
const viewLoaders = { today: loadToday, create: loadCreate, track: loadTrack };
const TodaysHabit = lazy(loadToday);
const CreateHabit = lazy(loadCreate);
const HabitTracking = lazy(loadTrack);

export default function Habits() {
  const { isDemoMode, user } = useAuth();
  return <HabitContent key={isDemoMode ? "demo" : user?.id || "guest"} />;
}

function HabitContent() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isDemoMode } = useAuth();
  const lowMotion = useMobileLowMotion();
  const [timezone, setTimezone] = useState(DEFAULT_HABIT_TIMEZONE);
  const [tick, setTick] = useState(Date.now());
  const [clockSkew, setClockSkew] = useState(0);
  const [ready, setReady] = useState(isDemoMode);
  const [summaryError, setSummaryError] = useState("");
  const [retry, setRetry] = useState(0);
  const requestController = useRef(new AbortController());
  const clock = habitClock(new Date(tick + clockSkew), timezone);
  const previousDay = useRef(clock.date);
  const [demoHabits, setDemoHabits] = useState(() => buildDemoHabits(clock.date));
  const [demoCategories, setDemoCategories] = useState([]);
  useEffect(() => {
    setDemoHabits(buildDemoHabits(clock.date));
  }, [clock.date]);
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
  useEffect(() => {
    void viewLoaders[activeTab]?.();
  }, [activeTab]);
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
    let version = 0;
    let summaryController;
    const refreshConsistency = async () => {
      summaryController?.abort();
      summaryController = new AbortController();
      const controller = summaryController;
      const current = ++version;
      try {
        const res = await api.get("/habits/consistency", { signal: controller.signal, timeout: 15000 });
        if (cancelled || current !== version) return;
        if (!validHabitConsistency(res.data)) throw new Error("Invalid habit consistency response");
        const zone = res.data.timezone;
        habitClock(new Date(), zone);
        setTimezone(zone);
        if (Number.isFinite(Date.parse(res.data.serverNow))) setClockSkew(Date.parse(res.data.serverNow) - Date.now());
        setTick(Date.now());
        setConsistency({
          completedToday: Number(res?.data?.completedToday || 0),
          expectedToday: Number(res?.data?.expectedToday || 0),
          totalCompletedLifetime: Number(res?.data?.totalCompletedLifetime || 0),
          totalExpectedLifetime: Number(res?.data?.totalExpectedLifetime || 0),
          lifetimeConsistency: Number(res?.data?.lifetimeConsistency || 0)
        });
        setReady(true);
        setSummaryError("");
      } catch (error) {
        if (!cancelled && current === version && !controller.signal.aborted) setSummaryError(habitFailureMessage(error, "Could not load habit consistency and app date. Please retry. Last loaded values, if any, are still shown."));
      }
    };

    refreshConsistency();
    const intervalId = window.setInterval(refreshConsistency, 60 * 1000);
    window.addEventListener("focus", refreshConsistency);
    window.addEventListener("monkmode:habits-updated", refreshConsistency);

    return () => {
      cancelled = true;
      summaryController?.abort();
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshConsistency);
      window.removeEventListener("monkmode:habits-updated", refreshConsistency);
    };
  }, [isDemoMode, retry]);

  useEffect(() => {
    if (previousDay.current !== clock.date) { previousDay.current = clock.date; setRetry(value => value + 1); }
  }, [clock.date]);

  useEffect(() => {
    requestController.current = new AbortController();
    const update = () => setTick(Date.now());
    const timer = window.setInterval(update, 15000);
    window.addEventListener("focus", update);
    return () => { requestController.current.abort(); window.clearInterval(timer); window.removeEventListener("focus", update); };
  }, []);

  const renderContent = () => {
    if (activeTab === "create") return <CreateHabit />;
    if (activeTab === "track") return <HabitTracking />;
    return <TodaysHabit key={clock.date} consistency={consistency} />;
  };

  return (
    <HabitContext.Provider value={{ clock, timezone, demoHabits, setDemoHabits, demoCategories, setDemoCategories, requestSignal: requestController.current.signal }}>
    <div className="habits-page w-full space-y-4" data-active={activeTab}>
      <div className="habits-top-row hidden flex-col gap-3 sm:flex md:flex-row md:items-center md:gap-6">
        <div className="w-full min-w-0 flex-1">
          <HabitsNav activeTab={activeTab} onTabChange={changeActiveTab} onPrefetch={(tab) => viewLoaders[tab]?.()} />
        </div>
      </div>

      {summaryError && <div role="alert" className="rounded-xl border border-rose-400/25 bg-rose-950/20 p-3 text-sm text-rose-200">{summaryError} <button type="button" className="ml-2 underline" onClick={() => setRetry(value => value + 1)}>Retry statistics</button></div>}
      {!ready ? <p className="p-6 text-sm text-stone-400">{summaryError ? "Habit data is unavailable until the app date loads." : "Loading your habits..."}</p> : (
        <Suspense fallback={<p role="status" className="p-6 text-sm text-stone-400">Loading {activeTab === "create" ? "habit editor" : activeTab === "track" ? "habit tracking" : "today's habits"}…</p>}>
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
        </Suspense>
      )}
    </div>
    </HabitContext.Provider>
  );
}
