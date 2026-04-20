import { useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_CATEGORIES,
  DEFAULT_IMPORTANT_CATEGORIES,
  isDefaultCategory,
  isDefaultImportantCategory,
} from "./todoShared";

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

const isInRange = (dateISO, startDate, endDate) => {
  const target = parseISODate(dateISO);
  const start = parseISODate(startDate);
  if (target < start) return false;
  if (!endDate) return true;
  return target <= parseISODate(endDate);
};

const isTaskOnDate = (task, dateISO) => {
  if (task.repeatType === "once") return task.date === dateISO;
  if (!isInRange(dateISO, task.startDate, task.endDate)) return false;

  const targetDay = parseISODate(dateISO).getDay();

  if (task.repeatType === "daily") return true;
  if (task.repeatType === "weekend") return targetDay === 0 || targetDay === 6;
  if (task.repeatType === "weekdays") return task.days.includes(WEEK_DAYS[targetDay]);
 is 
  return false;
};

const priorityStyles = {
  High: "border-red-400/40 text-red-200 bg-red-500/10",
  Medium: "border-yellow-400/40 text-yellow-200 bg-yellow-500/10",
  Low: "border-green-400/40 text-green-200 bg-green-500/10",
};
const SCHEDULE_PANEL_HEIGHT = "650px";


export default function Schedule({
  tasks = [],
  setTasks = () => {},
  categoryOptions = DEFAULT_CATEGORIES,
  setCategoryOptions = () => {},
  importantCategories = DEFAULT_IMPORTANT_CATEGORIES,
  setImportantCategories = () => {},
}) {
  const today = useMemo(() => toISODate(new Date()), []);

  const [isCatOpen, setIsCatOpen] = useState(false);
  const [isEditCatOpen, setIsEditCatOpen] = useState(false);
  const catDropRef = useRef(null);
  const editCatDropRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (catDropRef.current && !catDropRef.current.contains(e.target)) setIsCatOpen(false);
      if (editCatDropRef.current && !editCatDropRef.current.contains(e.target)) setIsEditCatOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const [showCustomCategory, setShowCustomCategory] = useState(false);
  const [customCategory, setCustomCategory] = useState("");
  const [markCustomCategoryImportant, setMarkCustomCategoryImportant] = useState(false);
  const [categoryError, setCategoryError] = useState("");
  const [categoryDeleteError, setCategoryDeleteError] = useState("");
  const [taskLogs, setTaskLogs] = useState(() => [
    { id: "demo-task-log-1", title: "Morning Run", date: today, time: "06:30" },
    { id: "demo-task-log-2", title: "Pay Credit Card Bill", date: today, time: "10:30", action: "edited" },
    { id: "demo-task-log-3", title: "Gym Session", date: today, time: "18:00", action: "deleted" },
  ]);
  const [error, setError] = useState("");
  const [undoError, setUndoError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  const [viewMonth, setViewMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(today);

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

  const [tasksView, setTasksView] = useState("active");

  // Split tasks into active vs ended (derived — no setState needed)
  const { activeTasks, endedTaskLogs } = useMemo(() => {
    const active = [];
    const ended = [];
    tasks.forEach((t) => {
      const isOnceEnded = t.repeatType === "once" && t.date && t.date < today;
      const isRepeatingEnded = t.repeatType !== "once" && t.endDate && t.endDate < today;
      if (isOnceEnded || isRepeatingEnded) {
        ended.push({
          id: `${t.id}-ended`,
          title: t.title,
          date: t.repeatType === "once" ? t.date : t.endDate,
          time: t.time,
          action: "ended",
        });
      } else {
        active.push(t);
      }
    });
    return { activeTasks: active, endedTaskLogs: ended };
  }, [tasks, today]);
  const archivedTasks = useMemo(
    () => tasks.filter((task) => !activeTasks.some((activeTask) => activeTask.id === task.id)),
    [tasks, activeTasks]
  );
  const displayedTasks = tasksView === "active" ? activeTasks : archivedTasks;
  const isArchiveView = tasksView === "archive";

  const allLogs = useMemo(
    () => [...endedTaskLogs, ...taskLogs].sort((a, b) => {
      const aEnded = a.action === "ended" ? 1 : 0;
      const bEnded = b.action === "ended" ? 1 : 0;
      return aEnded - bEnded;
    }),
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

  const formatLogTime = (timeValue) => {
    if (!timeValue) return "--";
    const [hours, minutes] = timeValue.split(":").map(Number);
    const dateObj = new Date();
    dateObj.setHours(hours, minutes, 0, 0);
    return dateObj.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  };

  const handleInputChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setTouched((prev) => ({ ...prev, [field]: true }));
    if (error) setError("");
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

    if (editingId) {
      setEditForm((prev) => ({
        ...prev,
        category: prev.category?.toLowerCase() === categoryName.toLowerCase() ? "" : prev.category,
      }));
    }
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

    if (form.repeatType === "once") {
      if (!form.date) return "Date is required for one-time tasks.";
      return "";
    }

    if (!form.startDate) return "Start date is required.";
    if (!form.neverEnds && !form.endDate) return "End date is required or select Never.";
    if (!form.neverEnds && form.endDate < form.startDate) return "End date cannot be earlier than start date.";
    if (form.repeatType === "weekdays" && form.days.length === 0) return "Select at least one day.";

    return "";
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setTouched({ title: true, category: true, priority: true, repeatType: true, time: true, date: true, startDate: true });
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    if (editingId) {
      const updatedFields = {
        title: form.title.trim(),
        description: form.description,
        category: form.category,
        priority: form.priority,
        time: form.time,
        repeatType: form.repeatType,
        ...(form.repeatType === "once"
          ? { date: form.date, startDate: undefined, endDate: undefined, days: undefined }
          : {
              startDate: form.startDate,
              endDate: form.neverEnds ? null : form.endDate,
              days: form.repeatType === "weekdays" ? form.days : undefined,
              date: undefined,
            }),
      };
      setTasks((prev) => prev.map((t) => (t.id === editingId ? { ...t, ...updatedFields } : t)));
      setTaskLogs((prev) => [
        {
          id: `${editingId}-edited-${Date.now()}`,
          title: form.title.trim(),
          date: form.repeatType === "once" ? form.date : form.startDate,
          time: form.time,
          action: "edited",
        },
        ...prev,
      ]);
      setEditingId(null);
      setError("");
      setTouched({});
      setForm((prev) => ({ ...prev, title: "", description: "", category: "", priority: "", repeatType: "", time: "", date: "" }));
      return;
    }

    const baseTask = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: form.title.trim(),
      description: form.description.trim(),
      category: form.category,
      priority: form.priority,
      repeatType: form.repeatType,
      time: form.time,
    };

    let task = baseTask;
    if (form.repeatType === "once") {
      task = { ...baseTask, date: form.date };
      setSelectedDate(form.date);
      setViewMonth(new Date(parseISODate(form.date).getFullYear(), parseISODate(form.date).getMonth(), 1));
    } else {
      task = {
        ...baseTask,
        startDate: form.startDate,
        endDate: form.neverEnds ? null : form.endDate,
      };
      if (form.repeatType === "weekdays") task.days = form.days;

      setSelectedDate(form.startDate);
      setViewMonth(new Date(parseISODate(form.startDate).getFullYear(), parseISODate(form.startDate).getMonth(), 1));
    }

    setTasks((prev) => [task, ...prev]);
    const logDate = task.repeatType === "once" ? task.date : task.startDate;
    setTaskLogs((prev) => [
      {
        id: `${task.id}-log`,
        title: task.title,
        date: logDate,
        time: task.time,
      },
      ...prev,
    ]);
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

  const handleDelete = (id) => {
    const task = tasks.find((t) => t.id === id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
    setTaskLogs((prev) => [
      { id: `${id}-deleted-${Date.now()}`, title: task.title, date: task.date ?? task.startDate, time: task.time, action: "deleted", deletedItem: task },
      ...prev,
    ]);
    if (editingId === id) setEditingId(null);
  };

  const handleUndoDelete = (logId) => {
    const log = taskLogs.find((l) => l.id === logId);
    if (!log?.deletedItem) return;
    const item = log.deletedItem;
    const nowDate = toISODate(new Date());
    const nowTime = new Date().toTimeString().slice(0, 5);
    let expired = false;
    if (item.repeatType === "once") {
      expired = item.date < nowDate || (item.date === nowDate && item.time < nowTime);
    } else if (!item.neverEnds && item.endDate) {
      expired = item.endDate < nowDate || (item.endDate === nowDate && item.time < nowTime);
    }
    if (expired) {
      setUndoError(`Undo not possible — "${item.title}" has already passed its end date/time.`);
      setTimeout(() => setUndoError(""), 4000);
      return;
    }
    setUndoError("");
    setTasks((prev) => [item, ...prev]);
    setTaskLogs((prev) => prev.filter((l) => l.id !== logId));
  };

  const startEdit = (task) => {
    setEditingId(task.id);
    setForm({
      title: task.title,
      description: task.description ?? "",
      category: task.category,
      priority: task.priority,
      time: task.time,
      repeatType: task.repeatType,
      date: task.date ?? "",
      startDate: task.startDate ?? "",
      endDate: task.endDate ?? "",
      neverEnds: task.endDate == null,
      days: task.days ?? [],
    });
  };

  const handleUpdate = (id) => {
    if (!editForm.title.trim()) return;
    const updatedFields = {
      title: editForm.title.trim(),
      description: editForm.description,
      category: editForm.category,
      priority: editForm.priority,
      time: editForm.time,
      repeatType: editForm.repeatType,
      ...(editForm.repeatType === "once"
        ? { date: editForm.date, startDate: undefined, endDate: undefined, days: undefined }
        : {
            startDate: editForm.startDate,
            endDate: editForm.neverEnds ? null : editForm.endDate,
            days: editForm.repeatType === "weekdays" ? editForm.days : undefined,
            date: undefined,
          }),
    };
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...updatedFields } : t)));
    setTaskLogs((prev) => [
      {
        id: `${id}-edited-${Date.now()}`,
        title: editForm.title.trim(),
        date: editForm.repeatType === "once" ? editForm.date : editForm.startDate,
        time: editForm.time,
        action: "edited",
      },
      ...prev,
    ]);
    setEditingId(null);
  };

  return (
    <div className="space-y-5">
      <div className="mb-5">
        <p className="text-label-lg">Schedule</p>
        <h2 className="mt-2 text-2xl font-bold text-amber-100">Schedule Task</h2>
      </div>

      <div className="schedule-layout">
        <div className="schedule-main journal-scroll rounded-2xl border border-amber-100/10 bg-gradient-to-b from-black/20 to-black/10 p-5 shadow-xl shadow-black/20" style={{ height: SCHEDULE_PANEL_HEIGHT, overflowY: "auto" }}>
          <h3 className="mb-4 text-sm font-semibold text-amber-200">{editingId ? "Edit Task" : "Create Task"}</h3>
          <form className="space-y-3" onSubmit={handleSubmit}>
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
            <div className="grid grid-cols-2 items-start gap-4">
              <div className="space-y-2">
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-stone-400">
                  Category <span className="text-red-400">*</span>
                </label>
                <div className="flex gap-1">
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
                    className="rounded-lg border border-amber-300/25 px-2 py-1 text-[11px] font-semibold text-amber-200 transition hover:border-amber-300/45"
                  >
                    + Category
                  </button>
                </div>
                {showCustomCategory ? (
                  <>
                    <div className="flex gap-2">
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
                    <button type="button" onClick={handleAddCustomCategory} className="rounded-lg border border-amber-400/35 bg-amber-400/10 px-3 py-1.5 text-xs font-semibold text-amber-100 transition hover:bg-amber-400/20">Add</button>
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
                <div className={`flex gap-1.5 rounded-lg p-0.5 transition ${fieldError("priority") ? "ring-1 ring-red-400/50" : ""}`}>
                  {PRIORITIES.map((priority) => (
                    <button
                      key={priority}
                      type="button"
                      onClick={() => handleInputChange("priority", priority)}
                      className={`flex flex-1 items-center justify-center gap-1 whitespace-nowrap rounded-lg border px-1.5 py-1.5 text-[10px] font-semibold transition ${
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-stone-400">
                  Repeat <span className="text-red-400">*</span>
                </label>
                <select
                  id="task-repeat"
                  value={form.repeatType}
                  onChange={(event) => handleInputChange("repeatType", event.target.value)}
                  className={`w-full rounded-lg border bg-stone-900 px-2 py-1.5 text-xs text-stone-100 outline-none transition focus:border-amber-300/35 ${
                    fieldError("repeatType") ? "border-red-400/60" : "border-amber-100/15"
                  }`}
                >
                  <option value="" disabled style={{ backgroundColor: "#1c1917", color: "#6b7280" }}>Select repeat</option>
                  {REPEAT_TYPES.map((type) => (
                    <option key={type.value} value={type.value} style={{ backgroundColor: "#1c1917", color: "#e7e5e4" }}>{type.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-stone-400">
                  Time <span className="text-red-400">*</span>
                </label>
                <input
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
                <input
                  id="task-date"
                  type="date"
                  value={form.date}
                  onChange={(event) => handleInputChange("date", event.target.value)}
                  className={`w-full rounded-lg border bg-white/5 px-3 py-1.5 text-xs text-stone-100 outline-none transition focus:border-amber-300/35 ${
                    fieldError("date") ? "border-red-400/60" : "border-amber-100/15"
                  }`}
                />
              </div>
            ) : (
              <div className="space-y-2 rounded-lg border border-amber-100/10 bg-white/5 p-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-stone-400">Start</label>
                    <input id="task-start" type="date" value={form.startDate} onChange={(e) => handleInputChange("startDate", e.target.value)} className="w-full rounded-lg border border-amber-100/15 bg-white/5 px-2 py-1 text-xs text-stone-100 outline-none transition focus:border-amber-300/35" />
                  </div>
                  {!form.neverEnds && (
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-stone-400">End</label>
                      <input id="task-end" type="date" value={form.endDate} min={form.startDate || undefined} onChange={(e) => handleInputChange("endDate", e.target.value)} className="w-full rounded-lg border border-amber-100/15 bg-white/5 px-2 py-1 text-xs text-stone-100 outline-none transition focus:border-amber-300/35" />
                    </div>
                  )}
                </div>
                <label className="flex items-center gap-2 text-xs text-stone-300">
                  <input type="checkbox" checked={form.neverEnds} onChange={(e) => handleInputChange("neverEnds", e.target.checked)} className="accent-amber-400" />
                  Never End
                </label>
                {form.repeatType === "weekdays" && (
                  <div className="grid grid-cols-7 gap-1">
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

            {error ? <p className="text-xs text-red-300">{error}</p> : null}

            <button
              type="submit"
              className="w-full rounded-lg border border-amber-400/35 bg-gradient-to-r from-amber-400/20 to-orange-400/15 px-4 py-2 text-xs font-semibold text-amber-200 transition hover:from-amber-400/25 hover:to-orange-400/20"
            >
              {editingId ? "Update Task" : "Add Task"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={() => { setEditingId(null); setError(""); setTouched({}); setForm((prev) => ({ ...prev, title: "", description: "", category: "", priority: "", repeatType: "", time: "", date: "" })); }}
                className="mt-1.5 w-full rounded-lg border border-stone-600/40 bg-white/5 px-4 py-2 text-xs font-semibold text-stone-400 transition hover:text-stone-200"
              >
                Cancel Edit
              </button>
            )}
          </form>
        </div>

        {/* All Tasks column */}
        <section className="schedule-all-tasks rounded-2xl border border-amber-100/10 bg-gradient-to-b from-black/20 to-black/10 p-5 shadow-xl shadow-black/20">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-amber-200">All Tasks</p>
              <p className="mt-0.5 text-xs text-stone-400">Every scheduled task at a glance.</p>
              <div className="mt-2 flex items-center gap-1.5">
                {["active", "archive"].map((view) => (
                  <button
                    key={view}
                    type="button"
                    onClick={() => setTasksView(view)}
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
            <span className="rounded-full border border-amber-100/10 bg-white/5 px-3 py-1 text-xs text-stone-300">
              {displayedTasks.length} total
            </span>
          </div>

          <div className="journal-scroll flex-1 space-y-2 overflow-y-auto pr-1">
            {displayedTasks.length === 0 ? (
              <p className="mt-6 text-center text-xs text-stone-500">
                {tasksView === "active" ? "No active tasks yet. Create one to get started." : "No archived tasks yet."}
              </p>
            ) : (
              displayedTasks.map((task) => (
                <article key={task.id} className="rounded-xl border border-amber-100/10 bg-white/5 p-3">
                  {false ? (
                    /* ── Inline edit form ── */
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editForm.title}
                        onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))}
                        className="w-full rounded-lg border border-amber-100/15 bg-black/30 px-2.5 py-1.5 text-sm text-stone-100 outline-none focus:border-amber-300/40"
                      />
                      <input
                        type="text"
                        value={editForm.description}
                        onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                        placeholder="Description"
                        className="w-full rounded-lg border border-amber-100/15 bg-black/30 px-2.5 py-1.5 text-xs text-stone-300 outline-none focus:border-amber-300/40"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <div ref={editCatDropRef} className="relative">
                          <button
                            type="button"
                            onClick={() => setIsEditCatOpen((p) => !p)}
                            className="relative h-9 w-full rounded-lg border border-amber-100/15 bg-stone-900 pl-2 pr-6 text-left text-[11px] text-stone-100 outline-none"
                          >
                            {editForm.category || <span className="text-stone-500">Category</span>}
                            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-stone-400">▾</span>
                          </button>
                          {isEditCatOpen && (
                            <div className="journal-scroll absolute z-50 mt-1 max-h-40 w-full overflow-y-auto rounded-lg border border-amber-100/15 bg-stone-900 py-1 shadow-xl shadow-black/50">
                              {categoryOptions.map((c) => (
                                <button
                                  key={c}
                                  type="button"
                                  onClick={() => { setEditForm((p) => ({ ...p, category: c })); setIsEditCatOpen(false); }}
                                  className={`w-full px-3 py-1.5 text-left text-[11px] transition hover:bg-amber-500/10 hover:text-amber-200 ${
                                    editForm.category === c ? "bg-amber-500/15 text-amber-200" : "text-stone-100"
                                  }`}
                                >
                                  {importantCategories.some((i) => i.toLowerCase() === c.toLowerCase()) ? `${c} ⭐` : c}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        <input
                          type="time"
                          value={editForm.time}
                          onChange={(e) => setEditForm((p) => ({ ...p, time: e.target.value }))}
                          className="rounded-lg border border-amber-100/15 bg-black/30 px-2 py-1.5 text-xs text-stone-100 outline-none"
                        />
                      </div>
                      <div className="flex gap-1.5">
                        {PRIORITIES.map((pr) => (
                          <button
                            key={pr}
                            type="button"
                            onClick={() => setEditForm((p) => ({ ...p, priority: pr }))}
                            className={`flex flex-1 items-center justify-center gap-1 rounded-lg border py-1 text-[10px] font-semibold transition ${
                              editForm.priority === pr ? priorityStyles[pr] : "border-amber-100/15 bg-white/5 text-stone-400"
                            }`}
                          >
                            {pr} {PRIORITY_EMOJI[pr]}
                          </button>
                        ))}
                      </div>
                      {/* Repeat type selector */}
                      <select
                        value={editForm.repeatType}
                        onChange={(e) => setEditForm((p) => ({ ...p, repeatType: e.target.value }))}
                        className="w-full rounded-lg border border-amber-100/15 bg-stone-900 px-2 py-1.5 text-[11px] text-stone-100 outline-none"
                      >
                        {REPEAT_TYPES.map((r) => (
                          <option key={r.value} value={r.value} style={{ backgroundColor: "#1c1917" }}>{r.label}</option>
                        ))}
                      </select>

                      {/* Date fields based on repeat type */}
                      {editForm.repeatType === "once" ? (
                        <input
                          type="date"
                          value={editForm.date}
                          onChange={(e) => setEditForm((p) => ({ ...p, date: e.target.value }))}
                          className="w-full rounded-lg border border-amber-100/15 bg-black/30 px-2 py-1.5 text-xs text-stone-100 outline-none"
                        />
                      ) : (
                        <div className="space-y-1.5 rounded-lg border border-amber-100/10 bg-white/[0.03] p-2">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <p className="mb-1 text-[10px] uppercase tracking-wide text-stone-500">Start</p>
                              <input
                                type="date"
                                value={editForm.startDate}
                                onChange={(e) => setEditForm((p) => ({ ...p, startDate: e.target.value }))}
                                className="w-full rounded-lg border border-amber-100/15 bg-black/30 px-2 py-1 text-[11px] text-stone-100 outline-none"
                              />
                            </div>
                            {!editForm.neverEnds && (
                              <div>
                                <p className="mb-1 text-[10px] uppercase tracking-wide text-stone-500">End</p>
                                <input
                                  type="date"
                                  value={editForm.endDate}
                                  min={editForm.startDate || undefined}
                                  onChange={(e) => setEditForm((p) => ({ ...p, endDate: e.target.value }))}
                                  className="w-full rounded-lg border border-amber-100/15 bg-black/30 px-2 py-1 text-[11px] text-stone-100 outline-none"
                                />
                              </div>
                            )}
                          </div>
                          <label className="flex items-center gap-2 text-[11px] text-stone-300">
                            <input
                              type="checkbox"
                              checked={editForm.neverEnds}
                              onChange={(e) => setEditForm((p) => ({ ...p, neverEnds: e.target.checked }))}
                              className="accent-amber-400"
                            />
                            Never End
                          </label>
                          {editForm.repeatType === "weekdays" && (
                            <div className="grid grid-cols-7 gap-1 pt-1">
                              {WEEK_DAYS.map((day) => (
                                <button
                                  key={day}
                                  type="button"
                                  onClick={() =>
                                    setEditForm((p) => ({
                                      ...p,
                                      days: p.days.includes(day)
                                        ? p.days.filter((d) => d !== day)
                                        : [...p.days, day],
                                    }))
                                  }
                                  className={`rounded border py-1 text-[10px] font-semibold transition ${
                                    editForm.days.includes(day)
                                      ? "border-amber-300/55 bg-amber-400/15 text-amber-100"
                                      : "border-amber-100/15 bg-white/5 text-stone-300"
                                  }`}
                                >
                                  {day}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleUpdate(task.id)}
                          className="flex-1 rounded-lg border border-amber-300/30 bg-amber-400/10 py-1.5 text-[11px] font-semibold text-amber-200 transition hover:bg-amber-400/20"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="flex-1 rounded-lg border border-amber-100/15 bg-white/5 py-1.5 text-[11px] font-semibold text-stone-400 transition hover:text-stone-200"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* ── Normal card view ── */
                    <>
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-stone-100">{task.title}</p>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${priorityStyles[task.priority]}`}>
                            {task.priority}
                          </span>
                          {!isArchiveView && (
                            <button
                              type="button"
                              onClick={() => startEdit(task)}
                              className="rounded border border-amber-300/25 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold text-amber-200 transition hover:bg-amber-400/20"
                            >
                              Edit
                            </button>
                          )}
                          {!isArchiveView && (
                            <button
                              type="button"
                              onClick={() => handleDelete(task.id)}
                              className="rounded border border-rose-400/25 bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-300 transition hover:bg-rose-500/20"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                      {task.description ? (
                        <p className="mt-1 text-xs text-stone-400">{task.description}</p>
                      ) : null}
                      <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[11px] text-stone-300">
                        <span className="rounded-full border border-amber-100/10 bg-black/20 px-2 py-0.5">{task.category}</span>
                        <span className="rounded-full border border-amber-100/10 bg-black/20 px-2 py-0.5">
                          {REPEAT_TYPES.find((r) => r.value === task.repeatType)?.label ?? task.repeatType}
                        </span>
                        <span className="rounded-full border border-amber-100/10 bg-black/20 px-2 py-0.5">
                          {(() => {
                            const [h, m] = task.time.split(":").map(Number);
                            const d = new Date();
                            d.setHours(h, m);
                            return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
                          })()}
                        </span>
                        <span className="rounded-full border border-amber-100/10 bg-black/20 px-2 py-0.5">
                          {task.repeatType === "once" ? task.date : task.startDate}
                        </span>
                        {task.repeatType !== "once" && (
                          <span className={`rounded-full border px-2 py-0.5 font-semibold ${task.endDate ? "border-rose-400/25 bg-rose-500/10 text-rose-200" : "border-emerald-400/25 bg-emerald-500/10 text-emerald-200"}`}>
                            {task.endDate ? `Ends ${task.endDate}` : "Never Ends"}
                          </span>
                        )}
                        {task.repeatType === "weekdays" && task.days?.map((day) => (
                          <span key={day} className="rounded-full border border-amber-300/25 bg-amber-500/10 px-2 py-0.5 font-semibold text-amber-200">
                            {DAY_SHORT[day]}
                          </span>
                        ))}
                      </div>
                    </>
                  )}
                </article>
              ))
            )}
          </div>
        </section>

        <aside className="schedule-sidebar">
          <div className="flex flex-col gap-0 rounded-2xl border border-amber-100/10 bg-gradient-to-b from-black/20 to-black/10 p-4 shadow-xl shadow-black/20" style={{ height: SCHEDULE_PANEL_HEIGHT }}>

            {/* Calendar */}
            <section className="shrink-0">
              <div className="mb-3 flex items-center justify-between">
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
                  <div key={day} className="py-1 text-[10px] font-semibold">{day}</div>
                ))}
                {calendarCells.map((cellDate, idx) => {
                  if (!cellDate) return <div key={`empty-${idx}`} className="h-8 rounded" />;
                  const isoDate = toISODate(cellDate);
                  const count = tasks.reduce((acc, task) => (isTaskOnDate(task, isoDate) ? acc + 1 : acc), 0);
                  const isToday = isoDate === today;
                  const isSelected = isoDate === selectedDate;
                  return (
                    <button
                      key={isoDate}
                      type="button"
                      onClick={() => setSelectedDate(isoDate)}
                      className={`relative h-8 rounded text-xs transition ${
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
            </section>

            {/* Divider */}
            <div className="my-3 shrink-0 border-t border-amber-100/10" />

            {/* Task Logs — fills remaining height */}
            <section className="flex min-h-0 flex-1 flex-col">
              <p className="mb-2 shrink-0 text-sm font-semibold tracking-wide text-amber-200">Task Logs</p>
              {undoError && (
                <p className="mb-2 shrink-0 rounded-md border border-rose-400/30 bg-rose-500/10 px-2 py-1.5 text-[11px] text-rose-300">{undoError}</p>
              )}
              {allLogs.length === 0 ? (
                <p className="text-sm text-stone-400">No task logs yet.</p>
              ) : (
                <div className="journal-scroll min-h-0 flex-1 space-y-1.5 overflow-x-hidden overflow-y-auto scroll-smooth pr-1">
                  {allLogs.map((log) => (
                    <div key={log.id} className={`flex items-center justify-between gap-2 rounded-md border px-2 py-1.5 text-[11px] ${
                      log.action === "deleted"
                        ? "border-rose-400/20 bg-rose-500/5 text-stone-300"
                        : log.action === "edited"
                        ? "border-amber-300/20 bg-amber-500/5 text-stone-300"
                        : log.action === "ended"
                        ? "border-blue-400/20 bg-blue-500/5 text-stone-300"
                        : "border-amber-100/10 bg-white/5 text-stone-200"
                    }`}>
                      <p className="min-w-0 flex-1">
                        <span className={`font-semibold ${
                          log.action === "deleted" ? "text-rose-300"
                          : log.action === "edited" ? "text-amber-200"
                          : log.action === "ended" ? "text-blue-300"
                          : "text-emerald-300"
                        }`}>
                          {log.action === "deleted" ? "Deleted"
                            : log.action === "edited" ? "Edited"
                            : log.action === "ended" ? "Ended"
                            : "Created"}:
                        </span>{" "}
                        <span className="break-all font-semibold text-stone-100">{log.title}</span> on {log.date} at {formatLogTime(log.time)}
                      </p>
                      {log.action === "deleted" && log.deletedItem && (
                        <button
                          type="button"
                          onClick={() => handleUndoDelete(log.id)}
                          className="shrink-0 rounded border border-rose-400/30 bg-rose-500/10 px-1.5 py-0.5 text-[11px] font-semibold text-rose-300 transition hover:bg-rose-500/20"
                          title="Undo delete"
                        >
                          ↺
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

          </div>
        </aside>
      </div>
    </div>
  );
}
