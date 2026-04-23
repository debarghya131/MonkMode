import { useEffect, useMemo, useState } from "react";
import { motion as Motion } from "framer-motion";
import { Link } from "react-router-dom";
import api from "../../api/axios";
import useAuth from "../../hooks/useAuth";
import DashboardLayout from "../DashboardLayout";
import { INITIAL_HABITS as TODAY_HABITS } from "../habits/TodaysHabit";
import { INITIAL_TASKS as TODAY_TASKS } from "../todo/Today";
import OverviewHeatmap from "./OverviewHeatmap";

const JOURNAL_LOGGED_DAYS_KEY = "monkmode_journal_logged_days";
const JOURNAL_WEEKLY_STATS_KEY = "monkmode_journal_weekly_stats";
const GYM_MEASUREMENTS_KEY = "monkmode_gym_measurements";
const GYM_GALLERY_KEY = "monkmode_gallery";
const GYM_GALLERY_DEMO_DATES = ["2026-01-01", "2026-02-01", "2026-02-15", "2026-03-01", "2026-03-15", "2026-04-01"];
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const DEMO_OVERVIEW_STATS = {
  journal: {
    todayLogged: true,
    daysThisWeek: 5,
    winsThisWeek: 8,
    achievementsThisWeek: 6,
  },
  goals: {
    completed: 2,
    total: 5,
    subgoalsCompleted: 11,
    subgoalsTotal: 18,
  },
  gym: {
    completedProgress: 4,
    totalProgress: 6,
    pendingUpdates: 2,
    lastMeasurementCheckInDate: "2026-04-15",
    lastPicUploadedDate: "2026-04-01",
  },
};

const toLocalISODate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const startOfWeek = (date) => {
  const weekStart = new Date(date);
  weekStart.setHours(0, 0, 0, 0);
  const day = weekStart.getDay();
  weekStart.setDate(weekStart.getDate() - ((day + 6) % 7));
  return weekStart;
};

const readLocalJournalDates = () => {
  try {
    const stored = JSON.parse(localStorage.getItem(JOURNAL_LOGGED_DAYS_KEY));
    if (!Array.isArray(stored)) return [];
    return stored.filter((date) => ISO_DATE_REGEX.test(String(date)));
  } catch {
    return [];
  }
};

const readLocalJournalStats = () => {
  try {
    const stored = JSON.parse(localStorage.getItem(JOURNAL_WEEKLY_STATS_KEY));
    if (!Array.isArray(stored)) return [];
    return stored
      .filter((item) => ISO_DATE_REGEX.test(String(item?.date || "")))
      .map((item) => ({
        date: String(item.date),
        achievementCount: Math.max(0, Number(item.achievementCount) || 0),
        winCount: Math.max(0, Number(item.winCount) || 0),
      }));
  } catch {
    return [];
  }
};

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
            className="text-body-xs rounded-lg border border-amber-100/15 px-2.5 py-1 text-amber-400/70 transition hover:border-amber-400/40 hover:text-amber-300"
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
              className="text-body-xs rounded-lg border border-amber-100/15 px-2.5 py-1 text-amber-400/70 transition hover:border-amber-400/40 hover:text-amber-300"
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
  useAuth();
  const [journalDates, setJournalDates] = useState(() => readLocalJournalDates());
  const [journalStats, setJournalStats] = useState(() => readLocalJournalStats());
  const [lastMeasurementCheckInDate, setLastMeasurementCheckInDate] = useState(() => readLastMeasurementCheckInDate());
  const [lastPicUploadedDate, setLastPicUploadedDate] = useState(() => readLastPicUploadedDate());

  useEffect(() => {
    let isMounted = true;

    const refreshJournalDates = async () => {
      const localDates = readLocalJournalDates();
      const localStats = readLocalJournalStats();

      try {
        const { data } = await api.get("/journal/heatmap");
        if (!isMounted) return;

        const apiDates = Array.isArray(data?.values)
          ? data.values
              .map((item) => String(item?.date || ""))
              .filter((date) => ISO_DATE_REGEX.test(date))
          : [];

        setJournalDates([...new Set([...localDates, ...apiDates])]);
        setJournalStats(localStats);
      } catch {
        if (!isMounted) return;
        setJournalDates(localDates);
        setJournalStats(localStats);
      }
    };

    refreshJournalDates();
    window.addEventListener("storage", refreshJournalDates);
    window.addEventListener("monkmode:journal-logged-days-updated", refreshJournalDates);

    return () => {
      isMounted = false;
      window.removeEventListener("storage", refreshJournalDates);
      window.removeEventListener("monkmode:journal-logged-days-updated", refreshJournalDates);
    };
  }, []);

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

  const journalSummary = useMemo(() => {
    const today = new Date();
    const todayKey = toLocalISODate(today);
    const weekStart = startOfWeek(today);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const daysThisWeek = journalDates.filter((date) => {
      const loggedDate = new Date(`${date}T00:00:00`);
      return loggedDate >= weekStart && loggedDate <= weekEnd;
    }).length;

    const achievementsThisWeek = journalStats.reduce((total, item) => {
      const loggedDate = new Date(`${item.date}T00:00:00`);
      if (loggedDate < weekStart || loggedDate > weekEnd) return total;
      return total + item.achievementCount;
    }, 0);

    const winsThisWeek = journalStats.reduce((total, item) => {
      const loggedDate = new Date(`${item.date}T00:00:00`);
      if (loggedDate < weekStart || loggedDate > weekEnd) return total;
      return total + item.winCount;
    }, 0);

    return {
      todayLogged: journalDates.includes(todayKey),
      daysThisWeek,
      achievementsThisWeek,
      winsThisWeek,
    };
  }, [journalDates, journalStats]);

  const displayJournalSummary = useMemo(() => {
    const hasJournalActivity =
      journalDates.length > 0 ||
      journalStats.some((item) => item.achievementCount > 0 || item.winCount > 0);

    return hasJournalActivity ? journalSummary : DEMO_OVERVIEW_STATS.journal;
  }, [journalDates, journalStats, journalSummary]);

  const taskSummary = useMemo(
    () => TODAY_TASKS.reduce(
      (summary, task) => ({
        completed: summary.completed + (task.status === "completed" ? 1 : 0),
        pending: summary.pending + (task.status === "pending" ? 1 : 0),
        missed: summary.missed + (task.status === "missed" ? 1 : 0),
        importantToday: summary.importantToday + (task.priority === "High" ? 1 : 0),
      }),
      { completed: 0, pending: 0, missed: 0, importantToday: 0 }
    ),
    []
  );

  const habitSummary = useMemo(
    () => TODAY_HABITS.reduce(
      (summary, habit) => ({
        completed: summary.completed + (habit.status === "completed" ? 1 : 0),
        pending: summary.pending + (habit.status === "pending" ? 1 : 0),
      }),
      { completed: 0, pending: 0 }
    ),
    []
  );

  const displayedLastMeasurementDate = lastMeasurementCheckInDate || DEMO_OVERVIEW_STATS.gym.lastMeasurementCheckInDate;
  const displayedLastPicUploadedDate = lastPicUploadedDate || DEMO_OVERVIEW_STATS.gym.lastPicUploadedDate;

  return (
    <DashboardLayout>
      <div className="w-full">
        <div className="grid gap-6 xl:grid-cols-[5fr_7fr]">
          {/* Main Content Area */}
          <Motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
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
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.2 }}
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
