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
      className={`flex flex-col rounded-[1.25rem] border border-amber-100/10 bg-stone-950/45 p-4 sm:rounded-2xl sm:p-5 ${className}`}
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
    <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
      <dt className="text-body-sm text-stone-400">{label}</dt>
      <Motion.dd
        className={`text-accent-sm break-words text-left sm:text-right sm:whitespace-nowrap ${accentClass}`}
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
  const [lastPicUploadedDate, setLastPicUploadedDate] = useState(() => (isDemoMode ? readLastPicUploadedDate() : null));
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
  const [goalSummary, setGoalSummary] = useState(() => ({
    totalGoals: DEMO_OVERVIEW_STATS.goals.total,
    completedGoals: DEMO_OVERVIEW_STATS.goals.completed,
    totalSubgoals: DEMO_OVERVIEW_STATS.goals.subgoalsTotal,
    completedSubgoals: DEMO_OVERVIEW_STATS.goals.subgoalsCompleted,
  }));
  const [gymSummary, setGymSummary] = useState(() => ({
    completedProgress: DEMO_OVERVIEW_STATS.gym.completedProgress,
    totalProgress: DEMO_OVERVIEW_STATS.gym.totalProgress,
    pendingUpdates: DEMO_OVERVIEW_STATS.gym.pendingUpdates,
    progressUpdatesToday: DEMO_OVERVIEW_STATS.gym.progressUpdatesToday,
  }));

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
    if (!isDemoMode) return;

    const refreshLocalGymStats = () => {
      setLastMeasurementCheckInDate(readLastMeasurementCheckInDate());
    };

    refreshLocalGymStats();
    window.addEventListener("storage", refreshLocalGymStats);
    window.addEventListener("monkmode:gym-measurements-updated", refreshLocalGymStats);

    return () => {
      window.removeEventListener("storage", refreshLocalGymStats);
      window.removeEventListener("monkmode:gym-measurements-updated", refreshLocalGymStats);
    };
  }, [isDemoMode]);

  useEffect(() => {
    if (isDemoMode) {
      setGymSummary({
        completedProgress: DEMO_OVERVIEW_STATS.gym.completedProgress,
        totalProgress: DEMO_OVERVIEW_STATS.gym.totalProgress,
        pendingUpdates: DEMO_OVERVIEW_STATS.gym.pendingUpdates,
        progressUpdatesToday: DEMO_OVERVIEW_STATS.gym.progressUpdatesToday,
      });
      return;
    }

    let isMounted = true;

    const refreshGymSummary = async () => {
      try {
        const { data } = await api.get("/gym/summary");
        if (!isMounted) return;

        setGymSummary({
          completedProgress: Math.max(0, Number(data?.completedProgress || 0)),
          totalProgress: Math.max(0, Number(data?.totalProgress || 0)),
          pendingUpdates: Math.max(0, Number(data?.pendingUpdates || 0)),
          progressUpdatesToday: Math.max(0, Number(data?.progressUpdatesToday || 0)),
        });
        setLastMeasurementCheckInDate(data?.lastMeasurementCheckInDate || null);
        setLastPicUploadedDate(data?.lastPicUploadedDate || null);
      } catch {
        if (!isMounted) return;
        setGymSummary({
          completedProgress: 0,
          totalProgress: 0,
          pendingUpdates: 0,
          progressUpdatesToday: 0,
        });
      }
    };

    refreshGymSummary();
    window.addEventListener("focus", refreshGymSummary);
    window.addEventListener("monkmode:gym-measurements-updated", refreshGymSummary);
    window.addEventListener("monkmode:gym-gallery-updated", refreshGymSummary);
    window.addEventListener("monkmode:exercise-progress-updated", refreshGymSummary);

    return () => {
      isMounted = false;
      window.removeEventListener("focus", refreshGymSummary);
      window.removeEventListener("monkmode:gym-measurements-updated", refreshGymSummary);
      window.removeEventListener("monkmode:gym-gallery-updated", refreshGymSummary);
      window.removeEventListener("monkmode:exercise-progress-updated", refreshGymSummary);
    };
  }, [isDemoMode]);

  useEffect(() => {
    if (isDemoMode) {
      setLastPicUploadedDate(readLastPicUploadedDate());
      return;
    }

    let isMounted = true;

    const refreshGallerySummary = async () => {
      try {
        const { data } = await api.get("/gym/gallery/summary");
        if (!isMounted) return;
        setLastPicUploadedDate(data?.lastUploadedDate || null);
      } catch {
        if (!isMounted) return;
        setLastPicUploadedDate(null);
      }
    };

    refreshGallerySummary();
    window.addEventListener("focus", refreshGallerySummary);
    window.addEventListener("monkmode:gym-gallery-updated", refreshGallerySummary);

    return () => {
      isMounted = false;
      window.removeEventListener("focus", refreshGallerySummary);
      window.removeEventListener("monkmode:gym-gallery-updated", refreshGallerySummary);
    };
  }, [isDemoMode]);

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

    const refreshGoalSummary = async () => {
      try {
        const { data } = await api.get("/goals/summary");
        if (!isMounted) return;

        setGoalSummary({
          totalGoals: Math.max(0, Number(data?.totalGoals || 0)),
          completedGoals: Math.max(0, Number(data?.completedGoals || 0)),
          totalSubgoals: Math.max(0, Number(data?.totalSubgoals || 0)),
          completedSubgoals: Math.max(0, Number(data?.completedSubgoals || 0)),
        });
      } catch {
        // keep previous summary on transient failure
      }
    };

    refreshGoalSummary();
    window.addEventListener("focus", refreshGoalSummary);
    window.addEventListener("monkmode:goals-updated", refreshGoalSummary);

    return () => {
      isMounted = false;
      window.removeEventListener("focus", refreshGoalSummary);
      window.removeEventListener("monkmode:goals-updated", refreshGoalSummary);
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

  const displayedLastMeasurementDate = isDemoMode
    ? (lastMeasurementCheckInDate || DEMO_OVERVIEW_STATS.gym.lastMeasurementCheckInDate)
    : lastMeasurementCheckInDate;
  const displayedLastPicUploadedDate = isDemoMode
    ? (lastPicUploadedDate || DEMO_OVERVIEW_STATS.gym.lastPicUploadedDate)
    : lastPicUploadedDate;
  const displayedGoalSummary = isDemoMode
    ? {
        totalGoals: DEMO_OVERVIEW_STATS.goals.total,
        completedGoals: DEMO_OVERVIEW_STATS.goals.completed,
        totalSubgoals: DEMO_OVERVIEW_STATS.goals.subgoalsTotal,
        completedSubgoals: DEMO_OVERVIEW_STATS.goals.subgoalsCompleted,
      }
    : goalSummary;
  const displayedGymSummary = isDemoMode
    ? DEMO_OVERVIEW_STATS.gym
    : gymSummary;

  return (
    <DashboardLayout>
      <div className="w-full">
        <div className="grid gap-4 lg:gap-6 xl:grid-cols-[5fr_7fr]">
          {/* Main Content Area */}
          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
          >
            <section className="rounded-[1.5rem] border border-amber-100/10 bg-white/6 p-4 shadow-2xl shadow-black/25 backdrop-blur sm:rounded-[2rem] sm:p-8">
              <p className="text-label-lg">Overview</p>
              <p className="text-body-md mt-3 max-w-3xl text-stone-400 sm:mt-4">
                Here's a snapshot of today's discipline across journal, tasks, habits, goals, and gym.
              </p>

              <Motion.div
                className="mt-6 grid grid-cols-1 gap-4 sm:mt-8 sm:grid-cols-2"
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
                  <StatRow label="Goals done" value={`${displayedGoalSummary.completedGoals} / ${displayedGoalSummary.totalGoals}`} accent="positive" />
                  <StatRow label="Subgoals done" value={`${displayedGoalSummary.completedSubgoals} / ${displayedGoalSummary.totalSubgoals}`} accent="positive" />
                </StatusCard>

                <StatusCard
                  label="Gym"
                  viewHref="/dashboard/gym"
                  className="sm:col-span-2"
                  actions={[
                    { label: "View Measure Progress", href: "/dashboard/gym?tab=progress&progress=measurements" },
                    { label: "View Workout Progress", href: "/dashboard/gym?tab=progress&progress=workouts" },
                    { label: "Upload Pic", href: "/dashboard/gym", state: { tab: "gallery" } },
                  ]}
                >
                  <StatRow label="Today's Progress updates" value={displayedGymSummary.progressUpdatesToday} accent="positive" />
                  <StatRow label="Checklist completed" value={`${displayedGymSummary.completedProgress} / ${displayedGymSummary.totalProgress}`} accent="positive" />
                  <StatRow label="Pending checklist" value={displayedGymSummary.pendingUpdates} accent="negative" />
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
            <div className="min-h-[32rem] rounded-[1.5rem] border border-amber-100/10 bg-white/6 px-2.5 py-3 shadow-2xl shadow-black/25 backdrop-blur sm:min-h-[38rem] sm:rounded-[2rem] sm:px-3 sm:py-4 xl:sticky xl:top-2 xl:h-[82vh] xl:min-h-0">
              <OverviewHeatmap />
            </div>
          </Motion.div>
        </div>
      </div>
    </DashboardLayout>
  );
}
