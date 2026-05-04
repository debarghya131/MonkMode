import CalendarHeatmap from "react-calendar-heatmap";
import "react-calendar-heatmap/dist/styles.css";
import { motion as Motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import api from "../../api/axios";
import useAuth from "../../hooks/useAuth";

const TODAY = new Date();
const CURRENT_YEAR = TODAY.getFullYear();
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

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
        date: day.toISOString().slice(0, 10),
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
      return { date: value.date, count: 4, updates: 3, completedGoals: 1 };
    }
    if (intensity === 3) {
      return { date: value.date, count: 3, updates: 4, completedGoals: 0 };
    }
    if (intensity === 2) {
      return { date: value.date, count: 2, updates: 2, completedGoals: 0 };
    }
    return { date: value.date, count: 1, updates: 1, completedGoals: 0 };
  });
const demoGymSeries = (seed, year, density = 0.19) =>
  demoSeries(seed, year, density).map((value) => {
    const intensity = Math.min(4, Math.max(1, value.count || 1));

    if (intensity === 4) {
      return { date: value.date, count: 4, updates: 6, completedProgress: 6 };
    }
    if (intensity === 3) {
      return { date: value.date, count: 3, updates: 4, completedProgress: 4 };
    }
    if (intensity === 2) {
      return { date: value.date, count: 2, updates: 2, completedProgress: 2 };
    }
    return { date: value.date, count: 1, updates: 1, completedProgress: 1 };
  });

const HEATMAP_SECTIONS = [
  { id: "journal", label: "Journal", scale: "heatmap-violet", seed: 11, density: 0.14, binary: true },
  { id: "todo", label: "ToDo", scale: "heatmap-sky", seed: 37, density: 0.2 },
  { id: "habit", label: "Habit", scale: "heatmap-emerald", seed: 73, density: 0.24 },
  { id: "goal", label: "Goal", scale: "heatmap-rose", seed: 53, density: 0.13 },
  { id: "gym", label: "GYM", scale: "heatmap-amber", seed: 29, density: 0.19 },
];

function HeatmapCard({ sectionId, label, scale, values, year, binary = false }) {
  const total = binary
    ? values.reduce((sum, value) => sum + (value.count > 0 ? 1 : 0), 0)
    : sectionId === "todo" || sectionId === "habit" || sectionId === "goal" || sectionId === "gym"
      ? values.reduce((sum, value) => {
          if (sectionId === "goal") {
            const updates = Number(value.updates);
            return sum + (Number.isFinite(updates) ? updates : (value.count || 0));
          }
          if (sectionId === "gym") {
            const updates = Number(value.updates);
            return sum + (Number.isFinite(updates) ? updates : (value.count || 0));
          }
          const completed = Number(value.completed);
          return sum + (Number.isFinite(completed) ? completed : (value.count || 0));
        }, 0)
      : values.reduce((sum, value) => sum + (value.count || 0), 0);
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31);

  return (
    <Motion.div
      whileHover={{ y: -5, boxShadow: "0 20px 40px rgba(0,0,0,0.4)" }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-amber-100/10 bg-stone-950/45 px-1.5 py-1.5"
    >
      <div className="mb-1 flex shrink-0 items-center justify-between">
        <p className="ml-1.5 mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-400">{label}</p>
        <span className="text-[10px] text-stone-500">{total} contributions</span>
      </div>
      <div className="overview-heatmap min-h-0 flex-1 w-full overflow-hidden">
        <div className="w-full h-full">
          <CalendarHeatmap
            startDate={startDate}
            endDate={endDate}
            values={values}
            showMonthLabels
            showWeekdayLabels={false}
            gutterSize={1}
            classForValue={(value) => {
              if (!value || !value.count) return `${scale}-empty`;
              if (binary) return `${scale}-scale-4`;
              return `${scale}-scale-${Math.min(value.count, 4)}`;
            }}
            titleForValue={(value) => {
              if (!value || !value.count) return "";
              if (binary) {
                const entryCount = value.entries || 1;
                return entryCount > 1
                  ? `${value.date}: Journal submitted (${entryCount} entries)`
                  : `${value.date}: Journal submitted`;
              }
              if (sectionId === "todo") {
                const completed = Number(value.completed) || 0;
                const totalTasks = Number(value.total) || 0;
                const missed = Number(value.missed) || 0;
                if (totalTasks > 0) {
                  return missed > 0
                    ? `${value.date}: ${completed}/${totalTasks} completed, ${missed} missed`
                    : `${value.date}: ${completed}/${totalTasks} completed`;
                }
              }
              if (sectionId === "habit") {
                const completed = Number(value.completed) || 0;
                const totalHabits = Number(value.total) || 0;
                if (totalHabits > 0) {
                  return `${value.date}: ${completed}/${totalHabits} habits completed`;
                }
              }
              if (sectionId === "goal") {
                const updates = Number(value.updates) || 0;
                const completedGoals = Number(value.completedGoals) || 0;
                return completedGoals > 0
                  ? `${value.date}: ${updates} progress updates, ${completedGoals} goal completed`
                  : `${value.date}: ${updates} progress updates`;
              }
              if (sectionId === "gym") {
                const updates = Number(value.updates) || 0;
                return `${value.date}: ${updates} progress updates`;
              }
              return `${value.date}: ${value.count}`;
            }}
          />
        </div>
      </div>
    </Motion.div>
  );
}

export default function OverviewHeatmap() {
  const { isDemoMode } = useAuth();
  const [gymAllValues, setGymAllValues] = useState([]);
  const [gymYears, setGymYears] = useState([]);
  const [journalAllValues, setJournalAllValues] = useState([]);
  const [journalYears, setJournalYears] = useState([]);
  const [todoAllValues, setTodoAllValues] = useState([]);
  const [todoYears, setTodoYears] = useState([]);
  const [habitAllValues, setHabitAllValues] = useState([]);
  const [habitYears, setHabitYears] = useState([]);
  const [goalAllValues, setGoalAllValues] = useState([]);
  const [goalYears, setGoalYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);

  useEffect(() => {
    let isMounted = true;

    const fetchJournalHeatmap = async () => {
      try {
        const { data } = await api.get("/journal/heatmap");
        if (!isMounted) return;

        const values = Array.isArray(data?.values)
          ? data.values
              .filter((item) => ISO_DATE_REGEX.test(String(item?.date || "")))
              .map((item) => ({
                date: String(item.date),
                count: Number(item.count) > 0 ? Number(item.count) : 0,
                entries: Number(item.entries) > 0 ? Number(item.entries) : 0,
              }))
          : [];

        const years = Array.isArray(data?.years)
          ? data.years
              .map((year) => Number.parseInt(String(year), 10))
              .filter((year) => Number.isFinite(year))
          : [];

        setJournalAllValues(values);
        setJournalYears(years);
      } catch {
        if (!isMounted) return;
        setJournalAllValues([]);
        setJournalYears([]);
      }
    };

    fetchJournalHeatmap();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchHabitHeatmap = async () => {
      try {
        const { data } = await api.get("/habits/heatmap");
        if (!isMounted) return;

        const values = Array.isArray(data?.values)
          ? data.values
              .filter((item) => ISO_DATE_REGEX.test(String(item?.date || "")))
              .map((item) => ({
                date: String(item.date),
                count: Math.min(4, Math.max(1, Number(item.count) || 1)),
                total: Math.max(0, Number(item.total) || 0),
                completed: Math.max(0, Number(item.completed) || 0),
                missed: Math.max(0, Number(item.missed) || 0),
                pending: Math.max(0, Number(item.pending) || 0),
              }))
          : [];

        const years = Array.isArray(data?.years)
          ? data.years
              .map((year) => Number.parseInt(String(year), 10))
              .filter((year) => Number.isFinite(year))
          : [];

        setHabitAllValues(values);
        setHabitYears(years);
      } catch {
        if (!isMounted) return;
        setHabitAllValues([]);
        setHabitYears([]);
      }
    };

    fetchHabitHeatmap();
    window.addEventListener("focus", fetchHabitHeatmap);
    window.addEventListener("monkmode:habits-updated", fetchHabitHeatmap);

    return () => {
      isMounted = false;
      window.removeEventListener("focus", fetchHabitHeatmap);
      window.removeEventListener("monkmode:habits-updated", fetchHabitHeatmap);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchGymHeatmap = async () => {
      try {
        const { data } = await api.get("/gym/heatmap");
        if (!isMounted) return;

        const values = Array.isArray(data?.values)
          ? data.values
              .filter((item) => ISO_DATE_REGEX.test(String(item?.date || "")))
              .map((item) => ({
                date: String(item.date),
                count: Math.min(4, Math.max(1, Number(item.count) || 1)),
                updates: Math.max(0, Number(item.updates) || 0),
                completedProgress: Math.max(0, Number(item.completedProgress) || 0),
              }))
          : [];

        const years = Array.isArray(data?.years)
          ? data.years
              .map((year) => Number.parseInt(String(year), 10))
              .filter((year) => Number.isFinite(year))
          : [];

        setGymAllValues(values);
        setGymYears(years);
      } catch {
        if (!isMounted) return;
        setGymAllValues([]);
        setGymYears([]);
      }
    };

    fetchGymHeatmap();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchGoalHeatmap = async () => {
      try {
        const { data } = await api.get("/goals/heatmap");
        if (!isMounted) return;

        const values = Array.isArray(data?.values)
          ? data.values
              .filter((item) => ISO_DATE_REGEX.test(String(item?.date || "")))
              .map((item) => ({
                date: String(item.date),
                count: Math.min(4, Math.max(1, Number(item.count) || 1)),
                updates: Math.max(0, Number(item.updates) || 0),
                completedGoals: Math.max(0, Number(item.completedGoals) || 0),
              }))
          : [];

        const years = Array.isArray(data?.years)
          ? data.years
              .map((year) => Number.parseInt(String(year), 10))
              .filter((year) => Number.isFinite(year))
          : [];

        setGoalAllValues(values);
        setGoalYears(years);
      } catch {
        if (!isMounted) return;
        setGoalAllValues([]);
        setGoalYears([]);
      }
    };

    fetchGoalHeatmap();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchTodoHeatmap = async () => {
      try {
        const { data } = await api.get("/todos/heatmap");
        if (!isMounted) return;

        const values = Array.isArray(data?.values)
          ? data.values
              .filter((item) => ISO_DATE_REGEX.test(String(item?.date || "")))
              .map((item) => ({
                date: String(item.date),
                count: Math.min(4, Math.max(1, Number(item.count) || 1)),
                total: Math.max(0, Number(item.total) || 0),
                completed: Math.max(0, Number(item.completed) || 0),
                missed: Math.max(0, Number(item.missed) || 0),
                pending: Math.max(0, Number(item.pending) || 0),
              }))
          : [];

        const years = Array.isArray(data?.years)
          ? data.years
              .map((year) => Number.parseInt(String(year), 10))
              .filter((year) => Number.isFinite(year))
          : [];

        setTodoAllValues(values);
        setTodoYears(years);
      } catch {
        if (!isMounted) return;
        setTodoAllValues([]);
        setTodoYears([]);
      }
    };

    fetchTodoHeatmap();

    return () => {
      isMounted = false;
    };
  }, []);

  const yearOptions = useMemo(() => {
    const years = new Set(isDemoMode ? [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2] : [CURRENT_YEAR]);
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
    return sorted.length ? sorted : [CURRENT_YEAR];
  }, [goalAllValues, goalYears, gymAllValues, gymYears, habitAllValues, habitYears, isDemoMode, journalAllValues, journalYears, todoAllValues, todoYears]);

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
            values: !isDemoMode ? real : (real.length ? real : demoJournalSeries(section.seed, selectedYear, section.density)),
          };
        }
        if (section.id === "todo") {
          const real = byYear(todoAllValues, selectedYear);
          return {
            ...section,
            values: !isDemoMode ? real : (real.length ? real : demoTodoSeries(section.seed, selectedYear, section.density)),
          };
        }
        if (section.id === "habit") {
          const real = byYear(habitAllValues, selectedYear);
          return {
            ...section,
            values: !isDemoMode ? real : (real.length ? real : demoHabitSeries(section.seed, selectedYear, section.density)),
          };
        }
        if (section.id === "goal") {
          const real = byYear(goalAllValues, selectedYear);
          return {
            ...section,
            values: !isDemoMode ? real : (real.length ? real : demoGoalSeries(section.seed, selectedYear, section.density)),
          };
        }
        if (section.id === "gym") {
          const real = byYear(gymAllValues, selectedYear);
          return {
            ...section,
            values: !isDemoMode ? real : (real.length ? real : demoGymSeries(section.seed, selectedYear, section.density)),
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
    <div className="flex h-full flex-col gap-2">
      <div className="flex shrink-0 items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-500">Activity Heatmaps</p>
        <select
          value={selectedYear}
          onChange={(event) => setSelectedYear(Number(event.target.value))}
          className="rounded-xl border border-amber-100/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-stone-200 outline-none transition focus:border-amber-300/35"
          aria-label="Select heatmap year"
        >
          {yearOptions.map((year) => (
            <option key={year} value={year} style={{ backgroundColor: "#1c1917", color: "#e7e5e4" }}>
              {year}
            </option>
          ))}
        </select>
      </div>

      <div className="flex min-h-0 flex-1 flex-col justify-between gap-1.5">
        {sectionData.map((section) => (
          <HeatmapCard
            key={section.id}
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
