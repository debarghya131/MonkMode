export const HABIT_TABS = [
  { id: "today", icon: "📋", label: "Today" },
  { id: "create", icon: "🛠", label: "Create Habit" },
  { id: "track", icon: "📈", label: "Track Your Habit" },
];

export const habitViewPath = (id) => `/dashboard/habit?view=${id}`;
