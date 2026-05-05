import { motion as Motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import useAuth from "../../hooks/useAuth";
import api from "../../api/axios";

const PRIORITY_ORDER = ["High", "Medium", "Low"];

const PRIORITY_STYLES = {
  High: "border-red-400/30 bg-red-500/10 text-red-200",
  Medium: "border-yellow-400/30 bg-yellow-500/10 text-yellow-200",
  Low: "border-green-400/30 bg-green-500/10 text-green-200",
};

const formatTime = (timeValue) => {
  if (!timeValue) return "--";
  const [hours, minutes] = timeValue.split(":").map(Number);
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
};

const getDateOffset = (daysOffset) => {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return d;
};

const toISODate = (dateObj) => {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const day = String(dateObj.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDayLabel = (date) =>
  date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

const formatWeekday = (date) =>
  date.toLocaleDateString("en-US", { weekday: "long" });

// ── Mock data ─────────────────────────────────────────────────────────────────

const TOMORROW_TASKS = [
  { id: "tm-1", title: "Design Sprint Review", category: "Work", priority: "High", time: "10:00", note: "Present UI mockups to the team." },
  { id: "tm-2", title: "Morning Run", category: "Fitness", priority: "Medium", time: "06:30", note: "5 km easy pace, focus on breathing." },
  { id: "tm-3", title: "Read 30 Pages", category: "Study", priority: "Low", time: "21:00", note: "Continue Atomic Habits chapter 5." },
  { id: "tm-4", title: "Pay Internet Bill", category: "Bill & Payment", priority: "High", time: "12:00", note: "Auto-debit may fail — check manually." },
  { id: "tm-5", title: "Doctor Appointment", category: "Health", priority: "Medium", time: "14:00", note: "Annual checkup at 2 PM." },
  { id: "tm-6", title: "Code Review", category: "Work", priority: "High", time: "16:00", note: "Review 3 open PRs before EOD." },
];

const NEXT5_TASKS = [
  { id: "n5-1",  title: "System Design Study",    category: "Study",          priority: "High",   time: "08:00", note: "Cover distributed systems basics.",          dayOffset: 2 },
  { id: "n5-2",  title: "Grocery Shopping",        category: "Shopping",       priority: "Low",    time: "17:00", note: "Weekly grocery run.",                        dayOffset: 2 },
  { id: "n5-3",  title: "Team Standup",            category: "Work",           priority: "Medium", time: "09:30", note: "Share sprint update with the team.",          dayOffset: 2 },
  { id: "n5-4",  title: "Fix Auth Bug",            category: "Work",           priority: "High",   time: "11:00", note: "Token refresh loop on mobile browsers.",      dayOffset: 2 },
  { id: "n5-5",  title: "Stretching Routine",      category: "Fitness",        priority: "Low",    time: "06:45", note: "15 min morning stretch before desk work.",    dayOffset: 2 },
  { id: "n5-6",  title: "Read Tech Articles",      category: "Study",          priority: "Low",    time: "22:00", note: "Catch up on dev.to and Hacker News.",         dayOffset: 2 },
  { id: "n5-7",  title: "Water Plants",            category: "Personal",       priority: "Low",    time: "19:00", note: "Balcony plants need watering.",               dayOffset: 2 },
  { id: "n5-8",  title: "Deploy Feature Branch",   category: "Work",           priority: "High",   time: "11:00", note: "Push to staging environment.",               dayOffset: 3 },
  { id: "n5-9",  title: "Yoga Session",            category: "Fitness",        priority: "Low",    time: "07:00", note: "30 min flexibility focus.",                  dayOffset: 3 },
  { id: "n5-10", title: "DSA Practice",            category: "Study",          priority: "High",   time: "20:00", note: "Solve 2 hard tree problems.",                dayOffset: 3 },
  { id: "n5-11", title: "Write Unit Tests",        category: "Work",           priority: "Medium", time: "14:00", note: "Cover edge cases in the auth module.",        dayOffset: 3 },
  { id: "n5-12", title: "Lunch with Friend",       category: "Personal",       priority: "Low",    time: "13:00", note: "Confirmed at the new cafe downtown.",         dayOffset: 3 },
  { id: "n5-13", title: "Phone Bill Payment",      category: "Bill & Payment", priority: "High",   time: "10:00", note: "Due by end of day, avoid late fee.",          dayOffset: 3 },
  { id: "n5-14", title: "Evening Jog",             category: "Fitness",        priority: "Medium", time: "18:30", note: "4 km moderate pace around the park.",         dayOffset: 3 },
  { id: "n5-15", title: "Client Demo",             category: "Work",           priority: "High",   time: "15:00", note: "Live demo of dashboard features.",            dayOffset: 4 },
  { id: "n5-16", title: "Meal Prep",               category: "Health",         priority: "Low",    time: "18:30", note: "Prep meals for 3 days.",                      dayOffset: 4 },
  { id: "n5-17", title: "Code Review",             category: "Work",           priority: "Medium", time: "13:00", note: "Review PRs from teammates.",                  dayOffset: 4 },
  { id: "n5-18", title: "Update Resume",           category: "Personal",       priority: "Medium", time: "21:00", note: "Add new projects and skills.",                dayOffset: 4 },
  { id: "n5-19", title: "Cardio — Cycling",        category: "Fitness",        priority: "Medium", time: "07:30", note: "30 min stationary cycling session.",           dayOffset: 4 },
  { id: "n5-20", title: "Organize Downloads",       category: "Personal",       priority: "Low",    time: "20:00", note: "Clean up and archive old files.",             dayOffset: 4 },
  { id: "n5-21", title: "DB Migration Review",     category: "Work",           priority: "High",   time: "10:30", note: "Verify schema changes before merge.",         dayOffset: 4 },
  { id: "n5-22", title: "Portfolio Update",        category: "Work",           priority: "Medium", time: "10:00", note: "Add recent project screenshots.",             dayOffset: 5 },
  { id: "n5-23", title: "Call Parents",            category: "Personal",       priority: "Low",    time: "20:00", note: "Weekly Sunday check-in.",                    dayOffset: 5 },
  { id: "n5-24", title: "Write Blog Draft",        category: "Personal",       priority: "Medium", time: "21:30", note: "Draft post on React patterns.",               dayOffset: 5 },
  { id: "n5-25", title: "Meditation — 20 min",     category: "Health",         priority: "Low",    time: "06:30", note: "Use a guided meditation app session.",        dayOffset: 5 },
  { id: "n5-26", title: "API Documentation",       category: "Work",           priority: "High",   time: "11:00", note: "Document all new endpoints for the team.",    dayOffset: 5 },
  { id: "n5-27", title: "Grocery Restock",         category: "Shopping",       priority: "Low",    time: "16:00", note: "Eggs, bread, oats, and protein powder.",      dayOffset: 5 },
  { id: "n5-28", title: "Watch System Design Talk",category: "Study",          priority: "Medium", time: "22:00", note: "Uber engineering YouTube talk.",              dayOffset: 5 },
  { id: "n5-29", title: "Sprint Retrospective",    category: "Work",           priority: "High",   time: "15:00", note: "End-of-sprint retrospective.",               dayOffset: 6 },
  { id: "n5-30", title: "Evening Walk",            category: "Fitness",        priority: "Low",    time: "18:00", note: "Wind down after the week.",                  dayOffset: 6 },
  { id: "n5-31", title: "Plan Next Week",          category: "Personal",       priority: "Medium", time: "21:00", note: "Set goals and task priorities.",              dayOffset: 6 },
  { id: "n5-32", title: "Fix Lint Errors",         category: "Work",           priority: "Medium", time: "09:00", note: "Clean up ESLint warnings in the codebase.",   dayOffset: 6 },
  { id: "n5-33", title: "Insurance Premium",       category: "Bill & Payment", priority: "High",   time: "11:00", note: "Annual premium auto-payment confirmation.",   dayOffset: 6 },
  { id: "n5-34", title: "Cook New Recipe",         category: "Personal",       priority: "Low",    time: "19:30", note: "Try the Thai basil chicken recipe.",          dayOffset: 6 },
  { id: "n5-35", title: "Read Design System Docs", category: "Study",          priority: "Low",    time: "22:30", note: "Explore Radix UI and shadcn patterns.",       dayOffset: 6 },
];

// ── Sub-components ─────────────────────────────────────────────────────────────

function TaskCard({ task, index = 0 }) {
  return (
    <Motion.article
      className="rounded-xl border border-amber-100/10 bg-white/5 p-3"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.2 }}
      whileHover={{ y: -2, boxShadow: "0 8px 20px rgba(0,0,0,0.35)", borderColor: "rgba(251,191,36,0.2)" }}
    >
      <p className="text-sm font-semibold leading-snug text-stone-100">{task.title}</p>
      <p className="mt-1 text-xs text-stone-400">{task.note ?? task.description}</p>
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-xs">
        <span className="rounded-full border border-amber-100/10 bg-black/20 px-2 py-0.5 text-stone-300">
          {task.category}
        </span>
        <span className={`rounded-full border px-2 py-0.5 font-semibold ${PRIORITY_STYLES[task.priority]}`}>
          {task.priority}
        </span>
        <span className="rounded-full border border-amber-100/10 bg-black/20 px-2 py-0.5 text-stone-300">
          {formatTime(task.time)}
        </span>
      </div>
    </Motion.article>
  );
}

function PriorityFilterBar({ selected, onChange }) {
  const colorMap = (level, isActive) => {
    if (!isActive) return "border-amber-100/10 bg-white/5 text-stone-400";
    return {
      All: "border-amber-300/50 bg-amber-500/20 text-amber-100",
      High: "border-red-400/50 bg-red-500/20 text-red-100",
      Medium: "border-yellow-400/50 bg-yellow-500/20 text-yellow-100",
      Low: "border-green-400/50 bg-green-500/20 text-green-100",
    }[level];
  };

  return (
    <div className="flex flex-wrap gap-2">
      {["All", ...PRIORITY_ORDER].map((level) => (
        <button
          key={level}
          type="button"
          onClick={() => onChange(level)}
          className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${colorMap(level, selected === level)}`}
        >
          {level}
        </button>
      ))}
    </div>
  );
}

function DayColumn({ date, tasks, selectedPriority }) {
  const filtered =
    selectedPriority === "All" ? tasks : tasks.filter((t) => t.priority === selectedPriority);

  return (
    <div className="upcoming-day-col">
      <div className="mb-2 rounded-xl border border-amber-100/10 bg-black/15 px-3 py-2.5">
        <p className="text-xs font-bold text-amber-200">{formatWeekday(date)}</p>
        <p className="text-[11px] text-stone-400">{formatDayLabel(date)}</p>
        <span className="mt-1.5 inline-block rounded-full border border-amber-100/10 bg-white/5 px-2 py-0.5 text-[10px] text-stone-400">
          {filtered.length} task{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="journal-scroll upcoming-day-scroll space-y-2 pr-1">
        {filtered.length === 0 ? (
          <p className="px-1 text-xs text-stone-500">No tasks.</p>
        ) : (
          filtered.map((task) => <TaskCard key={task.id} task={task} />)
        )}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function Upcoming() {
  const { isDemoMode } = useAuth();
  const [tomorrowPriority, setTomorrowPriority] = useState("All");
  const [next5Priority, setNext5Priority] = useState("All");

  // Real user state
  const [tomorrowTasks, setTomorrowTasks] = useState(isDemoMode ? TOMORROW_TASKS : []);
  const [next5Data, setNext5Data] = useState(
    isDemoMode
      ? [2, 3, 4, 5, 6].map((offset) => ({
          date: getDateOffset(offset),
          tasks: NEXT5_TASKS.filter((t) => t.dayOffset === offset),
        }))
      : [2, 3, 4, 5, 6].map((offset) => ({ date: getDateOffset(offset), tasks: [] }))
  );
  const [loading, setLoading] = useState(!isDemoMode);

  const tomorrowDate = getDateOffset(1);

  useEffect(() => {
    if (isDemoMode) return;

    const fetchUpcoming = async () => {
      try {
        const offsets = [1, 2, 3, 4, 5, 6];
        const dates = offsets.map((o) => toISODate(getDateOffset(o)));
        const results = await Promise.all(
          dates.map((dateISO) => api.get(`/todos?date=${dateISO}&view=active`))
        );

        const [tomorrowRes, ...next5Responses] = results;
        setTomorrowTasks(tomorrowRes.data);
        setNext5Data(
          next5Responses.map((res, i) => ({
            date: getDateOffset(i + 2),
            tasks: res.data,
          }))
        );
      } catch (err) {
        console.error("Failed to fetch upcoming tasks:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchUpcoming();
  }, [isDemoMode]);

  const tomorrowFiltered = useMemo(
    () =>
      tomorrowPriority === "All"
        ? tomorrowTasks
        : tomorrowTasks.filter((t) => t.priority === tomorrowPriority),
    [tomorrowPriority, tomorrowTasks]
  );

  const totalNext5 = useMemo(
    () => next5Data.reduce((sum, { tasks }) => sum + tasks.length, 0),
    [next5Data]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-stone-400">Loading upcoming tasks…</p>
      </div>
    );
  }

  return (
    <div className="upcoming-layout">
      {/* ── Card 1: Tomorrow ──────────────────────────────────────────────── */}
      <section className="upcoming-card-tomorrow upcoming-scroll-card rounded-2xl border border-amber-100/10 bg-gradient-to-b from-black/20 to-black/10 p-5 shadow-xl shadow-black/20">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-200/70">
              Tomorrow
            </p>
            <h3 className="mt-1 text-xl font-bold text-amber-100">{formatDayLabel(tomorrowDate)}</h3>
            <p className="mt-1 text-xs text-stone-400">{tomorrowTasks.length} tasks scheduled</p>
          </div>
          <div className="shrink-0 rounded-xl border border-amber-100/10 bg-white/5 px-4 py-2 text-center">
            <p className="text-[10px] uppercase tracking-[0.16em] text-stone-500">Tasks</p>
            <p className="mt-0.5 text-xl font-semibold text-amber-200">{tomorrowTasks.length}</p>
          </div>
        </div>

        <div className="mt-4">
          <PriorityFilterBar selected={tomorrowPriority} onChange={setTomorrowPriority} />
        </div>

        <div className="journal-scroll upcoming-scroll-body mt-4 space-y-2 pr-1">
          {tomorrowFiltered.length === 0 ? (
            <p className="text-xs text-stone-500">
              {tomorrowTasks.length === 0 ? "No tasks scheduled for tomorrow." : "No tasks for this priority."}
            </p>
          ) : (
            tomorrowFiltered.map((task) => <TaskCard key={task.id} task={task} />)
          )}
        </div>
      </section>

      {/* ── Card 2: Next 5 Days ───────────────────────────────────────────── */}
      <section className="upcoming-card-next5 upcoming-next5-card rounded-2xl border border-amber-100/10 bg-gradient-to-b from-black/20 to-black/10 p-5 shadow-xl shadow-black/20">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-200/70">
              Next 5 Days
            </p>
            <h3 className="mt-1 text-xl font-bold text-amber-100">Upcoming Schedule</h3>
            <p className="mt-1 text-xs text-stone-400">
              {formatDayLabel(getDateOffset(2))} — {formatDayLabel(getDateOffset(6))}
            </p>
          </div>
          <div className="shrink-0 rounded-xl border border-amber-100/10 bg-white/5 px-4 py-2 text-center">
            <p className="text-[10px] uppercase tracking-[0.16em] text-stone-500">Total</p>
            <p className="mt-0.5 text-xl font-semibold text-stone-100">{totalNext5}</p>
          </div>
        </div>

        <div className="mt-4">
          <PriorityFilterBar selected={next5Priority} onChange={setNext5Priority} />
        </div>

        <div className="upcoming-next5-body mt-4">
          {next5Data.map(({ date, tasks }) => (
            <DayColumn
              key={date.toDateString()}
              date={date}
              tasks={tasks}
              selectedPriority={next5Priority}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
