import CalendarHeatmap from "react-calendar-heatmap";
import "react-calendar-heatmap/dist/styles.css";
import { motion as Motion } from "framer-motion";
import { cloneElement, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import useDashboardRead from "../useDashboardRead";
import { heatmapValidators, OVERVIEW_EVENTS, toCalendarHeatmapValues } from "./overviewResponse";
import useAuth from "../../hooks/useAuth";
import "./overview-heatmap.css";

const EMPTY_VALUES = [];

const demoSeries = (seed, year, density = 0.18) => {
  const values = [];
  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31);
  let random = seed + year;
  const next = () => {
    random = (random * 1664525 + 1013904223) >>> 0;
    return random / 0xffffffff;
  };

  for (const day = new Date(start); day <= end; day.setDate(day.getDate() + 1)) {
    const month = day.getMonth();
    const monthBoost = month >= 1 && month <= 3 ? 1.18 : month >= 8 && month <= 10 ? 0.9 : 1;
    if (next() < density * monthBoost) {
      values.push({
        date: `${year}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`,
        count: Math.min(4, 1 + Math.floor(next() * 4)),
      });
    }
  }
  return values;
};

const byYear = (values, year) => values.filter((value) => String(value.date).startsWith(`${year}-`));
const demoJournalSeries = (seed, year, density = 0.14) =>
  demoSeries(seed, year, density).map((value) => ({
    date: value.date,
    count: 1,
    entries: value.count,
  }));
const demoTodoSeries = (seed, year, density = 0.2) =>
  demoSeries(seed, year, density).map((value) => {
    const intensity = Math.min(4, Math.max(1, value.count || 1));

    if (intensity === 4) {
      return { date: value.date, count: 4, total: 4, completed: 4, missed: 0, pending: 0 };
    }
    if (intensity === 3) {
      return { date: value.date, count: 3, total: 4, completed: 3, missed: 0, pending: 1 };
    }
    if (intensity === 2) {
      return { date: value.date, count: 2, total: 4, completed: 2, missed: 1, pending: 1 };
    }
    return { date: value.date, count: 1, total: 3, completed: 1, missed: 1, pending: 1 };
  });
const demoHabitSeries = (seed, year, density = 0.24) =>
  demoSeries(seed, year, density).map((value) => {
    const intensity = Math.min(4, Math.max(1, value.count || 1));

    if (intensity === 4) {
      return { date: value.date, count: 4, total: 5, completed: 5, missed: 0, pending: 0 };
    }
    if (intensity === 3) {
      return { date: value.date, count: 3, total: 5, completed: 4, missed: 0, pending: 1 };
    }
    if (intensity === 2) {
      return { date: value.date, count: 2, total: 5, completed: 2, missed: 2, pending: 1 };
    }
    return { date: value.date, count: 1, total: 4, completed: 1, missed: 2, pending: 1 };
  });
const demoGoalSeries = (seed, year, density = 0.13) =>
  demoSeries(seed, year, density).map((value) => {
    const intensity = Math.min(4, Math.max(1, value.count || 1));

    if (intensity === 4) {
      return { date: value.date, count: 4, completedSubgoals: 4 };
    }
    if (intensity === 3) {
      return { date: value.date, count: 3, completedSubgoals: 3 };
    }
    if (intensity === 2) {
      return { date: value.date, count: 2, completedSubgoals: 2 };
    }
    return { date: value.date, count: 1, completedSubgoals: 1 };
  });
const demoGymSeries = (seed, year, density = 0.19) =>
  demoSeries(seed, year, density).map((value) => {
    const intensity = Math.min(4, Math.max(1, value.count || 1));
    if (intensity === 4) return { date: value.date, count: 4, updates: 6, exercises: 5, measurement: 1, gallery: 0, completedProgress: 6 };
    if (intensity === 3) return { date: value.date, count: 3, updates: 4, exercises: 3, measurement: 1, gallery: 0, completedProgress: 4 };
    if (intensity === 2) return { date: value.date, count: 2, updates: 2, exercises: 2, measurement: 0, gallery: 0, completedProgress: 2 };
    return { date: value.date, count: 1, updates: 1, exercises: 1, measurement: 0, gallery: 0, completedProgress: 1 };
  });

const HEATMAP_SECTIONS = [
  { id: "journal", label: "Journal", scale: "heatmap-violet", seed: 11, density: 0.14, binary: true },
  { id: "todo", label: "ToDo", scale: "heatmap-sky", seed: 37, density: 0.2 },
  { id: "habit", label: "Habit", scale: "heatmap-emerald", seed: 73, density: 0.24 },
  { id: "goal", label: "Goal", scale: "heatmap-rose", seed: 53, density: 0.13 },
  { id: "gym", label: "GYM", scale: "heatmap-amber", seed: 29, density: 0.19 },
];

function HeatmapCard({ sectionId, label, scale, values, year, resource, binary = false }) {
  const total = binary
    ? values.reduce((sum, value) => sum + (value.count > 0 ? 1 : 0), 0)
    : sectionId === "todo" || sectionId === "habit" || sectionId === "goal" || sectionId === "gym"
      ? values.reduce((sum, value) => {
        if (sectionId === "goal") {
          const completedSubgoals = Number(value.completedSubgoals);
          return sum + (Number.isFinite(completedSubgoals) ? completedSubgoals : (value.count || 0));
        }
          if (sectionId === "gym") {
            return sum + (value.count > 0 ? 1 : 0);
          }
          const completed = Number(value.completed);
          return sum + (Number.isFinite(completed) ? completed : (value.count || 0));
        }, 0)
      : values.reduce((sum, value) => sum + (value.count || 0), 0);
  const [selectedDay, setSelectedDay] = useState(null);
  const [tooltip, setTooltip] = useState(null);
  const tooltipId = useId();
  const tooltipVisible = Boolean(tooltip);

  useEffect(() => {
    if (!tooltipVisible) return undefined;

    const dismiss = () => setTooltip(null);
    const dismissOnEscape = (event) => {
      if (event.key === "Escape") dismiss();
    };
    window.addEventListener("scroll", dismiss, true);
    window.addEventListener("resize", dismiss);
    window.addEventListener("blur", dismiss);
    window.addEventListener("keydown", dismissOnEscape);
    return () => {
      window.removeEventListener("scroll", dismiss, true);
      window.removeEventListener("resize", dismiss);
      window.removeEventListener("blur", dismiss);
      window.removeEventListener("keydown", dismissOnEscape);
    };
  }, [tooltipVisible]);

  const describeValue = (value) => {
    if (!value) return "";
    const day = value.dayKey ?? value.date;
    if (binary) {
      if (!value.count) return "";
      const entryCount = value.entries || 1;
      return entryCount > 1
        ? `${day}: Journal submitted (${entryCount} entries)`
        : `${day}: Journal submitted`;
    }
    if (sectionId === "todo") {
      const completed = Number(value.completed) || 0;
      const totalTasks = Number(value.total) || 0;
      const missed = Number(value.missed) || 0;
      if (totalTasks > 0) {
        return missed > 0
          ? `${day}: ${completed}/${totalTasks} completed, ${missed} missed`
          : `${day}: ${completed}/${totalTasks} completed`;
      }
    }
    if (sectionId === "habit") {
      const completed = Number(value.completed) || 0;
      const totalHabits = Number(value.total) || 0;
      if (totalHabits > 0) {
        return `${day}: ${completed}/${totalHabits} habits completed`;
      }
    }
    if (sectionId === "goal") {
      const completedSubgoals = Number(value.completedSubgoals) || 0;
      return completedSubgoals === 1
        ? `${day}: 1 sub-goal done`
        : `${day}: ${completedSubgoals} sub-goals done`;
    }
    if (sectionId === "gym") {
      const parts = [];
      const ex   = Number(value.exercises)   || 0;
      const meas = Number(value.measurement) || 0;
      const gal  = Number(value.gallery)     || 0;
      if (ex   > 0) parts.push(`${ex} workout update${ex > 1 ? "s" : ""}`);
      if (meas > 0) parts.push(`${meas} measurement update${meas > 1 ? "s" : ""}`);
      if (gal  > 0) parts.push(`${gal} gallery update${gal > 1 ? "s" : ""}`);
      if (parts.length) return `${day}: ${parts.join(", ")}`;
      const updates = Number(value.updates) || 0;
      return updates > 0 ? `${day}: ${updates} gym activit${updates > 1 ? "ies" : "y"}` : day;
    }
    return `${day}: ${value.count}`;
  };
  const showTooltip = (event, value) => {
    const text = describeValue(value);
    if (!text || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      setTooltip(null);
      return;
    }
    const width = Math.min(280, window.innerWidth - 24);
    const below = event.clientY < 112;
    setTooltip({
      text,
      date: value.date,
      left: Math.max(12, Math.min(event.clientX + 12, window.innerWidth - width - 12)),
      top: event.clientY + (below ? 16 : -12),
      below,
    });
  };
  // This library excludes startDate and includes endDate.
  const startDate = new Date(year - 1, 11, 31);
  const endDate = new Date(year, 11, 31);
  const calendarValues = useMemo(() => toCalendarHeatmapValues(values), [values]);

  return (
    <Motion.div
      whileHover={{ boxShadow: "0 20px 40px rgba(0,0,0,0.4)" }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      className="overview-heatmap-card flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.1rem] border border-amber-100/10 bg-stone-950/45 px-1.5 py-1.5 sm:rounded-2xl"
    >
      <div className="overview-heatmap-card-header mb-1 flex shrink-0 flex-col gap-1 px-1.5 pt-1 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-400 sm:tracking-[0.16em]">{label}</p>
        <span className="text-[10px] text-stone-500">{resource && !resource.data ? "—" : total} contributions</span>
      </div>
      {resource?.loading && <p role="status" className="px-2 text-[10px] text-stone-400">Loading {label} heatmap…</p>}
      {resource?.error && <div className="px-2 text-[10px] text-rose-200">
        <p role="alert">{resource.error}{resource.data ? " Showing last loaded values." : ""}</p>
        <button type="button" onClick={resource.retry} className="text-amber-200">Retry {label} heatmap</button>
      </div>}
      <div className="overview-heatmap journal-scroll min-h-0 w-full flex-1 overflow-x-auto overflow-y-hidden" tabIndex={0} role="region" aria-label={`${label} activity for ${year}, scroll to see all months`}>
        <div className="overview-heatmap-canvas h-full min-w-[38rem] sm:min-w-[44rem] lg:min-w-0 lg:w-full">
          <CalendarHeatmap
            startDate={startDate}
            endDate={endDate}
            values={calendarValues}
            showMonthLabels
            showWeekdayLabels={false}
            gutterSize={1}
            classForValue={(value) => {
              if (!value || !value.count) return `${scale}-empty`;
              if (binary) return `${scale}-scale-4`;
              return `${scale}-scale-${Math.min(value.count, 4)}`;
            }}
            onMouseOver={showTooltip}
            onMouseLeave={() => setTooltip(null)}
            transformDayElement={(element, value) => cloneElement(element, {
              "aria-label": describeValue(value) || undefined,
              "aria-describedby": tooltip && tooltip.date === value?.date ? tooltipId : undefined,
              tabIndex: value?.count > 0 ? 0 : undefined,
              role: value?.count > 0 ? "button" : undefined,
              onFocus: event => {
                if (!value?.count) return;
                setSelectedDay(value);
                const bounds = event.currentTarget.getBoundingClientRect();
                showTooltip({ clientX: bounds.left, clientY: bounds.bottom }, value);
              },
              onKeyDown: event => {
                if (value?.count > 0 && ["Enter", " "].includes(event.key)) { event.preventDefault(); setSelectedDay(value); }
              },
            }, null)}
            onClick={setSelectedDay}
          />
        </div>
      </div>
      <div className="overview-heatmap-mobile-footer">
        <span>Swipe for more months →</span>
        <svg width={binary ? 28 : 70} height="12" role="img" aria-label={binary ? "Dim: no entry. Bright: journal submitted." : "Activity intensity from less to more."}>
          {(binary ? [0, 4] : [0, 1, 2, 3, 4]).map((level, index) => (
            <rect key={level} x={index * 14} width="10" height="10" rx="2" className={level ? `${scale}-scale-${level}` : `${scale}-empty`} />
          ))}
        </svg>
      </div>
      <p className="overview-heatmap-mobile-detail" aria-live="polite">
        {selectedDay ? describeValue(selectedDay) : "Tap a colored day for details"}
      </p>
      {tooltip && createPortal(
        <div
          id={tooltipId}
          role="tooltip"
          className="overview-heatmap-tooltip"
          style={{ left: tooltip.left, top: tooltip.top, transform: tooltip.below ? "none" : "translateY(-100%)" }}
        >
          {tooltip.text}
        </div>,
        document.body
      )}
    </Motion.div>
  );
}

function YearPicker({ selectedYear, yearOptions, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    const closeMenu = (event) => {
      if (event.type === "keydown" && event.key !== "Escape") return;
      if (event.type === "pointerdown" && menuRef.current?.contains(event.target)) return;
      setIsOpen(false);
    };

    document.addEventListener("pointerdown", closeMenu);
    document.addEventListener("keydown", closeMenu);
    return () => {
      document.removeEventListener("pointerdown", closeMenu);
      document.removeEventListener("keydown", closeMenu);
    };
  }, [isOpen]);

  return (
    <div ref={menuRef} className="relative w-full sm:w-24">
      <button
        type="button"
        aria-label="Select heatmap year"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        className="flex min-h-10 w-full items-center justify-between rounded-xl border border-amber-100/15 bg-stone-950/70 px-3 py-2 text-[11px] font-semibold text-stone-200 outline-none transition hover:border-amber-300/35 focus-visible:border-amber-300/45 sm:min-h-8 sm:py-1.5"
      >
        <span>{selectedYear}</span>
        <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className={`h-3.5 w-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`}>
          <path d="m5 7.5 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {isOpen && (
        <div
          role="listbox"
          aria-label="Heatmap year"
          className="absolute right-0 top-[calc(100%+0.4rem)] z-40 w-full overflow-hidden rounded-xl border border-amber-200/20 bg-[#17110f] p-1 shadow-2xl shadow-black/55"
        >
          {yearOptions.map((year) => (
            <button
              key={year}
              type="button"
              role="option"
              aria-selected={year === selectedYear}
              onClick={() => {
                onChange(year);
                setIsOpen(false);
              }}
              className={`flex min-h-9 w-full items-center rounded-lg px-2.5 text-left text-[11px] font-semibold transition ${
                year === selectedYear
                  ? "bg-amber-400/20 text-amber-200"
                  : "text-stone-300 hover:bg-white/7 hover:text-white"
              }`}
            >
              {year}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function OverviewHeatmap() {

  const { isDemoMode, user } = useAuth();
  const journalRead = useDashboardRead("/journal/heatmap", heatmapValidators.journal, OVERVIEW_EVENTS.journal, isDemoMode, user?.id);
  const todoRead = useDashboardRead("/todos/heatmap", heatmapValidators.todo, OVERVIEW_EVENTS.tasks, isDemoMode, user?.id);
  const habitRead = useDashboardRead("/habits/heatmap", heatmapValidators.habit, OVERVIEW_EVENTS.habits, isDemoMode, user?.id);
  const goalRead = useDashboardRead("/goals/heatmap", heatmapValidators.goal, OVERVIEW_EVENTS.goals, isDemoMode, user?.id);
  const gymRead = useDashboardRead("/gym/heatmap", heatmapValidators.gym, OVERVIEW_EVENTS.gym, isDemoMode, user?.id);
  const journalAllValues = journalRead.data?.values || EMPTY_VALUES, journalYears = journalRead.data?.years || EMPTY_VALUES;
  const todoAllValues = todoRead.data?.values || EMPTY_VALUES, todoYears = todoRead.data?.years || EMPTY_VALUES;
  const habitAllValues = habitRead.data?.values || EMPTY_VALUES, habitYears = habitRead.data?.years || EMPTY_VALUES;
  const goalAllValues = goalRead.data?.values || EMPTY_VALUES, goalYears = goalRead.data?.years || EMPTY_VALUES;
  const gymAllValues = gymRead.data?.values || EMPTY_VALUES, gymYears = gymRead.data?.years || EMPTY_VALUES;
  const currentYear = Number(journalRead.today.slice(0, 4));
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const resources = { journal: journalRead, todo: todoRead, habit: habitRead, goal: goalRead, gym: gymRead };

  const yearOptions = useMemo(() => {
    const years = new Set(isDemoMode ? [currentYear, currentYear - 1, currentYear - 2] : [currentYear]);
    journalYears.forEach((year) => years.add(year));
    todoYears.forEach((year) => years.add(year));
    habitYears.forEach((year) => years.add(year));
    goalYears.forEach((year) => years.add(year));
    gymYears.forEach((year) => years.add(year));
    journalAllValues.forEach((value) => {
      const year = Number.parseInt(String(value?.date || "").slice(0, 4), 10);
      if (Number.isFinite(year)) years.add(year);
    });
    todoAllValues.forEach((value) => {
      const year = Number.parseInt(String(value?.date || "").slice(0, 4), 10);
      if (Number.isFinite(year)) years.add(year);
    });
    habitAllValues.forEach((value) => {
      const year = Number.parseInt(String(value?.date || "").slice(0, 4), 10);
      if (Number.isFinite(year)) years.add(year);
    });
    goalAllValues.forEach((value) => {
      const year = Number.parseInt(String(value?.date || "").slice(0, 4), 10);
      if (Number.isFinite(year)) years.add(year);
    });
    gymAllValues.forEach((value) => {
      const year = Number.parseInt(String(value?.date || "").slice(0, 4), 10);
      if (Number.isFinite(year)) years.add(year);
    });
    const sorted = [...years].sort((a, b) => b - a);
    return sorted.length ? sorted : [currentYear];
  }, [currentYear, goalAllValues, goalYears, gymAllValues, gymYears, habitAllValues, habitYears, isDemoMode, journalAllValues, journalYears, todoAllValues, todoYears]);

  useEffect(() => {
    if (!yearOptions.includes(selectedYear)) {
      setSelectedYear(yearOptions[0]);
    }
  }, [selectedYear, yearOptions]);

  const sectionData = useMemo(
    () =>
      HEATMAP_SECTIONS.map((section) => {
        if (section.id === "journal") {
          const real = byYear(journalAllValues, selectedYear);
          return {
            ...section,
            values: isDemoMode ? demoJournalSeries(section.seed, selectedYear, section.density) : real,
          };
        }
        if (section.id === "todo") {
          const real = byYear(todoAllValues, selectedYear);
          return {
            ...section,
            values: isDemoMode ? demoTodoSeries(section.seed, selectedYear, section.density) : real,
          };
        }
        if (section.id === "habit") {
          const real = byYear(habitAllValues, selectedYear);
          return {
            ...section,
            values: isDemoMode ? demoHabitSeries(section.seed, selectedYear, section.density) : real,
          };
        }
        if (section.id === "goal") {
          const real = byYear(goalAllValues, selectedYear);
          return {
            ...section,
            values: isDemoMode ? demoGoalSeries(section.seed, selectedYear, section.density) : real,
          };
        }
        if (section.id === "gym") {
          const real = byYear(gymAllValues, selectedYear);
          return {
            ...section,
            values: isDemoMode ? demoGymSeries(section.seed, selectedYear, section.density) : real,
          };
        }
        return {
          ...section,
          values: isDemoMode ? demoSeries(section.seed, selectedYear, section.density) : [],
        };
      }),
    [goalAllValues, gymAllValues, habitAllValues, isDemoMode, journalAllValues, selectedYear, todoAllValues]
  );

  return (
    <div className="overview-heatmap-stack flex h-full flex-col gap-2.5">
      <div className="overview-heatmap-toolbar relative z-20 shrink-0">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-500 sm:tracking-[0.18em]">Activity Heatmaps</p>
          <YearPicker
            selectedYear={selectedYear}
            yearOptions={yearOptions}
            onChange={setSelectedYear}
          />
        </div>
      </div>

      <div className="overview-heatmap-cards flex min-h-0 flex-1 flex-col justify-between gap-2">
        {sectionData.map((section) => (
          <HeatmapCard
            key={`${user?.id}-${section.id}-${selectedYear}`}
            resource={isDemoMode ? null : resources[section.id]}
            sectionId={section.id}
            label={section.label}
            scale={section.scale}
            values={section.values}
            year={selectedYear}
            binary={section.binary}
          />
        ))}
      </div>
    </div>
  );
}
