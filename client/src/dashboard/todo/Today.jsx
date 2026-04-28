import { motion as Motion } from "framer-motion";
import { useMemo, useState } from "react";

export const INITIAL_TASKS = [
  // Study
  { id: "study-dsa",      title: "Revise Graph Algorithms",    category: "Study",          priority: "High",   status: "pending",   time: "07:30", note: "Finish BFS, DFS, and solve 3 medium questions." },
  { id: "study-os",       title: "Read OS Concepts",           category: "Study",          priority: "Medium", status: "pending",   time: "14:00", note: "Cover process scheduling and memory management." },
  { id: "study-mock",     title: "Take Mock Interview",        category: "Study",          priority: "High",   status: "missed",    time: "16:30", note: "45-min timed mock on LeetCode." },

  // Work
  { id: "team-sync",      title: "Frontend Team Sync",         category: "Work",           priority: "High",   status: "completed", time: "09:15", note: "Share progress on dashboard schedule module." },
  { id: "work-pr",        title: "Raise Pull Request",         category: "Work",           priority: "High",   status: "pending",   time: "11:00", note: "Submit today's feature branch for review." },
  { id: "work-docs",      title: "Update API Docs",            category: "Work",           priority: "Medium", status: "completed", time: "13:30", note: "Document the new /schedule endpoints." },
  { id: "work-deploy",    title: "Deploy to Staging",          category: "Work",           priority: "Medium", status: "pending",   time: "17:00", note: "Push latest build to staging environment." },

  // Fitness
  { id: "gym-session",    title: "Strength Workout",           category: "Fitness",        priority: "Medium", status: "pending",   time: "18:00", note: "45 minutes upper body and mobility cooldown." },
  { id: "gym-stretch",    title: "Morning Stretch",            category: "Fitness",        priority: "Low",    status: "completed", time: "06:30", note: "10-min full-body stretch to wake up." },
  { id: "gym-run",        title: "Evening Run",                category: "Fitness",        priority: "Medium", status: "pending",   time: "19:30", note: "3 km easy pace around the block." },

  // Health
  { id: "water-intake",   title: "Track Water Intake",         category: "Health",         priority: "Low",    status: "completed", time: "10:00", note: "Complete first 2 bottles before lunch." },
  { id: "health-sleep",   title: "Sleep by 11 PM",             category: "Health",         priority: "Medium", status: "pending",   time: "23:00", note: "No screens 30 min before bed." },
  { id: "health-vitamins",title: "Take Vitamins",              category: "Health",         priority: "Low",    status: "missed",    time: "08:00", note: "D3, B12, and Omega-3 with breakfast." },

  // Bill & Payment
  { id: "electricity-bill", title: "Pay Electricity Bill",    category: "Bill & Payment", priority: "High",   status: "missed",    time: "11:30", note: "Due today before late fee applies." },
  { id: "rent-transfer",  title: "Transfer Rent",              category: "Bill & Payment", priority: "High",   status: "completed", time: "09:00", note: "Monthly rent, landlord expects it by noon." },
  { id: "subscription",   title: "Cancel Unused Subscription", category: "Bill & Payment", priority: "Low",    status: "pending",   time: "15:00", note: "Cancel the streaming plan before auto-renewal." },

  // Personal
  { id: "call-home",      title: "Call Parents",               category: "Personal",       priority: "Medium", status: "pending",   time: "20:30", note: "Check in after dinner." },
  { id: "journal-entry",  title: "Write Journal Entry",        category: "Personal",       priority: "Low",    status: "pending",   time: "22:00", note: "Reflect on today's wins and blockers." },
  { id: "clean-desk",     title: "Clean Workspace",            category: "Personal",       priority: "Low",    status: "completed", time: "08:30", note: "Declutter desk before the workday starts." },

  // Shopping
  { id: "groceries",      title: "Order Groceries",            category: "Shopping",       priority: "Low",    status: "missed",    time: "13:00", note: "Milk, oats, bananas, and eggs." },
  { id: "buy-earphones",  title: "Buy Earphones",              category: "Shopping",       priority: "Medium", status: "pending",   time: "14:30", note: "Check deals on Amazon before purchasing." },
];

const PRIORITY_ORDER = ["High", "Medium", "Low"];

const PRIORITY_STYLES = {
  High: "border-red-400/30 bg-red-500/10 text-red-200",
  Medium: "border-yellow-400/30 bg-yellow-500/10 text-yellow-200",
  Low: "border-green-400/30 bg-green-500/10 text-green-200",
};

const STATUS_STYLES = {
  pending: "border-amber-300/25 bg-amber-500/10 text-amber-100",
  completed: "border-emerald-300/25 bg-emerald-500/10 text-emerald-100",
  missed: "border-rose-300/25 bg-rose-500/10 text-rose-100",
};

const STATUS_LABELS = {
  pending: "Pending",
  completed: "Completed",
  missed: "Missed",
};

const formatTime = (timeValue) => {
  const [hours, minutes] = timeValue.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
};

function TaskRow({ task, onUndo, index = 0 }) {
  return (
    <Motion.article
      className="rounded-xl border border-amber-100/10 bg-white/5 p-3"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.2 }}
      whileHover={{ y: -2, boxShadow: "0 8px 24px rgba(0,0,0,0.35)", borderColor: "rgba(251,191,36,0.2)" }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-stone-100">{task.title}</p>
          <p className="mt-1 text-xs text-stone-400">{task.note}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {onUndo && (
            <button
              type="button"
              onClick={onUndo}
              title="Undo — mark as pending"
              className="rounded-full border border-amber-300/25 bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-200 transition hover:border-amber-300/50 hover:bg-amber-500/20"
            >
              Undo
            </button>
          )}
          <span className={`rounded-full border px-2 py-1 text-[11px] font-semibold ${STATUS_STYLES[task.status]}`}>
            {STATUS_LABELS[task.status]}
          </span>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-stone-300">
        <span className="rounded-full border border-amber-100/10 bg-black/20 px-2 py-1">{task.category}</span>
        <span className={`rounded-full border px-2 py-1 ${PRIORITY_STYLES[task.priority]}`}>{task.priority}</span>
        <span className="rounded-full border border-amber-100/10 bg-black/20 px-2 py-1">{formatTime(task.time)}</span>
        {task.lateCompleted && task.completedAt && (
          <span className="flex items-center gap-1 rounded-full border border-orange-400/30 bg-orange-500/10 px-2 py-1 text-[11px] font-semibold text-orange-300">
            ⏰ Late · {formatTime(task.completedAt)}
          </span>
        )}
      </div>
    </Motion.article>
  );
}

function PriorityColumn({ priority, tasks }) {
  return (
    <section className="rounded-2xl border border-amber-100/10 bg-black/10 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-stone-100">{priority} Priority</h3>
        <span className={`rounded-full border px-2 py-1 text-[11px] font-semibold ${PRIORITY_STYLES[priority]}`}>
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
                <span className={`rounded-full border px-2 py-1 ${STATUS_STYLES[task.status]}`}>
                  {STATUS_LABELS[task.status]}
                </span>
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

export default function Today() {
  const [tasks, setTasks] = useState(INITIAL_TASKS);
  const [allFilter, setAllFilter] = useState("All");
  const [pendingFilter, setPendingFilter] = useState("All");
  const [completedFilter, setCompletedFilter] = useState("All");
  const [latePrompt, setLatePrompt] = useState({ taskId: null, time: "" });

  const todayLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  const pendingTasks = useMemo(() => tasks.filter((t) => t.status === "pending"), [tasks]);
  const completedTasks = useMemo(() => tasks.filter((t) => t.status === "completed"), [tasks]);
  const missedTasks = useMemo(() => tasks.filter((t) => t.status === "missed"), [tasks]);

  const groupedByCategory = useMemo(
    () =>
      tasks.reduce((acc, task) => {
        if (!acc[task.category]) acc[task.category] = [];
        acc[task.category].push(task);
        return acc;
      }, {}),
    [tasks]
  );

  const markComplete = (id) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, previousStatus: t.status, status: "completed" } : t))
    );
  };

  const undoComplete = (id) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const { previousStatus, ...rest } = t;
        return { ...rest, status: previousStatus ?? "pending" };
      })
    );
  };

  const markCompleteWithTime = (id, completedAt) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, previousStatus: t.status, status: "completed", lateCompleted: true, completedAt }
          : t
      )
    );
    setLatePrompt({ taskId: null, time: "" });
  };

  return (
    <div className="space-y-5">
      <div className="today-layout">
        <section className="today-main rounded-2xl border border-amber-100/10 bg-gradient-to-b from-black/20 to-black/10 p-6 shadow-xl shadow-black/20">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-200/70">{todayLabel}</p>
            <h3 className="mt-2 text-2xl font-bold text-amber-100">Today&apos;s Tasks</h3>
          </div>

          <Motion.div
            className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2 2xl:grid-cols-3"
            initial="hidden"
            animate="visible"
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1 } } }}
          >
            {/* 1. All Tasks */}
            <Motion.section
              className="today-scroll-card min-w-0 rounded-2xl border border-amber-100/10 bg-black/10 p-5"
              variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
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
                {Object.entries(groupedByCategory).map(([category, catTasks]) => {
                  const filtered = allFilter === "All" ? catTasks : catTasks.filter((t) => t.priority === allFilter);
                  if (filtered.length === 0) return null;
                  return (
                    <div key={category} className="rounded-2xl border border-amber-100/10 bg-white/[0.03] p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-stone-100">{category}</h4>
                        <span className="text-xs text-stone-400">{filtered.length} tasks</span>
                      </div>
                      <div className="space-y-2">
                        {filtered.map((task) => (
                          <TaskRow key={task.id} task={task} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Motion.section>

            {/* 2. Pending */}
            <Motion.section
              className="today-scroll-card min-w-0 rounded-2xl border border-amber-100/10 bg-black/10 p-5"
              variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
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
                      <Motion.article
                        key={task.id}
                        className="rounded-xl border border-amber-100/10 bg-white/5 p-3"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04, duration: 0.2 }}
                        whileHover={{ y: -2, boxShadow: "0 8px 24px rgba(0,0,0,0.35)", borderColor: "rgba(251,191,36,0.2)" }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-stone-100">{task.title}</p>
                            <p className="mt-1 text-xs text-stone-400">{task.note}</p>
                          </div>
                          <Motion.button
                            type="button"
                            onClick={() => markComplete(task.id)}
                            whileHover={{ scale: 1.05, boxShadow: "0 0 12px rgba(52,211,153,0.3)" }}
                            whileTap={{ scale: 0.95 }}
                            className="shrink-0 rounded-full border border-emerald-300/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-200 transition hover:border-emerald-300/50 hover:bg-emerald-500/20"
                          >
                            ✓ Done
                          </Motion.button>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-stone-300">
                          <span className="rounded-full border border-amber-100/10 bg-black/20 px-2 py-1">{task.category}</span>
                          <span className={`rounded-full border px-2 py-1 ${PRIORITY_STYLES[task.priority]}`}>{task.priority}</span>
                          <span className="rounded-full border border-amber-100/10 bg-black/20 px-2 py-1">{formatTime(task.time)}</span>
                        </div>
                      </Motion.article>
                    ))
                  );
                })()}
              </div>
            </Motion.section>

            {/* 3. Completed */}
            <Motion.section
              className="today-scroll-card min-w-0 rounded-2xl border border-amber-100/10 bg-black/10 p-5"
              variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
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
                      <TaskRow key={task.id} task={task} onUndo={() => undoComplete(task.id)} />
                    ))
                  );
                })()}
              </div>
            </Motion.section>
          </Motion.div>
        </section>

        <aside className="today-sidebar space-y-5">
          <section className="rounded-2xl border border-amber-100/10 bg-gradient-to-b from-black/20 to-black/10 p-5 shadow-xl shadow-black/20">
            <div>
              <p className="text-sm font-semibold text-amber-200">Today&apos;s Overview</p>
              <p className="mt-1 text-xs text-stone-400">A snapshot of your task progress for today.</p>
            </div>

            <div className="mt-2 grid grid-cols-2 gap-1.5">
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
                { label: "Pending",   value: pendingTasks.length,   color: "bg-amber-400" },
                { label: "Missed",    value: missedTasks.length,    color: "bg-rose-400" },
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

          <section className="today-scroll-card rounded-2xl border border-amber-100/10 bg-gradient-to-b from-black/20 to-black/10 p-5 shadow-xl shadow-black/20">
            <div className="flex items-center justify-between">
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
                    <Motion.div
                      key={task.id}
                      layout
                      className="rounded-xl border border-rose-400/15 bg-white/5 p-3"
                    >
                      <p className="text-sm font-semibold text-stone-100">{task.title}</p>
                      <p className="mt-1 text-xs text-stone-400">{task.category}</p>

                      {/* Inline late-completion time picker */}
                      {isPrompting ? (
                        <Motion.div
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-3 space-y-2"
                        >
                          <p className="text-[11px] text-orange-300/80">When did you actually complete this?</p>
                          <div className="flex items-center gap-2">
                            <input
                              type="time"
                              value={latePrompt.time}
                              onChange={(e) => setLatePrompt((p) => ({ ...p, time: e.target.value }))}
                              className="rounded-lg border border-orange-400/25 bg-orange-500/10 px-2 py-1 text-xs text-orange-100 outline-none focus:border-orange-400/50"
                            />
                            <Motion.button
                              type="button"
                              onClick={() => latePrompt.time && markCompleteWithTime(task.id, latePrompt.time)}
                              disabled={!latePrompt.time}
                              whileHover={{ scale: 1.04 }}
                              whileTap={{ scale: 0.95 }}
                              className="rounded-full border border-emerald-300/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-200 disabled:opacity-40 transition hover:border-emerald-300/50 hover:bg-emerald-500/20"
                            >
                              Confirm
                            </Motion.button>
                            <button
                              type="button"
                              onClick={() => setLatePrompt({ taskId: null, time: "" })}
                              className="text-[11px] text-stone-500 hover:text-stone-300"
                            >
                              Cancel
                            </button>
                          </div>
                        </Motion.div>
                      ) : (
                        <div className="mt-2 flex items-center justify-between gap-2 text-xs text-stone-300">
                          <span>{formatTime(task.time)}</span>
                          <div className="flex shrink-0 items-center gap-1.5">
                            <Motion.button
                              type="button"
                              onClick={() => setLatePrompt({ taskId: task.id, time: "" })}
                              whileHover={{ scale: 1.04, boxShadow: "0 0 12px rgba(52,211,153,0.25)" }}
                              whileTap={{ scale: 0.95 }}
                              className="rounded-full border border-emerald-300/30 bg-emerald-500/10 px-2 py-1 text-[11px] font-semibold text-emerald-200 transition hover:border-emerald-300/50 hover:bg-emerald-500/20"
                            >
                              Mark as Complete
                            </Motion.button>
                            <span className={`rounded-full border px-2 py-1 ${STATUS_STYLES[task.status]}`}>
                              {STATUS_LABELS[task.status]}
                            </span>
                          </div>
                        </div>
                      )}
                    </Motion.div>
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
