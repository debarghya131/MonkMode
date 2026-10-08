export const GOAL_TABS = [
  { id: "my-goals", icon: "🎯", label: "My Goals" },
  { id: "create-goals", icon: "🛠", label: "Create Goals" },
  { id: "progress", icon: "📈", label: "Progress" },
];

export const goalTabPath = (id) => `/dashboard/goal?tab=${id}`;
