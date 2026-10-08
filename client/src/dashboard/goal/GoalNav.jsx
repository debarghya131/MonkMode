import { GOAL_TABS } from "./goalTabs";

export default function GoalNav({ activeTab, onTabChange }) {
  return (
      <nav data-demo-allow="true" className="hidden w-full grid-cols-3 gap-1 rounded-2xl border border-amber-100/10 bg-white/6 p-1.5 shadow-xl shadow-black/25 backdrop-blur sm:grid">
        {GOAL_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              aria-pressed={activeTab === tab.id}
              className="dashboard-section-tab flex min-w-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-semibold"
            >
              <span className="text-base leading-none">{tab.icon}</span>
              {tab.label}
            </button>
        ))}
      </nav>
  );
}
