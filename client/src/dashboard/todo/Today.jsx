import DashboardDateTimeInput from "../../components/DashboardDateTimeInput";
import { motion as Motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { INITIAL_TASKS } from "../../../data/ToDoDummyData";
import useAuth from "../../hooks/useAuth";
import api from "../../api/axios";

const PRIORITY_ORDER = ["High", "Medium", "Low"];

const TODAY_VIEWS = [
  { id: "overview", label: "Today’s Overview" },
  { id: "all", label: "All Tasks" },
  { id: "pending", label: "Pending" },
  { id: "completed", label: "Completed" },
  { id: "missed", label: "Missed Tasks" },
];

const PRIORITY_STYLES = {
  High: "border-red-400/30 bg-red-500/10 text-red-200",
  Medium: "border-yellow-400/30 bg-yellow-500/10 text-yellow-200",
  Low: "border-green-400/30 bg-green-500/10 text-green-200",
};

const STATUS_TONES = {
  pending: "warning",
  completed: "success",
  missed: "danger",
};

const STATUS_LABELS = {
  pending: "Pending",
  completed: "Completed",
  missed: "Missed",
};

function TaskStatusBadge({ status }) {
  return (
    <span
      aria-label={`Status: ${STATUS_LABELS[status] || status}`}
      className="dashboard-card-status"
      data-tone={STATUS_TONES[status]}
    >
      {STATUS_LABELS[status] || status}
    </span>
  );
}

const toISODate = (dateObj) => {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const day = String(dateObj.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatTime = (timeValue) => {
  if (!timeValue) return "--";
  const [hours, minutes] = timeValue.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
};

// Normalize a task from the API (description → note)
const normalizeApiTask = (task) => ({
  ...task,
  note: task.note ?? task.description ?? "",
});

function TaskRow({ task, onUndo, index = 0, lowMotion = false }) {
  const Article = lowMotion ? "article" : Motion.article;
  return (
    <Article
      className="rounded-xl border border-amber-100/10 bg-white/5 p-3"
      {...(lowMotion ? {} : {
        initial: { opacity: 0, y: 10 },
        animate: { opacity: 1, y: 0 },
        transition: { delay: index * 0.04, duration: 0.2 },
        whileHover: { y: -2, boxShadow: "0 8px 24px rgba(0,0,0,0.35)", borderColor: "rgba(251,191,36,0.2)" },
      })}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-stone-100">{task.title}</p>
          <p className="mt-1 text-xs text-stone-400">{task.note}</p>
        </div>
        <TaskStatusBadge status={task.status} />
      </div>

      <div className="today-task-footer mt-3 flex items-end justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs text-stone-300">
          <span className="rounded-full border border-amber-100/10 bg-black/20 px-2 py-1">{task.category}</span>
          <span className={`dashboard-card-priority ${PRIORITY_STYLES[task.priority]}`}>{task.priority}</span>
          <span className="rounded-full border border-amber-100/10 bg-black/20 px-2 py-1">{formatTime(task.time)}</span>
          {task.lateCompleted && task.completedAt && (
            <span className="flex items-center gap-1 rounded-full border border-orange-400/30 bg-orange-500/10 px-2 py-1 text-[11px] font-semibold text-orange-300">
              ⏰ Late · {formatTime(task.completedAt)}
            </span>
          )}
        </div>
        {onUndo && (
          <button
            type="button"
            onClick={onUndo}
            title="Undo — mark as pending"
            className="dashboard-card-action"
            data-tone="warning"
          >
            ↶ Undo
          </button>
        )}
      </div>
    </Article>
  );
}

function PriorityColumn({ priority, tasks }) {
  return (
    <section className="rounded-2xl border border-amber-100/10 bg-black/10 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-stone-100">{priority} Priority</h3>
        <span className={`dashboard-card-priority ${PRIORITY_STYLES[priority]}`}>
          {tasks.length} tasks
        </span>
      </div>

      <div className="mt-3 space-y-2">
        {tasks.length === 0 ? (
          <p className="text-xs text-stone-500">No tasks in this priority.</p>
        ) : (
          tasks.map((task) => (
            <div key={task.id} className="rounded-xl border border-amber-100/10 bg-white/5 p-3">
              <p className="text-sm font-semibold text-stone-100">{task.title}</p>
              <p className="mt-1 text-xs text-stone-400">{task.category}</p>
              <div className="mt-2 flex items-center justify-between text-xs text-stone-300">
                <span>{formatTime(task.time)}</span>
                <TaskStatusBadge status={task.status} />
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function PriorityFilter({ selected, onChange }) {
  const colorMap = (level, isActive) => {
    if (!isActive) return "border-amber-100/10 bg-white/5 text-stone-400";
    return { All: "border-amber-300/50 bg-amber-500/20 text-amber-100", High: "border-red-400/50 bg-red-500/20 text-red-100", Medium: "border-yellow-400/50 bg-yellow-500/20 text-yellow-100", Low: "border-green-400/50 bg-green-500/20 text-green-100" }[level];
  };
  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {["All", "High", "Medium", "Low"].map((level) => (
        <button key={level} type="button" onClick={() => onChange(level)}
          className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold leading-5 transition ${colorMap(level, selected === level)}`}>
          {level}
        </button>
      ))}
    </div>
  );
}

function TodayOverview({ tasks, pendingTasks, completedTasks, missedTasks, className = "" }) {
  return (
    <section className={`today-overview-card rounded-[1.4rem] border border-amber-100/10 bg-gradient-to-b from-black/20 to-black/10 p-4 shadow-xl shadow-black/20 sm:rounded-2xl sm:p-5 ${className}`}>
      <div>
        <p className="text-sm font-semibold text-amber-200">Today&apos;s Overview</p>
        <p className="mt-1 text-xs text-stone-400">A snapshot of your task progress for today.</p>
      </div>

      <div className="today-overview-stats mt-2 grid grid-cols-2 gap-1.5">
        <div className="rounded-lg border border-amber-100/10 bg-white/5 px-3 py-2 text-center">
          <p className="text-[10px] uppercase tracking-[0.16em] text-stone-500">All</p>
          <p className="mt-0.5 text-xl font-bold text-stone-100">{tasks.length}</p>
        </div>
        <div className="rounded-lg border border-amber-300/20 bg-amber-500/10 px-3 py-2 text-center">
          <p className="text-[10px] uppercase tracking-[0.16em] text-stone-500">Pending</p>
          <p className="mt-0.5 text-xl font-bold text-amber-200">{pendingTasks.length}</p>
        </div>
        <div className="rounded-lg border border-emerald-300/20 bg-emerald-500/10 px-3 py-2 text-center">
          <p className="text-[10px] uppercase tracking-[0.16em] text-stone-500">Completed</p>
          <p className="mt-0.5 text-xl font-bold text-emerald-200">{completedTasks.length}</p>
        </div>
        <div className="rounded-lg border border-rose-300/20 bg-rose-500/10 px-3 py-2 text-center">
          <p className="text-[10px] uppercase tracking-[0.16em] text-stone-500">Missed</p>
          <p className="mt-0.5 text-xl font-bold text-rose-200">{missedTasks.length}</p>
        </div>
      </div>

      <div className="mt-2 space-y-1.5">
        {[
          { label: "Completed", value: completedTasks.length, color: "bg-emerald-400" },
          { label: "Pending", value: pendingTasks.length, color: "bg-amber-400" },
          { label: "Missed", value: missedTasks.length, color: "bg-rose-400" },
        ].map(({ label, value, color }) => (
          <div key={label}>
            <div className="mb-1 flex items-center justify-between text-[11px] text-stone-400">
              <span>{label}</span>
              <span>{tasks.length > 0 ? Math.round((value / tasks.length) * 100) : 0}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className={`h-full rounded-full ${color} transition-all duration-500`}
                style={{ width: tasks.length > 0 ? `${(value / tasks.length) * 100}%` : "0%" }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function Today({ lowMotion = false, consistency }) {
  const { isDemoMode } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTodayView = searchParams.get("today");
  const mobileView = TODAY_VIEWS.some((view) => view.id === requestedTodayView)
    ? requestedTodayView
    : "overview";
  const Columns = lowMotion ? "div" : Motion.div;
  const Section = lowMotion ? "section" : Motion.section;
  const Article = lowMotion ? "article" : Motion.article;
  const Block = lowMotion ? "div" : Motion.div;
  const Action = lowMotion ? "button" : Motion.button;
  const sectionMotionProps = lowMotion ? {} : {
    variants: { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } },
    transition: { duration: 0.3 },
  };
  const todayISO = toISODate(new Date());

  const [tasks, setTasks] = useState(isDemoMode ? INITIAL_TASKS : []);
  const [loading, setLoading] = useState(!isDemoMode);
  const [allFilter, setAllFilter] = useState("All");
  const [pendingFilter, setPendingFilter] = useState("All");
  const [completedFilter, setCompletedFilter] = useState("All");
  const [latePrompt, setLatePrompt] = useState({ taskId: null, time: "" });

  const todayLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  useEffect(() => {
    if (isDemoMode) return;
    const fetchTodayTasks = async () => {
      try {
        const { data } = await api.get(`/todos?date=${todayISO}&view=active`);
        setTasks(data.map(normalizeApiTask));
      } catch (err) {
        console.error("Failed to fetch today's tasks:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchTodayTasks();
  }, [isDemoMode, todayISO]);

  const pendingTasks = useMemo(() => tasks.filter((t) => t.status === "pending"), [tasks]);
  const completedTasks = useMemo(() => tasks.filter((t) => t.status === "completed"), [tasks]);
  const missedTasks = useMemo(() => tasks.filter((t) => t.status === "missed"), [tasks]);
  const viewCounts = {
    overview: tasks.length,
    all: tasks.length,
    pending: pendingTasks.length,
    completed: completedTasks.length,
    missed: missedTasks.length,
  };

  const selectMobileView = (view) => {
    if (view === mobileView) return;
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set("view", "today");
      next.set("today", view);
      return next;
    });
    document.querySelector(".todo-main")?.scrollTo({ top: 0, behavior: "auto" });
  };

  const groupedByCategory = useMemo(
    () =>
      tasks.reduce((acc, task) => {
        if (!acc[task.category]) acc[task.category] = [];
        acc[task.category].push(task);
        return acc;
      }, {}),
    [tasks]
  );

  const markComplete = async (id) => {
    const prev = tasks;
    setTasks((prevTasks) =>
      prevTasks.map((t) => (t.id === id ? { ...t, previousStatus: t.status, status: "completed" } : t))
    );
    if (!isDemoMode) {
      try {
        const { data } = await api.patch(`/todos/${id}/toggle`, { date: todayISO });
        setTasks((prevTasks) =>
          prevTasks.map((t) => (t.id === id ? { ...normalizeApiTask(data), previousStatus: "pending" } : t))
        );
        window.dispatchEvent(new Event("monkmode:todos-updated"));
      } catch {
        setTasks(prev);
      }
    }
  };

  const undoComplete = async (id) => {
    const prev = tasks;
    setTasks((prevTasks) =>
      prevTasks.map((t) => {
        if (t.id !== id) return t;
        const { previousStatus, ...rest } = t;
        return { ...rest, status: previousStatus ?? "pending" };
      })
    );
    if (!isDemoMode) {
      try {
        const { data } = await api.patch(`/todos/${id}/status`, { date: todayISO, status: "pending" });
        setTasks((prevTasks) =>
          prevTasks.map((t) => {
            if (t.id !== id) return t;
            const { previousStatus: _previousStatus, ...rest } = t;
            return { ...rest, ...normalizeApiTask(data) };
          })
        );
        window.dispatchEvent(new Event("monkmode:todos-updated"));
      } catch {
        setTasks(prev);
      }
    }
  };

  const markCompleteWithTime = async (id, completedAt) => {
    const prev = tasks;
    setTasks((prevTasks) =>
      prevTasks.map((t) =>
        t.id === id
          ? { ...t, previousStatus: t.status, status: "completed", lateCompleted: true, completedAt }
          : t
      )
    );
    setLatePrompt({ taskId: null, time: "" });
    if (!isDemoMode) {
      try {
        const { data } = await api.patch(`/todos/${id}/status`, {
          date: todayISO,
          status: "completed",
          completedAt,
        });
        setTasks((prevTasks) =>
          prevTasks.map((t) => (t.id === id ? { ...normalizeApiTask(data), previousStatus: "pending" } : t))
        );
        window.dispatchEvent(new Event("monkmode:todos-updated"));
      } catch {
        setTasks(prev);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-stone-400">Loading today&apos;s tasks…</p>
      </div>
    );
  }

  return (
    <div className="todo-today-view" data-mobile-view={mobileView}>
      <nav className="today-mobile-filter" aria-label="Today's task views" data-demo-allow="true">
        <div className="today-mobile-consistency">
          <span className="today-mobile-consistency-icon" aria-hidden="true">📊</span>
          <div className="min-w-0">
            <p className="today-mobile-consistency-title">
              Consistency {isDemoMode ? "--" : `${consistency.lifetimeConsistency}%`}
            </p>
            <p className="today-mobile-consistency-detail">
              {isDemoMode ? "Demo mode" : `Today ${consistency.todayCompleted}/${consistency.todayTotal}`}
            </p>
          </div>
        </div>
        {TODAY_VIEWS.map((view) => (
          <button
            key={view.id}
            type="button"
            onClick={() => selectMobileView(view.id)}
            aria-pressed={mobileView === view.id}
            className="today-mobile-filter-button"
          >
            <span>{view.label}</span>
            <span className="today-mobile-filter-count">{viewCounts[view.id]}</span>
          </button>
        ))}
      </nav>
      <div className="today-layout">
        <section className="today-main rounded-[1.4rem] border border-amber-100/10 bg-gradient-to-b from-black/20 to-black/10 p-4 shadow-xl shadow-black/20 sm:rounded-2xl sm:p-6">
          <div className="today-desktop-heading flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-200/70">{todayLabel}</p>
              <h3 className="mt-2 text-2xl font-bold text-amber-100">Today&apos;s Tasks</h3>
            </div>

            <Motion.div
              className="today-heading-consistency hidden min-w-[255px] shrink-0 items-center gap-2 rounded-xl border border-amber-500/25 bg-amber-950/50 px-4 py-2.5 shadow-lg lg:flex"
              initial={lowMotion ? false : { opacity: 0, x: 16 }}
              animate={lowMotion ? undefined : { opacity: 1, x: 0 }}
              transition={lowMotion ? undefined : { duration: 0.4, ease: "easeOut" }}
              whileHover={lowMotion ? undefined : { boxShadow: "0 0 20px rgba(251,191,36,0.25)" }}
            >
              <Motion.span
                className="text-xl"
                aria-hidden="true"
                animate={lowMotion ? undefined : { scale: [1, 1.25, 1] }}
                transition={lowMotion ? undefined : { duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              >
                📊
              </Motion.span>
              <div className="flex min-w-0 flex-col">
                <span className="text-lg font-bold text-amber-400">
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
          </div>

          <TodayOverview
            className="today-overview-inline mt-4"
            tasks={tasks}
            pendingTasks={pendingTasks}
            completedTasks={completedTasks}
            missedTasks={missedTasks}
          />

          <Columns
            className="today-columns mt-5 grid grid-cols-1 gap-4 sm:mt-6 sm:gap-5"
            {...(lowMotion ? {} : {
              initial: "hidden",
              animate: "visible",
              variants: { hidden: {}, visible: { transition: { staggerChildren: 0.1 } } },
            })}
          >
            {/* 1. All Tasks */}
            <Section
              data-today-panel="all"
              className="today-scroll-card min-w-0 rounded-[1.25rem] border border-amber-100/10 bg-black/10 p-4 sm:rounded-2xl sm:p-5"
              {...sectionMotionProps}
            >
              <div className="today-panel-header">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-amber-200">1. All Tasks</p>
                  <p className="mt-1 text-xs text-stone-400">Grouped according to category for a full daily overview.</p>
                </div>
                <span className="whitespace-nowrap rounded-full border border-amber-100/10 bg-white/5 px-3 py-1 text-xs leading-none text-stone-300">
                  {Object.keys(groupedByCategory).length} categories
                </span>
              </div>
              <PriorityFilter selected={allFilter} onChange={setAllFilter} />

              <div className="journal-scroll today-scroll-body mt-3 space-y-4 pr-1">
                {tasks.length === 0 ? (
                  <p className="mt-3 text-xs text-stone-500">No tasks scheduled for today.</p>
                ) : (
                  Object.entries(groupedByCategory).map(([category, catTasks]) => {
                    const filtered = allFilter === "All" ? catTasks : catTasks.filter((t) => t.priority === allFilter);
                    if (filtered.length === 0) return null;
                    return (
                      <div key={category} className="rounded-[1.15rem] border border-amber-100/10 bg-white/[0.03] p-4 sm:rounded-2xl">
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                          <h4 className="text-sm font-semibold text-stone-100">{category}</h4>
                          <span className="text-xs text-stone-400">{filtered.length} tasks</span>
                        </div>
                        <div className="space-y-2">
                          {filtered.map((task) => (
                            <TaskRow key={task.id} task={task} lowMotion={lowMotion} />
                          ))}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </Section>

            {/* 2. Pending */}
            <Section
              data-today-panel="pending"
              className="today-scroll-card min-w-0 rounded-[1.25rem] border border-amber-100/10 bg-black/10 p-4 sm:rounded-2xl sm:p-5"
              {...sectionMotionProps}
            >
              <div className="today-panel-header">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-amber-200">2. Pending</p>
                  <p className="mt-1 text-xs text-stone-400">Tasks that still need attention today.</p>
                </div>
                <span className="whitespace-nowrap rounded-full border border-amber-300/25 bg-amber-500/10 px-3 py-1 text-xs font-semibold leading-none text-amber-100">
                  {pendingTasks.length} left
                </span>
              </div>
              <PriorityFilter selected={pendingFilter} onChange={setPendingFilter} />

              <div className="journal-scroll today-scroll-body mt-3 space-y-2 pr-1">
                {(() => {
                  const filtered = pendingFilter === "All" ? pendingTasks : pendingTasks.filter((t) => t.priority === pendingFilter);
                  return filtered.length === 0 ? (
                    <p className="mt-3 text-xs text-stone-500">
                      {pendingTasks.length === 0 ? "All tasks completed for today!" : "No pending tasks for this priority."}
                    </p>
                  ) : (
                    filtered.map((task, i) => (
                      <Article
                        key={task.id}
                        className="rounded-xl border border-amber-100/10 bg-white/5 p-3"
                        {...(lowMotion ? {} : {
                          initial: { opacity: 0, y: 8 },
                          animate: { opacity: 1, y: 0 },
                          transition: { delay: i * 0.04, duration: 0.2 },
                          whileHover: { y: -2, boxShadow: "0 8px 24px rgba(0,0,0,0.35)", borderColor: "rgba(251,191,36,0.2)" },
                        })}
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-stone-100">{task.title}</p>
                            <p className="mt-1 text-xs text-stone-400">{task.note}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => markComplete(task.id)}
                            className="dashboard-card-action"
                            data-tone="success"
                          >
                            ✓ Complete
                          </button>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-stone-300">
                          <span className="rounded-full border border-amber-100/10 bg-black/20 px-2 py-1">{task.category}</span>
                          <span className={`dashboard-card-priority ${PRIORITY_STYLES[task.priority]}`}>{task.priority}</span>
                          <span className="rounded-full border border-amber-100/10 bg-black/20 px-2 py-1">{formatTime(task.time)}</span>
                        </div>
                      </Article>
                    ))
                  );
                })()}
              </div>
            </Section>

            {/* 3. Completed */}
            <Section
              data-today-panel="completed"
              className="today-scroll-card min-w-0 rounded-[1.25rem] border border-amber-100/10 bg-black/10 p-4 sm:rounded-2xl sm:p-5"
              {...sectionMotionProps}
            >
              <div className="today-panel-header">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-amber-200">3. Completed</p>
                  <p className="mt-1 text-xs text-stone-400">Tasks already finished and closed for today.</p>
                </div>
                <span className="whitespace-nowrap rounded-full border border-emerald-300/25 bg-emerald-500/10 px-3 py-1 text-xs font-semibold leading-none text-emerald-100">
                  {completedTasks.length} done
                </span>
              </div>
              <PriorityFilter selected={completedFilter} onChange={setCompletedFilter} />

              <div className="journal-scroll today-scroll-body mt-3 space-y-2 pr-1">
                {(() => {
                  const filtered = completedFilter === "All" ? completedTasks : completedTasks.filter((t) => t.priority === completedFilter);
                  return filtered.length === 0 ? (
                    <p className="mt-3 text-xs text-stone-500">No completed tasks for this priority.</p>
                  ) : (
                    filtered.map((task) => (
                      <TaskRow key={task.id} task={task} onUndo={() => undoComplete(task.id)} lowMotion={lowMotion} />
                    ))
                  );
                })()}
              </div>
            </Section>
          </Columns>
        </section>

        <aside className="today-sidebar">
          <TodayOverview
            className="today-overview-side"
            tasks={tasks}
            pendingTasks={pendingTasks}
            completedTasks={completedTasks}
            missedTasks={missedTasks}
          />

          <section className="today-missed-card today-scroll-card rounded-[1.4rem] border border-amber-100/10 bg-gradient-to-b from-black/20 to-black/10 p-4 shadow-xl shadow-black/20 sm:rounded-2xl sm:p-5">
            <div className="today-panel-header">
              <div>
                <p className="text-sm font-semibold text-amber-200">Missed Tasks</p>
                <p className="mt-1 text-xs text-stone-400">Tasks that slipped past their expected time today.</p>
              </div>
              <span className="whitespace-nowrap rounded-full border border-rose-300/25 bg-rose-500/10 px-3 py-1 text-xs font-semibold leading-none text-rose-100">
                {missedTasks.length} missed
              </span>
            </div>

            <div className="journal-scroll today-scroll-body mt-4 space-y-2 pr-1">
              {missedTasks.length === 0 ? (
                <p className="text-xs text-stone-500">No missed tasks left for today.</p>
              ) : (
                missedTasks.map((task) => {
                  const isPrompting = latePrompt.taskId === task.id;
                  return (
                    <Block
                      key={task.id}
                      {...(lowMotion ? {} : { layout: true })}
                      className="rounded-xl border border-rose-400/15 bg-white/5 p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-stone-100">{task.title}</p>
                          <p className="mt-1 text-xs text-stone-400">{task.category}</p>
                        </div>
                        <TaskStatusBadge status={task.status} />
                      </div>

                      {/* Inline late-completion time picker */}
                      {isPrompting ? (
                        <Block
                          {...(lowMotion ? {} : { initial: { opacity: 0, y: -6 }, animate: { opacity: 1, y: 0 } })}
                          className="mt-3 space-y-2"
                        >
                          <p className="text-[11px] text-orange-300/80">When did you actually complete this?</p>
                          <div className="flex items-center gap-2">
<DashboardDateTimeInput
                              type="time"
                              value={latePrompt.time}
                              onChange={(e) => setLatePrompt((p) => ({ ...p, time: e.target.value }))}
                              className="rounded-lg border border-orange-400/25 bg-orange-500/10 px-2 py-1 text-xs text-orange-100 outline-none focus:border-orange-400/50"
                            />
                            <Action
                              type="button"
                              onClick={() => latePrompt.time && markCompleteWithTime(task.id, latePrompt.time)}
                              disabled={!latePrompt.time}
                              {...(lowMotion ? {} : { whileHover: { scale: 1.04 }, whileTap: { scale: 0.95 } })}
                              className="rounded-full border border-emerald-300/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-200 disabled:opacity-40 transition hover:border-emerald-300/50 hover:bg-emerald-500/20"
                            >
                              Confirm
                            </Action>
                            <button
                              type="button"
                              onClick={() => setLatePrompt({ taskId: null, time: "" })}
                              className="text-[11px] text-stone-500 hover:text-stone-300"
                            >
                              Cancel
                            </button>
                          </div>
                        </Block>
                      ) : (
                        <div className="today-missed-action-row mt-2 flex items-end justify-between gap-2 text-xs text-stone-300">
                          <span>{formatTime(task.time)}</span>
                          <button
                            type="button"
                            onClick={() => setLatePrompt({ taskId: task.id, time: "" })}
                            className="dashboard-card-action"
                            data-tone="success"
                          >
                            ✓ Mark as Complete
                          </button>
                        </div>
                      )}
                    </Block>
                  );
                })
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
