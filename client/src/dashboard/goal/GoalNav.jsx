import { motion as Motion } from "framer-motion";
import { useState } from "react";

const TABS = [
  { id: "my-goals",      icon: "🎯", label: "My Goals"      },
  { id: "create-goals",  icon: "🛠",  label: "Create Goals"  },
  { id: "progress",      icon: "📈", label: "Progress"      },
];

export default function GoalNav({ activeTab, onTabChange }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const currentTab = TABS.find((t) => t.id === activeTab) ?? TABS[0];

  return (
    <>
      {/* Mobile: hamburger dropdown */}
      <div className="relative sm:hidden">
        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex w-full items-center justify-between gap-2 rounded-2xl border border-amber-100/10 bg-white/6 px-4 py-2.5 text-sm font-semibold text-amber-300 shadow-xl shadow-black/25 backdrop-blur"
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
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                    activeTab === tab.id
                      ? "bg-gradient-to-r from-amber-400/20 to-orange-400/15 text-amber-300"
                      : "text-stone-400 hover:bg-white/5 hover:text-stone-200"
                  }`}
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
      <nav className="hidden sm:flex items-center gap-1 w-full overflow-x-auto rounded-2xl border border-amber-100/10 bg-white/6 p-1.5 shadow-xl shadow-black/25 backdrop-blur scrollbar-none">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <Motion.button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              whileHover={!isActive ? { scale: 1.03, backgroundColor: "rgba(255,255,255,0.06)" } : {}}
              whileTap={{ scale: 0.97 }}
              animate={
                isActive
                  ? { boxShadow: "0 0 18px rgba(251,191,36,0.22)" }
                  : { boxShadow: "0 0 0px rgba(251,191,36,0)" }
              }
              transition={{ duration: 0.2 }}
              className={`flex min-w-[6rem] flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors duration-200 ${
                isActive
                  ? "bg-gradient-to-r from-amber-400/20 to-orange-400/15 border border-amber-400/30 text-amber-300"
                  : "border border-transparent text-stone-400 hover:text-amber-200"
              }`}
            >
              <span className="text-base leading-none">{tab.icon}</span>
              {tab.label}
            </Motion.button>
          );
        })}
      </nav>
    </>
  );
}
