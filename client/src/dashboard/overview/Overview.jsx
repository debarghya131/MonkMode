import { motion as Motion } from "framer-motion";
import { Link, useSearchParams } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import useMobileLowMotion from "../../hooks/useMobileLowMotion";
import DashboardLayout from "../DashboardLayout";
import { DEMO_OVERVIEW_STATS } from "../../../data/DummyData";
import { INITIAL_HABITS as TODAY_HABITS } from "../../../data/HabitDummyData";
import { INITIAL_TASKS as TODAY_TASKS } from "../../../data/ToDoDummyData";
import OverviewHeatmap from "./OverviewHeatmap";
import useDashboardRead from "../useDashboardRead";
import { overviewValidators, OVERVIEW_EVENTS } from "./overviewResponse";
import "./overview-summary.css";


const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const EMPTY_HABIT_SUMMARY = { completed: 0, pending: 0 };
const EMPTY_TASK_SUMMARY = { completed: 0, pending: 0, missed: 0, importantToday: 0 };

const OVERVIEW_MOBILE_VIEWS = [
  { id: "summary", icon: "▦", label: "Daily Summary" },
  { id: "heatmaps", icon: "▥", label: "Activity Heatmaps" },
];

const formatCheckInDate = (date) => {
  if (date === undefined) return "—";
  if (!ISO_DATE_REGEX.test(String(date || ""))) return "No check-in";
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};




const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

const OVERVIEW_ICON_PATHS = {
  journal: "M12 5v15M12 5C9 3 5 3 3 4v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-2-1-6-1-9 1Z",
  tasks: "M9 6h11M9 12h11M9 18h11M3 6l1 1 2-2M3 12l1 1 2-2M3 18l1 1 2-2",
  habits: "m13 3-9 11h7l-1 7 10-12h-7l0-6Z",
  goals: "M21 12a9 9 0 1 1-9-9M17 12a5 5 0 1 1-5-5M12 12l9-9M16 3h5v5",
  gym: "M6 7v10M3 9v6M18 7v10M21 9v6M6 12h12M3 12h3M18 12h3",
};

function OverviewArrow() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14m-5-5 5 5-5 5" />
    </svg>
  );
}

function StatusCard({ label, description, kind, metric, progress, lowMotion, resource, className = "", viewHref, actions = [], children }) {
  const available = !resource || Boolean(resource.data);
  const percentage = available && progress.total > 0
    ? Math.min(100, Math.max(0, Math.round((progress.completed / progress.total) * 100)))
    : 0;
  const cardActions = actions.length > 0 && (
    <div className="overview-card-actions">
      {actions.map(({ label: actionLabel, href, state }, index) => (
        <Link
          key={`${href}-${actionLabel}`}
          to={href}
          state={state}
          className="overview-card-action"
          data-primary={index === 0 ? "true" : "false"}
        >
          <span>{actionLabel}</span>
          <OverviewArrow />
        </Link>
      ))}
    </div>
  );

  return (
    <Motion.article
      variants={lowMotion ? undefined : cardVariants}
      whileHover={lowMotion ? undefined : { y: -3 }}
      transition={{ duration: 0.2 }}
      data-kind={kind}
      className={`overview-status-card ${className}`}
    >
      <div className="overview-card-header">
        <div className="overview-card-identity">
          <span className="overview-card-icon">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d={OVERVIEW_ICON_PATHS[kind]} />
            </svg>
          </span>
          <div className="overview-card-heading">
            <h3>{label}</h3>
            <p>{description}</p>
          </div>
        </div>
        {viewHref && (
          <Link to={viewHref} className="overview-card-view" aria-label={`View ${label}`}>
            <OverviewArrow />
          </Link>
        )}
      </div>
      <div className="overview-card-body">
        <div className="overview-card-metric">
          <p className="overview-metric-value">
            {available ? metric.value : "—"}
            {available && metric.total !== undefined && <span> / {metric.total}</span>}
          </p>
          <p className="overview-metric-label">{metric.label}</p>
          <div className="overview-card-progress">
            <div className="overview-progress-caption">
              <span>{progress.label}</span>
              <span>{available ? `${percentage}%` : "—"}</span>
            </div>
            <div
              className="overview-progress-track"
              role="progressbar"
              aria-label={`${label}: ${progress.label}`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={available ? percentage : undefined}
              aria-valuetext={available ? `${progress.completed} of ${progress.total}` : "Statistics unavailable"}
            >
              <span style={{ width: `${percentage}%` }} />
            </div>
          </div>
        </div>
        <div className="overview-card-details">
          <dl className="overview-status-list">{children}</dl>
          {kind !== "gym" && cardActions}
        </div>
      </div>
      {kind === "gym" && cardActions}
      {resource?.loading && <p role="status" className="mt-2 text-xs text-stone-400">Loading {label}…</p>}
      {resource?.error && <div className="mt-2 text-xs text-rose-200">
        <p role="alert">{resource.error}{available ? " Showing last loaded values." : ""}</p>
        <button type="button" onClick={resource.retry} className="mt-1 text-amber-200">Retry {label}</button>
      </div>}
    </Motion.article>
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
    <div className="overview-stat-row flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
      <dt className="text-body-sm text-stone-400">{label}</dt>
      <dd
        className={`text-accent-sm break-words text-left sm:text-right sm:whitespace-nowrap ${accentClass}`}
      >
        {value}
      </dd>
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
  const { user, isDemoMode } = useAuth();
  return <OverviewContent key={`${isDemoMode ? "demo" : "real"}:${user?.id || "guest"}`} />;
}

function OverviewContent() {
  const lowMotion = useMobileLowMotion();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedMobileView = searchParams.get("overview");
  const mobileView = OVERVIEW_MOBILE_VIEWS.some((view) => view.id === requestedMobileView)
    ? requestedMobileView
    : "heatmaps";

  const selectMobileView = (view) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set("overview", view);
      return next;
    });
  };

  const { isDemoMode, user } = useAuth();
  const journalRead = useDashboardRead("/journal/summary", overviewValidators.journal, OVERVIEW_EVENTS.journal, isDemoMode, user?.id);
  const taskRead = useDashboardRead("/todos/summary", overviewValidators.tasks, OVERVIEW_EVENTS.tasks, isDemoMode, user?.id);
  const habitRead = useDashboardRead("/habits/consistency", overviewValidators.habits, OVERVIEW_EVENTS.habits, isDemoMode, user?.id);
  const goalRead = useDashboardRead("/goals/summary", overviewValidators.goals, OVERVIEW_EVENTS.goals, isDemoMode, user?.id);
  const gymRead = useDashboardRead("/gym/summary", overviewValidators.gym, OVERVIEW_EVENTS.gym, isDemoMode, user?.id);
  const displayJournalSummary = isDemoMode ? DEMO_OVERVIEW_STATS.journal : journalRead.data || {
    todayLogged: null, daysThisWeek: "—", achievementsThisWeek: "—", winsThisWeek: "—"
  };
  const taskSummary = isDemoMode ? TODAY_TASKS.reduce((summary, task) => ({
    completed: summary.completed + (task.status === "completed" ? 1 : 0),
    pending: summary.pending + (task.status === "pending" ? 1 : 0),
    missed: summary.missed + (task.status === "missed" ? 1 : 0),
    importantToday: summary.importantToday + (task.priority === "High" ? 1 : 0)
  }), EMPTY_TASK_SUMMARY) : taskRead.data ? { ...taskRead.data.today, importantToday: taskRead.data.importantToday ?? taskRead.data.today.important }
    : { completed: "—", pending: "—", missed: "—", importantToday: "—" };
  const habitSummary = isDemoMode ? TODAY_HABITS.reduce((summary, habit) => ({
    completed: summary.completed + (habit.status === "completed" ? 1 : 0),
    pending: summary.pending + (habit.status === "pending" ? 1 : 0)
  }), EMPTY_HABIT_SUMMARY) : habitRead.data ? {
    completed: habitRead.data.completedToday, pending: habitRead.data.expectedToday - habitRead.data.completedToday
  } : { completed: "—", pending: "—" };
  const displayedGoalSummary = isDemoMode ? {
    totalGoals: DEMO_OVERVIEW_STATS.goals.total, completedGoals: DEMO_OVERVIEW_STATS.goals.completed,
    totalSubgoals: DEMO_OVERVIEW_STATS.goals.subgoalsTotal, completedSubgoals: DEMO_OVERVIEW_STATS.goals.subgoalsCompleted
  } : goalRead.data || { totalGoals: "—", completedGoals: "—", totalSubgoals: "—", completedSubgoals: "—" };
  const displayedGymSummary = isDemoMode ? DEMO_OVERVIEW_STATS.gym : gymRead.data || {
    completedProgress: "—", totalProgress: "—", pendingUpdates: "—", progressUpdatesToday: "—"
  };
  const displayedLastMeasurementDate = isDemoMode ? DEMO_OVERVIEW_STATS.gym.lastMeasurementCheckInDate : gymRead.data?.lastMeasurementCheckInDate;
  const displayedLastPicUploadedDate = isDemoMode ? DEMO_OVERVIEW_STATS.gym.lastPicUploadedDate : gymRead.data?.lastPicUploadedDate;

  return (
    <DashboardLayout>
      <div className="overview-page h-full w-full" data-mobile-view={mobileView}>
        <nav className="overview-mobile-nav" aria-label="Overview sections">
          {OVERVIEW_MOBILE_VIEWS.map((view) => (
            <button
              key={view.id}
              type="button"
              className="overview-mobile-nav-button"
              aria-pressed={mobileView === view.id}
              onClick={() => selectMobileView(view.id)}
            >
              <span className="overview-mobile-nav-icon" aria-hidden="true">{view.icon}</span>
              <span>{view.label}</span>
            </button>
          ))}
        </nav>

        <div className="overview-page-layout grid gap-4 lg:gap-5 min-[1800px]:h-full min-[1800px]:grid-cols-[minmax(30rem,5fr)_minmax(0,7fr)] min-[1800px]:items-stretch">
          {/* Main Content Area */}
          <Motion.div
            data-overview-panel="summary"
            className="order-2 h-full min-w-0 md:order-1 min-[1800px]:min-h-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
          >
            <section className="overview-summary-panel journal-scroll h-full rounded-[1.5rem] border border-amber-100/10 p-4 sm:rounded-[2rem] sm:p-6 xl:p-7 min-[1800px]:overflow-y-auto min-[1800px]:p-8">
              <header className="overview-summary-heading">
                <p className="overview-summary-eyebrow">Overview</p>
              </header>

              <Motion.div
                className="overview-status-grid mt-6 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:gap-4 min-[1800px]:mt-8"
                variants={containerVariants}
                initial={lowMotion ? false : "hidden"}
                animate="visible"
              >
                <StatusCard
                  label="Today's Journal"
                  description="Daily reflection"
                  kind="journal"
                  resource={isDemoMode ? null : journalRead}
                  lowMotion={lowMotion}
                  viewHref="/dashboard/journal"
                  metric={{ value: displayJournalSummary.daysThisWeek, total: 7, label: "days logged this week" }}
                  progress={{ completed: displayJournalSummary.daysThisWeek, total: 7, label: "Weekly consistency" }}
                >
                  <StatRow
                    label="Status"
                    value={displayJournalSummary.todayLogged === null ? "—" : displayJournalSummary.todayLogged ? "Submitted" : "Pending"}
                    accent={displayJournalSummary.todayLogged ? "success" : "negative"}
                  />
                  <StatRow label="Wins this week" value={displayJournalSummary.winsThisWeek} accent="positive" />
                  <StatRow label="Achievements this week" value={displayJournalSummary.achievementsThisWeek} accent="positive" />
                </StatusCard>

                <StatusCard
                  label="Today's Tasks"
                  description="Make room for what matters"
                  kind="tasks"
                  resource={isDemoMode ? null : taskRead}
                  lowMotion={lowMotion}
                  viewHref="/dashboard/todo"
                  metric={{ value: taskSummary.completed, label: "tasks completed today" }}
                  progress={{ completed: taskSummary.completed, total: taskSummary.completed + taskSummary.pending + taskSummary.missed, label: "Task completion" }}
                >
                  <StatRow label="Pending" value={taskSummary.pending} />
                  <StatRow label="Missed" value={taskSummary.missed} accent="negative" />
                  <StatRow label="Important tasks" value={taskSummary.importantToday} accent="positive" />
                </StatusCard>

                <StatusCard
                  label="Today's Habits"
                  description="Build your daily rhythm"
                  kind="habits"
                  resource={isDemoMode ? null : habitRead}
                  lowMotion={lowMotion}
                  metric={{ value: habitSummary.completed, label: "habits completed today" }}
                  progress={{ completed: habitSummary.completed, total: habitSummary.completed + habitSummary.pending, label: "Routine completion" }}
                  viewHref="/dashboard/habit"
                  actions={[
                    { label: "Track habits", href: "/dashboard/habit", state: { tab: "track" } },
                  ]}
                >
                  <StatRow label="Pending" value={habitSummary.pending} />
                </StatusCard>

                <StatusCard
                  label="Goals"
                  description="Turn intention into progress"
                  kind="goals"
                  resource={isDemoMode ? null : goalRead}
                  lowMotion={lowMotion}
                  metric={{ value: displayedGoalSummary.completedGoals, total: displayedGoalSummary.totalGoals, label: "goals completed" }}
                  progress={{ completed: displayedGoalSummary.completedGoals, total: displayedGoalSummary.totalGoals, label: "Goal completion" }}
                  viewHref="/dashboard/goal"
                  actions={[
                    { label: "View Progress", href: "/dashboard/goal", state: { tab: "progress" } },
                  ]}
                >
                  <StatRow label="Subgoals done" value={`${displayedGoalSummary.completedSubgoals} / ${displayedGoalSummary.totalSubgoals}`} accent="positive" />
                </StatusCard>

                <StatusCard
                  label="Gym"
                  description="Strength through consistency"
                  kind="gym"
                  resource={isDemoMode ? null : gymRead}
                  lowMotion={lowMotion}
                  metric={{ value: displayedGymSummary.progressUpdatesToday, label: "progress updates today" }}
                  progress={{ completed: displayedGymSummary.completedProgress, total: displayedGymSummary.totalProgress, label: "Checklist completion" }}
                  viewHref="/dashboard/gym"
                  className="sm:col-span-2"
                  actions={[
                    { label: "Measurements", href: "/dashboard/gym?tab=progress&progress=measurements" },
                    { label: "Workout progress", href: "/dashboard/gym?tab=progress&progress=workouts" },
                    { label: "Upload photo", href: "/dashboard/gym", state: { tab: "gallery" } },
                  ]}
                >
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
            data-overview-panel="heatmaps"
            className="order-1 h-full min-w-0 md:order-2 min-[1800px]:min-h-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
          >
            <div className="overview-heatmap-panel h-[calc(100dvh-5.5rem)] min-h-0 rounded-[1.5rem] border border-amber-100/10 bg-white/6 px-2.5 py-3 shadow-2xl shadow-black/25 md:backdrop-blur sm:h-[calc(100dvh-7rem)] sm:rounded-[2rem] sm:px-3 sm:py-4 min-[1800px]:h-full">
              <OverviewHeatmap />
            </div>
          </Motion.div>
        </div>
      </div>
    </DashboardLayout>
  );
}
