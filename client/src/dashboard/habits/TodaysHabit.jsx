import { useMemo, useState } from "react";

const toISODate = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const shiftISODate = (offsetDays) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return toISODate(d);
};

const INITIAL_HABITS = [
  { id: "habit-meditation", title: "Morning Meditation", category: "Mindfulness", priority: "High", status: "completed", scheduledDate: shiftISODate(0), time: "06:30", note: "10 minutes breath focus before starting work.", targetStreak: 30, currentStreak: 11, maxStreak: 22, streakBreaks: 2, endDate: shiftISODate(40) },
  { id: "habit-workout", title: "Workout (30 min)", category: "Fitness", priority: "High", status: "pending", scheduledDate: shiftISODate(0), time: "07:00", note: "Bodyweight circuit: pushups, squats, planks.", targetStreak: 21, currentStreak: 3, maxStreak: 14, streakBreaks: 1, endDate: null },
  { id: "habit-reading", title: "Read 20 pages", category: "Learning", priority: "Medium", status: "pending", scheduledDate: shiftISODate(0), time: "21:00", note: "Read before sleep and write one takeaway.", targetStreak: 45, currentStreak: 7, maxStreak: 19, streakBreaks: 4, endDate: shiftISODate(60) },
  { id: "habit-water", title: "Drink 3L Water", category: "Health", priority: "Low", status: "completed", scheduledDate: shiftISODate(0), time: "20:00", note: "Track hydration across the day.", targetStreak: 60, currentStreak: 18, maxStreak: 31, streakBreaks: 0, endDate: null },
  { id: "habit-journal", title: "Night Journal", category: "Personal", priority: "Low", status: "pending", scheduledDate: shiftISODate(-1), time: "22:15", note: "Missed reflection entry before bedtime.", targetStreak: 30, currentStreak: 2, maxStreak: 12, streakBreaks: 3, endDate: shiftISODate(15) },
  { id: "habit-focus", title: "Deep Work Sprint", category: "Productivity", priority: "High", status: "pending", scheduledDate: shiftISODate(-1), time: "10:00", note: "Interrupted focus block and skipped recovery session.", targetStreak: 14, currentStreak: 1, maxStreak: 9, streakBreaks: 5, endDate: null },
];

const PRIORITY_STYLES = {
  High: "border-red-400/30 bg-red-500/10 text-red-200",
  Medium: "border-yellow-400/30 bg-yellow-500/10 text-yellow-200",
  Low: "border-green-400/30 bg-green-500/10 text-green-200",
};

const STATUS_STYLES = {
  pending: "border-amber-300/25 bg-amber-500/10 text-amber-100",
  completed: "border-emerald-300/25 bg-emerald-500/10 text-emerald-100",
  broken: "border-rose-300/25 bg-rose-500/10 text-rose-100",
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

const getHabitStatus = (habit, todayISO) => {
  if (habit.status === "completed") return "completed";
  if (habit.status === "broken") return "broken";
  if (habit.scheduledDate && habit.scheduledDate < todayISO) return "broken";
  return "pending";
};

function HabitRow({ habit, status, onUndo }) {
  const slot = getTimeSlot(habit.time);

  return (
    <article className="rounded-xl border border-amber-100/10 bg-white/5 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-stone-100">{habit.title}</p>
          <p className="mt-1 text-xs text-stone-400">{habit.note}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {onUndo && (
            <button
              type="button"
              onClick={onUndo}
              className="rounded-full border border-amber-300/25 bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-200 transition hover:border-amber-300/50 hover:bg-amber-500/20"
            >
              Undo
            </button>
          )}
          <span className={`rounded-full border px-2 py-1 text-[11px] font-semibold ${STATUS_STYLES[status]}`}>
            {STATUS_LABELS[status]}
          </span>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-stone-300">
        <span className="rounded-full border border-amber-100/10 bg-black/20 px-2 py-1">{habit.category}</span>
        <span className={`rounded-full border px-2 py-1 ${PRIORITY_STYLES[habit.priority]}`}>{habit.priority}</span>
        <span className="rounded-full border border-sky-300/25 bg-sky-500/10 px-2 py-1 text-sky-100">{timeSlotLabel[slot]}</span>
        <span className="rounded-full border border-amber-100/10 bg-black/20 px-2 py-1">{formatTime(habit.time)}</span>
      </div>
    </article>
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
    <div className="mt-3 flex gap-1.5">
      {["All", "High", "Medium", "Low"].map((level) => (
        <button
          key={level}
          type="button"
          onClick={() => onChange(level)}
          className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition ${colorMap(level, selected === level)}`}
        >
          {level}
        </button>
      ))}
    </div>
  );
}

function TimeSlotFilter({ selected, onChange }) {
  return (
    <div className="flex flex-wrap justify-end gap-1.5">
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

export default function TodaysHabit() {
  const [habits, setHabits] = useState(INITIAL_HABITS);
  const [allFilter, setAllFilter] = useState("All");
  const [pendingFilter, setPendingFilter] = useState("All");
  const [completedFilter, setCompletedFilter] = useState("All");
  const [sidebarPriorityFilter, setSidebarPriorityFilter] = useState("All");
  const [timeSlotFilter, setTimeSlotFilter] = useState("All");

  const todayLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
  const todayISO = useMemo(() => toISODate(new Date()), []);

  const visibleHabits = useMemo(
    () => habits.filter((h) => matchesTimeSlot(h, timeSlotFilter)),
    [habits, timeSlotFilter]
  );

  const pendingHabits = useMemo(
    () => visibleHabits.filter((h) => getHabitStatus(h, todayISO) === "pending"),
    [visibleHabits, todayISO]
  );
  const completedHabits = useMemo(
    () => visibleHabits.filter((h) => getHabitStatus(h, todayISO) === "completed"),
    [visibleHabits, todayISO]
  );
  const brokenHabits = useMemo(
    () => visibleHabits.filter((h) => getHabitStatus(h, todayISO) === "broken"),
    [visibleHabits, todayISO]
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

  const markDone = (id) => {
    setHabits((prev) => prev.map((h) => (h.id === id ? { ...h, status: "completed" } : h)));
  };

  const markPending = (id) => {
    setHabits((prev) =>
      prev.map((h) => (h.id === id ? { ...h, status: "pending", scheduledDate: todayISO } : h))
    );
  };

  return (
    <div className="habits-today-page space-y-5">
      <div className="today-layout">
        <section className="today-main rounded-2xl border border-amber-100/10 bg-gradient-to-b from-black/20 to-black/10 p-6 shadow-xl shadow-black/20">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-200/70">{todayLabel}</p>
              <h3 className="mt-2 text-2xl font-bold text-amber-100">Today&apos;s Habits</h3>
            </div>
            <div className="shrink-0">
              <TimeSlotFilter selected={timeSlotFilter} onChange={setTimeSlotFilter} />
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-3">
            <section className="today-scroll-card rounded-2xl border border-amber-100/10 bg-black/10 p-5">
              <div className="flex items-center justify-between">
                <div>
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
                    <div key={category} className="rounded-2xl border border-amber-100/10 bg-white/[0.03] p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-stone-100">{category}</h4>
                        <span className="text-xs text-stone-400">{filtered.length} habits</span>
                      </div>
                      <div className="space-y-2">
                        {filtered.map((habit) => (
                          <HabitRow key={habit.id} habit={habit} status={getHabitStatus(habit, todayISO)} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="today-scroll-card rounded-2xl border border-amber-100/10 bg-black/10 p-5">
              <div className="flex items-center justify-between">
                <div>
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
                    filtered.map((habit) => (
                      <article key={habit.id} className="rounded-xl border border-amber-100/10 bg-white/5 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-stone-100">{habit.title}</p>
                            <p className="mt-1 text-xs text-stone-400">{habit.note}</p>
                          </div>
                          <div className="flex shrink-0 items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => markDone(habit.id)}
                              className="rounded-full border border-emerald-300/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-200 transition hover:border-emerald-300/50 hover:bg-emerald-500/20"
                            >
                              ✓ Done
                            </button>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-stone-300">
                          <span className="rounded-full border border-amber-100/10 bg-black/20 px-2 py-1">{habit.category}</span>
                          <span className={`rounded-full border px-2 py-1 ${PRIORITY_STYLES[habit.priority]}`}>{habit.priority}</span>
                          <span className="rounded-full border border-amber-100/10 bg-black/20 px-2 py-1">{formatTime(habit.time)}</span>
                        </div>
                      </article>
                    ))
                  );
                })()}
              </div>
            </section>

            <section className="today-scroll-card rounded-2xl border border-amber-100/10 bg-black/10 p-5">
              <div className="flex items-center justify-between">
                <div>
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
                        key={habit.id}
                        habit={habit}
                        status={getHabitStatus(habit, todayISO)}
                        onUndo={() => markPending(habit.id)}
                      />
                    ))
                  );
                })()}
              </div>
            </section>
          </div>
        </section>

        <aside className="today-sidebar">
          <section className="today-scroll-card rounded-2xl border border-amber-100/10 bg-gradient-to-b from-black/20 to-black/10 p-5 shadow-xl shadow-black/20">
            <div className="flex items-center justify-between">
              <div>
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
                sidebarHabits.map((habit) => (
                  <article key={`summary-${habit.id}`} className="rounded-xl border border-amber-100/10 bg-white/5 p-3">
                    <p className="text-sm font-semibold text-stone-100">{habit.title}</p>
                    <div className="mt-2 flex gap-4 text-[11px] text-stone-300">
                      <div className="flex-1 space-y-1">
                        <p>No. of Streak Break: <span className="font-semibold text-rose-200">{habit.streakBreaks ?? 0}</span></p>
                        <p>End Date: <span className="font-semibold text-amber-100">{habit.endDate ?? "Never Ends"}</span></p>
                        {habit.endDate && (() => {
                          const msLeft = new Date(habit.endDate) - new Date(todayISO);
                          const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
                          return (
                            <p>Days Left: <span className={`font-semibold ${daysLeft <= 7 ? "text-rose-300" : daysLeft <= 30 ? "text-yellow-200" : "text-sky-200"}`}>{daysLeft > 0 ? `${daysLeft} days` : "Ended"}</span></p>
                          );
                        })()}
                      </div>
                      <div className="space-y-1 text-right">
                        <p>Target Streak: <span className="font-semibold text-amber-100">{habit.targetStreak ?? "--"}</span></p>
                        <p>Current Streak: <span className="font-semibold text-emerald-200">{habit.currentStreak ?? 0}</span></p>
                        <p>Max Streak: <span className="font-semibold text-amber-100">{habit.maxStreak ?? "--"}</span></p>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
