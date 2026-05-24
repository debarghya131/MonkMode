import { motion as Motion } from "framer-motion";
import { useState } from "react";

const TABS = [
  { id: "todays-workout", icon: "🏋️", label: "Today"           },
  { id: "add-workout",    icon: "➕", label: "Add Workout"      },
  { id: "diet-chart",     icon: "🥗", label: "Diet Chart"       },
  { id: "measurements",   icon: "📏", label: "Measurements"     },
  { id: "progress",       icon: "📈", label: "Progress"         },
  { id: "library",        icon: "📚", label: "Workout Library"  },
  { id: "gallery",        icon: "🖼️", label: "Gallery"          },
];

export { TABS };

export default function GymNav({ active, onChange }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const activeTab = TABS.find((t) => t.id === active) ?? TABS[0];

  return (
    <>
      {/* Mobile: hamburger dropdown */}
      <div className="relative sm:hidden" data-demo-allow="true">
        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex w-full items-center justify-between gap-2 rounded-2xl border border-amber-100/10 bg-white/6 px-4 py-2.5 text-sm font-semibold text-amber-300 shadow-xl shadow-black/25 backdrop-blur"
        >
          <span className="flex items-center gap-2">
            <span className="text-base leading-none">{activeTab.icon}</span>
            <span>{activeTab.label}</span>
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
                  onClick={() => { onChange(tab.id); setMenuOpen(false); }}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                    active === tab.id
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
      <nav data-demo-allow="true" className="hidden w-full overflow-x-auto rounded-2xl border border-amber-100/10 bg-white/6 p-1.5 shadow-xl shadow-black/25 backdrop-blur scrollbar-none sm:flex sm:items-center sm:gap-1">
        {TABS.map((tab) => {
          const isActive = active === tab.id;
          return (
            <Motion.button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
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
              <span>{tab.label}</span>
            </Motion.button>
          );
        })}
      </nav>
    </>
  );
}
