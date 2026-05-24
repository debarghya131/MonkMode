import { motion as Motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import api from "../../api/axios";
import useAuth from "../../hooks/useAuth";

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
const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_SHORT = { Sun: "Su", Mon: "M", Tue: "T", Wed: "W", Thu: "Th", Fri: "F", Sat: "Sa" };

const DEFAULT_CATEGORIES = [
  "Mindfulness", "Fitness", "Learning", "Discipline", "Health", "Productivity", "Personal",
];
const CATEGORY_STORAGE_KEY = "monkmode.habit.custom_categories.v1";

const toISO = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
const parseISO = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const inRange = (iso, start, end) => {
  const t = parseISO(iso), s = parseISO(start);
  if (t < s) return false;
  return end ? t <= parseISO(end) : true;
};
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
  const start = parseISO(startISO);
  const end = parseISO(endISO);
  return Math.floor((end - start) / msPerDay) + 1;
};
const FIXED_DURATION = { "7days": 7, "21days": 21 };
const isHabitOnDate = (h, iso) => {
  if (!inRange(iso, h.startDate, h.endDate)) return false;
  const wd = parseISO(iso).getDay();
  if (h.repeatType === "daily" || h.repeatType === "7days" || h.repeatType === "21days") return true;
  if (h.repeatType === "weekend") return wd === 0 || wd === 6;
  if (h.repeatType === "weekdays") return h.days.includes(WEEK_DAYS[wd]);
  return false;
};
const hasOccurrenceInRange = (repeatType, startISO, endISO, days = []) => {
  if (!startISO || !endISO) return true;
  const start = parseISO(startISO);
  const end = parseISO(endISO);
  const rangeDays = Math.floor((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1;
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
const fmtTime = (t) => {
  if (!t) return "--";
  const [h, m] = t.split(":").map(Number);
  const d = new Date(); d.setHours(h, m);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
};

const PANEL_H = "650px";
const DELETE_UNDO_WINDOW_MS = 48 * 60 * 60 * 1000;
const toLogAtISO = (dateStr, timeStr = "00:00") => {
  if (!dateStr) return null;
  const d = new Date(`${dateStr}T${timeStr}:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
};

const getLocalHHMM = (iso) => {
  if (!iso) return "00:00";
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
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
const toDateStr = (d) => {
  if (!d) return null;
  if (typeof d === "string") return d.length > 10 ? d.slice(0, 10) : d;
  return toISO(new Date(d));
};

const normalizeHabit = (h, todayStr) => ({
  ...h,
  id: h._id?.toString() ?? h.id,
  reason: h.note ?? h.reason ?? "",
  startDate: toDateStr(h.startDate) || toDateStr(h.createdAt) || todayStr,
  endDate: toDateStr(h.endDate),
  repeatType: h.repeatType ?? h.frequency ?? "daily",
  timeOfDay: h.timeOfDay ?? "",
  days: h.days ?? [],
  isImportant: h.isImportant ?? false,
  canUndoDelete: Boolean(h.canUndoDelete),
  deleteUndoExpiresAt: h.deleteUndoExpiresAt ?? null,
  deleteUndoRemainingMs: Number.isFinite(Number(h.deleteUndoRemainingMs)) ? Number(h.deleteUndoRemainingMs) : 0,
});

/* ─── Demo data ──────────────────────────────────────── */
const buildDemoHabits = (today) => [
  {
    id: "demo-habit-1",
    title: "DSA",
    reason: "Build problem-solving consistency.",
    isImportant: true,
    targetStreak: 21,
    timeOfDay: "Morning",
    category: "Fitness",
    priority: "High",
    repeatType: "21days",
    time: "11:01",
    startDate: today,
    endDate: fixedEndDate(21, today),
  },
  {
    id: "demo-habit-2",
    title: "Evening Walk",
    reason: "Improve energy and sleep quality.",
    isImportant: false,
    targetStreak: 14,
    timeOfDay: "Evening",
    category: "Health",
    priority: "Medium",
    repeatType: "daily",
    time: "19:00",
    startDate: today,
    endDate: null,
  },
  {
    id: "demo-habit-3-archived",
    title: "Cold Shower",
    reason: "Build resilience and discipline.",
    isImportant: false,
    targetStreak: 7,
    timeOfDay: "Morning",
    category: "Discipline",
    priority: "Low",
    repeatType: "7days",
    time: "06:10",
    startDate: addDays(-10, today),
    endDate: addDays(-3, today),
  },
];

const buildDemoLogs = (today) => [
  { id: "demo-habit-log-1", title: "DSA", date: today, time: "11:01" },
  { id: "demo-habit-log-2", title: "Evening Walk", date: today, time: "19:00", action: "edited" },
  { id: "demo-habit-log-3", title: "Meditation", date: today, time: "06:45", action: "deleted" },
];

const loadStoredCategories = () => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CATEGORY_STORAGE_KEY);
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
  const today = useMemo(() => toISO(new Date()), []);
  const { isDemoMode } = useAuth();
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
    const stored = loadStoredCategories();
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
    if (typeof window === "undefined") return;
    const customOnly = categoryOptions.filter(
      (category) => !DEFAULT_CATEGORIES.some((defaultCat) => defaultCat.toLowerCase() === category.toLowerCase())
    );
    window.localStorage.setItem(CATEGORY_STORAGE_KEY, JSON.stringify(customOnly));
  }, [categoryOptions]);

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
  const [habits, setHabits] = useState(() => isDemoMode ? buildDemoHabits(toISO(new Date())) : []);
  const [habitLogs, setHabitLogs] = useState(() => isDemoMode ? buildDemoLogs(toISO(new Date())) : []);
  const [loading, setLoading] = useState(!isDemoMode);
  const [editingId, setEditingId] = useState(null);

  /* fetch habits for real users */
  useEffect(() => {
    if (isDemoMode) return;
    let cancelled = false;
    const fetchHabits = async () => {
      try {
        const { data } = await api.get("/habits?view=all");
        if (cancelled) return;
        const todayStr = toISO(new Date());
        const normalized = data.map((h) => normalizeHabit(h, todayStr));
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
            const time = getLocalHHMM(at);
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
      } catch {
        // silently fail — leave state empty
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchHabits();
    return () => { cancelled = true; };
  }, [isDemoMode]);

  /* calendar */
  const [viewMonth, setViewMonth] = useState(() => {
    const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(today);

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

  /* ── derived ── */
  const activeHabits = useMemo(() => {
    const active = [];
    habits.forEach((h) => {
      const isDeleted = Boolean(h.deletedAt && h.archivedReason === "deleted");
      const isEnded = h.archivedReason === "ended" || (h.endDate && h.endDate <= today);

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
      h.deletedAt || h.archivedReason === "ended" || (h.endDate && h.endDate <= today)
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
    setCategoryOptions((p) => p.filter((c) => c.toLowerCase() !== name.toLowerCase()));
    setCatDeleteError("");
    setForm((p) => ({ ...p, category: p.category.toLowerCase() === name.toLowerCase() ? "" : p.category }));
  };

  const validate = () => {
    if (!form.title.trim()) return "Title is required.";
    if (form.targetStreak && Number(form.targetStreak) < 1) return "Target streak must be at least 1 day.";
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
    if (!form.neverEnds && !form.endDate) return "End date is required or select Never.";
    if (!form.neverEnds && form.endDate <= today) return "End date must be after today.";
    if (!form.neverEnds && form.endDate <= form.startDate) return "End date must be after the start date.";
    if (form.repeatType === "weekdays" && form.days.length === 0) return "Select at least one day.";
    if (!form.neverEnds && !hasOccurrenceInRange(form.repeatType, form.startDate, form.endDate, form.days)) {
      if (form.repeatType === "weekend") return "Selected range has no weekend day. Choose a later end date.";
      if (form.repeatType === "weekdays") return "Selected range has no chosen weekday. Adjust start/end date.";
    }
    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setTouched({ title:true, timeOfDay:true, category:true, priority:true, repeatType:true, time:true, startDate:true });
    const err = validate();
    if (err) { setError(err); return; }
    setSubmitting(true);

    if (editingId) {
      const editId = editingId;
      const previousHabit = habits.find((h) => h.id === editId);
      if (!previousHabit) {
        setSubmitting(false);
        return;
      }

      const fixedDays2 = FIXED_DURATION[form.repeatType];
      const hasStarted = Boolean(previousHabit.startDate && previousHabit.startDate <= today);
      const timeChanged = String(previousHabit.time || "") !== String(form.time || "");
      const previousEffectiveDays = Array.isArray(previousHabit.pendingDays) ? previousHabit.pendingDays : (previousHabit.days || []);
      const nextDaysForEdit = form.repeatType === "weekdays" ? (form.days || []) : [];
      const daysChanged = form.repeatType === "weekdays"
        && JSON.stringify(previousEffectiveDays) !== JSON.stringify(nextDaysForEdit);
      const shouldDeferTimeLocally = !isDemoMode && hasStarted && timeChanged;
      const shouldDeferDaysLocally = !isDemoMode && hasStarted && daysChanged && form.repeatType === "weekdays";
      const updated = {
        title: form.title.trim(), reason: form.reason.trim(),
        targetStreak: form.targetStreak ? Number(form.targetStreak) : null,
        timeOfDay: form.timeOfDay, category: form.category, priority: form.priority,
        time: form.time, repeatType: form.repeatType,
        ...(fixedDays2
          ? { startDate: form.startDate, endDate: fixedEndDate(fixedDays2, form.startDate) }
          : { startDate: form.startDate, endDate: form.neverEnds ? null : form.endDate,
              ...(form.repeatType === "weekdays" ? { days: form.days } : {}) }),
      };
      const optimisticUpdated = shouldDeferTimeLocally
        ? {
            ...updated,
            time: previousHabit.time,
            pendingTime: form.time,
            timeChangeEffectiveFrom: new Date(Date.now() + (24 * 60 * 60 * 1000)).toISOString()
          }
        : updated;
      const optimisticWithDeferredDays = shouldDeferDaysLocally
        ? {
            ...optimisticUpdated,
            days: previousHabit.days || [],
            pendingDays: [...nextDaysForEdit],
            daysChangeEffectiveFrom: new Date(Date.now() + (24 * 60 * 60 * 1000)).toISOString()
          }
        : optimisticUpdated;

      // Optimistic update
      setHabits((p) => p.map((h) => h.id === editId ? { ...h, ...optimisticWithDeferredDays } : h));
      const editLoggedAt = new Date();
      const optimisticLogId = `${editId}-edit-${Date.now()}`;
      setHabitLogs((p) => [{
        id: optimisticLogId,
        title:form.title.trim(),
        date: toDateStr(editLoggedAt) || today,
        time: getLocalHHMM(editLoggedAt),
        action:"edited",
        logAt: editLoggedAt.toISOString()
      }, ...p]);
      setEditingId(null);
      setError(""); setTouched({});
      setForm((p) => ({ ...p, title:"", reason:"", targetStreak:"", timeOfDay:"", category:"", priority:"", repeatType:"", time:"" }));

      if (!isDemoMode) {
        try {
          const payload = {
            title: form.title.trim(),
            note: form.reason.trim(),
            targetStreak: form.targetStreak ? Number(form.targetStreak) : null,
            timeOfDay: form.timeOfDay,
            category: form.category,
            priority: form.priority,
            time: form.time,
            repeatType: form.repeatType,
            startDate: form.startDate || null,
            endDate: fixedDays2
              ? fixedEndDate(fixedDays2, form.startDate)
              : (form.neverEnds ? null : (form.endDate || null)),
            days: form.repeatType === "weekdays" ? form.days : [],
          };
          const { data } = await api.patch(`/habits/${editId}`, payload);
          const todayStr = toISO(new Date());
          const normalized = normalizeHabit(data, todayStr);
          const splitApplied = Boolean(data?.splitApplied) || (normalized.id && normalized.id !== editId);
          const splitAtISO = data?.splitAt || new Date().toISOString();
          if (splitApplied) {
            const splitDate = toDateStr(splitAtISO) || todayStr;
            setHabits((p) => {
              const withoutCurrent = p.filter((h) => h.id !== editId && h.id !== normalized.id);
              const endedHabit = {
                ...previousHabit,
                endDate: splitDate,
                archivedReason: "ended",
                deletedAt: null,
                canUndoDelete: false,
                deleteUndoExpiresAt: null,
                deleteUndoRemainingMs: 0
              };
              return [normalized, endedHabit, ...withoutCurrent];
            });
            setHabitLogs((p) => [{
              id: `${editId}-ended-${Date.now()}`,
              title: previousHabit.title,
              date: splitDate,
              time: getLocalHHMM(splitAtISO),
              action: "ended",
              logAt: splitAtISO
            }, ...p]);
            showToast(`${singular} updated. Changes will continue from tomorrow.`);
          } else {
            setHabits((p) => p.map((h) => {
              if (h.id !== editId) return h;
              if (data?.reflectFromNextDay) {
                const withDeferredTime = {
                  ...h,
                  ...normalized,
                  pendingTime: form.time,
                  timeChangeEffectiveFrom: data?.reflectsFromDate || normalized.timeChangeEffectiveFrom || h.timeChangeEffectiveFrom
                };
                if (data?.reflectDaysFromNextDay) {
                  return {
                    ...withDeferredTime,
                    pendingDays: [...nextDaysForEdit],
                    daysChangeEffectiveFrom: data?.reflectsDaysFromDate || normalized.daysChangeEffectiveFrom || h.daysChangeEffectiveFrom
                  };
                }
                return withDeferredTime;
              }
              if (data?.reflectDaysFromNextDay) {
                return {
                  ...h,
                  ...normalized,
                  pendingDays: [...nextDaysForEdit],
                  daysChangeEffectiveFrom: data?.reflectsDaysFromDate || normalized.daysChangeEffectiveFrom || h.daysChangeEffectiveFrom
                };
              }
              return {
                ...h,
                ...normalized,
                pendingTime: null,
                timeChangeEffectiveFrom: null,
                pendingDays: null,
                daysChangeEffectiveFrom: null
              };
            }));
            if (data?.reflectFromNextDay && data?.reflectDaysFromNextDay) {
              showToast(`${singular} updated. Time and custom days will reflect from next day.`);
            } else if (data?.reflectFromNextDay) {
              showToast(`${singular} updated. Time will reflect from next day.`);
            } else if (data?.reflectDaysFromNextDay) {
              showToast(`${singular} updated. Custom days will reflect from next day.`);
            } else {
              showToast(`${singular} updated.`);
            }
          }
          emitHabitsUpdated();
        } catch (err) {
          const backendMessage = err?.response?.data?.message;
          setHabits((p) => p.map((h) => h.id === editId ? previousHabit : h));
          setHabitLogs((p) => p.filter((log) => log.id !== optimisticLogId));
          setError(backendMessage || `Could not update "${previousHabit.title}". Please try again.`);
          setTimeout(() => setError(""), 4000);
        }
      }
      if (isDemoMode) {
        emitHabitsUpdated();
        showToast(`${singular} updated.`);
      }
      setSubmitting(false);
      return;
    }

    const fixedDays = FIXED_DURATION[form.repeatType];
    const base = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      title: form.title.trim(),
      reason: form.reason.trim(),
      isImportant: false,
      targetStreak: form.targetStreak ? Number(form.targetStreak) : null,
      timeOfDay: form.timeOfDay,
      category: form.category, priority: form.priority,
      repeatType: form.repeatType, time: form.time,
    };
    const habit = fixedDays
      ? { ...base, startDate: form.startDate, endDate: fixedEndDate(fixedDays, form.startDate) }
      : { ...base, startDate: form.startDate, endDate: form.neverEnds ? null : form.endDate,
          ...(form.repeatType === "weekdays" ? { days: form.days } : {}) };

    if (isDemoMode) {
      setHabits((p) => [habit, ...p]);
      const createdLoggedAt = new Date();
      const logDate = toDateStr(createdLoggedAt) || today;
      setHabitLogs((p) => [{
        id: `${habit.id}-log`,
        title: habit.title,
        date: logDate,
        time: getLocalHHMM(createdLoggedAt),
        action: "created",
        logAt: createdLoggedAt.toISOString()
      }, ...p]);
      setSelectedDate(habit.startDate);
      setViewMonth(new Date(parseISO(habit.startDate).getFullYear(), parseISO(habit.startDate).getMonth(), 1));
      emitHabitsUpdated();
      showToast(`${singular} created.`);
      setError("");
      setTouched({});
      setForm((p) => ({
        ...p,
        title:"",
        reason:"",
        targetStreak:"",
        timeOfDay:"",
        category:"",
        priority:"",
        repeatType:"",
        time:"",
      }));
    } else {
      // API create
      try {
        const payload = {
          title: form.title.trim(),
          note: form.reason.trim(),
          targetStreak: form.targetStreak ? Number(form.targetStreak) : 21,
          timeOfDay: form.timeOfDay,
          category: form.category,
          priority: form.priority,
          time: form.time,
          repeatType: form.repeatType,
          startDate: form.startDate || null,
          endDate: fixedDays
            ? fixedEndDate(fixedDays, form.startDate)
            : (form.neverEnds ? null : (form.endDate || null)),
          days: form.repeatType === "weekdays" ? form.days : [],
        };
        const { data } = await api.post("/habits", payload);
        const todayStr = toISO(new Date());
        const normalized = normalizeHabit(data, todayStr);
        setHabits((p) => [normalized, ...p]);
        const createdLoggedAt = new Date(data?.createdAt || new Date());
        const logDate = toDateStr(createdLoggedAt) || todayStr;
        setHabitLogs((p) => [{
          id: `${normalized.id}-log`,
          title: normalized.title,
          date: logDate,
          time: getLocalHHMM(createdLoggedAt),
          action: "created",
          logAt: createdLoggedAt.toISOString()
        }, ...p]);
        const selectedLogDate = normalized.startDate || todayStr;
        setSelectedDate(selectedLogDate);
        setViewMonth(new Date(parseISO(selectedLogDate).getFullYear(), parseISO(selectedLogDate).getMonth(), 1));
        emitHabitsUpdated();
        showToast(`${singular} created.`);
        setError("");
        setTouched({});
        setForm((p) => ({
          ...p,
          title:"",
          reason:"",
          targetStreak:"",
          timeOfDay:"",
          category:"",
          priority:"",
          repeatType:"",
          time:"",
        }));
      } catch {
        setError(`Could not create ${lowerSingular}. Please try again.`);
        setTimeout(() => setError(""), 4000);
      }
    }
    setSubmitting(false);
  };

  const handleDelete = async (id) => {
    const h = habits.find((x) => x.id === id);
    if (!h) return;
    if (deletingHabitId || restoringLogId) return;
    const confirmedDelete = await openConfirm({
      title: `Delete "${h.title}"?`,
      message: "This will remove the habit from active lists and update today/consistency/heatmap totals from today onward. You can undo within 48 hours.",
      confirmLabel: "Delete Habit",
      tone: "danger"
    });
    if (!confirmedDelete) return;
    setDeletingHabitId(id);

    const deletedAtISO = new Date().toISOString();
    const localUndoMeta = getDeleteUndoMeta(deletedAtISO);
    const deletedItem = {
      ...h,
      deletedAt: deletedAtISO,
      archivedReason: "deleted",
      canUndoDelete: localUndoMeta.canUndoDelete,
      deleteUndoExpiresAt: localUndoMeta.deleteUndoExpiresAt
    };
    const logId = `${id}-del-${Date.now()}`;

    setHabits((p) => p.filter((x) => x.id !== id));
    setHabitLogs((p) => [{
      id: logId,
      title: h.title,
      date: toDateStr(deletedAtISO) || today,
      time: getLocalHHMM(deletedAtISO),
      action: "deleted",
      deletedAt: deletedAtISO,
      canUndoDelete: localUndoMeta.canUndoDelete,
      deleteUndoExpiresAt: localUndoMeta.deleteUndoExpiresAt,
      logAt: deletedAtISO,
      deletedItem
    }, ...p]);
    emitHabitsUpdated();
    showToast(`${h.title} deleted. Undo available for 48h.`, "warning");

    if (!isDemoMode) {
      try {
        const { data } = await api.delete(`/habits/${id}`);
        const serverDeletedAt = data?.habit?.deletedAt || deletedAtISO;
        const serverUndoMeta = {
          canUndoDelete: typeof data?.canUndoDelete === "boolean"
            ? data.canUndoDelete
            : getDeleteUndoMeta(serverDeletedAt).canUndoDelete,
          deleteUndoExpiresAt: data?.deleteUndoExpiresAt || getDeleteUndoMeta(serverDeletedAt).deleteUndoExpiresAt
        };

        setHabitLogs((p) => p.map((log) => {
          if (log.id !== logId) return log;
          return {
            ...log,
            date: toDateStr(serverDeletedAt) || log.date,
            time: getLocalHHMM(serverDeletedAt),
            deletedAt: serverDeletedAt,
            logAt: serverDeletedAt,
            ...serverUndoMeta,
            deletedItem: {
              ...log.deletedItem,
              deletedAt: serverDeletedAt,
              archivedReason: "deleted",
              ...serverUndoMeta
            }
          };
        }));
      } catch {
        setHabits((p) => [h, ...p.filter((habitItem) => habitItem.id !== h.id)]);
        setHabitLogs((p) => p.filter((log) => log.id !== logId));
        emitHabitsUpdated();
        setError(`Could not delete "${h.title}". Please try again.`);
        setTimeout(() => setError(""), 4000);
      }
    }
    if (editingId === id) setEditingId(null);
    setDeletingHabitId(null);
  };

  const handleUndoDelete = async (logId) => {
    const log = habitLogs.find((l) => l.id === logId);
    if (!log?.deletedItem) return;
    if (deletingHabitId || restoringLogId) return;
    const item = log.deletedItem;
    const confirmedUndo = await openConfirm({
      title: `Restore "${item.title}"?`,
      message: "This will move the habit back to active lists and update today/consistency/heatmap totals from today onward.",
      confirmLabel: "Restore Habit",
      tone: "success"
    });
    if (!confirmedUndo) return;
    setRestoringLogId(logId);

    const undoMeta = getDeleteUndoMeta(log.deletedAt || item.deletedAt);
    const canUndoDelete = typeof log.canUndoDelete === "boolean" ? log.canUndoDelete : undoMeta.canUndoDelete;
    const deleteUndoExpiresAt = log.deleteUndoExpiresAt || item.deleteUndoExpiresAt || undoMeta.deleteUndoExpiresAt;
    const expiredByTime = deleteUndoExpiresAt ? new Date() > new Date(deleteUndoExpiresAt) : !canUndoDelete;
    const nowDate = toISO(new Date());
    const expiredByEndDate = item.endDate && item.endDate < nowDate;

    if (expiredByTime) {
      setUndoError(`Undo expired — "${item.title}" can only be restored within 48 hours of deletion.`);
      setTimeout(() => setUndoError(""), 4000);
      setRestoringLogId(null);
      return;
    }

    if (expiredByEndDate) {
      setUndoError(`Undo not possible — "${item.title}" has already passed its end date.`);
      setTimeout(() => setUndoError(""), 4000);
      setRestoringLogId(null);
      return;
    }

    const restoredItem = {
      ...item,
      deletedAt: null,
      archivedReason: null,
      canUndoDelete: false,
      deleteUndoExpiresAt: null
    };

    if (!isDemoMode) {
      try {
        await api.patch(`/habits/${item.id}/restore`);
      } catch (err) {
        const backendMessage = err?.response?.data?.message;
        setUndoError(backendMessage || `Could not restore "${item.title}". Please try again.`);
        setTimeout(() => setUndoError(""), 4000);
        setRestoringLogId(null);
        return;
      }
    }

    setUndoError("");
    setHabits((p) => [restoredItem, ...p]);
    setHabitLogs((p) => p.filter((l) => l.id !== logId));
    emitHabitsUpdated();
    showToast(`${item.title} restored.`);
    setRestoringLogId(null);
  };

  const startEdit = (h) => {
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
  };


  const startDateLocked = Boolean(editingId && form.startDate && form.startDate <= today);
  const tomorrow = addDays(1, today);
  const minEndDate = form.startDate && form.startDate >= tomorrow ? addDays(1, form.startDate) : tomorrow;

  /* ─── Loading state ──────────────────────────────── */
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-stone-400">Loading habits...</p>
      </div>
    );
  }

  /* ─── Render ─────────────────────────────────────── */
  return (
    <div className="space-y-5">
      <div className="mb-5">
        <p className="text-label-lg">{`Create ${singular}`}</p>
        <h2 className="mt-2 text-2xl font-bold text-amber-100">{`Build Your ${plural}`}</h2>
      </div>

      <div className="schedule-layout">

        {/* ── Column 1 : Create Habit Form ── */}
        <div
          className="schedule-main journal-scroll rounded-[1.4rem] border border-amber-100/10 bg-gradient-to-b from-black/20 to-black/10 p-4 shadow-xl shadow-black/20 sm:rounded-2xl sm:p-5 xl:h-[650px]"
          style={{ overflowY: "auto" }}
        >
          <h3 className="mb-4 text-sm font-semibold text-amber-200">{editingId ? `Edit ${singular}` : `New ${singular}`}</h3>
          <form className="space-y-3" onSubmit={handleSubmit}>

            {/* Title */}
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-stone-400">{`${singular} Name *`}</label>
              <input
                type="text"
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
                value={form.reason}
                onChange={(e) => setField("reason", e.target.value)}
                placeholder="e.g. Build consistency and reduce stress"
                className="w-full resize-none rounded-lg border border-amber-100/15 bg-white/5 px-3 py-1.5 text-sm text-stone-100 outline-none transition focus:border-amber-300/35 focus:ring-1 focus:ring-amber-300/30"
              />
            </div>

            {/* Target Streak + Time of Day */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                <select
                  value={form.timeOfDay}
                  onChange={(e) => setField("timeOfDay", e.target.value)}
                  className={`w-full rounded-lg border bg-stone-900 px-2 py-1.5 text-xs text-stone-100 outline-none transition focus:border-amber-300/35 ${fieldErr("timeOfDay") ? "border-red-400/60" : "border-amber-100/15"}`}
                >
                  <option value="" disabled style={{ backgroundColor:"#1c1917", color:"#6b7280" }}>Select time of day</option>
                  {TIME_OF_DAY_OPTIONS.map((tod) => (
                    <option key={tod} value={tod} style={{ backgroundColor:"#1c1917", color:"#e7e5e4" }}>{tod}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Category + Priority */}
            <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
              {/* Category */}
              <div className="space-y-2">
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-stone-400">
                  Category <span className="text-red-400">*</span>
                </label>
                <div className="flex flex-col gap-2 sm:flex-row sm:gap-1">
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
                <div className={`flex flex-wrap gap-1.5 rounded-lg p-0.5 transition ${fieldErr("priority") ? "ring-1 ring-red-400/50" : ""}`}>
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
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-stone-400">
                  Repeat <span className="text-red-400">*</span>
                </label>
                <select
                  value={form.repeatType}
                  onChange={(e) => setField("repeatType", e.target.value)}
                  disabled={Boolean(editingId)}
                  className={`w-full rounded-lg border bg-stone-900 px-2 py-1.5 text-xs text-stone-100 outline-none transition focus:border-amber-300/35 ${fieldErr("repeatType") ? "border-red-400/60" : "border-amber-100/15"} ${editingId ? "cursor-not-allowed opacity-60" : ""}`}
                >
                  <option value="" disabled style={{ backgroundColor:"#1c1917", color:"#6b7280" }}>Select repeat</option>
                  {REPEAT_TYPES.map((r) => (
                    <option key={r.value} value={r.value} style={{ backgroundColor:"#1c1917", color:"#e7e5e4" }}>{r.label}</option>
                  ))}
                </select>
                {editingId && <p className="mt-1 text-[10px] text-stone-500">Repeat type cannot be changed in edit mode.</p>}
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-stone-400">
                  Time <span className="text-red-400">*</span>
                </label>
                <input
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
                    <input type="date" value={form.startDate}
                      readOnly={startDateLocked}
                      onChange={startDateLocked ? undefined : (e) => setField("startDate", e.target.value)}
                      className={`w-full rounded-lg border px-2 py-1 text-xs outline-none transition ${startDateLocked ? "cursor-not-allowed border-amber-100/10 bg-white/[0.03] text-stone-400" : "border-amber-100/15 bg-white/5 text-stone-100 focus:border-amber-300/35"}`}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-stone-400">End Date (Auto)</label>
                    <input type="date" value={fixedEndDate(FIXED_DURATION[form.repeatType], form.startDate)} readOnly
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
                    <input type="date" value={form.startDate}
                      readOnly={startDateLocked}
                      onChange={startDateLocked ? undefined : (e) => setField("startDate", e.target.value)}
                      className={`w-full rounded-lg border px-2 py-1 text-xs outline-none transition ${startDateLocked ? "cursor-not-allowed border-amber-100/10 bg-white/[0.03] text-stone-400" : "border-amber-100/15 bg-white/5 text-stone-100 focus:border-amber-300/35"}`}
                    />
                    {startDateLocked && <p className="mt-1 text-[10px] text-stone-500">Already started — cannot be changed.</p>}
                  </div>
                  {!form.neverEnds && (
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-stone-400">End</label>
                      <input type="date" value={form.endDate} min={minEndDate} onChange={(e) => setField("endDate", e.target.value)}
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

            {error && <p className="text-xs text-red-300">{error}</p>}

            <button type="submit"
              disabled={submitting}
              className="w-full rounded-lg border border-amber-400/35 bg-gradient-to-r from-amber-400/20 to-orange-400/15 px-4 py-2 text-xs font-semibold text-amber-200 transition hover:from-amber-400/25 hover:to-orange-400/20">
              {submitting ? "Saving..." : (editingId ? `Update ${singular}` : `Add ${singular}`)}
            </button>
            {editingId && (
              <button type="button"
                onClick={() => { setEditingId(null); setError(""); setTouched({}); setForm((p) => ({ ...p, title:"", reason:"", targetStreak:"", timeOfDay:"", category:"", priority:"", repeatType:"", time:"" })); }}
                className="w-full rounded-lg border border-amber-100/15 bg-white/5 px-4 py-2 text-xs font-semibold text-stone-300 transition hover:text-stone-100">
                Cancel Edit
              </button>
            )}
          </form>
        </div>

        {/* ── Column 2 : All Habits ── */}
        <section className="schedule-all-tasks rounded-[1.4rem] border border-amber-100/10 bg-gradient-to-b from-black/20 to-black/10 p-4 shadow-xl shadow-black/20 sm:rounded-2xl sm:p-5 xl:h-[650px]">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-amber-200">{`All ${plural}`}</p>
              <p className="mt-0.5 text-xs text-stone-400">{`Every scheduled ${lowerSingular} at a glance.`}</p>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {["active", "archive"].map((view) => (
                  <button
                    key={view}
                    type="button"
                    onClick={() => setHabitsView(view)}
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

          <div className="journal-scroll flex-1 space-y-2 overflow-y-auto pr-1">
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
                  Boolean(h.endDate && h.endDate <= today)
                );

                return (
                <Motion.article
                  key={h.id}
                  className={`rounded-xl border bg-white/5 p-3 ${editingId === h.id ? "border-amber-300/40 ring-1 ring-amber-300/20" : "border-amber-100/10"}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.22 }}
                  whileHover={{ y: -2, boxShadow: "0 8px 20px rgba(0,0,0,0.35)", borderColor: "rgba(251,191,36,0.2)" }}
                >
                    <>
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="flex min-w-0 flex-1 items-center gap-2">
                          <p className="min-w-0 flex-1 truncate text-sm font-semibold text-stone-100">{h.title}</p>
                          {editingId === h.id && (
                            <span className="shrink-0 rounded-full border border-amber-300/50 bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-200">
                              Editing
                            </span>
                          )}
                        </div>
                        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                          {isArchiveView && (
                            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                              isDeletedHabit
                                ? "border-rose-400/30 bg-rose-500/10 text-rose-200"
                                : isEndedHabit
                                  ? "border-rose-400/30 bg-rose-500/10 text-rose-200"
                                  : "border-stone-500/20 bg-white/5 text-stone-400"
                            }`}>
                              {isDeletedHabit ? "Deleted" : isEndedHabit ? "Ended" : "Archived"}
                            </span>
                          )}
                          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${PRIORITY_STYLES[h.priority]}`}>
                            {h.priority}
                          </span>
                          {!isArchiveView && (
                            <button type="button" onClick={() => startEdit(h)}
                              className="rounded border border-amber-300/25 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold text-amber-200 transition hover:bg-amber-400/20">
                              Edit
                            </button>
                          )}
                          {!isArchiveView && (
                            <button type="button" onClick={() => handleDelete(h.id)}
                              disabled={deletingHabitId === h.id || restoringLogId != null}
                              className="rounded border border-rose-400/25 bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-300 transition hover:bg-rose-500/20">
                              {deletingHabitId === h.id ? "Deleting..." : "Delete"}
                            </button>
                          )}
                        </div>
                      </div>
                      {(h.reason || h.description) && <p className="mt-1 text-xs text-stone-400">{h.reason || h.description}</p>}
                      <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[11px] text-stone-300">
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
                        <span className="rounded-full border border-amber-100/10 bg-black/20 px-2 py-0.5">{fmtTime(h.pendingTime || h.time)}</span>
                        <span className="rounded-full border border-amber-100/10 bg-black/20 px-2 py-0.5">
                          {h.startDate}
                        </span>
                        <span className={`rounded-full border px-2 py-0.5 font-semibold ${h.endDate ? "border-rose-400/25 bg-rose-500/10 text-rose-200" : "border-emerald-400/25 bg-emerald-500/10 text-emerald-200"}`}>
                          {h.endDate ? `Ends ${h.endDate}` : "Never Ends"}
                        </span>
                        {h.repeatType==="weekdays" && (h.pendingDays || h.days || []).map((d) => (
                          <span key={d} className="rounded-full border border-amber-300/25 bg-amber-500/10 px-2 py-0.5 font-semibold text-amber-200">
                            {DAY_SHORT[d]}
                          </span>
                        ))}
                      </div>
                    </>
                </Motion.article>
                );
              })
            )}
          </div>
        </section>

        {/* ── Column 3 : Calendar + Habit Log ── */}
        <aside className="schedule-sidebar">
          <div className="flex flex-col gap-0 rounded-[1.4rem] border border-amber-100/10 bg-gradient-to-b from-black/20 to-black/10 p-4 shadow-xl shadow-black/20 sm:rounded-2xl xl:h-[650px]">

            {/* Calendar */}
            <section className="shrink-0">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold tracking-wide text-amber-200">Calendar</h3>
                <div className="flex items-center gap-1">
                  <button type="button"
                    onClick={() => setViewMonth((p) => new Date(p.getFullYear(), p.getMonth()-1, 1))}
                    className="rounded border border-amber-100/15 px-1.5 py-0.5 text-xs text-stone-300 transition hover:border-amber-300/35 hover:text-amber-200">
                    ‹
                  </button>
                  <span className="text-xs font-medium text-stone-200">{monthTitle}</span>
                  <button type="button"
                    onClick={() => setViewMonth((p) => new Date(p.getFullYear(), p.getMonth()+1, 1))}
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
                    <button key={iso} type="button" onClick={() => setSelectedDate(iso)}
                      title={`${count} ${lowerSingular}${count === 1 ? "" : "s"} scheduled`}
                      aria-label={`${iso}: ${count} ${lowerSingular}${count === 1 ? "" : "s"} scheduled`}
                      className={`relative h-8 rounded text-xs transition ${isSel ? "border border-amber-300/60 bg-amber-400/15 text-amber-100" : "border border-amber-100/10 bg-white/5 text-stone-200 hover:border-amber-300/35"} ${isToday ? "ring-1 ring-amber-500/40" : ""}`}>
                      {cell.getDate()}
                      {count > 0 && <span className="absolute bottom-0.5 right-0.5 h-1.5 w-1.5 rounded-full bg-amber-400/90" />}
                    </button>
                  );
                })}
              </div>
            </section>

            <div className="my-3 shrink-0 border-t border-amber-100/10" />

            {/* Habit Logs */}
            <section className="flex min-h-0 flex-1 flex-col">
              <p className="mb-2 shrink-0 text-sm font-semibold tracking-wide text-amber-200">{`${singular} Logs`}</p>
              {undoError && (
                <p className="mb-2 shrink-0 rounded-md border border-rose-400/30 bg-rose-500/10 px-2 py-1.5 text-[11px] text-rose-300">{undoError}</p>
              )}
              {allLogs.length === 0 ? (
                <p className="text-sm text-stone-400">{`No ${lowerSingular} logs yet.`}</p>
              ) : (
                <div className="journal-scroll min-h-0 flex-1 space-y-1.5 overflow-x-hidden overflow-y-auto scroll-smooth pr-1">
                  {allLogs.map((log) => {
                    const runtimeUndoMeta = getDeleteUndoMeta(log.deletedAt || log.deletedItem?.deletedAt);
                    const canShowUndo = undoEligibleLogIds.has(log.id);
                    return (
                    <div key={log.id} className={`flex flex-col items-start gap-2 rounded-md border px-2 py-1.5 text-[11px] sm:flex-row sm:items-center sm:justify-between ${
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
                            disabled={restoringLogId === log.id || deletingHabitId != null}
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
