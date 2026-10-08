import { motion as Motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../../api/axios";
import useAuth from "../../hooks/useAuth";
import useMobileLowMotion from "../../hooks/useMobileLowMotion";
import { INITIAL_HABITS } from "../../../data/HabitDummyData";

const toISODate = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const toDateOnly = (value) => {
  if (!value) return null;
  if (typeof value === "string") return value.slice(0, 10);
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return toISODate(parsed);
};

const PRIORITY_STYLES = {
  High: "border-red-400/30 bg-red-500/10 text-red-200",
  Medium: "border-yellow-400/30 bg-yellow-500/10 text-yellow-200",
  Low: "border-green-400/30 bg-green-500/10 text-green-200",
};

const STATUS_TONES = {
  pending: "warning",
  completed: "success",
  broken: "danger",
};

const STATUS_LABELS = {
  pending: "Pending",
  completed: "Done",
  broken: "Streak Break",
};

const TIME_SLOT_OPTIONS = [
  { value: "All", label: "All" },
  { value: "morning", label: "Morning" },
  { value: "afternoon", label: "Afternoon" },
  { value: "evening", label: "Evening" },
  { value: "night", label: "Night" },
];

const HABIT_TODAY_VIEWS = [
  { id: "all", icon: "▦", label: "All Habits" },
  { id: "pending", icon: "◷", label: "Pending" },
  { id: "completed", icon: "✓", label: "Completed" },
  { id: "streak", icon: "🔥", label: "Streak Summary" },
];

const timeSlotLabel = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
  night: "Night",
};

const formatTime = (timeValue) => {
  const [hours, minutes] = timeValue.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
};

const getTimeSlot = (timeValue) => {
  const [hours] = timeValue.split(":").map(Number);
  if (hours >= 5 && hours < 12) return "morning";
  if (hours >= 12 && hours < 17) return "afternoon";
  if (hours >= 17 && hours < 21) return "evening";
  return "night";
};

const matchesTimeSlot = (habit, selectedTimeSlot) =>
  selectedTimeSlot === "All" || getTimeSlot(habit.time) === selectedTimeSlot;

const isHabitScheduledForDate = (habit, dateISO) => {
  const target = new Date(`${dateISO}T00:00:00`);
  if (Number.isNaN(target.getTime())) return false;

  const startDate = toDateOnly(habit?.startDate || habit?.createdAt);
  const endDate = toDateOnly(habit?.endDate);
  if (startDate && dateISO < startDate) return false;
  if (endDate && dateISO > endDate) return false;

  const repeatType = String(habit?.repeatType || "daily").toLowerCase();
  const dayIndex = target.getDay();

  if (repeatType === "weekend") return dayIndex === 0 || dayIndex === 6;
  if (repeatType === "weekdays") {
    const selectedDays = Array.isArray(habit?.days) && habit.days.length
      ? habit.days
      : ["Mon", "Tue", "Wed", "Thu", "Fri"];
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return selectedDays.includes(dayNames[dayIndex]);
  }

  return true;
};

const getHabitStatus = (habit) => {
  if (habit.status === "completed") return "completed";
  return "pending";
};

function HabitRow({ habit, status, onUndo, index = 0, lowMotion = false }) {
  const slot = getTimeSlot(habit.time);
  const Row = lowMotion ? "article" : Motion.article;

  return (
    <Row
      className="rounded-xl border border-amber-100/10 bg-white/5 p-3"
      {...(lowMotion ? {} : {
        initial: { opacity: 0, y: 10 },
        animate: { opacity: 1, y: 0 },
        transition: { delay: index * 0.04, duration: 0.2 },
        whileHover: { y: -2, boxShadow: "0 8px 24px rgba(0,0,0,0.35)", borderColor: "rgba(251,191,36,0.2)" }
      })}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-stone-100">{habit.title}</p>
          <p className="mt-1 text-xs text-stone-400">{habit.note}</p>
        </div>
        <span className="dashboard-card-status" data-tone={STATUS_TONES[status]}>
          {STATUS_LABELS[status]}
        </span>
      </div>

      <div className="mt-3 flex items-end justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs text-stone-300">
          <span className="rounded-full border border-amber-100/10 bg-black/20 px-2 py-1">{habit.category}</span>
          <span className={`dashboard-card-priority ${PRIORITY_STYLES[habit.priority]}`}>{habit.priority}</span>
          <span className="rounded-full border border-sky-300/25 bg-sky-500/10 px-2 py-1 text-sky-100">{timeSlotLabel[slot]}</span>
          <span className="rounded-full border border-amber-100/10 bg-black/20 px-2 py-1">{formatTime(habit.time)}</span>
        </div>
        {onUndo && (
          <button
            type="button"
            onClick={onUndo}
            className="dashboard-card-action"
            data-tone="warning"
          >
            ↶ Undo
          </button>
        )}
      </div>
    </Row>
  );
}

function PriorityFilter({ selected, onChange }) {
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
    <div className="mt-3 flex flex-wrap gap-1.5">
      {["All", "High", "Medium", "Low"].map((level) => (
        <button
          key={level}
          type="button"
          onClick={() => onChange(level)}
          className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold leading-5 transition ${colorMap(level, selected === level)}`}
        >
          {level}
        </button>
      ))}
    </div>
  );
}

function TimeSlotFilter({ selected, onChange }) {
  return (
    <div className="habit-time-slot-filter flex flex-wrap justify-end gap-1.5">
      {TIME_SLOT_OPTIONS.map((slot) => {
        const isActive = selected === slot.value;
        return (
          <button
            key={slot.value}
            type="button"
            onClick={() => onChange(slot.value)}
            className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition ${
              isActive
                ? "border-sky-300/50 bg-sky-500/20 text-sky-100"
                : "border-amber-100/10 bg-white/5 text-stone-400 hover:border-sky-300/30 hover:text-sky-100"
            }`}
          >
            {slot.label}
          </button>
        );
      })}
    </div>
  );
}

export default function TodaysHabit({ consistency = {} }) {
  const { isDemoMode } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const lowMotion = useMobileLowMotion();
  const Columns = lowMotion ? "div" : Motion.div;
  const Column = lowMotion ? "section" : Motion.section;
  const PendingRow = lowMotion ? "article" : Motion.article;
  const [habits, setHabits] = useState(isDemoMode ? INITIAL_HABITS : []);
  const [loading, setLoading] = useState(!isDemoMode);
  const [allFilter, setAllFilter] = useState("All");
  const [pendingFilter, setPendingFilter] = useState("All");
  const [completedFilter, setCompletedFilter] = useState("All");
  const [sidebarPriorityFilter, setSidebarPriorityFilter] = useState("All");
  const [timeSlotFilter, setTimeSlotFilter] = useState("All");
  const [todayISO, setTodayISO] = useState(() => toISODate(new Date()));
  const requestedMobileView = searchParams.get("habitToday");
  const mobileView = HABIT_TODAY_VIEWS.some((view) => view.id === requestedMobileView)
    ? requestedMobileView
    : "all";

  const selectMobileView = (view) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set("habitToday", view);
      return next;
    });
  };

  useEffect(() => {
    if (isDemoMode) return;
    let cancelled = false;

    const refreshHabits = async () => {
      try {
        const res = await api.get("/habits?view=active");
        if (cancelled) return;
        setHabits(res.data.map((h) => ({
          ...h,
          status: h.completedToday ? "completed" : "pending",
        })));
      } catch {
        // keep existing values on transient failure
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    refreshHabits();
    window.addEventListener("focus", refreshHabits);
    window.addEventListener("monkmode:habits-updated", refreshHabits);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", refreshHabits);
      window.removeEventListener("monkmode:habits-updated", refreshHabits);
    };
  }, [isDemoMode, todayISO]);

  const todayLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
  useEffect(() => {
    const refreshToday = () => setTodayISO(toISODate(new Date()));
    const interval = window.setInterval(refreshToday, 60 * 1000);
    window.addEventListener("focus", refreshToday);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshToday);
    };
  }, []);

  const visibleHabits = useMemo(
    () => habits
      .filter((h) => isHabitScheduledForDate(h, todayISO))
      .filter((h) => matchesTimeSlot(h, timeSlotFilter)),
    [habits, timeSlotFilter, todayISO]
  );

  const pendingHabits = useMemo(
    () => visibleHabits.filter((h) => getHabitStatus(h) === "pending"),
    [visibleHabits]
  );
  const completedHabits = useMemo(
    () => visibleHabits.filter((h) => getHabitStatus(h) === "completed"),
    [visibleHabits]
  );
  const sidebarHabits = useMemo(
    () => (sidebarPriorityFilter === "All" ? visibleHabits : visibleHabits.filter((h) => h.priority === sidebarPriorityFilter)),
    [visibleHabits, sidebarPriorityFilter]
  );

  const groupedByCategory = useMemo(
    () =>
      visibleHabits.reduce((acc, habit) => {
        if (!acc[habit.category]) acc[habit.category] = [];
        acc[habit.category].push(habit);
        return acc;
      }, {}),
    [visibleHabits]
  );

  const refreshStreaks = async () => {
    try {
      const res = await api.get("/habits?view=active");
      setHabits((prev) => {
        const serverMap = Object.fromEntries(
          res.data.map((h) => [(h._id ?? h.id)?.toString(), h])
        );
        return prev.map((h) => {
          const key = (h._id ?? h.id)?.toString();
          const s = serverMap[key];
          if (!s) return h;
          return { ...h, currentStreak: s.currentStreak, maxStreak: s.maxStreak, streakBreaks: s.streakBreaks };
        });
      });
    } catch { /* silently fail */ }
  };

  const markDone = async (id) => {
    setHabits((prev) => prev.map((h) => (h._id ?? h.id) === id ? { ...h, status: "completed" } : h));
    if (!isDemoMode) {
      try {
        await api.post(`/habits/${id}/complete`);
        await refreshStreaks();
        window.dispatchEvent(new Event("monkmode:habits-updated"));
      } catch { /* keep optimistic state */ }
    }
  };

  const markPending = async (id) => {
    setHabits((prev) => prev.map((h) => (h._id ?? h.id) === id ? { ...h, status: "pending" } : h));
    if (!isDemoMode) {
      try {
        await api.delete(`/habits/${id}/complete`);
        await refreshStreaks();
        window.dispatchEvent(new Event("monkmode:habits-updated"));
      } catch { /* keep optimistic state */ }
    }
  };

  if (loading) {
    return (
      <div className="flex h-60 items-center justify-center text-sm text-stone-400">
        Loading your habits...
      </div>
    );
  }

  return (
    <div className="habits-today-page space-y-5" data-mobile-view={mobileView}>
      <div className="habit-today-mobile-controls">
        <nav className="habit-today-mobile-nav" aria-label="Today's habit sections">
          <div className="habit-today-mobile-consistency">
            <span className="habit-today-mobile-consistency-icon" aria-hidden="true">📊</span>
            <div className="min-w-0">
              <p className="habit-today-mobile-consistency-title">
                Consistency {isDemoMode ? "--" : `${consistency.lifetimeConsistency ?? 0}%`}
              </p>
              <p className="habit-today-mobile-consistency-detail">
                {isDemoMode
                  ? "Demo mode"
                  : `Today ${consistency.completedToday ?? 0}/${consistency.expectedToday ?? 0}`}
              </p>
            </div>
          </div>

          {HABIT_TODAY_VIEWS.map((view) => {
            const count = view.id === "all"
              ? visibleHabits.length
              : view.id === "pending"
                ? pendingHabits.length
                : view.id === "completed"
                  ? completedHabits.length
                  : sidebarHabits.length;

            return (
              <button
                key={view.id}
                type="button"
                className="habit-today-mobile-nav-button"
                aria-pressed={mobileView === view.id}
                onClick={() => selectMobileView(view.id)}
              >
                <span className="habit-today-mobile-nav-icon" aria-hidden="true">{view.icon}</span>
                <span>{view.label}</span>
                <span className="habit-today-mobile-nav-count" aria-label={`${count} habits`}>{count}</span>
              </button>
            );
          })}
        </nav>

        <div className="habit-today-mobile-time-filter">
          <TimeSlotFilter selected={timeSlotFilter} onChange={setTimeSlotFilter} />
        </div>
      </div>

      <div className="today-layout">
        <section className="today-main rounded-[1.4rem] border border-amber-100/10 bg-gradient-to-b from-black/20 to-black/10 p-4 shadow-xl shadow-black/20 sm:rounded-2xl sm:p-6">
          <div className="habit-today-heading-row flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-200/70">{todayLabel}</p>
              <h3 className="mt-2 text-2xl font-bold text-amber-100">Today&apos;s Habits</h3>
            </div>
            <div className="habit-today-desktop-consistency flex min-w-[15rem] items-center gap-2 rounded-xl border border-amber-500/25 bg-amber-950/40 px-3 py-2">
              <span className="text-base leading-none" aria-hidden="true">📊</span>
              <div className="min-w-0">
                <p className="text-xs font-bold text-amber-300">
                  Consistency {isDemoMode ? "--" : `${consistency.lifetimeConsistency ?? 0}%`}
                </p>
                <p className="mt-0.5 text-[10px] text-amber-100/60">
                  {isDemoMode
                    ? "Demo mode"
                    : `Today ${consistency.completedToday ?? 0}/${consistency.expectedToday ?? 0} · Lifetime ${consistency.totalCompletedLifetime ?? 0}/${consistency.totalExpectedLifetime ?? 0}`}
                </p>
              </div>
            </div>
            <div className="habit-today-desktop-time-filter w-full sm:w-auto sm:shrink-0">
              <TimeSlotFilter selected={timeSlotFilter} onChange={setTimeSlotFilter} />
            </div>
          </div>

          <Columns
            className="habits-today-columns mt-5 grid grid-cols-1 gap-4 lg:gap-5"
            {...(lowMotion ? {} : {
              initial: "hidden",
              animate: "visible",
              variants: { hidden: {}, visible: { transition: { staggerChildren: 0.1 } } }
            })}
          >
            <Column
              data-habit-today-panel="all"
              className="today-scroll-card min-w-0 rounded-[1.25rem] border border-amber-100/10 bg-black/10 p-4 sm:rounded-2xl sm:p-5"
              {...(lowMotion ? {} : {
                variants: { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } },
                transition: { duration: 0.3 }
              })}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-amber-200">1. All Habits</p>
                  <p className="mt-1 text-xs text-stone-400">Grouped by category for your full daily habit view.</p>
                </div>
                <span className="whitespace-nowrap rounded-full border border-amber-100/10 bg-white/5 px-3 py-1 text-xs leading-none text-stone-300">
                  {Object.keys(groupedByCategory).length} categories
                </span>
              </div>
              <PriorityFilter selected={allFilter} onChange={setAllFilter} />

              <div className="journal-scroll today-scroll-body mt-3 space-y-4 pr-1">
                {Object.entries(groupedByCategory).map(([category, categoryHabits]) => {
                  const filtered = allFilter === "All" ? categoryHabits : categoryHabits.filter((h) => h.priority === allFilter);
                  if (filtered.length === 0) return null;
                  return (
                    <div key={category} className="habit-category-card rounded-[1.1rem] border border-amber-100/10 bg-white/[0.03] p-3 sm:rounded-2xl sm:p-4">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <h4 className="text-sm font-semibold text-stone-100">{category}</h4>
                        <span className="text-xs text-stone-400">{filtered.length} habits</span>
                      </div>
                      <div className="space-y-2">
                        {filtered.map((habit) => (
                          <HabitRow key={habit._id ?? habit.id} habit={habit} status={getHabitStatus(habit)} lowMotion={lowMotion} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Column>

            <Column
              data-habit-today-panel="pending"
              className="today-scroll-card min-w-0 rounded-[1.25rem] border border-amber-100/10 bg-black/10 p-4 sm:rounded-2xl sm:p-5"
              {...(lowMotion ? {} : {
                variants: { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } },
                transition: { duration: 0.3 }
              })}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-amber-200">2. Pending</p>
                  <p className="mt-1 text-xs text-stone-400">Habits still waiting to be completed today.</p>
                </div>
                <span className="whitespace-nowrap rounded-full border border-amber-300/25 bg-amber-500/10 px-3 py-1 text-xs font-semibold leading-none text-amber-100">
                  {pendingHabits.length} left
                </span>
              </div>
              <PriorityFilter selected={pendingFilter} onChange={setPendingFilter} />

              <div className="journal-scroll today-scroll-body mt-3 space-y-2 pr-1">
                {(() => {
                  const filtered = pendingFilter === "All" ? pendingHabits : pendingHabits.filter((h) => h.priority === pendingFilter);
                  return filtered.length === 0 ? (
                    <p className="mt-3 text-xs text-stone-500">
                      {pendingHabits.length === 0 ? "All habits completed for today!" : "No pending habits for this priority."}
                    </p>
                  ) : (
                    filtered.map((habit, i) => (
                      <PendingRow
                        key={habit._id ?? habit.id}
                        className="rounded-xl border border-amber-100/10 bg-white/5 p-3"
                        {...(lowMotion ? {} : {
                          initial: { opacity: 0, y: 8 },
                          animate: { opacity: 1, y: 0 },
                          transition: { delay: i * 0.04, duration: 0.2 },
                          whileHover: { y: -2, boxShadow: "0 8px 24px rgba(0,0,0,0.35)", borderColor: "rgba(251,191,36,0.2)" }
                        })}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-stone-100">{habit.title}</p>
                            <p className="mt-1 text-xs text-stone-400">{habit.note}</p>
                          </div>
                          <div className="flex shrink-0 items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => markDone(habit._id ?? habit.id)}
                              className="dashboard-card-action"
                              data-tone="success"
                            >
                              ✓ Done
                            </button>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-stone-300">
                          <span className="rounded-full border border-amber-100/10 bg-black/20 px-2 py-1">{habit.category}</span>
                          <span className={`dashboard-card-priority ${PRIORITY_STYLES[habit.priority]}`}>{habit.priority}</span>
                          <span className="rounded-full border border-amber-100/10 bg-black/20 px-2 py-1">{formatTime(habit.time)}</span>
                        </div>
                      </PendingRow>
                    ))
                  );
                })()}
              </div>
            </Column>

            <Column
              data-habit-today-panel="completed"
              className="today-scroll-card min-w-0 rounded-[1.25rem] border border-amber-100/10 bg-black/10 p-4 sm:rounded-2xl sm:p-5"
              {...(lowMotion ? {} : {
                variants: { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } },
                transition: { duration: 0.3 }
              })}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-amber-200">3. Completed</p>
                  <p className="mt-1 text-xs text-stone-400">Habits you have already finished today.</p>
                </div>
                <span className="whitespace-nowrap rounded-full border border-emerald-300/25 bg-emerald-500/10 px-3 py-1 text-xs font-semibold leading-none text-emerald-100">
                  {completedHabits.length} done
                </span>
              </div>
              <PriorityFilter selected={completedFilter} onChange={setCompletedFilter} />

              <div className="journal-scroll today-scroll-body mt-3 space-y-2 pr-1">
                {(() => {
                  const filtered = completedFilter === "All" ? completedHabits : completedHabits.filter((h) => h.priority === completedFilter);
                  return filtered.length === 0 ? (
                    <p className="mt-3 text-xs text-stone-500">No completed habits for this priority.</p>
                  ) : (
                    filtered.map((habit) => (
                      <HabitRow
                        key={habit._id ?? habit.id}
                        habit={habit}
                        status={getHabitStatus(habit)}
                        onUndo={() => markPending(habit._id ?? habit.id)}
                        lowMotion={lowMotion}
                      />
                    ))
                  );
                })()}
              </div>
            </Column>
          </Columns>
        </section>

        <aside className="today-sidebar" data-habit-today-panel="streak">
          <section className="today-scroll-card rounded-[1.4rem] border border-amber-100/10 bg-gradient-to-b from-black/20 to-black/10 p-4 shadow-xl shadow-black/20 sm:rounded-2xl sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-amber-200">Habit Streak Summary</p>
                <p className="mt-1 text-xs text-stone-400">All habits filtered by priority with streak details.</p>
              </div>
              <span className="whitespace-nowrap rounded-full border border-amber-100/10 bg-white/5 px-3 py-1 text-xs text-stone-300">
                {sidebarHabits.length} habits
              </span>
            </div>

            <PriorityFilter selected={sidebarPriorityFilter} onChange={setSidebarPriorityFilter} />

            <div className="journal-scroll today-scroll-body mt-4 space-y-2 pr-1">
              {sidebarHabits.length === 0 ? (
                <p className="text-xs text-stone-500">No habits for this priority filter.</p>
              ) : (
                sidebarHabits.map((habit) => {
                  const endDateStr = habit.endDate
                    ? (typeof habit.endDate === "string" ? habit.endDate.slice(0, 10) : habit.endDate.toISOString?.().slice(0, 10))
                    : null;
                  const daysLeft = endDateStr
                    ? Math.ceil((new Date(endDateStr) - new Date(todayISO)) / (1000 * 60 * 60 * 24))
                    : null;

                  return (
                    <article key={`summary-${habit._id ?? habit.id}`} className="habit-streak-row rounded-xl border border-amber-100/10 bg-white/5 p-3">
                      <p className="habit-streak-title text-sm font-semibold text-stone-100">{habit.title}</p>

                      <div className="habit-streak-stats">
                        <div className="habit-streak-stat">
                          <span>Current</span>
                          <strong className="text-emerald-200">{habit.currentStreak ?? 0}</strong>
                        </div>
                        <div className="habit-streak-stat">
                          <span>Target</span>
                          <strong className="text-amber-100">{habit.targetStreak ?? "--"}</strong>
                        </div>
                        <div className="habit-streak-stat">
                          <span>Best</span>
                          <strong className="text-amber-100">{habit.maxStreak ?? "--"}</strong>
                        </div>
                        <div className="habit-streak-stat">
                          <span>Breaks</span>
                          <strong className="text-rose-200">{habit.streakBreaks ?? 0}</strong>
                        </div>
                      </div>

                      <div className="habit-streak-dates">
                        <p><span>Ends</span><strong>{endDateStr ?? "Never"}</strong></p>
                        {endDateStr && (
                          <p>
                            <span>Remaining</span>
                            <strong className={daysLeft <= 7 ? "text-rose-300" : daysLeft <= 30 ? "text-yellow-200" : "text-sky-200"}>
                              {daysLeft > 0 ? `${daysLeft} days` : "Today"}
                            </strong>
                          </p>
                        )}
                      </div>
                    </article>
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
