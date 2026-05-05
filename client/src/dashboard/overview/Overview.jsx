import { useEffect, useState } from "react";
import { motion as Motion } from "framer-motion";
import { Link } from "react-router-dom";
import api from "../../api/axios";
import useAuth from "../../hooks/useAuth";
import DashboardLayout from "../DashboardLayout";
import { GYM_GALLERY_DEMO_DATES, DEMO_OVERVIEW_STATS } from "../../../data/DummyData";
import { INITIAL_HABITS as TODAY_HABITS } from "../../../data/HabitDummyData";
import { INITIAL_TASKS as TODAY_TASKS } from "../../../data/ToDoDummyData";
import OverviewHeatmap from "./OverviewHeatmap";
import {
  DEFAULT_IMPORTANT_CATEGORIES,
  IMPORTANT_TODO_CATEGORIES_STORAGE_KEY
} from "../todo/todoShared";

const GYM_MEASUREMENTS_KEY = "monkmode_gym_measurements";
const GYM_GALLERY_KEY = "monkmode_gallery";
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const formatCheckInDate = (date) => {
  if (!ISO_DATE_REGEX.test(String(date || ""))) return "No check-in";
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const readLastMeasurementCheckInDate = () => {
  try {
    const stored = JSON.parse(localStorage.getItem(GYM_MEASUREMENTS_KEY));
    if (!Array.isArray(stored)) return null;

    return stored
      .map((entry) => String(entry?.checkInDate || ""))
      .filter((date) => ISO_DATE_REGEX.test(date))
      .sort((left, right) => right.localeCompare(left))[0] || null;
  } catch {
    return null;
  }
};

const readLastPicUploadedDate = () => {
  try {
    const stored = JSON.parse(localStorage.getItem(GYM_GALLERY_KEY));
    const storedDates = Array.isArray(stored)
      ? stored
          .filter((entry) => Array.isArray(entry?.images) && entry.images.length > 0)
          .map((entry) => String(entry.date || ""))
      : [];

    return [...storedDates, ...GYM_GALLERY_DEMO_DATES]
      .filter((date) => ISO_DATE_REGEX.test(date))
      .sort((left, right) => right.localeCompare(left))[0] || null;
  } catch {
    return GYM_GALLERY_DEMO_DATES[GYM_GALLERY_DEMO_DATES.length - 1];
  }
};

const readImportantTodoCategories = () => {
  try {
    const raw = localStorage.getItem(IMPORTANT_TODO_CATEGORIES_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    const custom = Array.isArray(parsed)
      ? parsed
          .map((value) => (typeof value === "string" ? value.trim() : ""))
          .filter(Boolean)
      : [];
    return [...new Set([...DEFAULT_IMPORTANT_CATEGORIES, ...custom])];
  } catch {
    return DEFAULT_IMPORTANT_CATEGORIES;
  }
};

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

function StatusCard({ label, className = "", viewHref, actions = [], children }) {
  return (
    <Motion.div
      variants={cardVariants}
      whileHover={{ y: -5, boxShadow: "0 20px 40px rgba(0,0,0,0.4)" }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      className={`flex flex-col rounded-2xl border border-amber-100/10 bg-stone-950/45 p-5 ${className}`}
    >
      <div className="flex items-center justify-between">
        <p className="text-label-md">{label}</p>
        {viewHref && (
          <Link
            to={viewHref}
            className="text-body-xs rounded-full border border-amber-100/15 px-3 py-1 text-amber-400/70 transition duration-300 hover:border-transparent hover:bg-gradient-to-r hover:from-[#ffd86b] hover:via-[#f5b52f] hover:to-[#ea8a17] hover:text-stone-950 hover:shadow-[0_0_18px_rgba(251,191,36,0.45)]"
          >
            View
          </Link>
        )}
      </div>
      <dl className="mt-4 flex flex-1 flex-col gap-2">{children}</dl>
      {actions.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {actions.map(({ label: actionLabel, href, state }) => (
            <Link
              key={`${href}-${actionLabel}`}
              to={href}
              state={state}
              className="text-body-xs rounded-full border border-amber-100/15 px-3 py-1 text-amber-400/70 transition duration-300 hover:border-transparent hover:bg-gradient-to-r hover:from-[#ffd86b] hover:via-[#f5b52f] hover:to-[#ea8a17] hover:text-stone-950 hover:shadow-[0_0_18px_rgba(251,191,36,0.45)]"
            >
              {actionLabel}
            </Link>
          ))}
        </div>
      )}
    </Motion.div>
  );
}

function StatRow({ label, value, accent }) {
  const isPositive = accent === "positive";
  const isNegative = accent === "negative";
  const isSuccess = accent === "success";

  const accentClass = isSuccess
    ? "text-emerald-300"
    : isPositive
    ? "text-amber-300"
    : isNegative
    ? "text-rose-300/90"
    : "text-stone-100";

  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-body-sm text-stone-400">{label}</dt>
      <Motion.dd
        className={`text-accent-sm whitespace-nowrap ${accentClass}`}
        animate={
          isPositive || isSuccess
            ? {
                textShadow: [
                  isSuccess ? "0 0 0px rgba(110,231,183,0)" : "0 0 0px rgba(251,191,36,0)",
                  isSuccess ? "0 0 8px rgba(110,231,183,0.65)" : "0 0 8px rgba(251,191,36,0.6)",
                  isSuccess ? "0 0 0px rgba(110,231,183,0)" : "0 0 0px rgba(251,191,36,0)",
                ],
              }
            : {}
        }
        transition={
          isPositive || isSuccess
            ? { duration: 2.4, repeat: Infinity, ease: "easeInOut" }
            : {}
        }
      >
        {value}
      </Motion.dd>
    </div>
  );
}

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08, delayChildren: 0.15 },
  },
};

export default function Overview() {
  const { isDemoMode } = useAuth();
  const [journalSummary, setJournalSummary] = useState(() => ({
    todayLogged: false,
    daysThisWeek: 0,
    achievementsThisWeek: 0,
    winsThisWeek: 0,
  }));
  const [lastMeasurementCheckInDate, setLastMeasurementCheckInDate] = useState(() => readLastMeasurementCheckInDate());
  const [lastPicUploadedDate, setLastPicUploadedDate] = useState(() => readLastPicUploadedDate());
  const [habitSummary, setHabitSummary] = useState(() =>
    TODAY_HABITS.reduce(
      (summary, habit) => ({
        completed: summary.completed + (habit.status === "completed" ? 1 : 0),
        pending: summary.pending + (habit.status === "pending" ? 1 : 0),
      }),
      { completed: 0, pending: 0 }
    )
  );
  const [taskSummary, setTaskSummary] = useState(() =>
    TODAY_TASKS.reduce(
      (summary, task) => ({
        completed: summary.completed + (task.status === "completed" ? 1 : 0),
        pending: summary.pending + (task.status === "pending" ? 1 : 0),
        missed: summary.missed + (task.status === "missed" ? 1 : 0),
        importantToday: summary.importantToday + (task.priority === "High" ? 1 : 0),
      }),
      { completed: 0, pending: 0, missed: 0, importantToday: 0 }
    )
  );

  useEffect(() => {
    if (isDemoMode) {
      setJournalSummary(DEMO_OVERVIEW_STATS.journal);
      return;
    }

    let isMounted = true;
    const refreshJournalSummary = async () => {
      try {
        const { data } = await api.get("/journal/summary");
        if (!isMounted) return;

        setJournalSummary({
          todayLogged: Boolean(data?.todayLogged),
          daysThisWeek: Math.max(0, Number(data?.daysThisWeek || 0)),
          achievementsThisWeek: Math.max(0, Number(data?.achievementsThisWeek || 0)),
          winsThisWeek: Math.max(0, Number(data?.winsThisWeek || 0)),
        });
      } catch {
        if (!isMounted) return;
        setJournalSummary({
          todayLogged: false,
          daysThisWeek: 0,
          achievementsThisWeek: 0,
          winsThisWeek: 0,
        });
      }
    };

    refreshJournalSummary();
    window.addEventListener("focus", refreshJournalSummary);
    window.addEventListener("monkmode:journal-logged-days-updated", refreshJournalSummary);

    return () => {
      isMounted = false;
      window.removeEventListener("focus", refreshJournalSummary);
      window.removeEventListener("monkmode:journal-logged-days-updated", refreshJournalSummary);
    };
  }, [isDemoMode]);

  useEffect(() => {
    const refreshGymStats = () => {
      setLastMeasurementCheckInDate(readLastMeasurementCheckInDate());
      setLastPicUploadedDate(readLastPicUploadedDate());
    };

    window.addEventListener("storage", refreshGymStats);
    window.addEventListener("monkmode:gym-measurements-updated", refreshGymStats);
    window.addEventListener("monkmode:gym-gallery-updated", refreshGymStats);

    return () => {
      window.removeEventListener("storage", refreshGymStats);
      window.removeEventListener("monkmode:gym-measurements-updated", refreshGymStats);
      window.removeEventListener("monkmode:gym-gallery-updated", refreshGymStats);
    };
  }, []);

  const displayJournalSummary = isDemoMode ? DEMO_OVERVIEW_STATS.journal : journalSummary;

  useEffect(() => {
    if (isDemoMode) return;
    let isMounted = true;

    const refreshTaskSummary = async () => {
      try {
        const importantCategories = readImportantTodoCategories();
        const { data } = await api.get("/todos/summary", {
          params: { importantCategories: importantCategories.join(",") }
        });
        if (!isMounted) return;
        setTaskSummary({
          completed: Math.max(0, Number(data?.today?.completed || 0)),
          pending: Math.max(0, Number(data?.today?.pending || 0)),
          missed: Math.max(0, Number(data?.today?.missed || 0)),
          importantToday: Math.max(0, Number((data?.importantToday ?? data?.today?.important) || 0)),
        });
      } catch {
        // keep existing summary on transient failure
      }
    };

    refreshTaskSummary();
    window.addEventListener("focus", refreshTaskSummary);
    window.addEventListener("monkmode:todos-updated", refreshTaskSummary);

    return () => {
      isMounted = false;
      window.removeEventListener("focus", refreshTaskSummary);
      window.removeEventListener("monkmode:todos-updated", refreshTaskSummary);
    };
  }, [isDemoMode]);

  useEffect(() => {
    if (isDemoMode) return;
    let isMounted = true;

    const refreshHabitSummary = async () => {
      try {
        const { data } = await api.get("/habits/consistency");
        if (!isMounted) return;

        const completed = Math.max(0, Number(data?.completedToday || 0));
        const expected = Math.max(0, Number(data?.expectedToday || 0));
        setHabitSummary({
          completed,
          pending: Math.max(0, expected - completed),
        });
      } catch {
        // keep existing summary on failure
      }
    };

    refreshHabitSummary();
    window.addEventListener("focus", refreshHabitSummary);
    window.addEventListener("monkmode:habits-updated", refreshHabitSummary);

    return () => {
      isMounted = false;
      window.removeEventListener("focus", refreshHabitSummary);
      window.removeEventListener("monkmode:habits-updated", refreshHabitSummary);
    };
  }, [isDemoMode]);

  const displayedLastMeasurementDate = lastMeasurementCheckInDate || DEMO_OVERVIEW_STATS.gym.lastMeasurementCheckInDate;
  const displayedLastPicUploadedDate = lastPicUploadedDate || DEMO_OVERVIEW_STATS.gym.lastPicUploadedDate;

  return (
    <DashboardLayout>
      <div className="w-full">
        <div className="grid gap-6 xl:grid-cols-[5fr_7fr]">
          {/* Main Content Area */}
          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
          >
            <section className="rounded-[2rem] border border-amber-100/10 bg-white/6 p-8 shadow-2xl shadow-black/25 backdrop-blur">
              <p className="text-label-lg">Overview</p>
              <p className="text-body-md mt-4 text-stone-400">
                Here's a snapshot of today's discipline across journal, tasks, habits, goals, and gym.
              </p>

              <Motion.div
                className="mt-8 grid grid-cols-2 gap-4"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                <StatusCard label="Today's Journal" viewHref="/dashboard/journal">
                  <StatRow
                    label="Status"
                    value={displayJournalSummary.todayLogged ? "Submitted" : "Pending"}
                    accent={displayJournalSummary.todayLogged ? "success" : "negative"}
                  />
                  <StatRow label="Days logged this week" value={`${displayJournalSummary.daysThisWeek} / 7`} accent="positive" />
                  <StatRow label="Wins this week" value={displayJournalSummary.winsThisWeek} accent="positive" />
                  <StatRow label="Achievements this week" value={displayJournalSummary.achievementsThisWeek} accent="positive" />
                </StatusCard>

                <StatusCard label="Today's Tasks" viewHref="/dashboard/todo">
                  <StatRow label="Completed" value={taskSummary.completed} accent="positive" />
                  <StatRow label="Pending" value={taskSummary.pending} />
                  <StatRow label="Missed" value={taskSummary.missed} accent="negative" />
                  <StatRow label="Important Task" value={taskSummary.importantToday} accent="positive" />
                </StatusCard>

                <StatusCard
                  label="Today's Habits"
                  viewHref="/dashboard/habit"
                  actions={[
                    { label: "Track Your Habit", href: "/dashboard/habit", state: { tab: "track" } },
                  ]}
                >
                  <StatRow label="Complete" value={habitSummary.completed} accent="positive" />
                  <StatRow label="Pending" value={habitSummary.pending} />
                </StatusCard>

                <StatusCard
                  label="Goals"
                  viewHref="/dashboard/goal"
                  actions={[
                    { label: "View Progress", href: "/dashboard/goal", state: { tab: "progress" } },
                  ]}
                >
                  <StatRow label="Goals done" value={`${DEMO_OVERVIEW_STATS.goals.completed} / ${DEMO_OVERVIEW_STATS.goals.total}`} accent="positive" />
                  <StatRow label="Subgoals done" value={`${DEMO_OVERVIEW_STATS.goals.subgoalsCompleted} / ${DEMO_OVERVIEW_STATS.goals.subgoalsTotal}`} accent="positive" />
                </StatusCard>

                <StatusCard
                  label="Gym"
                  viewHref="/dashboard/gym"
                  className="col-span-2"
                  actions={[
                    { label: "View Measure Progress", href: "/dashboard/gym?tab=progress&progress=measurements" },
                    { label: "View Workout Progress", href: "/dashboard/gym?tab=progress&progress=workouts" },
                    { label: "Upload Pic", href: "/dashboard/gym", state: { tab: "gallery" } },
                  ]}
                >
                  <StatRow label="Today's Progress updates" value={`${DEMO_OVERVIEW_STATS.gym.completedProgress} / ${DEMO_OVERVIEW_STATS.gym.totalProgress}`} accent="positive" />
                  <StatRow label="Pending updates" value={DEMO_OVERVIEW_STATS.gym.pendingUpdates} accent="negative" />
                  <StatRow label="Last measurement check-in" value={formatCheckInDate(displayedLastMeasurementDate)} accent="positive" />
                  <StatRow label="Last pic uploaded" value={formatCheckInDate(displayedLastPicUploadedDate)} accent="positive" />
                </StatusCard>
              </Motion.div>
            </section>
          </Motion.div>

          {/* Heatmap Sidebar */}
          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
          >
            <div className="rounded-[2rem] border border-amber-100/10 bg-white/6 px-3 py-4 shadow-2xl shadow-black/25 backdrop-blur h-[82vh] sticky top-2">
              <OverviewHeatmap />
            </div>
          </Motion.div>
        </div>
      </div>
    </DashboardLayout>
  );
}
