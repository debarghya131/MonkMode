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
      name: "AI Coach",
      icon: "✨",
      path: "/dashboard/ai_coach",
    },
  ],
};

function SidebarSection({ title, items, activePath }) {
  const isActive = (path) => activePath === path;

  return (
    <div className="mb-8">
      <h3 className="px-3 py-2 text-label-md mb-3">{title}</h3>
      <nav className="space-y-2">
        {items.map((item) => {
          const active = isActive(item.path);
          return (
            <Link
              key={item.name}
              to={item.path}
              className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-accent-sm transition-all duration-200 ${
                active
                  ? "bg-amber-500/20 text-amber-100 shadow-[0_0_12px_rgba(251,146,60,0.2)]"
                  : "text-amber-50/70 hover:bg-amber-500/10 hover:text-amber-100"
              }`}
            >
              <span className="h-5 w-5 flex items-center justify-center text-lg">
                {item.icon}
              </span>
              <span>{item.name}</span>
              {active && <div className="ml-auto h-2 w-2 rounded-full bg-amber-400" />}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export default function Sidebar({ onLogout }) {
  const location = useLocation();

  return (
    <nav className="flex h-full w-full flex-col bg-gradient-to-b from-transparent to-transparent p-6">
      <div className="flex h-full w-full flex-col">
        <div className="flex-1 overflow-y-auto space-y-8">
          <SidebarSection title="Main" items={menuItems.main} activePath={location.pathname} />
          <div className="border-t border-amber-100/10" />
          <SidebarSection title="Insights" items={menuItems.insights} activePath={location.pathname} />
        </div>

        {/* Logout Button at Bottom */}
        <div className="border-t border-amber-100/10 pt-6 mt-6">
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
