export const GYM_TABS = [
  { id: "todays-workout", icon: "🏋️", label: "Today" },
  { id: "add-workout", icon: "➕", label: "Add Workout" },
  { id: "diet-chart", icon: "🥗", label: "Diet Chart" },
  { id: "measurements", icon: "📏", label: "Measurements" },
  { id: "progress", icon: "📈", label: "Progress" },
  { id: "library", icon: "📚", label: "Workout Library" },
  { id: "gallery", icon: "🖼️", label: "Gallery" },
];

export const gymTabPath = (id) => `/dashboard/gym?tab=${id}`;
