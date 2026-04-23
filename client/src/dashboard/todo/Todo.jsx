import { AnimatePresence, motion as Motion } from "framer-motion";
import { useState } from "react";
import ToDoNavbar from "./ToDoNavbar";
import Today from "./Today";
import Upcomming from "./Upcomming";
import Schedule from "./Schedule";
import Important from "./Important";
import { DEFAULT_CATEGORIES, DEFAULT_IMPORTANT_CATEGORIES } from "./todoShared";

const toISODate = (dateObj) => {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const day = String(dateObj.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const addDaysISO = (offsetDays) => {
  const dateObj = new Date();
  dateObj.setDate(dateObj.getDate() + offsetDays);
  return toISODate(dateObj);
};

const DEMO_TASKS = [
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

export default function Todo() {
  const [active, setActive] = useState("today");
  const [tasks, setTasks] = useState(DEMO_TASKS);
  const [categoryOptions, setCategoryOptions] = useState(DEFAULT_CATEGORIES);
  const [importantCategories, setImportantCategories] = useState(DEFAULT_IMPORTANT_CATEGORIES);

  const streak = { current: 6, best: 12 };

  const section = {
    today:     <Today />,
    upcoming:  <Upcomming />,
    schedule: (
      <Schedule
        tasks={tasks}
        setTasks={setTasks}
        categoryOptions={categoryOptions}
        setCategoryOptions={setCategoryOptions}
        importantCategories={importantCategories}
        setImportantCategories={setImportantCategories}
      />
    ),
    important: (
      <Important
        tasks={tasks}
        categoryOptions={categoryOptions}
        setCategoryOptions={setCategoryOptions}
        importantCategories={importantCategories}
        setImportantCategories={setImportantCategories}
      />
    ),
  };

  return (
    <div className="mx-auto max-w-8xl space-y-4">

      {/* TOP ROW — streak + navbar side by side, left-aligned */}
      <div className="flex items-center gap-20">

        {/* STREAK */}
        <Motion.div
          className="flex items-center gap-2 px-4 py-2 rounded-xl shrink-0 bg-amber-950/50 border border-amber-500/25 shadow-lg"
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
            <span className="text-lg font-bold text-amber-400">
              {streak.current} day streak
            </span>
          </div>
        </Motion.div>

        {/* NAVBAR — takes remaining space */}
        <div className="flex-1 min-w-0">
          <ToDoNavbar active={active} onChange={setActive} />
        </div>

      </div>

      {/* CONTENT */}
      <AnimatePresence mode="wait">
        <Motion.div
          key={active}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.22, ease: "easeInOut" }}
        >
          {section[active]}
        </Motion.div>
      </AnimatePresence>

    </div>
  );
}
