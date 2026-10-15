import { AnimatePresence, motion as Motion } from "framer-motion";
import { lazy, Suspense, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import ToDoNavbar from "./ToDoNavbar";
import { TODO_TABS } from "./todoTabs";
import useTodoData from "./useTodoData";
import { shiftTodoDay, todoClock } from "./todoUtils";
import useAuth from "../../hooks/useAuth";
import useMobileLowMotion from "../../hooks/useMobileLowMotion";

const loadToday = () => import("./Today");
const loadUpcoming = () => import("./Upcomming");
const loadSchedule = () => import("./Schedule");
const loadImportant = () => import("./Important");
const viewLoaders = { today: loadToday, upcoming: loadUpcoming, schedule: loadSchedule, important: loadImportant };
const Today = lazy(loadToday);
const Upcomming = lazy(loadUpcoming);
const Schedule = lazy(loadSchedule);
const Important = lazy(loadImportant);


function createDemoTasks(today) {
  const addDaysISO = offset => shiftTodoDay(today, offset);
  return [
  {
    id: "demo-task-1",
    title: "Morning Run",
    description: "30-minute cardio with cooldown stretch.",
    category: "Health",
    priority: "High",
    repeatType: "daily",
    startDate: addDaysISO(0),
    endDate: null,
    time: "06:30",
  },
  {
    id: "demo-task-2",
    title: "Pay Credit Card Bill",
    description: "Pay before due time to avoid late fee.",
    category: "Bill & Payment",
    priority: "High",
    repeatType: "once",
    date: addDaysISO(0),
    time: "10:30",
  },
  {
    id: "demo-task-3",
    title: "Read System Design",
    description: "Focus on caching and load balancing chapter.",
    category: "Study",
    priority: "Medium",
    repeatType: "weekdays",
    startDate: addDaysISO(0),
    endDate: addDaysISO(10),
    days: ["Mon", "Wed", "Fri"],
    time: "20:00",
  },
  {
    id: "demo-task-4-archived",
    title: "Submit Weekly Reflection",
    description: "Write and submit your weekly report notes.",
    category: "Work",
    priority: "Low",
    repeatType: "once",
    date: addDaysISO(-1),
    time: "18:15",
  },
  ];
}

export default function Todo() {
  const { isDemoMode, user } = useAuth();
  return <TodoContent key={`${isDemoMode ? "demo" : "real"}:${user?.id || "guest"}`} />;
}

function TodoContent() {
  const { isDemoMode } = useAuth();
  const lowMotion = useMobileLowMotion();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedView = searchParams.get("view");
  const active = TODO_TABS.some((tab) => tab.id === requestedView) ? requestedView : "today";
  useEffect(() => {
    void viewLoaders[active]?.();
  }, [active]);
  const setActive = (view) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set("view", view);
      next.delete("today");
      next.delete("upcoming");
      next.delete("schedule");
      next.delete("important");
      return next;
    });
  };
  const demoDay = todoClock().date;
  const demoTasks = useMemo(() => createDemoTasks(demoDay), [demoDay]);
  const data = useTodoData(isDemoMode, demoTasks);
  const { tasks, setTasks, consistency, categoryOptions, setCategoryOptions, importantCategories, setImportantCategories, refreshTasks, clock, timezone } = data;

  const section = {
    today: <Today key={clock.date} lowMotion={lowMotion} consistency={consistency} tasks={data.todayTasks} clock={clock} onUpdateStatus={data.updateStatus} busyIds={data.busyIds} />,
    upcoming: <Upcomming lowMotion={lowMotion} tasks={tasks} clock={clock} timezone={timezone} />,
    schedule: (
      <Schedule
        requestSignal={data.requestSignal}
        clock={clock}
        timezone={timezone}
        tasks={tasks}
        setTasks={setTasks}
        categoryOptions={categoryOptions}
        setCategoryOptions={setCategoryOptions}
        importantCategories={importantCategories}
        setImportantCategories={setImportantCategories}
        refreshTasks={refreshTasks}
      />
    ),
    important: (
      <Important
        clock={clock}
        timezone={timezone}
        tasks={tasks}
        importantCategories={importantCategories}
        setImportantCategories={setImportantCategories}
      />
    ),
  };

  return (
    <div className="todo-page w-full" data-active={active}>

      {/* Desktop navigation; compact screens use the expandable sidebar. */}
      <div className="todo-top-row">
        <div className="hidden w-full min-w-0 flex-1 lg:block">
          <ToDoNavbar active={active} onChange={setActive} onPrefetch={(view) => viewLoaders[view]?.()} />
        </div>
      </div>

      {(data.error || data.preferencesError) && (
        <div role="alert" className="mb-3 rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-200">
          <p>{data.error || data.preferencesError}</p>
          <button type="button" className="mt-2 underline" data-demo-allow="true" onClick={data.error ? refreshTasks : data.retryPreferences}>Retry</button>
        </div>
      )}
      {data.loading && !data.ready && <p role="status" className="p-6 text-sm text-stone-400">Loading tasks and account settings…</p>}

      {/* CONTENT */}
      {data.ready && (
        <Suspense fallback={<p role="status" className="p-6 text-sm text-stone-400">Loading {active} tasks…</p>}>
          {lowMotion ? (
            <div key={active} className="todo-content">{section[active]}</div>
          ) : (
            <AnimatePresence mode="wait">
              <Motion.div
                key={active}
                className="todo-content"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22, ease: "easeInOut" }}
              >
                {section[active]}
              </Motion.div>
            </AnimatePresence>
          )}
        </Suspense>
      )}

    </div>
  );
}
