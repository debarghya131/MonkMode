import { useMemo, useState } from "react";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);
const CURRENT_YEAR = new Date().getFullYear();
const CURRENT_MONTH = new Date().getMonth();
const YEAR_OPTIONS = Array.from({ length: 7 }, (_, i) => CURRENT_YEAR - 6 + i);

const INITIAL_HABITS = [
  { id: "h1", title: "Morning Meditation", isImportant: true, completedDays: [2, 6, 11, 16, 27, 28, 29, 30] },
  { id: "h2", title: "Workout", isImportant: false, completedDays: [3, 7, 12, 18, 24, 30] },
  { id: "h3", title: "Read 20 Pages", isImportant: false, completedDays: [1, 3, 4, 6, 9, 11, 15] },
  { id: "h4", title: "Deep Work Sprint", isImportant: true, completedDays: [3, 8, 12, 25, 26, 27, 28, 29, 30] },
  { id: "h5", title: "Drink 3L Water", isImportant: false, completedDays: [1, 2, 3, 4, 5, 6, 7, 8] },
  { id: "h6", title: "Night Journal", isImportant: false, completedDays: [3, 7, 11, 18, 23, 29] },
  { id: "h7", title: "Sleep by 11 PM", isImportant: false, completedDays: [1, 2, 4, 5, 8, 13, 20, 27] },
  { id: "h8", title: "No Sugar", isImportant: false, completedDays: [2, 3, 4, 5, 9, 14, 19] },
  { id: "h9", title: "Stretching", isImportant: false, completedDays: [1, 6, 11, 16, 21, 26, 31] },
  { id: "h10", title: "Code Practice", isImportant: true, completedDays: [2, 5, 9, 23, 24, 25, 26, 27, 28, 29, 30] },
  { id: "h11", title: "Walk 8k Steps", isImportant: false, completedDays: [1, 2, 4, 6, 7, 9, 12, 16, 20] },
  { id: "h12", title: "Protein Intake", isImportant: false, completedDays: [2, 3, 5, 8, 10, 11, 14, 18, 24] },
  { id: "h13", title: "Language Practice", isImportant: false, completedDays: [1, 5, 6, 9, 13, 15, 19, 22, 28] },
  { id: "h14", title: "Digital Detox", isImportant: false, completedDays: [3, 4, 7, 11, 12, 16, 20, 23, 27] },
  { id: "h15", title: "Gratitude Note", isImportant: false, completedDays: [1, 2, 3, 10, 11, 12, 18, 25, 30] },
  { id: "h16", title: "Breathing Exercise", isImportant: false, completedDays: [2, 6, 8, 10, 13, 17, 19, 21, 26] },
  { id: "h17", title: "No Social Media", isImportant: false, completedDays: [1, 4, 5, 8, 9, 14, 17, 20, 29] },
  { id: "h18", title: "Plan Tomorrow", isImportant: false, completedDays: [2, 3, 6, 7, 10, 13, 16, 22, 27] },
  { id: "h19", title: "Vitamin Routine", isImportant: false, completedDays: [1, 2, 3, 4, 5, 8, 12, 16, 20] },
  { id: "h20", title: "Posture Check", isImportant: false, completedDays: [3, 7, 9, 11, 15, 18, 22, 24, 30] },
  { id: "h21", title: "Evening Reflection", isImportant: false, completedDays: [1, 4, 6, 10, 12, 14, 17, 25, 28] },
  { id: "h22", title: "No Junk Food", isImportant: true, completedDays: [2, 5, 7, 8, 11, 13, 19, 23, 29] },
];

export default function HabitTracking() {
  const [habits, setHabits] = useState(INITIAL_HABITS);
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);
  const [selectedMonth, setSelectedMonth] = useState(CURRENT_MONTH);

  const sortedHabits = useMemo(
    () => [...habits].sort((a, b) => Number(Boolean(b.isImportant)) - Number(Boolean(a.isImportant))),
    [habits]
  );
  const yearAdjustedHabits = useMemo(() => {
    const shift = ((selectedYear - CURRENT_YEAR) % 31 + 31) % 31;
    return sortedHabits.map((habit) => ({
      ...habit,
      completedDays: habit.completedDays.map((day) => ((day + shift - 1) % 31) + 1),
    }));
  }, [selectedYear, sortedHabits]);
  const visibleDays = useMemo(() => {
    const maxDay = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    return DAYS.slice(0, maxDay);
  }, [selectedMonth, selectedYear]);

  const toggleImportant = (id) => {
    setHabits((prev) => prev.map((habit) => (habit.id === id ? { ...habit, isImportant: !habit.isImportant } : habit)));
  };
  const getCurrentStreak = (completedDays, maxDay) => {
    const filtered = [...new Set(completedDays)].filter((day) => day >= 1 && day <= maxDay).sort((a, b) => a - b);
    if (!filtered.length) return 0;

    let streak = 1;
    for (let i = filtered.length - 1; i > 0; i -= 1) {
      if (filtered[i] - filtered[i - 1] === 1) streak += 1;
      else break;
    }
    return streak;
  };
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <p className="text-label-lg">Track Your Habit</p>
      </div>

      <section className="rounded-2xl border border-amber-100/10 bg-gradient-to-b from-black/20 to-black/10 p-4 shadow-xl shadow-black/20">
        <div className="mb-2 overflow-x-auto">
          <div className="min-w-[1120px] rounded-lg border border-amber-100/10 bg-black/30 px-3 py-2">
            <div className="flex items-center gap-3">
              <label className="flex shrink-0 items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-400">
                Year
                <select
                  value={selectedYear}
                  onChange={(event) => setSelectedYear(Number(event.target.value))}
                  className="rounded-md border border-amber-200/20 bg-black/40 px-2 py-1 text-[11px] font-semibold text-stone-100 outline-none transition focus:border-amber-300/50"
                >
                  {YEAR_OPTIONS.map((year) => (
                    <option key={year} value={year} className="bg-stone-900 text-stone-100">
                      {year}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid flex-1 grid-cols-12 gap-1 text-center text-[11px] font-semibold uppercase tracking-wide text-stone-300">
                {MONTHS.map((month, index) => (
                  <button
                    key={month}
                    type="button"
                    onClick={() => setSelectedMonth(index)}
                    className={`rounded px-1 py-0.5 transition ${
                      selectedMonth === index
                        ? "bg-amber-500/20 text-amber-200"
                        : "text-stone-300 hover:bg-white/5 hover:text-stone-100"
                    }`}
                  >
                    {month}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="journal-scroll h-[calc(100vh-390px)] min-h-[22rem] overflow-auto rounded-xl border border-amber-100/10 bg-black/10 p-3">
          <div className="min-w-[1120px]">
            <table className="w-full border-separate border-spacing-x-1 border-spacing-y-1.5">
              <thead>
                <tr>
                  <th className="sticky left-0 z-20 rounded-lg border border-amber-100/10 bg-black/40 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-stone-400">
                    Day
                  </th>
                  {visibleDays.map((day) => (
                    <th
                      key={`day-${day}`}
                      className="h-7 w-7 rounded border border-amber-100/10 bg-black/25 text-center text-[10px] font-semibold text-stone-400"
                    >
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {yearAdjustedHabits.map((habit) => (
                  <tr key={habit.id}>
                    <td className="sticky left-0 z-10 min-w-[220px] rounded-lg border border-amber-100/10 bg-black/45 px-3 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <p className="truncate text-sm font-semibold text-stone-100">{habit.title}</p>
                          <span className="shrink-0 rounded-full border border-orange-300/40 bg-orange-500/15 px-2 py-0.5 text-[10px] font-semibold text-orange-200">
                            🔥 {getCurrentStreak(habit.completedDays, visibleDays.length)}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleImportant(habit.id)}
                          className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold transition ${
                            habit.isImportant
                              ? "border-amber-300/45 bg-amber-500/15 text-amber-200"
                              : "border-amber-100/15 bg-white/5 text-stone-300 hover:border-amber-300/35 hover:text-amber-200"
                          }`}
                        >
                          {habit.isImportant ? "Important" : "Mark Important"}
                        </button>
                      </div>
                    </td>
                    {visibleDays.map((day) => {
                      const checked = habit.completedDays.includes(day);
                      return (
                        <td key={`${habit.id}-${day}`} className="text-center">
                          <div
                            className={`mx-auto h-5 w-5 rounded border ${
                              checked
                                ? "border-amber-300/60 bg-gradient-to-br from-amber-400/40 to-orange-400/30"
                                : "border-amber-100/25 bg-black/20"
                            }`}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
