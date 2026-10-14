import DashboardDateTimeInput from "../../components/DashboardDateTimeInput";
import { motion as Motion } from "framer-motion";
import DashboardSelect from "../../components/DashboardSelect";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../../api/axios";
import useAuth from "../../hooks/useAuth";
import useMobileLowMotion from "../../hooks/useMobileLowMotion";
import HabitCalendarTooltip from "./HabitCalendarTooltip";
import { useHabitEnvironment } from "./habitContext";
import { DEFAULT_HABIT_TIMEZONE, formatHabitTime, habitCategoryStorageKey, habitClock, habitDayKey, habitDaysOnDay, habitTimeOnDay, isHabitOnDay } from "./habitUtils";
import { validHabit, validHabits, validHabitDeletion, habitResponseId, habitFailureMessage, habitRevision, uncertainHabitWrite } from "./habitResponse";

/* ─── Constants ─────────────────────────────────────── */
const PRIORITIES = ["High", "Medium", "Low"];
const PRIORITY_EMOJI = { High: "🔴", Medium: "🟡", Low: "🟢" };
const PRIORITY_STYLES = {
  High:   "border-red-400/40 text-red-200 bg-red-500/10",
  Medium: "border-yellow-400/40 text-yellow-200 bg-yellow-500/10",
  Low:    "border-green-400/40 text-green-200 bg-green-500/10",
};

const REPEAT_TYPES = [
  { value: "daily",    label: "Daily"                   },
  { value: "weekdays", label: "Weekdays (Custom Days)"  },
  { value: "weekend",  label: "Weekend (Sat & Sun)"     },
  { value: "7days",    label: "7 Days"                  },
  { value: "21days",   label: "21 Days"                 },
];
const TIME_OF_DAY_OPTIONS = ["Morning", "Afternoon", "Evening", "Night"];
const CREATE_HABIT_VIEWS = [
  { id: "create", icon: "+", label: "New Habit" },
  { id: "habits", icon: "✓", label: "All Habits" },
  { id: "calendar", icon: "▦", label: "Calendar" },
  { id: "logs", icon: "↻", label: "Habit Logs" },
];
const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_SHORT = { Sun: "Su", Mon: "M", Tue: "T", Wed: "W", Thu: "Th", Fri: "F", Sat: "Sa" };

const DEFAULT_CATEGORIES = [
  "Mindfulness", "Fitness", "Learning", "Discipline", "Health", "Productivity", "Personal",
];


const toISO = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
const parseISO = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d, 12); };
const addDays = (n, startISO) => {
  if (!startISO) return "";
  const d = parseISO(startISO);
  d.setDate(d.getDate() + n);
  return toISO(d);
};
const fixedEndDate = (durationDays, startISO) => addDays(Math.max(durationDays - 1, 0), startISO);
const totalDaysInclusive = (startISO, endISO) => {
  if (!startISO || !endISO) return 0;
  const msPerDay = 24 * 60 * 60 * 1000;
  const start = new Date(startISO + "T12:00:00Z");
  const end = new Date(endISO + "T12:00:00Z");
  return Math.round((end - start) / msPerDay) + 1;
};
const FIXED_DURATION = { "7days": 7, "21days": 21 };
const hasOccurrenceInRange = (repeatType, startISO, endISO, days = []) => {
  if (!startISO || !endISO) return true;
  const start = parseISO(startISO);
  const rangeDays = totalDaysInclusive(startISO, endISO);
  if (rangeDays <= 0) return false;
  if (repeatType === "daily" || repeatType === "7days" || repeatType === "21days") return true;

  const startDay = start.getDay();
  const includesDay = (dayIndex) => {
    const offset = (dayIndex - startDay + 7) % 7;
    return offset < rangeDays;
  };

  if (repeatType === "weekend") {
    return includesDay(0) || includesDay(6);
  }

  if (repeatType === "weekdays") {
    const selectedDays = Array.isArray(days) && days.length ? days : ["Mon", "Tue", "Wed", "Thu", "Fri"];
    return selectedDays.some((dayLabel) => {
      const dayIndex = WEEK_DAYS.indexOf(dayLabel);
      return dayIndex >= 0 && includesDay(dayIndex);
    });
  }

  return true;
};
const fmtTime = formatHabitTime;

const PANEL_H = "650px";
const DELETE_UNDO_WINDOW_MS = 48 * 60 * 60 * 1000;
const toLogAtISO = (dateStr, timeStr = "00:00") => {
  if (!dateStr) return null;
  const d = new Date(`${dateStr}T${timeStr}:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
};

const getDeleteUndoMeta = (deletedAt) => {
  if (!deletedAt) return { canUndoDelete: false, deleteUndoExpiresAt: null, deleteUndoRemainingMs: 0 };
  const deletedAtDate = new Date(deletedAt);
  if (Number.isNaN(deletedAtDate.getTime())) {
    return { canUndoDelete: false, deleteUndoExpiresAt: null, deleteUndoRemainingMs: 0 };
  }
  const expiresAt = new Date(deletedAtDate.getTime() + DELETE_UNDO_WINDOW_MS);
  const remainingMs = Math.max(0, expiresAt.getTime() - Date.now());
  return {
    canUndoDelete: remainingMs > 0,
    deleteUndoExpiresAt: expiresAt.toISOString(),
    deleteUndoRemainingMs: remainingMs
  };
};

const formatRemainingUndo = (remainingMs) => {
  const safeMs = Math.max(0, Number(remainingMs) || 0);
  const totalMinutes = Math.ceil(safeMs / (60 * 1000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
};

const resolveLogHabitId = (log) => {
  if (log?.deletedItem?.id) return String(log.deletedItem.id);
  const rawId = String(log?.id || "");
  if (rawId.includes("-activity-")) return rawId.split("-activity-")[0];
  if (rawId.includes("-del-")) return rawId.split("-del-")[0];
  if (rawId.includes("-edit-")) return rawId.split("-edit-")[0];
  if (rawId.endsWith("-log")) return rawId.slice(0, -4);
  return null;
};

const emitHabitsUpdated = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("monkmode:habits-updated"));
  }
};

/* ─── normalizeHabit ─────────────────────────────────── */
const normalizeHabit = (h, todayStr, timezone = DEFAULT_HABIT_TIMEZONE) => ({
  ...h,
  id: h._id?.toString() ?? h.id,
  reason: h.note ?? h.reason ?? "",
  startDate: habitDayKey(h.startDate, timezone) || habitDayKey(h.createdAt, timezone) || todayStr,
  endDate: habitDayKey(h.endDate, timezone),
  repeatType: h.repeatType ?? h.frequency ?? "daily",
  timeOfDay: h.timeOfDay ?? "",
  days: h.days ?? [],
  isImportant: h.isImportant ?? false,
  canUndoDelete: Boolean(h.canUndoDelete),
  deleteUndoExpiresAt: h.deleteUndoExpiresAt ?? null,
  deleteUndoRemainingMs: Number.isFinite(Number(h.deleteUndoRemainingMs)) ? Number(h.deleteUndoRemainingMs) : 0,
});

const loadStoredCategories = (storageKey) => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((value) => (typeof value === "string" ? value.trim() : ""))
      .filter(Boolean);
  } catch {
    return [];
  }
};

/* ─── Component ─────────────────────────────────────── */
export default function CreateHabit({ entity = "habit" }) {
  const { isDemoMode, user } = useAuth();
  const { clock, timezone, demoHabits, requestSignal } = useHabitEnvironment();
  const today = clock.date;
  const storageKey = habitCategoryStorageKey(user?.id, isDemoMode);
  const toDateStr = useCallback(value => habitDayKey(value, timezone), [timezone]);
  const getLocalHHMM = value => habitClock(new Date(value), timezone).time;
  const isHabitOnDate = useCallback((habit, day) => isHabitOnDay(habit, day, timezone), [timezone]);
  const writeLock = useRef(false);
  const [writeBlocked, setWriteBlocked] = useState(false);
  const editingRevision = useRef({});
  const reloadHabits = useRef(null);
  const version = useRef(0);
  const live = useRef(true);
  const readyRef = useRef(isDemoMode);
  const [loadError, setLoadError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    live.current = true;
    return () => { live.current = false; version.current += 1; confirmResolveRef.current?.(false); };
  }, []);
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedMobileView = searchParams.get("habitCreate");
  const mobileView = CREATE_HABIT_VIEWS.some((view) => view.id === requestedMobileView)
    ? requestedMobileView
    : "create";
  const selectMobileView = (view) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set("view", "create");
      next.set("habitCreate", view);
      next.delete("habitToday");
      return next;
    });
  };
  const lowMotion = useMobileLowMotion();
  const HabitCard = lowMotion ? "article" : Motion.article;
  const isGoal = entity === "goal";
  const singular = isGoal ? "Goal" : "Habit";
  const plural = isGoal ? "Goals" : "Habits";
  const lowerSingular = singular.toLowerCase();
  const lowerPlural = plural.toLowerCase();

  /* category dropdowns */
  const [isCatOpen, setIsCatOpen] = useState(false);
  const catDropRef = useRef(null);
  useEffect(() => {
    const handler = (e) => {
      if (catDropRef.current && !catDropRef.current.contains(e.target)) setIsCatOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* categories */
  const [categoryOptions, setCategoryOptions] = useState(() => {
    const stored = isDemoMode ? [] : loadStoredCategories(storageKey);
    const merged = new Map();
    [...DEFAULT_CATEGORIES, ...stored].forEach((category) => {
      const key = category.toLowerCase();
      if (!merged.has(key)) merged.set(key, category);
    });
    return [...merged.values()];
  });
  const [showCustomCat, setShowCustomCat] = useState(false);
  const [customCat, setCustomCat] = useState("");
  const [catError, setCatError] = useState("");
  const [catDeleteError, setCatDeleteError] = useState("");
  const [toast, setToast] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingHabitId, setDeletingHabitId] = useState(null);
  const [restoringLogId, setRestoringLogId] = useState(null);
  const [confirmState, setConfirmState] = useState({
    open: false,
    title: "",
    message: "",
    confirmLabel: "Confirm",
    tone: "warning"
  });
  const confirmResolveRef = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined" || isDemoMode) return;
    const customOnly = categoryOptions.filter(
      (category) => !DEFAULT_CATEGORIES.some((defaultCat) => defaultCat.toLowerCase() === category.toLowerCase())
    );
    try { window.localStorage.setItem(storageKey, JSON.stringify(customOnly)); }
    catch { setCatError("Custom categories could not be stored on this browser."); }
  }, [categoryOptions, storageKey, isDemoMode]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const showToast = (message, tone = "success") => {
    setToast({ id: Date.now(), message, tone });
  };

  const openConfirm = ({ title, message, confirmLabel = "Confirm", tone = "warning" }) =>
    new Promise((resolve) => {
      confirmResolveRef.current = resolve;
      setConfirmState({ open: true, title, message, confirmLabel, tone });
    });

  const closeConfirm = (confirmed) => {
    if (confirmResolveRef.current) {
      confirmResolveRef.current(confirmed);
      confirmResolveRef.current = null;
    }
    setConfirmState((prev) => ({ ...prev, open: false }));
  };

  /* habits list */
  const [habits, setHabits] = useState(() => isDemoMode ? demoHabits : []);
  const [habitLogs, setHabitLogs] = useState([]);
  const [loading, setLoading] = useState(!isDemoMode);
  const [editingId, setEditingId] = useState(null);
  const formPanelRef = useRef(null);

  useEffect(() => {
    if (!isDemoMode) return;
    setHabitLogs(demoHabits.flatMap((habit) => (
      Array.isArray(habit.activityLogs) ? habit.activityLogs : []
    ).map((entry, index) => {
      const at = entry.at || new Date().toISOString();
      const date = toDateStr(at) || today;
      const time = habitClock(new Date(at), timezone).time;
      return {
        id: `${habit.id}-activity-${index}`,
        title: entry.title || habit.title,
        date,
        time,
        action: entry.action || "created",
        logAt: at,
      };
    })));
  }, [demoHabits, isDemoMode, timezone, today, toDateStr]);

  /* fetch habits for real users */
  useEffect(() => {
    if (isDemoMode) return;
    let cancelled = false;
    let controller;
    const fetchHabits = async () => {
      if (writeLock.current) return false;
      controller?.abort();
      controller = new AbortController();
      const current = ++version.current;
      try {
        const { data } = await api.get("/habits?view=all", { signal: controller.signal, timeout: 15000 });
        if (cancelled || current !== version.current) return false;
        if (!validHabits(data)) throw new Error("Invalid habit response");
        const todayStr = today;
        const normalized = data.map((h) => normalizeHabit(h, todayStr, timezone));
        setHabits(normalized);

        const persistedLogs = normalized.flatMap((habit) => {
          const entries = Array.isArray(habit.activityLogs) ? habit.activityLogs : [];
          const effectiveEntries = entries.length > 0
            ? entries
            : [{
                action: habit.deletedAt && habit.archivedReason === "deleted" ? "deleted" : "created",
                title: habit.title,
                at: habit.deletedAt || habit.createdAt || new Date().toISOString()
              }];
          return effectiveEntries.map((entry, index) => {
            const action = entry?.action || "created";
            const at = entry?.at || habit.updatedAt || habit.createdAt || new Date().toISOString();
            const date = toDateStr(at) || todayStr;
            const time = habitClock(new Date(at), timezone).time;
            const logAt = new Date(at).toISOString();

            if (action === "deleted") {
              const deletedAt = habit.deletedAt || at;
              const undoMeta = getDeleteUndoMeta(deletedAt);
              const canUndoDelete = Boolean(habit.deletedAt && habit.archivedReason === "deleted" && undoMeta.canUndoDelete);
              const deleteUndoExpiresAt = canUndoDelete ? undoMeta.deleteUndoExpiresAt : null;
              return {
                id: `${habit.id}-activity-${entry?._id?.toString?.() || `${Date.parse(logAt)}-${index}`}`,
                title: entry?.title || habit.title,
                date,
                time,
                action,
                deletedAt,
                canUndoDelete,
                deleteUndoExpiresAt,
                logAt,
                deletedItem: {
                  ...habit,
                  deletedAt,
                  archivedReason: "deleted",
                  canUndoDelete,
                  deleteUndoExpiresAt
                }
              };
            }

            return {
              id: `${habit.id}-activity-${entry?._id?.toString?.() || `${Date.parse(logAt)}-${index}`}`,
              title: entry?.title || habit.title,
              date,
              time,
              action,
              logAt
            };
          });
        });

        setHabitLogs(persistedLogs);
        readyRef.current = true;
        setLoadError("");
        setCategoryOptions(previous => [...new Map([...previous, ...normalized.map(h => h.category).filter(Boolean)].map(name => [name.toLowerCase(), name])).values()]);
        return true;
      } catch (error) {
        if (!cancelled && current === version.current) setLoadError(habitFailureMessage(error, "Could not load habits and activity logs. Please retry."));
        return false;
      } finally {
        if (!cancelled && current === version.current) setLoading(false);
      }
    };
    reloadHabits.current = fetchHabits;
    fetchHabits();
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") fetchHabits(); }, 60000);
    window.addEventListener("focus", fetchHabits);
    window.addEventListener("monkmode:habits-updated", fetchHabits);
    return () => {
      cancelled = true; controller?.abort();
      window.clearInterval(timer);
      window.removeEventListener("focus", fetchHabits);
      window.removeEventListener("monkmode:habits-updated", fetchHabits);
    };
  }, [isDemoMode, today, timezone, retry, toDateStr]);

  /* calendar */
  const [viewMonth, setViewMonth] = useState(() => {
    const n = parseISO(today); return new Date(n.getFullYear(), n.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(today);
  const [calendarPreview, setCalendarPreview] = useState(null);
  const calendarTooltipId = useId();
  const dismissCalendarPreview = useCallback(() => setCalendarPreview(null), []);
  const showCalendarPreview = (event, iso, source) => {
    setCalendarPreview({ iso, anchor: event.currentTarget, source });
  };

  /* create form */
  const [form, setForm] = useState({
    title: "", reason: "", targetStreak: "", timeOfDay: "", category: "", priority: "",
    repeatType: "", startDate: today, endDate: "",
    neverEnds: true, time: "", days: ["Mon", "Wed", "Fri"],
  });
  const [touched, setTouched] = useState({});
  const [error, setError] = useState("");
  const [undoError, setUndoError] = useState("");
  const [habitsView, setHabitsView] = useState("active");

  const previousToday = useRef(today);
  useEffect(() => {
    const previous = previousToday.current;
    previousToday.current = today;
    if (previous !== today && !editingId) setForm(current => !current.title && current.startDate === previous ? { ...current, startDate: today } : current);
    if (isDemoMode) setHabits(demoHabits);
  }, [today, editingId, isDemoMode, demoHabits]);

  /* ── derived ── */
  const activeHabits = useMemo(() => {
    const active = [];
    habits.forEach((h) => {
      const isDeleted = Boolean(h.deletedAt && h.archivedReason === "deleted");
      const isEnded = h.archivedReason === "ended" || (h.endDate && h.endDate < today);

      if (isDeleted) {
        return;
      }

      if (isEnded) {
        return;
      } else {
        active.push(h);
      }
    });
    return active;
  }, [habits, today]);

  const allLogs = useMemo(() => {
    const getLogTime = (log) => {
      if (log.logAt) {
        const direct = new Date(log.logAt).getTime();
        if (Number.isFinite(direct)) return direct;
      }
      if (log.deletedAt) {
        const deleted = new Date(log.deletedAt).getTime();
        if (Number.isFinite(deleted)) return deleted;
      }
      const derived = toLogAtISO(log.date, log.time);
      const derivedTime = derived ? new Date(derived).getTime() : 0;
      return Number.isFinite(derivedTime) ? derivedTime : 0;
    };

    return [...habitLogs].sort((a, b) => getLogTime(b) - getLogTime(a));
  }, [habitLogs]);

  const undoEligibleLogIds = useMemo(() => {
    const eligible = new Set();
    const settledByHabit = new Set();

    for (const log of allLogs) {
      const habitId = resolveLogHabitId(log);
      if (!habitId || settledByHabit.has(habitId)) continue;

      if (log.action === "restored") {
        settledByHabit.add(habitId);
        continue;
      }

      if (log.action === "deleted") {
        const undoMeta = getDeleteUndoMeta(log.deletedAt || log.deletedItem?.deletedAt);
        if (log.deletedItem && undoMeta.canUndoDelete) {
          eligible.add(log.id);
        }
        settledByHabit.add(habitId);
      }
    }

    return eligible;
  }, [allLogs]);
  const sortedActiveHabits = useMemo(() => {
    return [...activeHabits].sort((a, b) => Number(Boolean(b.isImportant)) - Number(Boolean(a.isImportant)));
  }, [activeHabits]);
  const sortedArchivedHabits = useMemo(() => {
    const archived = habits.filter((h) =>
      h.deletedAt || h.archivedReason === "ended" || (h.endDate && h.endDate < today)
    );
    return [...archived].sort((a, b) => Number(Boolean(b.isImportant)) - Number(Boolean(a.isImportant)));
  }, [habits, today]);
  const displayedHabits = habitsView === "active" ? sortedActiveHabits : sortedArchivedHabits;
  const isArchiveView = habitsView === "archive";

  const monthTitle = useMemo(
    () => viewMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    [viewMonth]
  );

  const calendarCells = useMemo(() => {
    const y = viewMonth.getFullYear(), mo = viewMonth.getMonth();
    const first = new Date(y, mo, 1);
    const days = new Date(y, mo + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < first.getDay(); i++) cells.push(null);
    for (let d = 1; d <= days; d++) cells.push(new Date(y, mo, d));
    return cells;
  }, [viewMonth]);

  const previewDate = calendarPreview?.iso;
  const previewHabits = useMemo(
    () => previewDate ? displayedHabits.filter((habit) => isHabitOnDate(habit, previewDate)) : [],
    [displayedHabits, previewDate, isHabitOnDate]
  );

  /* ── helpers ── */
  const setField = (field, value) => {
    setForm((p) => ({ ...p, [field]: value }));
    setTouched((p) => ({ ...p, [field]: true }));
    if (error) setError("");
  };
  const fieldErr = (f) => {
    if (!touched[f] && !error) return false;
    if (f === "timeOfDay") return !form.timeOfDay;
    if (f === "category") return !form.category;
    if (f === "priority") return !form.priority;
    if (f === "repeatType") return !form.repeatType;
    if (f === "time") return !form.time;
    return false;
  };
  const toggleDay = (day) =>
    setForm((p) => ({ ...p, days: p.days.includes(day) ? p.days.filter((d) => d !== day) : [...p.days, day] }));

  const addCustomCategory = () => {
    const name = customCat.trim();
    if (!name) { setCatError("Please enter a category name."); return; }
    if (name.length > 80) { setCatError("Category name must be 80 characters or fewer."); return; }
    if (isDemoMode) return;
    const existing = categoryOptions.find((c) => c.toLowerCase() === name.toLowerCase());
    if (!existing) {
      setCategoryOptions((p) => [...p, name]);
      setField("category", name);
    } else {
      setField("category", existing);
    }
    setCustomCat(""); setCatError(""); setCatDeleteError(""); setShowCustomCat(false);
  };

  const deleteCategory = (name) => {
    if (DEFAULT_CATEGORIES.includes(name)) { setCatDeleteError("Default categories cannot be deleted."); return; }
    if (isDemoMode) return;
    setCategoryOptions((p) => p.filter((c) => c.toLowerCase() !== name.toLowerCase()));
    setCatDeleteError("");
    setForm((p) => ({ ...p, category: p.category.toLowerCase() === name.toLowerCase() ? "" : p.category }));
  };

  const validate = () => {
    if (!form.title.trim()) return "Title is required.";
    if (form.targetStreak && (!Number.isSafeInteger(Number(form.targetStreak)) || Number(form.targetStreak) < 1)) return "Target streak must be a whole number of at least 1 day.";
    if (form.targetStreak) {
      const fixedDays = FIXED_DURATION[form.repeatType];
      if (fixedDays && form.startDate) {
        const autoEnd = fixedEndDate(fixedDays, form.startDate);
        const totalDays = totalDaysInclusive(form.startDate, autoEnd);
        if (Number(form.targetStreak) > totalDays) {
          return "Target streak should be <= total start to end date days.";
        }
      } else if (!form.neverEnds && form.startDate && form.endDate) {
        const totalDays = totalDaysInclusive(form.startDate, form.endDate);
        if (Number(form.targetStreak) > totalDays) {
          return "Target streak should be <= total start to end date days.";
        }
      }
    }
    if (!form.timeOfDay) return "Time of day is required.";
    if (!form.category) return "Category is required.";
    if (!form.priority) return "Priority is required.";
    if (!form.repeatType) return "Repeat type is required.";
    if (!form.time) return "Time is required.";
    if (!form.startDate) return "Start date is required.";
    if (!editingId && form.startDate < today) return "New habits cannot start in the past.";
    if (!form.neverEnds && !form.endDate) return "End date is required or select Never.";
    if (!form.neverEnds && form.endDate < today) return "End date cannot be before today.";
    if (!form.neverEnds && form.endDate < form.startDate) return "End date cannot be before the start date.";
    if (form.repeatType === "weekdays" && form.days.length === 0) return "Select at least one day.";
    if (!form.neverEnds && !hasOccurrenceInRange(form.repeatType, form.startDate, form.endDate, form.days)) {
      if (form.repeatType === "weekend") return "Selected range has no weekend day. Choose a later end date.";
      if (form.repeatType === "weekdays") return "Selected range has no chosen weekday. Adjust start/end date.";
    }
    return "";
  };

  const resetForm = () => {
    setEditingId(null);
    setTouched({});
    setForm({ title: "", reason: "", targetStreak: "", timeOfDay: "", category: "", priority: "", repeatType: "", startDate: today, endDate: "", neverEnds: true, time: "", days: ["Mon", "Wed", "Fri"] });
  };

  const handleSubmit = async event => {
    event.preventDefault();
    if (isDemoMode || writeLock.current || writeBlocked || !readyRef.current) return;
    setTouched({ title: true, timeOfDay: true, category: true, priority: true, repeatType: true, time: true, startDate: true });
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    writeLock.current = true;
    version.current += 1;
    setSubmitting(true);
    setError("");
    const editId = editingId;
    const fixedDays = FIXED_DURATION[form.repeatType];
    const endDate = fixedDays ? fixedEndDate(fixedDays, form.startDate) : (form.neverEnds ? null : form.endDate || null);
    const payload = {
      title: form.title.trim(), note: form.reason.trim(),
      targetStreak: form.targetStreak ? Number(form.targetStreak) : (editId ? null : endDate ? Math.min(21, totalDaysInclusive(form.startDate, endDate)) : 21),
      timeOfDay: form.timeOfDay, category: form.category, priority: form.priority,
      time: form.time, repeatType: form.repeatType, startDate: form.startDate || null,
      endDate, days: form.repeatType === "weekdays" ? form.days : [],
    };
    let acknowledged = false;
    try {
      const options = { signal: requestSignal, timeout: 20000 };
      const { data } = editId ? await api.patch("/habits/" + editId, { ...payload, ...editingRevision.current }, options) : await api.post("/habits", payload, options);
      if (!live.current) return;
      acknowledged = true;
      if (!validHabit(data) || (editId && habitResponseId(data) !== editId)) throw new Error("Invalid habit confirmation");
      const normalized = normalizeHabit(data, today, timezone);
      setHabits(previous => editId ? previous.map(h => h.id === editId ? normalized : h) : [normalized, ...previous]);
      const at = new Date();
      setHabitLogs(previous => [{ id: normalized.id + "-activity-" + at.getTime(), title: normalized.title, action: editId ? "edited" : "created", date: toDateStr(at), time: getLocalHHMM(at), logAt: at.toISOString() }, ...previous]);
      resetForm();
      showToast(data.reflectFromNextDay || data.reflectDaysFromNextDay ? "Habit saved. Schedule changes take effect tomorrow." : (editId ? "Habit updated." : "Habit created."));
    } catch (error) {
      if (live.current) {
        const uncertain = uncertainHabitWrite(error, acknowledged);
        if (uncertain) setWriteBlocked(true);
        setError(habitFailureMessage(error, uncertain ? "Save could not be confirmed. Reload habits and check the list before saving again. Your draft is kept."
          : "Could not save this habit. Your draft is kept; please retry."));
      }
    } finally {
      writeLock.current = false;
      if (live.current) setSubmitting(false);
      emitHabitsUpdated();
    }
  };

  const handleDelete = async id => {
    if (isDemoMode || writeLock.current || writeBlocked) return;
    const habit = habits.find(h => h.id === id);
    if (!habit) return;
    writeLock.current = true;
    const confirmed = await openConfirm({ title: 'Delete "' + habit.title + '"?', message: "This removes the habit from active lists. You can restore it within 48 hours.", confirmLabel: "Delete Habit", tone: "danger" });
    if (!confirmed || !live.current) { writeLock.current = false; return; }
    version.current += 1;
    setDeletingHabitId(id);
    setError("");
    let acknowledged = false;
    try {
      const { data } = await api.delete("/habits/" + id, { data: habitRevision(habit), signal: requestSignal, timeout: 20000 });
      if (!live.current) return;
      acknowledged = true;
      if (!validHabitDeletion(data, id)) throw new Error("Invalid deletion confirmation");
      const deleted = normalizeHabit(data.habit, today, timezone);
      setHabits(previous => previous.map(h => h.id === id ? deleted : h));
      const at = deleted.deletedAt;
      setHabitLogs(previous => [{ id: id + "-del-" + Date.now(), title: habit.title, date: toDateStr(at), time: getLocalHHMM(at), action: "deleted", deletedAt: at, deletedItem: deleted, logAt: at, ...getDeleteUndoMeta(at) }, ...previous]);
      if (editingId === id) resetForm();
      showToast(habit.title + " deleted. Restore available for 48h.", "warning");
    } catch (error) {
      if (live.current) { if (uncertainHabitWrite(error, acknowledged)) setWriteBlocked(true); setError(habitFailureMessage(error, "Deletion could not be confirmed. Reload habits before trying again.")); }
    } finally {
      writeLock.current = false;
      if (live.current) setDeletingHabitId(null);
      emitHabitsUpdated();
    }
  };

  const handleUndoDelete = async (logId, fallbackItem = null) => {
    const log = habitLogs.find(entry => entry.id === logId);
    const item = log?.deletedItem || fallbackItem;
    if (!item || isDemoMode || writeLock.current || writeBlocked) return;
    if (!getDeleteUndoMeta(item.deletedAt).canUndoDelete) { setUndoError("Restore expired. Deleted habits can only be restored within 48 hours."); return; }
    writeLock.current = true;
    const confirmed = await openConfirm({ title: 'Restore "' + item.title + '"?', message: "This restores the habit. If its end date has passed, it will remain in Archive.", confirmLabel: "Restore Habit", tone: "success" });
    if (!confirmed || !live.current) { writeLock.current = false; return; }
    version.current += 1;
    setRestoringLogId(logId);
    setUndoError("");
    let acknowledged = false;
    try {
      const { data } = await api.patch("/habits/" + item.id + "/restore", habitRevision(habits.find(h => h.id === item.id) || item), { signal: requestSignal, timeout: 20000 });
      if (!live.current) return;
      acknowledged = true;
      if (!validHabit(data) || habitResponseId(data) !== item.id || data.deletedAt) throw new Error("Invalid restore confirmation");
      const restored = normalizeHabit(data, today, timezone);
      setHabits(previous => [restored, ...previous.filter(h => h.id !== item.id)]);
      setHabitLogs(previous => previous.filter(entry => entry.id !== logId));
      showToast(item.title + " restored.");
    } catch (error) {
      if (live.current) { if (uncertainHabitWrite(error, acknowledged)) setWriteBlocked(true); setUndoError(habitFailureMessage(error, "Restore could not be confirmed. Reload habits before trying again.")); }
    } finally {
      writeLock.current = false;
      if (live.current) setRestoringLogId(null);
      emitHabitsUpdated();
    }
  };

  const startEdit = (h) => {
    if (isDemoMode || writeLock.current || writeBlocked) return;
    editingRevision.current = habitRevision(h);
    setError("");
    setEditingId(h.id);
    const nextEdit = {
      title: h.title,
      reason: h.reason ?? h.description ?? "",
      targetStreak: h.targetStreak ?? "",
      timeOfDay: h.timeOfDay ?? "",
      category: h.category,
      priority: h.priority,
      time: h.pendingTime || h.time,
      repeatType: h.repeatType,
      startDate: h.startDate ?? "",
      endDate: h.endDate ?? "",
      neverEnds: h.endDate == null,
      days: h.pendingDays || h.days || []
    };
    setForm(nextEdit);
    selectMobileView("create");
    requestAnimationFrame(() => {
      formPanelRef.current?.scrollIntoView({
        block: "start",
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      });
    });
  };


  const startDateLocked = Boolean(editingId && form.startDate && form.startDate <= today);
  const minEndDate = form.startDate && form.startDate >= today ? form.startDate : today;

  /* ─── Loading state ──────────────────────────────── */
  if (!readyRef.current && loadError) return <div role="alert" className="rounded-xl border border-rose-400/25 p-4 text-sm text-rose-200">{loadError} <button type="button" className="ml-2 underline" onClick={() => setRetry(value => value + 1)}>Retry habits</button></div>;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-stone-400">Loading habits...</p>
      </div>
    );
  }

  /* ─── Render ─────────────────────────────────────── */
  return (
    <div className="habits-create-view space-y-5" data-mobile-view={mobileView}>
      {loadError && <div role="alert" className="rounded-xl border border-rose-400/25 p-3 text-sm text-rose-200">{loadError} <button type="button" className="ml-2 underline" onClick={() => setRetry(value => value + 1)}>Retry habits</button></div>}
      {(error || undoError) && <div role="alert" className="rounded-xl border border-rose-400/25 p-3 text-sm text-rose-200">{error} {undoError}</div>}
      {writeBlocked && <div role="alert" className="rounded-xl border border-rose-400/25 p-3 text-sm text-rose-200">
        <p>The last change could not be confirmed or conflicted. Reload the list before another change. Reloading replaces this draft.</p>
        <button type="button" disabled={submitting} className="mt-2 underline" onClick={async () => {
          if (writeLock.current) return;
          setSubmitting(true);
          try { if (await reloadHabits.current?.()) { setWriteBlocked(false); setError(""); setUndoError(""); resetForm(); } }
          finally { if (live.current) setSubmitting(false); }
        }}>Reload habits (replaces draft)</button>
      </div>}
      <nav className="habit-create-mobile-nav" aria-label="Create habit sections" data-demo-allow="true">
        {CREATE_HABIT_VIEWS.map((view) => (
          <button
            key={view.id}
            type="button"
            onClick={() => selectMobileView(view.id)}
            aria-pressed={mobileView === view.id}
            className="habit-create-mobile-nav-button"
          >
            <span className="habit-create-mobile-nav-icon" aria-hidden="true">{view.icon}</span>
            <span>{view.label}</span>
            {view.id === "habits" ? <span className="habit-create-mobile-nav-count">{displayedHabits.length}</span> : null}
            {view.id === "logs" ? <span className="habit-create-mobile-nav-count">{allLogs.length}</span> : null}
          </button>
        ))}
      </nav>

      <div className="schedule-layout habits-create-layout">

        {/* ── Column 1 : Create Habit Form ── */}
        <div
          ref={formPanelRef}
          data-habit-create-panel="create"
          className="schedule-main habits-create-form journal-scroll rounded-[1.4rem] border border-amber-100/10 bg-gradient-to-b from-black/20 to-black/10 p-4 shadow-xl shadow-black/20 sm:rounded-2xl sm:p-5"
        >
          <h3 className="mb-4 text-sm font-semibold text-amber-200">{editingId ? `Edit ${singular}` : `New ${singular}`}</h3>
          <form onSubmit={handleSubmit}>
          <fieldset className="space-y-3 min-w-0" disabled={submitting || deletingHabitId != null || restoringLogId != null || isDemoMode}>

            {/* Title */}
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-stone-400">{`${singular} Name *`}</label>
              <input
                type="text"
                maxLength={180}
                value={form.title}
                onChange={(e) => setField("title", e.target.value)}
                placeholder="e.g. Morning Meditation"
                className="w-full rounded-lg border border-amber-100/15 bg-white/5 px-3 py-1.5 text-sm text-stone-100 outline-none transition focus:border-amber-300/35 focus:ring-1 focus:ring-amber-300/30"
              />
            </div>

            {/* Reason / Purpose */}
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-stone-400">Reason / Purpose</label>
              <textarea
                rows={2}
                maxLength={2500}
                value={form.reason}
                onChange={(e) => setField("reason", e.target.value)}
                placeholder="e.g. Build consistency and reduce stress"
                className="w-full resize-none rounded-lg border border-amber-100/15 bg-white/5 px-3 py-1.5 text-sm text-stone-100 outline-none transition focus:border-amber-300/35 focus:ring-1 focus:ring-amber-300/30"
              />
            </div>

            {/* Target Streak + Time of Day */}
            <div className="habit-form-row habit-form-row-target grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-stone-400">Target Streak (Days)</label>
                <input
                  type="number"
                  min={1}
                  value={form.targetStreak}
                  onChange={(e) => setField("targetStreak", e.target.value)}
                  placeholder="e.g. 30"
                  className="w-full rounded-lg border border-amber-100/15 bg-white/5 px-2 py-1.5 text-xs text-stone-100 outline-none transition focus:border-amber-300/35"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-stone-400">
                  Time of Day <span className="text-red-400">*</span>
                </label>
                <DashboardSelect
                  value={form.timeOfDay}
                  onChange={(e) => setField("timeOfDay", e.target.value)}
                  className={`w-full rounded-lg border bg-stone-900 px-2 py-1.5 text-xs text-stone-100 outline-none transition focus:border-amber-300/35 ${fieldErr("timeOfDay") ? "border-red-400/60" : "border-amber-100/15"}`}
                >
                  <option value="" disabled style={{ backgroundColor:"#1c1917", color:"#6b7280" }}>Select time of day</option>
                  {TIME_OF_DAY_OPTIONS.map((tod) => (
                    <option key={tod} value={tod} style={{ backgroundColor:"#1c1917", color:"#e7e5e4" }}>{tod}</option>
                  ))}
                </DashboardSelect>
              </div>
            </div>

            {/* Category + Priority */}
            <div className="habit-form-row grid grid-cols-1 items-start gap-4 md:grid-cols-2">
              {/* Category */}
              <div className="space-y-2">
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-stone-400">
                  Category <span className="text-red-400">*</span>
                </label>
                <div className="habit-category-controls flex flex-col gap-2 sm:flex-row sm:gap-1">
                  <div ref={catDropRef} className="relative min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => setIsCatOpen((p) => !p)}
                      className={`relative h-9 w-full rounded-lg border bg-stone-900 pl-2 pr-6 text-left text-[11px] text-stone-100 outline-none transition focus:border-amber-300/35 ${fieldErr("category") ? "border-red-400/60" : "border-amber-100/15"}`}
                    >
                      {form.category ? form.category : <span className="text-stone-500">Select category</span>}
                      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-stone-400">▾</span>
                    </button>
                    {isCatOpen && (
                      <div className="journal-scroll absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-amber-100/15 bg-stone-900 py-1 shadow-xl shadow-black/50">
                        {categoryOptions.map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => { setField("category", c); setIsCatOpen(false); }}
                            className={`w-full px-3 py-1.5 text-left text-[11px] transition hover:bg-amber-500/10 hover:text-amber-200 ${form.category === c ? "bg-amber-500/15 text-amber-200" : "text-stone-100"}`}
                          >
                            {c}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCustomCat((p) => !p)}
                    className="rounded-lg border border-amber-300/25 px-2 py-2 text-[11px] font-semibold text-amber-200 transition hover:border-amber-300/45 sm:py-1"
                  >
                    + Category
                  </button>
                </div>

                {showCustomCat && (
                  <>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <input
                        type="text"
                        value={customCat}
                        onChange={(e) => { setCustomCat(e.target.value); if (catError) setCatError(""); }}
                        onKeyDown={(e) => { if (e.key==="Enter") { e.preventDefault(); addCustomCategory(); } }}
                        placeholder="Custom category"
                        className="flex-1 rounded-lg border border-amber-100/15 bg-white/5 px-3 py-1.5 text-xs text-stone-100 outline-none transition focus:border-amber-300/35"
                      />
                      <button type="button" onClick={addCustomCategory}
                        className="rounded-lg border border-amber-400/35 bg-amber-400/10 px-3 py-2 text-xs font-semibold text-amber-100 transition hover:bg-amber-400/20 sm:py-1.5">
                        Add
                      </button>
                    </div>
                    <div className="rounded-lg border border-amber-100/10 bg-white/5 p-2">
                      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-stone-400">Manage Categories</p>
                      <div className="journal-scroll max-h-28 overflow-y-auto pr-1">
                        <div className="flex flex-wrap gap-1.5">
                          {categoryOptions.map((c) => {
                            const isDef = DEFAULT_CATEGORIES.includes(c);
                            return (
                              <span key={c} className="inline-flex items-center gap-1 rounded-full border border-amber-100/15 bg-black/20 px-2 py-0.5 text-[10px] text-stone-300">
                                <span>{c}</span>
                                {!isDef && (
                                  <button type="button" onClick={() => deleteCategory(c)}
                                    className="rounded border border-rose-400/30 bg-rose-500/10 px-1 text-[9px] font-semibold text-rose-300 transition hover:bg-rose-500/20">
                                    x
                                  </button>
                                )}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </>
                )}
                {catError && <p className="text-xs text-red-300">{catError}</p>}
                {catDeleteError && <p className="text-xs text-red-300">{catDeleteError}</p>}
              </div>

              {/* Priority */}
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-stone-400">
                  Priority <span className="text-red-400">*</span>
                </label>
                <div className={`habit-priority-options flex flex-wrap gap-1.5 rounded-lg p-0.5 transition ${fieldErr("priority") ? "ring-1 ring-red-400/50" : ""}`}>
                  {PRIORITIES.map((p) => (
                    <button key={p} type="button" onClick={() => setField("priority", p)}
                      className={`flex min-w-[84px] flex-1 items-center justify-center gap-1 whitespace-nowrap rounded-lg border px-2 py-1.5 text-[10px] font-semibold transition ${form.priority===p ? PRIORITY_STYLES[p] : "border-amber-100/15 bg-white/5 text-stone-300"}`}>
                      <span>{p}</span><span>{PRIORITY_EMOJI[p]}</span>
                    </button>
                  ))}
                </div>
                {fieldErr("priority") && <p className="mt-1 text-[10px] text-red-400">Select a priority.</p>}
              </div>
            </div>

            {/* Repeat + Time */}
            <div className="habit-form-row habit-form-row-time grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-stone-400">
                  Repeat <span className="text-red-400">*</span>
                </label>
                <DashboardSelect
                  value={form.repeatType}
                  onChange={(e) => setField("repeatType", e.target.value)}
                  disabled={Boolean(editingId)}
                  className={`w-full rounded-lg border bg-stone-900 px-2 py-1.5 text-xs text-stone-100 outline-none transition focus:border-amber-300/35 ${fieldErr("repeatType") ? "border-red-400/60" : "border-amber-100/15"} ${editingId ? "cursor-not-allowed opacity-60" : ""}`}
                >
                  <option value="" disabled style={{ backgroundColor:"#1c1917", color:"#6b7280" }}>Select repeat</option>
                  {REPEAT_TYPES.map((r) => (
                    <option key={r.value} value={r.value} style={{ backgroundColor:"#1c1917", color:"#e7e5e4" }}>{r.label}</option>
                  ))}
                </DashboardSelect>
                {editingId && <p className="mt-1 text-[10px] text-stone-500">Repeat type cannot be changed in edit mode.</p>}
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-stone-400">
                  Time <span className="text-red-400">*</span>
                </label>
<DashboardDateTimeInput today={today}
                  type="time"
                  value={form.time}
                  onChange={(e) => setField("time", e.target.value)}
                  className={`w-full rounded-lg border bg-white/5 px-2 py-1.5 text-xs text-stone-100 outline-none transition focus:border-amber-300/35 ${fieldErr("time") ? "border-red-400/60" : "border-amber-100/15"}`}
                />
              </div>
            </div>

            {/* Date fields */}
            {FIXED_DURATION[form.repeatType] ? (
              <div className="space-y-2 rounded-lg border border-amber-100/10 bg-white/5 p-2.5">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-stone-400">
                      Start Date {!startDateLocked && <span className="text-red-400">*</span>}
                      {startDateLocked && <span className="ml-1 text-stone-500">🔒 Locked</span>}
                    </label>
<DashboardDateTimeInput today={today} type="date" value={form.startDate}
                      readOnly={startDateLocked}
                      onChange={startDateLocked ? undefined : (e) => setField("startDate", e.target.value)}
                      className={`w-full rounded-lg border px-2 py-1 text-xs outline-none transition ${startDateLocked ? "cursor-not-allowed border-amber-100/10 bg-white/[0.03] text-stone-400" : "border-amber-100/15 bg-white/5 text-stone-100 focus:border-amber-300/35"}`}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-stone-400">End Date (Auto)</label>
<DashboardDateTimeInput today={today} type="date" value={fixedEndDate(FIXED_DURATION[form.repeatType], form.startDate)} readOnly
                      className="w-full cursor-not-allowed rounded-lg border border-amber-100/10 bg-white/[0.03] px-2 py-1 text-xs text-stone-400 outline-none" />
                  </div>
                </div>
                {startDateLocked
                  ? <p className="text-[10px] text-stone-500">Start date cannot be changed — this habit has already begun.</p>
                  : <p className="text-[10px] text-amber-300/60">End date is automatically set {FIXED_DURATION[form.repeatType]} days from the start date.</p>
                }
              </div>
            ) : form.repeatType ? (
              <div className="space-y-2 rounded-lg border border-amber-100/10 bg-white/5 p-2.5">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-stone-400">
                      Start
                      {startDateLocked && <span className="ml-1 text-stone-500">🔒 Locked</span>}
                    </label>
<DashboardDateTimeInput today={today} type="date" value={form.startDate}
                      readOnly={startDateLocked}
                      onChange={startDateLocked ? undefined : (e) => setField("startDate", e.target.value)}
                      className={`w-full rounded-lg border px-2 py-1 text-xs outline-none transition ${startDateLocked ? "cursor-not-allowed border-amber-100/10 bg-white/[0.03] text-stone-400" : "border-amber-100/15 bg-white/5 text-stone-100 focus:border-amber-300/35"}`}
                    />
                    {startDateLocked && <p className="mt-1 text-[10px] text-stone-500">Already started — cannot be changed.</p>}
                  </div>
                  {!form.neverEnds && (
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-stone-400">End</label>
<DashboardDateTimeInput today={today} type="date" value={form.endDate} min={minEndDate} onChange={(e) => setField("endDate", e.target.value)}
                        className="w-full rounded-lg border border-amber-100/15 bg-white/5 px-2 py-1 text-xs text-stone-100 outline-none transition focus:border-amber-300/35" />
                    </div>
                  )}
                </div>
                <label className="flex items-center gap-2 text-xs text-stone-300">
                  <input type="checkbox" checked={form.neverEnds} onChange={(e) => setField("neverEnds", e.target.checked)} className="accent-amber-400" />
                  Never End
                </label>
                {form.repeatType === "weekdays" && (
                  <div className="grid grid-cols-4 gap-1 sm:grid-cols-7">
                    {WEEK_DAYS.map((d) => (
                      <button key={d} type="button" onClick={() => toggleDay(d)}
                        className={`rounded border py-1 text-[10px] font-semibold transition ${form.days.includes(d) ? "border-amber-300/55 bg-amber-400/15 text-amber-100" : "border-amber-100/15 bg-white/5 text-stone-300"}`}>
                        {d}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : null}

            <button type="submit"
              disabled={submitting || writeBlocked}
              className="w-full rounded-lg border border-amber-400/35 bg-gradient-to-r from-amber-400/20 to-orange-400/15 px-4 py-2 text-xs font-semibold text-amber-200 transition hover:from-amber-400/25 hover:to-orange-400/20">
              {submitting ? "Saving..." : (editingId ? `Update ${singular}` : `Add ${singular}`)}
            </button>
            {editingId && (
              <button type="button"
                onClick={resetForm}
                className="dashboard-action-button w-full rounded-lg border border-amber-100/15 bg-white/5 px-4 py-2 text-xs font-semibold text-stone-300 transition hover:text-stone-100">
                Cancel Edit
              </button>
            )}
          </fieldset>
          </form>
        </div>

        {/* ── Column 2 : All Habits ── */}
        <section data-habit-create-panel="habits" className="schedule-all-tasks habits-create-list rounded-[1.4rem] border border-amber-100/10 bg-gradient-to-b from-black/20 to-black/10 p-4 shadow-xl shadow-black/20 sm:rounded-2xl sm:p-5">
          <div className="habit-list-heading mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-amber-200">{`All ${plural}`}</p>
              <p className="mt-0.5 text-xs text-stone-400">{`Every scheduled ${lowerSingular} at a glance.`}</p>
              <div className="dashboard-filter-controls mt-2 flex flex-wrap items-center gap-1.5">
                {["active", "archive"].map((view) => (
                  <button
                    key={view}
                    type="button"
                    onClick={() => setHabitsView(view)}
                    aria-pressed={habitsView === view}
                    className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize transition ${
                      habitsView === view
                        ? "border-amber-300/45 bg-amber-500/15 text-amber-100"
                        : "border-amber-100/10 bg-white/5 text-stone-400 hover:border-amber-300/35 hover:text-amber-200"
                    }`}
                  >
                    {view}
                  </button>
                ))}
              </div>
            </div>
            <span className="rounded-full border border-amber-100/10 bg-white/5 px-3 py-1 text-xs text-stone-300">
              {displayedHabits.length} total
            </span>
          </div>

          <div className="journal-scroll habit-list-body flex-1 space-y-2 overflow-y-auto pr-1">
            {displayedHabits.length === 0 ? (
              <p className="mt-6 text-center text-xs text-stone-500">
                {habitsView === "active"
                  ? `No active ${lowerPlural} yet. Create one to get started.`
                  : `No archived ${lowerPlural} yet.`}
              </p>
            ) : (
              displayedHabits.map((h, i) => {
                const isDeletedHabit = Boolean(h.deletedAt && h.archivedReason === "deleted");
                const isEndedHabit = !isDeletedHabit && (
                  h.archivedReason === "ended" ||
                  Boolean(h.endDate && h.endDate < today)
                );

                return (
                <HabitCard
                  key={h.id}
                  className={`habit-list-card rounded-xl border bg-white/5 p-3 ${editingId === h.id ? "border-amber-300/40 ring-1 ring-amber-300/20" : "border-amber-100/10"}`}
                  {...(lowMotion ? {} : {
                    initial: { opacity: 0, y: 8 },
                    animate: { opacity: 1, y: 0 },
                    transition: { delay: i * 0.05, duration: 0.22 },
                    whileHover: { y: -2, boxShadow: "0 8px 20px rgba(0,0,0,0.35)", borderColor: "rgba(251,191,36,0.2)" }
                  })}
                >
                    <>
                      <div className="habit-item-header flex flex-wrap items-start justify-between gap-2">
                        <div className="flex min-w-0 flex-1 items-center gap-2">
                          <p className="habit-item-title min-w-0 flex-1 text-sm font-semibold text-stone-100">{h.title}</p>
                          {editingId === h.id && (
                            <span className="dashboard-card-status" data-tone="warning">
                              Editing
                            </span>
                          )}
                        </div>
                        <div className="habit-item-controls flex flex-col items-start gap-2 sm:items-end">
                          <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
                            {isArchiveView && (
                              <span className="dashboard-card-status" data-tone={isDeletedHabit || isEndedHabit ? "danger" : undefined}>
                                {isDeletedHabit ? "Deleted" : isEndedHabit ? "Ended" : "Archived"}
                              </span>
                            )}
                            <span className={`dashboard-card-priority ${PRIORITY_STYLES[h.priority]}`}>
                              {h.priority}
                            </span>
                          </div>
                        </div>
                      </div>
                      {(h.reason || h.description) && <p className="habit-item-description mt-1 text-xs text-stone-400">{h.reason || h.description}</p>}
                      <div className="habit-item-details mt-2.5 flex flex-wrap items-center gap-1.5 text-[11px] text-stone-300">
                        {h.isImportant && (
                          <span className="rounded-full border border-amber-300/35 bg-amber-500/15 px-2 py-0.5 font-semibold text-amber-200">
                            Important
                          </span>
                        )}
                        {h.targetStreak && (
                          <span className="rounded-full border border-violet-300/25 bg-violet-500/10 px-2 py-0.5 text-violet-100">
                            Target {h.targetStreak} days
                          </span>
                        )}
                        {h.timeOfDay && (
                          <span className="rounded-full border border-cyan-300/25 bg-cyan-500/10 px-2 py-0.5 text-cyan-100">
                            {h.timeOfDay}
                          </span>
                        )}
                        <span className="rounded-full border border-amber-100/10 bg-black/20 px-2 py-0.5">{h.category}</span>
                        <span className="rounded-full border border-amber-100/10 bg-black/20 px-2 py-0.5">
                          {REPEAT_TYPES.find((r) => r.value===h.repeatType)?.label ?? h.repeatType}
                        </span>
                        <span className="rounded-full border border-amber-100/10 bg-black/20 px-2 py-0.5">{fmtTime(habitTimeOnDay(h, today, timezone))}</span>
                        {h.pendingTime && toDateStr(h.timeChangeEffectiveFrom) > today && <span className="text-amber-200">New time {fmtTime(h.pendingTime)} from {toDateStr(h.timeChangeEffectiveFrom)}</span>}
                        <span className="rounded-full border border-amber-100/10 bg-black/20 px-2 py-0.5">
                          {h.startDate}
                        </span>
                        <span className={`rounded-full border px-2 py-0.5 font-semibold ${h.endDate ? "border-rose-400/25 bg-rose-500/10 text-rose-200" : "border-emerald-400/25 bg-emerald-500/10 text-emerald-200"}`}>
                          {h.endDate ? `Ends ${h.endDate}` : "Never Ends"}
                        </span>
                        {h.pendingDays && toDateStr(h.daysChangeEffectiveFrom) > today && <span className="text-amber-200">New days {h.pendingDays.join(", ")} from {toDateStr(h.daysChangeEffectiveFrom)}</span>}
                        {h.repeatType==="weekdays" && habitDaysOnDay(h, today, timezone).map((d) => (
                          <span key={d} className="rounded-full border border-amber-300/25 bg-amber-500/10 px-2 py-0.5 font-semibold text-amber-200">
                            {DAY_SHORT[d]}
                          </span>
                        ))}
                      </div>
                      {(!isArchiveView || (h.deletedAt && getDeleteUndoMeta(h.deletedAt).canUndoDelete)) && (
                        <div className="habit-item-actions mt-2 flex flex-wrap items-center justify-end gap-1.5">
                          {!isArchiveView ? (
                            <>
                              <button type="button" onClick={() => startEdit(h)} disabled={writeBlocked || submitting || deletingHabitId != null || restoringLogId != null || isDemoMode}
                                className="dashboard-edit-delete-action dashboard-card-action" data-tone="warning">
                                Edit
                              </button>
                              <button type="button" onClick={() => handleDelete(h.id)}
                                disabled={writeBlocked || submitting || deletingHabitId != null || restoringLogId != null || isDemoMode}
                                className="dashboard-edit-delete-action dashboard-card-action" data-tone="danger">
                                {deletingHabitId === h.id ? "Deleting..." : "Delete"}
                              </button>
                            </>
                          ) : (
                            <button type="button" className="dashboard-card-action" data-tone="warning"
                              disabled={writeBlocked || submitting || deletingHabitId != null || restoringLogId != null || isDemoMode}
                              onClick={() => handleUndoDelete(h.id + "-archive", h)}>Restore</button>
                          )}
                        </div>
                      )}
                    </>
                </HabitCard>
                );
              })
            )}
          </div>
        </section>

        {/* ── Column 3 : Calendar + Habit Log ── */}
        <aside className="schedule-sidebar habits-create-sidebar">
          <div className="habits-create-sidebar-card flex flex-col gap-0 rounded-[1.4rem] border border-amber-100/10 bg-gradient-to-b from-black/20 to-black/10 p-4 shadow-xl shadow-black/20 sm:rounded-2xl">

            {/* Calendar */}
            <section data-habit-create-panel="calendar" className="habits-create-calendar shrink-0" data-demo-allow="true">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold tracking-wide text-amber-200">Calendar</h3>
                <div className="flex items-center gap-1">
                  <button type="button"
                    aria-label="Previous calendar month"
                    onClick={() => { dismissCalendarPreview(); setViewMonth((p) => new Date(p.getFullYear(), p.getMonth()-1, 1)); }}
                    className="rounded border border-amber-100/15 px-1.5 py-0.5 text-xs text-stone-300 transition hover:border-amber-300/35 hover:text-amber-200">
                    ‹
                  </button>
                  <span className="text-xs font-medium text-stone-200">{monthTitle}</span>
                  <button type="button"
                    aria-label="Next calendar month"
                    onClick={() => { dismissCalendarPreview(); setViewMonth((p) => new Date(p.getFullYear(), p.getMonth()+1, 1)); }}
                    className="rounded border border-amber-100/15 px-1.5 py-0.5 text-xs text-stone-300 transition hover:border-amber-300/35 hover:text-amber-200">
                    ›
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-0.5 text-center text-xs text-stone-400">
                {WEEK_DAYS.map((d) => <div key={d} className="py-1 text-[10px] font-semibold">{d}</div>)}
                {calendarCells.map((cell, idx) => {
                  if (!cell) return <div key={`e-${idx}`} className="h-8 rounded" />;
                  const iso = toISO(cell);
                  const count = displayedHabits.reduce((acc, h) => isHabitOnDate(h, iso) ? acc+1 : acc, 0);
                  const isToday = iso === today;
                  const isSel = iso === selectedDate;
                  return (
                    <button key={iso} type="button"
                      onClick={(event) => {
                        setSelectedDate(iso);
                        if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) showCalendarPreview(event, iso, "tap");
                      }}
                      onPointerEnter={(event) => {
                        if (event.pointerType !== "touch" && window.matchMedia("(hover: hover) and (pointer: fine)").matches) showCalendarPreview(event, iso, "hover");
                      }}
                      onPointerLeave={() => setCalendarPreview((preview) => preview?.iso === iso && preview.source === "hover" ? null : preview)}
                      onFocus={(event) => showCalendarPreview(event, iso, "focus")}
                      onBlur={() => setCalendarPreview((preview) => preview?.iso === iso && preview.source !== "tap" ? null : preview)}
                      aria-label={`${iso}: ${count} ${lowerSingular}${count === 1 ? "" : "s"} scheduled`}
                      aria-describedby={calendarPreview?.iso === iso ? calendarTooltipId : undefined}
                      aria-current={isToday ? "date" : undefined}
                      aria-pressed={isSel}
                      className={`relative h-8 rounded text-xs transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-amber-300 ${isSel ? "border border-amber-300/60 bg-amber-400/15 text-amber-100" : "border border-amber-100/10 bg-white/5 text-stone-200 hover:border-amber-300/35 hover:bg-amber-400/10"} ${isToday ? "ring-1 ring-amber-500/40" : ""}`}>
                      {cell.getDate()}
                      {count > 0 && <span className="absolute bottom-0.5 right-0.5 h-1.5 w-1.5 rounded-full bg-amber-400/90" />}
                    </button>
                  );
                })}
              </div>

              {calendarPreview && (
                <HabitCalendarTooltip
                  id={calendarTooltipId}
                  preview={calendarPreview}
                  habits={previewHabits}
                  singular={lowerSingular}
                  onDismiss={dismissCalendarPreview}
                />
              )}
            </section>

            <div className="habits-create-divider my-3 shrink-0 border-t border-amber-100/10" />

            {/* Habit Logs */}
            <section data-habit-create-panel="logs" className="habits-create-logs flex min-h-0 flex-1 flex-col">
              <p className="mb-2 shrink-0 text-sm font-semibold tracking-wide text-amber-200">{`${singular} Logs`}</p>
              {allLogs.length === 0 ? (
                <p className="text-sm text-stone-400">{`No ${lowerSingular} logs yet.`}</p>
              ) : (
                <div className="journal-scroll min-h-0 flex-1 space-y-1.5 overflow-x-hidden overflow-y-auto scroll-smooth pr-1">
                  {allLogs.map((log) => {
                    const runtimeUndoMeta = getDeleteUndoMeta(log.deletedAt || log.deletedItem?.deletedAt);
                    const canShowUndo = undoEligibleLogIds.has(log.id);
                    return (
                    <div key={log.id} className={`habit-log-row flex flex-col items-start gap-2 rounded-md border px-2 py-1.5 text-[11px] sm:flex-row sm:items-center sm:justify-between ${
                      log.action==="deleted" ? "border-rose-400/20 bg-rose-500/5 text-stone-300"
                      : log.action==="edited" ? "border-amber-300/20 bg-amber-500/5 text-stone-300"
                      : log.action==="ended" ? "border-blue-400/20 bg-blue-500/5 text-stone-300"
                      : log.action==="restored" ? "border-emerald-400/20 bg-emerald-500/5 text-stone-300"
                      : "border-amber-100/10 bg-white/5 text-stone-200"
                    }`}>
                      <p className="min-w-0 flex-1">
                        <span className={`font-semibold ${
                          log.action==="deleted" ? "text-rose-300"
                          : log.action==="edited" ? "text-amber-200"
                          : log.action==="ended" ? "text-blue-300"
                          : log.action==="restored" ? "text-emerald-300"
                          : "text-emerald-300"
                        }`}>
                          {log.action==="deleted" ? "Deleted" : log.action==="edited" ? "Edited" : log.action==="ended" ? "Ended" : log.action==="restored" ? "Restored" : "Created"}:
                        </span>{" "}
                        <span className="break-all font-semibold text-stone-100">{log.title}</span> on {log.date} at {fmtTime(log.time)}
                      </p>
                      {canShowUndo && (
                        <div className="flex flex-wrap items-center gap-2 self-stretch sm:self-auto">
                          <button
                            type="button"
                            onClick={() => handleUndoDelete(log.id)}
                            disabled={writeBlocked || restoringLogId === log.id || deletingHabitId != null}
                            className="shrink-0 rounded border border-rose-400/30 bg-rose-500/10 px-1.5 py-0.5 text-[11px] font-semibold text-rose-300 transition hover:bg-rose-500/20"
                            title="Undo delete (available for 48 hours)"
                          >
                            {restoringLogId === log.id ? "..." : "↺"}
                          </button>
                          <span className="shrink-0 text-[10px] text-amber-200/80">
                            {formatRemainingUndo(runtimeUndoMeta.deleteUndoRemainingMs)} left
                          </span>
                        </div>
                      )}
                    </div>
                    );
                  })}
                </div>
              )}
            </section>

          </div>
        </aside>

      </div>
      {toast && (
        <div className={`fixed bottom-5 right-5 z-[70] rounded-lg border px-3 py-2 text-xs font-semibold shadow-xl ${
          toast.tone === "warning"
            ? "border-amber-300/40 bg-amber-500/15 text-amber-100"
            : toast.tone === "danger"
            ? "border-rose-300/40 bg-rose-500/15 text-rose-100"
            : "border-emerald-300/40 bg-emerald-500/15 text-emerald-100"
        }`}>
          {toast.message}
        </div>
      )}
      {confirmState.open && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-amber-100/20 bg-stone-950/95 p-5 shadow-2xl shadow-black/60">
            <p className="text-base font-semibold text-amber-100">{confirmState.title}</p>
            <p className="mt-2 text-sm text-stone-300">{confirmState.message}</p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => closeConfirm(false)}
                className="rounded-lg border border-amber-100/20 bg-white/5 px-3 py-1.5 text-xs font-semibold text-stone-300 transition hover:text-stone-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => closeConfirm(true)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                  confirmState.tone === "danger"
                    ? "border-rose-300/45 bg-rose-500/15 text-rose-100 hover:bg-rose-500/25"
                    : confirmState.tone === "success"
                    ? "border-emerald-300/45 bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/25"
                    : "border-amber-300/45 bg-amber-500/15 text-amber-100 hover:bg-amber-500/25"
                }`}
              >
                {confirmState.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
