import { motion as Motion } from "framer-motion";
import DashboardSelect from "../../components/DashboardSelect";
import { useEffect, useMemo, useRef, useState } from "react";
import api from "../../api/axios";
import useAuth from "../../hooks/useAuth";
import useMobileLowMotion from "../../hooks/useMobileLowMotion";
import { useHabitEnvironment } from "./habitContext";
import { demoHabitTracking, habitDayKey, isHabitArchived } from "./habitUtils";
import { validHabitTracking, validHabitYears, validHabitImportant, habitFailureMessage, habitRevision, uncertainHabitWrite } from "./habitResponse";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);
export default function HabitTracking() {
  const { isDemoMode } = useAuth();
  const { clock, timezone, demoHabits, requestSignal } = useHabitEnvironment();
  const today = clock.date;
  const CURRENT_YEAR = Number(today.slice(0, 4));
  const CURRENT_MONTH = Number(today.slice(5, 7)) - 1;
  const DEMO_YEAR_OPTIONS = [...new Set([CURRENT_YEAR, ...demoHabits.flatMap(h => h.completedDayKeys.map(day => Number(day.slice(0, 4))))])].sort((a, b) => b - a);
  const [loadError, setLoadError] = useState("");
  const [yearError, setYearError] = useState("");
  const [actionErrors, setActionErrors] = useState({});
  const [retry, setRetry] = useState(0);
  const [loadedPeriod, setLoadedPeriod] = useState("");
  const [busyIds, setBusyIds] = useState(new Set());
  const locks = useRef(new Set());
  const blockedIds = useRef(new Set());
  const recoveredRetry = useRef(0);
  const version = useRef(0);
  const live = useRef(true);
  useEffect(() => {
    live.current = true;
    return () => { live.current = false; version.current += 1; };
  }, []);
  const lowMotion = useMobileLowMotion();
  const TrackingRow = lowMotion ? "tr" : Motion.tr;
  const monthStripRef = useRef(null);
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(!isDemoMode);
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);
  const [yearOptions, setYearOptions] = useState(() => (isDemoMode ? DEMO_YEAR_OPTIONS : [CURRENT_YEAR]));
  const [selectedMonth, setSelectedMonth] = useState(CURRENT_MONTH);
  const [dayPage, setDayPage] = useState(0);
  const [isPhone, setIsPhone] = useState(() => typeof window !== "undefined" && window.matchMedia("(max-width: 639px)").matches);
  const [habitView, setHabitView] = useState("active");
  const [importantOnly, setImportantOnly] = useState(false);
  const [endingSoonOnly, setEndingSoonOnly] = useState(false);


  useEffect(() => {
    const media = window.matchMedia("(max-width: 639px)");
    const update = () => setIsPhone(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const strip = monthStripRef.current;
    if (!strip) return undefined;
    const centerSelected = () => {
      const selected = strip.querySelector('[aria-pressed="true"]');
      if (!selected || strip.scrollWidth <= strip.clientWidth) return;
      const stripRect = strip.getBoundingClientRect();
      const selectedRect = selected.getBoundingClientRect();
      strip.scrollLeft += selectedRect.left - stripRect.left - (strip.clientWidth - selectedRect.width) / 2;
    };
    centerSelected();
    const observer = new ResizeObserver(centerSelected);
    observer.observe(strip);
    return () => observer.disconnect();
  }, [selectedMonth]);

  useEffect(() => {
    if (isDemoMode) {
      setYearOptions([...new Set([CURRENT_YEAR, ...demoHabits.flatMap(h => h.completedDayKeys.map(day => Number(day.slice(0, 4))))])].sort((a, b) => b - a));
      return;
    }

    let cancelled = false;
    let controller, sequence = 0;
    const fetchYearOptions = async () => {
      controller?.abort(); controller = new AbortController(); const current = ++sequence;
      try {
        const { data } = await api.get("/habits/heatmap", { signal: controller.signal, timeout: 15000 });
        if (cancelled || current !== sequence) return;
        if (!validHabitYears(data)) throw new Error("Invalid habit years");
        const years = Array.isArray(data?.years)
          ? data.years
              .map((year) => Number.parseInt(String(year), 10))
              .filter((year) => Number.isFinite(year))
          : [];
        const nextOptions = [...new Set([CURRENT_YEAR, ...years])].sort((a, b) => b - a);
        setYearOptions(nextOptions.length ? nextOptions : [CURRENT_YEAR]);
        setYearError("");
      } catch {
        if (!cancelled && current === sequence) setYearError("Could not refresh available history years. Please retry tracking.");
      }
    };

    fetchYearOptions();
    window.addEventListener("focus", fetchYearOptions);
    window.addEventListener("monkmode:habits-updated", fetchYearOptions);

    return () => {
      cancelled = true;
      controller?.abort();
      window.removeEventListener("focus", fetchYearOptions);
      window.removeEventListener("monkmode:habits-updated", fetchYearOptions);
    };
  }, [isDemoMode, CURRENT_YEAR, demoHabits, retry]);

  useEffect(() => {
    if (!yearOptions.includes(selectedYear)) {
      setSelectedYear(yearOptions[0] ?? CURRENT_YEAR);
    }
  }, [selectedYear, yearOptions, CURRENT_YEAR]);

  /* A month is published only after that exact request succeeds. */
  useEffect(() => {
    if (isDemoMode) return;
    let cancelled = false;
    let controller;
    const fetchTracking = async () => {
      if (locks.current.size) return;
      controller?.abort(); controller = new AbortController();
      const current = ++version.current;
      try {
        const { data } = await api.get("/habits/tracking?month=" + (selectedMonth + 1) + "&year=" + selectedYear, { signal: controller.signal, timeout: 15000 });
        if (cancelled || current !== version.current) return;
        if (!validHabitTracking(data, selectedYear, selectedMonth + 1)) throw new Error("Invalid tracking response");
        setHabits(data.map(h => ({
          ...h, id: h._id?.toString() ?? h.id, completedDays: h.completedDays ?? [],
          startDate: habitDayKey(h.startDate, timezone), endDate: habitDayKey(h.endDate, timezone),
          deletedAt: h.deletedAt || null,
        })));
        setLoadedPeriod(selectedYear + "-" + selectedMonth);
        if (retry !== recoveredRetry.current) { recoveredRetry.current = retry; blockedIds.current.clear(); setActionErrors({}); }
        setLoadError("");
      } catch (error) {
        if (!cancelled && current === version.current) setLoadError(habitFailureMessage(error, "Could not load this month's tracking data. Please retry."));
      } finally {
        if (!cancelled && current === version.current) setLoading(false);
      }
    };
    fetchTracking();
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") fetchTracking(); }, 60000);
    window.addEventListener("focus", fetchTracking);
    window.addEventListener("monkmode:habits-updated", fetchTracking);
    return () => {
      cancelled = true;
      controller?.abort();
      window.clearInterval(timer);
      window.removeEventListener("focus", fetchTracking);
      window.removeEventListener("monkmode:habits-updated", fetchTracking);
    };
  }, [isDemoMode, selectedMonth, selectedYear, timezone, today, retry]);

  const sortedHabits = useMemo(
    () => [...(isDemoMode ? demoHabitTracking(demoHabits, selectedYear, selectedMonth + 1) : habits)].sort((a, b) => Number(Boolean(b.isImportant)) - Number(Boolean(a.isImportant))),
    [habits, isDemoMode, demoHabits, selectedYear, selectedMonth]
  );

  const adjustedHabits = sortedHabits;

  const filteredHabits = useMemo(
    () => adjustedHabits.filter((habit) => {
      const archivedMatch = habitView === "active" ? !isHabitArchived(habit, today) : isHabitArchived(habit, today);
      if (!archivedMatch) return false;
      if (habitView === "active" && habit.startDate && habit.startDate > today) return false;

      if (importantOnly && !habit.isImportant) return false;

      if (endingSoonOnly) {
        const endDateStr = habit.endDate
          ? habitDayKey(habit.endDate, timezone)
          : null;
        if (!endDateStr) return false;
        const daysToEnd = Math.ceil((new Date(endDateStr) - new Date(today)) / (1000 * 60 * 60 * 24));
        if (!(daysToEnd >= 0 && daysToEnd <= 7)) return false;
      }

      return true;
    }),
    [habitView, today, adjustedHabits, importantOnly, endingSoonOnly, timezone]
  );

  const visibleDays = useMemo(() => {
    const maxDay = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    return DAYS.slice(0, maxDay);
  }, [selectedMonth, selectedYear]);
  const daysPerPage = 5;
  const pageCount = Math.ceil(visibleDays.length / daysPerPage);
  const displayedDays = isPhone ? visibleDays.slice(dayPage * daysPerPage, (dayPage + 1) * daysPerPage) : visibleDays;
  const changeMonth = (month) => {
    setSelectedMonth(month);
    setDayPage(0);
  };

  const toggleImportant = async id => {
    if (isDemoMode || locks.current.has(id) || blockedIds.current.has(id)) return;
    const habit = habits.find(h => h.id === id);
    if (!habit) return;
    locks.current.add(id);
    version.current += 1;
    setBusyIds(new Set(locks.current));
    let acknowledged = false;
    try {
      const { data } = await api.patch("/habits/" + id + "/important", { isImportant: !habit.isImportant, ...habitRevision(habit) }, { signal: requestSignal, timeout: 20000 });
      acknowledged = true;
      if (!validHabitImportant(data, id, !habit.isImportant)) throw new Error("Invalid important confirmation");
      if (live.current) {
        setHabits(previous => previous.map(h => h.id === id ? { ...h, isImportant: data.isImportant, updatedAt: data.updatedAt } : h));
        setActionErrors(previous => { const next = { ...previous }; delete next[id]; return next; });
      }
    } catch (error) {
      if (live.current) { if (uncertainHabitWrite(error, acknowledged)) blockedIds.current.add(id); setActionErrors(previous => ({ ...previous, [id]: habitFailureMessage(error, "Important flag could not be confirmed. Reload using Retry tracking before changing it again.") })); }
    } finally {
      locks.current.delete(id);
      if (live.current) setBusyIds(new Set(locks.current));
      window.dispatchEvent(new Event("monkmode:habits-updated"));
    }
  };

  const getCurrentStreak = (completedDays, maxDay) => {
    const filtered = [...new Set(completedDays)].filter((day) => day >= 1 && day <= maxDay).sort((a, b) => a - b);
    if (!filtered.length) return 0;

    let streak = 1;
    for (let i = filtered.length - 1; i > 0; i -= 1) {
      if (filtered[i] - filtered[i - 1] === 1) streak += 1;
      else break;
    }
    return streak;
  };

  return (
    <div className="habits-track-view space-y-4">
      {(loadError || yearError || Object.keys(actionErrors).length > 0) && <div role="alert" className="rounded-xl border border-rose-400/25 p-3 text-sm text-rose-200">{loadError} {yearError} {Object.values(actionErrors).join(" ")} <button type="button" className="ml-2 underline" onClick={() => { setLoadError(""); setRetry(value => value + 1); }}>Retry tracking</button></div>}
      <div className="habits-track-heading flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <p className="text-label-lg">Track Your Habit</p>
        <div className="habit-track-filters flex w-full flex-wrap items-center gap-2 sm:w-auto">
          {["active", "archived"].map((view) => (
            <button
              key={view}
              type="button"
              onClick={() => setHabitView(view)}
              aria-pressed={habitView === view}
              className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold capitalize transition ${
                habitView === view
                  ? "border-amber-300/45 bg-amber-500/15 text-amber-200"
                  : "border-amber-100/10 bg-white/5 text-stone-400 hover:text-amber-200"
              }`}
            >
              {view}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setImportantOnly((prev) => !prev)}
            className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold transition ${
              importantOnly
                ? "border-amber-300/45 bg-amber-500/15 text-amber-100"
                : "border-amber-100/10 bg-white/5 text-stone-400 hover:text-amber-200"
            }`}
          >
            Important
          </button>
          <button
            type="button"
            onClick={() => setEndingSoonOnly((prev) => !prev)}
            className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold transition ${
              endingSoonOnly
                ? "border-rose-300/45 bg-rose-500/15 text-rose-100"
                : "border-amber-100/10 bg-white/5 text-stone-400 hover:text-rose-200"
            }`}
          >
            Ending Soon
          </button>
        </div>
      </div>

      <section className="habits-track-panel rounded-[1.4rem] border border-amber-100/10 bg-gradient-to-b from-black/20 to-black/10 p-3 shadow-xl shadow-black/20 sm:rounded-2xl sm:p-4">
        <div className="dashboard-period-controls habit-track-toolbar mb-2 rounded-lg border border-amber-100/10 bg-black/30 px-3 py-2">
            <div className="flex min-w-0 items-center gap-3">
              <label className="flex shrink-0 items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-400">
                Year
                <DashboardSelect
                  value={selectedYear}
                  aria-label="Tracking year"
                  onChange={(event) => setSelectedYear(Number(event.target.value))}
                  className="rounded-md border border-amber-200/20 bg-black/40 px-2 py-1 text-[11px] font-semibold text-stone-100 outline-none transition focus:border-amber-300/50"
                >
                  {yearOptions.map((year) => (
                    <option key={year} value={year} className="bg-stone-900 text-stone-100">
                      {year}
                    </option>
                  ))}
                </DashboardSelect>
              </label>
              <div className="habit-track-mobile-month min-w-0 flex-1 sm:hidden">
                <DashboardSelect
                  value={selectedMonth}
                  onChange={(event) => changeMonth(Number(event.target.value))}
                  aria-label="Month"
                  className="w-full rounded-md border border-amber-200/20 bg-black/40 px-2 py-1 text-[11px] font-semibold text-stone-100"
                >
                  {MONTHS.map((month, index) => <option key={month} value={index}>{month}</option>)}
                </DashboardSelect>
              </div>
              <div ref={monthStripRef} className="habit-track-months journal-scroll flex min-w-0 flex-1 gap-1 overflow-x-auto text-center text-[11px] font-semibold uppercase tracking-wide text-stone-300">
                {MONTHS.map((month, index) => (
                  <button
                    key={month}
                    type="button"
                    onClick={() => changeMonth(index)}
                    aria-pressed={selectedMonth === index}
                    className={`habit-track-month rounded px-1 py-0.5 transition ${
                      selectedMonth === index
                        ? "bg-amber-500/20 text-amber-200"
                        : "text-stone-300 hover:bg-white/5 hover:text-stone-100"
                    }`}
                  >
                    {month}
                  </button>
                ))}
              </div>
            </div>
        </div>

        {isPhone && (
          <div className="habit-track-day-pager mb-2 flex items-center justify-between gap-2 text-xs text-amber-100">
            <span aria-live="polite">Days {displayedDays[0]}–{displayedDays.at(-1)} of {visibleDays.length}</span>
            <div className="flex items-center gap-1">
              <button type="button" aria-label="Previous days" disabled={dayPage === 0} onClick={() => setDayPage((page) => Math.max(0, page - 1))}>‹</button>
              <button type="button" aria-label="Next days" disabled={dayPage >= pageCount - 1} onClick={() => setDayPage((page) => Math.min(pageCount - 1, page + 1))}>›</button>
            </div>
          </div>
        )}

        <div className="habits-track-grid journal-scroll overflow-x-auto overflow-y-auto rounded-xl border border-amber-100/10 bg-black/10 p-2.5 sm:p-3">
          <div className="habits-track-grid-inner">
            {!isDemoMode && loadedPeriod !== selectedYear + "-" + selectedMonth && loadError ? (<p className="p-6 text-sm text-stone-400">Tracking for this month is unavailable. Retry above.</p>) : (loading || (!isDemoMode && loadedPeriod !== selectedYear + "-" + selectedMonth)) ? (
              <div className="flex items-center justify-center py-16">
                <p className="text-sm text-stone-400">Loading tracking data...</p>
              </div>
            ) : (
              <table className="habits-track-table w-full border-separate border-spacing-x-1 border-spacing-y-1" style={isPhone ? undefined : { minWidth: `${160 + visibleDays.length * 32}px` }}>
                <thead>
                  <tr>
                    <th className="habit-track-name-heading rounded-lg border border-amber-100/10 bg-black/90 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-stone-400">
                      Day
                    </th>
                    {displayedDays.map((day) => (
                      <th
                        key={`day-${day}`}
                        className="habit-track-day-heading h-7 w-6 rounded border border-amber-100/10 bg-black/90 text-center text-[10px] font-semibold text-stone-400"
                      >
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredHabits.length === 0 ? (
                    <tr>
                      <td colSpan={displayedDays.length + 1} className="py-12 text-center text-sm text-stone-500">
                        {habitView === "active" ? "No active habits to track." : "No archived habits."}
                      </td>
                    </tr>
                  ) : (
                    filteredHabits.map((habit, rowIdx) => {
                      const currentStreak = Number.isFinite(Number(habit.currentStreak))
                        ? Number(habit.currentStreak)
                        : getCurrentStreak(habit.completedDays, visibleDays.length);
                      const archiveLabel = isHabitArchived(habit, today) ? (habit.deletedAt ? "Deleted" : "Ended") : null;
                      const endDateStr = habit.endDate
                        ? habitDayKey(habit.endDate, timezone)
                        : null;
                      const daysToEnd = endDateStr
                        ? Math.ceil((new Date(endDateStr) - new Date(today)) / (1000 * 60 * 60 * 24))
                        : null;

                      return (
                        <TrackingRow
                          key={habit.id}
                          {...(lowMotion ? {} : {
                            initial: { opacity: 0, x: -12 },
                            animate: { opacity: 1, x: 0 },
                            transition: { delay: rowIdx * 0.04, duration: 0.25 }
                          })}
                        >
                          <td className="habit-track-name-cell rounded-lg border border-amber-100/10 bg-[#181110] px-2.5 py-2 sm:px-3 sm:py-1">
                            <div className="habit-track-name-content">
                              <div className="habit-track-title-row">
                                <p className="min-w-0 break-words text-sm font-semibold text-stone-100 sm:truncate">{habit.title}</p>
                                <button
                                  type="button"
                                  onClick={() => toggleImportant(habit._id?.toString() ?? habit.id)}
                                  disabled={isDemoMode || busyIds.has(habit.id) || blockedIds.current.has(habit.id)}
                                  aria-busy={busyIds.has(habit.id)}
                                  aria-pressed={habit.isImportant}
                                  className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold transition ${
                                    habit.isImportant
                                      ? "border-amber-300/45 bg-amber-500/15 text-amber-200"
                                      : "border-amber-100/15 bg-white/5 text-stone-300 hover:border-amber-300/35 hover:text-amber-200"
                                  }`}
                                >
                                  {habit.isImportant ? "Important" : "Mark"}
                                </button>
                              </div>
                              <div className="habit-track-meta">
                                <span className="shrink-0 rounded-full border border-orange-300/40 bg-orange-500/15 px-2 py-0.5 text-[10px] font-semibold text-orange-200">
                                  🔥 {currentStreak}
                                </span>
                                <span className="shrink-0 rounded-full border border-amber-300/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-100">
                                  Target {habit.targetStreak}
                                </span>
                                {archiveLabel ? (
                                  <span className="dashboard-card-status" data-tone={archiveLabel === "Deleted" ? "danger" : "info"}>
                                    {archiveLabel}
                                  </span>
                                ) : endDateStr ? (
                                  <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                                    daysToEnd <= 7 ? "border-rose-300/25 bg-rose-500/10 text-rose-200"
                                    : daysToEnd <= 30 ? "border-yellow-300/25 bg-yellow-500/10 text-yellow-200"
                                    : "border-sky-300/25 bg-sky-500/10 text-sky-100"
                                  }`}>
                                    {daysToEnd > 0 ? `${daysToEnd} days left` : "Ending today"}
                                  </span>
                                ) : (
                                  <span className="dashboard-card-status" data-tone="success">
                                    Never Ends
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          {displayedDays.map((day) => {
                            const checked = habit.completedDays.includes(day);
                            return (
                              <td key={`${habit.id}-${day}`} data-day={day} className="habit-track-day-cell text-center">
                                <div
                                  className={`mx-auto h-5 w-5 rounded border ${
                                    checked
                                      ? "border-amber-300/60 bg-gradient-to-br from-amber-400/40 to-orange-400/30"
                                      : "border-amber-100/25 bg-black/20"
                                  }`}
                                />
                              </td>
                            );
                          })}
                        </TrackingRow>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
