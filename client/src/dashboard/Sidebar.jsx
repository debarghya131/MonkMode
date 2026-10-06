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
    <section className="dashboard-sidebar-section min-w-0">
      <h3 className="mb-2 px-3 py-1 text-label-md 2xl:mb-3 2xl:py-2">{title}</h3>
      <nav aria-label={title} className="dashboard-sidebar-items space-y-1 2xl:space-y-2">
        {items.map((item) => {
          const active = isActive(item.path);
          return (
            <Motion.div
              key={item.name}
              className="w-full"
              whileHover={active ? undefined : { x: 0 }}
              whileTap={{ scale: 0.985 }}
            >
              <Link
                to={item.path}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={`dashboard-sidebar-link group relative flex min-h-11 w-full min-w-0 items-center gap-3 overflow-hidden rounded-xl px-3 py-2 text-accent-sm transition-all duration-200 2xl:py-2.5 ${
                  active
                    ? "dashboard-section-selected"
                    : "border border-transparent text-amber-50/70 hover:border-amber-200/12 hover:bg-amber-500/10 hover:text-amber-100"
                }`}
              >
                {active && <span className="pointer-events-none absolute inset-y-1 left-0 w-1 rounded-full bg-gradient-to-b from-amber-200 via-amber-400 to-orange-400 shadow-[0_0_14px_rgba(251,191,36,0.65)]" />}
                <span className="sidebar-item-icon flex h-5 w-5 shrink-0 items-center justify-center text-lg">
                  {item.icon}
                </span>
                <span className="min-w-0 flex-1 truncate">{item.name}</span>
                {active && <div className="ml-2 h-2 w-2 shrink-0 rounded-full bg-amber-300 shadow-[0_0_14px_rgba(251,191,36,0.75)]" />}
              </Link>
            </Motion.div>
          );
        })}
      </nav>
    </section>
  );
}

export default function Sidebar({ onLogout, onNavigate }) {
  const location = useLocation();

  return (
    <div className="dashboard-sidebar flex h-full min-h-0 w-full flex-col bg-gradient-to-b from-transparent to-transparent p-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))] xl:p-4 2xl:p-5">
      <div className="flex h-full min-h-0 w-full flex-col">
        <div className="dashboard-sidebar-scroll journal-scroll min-h-0 flex-1 overflow-y-auto pr-1">
          <div className="dashboard-sidebar-sections flex flex-col gap-3 2xl:gap-5">
            <SidebarSection title="Main" items={menuItems.main} activePath={location.pathname} onNavigate={onNavigate} />
            <div className="dashboard-sidebar-divider border-t border-amber-100/10" />
            <SidebarSection title="AI Insights" items={menuItems.insights} activePath={location.pathname} onNavigate={onNavigate} />
          </div>
        </div>

        {/* Logout Button at Bottom */}
        <div
          className="sidebar-credit group relative mb-3 mt-3 shrink-0 overflow-hidden rounded-lg border border-amber-200/15 bg-[linear-gradient(135deg,rgba(251,191,36,0.12),rgba(255,255,255,0.03),rgba(251,113,133,0.08))] px-4 py-2.5 text-center shadow-[0_0_20px_rgba(251,191,36,0.08)] transition duration-300 hover:-translate-y-0.5 hover:border-amber-200/35 hover:shadow-[0_0_28px_rgba(251,191,36,0.18)] 2xl:mb-5 2xl:py-3"
        >
          <p className="relative text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-200/55">Made By</p>
          <p className="relative mt-1 text-sm font-bold text-amber-100 drop-shadow-[0_0_10px_rgba(251,191,36,0.25)]">
             Debarghya 💛
          </p>
        </div>
        <div className="shrink-0 border-t border-amber-100/10 pt-3 2xl:pt-5">
          <button
            type="button"
            onClick={onLogout}
            className="group inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-rose-200/25 bg-[linear-gradient(140deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] px-3 py-2 text-amber-50 transition duration-300 hover:-translate-y-0.5 hover:border-rose-200/55 hover:bg-[linear-gradient(140deg,rgba(255,228,230,0.24),rgba(254,205,211,0.12))] hover:text-rose-100 hover:shadow-[0_0_24px_rgba(251,113,133,0.28)] 2xl:px-4 2xl:py-2.5"
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
    </div>
  );
}
