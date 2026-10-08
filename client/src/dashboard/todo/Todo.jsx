import { AnimatePresence, motion as Motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ToDoNavbar from "./ToDoNavbar";
import { TODO_TABS } from "./todoTabs";
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
import useMobileLowMotion from "../../hooks/useMobileLowMotion";
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
  const lowMotion = useMobileLowMotion();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedView = searchParams.get("view");
  const active = TODO_TABS.some((tab) => tab.id === requestedView) ? requestedView : "today";
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

  const fetchTasks = useCallback(async () => {
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
  }, [importantCategories]);

  const fetchConsistency = useCallback(async () => {
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
  }, [importantCategories]);

  useEffect(() => {
    if (isDemoMode) return;
    fetchTasks();
    fetchConsistency();
  }, [fetchConsistency, fetchTasks, isDemoMode]);

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
  }, [fetchConsistency, isDemoMode]);

  const refreshTasks = useCallback(() => {
    if (!isDemoMode) {
      fetchTasks();
      fetchConsistency();
    }
  }, [fetchConsistency, fetchTasks, isDemoMode]);

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
    today: <Today lowMotion={lowMotion} consistency={consistency} />,
    upcoming: <Upcomming lowMotion={lowMotion} />,
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
          <ToDoNavbar active={active} onChange={setActive} />
        </div>
      </div>

      {/* CONTENT */}
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

    </div>
  );
}
