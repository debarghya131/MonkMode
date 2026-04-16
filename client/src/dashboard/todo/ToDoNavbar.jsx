const TABS = [
  { id: "today",     icon: "📋", label: "Today"           },
  { id: "upcoming",  icon: "📅", label: "Upcoming"        },
  { id: "schedule",  icon: "🗓",  label: "Schedule"        },
  { id: "important", icon: "⭐", label: "Important"       },
];

export { TABS };

export default function ToDoNavbar({ active, onChange }) {
  return (
    <nav className="flex items-center gap-1 w-full rounded-2xl border border-amber-100/10 bg-white/6 p-1.5 shadow-xl shadow-black/25 backdrop-blur">
      {TABS.map((tab) => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 ${
              isActive
                ? "bg-gradient-to-r from-amber-400/20 to-orange-400/15 border border-amber-400/30 text-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.15)]"
                : "border border-transparent text-stone-400 hover:text-amber-200 hover:bg-white/5"
            }`}
          >
            <span className="text-base leading-none">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
