export const TODO_TABS = [
  { id: "today", icon: "📋", label: "Today" },
  { id: "upcoming", icon: "📅", label: "Upcoming" },
  { id: "schedule", icon: "🗓", label: "Schedule" },
  { id: "important", icon: "⭐", label: "Important" },
];

export const todoViewPath = (id) => `/dashboard/todo?view=${id}`;
