import DashboardDateTimeInput from "../../components/DashboardDateTimeInput";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import DashboardSelect from "../../components/DashboardSelect";
import {
  DEFAULT_CATEGORIES,
  DEFAULT_IMPORTANT_CATEGORIES,
  isDefaultCategory,
  isDefaultImportantCategory,
} from "./todoShared";
import useAuth from "../../hooks/useAuth";
import api from "../../api/axios";
import { formatTodoTime, effectiveTodoDay, isTodoArchived, isTodoOnDay, todoTimeOnDay } from "./todoUtils";
import { validTodo, validTodoDeletion, validTodoLogs, todoFailureMessage, todoRevision, uncertainTodoWrite } from "./todoResponse";

const PRIORITIES = ["High", "Medium", "Low"];
const PRIORITY_EMOJI = {
  High: "🔴",
  Medium: "🟡",
  Low: "🟢",
};
const REPEAT_TYPES = [
  { value: "once", label: "One Time" },
  { value: "daily", label: "Daily" },
  { value: "weekdays", label: "Weekdays (Custom Days)" },
  { value: "weekend", label: "Weekend (Sat & Sun)" },
];
const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_SHORT = { Sun: "Su", Mon: "M", Tue: "T", Wed: "W", Thu: "Th", Fri: "F", Sat: "Sa" };
const SCHEDULE_VIEWS = [
  { id: "create", icon: "+", label: "Create Task" },
  { id: "tasks", icon: "✓", label: "All Tasks" },
  { id: "calendar", icon: "▦", label: "Calendar" },
  { id: "logs", icon: "↻", label: "Task Logs" },
];

const toISODate = (dateObj) => {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const day = String(dateObj.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseISODate = (isoDate) => {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year, month - 1, day);
};


const getTaskDisplayTime = (task) => task?.pendingTime || task?.time || "";

const getTaskDisplayTimeForDate = (task, dateISO, timezone) => todoTimeOnDay(task, dateISO, timezone);


const getTaskDisplayDays = (task) => {
  const pendingDays = Array.isArray(task?.pendingDays) ? task.pendingDays : [];
  if (pendingDays.length > 0) return pendingDays;
  return Array.isArray(task?.days) ? task.days : [];
};


const isTaskOnDate = (task, dateISO, timezone) => isTodoOnDay(task, dateISO, timezone);

const hasOccurrenceInRange = (repeatType, startDate, endDate, days = []) => {
  if (!startDate || !endDate) return true;
  const start = parseISODate(startDate);
  const end = parseISODate(endDate);
  const rangeDays = Math.round((Date.UTC(end.getFullYear(), end.getMonth(), end.getDate()) - Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())) / (24 * 60 * 60 * 1000)) + 1;
  if (rangeDays <= 0) return false;
  if (repeatType === "daily") return true;

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

const priorityStyles = {
  High: "border-red-400/40 text-red-200 bg-red-500/10",
  Medium: "border-yellow-400/40 text-yellow-200 bg-yellow-500/10",
  Low: "border-green-400/40 text-green-200 bg-green-500/10",
};
const formatDisplayTime = formatTodoTime;

const formatRemainingUndo = (remainingMs) => {
  const safeMs = Math.max(0, Number(remainingMs) || 0);
  const totalMinutes = Math.ceil(safeMs / (60 * 1000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
};

const getLogTimestamp = (log) => {
  if (log?.logAt) {
    const parsed = new Date(log.logAt).getTime();
    if (Number.isFinite(parsed)) return parsed;
  }
  if (log?.date) {
    const timePart = typeof log.time === "string" && log.time ? log.time.slice(0, 5) : "00:00";
    const parsed = new Date(`${log.date}T${timePart}:00`).getTime();
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
};


const maxISODate = (left, right) => {
  if (!left) return right || "";
  if (!right) return left || "";
  return left > right ? left : right;
};


export default function Schedule({
  tasks = [],
  setTasks = () => {},
  categoryOptions = DEFAULT_CATEGORIES,
  setCategoryOptions = () => {},
  importantCategories = DEFAULT_IMPORTANT_CATEGORIES,
  setImportantCategories = () => {},
  clock,
  timezone,
  requestSignal,
  refreshTasks,
}) {
  const { isDemoMode } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedScheduleView = searchParams.get("schedule");
  const mobileView = SCHEDULE_VIEWS.some((view) => view.id === requestedScheduleView)
    ? requestedScheduleView
    : "create";
  const selectMobileView = (view) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set("view", "schedule");
      next.set("schedule", view);
      next.delete("today");
      next.delete("upcoming");
      return next;
    });
  };
  const today = clock.date;
  const [saving, setSaving] = useState(false);
  const writeLock = useRef(false);
  const [writeBlocked, setWriteBlocked] = useState(false);
  const editingRevision = useRef({});
  const [logsError, setLogsError] = useState("");
  const [logsLoading, setLogsLoading] = useState(!isDemoMode);
  const logVersion = useRef(0);
  const logController = useRef(null);
  const calendarSectionRef = useRef(null);
  const formPanelRef = useRef(null);

  const refreshTaskLogs = useCallback(async () => {
    if (isDemoMode) return;
    const version = ++logVersion.current;
    logController.current?.abort();
    const controller = new AbortController();
    logController.current = controller;
    setLogsLoading(true);
    try {
      const { data } = await api.get("/todos/logs", { signal: controller.signal, timeout: 15000 });
      if (!validTodoLogs(data)) throw new Error("Invalid task logs");
      if (!controller.signal.aborted && version === logVersion.current) { setTaskLogs(data); setLogsError(""); }
    } catch {
      if (version === logVersion.current) setLogsError("Could not load activity logs. Please retry.");
    } finally {
      if (version === logVersion.current) setLogsLoading(false);
    }
  }, [isDemoMode]);

  const [isCatOpen, setIsCatOpen] = useState(false);
  const catDropRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (catDropRef.current && !catDropRef.current.contains(e.target)) setIsCatOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    refreshTaskLogs();
    window.addEventListener("focus", refreshTaskLogs);
    window.addEventListener("monkmode:todos-updated", refreshTaskLogs);
    return () => {
      logVersion.current += 1;
      logController.current?.abort();
      window.removeEventListener("focus", refreshTaskLogs);
      window.removeEventListener("monkmode:todos-updated", refreshTaskLogs);
    };
  }, [refreshTaskLogs]);

  const [showCustomCategory, setShowCustomCategory] = useState(false);
  const [customCategory, setCustomCategory] = useState("");
  const [markCustomCategoryImportant, setMarkCustomCategoryImportant] = useState(false);
  const [categoryError, setCategoryError] = useState("");
  const [categoryDeleteError, setCategoryDeleteError] = useState("");
  const [taskLogs, setTaskLogs] = useState(() =>
    isDemoMode
      ? [
          { id: "demo-task-log-1", title: "Morning Run", date: today, time: "06:30" },
          { id: "demo-task-log-2", title: "Pay Credit Card Bill", date: today, time: "10:30", action: "edited" },
          { id: "demo-task-log-3", title: "Gym Session", date: today, time: "18:00", action: "deleted" },
        ]
      : []
  );
  const [error, setError] = useState("");
  const [updateInfo, setUpdateInfo] = useState("");
  const [undoError, setUndoError] = useState("");
  const [restoringLogId, setRestoringLogId] = useState(null);
  const [editingId, setEditingId] = useState(null);

  const [viewMonth, setViewMonth] = useState(() => {
    const now = parseISODate(today);
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(today);
  const [hoveredCalendarDate, setHoveredCalendarDate] = useState(null);
  const pinnedCalendarDate = useRef(null);
  const [hoveredCalendarPosition, setHoveredCalendarPosition] = useState({ x: 0, y: 0, placement: "bottom" });

  const [touched, setTouched] = useState({});

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
    priority: "",
    repeatType: "",
    date: "",
    startDate: today,
    endDate: "",
    neverEnds: true,
    time: "",
    days: ["Mon", "Wed", "Fri"],
  });
  const editingTask = useMemo(
    () => tasks.find((task) => task.id === editingId) || null,
    [tasks, editingId]
  );
  const isEditDateLocked = useMemo(() => {
    if (!editingTask) return false;
    if (editingTask.repeatType === "once") {
      return Boolean(editingTask.date && editingTask.date <= today);
    }
    return Boolean(editingTask.startDate && editingTask.startDate <= today);
  }, [editingTask, today]);

  const [tasksView, setTasksView] = useState("active");

  // Split tasks into active vs ended (derived — no setState needed)
  const { activeTasks, endedTaskLogs } = useMemo(() => {
    const active = [];
    const ended = [];
    const endedLoggedTaskIds = new Set(
      taskLogs
        .filter((log) => log?.action === "ended" && log?.todoId)
        .map((log) => String(log.todoId))
    );
    tasks.forEach((t) => {
      const isOnceEnded = t.repeatType === "once" && t.date && t.date < today;
      const isRepeatingEnded = t.repeatType !== "once" && t.endDate && t.endDate < today;
      const isDeleted = Boolean(t.deletedAt);
      const isArchived = isTodoArchived(t, today);
      if (isDeleted || isArchived || isOnceEnded || isRepeatingEnded) {
        if (!isDeleted && !endedLoggedTaskIds.has(String(t.id))) {
          const endedDate = t.repeatType === "once" ? t.date : (t.endDate || t.startDate);
          let endedTime = t.time || "00:00";
          if (endedDate === today && endedTime > clock.time) {
            endedTime = clock.time;
          }
          ended.push({
            id: `${t.id}-ended`,
            todoId: t.id,
            title: t.title,
            date: endedDate,
            time: endedTime,
            action: "ended",
            logAt: endedDate ? new Date(`${endedDate}T${endedTime}:00`).toISOString() : null,
          });
        }
      } else {
        active.push(t);
      }
    });
    return { activeTasks: active, endedTaskLogs: ended };
  }, [tasks, today, taskLogs, clock.time]);


  const archivedTasks = useMemo(
    () => tasks.filter((task) => !activeTasks.some((activeTask) => activeTask.id === task.id)),
    [tasks, activeTasks]
  );
  const displayedTasks = tasksView === "active" ? activeTasks : archivedTasks;
  const isArchiveView = tasksView === "archive";

  const allLogs = useMemo(
    () => [...endedTaskLogs, ...taskLogs].sort((a, b) => getLogTimestamp(b) - getLogTimestamp(a)),
    [endedTaskLogs, taskLogs]
  );

  const managedCategories = useMemo(() => {
    const isImportant = (category) =>
      importantCategories.some((item) => item.toLowerCase() === category.toLowerCase());

    const starred = categoryOptions.filter((category) => isImportant(category));
    const normal = categoryOptions.filter((category) => !isImportant(category));
    return [...starred, ...normal];
  }, [categoryOptions, importantCategories]);

  const monthTitle = useMemo(
    () =>
      viewMonth.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      }),
    [viewMonth]
  );

  const calendarCells = useMemo(() => {
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells = [];
    for (let i = 0; i < firstDay.getDay(); i += 1) cells.push(null);
    for (let day = 1; day <= daysInMonth; day += 1) cells.push(new Date(year, month, day));
    return cells;
  }, [viewMonth]);

  const hoveredCalendarTasks = useMemo(() => {
    if (!hoveredCalendarDate) return [];

    return activeTasks
      .filter((task) => isTaskOnDate(task, hoveredCalendarDate, timezone))
      .sort((left, right) => {
        const leftTime = String(getTaskDisplayTimeForDate(left, hoveredCalendarDate, timezone) || "");
        const rightTime = String(getTaskDisplayTimeForDate(right, hoveredCalendarDate, timezone) || "");
        const timeCompare = leftTime.localeCompare(rightTime);
        if (timeCompare !== 0) return timeCompare;
        return String(left?.title || "").localeCompare(String(right?.title || ""));
      });
  }, [hoveredCalendarDate, activeTasks, timezone]);

  const formatLogTime = (timeValue) => {
    return formatDisplayTime(timeValue);
  };

  const handleInputChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setTouched((prev) => ({ ...prev, [field]: true }));
    if (error) setError("");
    if (updateInfo) setUpdateInfo("");
  };

  const fieldError = (field) => {
    if (!touched[field] && !error) return false;
    if (field === "category") return !form.category;
    if (field === "priority") return !form.priority;
    if (field === "repeatType") return !form.repeatType;
    if (field === "time") return !form.time;
    if (field === "date") return form.repeatType === "once" && !form.date;
    return false;
  };

  const handleAddCustomCategory = () => {
    const normalized = customCategory.trim();
    if (normalized.length > 80) { setCategoryError("Category names cannot exceed 80 characters."); return; }
    if (!normalized) {
      setCategoryError("Please enter a category name.");
      return;
    }

    const existing = categoryOptions.find((item) => item.toLowerCase() === normalized.toLowerCase());
    if (!existing) {
      setCategoryOptions((prev) => [...prev, normalized]);
      handleInputChange("category", normalized);
      if (markCustomCategoryImportant) {
        setImportantCategories((prev) =>
          prev.some((item) => item.toLowerCase() === normalized.toLowerCase()) ? prev : [...prev, normalized]
        );
      }
    } else {
      handleInputChange("category", existing);
      if (markCustomCategoryImportant) {
        setImportantCategories((prev) =>
          prev.some((item) => item.toLowerCase() === existing.toLowerCase()) ? prev : [...prev, existing]
        );
      }
    }

    setCustomCategory("");
    setCategoryError("");
    setCategoryDeleteError("");
    setShowCustomCategory(false);
    setMarkCustomCategoryImportant(false);
  };

  const handleDeleteCategory = (categoryName) => {
    if (isDefaultCategory(categoryName)) {
      setCategoryDeleteError("Default categories cannot be deleted.");
      return;
    }

    setCategoryOptions((prev) => prev.filter((item) => item.toLowerCase() !== categoryName.toLowerCase()));
    setImportantCategories((prev) => prev.filter((item) => item.toLowerCase() !== categoryName.toLowerCase()));
    setCategoryDeleteError("");

    setForm((prev) => ({
      ...prev,
      category: prev.category.toLowerCase() === categoryName.toLowerCase() ? "" : prev.category,
    }));
  };

  const handleToggleImportantCategory = (categoryName) => {
    if (isDefaultImportantCategory(categoryName)) return;

    const exists = importantCategories.some((item) => item.toLowerCase() === categoryName.toLowerCase());
    if (exists) {
      setImportantCategories((prev) => prev.filter((item) => item.toLowerCase() !== categoryName.toLowerCase()));
      return;
    }

    setImportantCategories((prev) => [...prev, categoryName]);
  };

  const toggleDay = (day) => {
    setForm((prev) => {
      const exists = prev.days.includes(day);
      if (exists) return { ...prev, days: prev.days.filter((item) => item !== day) };
      return { ...prev, days: [...prev.days, day] };
    });
  };

  const validateForm = () => {
    if (!form.title.trim()) return "Title is required.";
    if (!form.category) return "Category is required.";
    if (!form.priority) return "Priority is required.";
    if (!form.repeatType) return "Repeat type is required.";
    if (!form.time) return "Time is required.";
    if (!editingId && (form.repeatType === "once" ? form.date : form.startDate) < today) return "New tasks cannot start in the past.";
    const existingAnchor = editingTask?.repeatType === "once" ? editingTask.date : editingTask?.startDate;
    const nextAnchor = form.repeatType === "once" ? form.date : form.startDate;
    if (editingId && existingAnchor > today && (nextAnchor < today || (nextAnchor === today && form.time <= clock.time))) return "Rescheduled tasks cannot start in the past or at an elapsed time.";

    if (form.repeatType === "once") {
      if (!form.date) return "Date is required for one-time tasks.";
      if (!editingId && form.date === today && form.time <= clock.time) {
        return "Time for today is already over. You need to start this task from the next day.";
      }
      return "";
    }

    if (!form.startDate) return "Start date is required.";
    if (!editingId && form.startDate === today && form.time <= clock.time) {
      return "Time for today is already over. You need to start this task from the next day.";
    }
    if (!form.neverEnds && !form.endDate) return "End date is required or select Never.";
    if (editingId && !form.neverEnds && form.endDate < today) return "End date cannot be before today.";
    if (!form.neverEnds && form.endDate < form.startDate) return "End date cannot be earlier than start date.";
    if (!form.neverEnds && !hasOccurrenceInRange(form.repeatType, form.startDate, form.endDate, form.days)) {
      if (form.repeatType === "weekend") {
        return "Selected range has no weekend day. Choose a later end date.";
      }
      if (form.repeatType === "weekdays") {
        return "Selected range has no chosen weekday. Adjust start/end date.";
      }
    }
    if (form.repeatType === "weekdays" && form.days.length === 0) return "Select at least one day.";

    return "";
  };

  const resetFormAfterSubmit = () => {
    setError("");
    setTouched({});
    setForm((prev) => ({
      ...prev,
      title: "",
      description: "",
      category: "",
      priority: "",
      repeatType: "",
      time: "",
      date: "",
    }));
  };

  const handleSubmit = async event => {
    event.preventDefault();
    if (isDemoMode || writeLock.current || writeBlocked) return;
    setTouched({ title: true, category: true, priority: true, repeatType: true, time: true, date: true, startDate: true });
    const validationError = validateForm();
    if (validationError) { setError(validationError); return; }
    const payload = {
      title: form.title.trim(), description: form.description, category: form.category, priority: form.priority, time: form.time, repeatType: form.repeatType,
      ...(form.repeatType === "once" ? { date: form.date } : { startDate: form.startDate, neverEnds: form.neverEnds, endDate: form.neverEnds ? null : form.endDate, days: form.repeatType === "weekdays" ? form.days : [] }),
    };
    writeLock.current = true;
    setSaving(true);
    setError("");
    let acknowledged = false;
    try {
      const options = { signal: requestSignal, timeout: 20000 };
      const { data } = editingId ? await api.patch(`/todos/${editingId}`, { ...payload, ...editingRevision.current }, options) : await api.post("/todos", payload, options);
      if (requestSignal?.aborted) return;
      acknowledged = true;
      if (!validTodo(data) || (editingId && data.id !== editingId)) throw new Error("Invalid save confirmation");
      setTasks(previous => editingId ? previous.map(task => task.id === editingId ? data : task) : [data, ...previous]);
      setEditingId(null);
      const date = form.repeatType === "once" ? form.date : form.startDate;
      setSelectedDate(date);
      setViewMonth(new Date(parseISODate(date).getFullYear(), parseISODate(date).getMonth(), 1));
      resetFormAfterSubmit();
      setUpdateInfo(data.auditWarning || (data.reflectFromNextDay || data.reflectDaysFromNextDay ? "Saved. Updated time/custom days take effect tomorrow." : "Task saved."));
      window.dispatchEvent(new Event("monkmode:todos-updated"));
    } catch (err) {
      if (requestSignal?.aborted) return;
      const uncertain = uncertainTodoWrite(err, acknowledged);
      if (uncertain) setWriteBlocked(true);
      setError(todoFailureMessage(err, uncertain ? "The save could not be confirmed. Reload tasks and check the list before saving again. Your draft is still here."
        : "Failed to save task. Your form has been kept; please retry."));
    } finally { writeLock.current = false; setSaving(false); }
  };

  const handleDelete = async id => {
    if (isDemoMode || writeLock.current || writeBlocked) return;
    writeLock.current = true;
    setSaving(true);
    setUndoError("");
    let acknowledged = false;
    try {
      const { data } = await api.delete(`/todos/${id}`, { data: todoRevision(tasks.find(task => task.id === id)), signal: requestSignal, timeout: 20000 });
      if (requestSignal?.aborted) return;
      acknowledged = true;
      if (!validTodoDeletion(data, id)) throw new Error("Invalid deletion confirmation");
      setTasks(previous => previous.map(task => task.id === id ? data.todo : task));
      if (editingId === id) { setEditingId(null); resetFormAfterSubmit(); }
      if (data.auditWarning) setUndoError(data.auditWarning);
      window.dispatchEvent(new Event("monkmode:todos-updated"));
    } catch (err) {
      if (requestSignal?.aborted) return;
      if (uncertainTodoWrite(err, acknowledged)) setWriteBlocked(true);
      setUndoError(todoFailureMessage(err, "Deletion could not be confirmed. Reload tasks before trying again."));
    }
    finally { writeLock.current = false; setSaving(false); }
  };

  const handleUndoDelete = async logId => {
    const log = taskLogs.find(item => item.id === logId) || { deletedItem: tasks.find(task => task.id === logId && task.deletedAt) };
    if (isDemoMode || writeLock.current || writeBlocked || !log?.deletedItem?.id) return;
    writeLock.current = true;
    setSaving(true);
    setRestoringLogId(logId);
    setUndoError("");
    let acknowledged = false;
    try {
      const id = log.deletedItem.id;
      const { data } = await api.patch(`/todos/${id}/restore`, todoRevision(tasks.find(task => task.id === id) || log.deletedItem), { signal: requestSignal, timeout: 20000 });
      if (requestSignal?.aborted) return;
      acknowledged = true;
      if (!validTodo(data) || data.id !== id || data.deletedAt) throw new Error("Invalid restore confirmation");
      setTasks(previous => previous.map(task => task.id === data.id ? data : task));
      if (data.auditWarning) setUndoError(data.auditWarning);
      window.dispatchEvent(new Event("monkmode:todos-updated"));
    } catch (err) {
      if (requestSignal?.aborted) return;
      if (uncertainTodoWrite(err, acknowledged)) setWriteBlocked(true);
      setUndoError(todoFailureMessage(err, "Restore could not be confirmed. Reload tasks before trying again."));
    }
    finally { writeLock.current = false; setSaving(false); setRestoringLogId(null); }
  };

  const previewCalendarDate = (isoDate, event) => {
                        const rect = event.currentTarget.getBoundingClientRect();
                        const containerRect = calendarSectionRef.current?.getBoundingClientRect();
                        const tooltipWidth = 256;
                        const tooltipHeight = 96;
                        const gap = 8;

                        if (!containerRect) {
                          setHoveredCalendarDate(isoDate);
                          setHoveredCalendarPosition({
                            x: rect.left + rect.width / 2,
                            y: rect.bottom + gap,
                            placement: "bottom",
                          });
                          return;
                        }

                        const preferredX = rect.left - containerRect.left + rect.width / 2;
                        const minX = tooltipWidth / 2;
                        const maxX = containerRect.width - tooltipWidth / 2;
                        const clampedX = Math.min(Math.max(preferredX, minX), maxX);

                        const spaceBelow = containerRect.bottom - rect.bottom;
                        const showAbove = spaceBelow < tooltipHeight + gap;
                        const y = showAbove
                          ? rect.top - containerRect.top - gap
                          : rect.bottom - containerRect.top + gap;

                        setHoveredCalendarDate(isoDate);
                        setHoveredCalendarPosition({
                          x: clampedX,
                          y,
                          placement: showAbove ? "top" : "bottom",
                        });
  };

  const startEdit = (task) => {
    if (writeBlocked) return;
    editingRevision.current = todoRevision(task);
    setEditingId(task.id);
    setForm({
      title: task.title,
      description: task.description ?? "",
      category: task.category,
      priority: task.priority,
      time: task.pendingTime || task.time,
      repeatType: task.repeatType,
      date: task.date ?? "",
      startDate: task.startDate ?? "",
      endDate: task.endDate ?? "",
      neverEnds: task.endDate == null,
      days: getTaskDisplayDays(task),
    });
    selectMobileView("create");
    requestAnimationFrame(() => {
      formPanelRef.current?.scrollIntoView({
        block: "start",
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      });
    });
  };

  return (
    <div className="todo-schedule-view" data-mobile-view={mobileView}>
      {writeBlocked && <div role="alert" className="mb-3 rounded-xl border border-rose-400/30 p-3 text-sm text-rose-200">
        <p>The last change could not be confirmed or conflicted with another request. Reload the task list before making another change. Reloading replaces this form draft.</p>
        <button type="button" disabled={saving} className="mt-2 underline" onClick={async () => {
          if (writeLock.current) return;
          writeLock.current = true;
          setSaving(true);
          try {
            if (await refreshTasks()) {
              setWriteBlocked(false); setEditingId(null); setUndoError(""); resetFormAfterSubmit();
              setForm(previous => ({ ...previous, startDate: today, endDate: "", neverEnds: true, days: ["Mon", "Wed", "Fri"] }));
            }
          } finally { writeLock.current = false; setSaving(false); }
        }}>Reload tasks (replaces draft)</button>
      </div>}
      <nav className="schedule-mobile-nav" aria-label="Schedule sections" data-demo-allow="true">
        {SCHEDULE_VIEWS.map((view) => (
          <button
            key={view.id}
            type="button"
            onClick={() => selectMobileView(view.id)}
            aria-pressed={mobileView === view.id}
            className="schedule-mobile-nav-button"
          >
            <span className="schedule-mobile-nav-icon" aria-hidden="true">{view.icon}</span>
            <span>{view.label}</span>
            {view.id === "tasks" ? <span className="schedule-mobile-nav-count">{displayedTasks.length}</span> : null}
            {view.id === "logs" ? <span className="schedule-mobile-nav-count">{allLogs.length}</span> : null}
          </button>
        ))}
      </nav>
      <div className="schedule-layout">
        <div ref={formPanelRef} data-schedule-panel="create" className="schedule-main journal-scroll rounded-[1.4rem] border border-amber-100/10 bg-gradient-to-b from-black/20 to-black/10 p-4 shadow-xl shadow-black/20 sm:rounded-2xl sm:p-5">
          <h3 className="mb-4 text-sm font-semibold text-amber-200">{editingId ? "Edit Task" : "Create Task"}</h3>
          <form className="space-y-3" onSubmit={handleSubmit}>
            <fieldset disabled={saving} className="min-w-0 space-y-3 border-0 p-0">
            {/* Row 1: Title */}
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-stone-400">Title *</label>
              <input
                id="task-title"
                type="text"
                value={form.title}
                onChange={(event) => handleInputChange("title", event.target.value)}
                placeholder="e.g. Study DSA"
                className="w-full rounded-lg border border-amber-100/15 bg-white/5 px-3 py-1.5 text-sm text-stone-100 outline-none transition focus:border-amber-300/35 focus:ring-1 focus:ring-amber-300/30"
              />
            </div>

            {/* Row 2: Description */}
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-stone-400">Description</label>
              <textarea
                id="task-description"
                rows={2}
                value={form.description}
                onChange={(event) => handleInputChange("description", event.target.value)}
                placeholder="e.g. Revise DP, solve 5 questions"
                className="w-full resize-none rounded-lg border border-amber-100/15 bg-white/5 px-3 py-1.5 text-sm text-stone-100 outline-none transition focus:border-amber-300/35 focus:ring-1 focus:ring-amber-300/30"
              />
            </div>

            {/* Row 3: Category + Priority side-by-side */}
            <div className="schedule-form-row schedule-form-row-category grid grid-cols-1 items-start gap-4">
              <div className="space-y-2">
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-stone-400">
                  Category <span className="text-red-400">*</span>
                </label>
                <div className="schedule-category-controls flex flex-wrap gap-2">
                  <div ref={catDropRef} className="relative min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => setIsCatOpen((p) => !p)}
                      className={`relative h-9 w-full rounded-lg border bg-stone-900 pl-2 pr-6 text-left text-[11px] text-stone-100 outline-none transition focus:border-amber-300/35 ${
                        fieldError("category") ? "border-red-400/60" : "border-amber-100/15"
                      }`}
                    >
                      {form.category
                        ? importantCategories.some((i) => i.toLowerCase() === form.category.toLowerCase())
                          ? `${form.category} ⭐`
                          : form.category
                        : <span className="text-stone-500">Select category</span>}
                      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-stone-400">▾</span>
                    </button>
                    {isCatOpen && (
                      <div className="journal-scroll absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-amber-100/15 bg-stone-900 py-1 shadow-xl shadow-black/50">
                        {categoryOptions.map((category) => (
                          <button
                            key={category}
                            type="button"
                            onClick={() => { handleInputChange("category", category); setIsCatOpen(false); }}
                            className={`w-full px-3 py-1.5 text-left text-[11px] transition hover:bg-amber-500/10 hover:text-amber-200 ${
                              form.category === category ? "bg-amber-500/15 text-amber-200" : "text-stone-100"
                            }`}
                          >
                            {importantCategories.some((i) => i.toLowerCase() === category.toLowerCase()) ? `${category} ⭐` : category}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCustomCategory((prev) => !prev)}
                    className="dashboard-card-action"
                    data-tone="warning"
                  >
                    + Category
                  </button>
                </div>
                {showCustomCategory ? (
                  <>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <input
                        type="text"
                        value={customCategory}
                        onChange={(event) => {
                          setCustomCategory(event.target.value);
                          if (categoryError) setCategoryError("");
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            handleAddCustomCategory();
                          }
                        }}
                        placeholder="Custom category"
                        className="flex-1 rounded-lg border border-amber-100/15 bg-white/5 px-3 py-1.5 text-xs text-stone-100 outline-none transition focus:border-amber-300/35"
                      />
                    <button type="button" onClick={handleAddCustomCategory} className="dashboard-card-action" data-tone="warning">Add</button>
                    </div>
                    <label className="flex items-center gap-2 text-xs text-stone-300">
                      <input
                        type="checkbox"
                        checked={markCustomCategoryImportant}
                        onChange={(event) => setMarkCustomCategoryImportant(event.target.checked)}
                        className="accent-amber-400"
                      />
                      Mark as important <span className="text-amber-300">⭐</span>
                    </label>
                    <div className="rounded-lg border border-amber-100/10 bg-white/5 p-2">
                      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-stone-400">Manage Categories</p>
                      <div className="journal-scroll max-h-28 overflow-y-auto pr-1">
                        <div className="flex flex-wrap gap-1.5">
                          {managedCategories.map((category) => {
                          const isDefault = isDefaultCategory(category);
                          const isImportant = importantCategories.some((item) => item.toLowerCase() === category.toLowerCase());
                          const isLockedImportant = isDefaultImportantCategory(category);
                          return (
                            <span key={`manage-${category}`} className="inline-flex items-center gap-1 rounded-full border border-amber-100/15 bg-black/20 px-2 py-0.5 text-[10px] text-stone-300">
                              <span>{category}</span>
                              <button
                                type="button"
                                onClick={() => handleToggleImportantCategory(category)}
                                disabled={isLockedImportant}
                                className={`rounded border px-1 text-[9px] font-semibold transition ${
                                  isImportant
                                    ? "border-amber-400/40 bg-amber-500/15 text-amber-200"
                                    : "border-amber-100/20 bg-white/5 text-stone-300 hover:border-amber-300/40"
                                } ${isLockedImportant ? "cursor-not-allowed opacity-60" : ""}`}
                                aria-label={`${isImportant ? "Remove" : "Mark"} ${category} as important`}
                              >
                                {isImportant ? "★" : "☆"}
                              </button>
                              {!isDefault ? (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCategory(category)}
                                  className="rounded border border-rose-400/30 bg-rose-500/10 px-1 text-[9px] font-semibold text-rose-300 transition hover:bg-rose-500/20"
                                  aria-label={`Delete ${category}`}
                                >
                                  x
                                </button>
                              ) : null}
                            </span>
                          );
                        })}
                        </div>
                      </div>
                    </div>
                  </>
                ) : null}
                {categoryError ? <p className="text-xs text-red-300">{categoryError}</p> : null}
                {categoryDeleteError ? <p className="text-xs text-red-300">{categoryDeleteError}</p> : null}
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-stone-400">
                  Priority <span className="text-red-400">*</span>
                </label>
                <div className={`flex flex-wrap gap-1.5 rounded-lg p-0.5 transition ${fieldError("priority") ? "ring-1 ring-red-400/50" : ""}`}>
                  {PRIORITIES.map((priority) => (
                    <button
                      key={priority}
                      type="button"
                      onClick={() => handleInputChange("priority", priority)}
                      className={`flex min-w-[84px] flex-1 items-center justify-center gap-1 whitespace-nowrap rounded-lg border px-2 py-2 text-[10px] font-semibold transition sm:py-1.5 ${
                        form.priority === priority ? priorityStyles[priority] : "border-amber-100/15 bg-white/5 text-stone-300"
                      }`}
                    >
                      <span>{priority}</span>
                      <span>{PRIORITY_EMOJI[priority]}</span>
                    </button>
                  ))}
                </div>
                {fieldError("priority") && <p className="mt-1 text-[10px] text-red-400">Select a priority.</p>}
              </div>
            </div>

            {/* Row 4: Repetition + Date/Time */}
            <div className="schedule-form-row schedule-form-row-time grid grid-cols-1 gap-3">
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-stone-400">
                  Repeat <span className="text-red-400">*</span>
                </label>
                <DashboardSelect
                  id="task-repeat"
                  value={form.repeatType}
                  onChange={(event) => handleInputChange("repeatType", event.target.value)}
                  disabled={Boolean(editingId)}
                  className={`w-full rounded-lg border bg-stone-900 px-2 py-1.5 text-xs text-stone-100 outline-none transition focus:border-amber-300/35 ${
                    fieldError("repeatType") ? "border-red-400/60" : "border-amber-100/15"
                  } ${editingId ? "cursor-not-allowed opacity-60" : ""}`}
                >
                  <option value="" disabled style={{ backgroundColor: "#1c1917", color: "#6b7280" }}>Select repeat</option>
                  {REPEAT_TYPES.map((type) => (
                    <option key={type.value} value={type.value} style={{ backgroundColor: "#1c1917", color: "#e7e5e4" }}>{type.label}</option>
                  ))}
                </DashboardSelect>
                {editingId ? <p className="mt-1 text-[10px] text-stone-500">Repeat type cannot be changed in edit mode.</p> : null}
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-stone-400">
                  Time <span className="text-red-400">*</span>
                </label>
<DashboardDateTimeInput
                  id="task-time"
                  type="time"
                  value={form.time}
                  onChange={(event) => handleInputChange("time", event.target.value)}
                  className={`w-full rounded-lg border bg-white/5 px-2 py-1.5 text-xs text-stone-100 outline-none transition focus:border-amber-300/35 ${
                    fieldError("time") ? "border-red-400/60" : "border-amber-100/15"
                  }`}
                />
              </div>
            </div>

            {/* Row 5: Date fields based on repeat type */}
            {form.repeatType === "once" ? (
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-stone-400">
                  Date <span className="text-red-400">*</span>
                </label>
<DashboardDateTimeInput
                  id="task-date"
                  type="date"
                  value={form.date}
                  onChange={(event) => handleInputChange("date", event.target.value)}
                  disabled={Boolean(editingId && isEditDateLocked)}
                  className={`w-full rounded-lg border bg-white/5 px-3 py-1.5 text-xs text-stone-100 outline-none transition focus:border-amber-300/35 ${
                    fieldError("date") ? "border-red-400/60" : "border-amber-100/15"
                  } ${editingId && isEditDateLocked ? "cursor-not-allowed opacity-60" : ""}`}
                />
                {editingId && isEditDateLocked ? (
                  <p className="mt-1 text-[10px] text-stone-500">Date cannot be changed once this task has begun.</p>
                ) : null}
              </div>
            ) : (
              <div className="space-y-2 rounded-lg border border-amber-100/10 bg-white/5 p-2.5">
                <div className="schedule-date-row grid grid-cols-1 gap-2">
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-stone-400">Start</label>
<DashboardDateTimeInput
                      id="task-start"
                      type="date"
                      value={form.startDate}
                      onChange={(e) => handleInputChange("startDate", e.target.value)}
                      disabled={Boolean(editingId && isEditDateLocked)}
                      className={`w-full rounded-lg border border-amber-100/15 bg-white/5 px-2 py-1 text-xs text-stone-100 outline-none transition focus:border-amber-300/35 ${
                        editingId && isEditDateLocked ? "cursor-not-allowed opacity-60" : ""
                      }`}
                    />
                  </div>
                  {!form.neverEnds && (
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-stone-400">End</label>
<DashboardDateTimeInput id="task-end" type="date" value={form.endDate} min={maxISODate(form.startDate || "", editingId ? today : "") || undefined} onChange={(e) => handleInputChange("endDate", e.target.value)} className="w-full rounded-lg border border-amber-100/15 bg-white/5 px-2 py-1 text-xs text-stone-100 outline-none transition focus:border-amber-300/35" />
                    </div>
                  )}
                </div>
                {editingId && isEditDateLocked ? (
                  <p className="text-[10px] text-stone-500">Start date cannot be changed once this task has begun.</p>
                ) : null}
                <label className="flex items-center gap-2 text-xs text-stone-300">
                  <input type="checkbox" checked={form.neverEnds} onChange={(e) => handleInputChange("neverEnds", e.target.checked)} className="accent-amber-400" />
                  Never End
                </label>
                {form.repeatType === "weekdays" && (
                    <div className="grid grid-cols-4 gap-1 sm:grid-cols-7">
                      {WEEK_DAYS.map((day) => (
                      <button key={day} type="button" onClick={() => toggleDay(day)}
                        className={`rounded border py-1 text-[10px] font-semibold transition ${form.days.includes(day) ? "border-amber-300/55 bg-amber-400/15 text-amber-100" : "border-amber-100/15 bg-white/5 text-stone-300"}`}>
                        {day}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {error ? <p role="alert" className="text-xs text-red-300">{error}</p> : null}
            {updateInfo ? <p className="text-xs text-emerald-300">{updateInfo}</p> : null}

            <button
              type="submit"
              disabled={saving || writeBlocked}
              aria-busy={saving}
              className="dashboard-card-action w-full"
              data-tone="warning"
            >
              {saving ? "Saving…" : editingId ? "Update Task" : "Add Task"}
            </button>
            {editingId && (
              <button
                type="button"
                disabled={saving}
                onClick={() => { setEditingId(null); setError(""); setTouched({}); setForm((prev) => ({ ...prev, title: "", description: "", category: "", priority: "", repeatType: "", time: "", date: "" })); }}
                className="dashboard-card-action mt-1.5 w-full"
                data-tone="neutral"
              >
                Cancel Edit
              </button>
            )}
            </fieldset>
          </form>
        </div>

        {/* All Tasks column */}
        <section data-schedule-panel="tasks" className="schedule-all-tasks rounded-[1.4rem] border border-amber-100/10 bg-gradient-to-b from-black/20 to-black/10 p-4 shadow-xl shadow-black/20 sm:rounded-2xl sm:p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-amber-200">All Tasks</p>
              <p className="mt-0.5 text-xs text-stone-400">Every scheduled task at a glance.</p>
              <div className="dashboard-filter-controls mt-2 flex items-center gap-1.5">
                {["active", "archive"].map((view) => (
                  <button
                    key={view}
                    type="button"
                    onClick={() => setTasksView(view)}
                    aria-pressed={tasksView === view}
                    className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize transition ${
                      tasksView === view
                        ? "border-amber-300/45 bg-amber-500/15 text-amber-100"
                        : "border-amber-100/10 bg-white/5 text-stone-400 hover:border-amber-300/35 hover:text-amber-200"
                    }`}
                  >
                    {view}
                  </button>
                ))}
              </div>
            </div>
            <span className="self-start rounded-full border border-amber-100/10 bg-white/5 px-3 py-1 text-xs text-stone-300 sm:self-auto">
              {displayedTasks.length} total
            </span>
          </div>

          <div className="journal-scroll flex-1 space-y-2 overflow-y-auto pr-1">
            {displayedTasks.length === 0 ? (
              <p className="mt-6 text-center text-xs text-stone-500">
                {tasksView === "active" ? "No active tasks yet. Create one to get started." : "No archived tasks yet."}
              </p>
            ) : (
              displayedTasks.map((task) => {
                const isDeletedTask = Boolean(task.deletedAt || task.archivedReason === "deleted" || task.archiveReason === "deleted");
                const isEndedTask = !isDeletedTask && (
                  task.archivedReason === "ended" ||
                  task.archiveReason === "ended" ||
                  Boolean(task.archived) ||
                  (task.repeatType === "once" && task.date && task.date < today) ||
                  (task.repeatType !== "once" && task.endDate && task.endDate < today)
                );

                return (
                  <article key={task.id} className="schedule-task-card dashboard-glow-card rounded-xl border border-amber-100/10 bg-white/5 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="min-w-0 flex-1 text-sm font-semibold text-stone-100">{task.title}</p>
                        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                          {isArchiveView && (
                            <span className="dashboard-card-status" data-tone={isDeletedTask || isEndedTask ? "danger" : undefined}>
                              {isDeletedTask ? "Deleted" : isEndedTask ? "Ended" : "Archived"}
                            </span>
                          )}
                          <span className={`dashboard-card-priority ${priorityStyles[task.priority]}`}>
                            {task.priority}
                          </span>
                          {!isArchiveView && (
                            <div className="schedule-task-actions flex items-center gap-1.5">
                              <button type="button" disabled={saving || writeBlocked} onClick={() => startEdit(task)} className="dashboard-edit-delete-action dashboard-card-action" data-tone="warning">Edit</button>
                              <button type="button" disabled={saving || writeBlocked} onClick={() => handleDelete(task.id)} className="dashboard-edit-delete-action dashboard-card-action" data-tone="danger">Delete</button>
                            </div>
                          )}
                          {isArchiveView && isDeletedTask && task.canUndoDelete && Date.parse(task.deleteUndoExpiresAt) > Date.now() && (
                            <button type="button" disabled={saving || writeBlocked} onClick={() => handleUndoDelete(task.id)} className="dashboard-card-action" data-tone="warning">Restore</button>
                          )}
                        </div>
                      </div>
                      {task.description ? (
                        <p className="mt-1 text-xs text-stone-400">{task.description}</p>
                      ) : null}
                      <div className="schedule-task-details mt-2.5">
                        <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-[11px] text-stone-300">
                          <span className="rounded-full border border-amber-100/10 bg-black/20 px-2 py-0.5">{task.category}</span>
                          <span className="rounded-full border border-amber-100/10 bg-black/20 px-2 py-0.5">
                            {REPEAT_TYPES.find((r) => r.value === task.repeatType)?.label ?? task.repeatType}
                          </span>
                          <span className="rounded-full border border-amber-100/10 bg-black/20 px-2 py-0.5">
                            {formatDisplayTime(getTaskDisplayTime(task))}
                          </span>
                          <span className="rounded-full border border-amber-100/10 bg-black/20 px-2 py-0.5">
                            {task.repeatType === "once" ? task.date : task.startDate}
                          </span>
                          {task.repeatType !== "once" && (
                            <span className="dashboard-card-status" data-tone={task.endDate ? "danger" : "success"}>
                              {task.endDate ? `Ends ${task.endDate}` : "Never Ends"}
                            </span>
                          )}
                          {task.repeatType === "weekdays" && getTaskDisplayDays(task).map((day) => (
                            <span key={day} className="rounded-full border border-amber-300/25 bg-amber-500/10 px-2 py-0.5 font-semibold text-amber-200">
                              {DAY_SHORT[day]}
                            </span>
                          ))}
                          {task.pendingTime && task.timeChangeEffectiveFrom && <span className="text-amber-200/80">New time from {effectiveTodoDay(task.timeChangeEffectiveFrom, timezone)}</span>}
                          {task.pendingDays?.length > 0 && task.daysChangeEffectiveFrom && <span className="text-amber-200/80">New days from {effectiveTodoDay(task.daysChangeEffectiveFrom, timezone)}</span>}
                        </div>
                      </div>
                  </article>
                );
              })
            )}
          </div>
        </section>

        <aside className="schedule-sidebar">
          <div className="schedule-sidebar-card flex flex-col gap-0 rounded-[1.4rem] border border-amber-100/10 bg-gradient-to-b from-black/20 to-black/10 p-4 shadow-xl shadow-black/20 sm:rounded-2xl">

            {/* Calendar */}
            <section ref={calendarSectionRef} data-schedule-panel="calendar" className="schedule-calendar relative shrink-0">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold tracking-wide text-amber-200">Calendar</h3>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setViewMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                    className="rounded border border-amber-100/15 px-1.5 py-0.5 text-xs text-stone-300 transition hover:border-amber-300/35 hover:text-amber-200"
                  >
                    ‹
                  </button>
                  <span className="text-xs font-medium text-stone-200">{monthTitle}</span>
                  <button
                    type="button"
                    onClick={() => setViewMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                    className="rounded border border-amber-100/15 px-1.5 py-0.5 text-xs text-stone-300 transition hover:border-amber-300/35 hover:text-amber-200"
                  >
                    ›
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-0.5 text-center text-xs text-stone-400">
                {WEEK_DAYS.map((day) => (
                  <div key={day} className="py-1 text-[9px] font-semibold sm:text-[10px]">{day}</div>
                ))}
                {calendarCells.map((cellDate, idx) => {
                  if (!cellDate) return <div key={`empty-${idx}`} className="h-8 rounded" />;
                  const isoDate = toISODate(cellDate);
                  const count = activeTasks.reduce((acc, task) => (isTaskOnDate(task, isoDate, timezone) ? acc + 1 : acc), 0);
                  const isToday = isoDate === today;
                  const isSelected = isoDate === selectedDate;
                  return (
                    <button
                      key={isoDate}
                      type="button"
                      aria-label={`${isoDate}, ${count} tasks scheduled`}
                      aria-pressed={isSelected}
                      aria-describedby={hoveredCalendarDate === isoDate ? "todo-calendar-preview" : undefined}
                      onClick={event => { pinnedCalendarDate.current = isoDate; setSelectedDate(isoDate); previewCalendarDate(isoDate, event); }}
                      onMouseEnter={event => previewCalendarDate(isoDate, event)}
                      onFocus={event => { pinnedCalendarDate.current = null; previewCalendarDate(isoDate, event); }}
                      onBlur={() => { if (!pinnedCalendarDate.current) setHoveredCalendarDate(null); }}
                      onKeyDown={event => { if (event.key === "Escape") { pinnedCalendarDate.current = null; setHoveredCalendarDate(null); } }}
                      onMouseLeave={() => setHoveredCalendarDate(current => current === isoDate && pinnedCalendarDate.current !== isoDate ? null : current)}
                      className={`relative h-8 rounded text-[11px] transition sm:text-xs ${
                        isSelected
                          ? "border border-amber-300/60 bg-amber-400/15 text-amber-100"
                          : "border border-amber-100/10 bg-white/5 text-stone-200 hover:border-amber-300/35"
                      } ${isToday ? "ring-1 ring-amber-500/40" : ""}`}
                    >
                      {cellDate.getDate()}
                      {count > 0 ? (
                        <span className="absolute bottom-0.5 right-0.5 h-1.5 w-1.5 rounded-full bg-amber-400/90" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
              {hoveredCalendarDate ? (
                <div
                  id="todo-calendar-preview"
                  role="tooltip"
                  className="pointer-events-none absolute z-[80] w-64 -translate-x-1/2 rounded-xl border border-amber-100/10 bg-stone-950/95 p-3 shadow-2xl shadow-black/60 backdrop-blur-sm"
                  style={{
                    left: hoveredCalendarPosition.x,
                    top: hoveredCalendarPosition.y,
                    transform: hoveredCalendarPosition.placement === "top"
                      ? "translate(-50%, -100%)"
                      : "translate(-50%, 0)",
                  }}
                >
                  {hoveredCalendarTasks.length === 0 ? (
                    <p className="text-[11px] text-stone-300">No tasks scheduled.</p>
                  ) : hoveredCalendarTasks.length === 1 ? (
                    <p className="text-[11px] text-stone-200">
                      <span className="font-semibold text-amber-200">{hoveredCalendarTasks[0].title}</span>{" "}
                      · {formatDisplayTime(getTaskDisplayTimeForDate(hoveredCalendarTasks[0], hoveredCalendarDate, timezone))}
                    </p>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-[11px] font-semibold text-amber-200">
                        {hoveredCalendarTasks.length} tasks scheduled
                      </p>
                      {hoveredCalendarTasks.slice(0, 5).map((task) => (
                        <p key={`${hoveredCalendarDate}-${task.id}`} className="truncate text-[10px] text-stone-300">
                          {formatDisplayTime(getTaskDisplayTimeForDate(task, hoveredCalendarDate, timezone))} · {task.title}
                        </p>
                      ))}
                      {hoveredCalendarTasks.length > 5 && <p className="text-[10px] text-stone-400">+{hoveredCalendarTasks.length - 5} more tasks</p>}
                    </div>
                  )}
                </div>
              ) : null}
            </section>

            {/* Divider */}
            <div className="schedule-sidebar-divider my-3 shrink-0 border-t border-amber-100/10" />

            {/* Task Logs — fills remaining height */}
            <section data-schedule-panel="logs" className="schedule-logs flex min-h-0 flex-1 flex-col">
              <p className="mb-2 shrink-0 text-sm font-semibold tracking-wide text-amber-200">Task Logs</p>
              {logsError && <div role="alert" className="mb-2 text-xs text-rose-300">{logsError} <button type="button" onClick={refreshTaskLogs} className="underline">Retry logs</button></div>}
              {logsLoading && <p role="status" className="mb-2 text-xs text-stone-400">Loading activity logs…</p>}
              {undoError && (
                <p role="alert" className="mb-2 shrink-0 rounded-md border border-rose-400/30 bg-rose-500/10 px-2 py-1.5 text-[11px] text-rose-300">{undoError}</p>
              )}
              {allLogs.length === 0 ? (
                <p className="text-sm text-stone-400">{!logsLoading && !logsError ? "No task logs yet." : ""}</p>
              ) : (
                <div className="journal-scroll min-h-0 flex-1 space-y-1.5 overflow-x-hidden overflow-y-auto scroll-smooth pr-1">
                  {allLogs.map((log) => {
                    const runtimeUndoRemainingMs = log.deleteUndoExpiresAt
                      ? Math.max(0, new Date(log.deleteUndoExpiresAt).getTime() - Date.now())
                      : Number(log.deleteUndoRemainingMs || 0);
                    return (
                    <div key={log.id} className={`flex items-center justify-between gap-2 rounded-md border px-2 py-1.5 text-[11px] ${
                      log.action === "deleted"
                        ? "border-rose-400/20 bg-rose-500/5 text-stone-300"
                        : log.action === "edited"
                        ? "border-amber-300/20 bg-amber-500/5 text-stone-300"
                        : log.action === "ended"
                        ? "border-blue-400/20 bg-blue-500/5 text-stone-300"
                        : log.action === "restored"
                        ? "border-emerald-400/20 bg-emerald-500/5 text-stone-300"
                        : "border-amber-100/10 bg-white/5 text-stone-200"
                    }`}>
                      <p className="min-w-0 flex-1">
                        <span className={`font-semibold ${
                          log.action === "deleted" ? "text-rose-300"
                          : log.action === "edited" ? "text-amber-200"
                          : log.action === "ended" ? "text-blue-300"
                          : log.action === "restored" ? "text-emerald-300"
                          : "text-emerald-300"
                        }`}>
                          {log.action === "deleted" ? "Deleted"
                            : log.action === "edited" ? "Edited"
                            : log.action === "ended" ? "Ended"
                            : log.action === "restored" ? "Restored"
                            : "Created"}:
                        </span>{" "}
                        <span className="break-all font-semibold text-stone-100">{log.title}</span> on {log.date} at {formatLogTime(log.time)}
                      </p>
                      {log.action === "deleted" && log.deletedItem && (isDemoMode || (log.canUndoDelete && runtimeUndoRemainingMs > 0)) && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleUndoDelete(log.id)}
                            disabled={saving || writeBlocked}
                            className="dashboard-card-action"
                            data-tone="warning"
                            title="Undo delete (available for 48 hours)"
                          >
                            {restoringLogId === log.id ? "..." : "↺ Undo"}
                          </button>
                          <span className="shrink-0 text-[10px] text-amber-200/80">
                            {formatRemainingUndo(runtimeUndoRemainingMs)} left
                          </span>
                        </>
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
    </div>
  );
}
