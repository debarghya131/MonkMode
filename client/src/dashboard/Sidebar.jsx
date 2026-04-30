import { motion as Motion } from "framer-motion";
import { Link, useLocation } from "react-router-dom";

const menuItems = {
  main: [
    {
      name: "Overview",
      icon: "📊",
      path: "/dashboard",
    },
    {
      name: "Journal",
      icon: "📝",
      path: "/dashboard/journal",
    },
    {
      name: "To-Do List",
      icon: "✓",
      path: "/dashboard/todo",
    },
    {
      name: "Habits",
      icon: "⚡",
      path: "/dashboard/habit",
    },
    {
      name: "Goals",
      icon: "🎯",
      path: "/dashboard/goal",
    },
    {
      name: "Gym",
      icon: "💪",
      path: "/dashboard/gym",
    },
  ],
  insights: [
     {
      name: "Weekly Report",
      icon: "📅",
      path: "/dashboard/weeklyreport",
    },
    {
      name: "Analysis",
      icon: "📈",
      path: "/dashboard/analytics",
    },
   
    {
      name: "AI GURU",
      icon: "✨",
      path: "/dashboard/ai_guru",
    },
  ],
};

function SidebarSection({ title, items, activePath, onNavigate }) {
  const isActive = (path) => activePath === path;

  return (
    <div className="mb-8">
      <h3 className="px-3 py-2 text-label-md mb-3">{title}</h3>
      <nav className="space-y-2">
        {items.map((item) => {
          const active = isActive(item.path);
          return (
            <Motion.div
              key={item.name}
              className="w-full"
              whileHover={active ? undefined : { x: 3 }}
              whileTap={{ scale: 0.985 }}
            >
              <Link
                to={item.path}
                onClick={onNavigate}
                className={`group relative flex w-full min-w-0 items-center gap-3 overflow-hidden rounded-xl px-3 py-2.5 text-accent-sm transition-all duration-200 ${
                  active
                    ? "dashboard-active-glow border border-amber-300/25 bg-[linear-gradient(90deg,rgba(251,191,36,0.18),rgba(251,146,60,0.12),rgba(255,255,255,0.03))] text-amber-50"
                    : "border border-transparent text-amber-50/70 hover:border-amber-200/12 hover:bg-amber-500/10 hover:text-amber-100"
                }`}
              >
                {active && <span className="pointer-events-none absolute inset-y-1 left-0 w-1 rounded-full bg-gradient-to-b from-amber-200 via-amber-400 to-orange-400 shadow-[0_0_14px_rgba(251,191,36,0.65)]" />}
                <span className="flex h-5 w-5 shrink-0 items-center justify-center text-lg">
                  {item.icon}
                </span>
                <span className="min-w-0 flex-1 truncate">{item.name}</span>
                {active && <div className="ml-2 h-2 w-2 shrink-0 rounded-full bg-amber-300 shadow-[0_0_14px_rgba(251,191,36,0.75)]" />}
              </Link>
            </Motion.div>
          );
        })}
      </nav>
    </div>
  );
}

export default function Sidebar({ onLogout, onNavigate }) {
  const location = useLocation();

  return (
    <nav className="flex h-full w-full flex-col bg-gradient-to-b from-transparent to-transparent p-6">
      <div className="flex h-full w-full flex-col">
        <div className="flex-1 overflow-y-auto space-y-8">
          <SidebarSection title="Main" items={menuItems.main} activePath={location.pathname} onNavigate={onNavigate} />
          <div className="border-t border-amber-100/10" />
          <SidebarSection title="AI Insights" items={menuItems.insights} activePath={location.pathname} onNavigate={onNavigate} />
        </div>

        {/* Logout Button at Bottom */}
        <Motion.div
          className="group relative mb-5 overflow-hidden rounded-lg border border-amber-200/15 bg-[linear-gradient(135deg,rgba(251,191,36,0.12),rgba(255,255,255,0.03),rgba(251,113,133,0.08))] px-4 py-3 text-center shadow-[0_0_20px_rgba(251,191,36,0.08)] transition duration-300 hover:-translate-y-0.5 hover:border-amber-200/35 hover:shadow-[0_0_28px_rgba(251,191,36,0.18)]"
          animate={{
            boxShadow: [
              "0 0 20px rgba(251,191,36,0.08)",
              "0 0 28px rgba(251,191,36,0.22)",
              "0 0 20px rgba(251,191,36,0.08)",
            ],
          }}
          transition={{
            boxShadow: { duration: 2.4, repeat: Infinity, ease: "easeInOut" },
          }}
        >
          <Motion.span
            className="pointer-events-none absolute inset-y-0 left-[-40%] w-[30%] -skew-x-12 bg-white/20 blur-sm"
            animate={{ left: ["-40%", "130%"] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 1.6, ease: "easeInOut" }}
          />
          <p className="relative text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-200/55">Made By</p>
          <p className="relative mt-1 animate-pulse text-sm font-bold text-amber-100 drop-shadow-[0_0_10px_rgba(251,191,36,0.25)]">
             Debarghya 💛
          </p>
        </Motion.div>
        <div className="border-t border-amber-100/10 pt-6">
          <button
            type="button"
            onClick={onLogout}
            className="w-full group inline-flex items-center justify-center gap-2 rounded-lg border border-rose-200/25 bg-[linear-gradient(140deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] px-4 py-2.5 text-amber-50 transition duration-300 hover:-translate-y-0.5 hover:border-rose-200/55 hover:bg-[linear-gradient(140deg,rgba(255,228,230,0.24),rgba(254,205,211,0.12))] hover:text-rose-100 hover:shadow-[0_0_24px_rgba(251,113,133,0.28)]"
          >
            <span className="relative flex h-8 w-8 items-center justify-center rounded-full border border-rose-100/45 bg-black/20 transition group-hover:border-rose-100/70 group-hover:bg-rose-950/30">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 2v10" />
                <path d="M18.36 6.64a9 9 0 1 1-12.72 0" />
              </svg>
            </span>
            <span className="text-sm font-semibold">Turn Off MonkMode</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
