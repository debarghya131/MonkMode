import { HABIT_TABS } from "./habitTabs";

export default function HabitsNav({ activeTab, onTabChange }) {
  return (
    <nav data-demo-allow="true" className="hidden sm:flex items-center gap-1 w-full overflow-x-auto rounded-2xl border border-amber-100/10 bg-white/6 p-1.5 shadow-xl shadow-black/25 backdrop-blur scrollbar-none">
        {HABIT_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              aria-pressed={activeTab === tab.id}
              className="dashboard-section-tab flex min-w-[7rem] flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-semibold"
            >
              <span className="text-base leading-none">{tab.icon}</span>
              {tab.label}
            </button>
        ))}
    </nav>
  );
}
