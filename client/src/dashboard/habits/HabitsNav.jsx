import { useState } from "react";

const TABS = [
  { id: "today",  icon: "📋", label: "Today"            },
  { id: "create", icon: "🛠",  label: "Create Habit"    },
  { id: "track",  icon: "📈", label: "Track Your Habit" },
];

export default function HabitsNav({ activeTab, onTabChange }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const currentTab = TABS.find((t) => t.id === activeTab) ?? TABS[0];

  return (
    <>
      {/* Mobile: hamburger dropdown */}
      <div className="relative sm:hidden" data-demo-allow="true">
        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          className="dashboard-section-trigger flex w-full items-center justify-between gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold shadow-xl shadow-black/25"
        >
          <span className="flex items-center gap-2">
            <span className="text-base leading-none">{currentTab.icon}</span>
            <span>{currentTab.label}</span>
          </span>
          <svg className="h-4 w-4 shrink-0 text-stone-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {menuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
            <div className="absolute left-0 right-0 top-full z-50 mt-1.5 rounded-2xl border border-amber-100/10 bg-stone-950/95 p-1.5 shadow-2xl shadow-black/50 backdrop-blur">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => { onTabChange(tab.id); setMenuOpen(false); }}
                  aria-pressed={activeTab === tab.id}
                  className="dashboard-section-tab flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold"
                >
                  <span className="text-base leading-none">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Desktop: horizontal scrollable nav */}
      <nav data-demo-allow="true" className="hidden sm:flex items-center gap-1 w-full overflow-x-auto rounded-2xl border border-amber-100/10 bg-white/6 p-1.5 shadow-xl shadow-black/25 backdrop-blur scrollbar-none">
        {TABS.map((tab) => (
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
    </>
  );
}
