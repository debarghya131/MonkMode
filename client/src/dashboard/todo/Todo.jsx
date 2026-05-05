import { AnimatePresence, motion as Motion } from "framer-motion";
import { useEffect, useState } from "react";
import ToDoNavbar from "./ToDoNavbar";
import Today from "./Today";
import Upcomming from "./Upcomming";
import Schedule from "./Schedule";
import Important from "./Important";
import {
  DEFAULT_CATEGORIES,
  DEFAULT_IMPORTANT_CATEGORIES,
  IMPORTANT_TODO_CATEGORIES_STORAGE_KEY,
  TODO_CATEGORY_STORAGE_KEY
} from "./todoShared";
import useAuth from "../../hooks/useAuth";
import api from "../../api/axios";

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

const loadImportantCategories = () => {
  if (typeof window === "undefined") return DEFAULT_IMPORTANT_CATEGORIES;
  try {
    const raw = window.localStorage.getItem(IMPORTANT_TODO_CATEGORIES_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    const custom = Array.isArray(parsed)
      ? parsed
          .map((value) => (typeof value === "string" ? value.trim() : ""))
          .filter(Boolean)
      : [];
    const merged = [...new Set([...DEFAULT_IMPORTANT_CATEGORIES, ...custom])];
    return merged.length ? merged : DEFAULT_IMPORTANT_CATEGORIES;
  } catch {
    return DEFAULT_IMPORTANT_CATEGORIES;
  }
};

const loadStoredCategories = () => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(TODO_CATEGORY_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed
          .map((value) => (typeof value === "string" ? value.trim() : ""))
          .filter(Boolean)
      : [];
  } catch {
    return [];
  }
};

export default function Todo() {
  const { isDemoMode } = useAuth();
  const [active, setActive] = useState("today");
  const [tasks, setTasks] = useState(isDemoMode ? DEMO_TASKS : []);
  const [consistency, setConsistency] = useState({
    todayCompleted: 0,
    todayTotal: 0,
    lifetimeCompleted: 0,
    lifetimeTotal: 0,
    lifetimeConsistency: 0
  });
  const [importantCategories, setImportantCategories] = useState(loadImportantCategories);
  const [categoryOptions, setCategoryOptions] = useState(() => {
    const stored = loadStoredCategories();
    const merged = new Map();
    [...DEFAULT_CATEGORIES, ...stored, ...loadImportantCategories()].forEach((category) => {
      const key = String(category || "").toLowerCase();
      if (!key || merged.has(key)) return;
      merged.set(key, category);
    });
    return [...merged.values()];
  });

  const fetchTasks = async () => {
    try {
      const { data } = await api.get("/todos");
      setTasks(data);
      const fetchedCategories = [...new Set(data.map((t) => t.category).filter(Boolean))];
      const merged = [...new Set([
        ...DEFAULT_CATEGORIES,
        ...loadStoredCategories(),
        ...importantCategories,
        ...fetchedCategories
      ])];
      setCategoryOptions(merged);
    } catch (err) {
      console.error("Failed to fetch tasks:", err);
    }
  };

  const fetchConsistency = async () => {
    try {
      const { data } = await api.get("/todos/summary", {
        params: { importantCategories: importantCategories.join(",") }
      });
      setConsistency({
        todayCompleted: Number(data?.today?.completed || 0),
        todayTotal: Number(data?.today?.total || 0),
        lifetimeCompleted: Number(data?.totalCompletedLifetime || data?.lifetime?.completed || 0),
        lifetimeTotal: Number(data?.totalExpectedLifetime || data?.lifetime?.total || 0),
        lifetimeConsistency: Number(data?.lifetimeConsistency || 0)
      });
    } catch {
      // keep existing values
    }
  };

  useEffect(() => {
    if (isDemoMode) return;
    fetchTasks();
    fetchConsistency();
  }, [isDemoMode, importantCategories]);

  useEffect(() => {
    if (isDemoMode) return;

    const refreshTodoSummary = () => {
      fetchConsistency();
    };

    window.addEventListener("focus", refreshTodoSummary);
    window.addEventListener("monkmode:todos-updated", refreshTodoSummary);

    return () => {
      window.removeEventListener("focus", refreshTodoSummary);
      window.removeEventListener("monkmode:todos-updated", refreshTodoSummary);
    };
  }, [isDemoMode]);

  const refreshTasks = () => {
    if (!isDemoMode) {
      fetchTasks();
      fetchConsistency();
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const customOnly = importantCategories.filter(
      (category) =>
        !DEFAULT_IMPORTANT_CATEGORIES.some(
          (defaultCategory) => defaultCategory.toLowerCase() === category.toLowerCase()
        )
    );
    window.localStorage.setItem(
      IMPORTANT_TODO_CATEGORIES_STORAGE_KEY,
      JSON.stringify(customOnly)
    );
  }, [importantCategories]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const customOnly = categoryOptions.filter(
      (category) =>
        !DEFAULT_CATEGORIES.some(
          (defaultCategory) => defaultCategory.toLowerCase() === category.toLowerCase()
        )
    );
    window.localStorage.setItem(
      TODO_CATEGORY_STORAGE_KEY,
      JSON.stringify(customOnly)
    );
  }, [categoryOptions]);

  useEffect(() => {
    setCategoryOptions((prev) => {
      const merged = new Map();
      [...DEFAULT_CATEGORIES, ...prev, ...importantCategories].forEach((category) => {
        const key = String(category || "").toLowerCase();
        if (!key || merged.has(key)) return;
        merged.set(key, category);
      });
      return [...merged.values()];
    });
  }, [importantCategories]);

  const section = {
    today: <Today />,
    upcoming: <Upcomming />,
    schedule: (
      <Schedule
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
        tasks={tasks}
        categoryOptions={categoryOptions}
        setCategoryOptions={setCategoryOptions}
        importantCategories={importantCategories}
        setImportantCategories={setImportantCategories}
      />
    ),
  };

  return (
    <div className="w-full space-y-4">

      {/* TOP ROW — consistency + navbar side by side, left-aligned */}
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
                <span className="rounded-full border border-amber-100/20 bg-black/20 px-2 py-0.5 text-amber-100/90">
                  Today {consistency.todayCompleted}/{consistency.todayTotal}
                </span>
                <span className="rounded-full border border-amber-100/20 bg-black/20 px-2 py-0.5 text-amber-100/90">
                  Lifetime {consistency.lifetimeCompleted}/{consistency.lifetimeTotal}
                </span>
              </div>
            )}
          </div>
        </Motion.div>

        <div className="w-full min-w-0 flex-1">
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
