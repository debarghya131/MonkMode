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

export const INITIAL_HABITS = [
  { id: "habit-meditation", title: "Morning Meditation", category: "Mindfulness", priority: "High", status: "completed", scheduledDate: shiftISODate(0), time: "06:30", note: "10 minutes breath focus before starting work.", targetStreak: 30, currentStreak: 11, maxStreak: 22, streakBreaks: 2, endDate: shiftISODate(40) },
  { id: "habit-workout", title: "Workout (30 min)", category: "Fitness", priority: "High", status: "pending", scheduledDate: shiftISODate(0), time: "07:00", note: "Bodyweight circuit: pushups, squats, planks.", targetStreak: 21, currentStreak: 3, maxStreak: 14, streakBreaks: 1, endDate: null },
  { id: "habit-reading", title: "Read 20 pages", category: "Learning", priority: "Medium", status: "pending", scheduledDate: shiftISODate(0), time: "21:00", note: "Read before sleep and write one takeaway.", targetStreak: 45, currentStreak: 7, maxStreak: 19, streakBreaks: 4, endDate: shiftISODate(60) },
  { id: "habit-water", title: "Drink 3L Water", category: "Health", priority: "Low", status: "completed", scheduledDate: shiftISODate(0), time: "20:00", note: "Track hydration across the day.", targetStreak: 60, currentStreak: 18, maxStreak: 31, streakBreaks: 0, endDate: null },
  { id: "habit-journal", title: "Night Journal", category: "Personal", priority: "Low", status: "pending", scheduledDate: shiftISODate(-1), time: "22:15", note: "Missed reflection entry before bedtime.", targetStreak: 30, currentStreak: 2, maxStreak: 12, streakBreaks: 3, endDate: shiftISODate(15) },
  { id: "habit-focus", title: "Deep Work Sprint", category: "Productivity", priority: "High", status: "pending", scheduledDate: shiftISODate(-1), time: "10:00", note: "Interrupted focus block and skipped recovery session.", targetStreak: 14, currentStreak: 1, maxStreak: 9, streakBreaks: 5, endDate: null },
];
