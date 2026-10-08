export const ANALYTICS_TABS = [
  { id: "journal", icon: "📝", label: "Journal Analysis" },
  { id: "todo", icon: "✓", label: "To-Do Analysis" },
  { id: "habit", icon: "⚡", label: "Habit Analysis" },
  { id: "goal", icon: "🎯", label: "Goal Analysis" },
  { id: "gym", icon: "💪", label: "GYM Analysis" },
];

export const analysisTabPath = (id) => `/dashboard/analytics?tab=${id}`;
