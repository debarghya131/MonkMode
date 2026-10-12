import { AnimatePresence, MotionConfig, motion as Motion } from "framer-motion";
import { useEffect, useId, useRef, useState } from "react";
import useMobileLowMotion from "../../hooks/useMobileLowMotion";
import useAuth from "../../hooks/useAuth";
import GYMWeeklyReport from "./GYMWeeklyReport";
import GoalWeeklyReport from "./GoalWeeklyReport";
import HabitWeeklyReport from "./HabitWeeklyReport";
import JournalWeeklyReport from "./JournalWeeklyReport";
import ToDoWeeklyReport from "./ToDoWeeklyReport";
import "./weeklyReport.css";

const REPORT_TABS = [
  { id: "journal", icon: "📝", label: "Journal", Component: JournalWeeklyReport },
  { id: "todo", icon: "✓", label: "ToDo", Component: ToDoWeeklyReport },
  { id: "habits", icon: "⚡", label: "Habits", Component: HabitWeeklyReport },
  { id: "goals", icon: "🎯", label: "Goals", Component: GoalWeeklyReport },
  { id: "gym", icon: "💪", label: "GYM", Component: GYMWeeklyReport },
];

export default function WeeklyReport() {
  const { isDemoMode, user } = useAuth();
  return <WeeklyReportContent key={isDemoMode ? "demo" : user?.id || "guest"} />;
}

function WeeklyReportContent() {
  const lowMotion = useMobileLowMotion();
  const [activeTab, setActiveTab] = useState("journal");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();
  const menuTriggerRef = useRef(null);
  const contentRef = useRef(null);
  const activeReport = REPORT_TABS.find((tab) => tab.id === activeTab) ?? REPORT_TABS[0];
  const ActiveReport = activeReport.Component;

  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
      contentRef.current.scrollLeft = 0;
    }
  }, [activeTab]);

  useEffect(() => {
    const desktopNav = window.matchMedia("(min-width: 640px)");
    const closeMenu = () => setMenuOpen(false);
    desktopNav.addEventListener("change", closeMenu);
    return () => desktopNav.removeEventListener("change", closeMenu);
  }, []);

  return (
    <MotionConfig reducedMotion={lowMotion ? "always" : "user"}>
    <div
      className="weekly-report-page w-full space-y-4 lg:-mt-6 xl:-mt-8"
      data-active={activeTab}
      data-low-motion={lowMotion ? "true" : "false"}
    >
      {/* Mobile: hamburger dropdown */}
      <div
        className="weekly-report-mobile-nav relative sm:hidden"
        data-demo-allow="true"
        onKeyDown={(event) => {
          if (event.key === "Escape" && menuOpen) {
            event.stopPropagation();
            setMenuOpen(false);
            menuTriggerRef.current?.focus();
          }
        }}
      >
        <button
          ref={menuTriggerRef}
          type="button"
          aria-expanded={menuOpen}
          aria-controls={menuOpen ? menuId : undefined}
          aria-label={`Weekly report section: ${activeReport.label}`}
          onClick={() => setMenuOpen(!menuOpen)}
          className="dashboard-section-trigger flex w-full items-center justify-between gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold shadow-xl shadow-black/25"
        >
          <span className="flex items-center gap-2">
            <span className="text-base leading-none">{activeReport.icon}</span>
            <span>{activeReport.label}</span>
          </span>
          <svg className="h-4 w-4 shrink-0 text-stone-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
            <nav id={menuId} aria-label="Weekly report sections" className="weekly-report-menu absolute left-0 right-0 top-full z-50 mt-1.5 rounded-2xl border border-amber-100/10 bg-stone-950/95 p-1.5 shadow-2xl shadow-black/50 backdrop-blur">
              {REPORT_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => { setActiveTab(tab.id); setMenuOpen(false); menuTriggerRef.current?.focus(); }}
                  aria-pressed={activeTab === tab.id}
                  className="dashboard-section-tab flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold"
                >
                  <span className="text-base leading-none">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </>
        )}
      </div>

      {/* Desktop: horizontal scrollable nav */}
      <nav aria-label="Weekly report sections" data-demo-allow="true" className="weekly-report-nav hidden sm:flex items-center gap-1 w-full overflow-x-auto rounded-2xl border border-amber-100/10 bg-white/6 p-1.5 shadow-xl shadow-black/25 backdrop-blur scrollbar-none">
        {REPORT_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              aria-pressed={activeTab === tab.id}
              className="dashboard-section-tab flex min-w-[6rem] flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-semibold"
            >
              <span className="text-base leading-none">{tab.icon}</span>
              {tab.label}
            </button>
        ))}
      </nav>

      <div ref={contentRef} className="weekly-report-content mt-6">
        {lowMotion ? (
          <div key={activeReport.id} className="weekly-report-active-panel">
            <ActiveReport lowMotion={lowMotion} />
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <Motion.div
              key={activeReport.id}
              className="weekly-report-active-panel"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: "easeInOut" }}
            >
              <ActiveReport lowMotion={lowMotion} />
            </Motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
    </MotionConfig>
  );
}
