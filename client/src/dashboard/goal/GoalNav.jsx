const TABS = [
  { id: "my-goals", icon: "🎯", label: "My Goals" },
  { id: "create-goals", icon: "🛠", label: "Create Goals" },
  { id: "progress", icon: "📈", label: "Progress" },
];

export default function GoalNav({ activeTab, onTabChange }) {
  return (
    <nav className="flex items-center gap-1 w-full rounded-2xl border border-amber-100/10 bg-white/6 p-1.5 shadow-xl shadow-black/25 backdrop-blur">
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={`flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 ${
              isActive
                ? "bg-gradient-to-r from-amber-400/20 to-orange-400/15 border border-amber-400/30 text-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.15)]"
                : "border border-transparent text-stone-400 hover:text-amber-200 hover:bg-white/5"
            }`}
          >
            <span className="text-base leading-none">{tab.icon}</span>
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
