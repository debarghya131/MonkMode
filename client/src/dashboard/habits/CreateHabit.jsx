import { motion as Motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";

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
const fmtTime = (t) => {
  if (!t) return "--";
  const [h, m] = t.split(":").map(Number);
  const d = new Date(); d.setHours(h, m);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
};

const PANEL_H = "650px";

/* ─── Component ─────────────────────────────────────── */
export default function CreateHabit({ entity = "habit" }) {
  const today = useMemo(() => toISO(new Date()), []);
  const isGoal = entity === "goal";
  const singular = isGoal ? "Goal" : "Habit";
  const plural = isGoal ? "Goals" : "Habits";
  const lowerSingular = singular.toLowerCase();
  const lowerPlural = plural.toLowerCase();

  /* category dropdowns */
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

  /* categories */
  const [categoryOptions, setCategoryOptions] = useState(DEFAULT_CATEGORIES);
  const [showCustomCat, setShowCustomCat] = useState(false);
  const [customCat, setCustomCat] = useState("");
  const [catError, setCatError] = useState("");
  const [catDeleteError, setCatDeleteError] = useState("");

  /* habits list */
  const [habits, setHabits] = useState(() => [
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
  ]);
  const [habitLogs, setHabitLogs] = useState(() => [
    { id: "demo-habit-log-1", title: "DSA", date: today, time: "11:01" },
    { id: "demo-habit-log-2", title: "Evening Walk", date: today, time: "19:00", action: "edited" },
    { id: "demo-habit-log-3", title: "Meditation", date: today, time: "06:45", action: "deleted" },
  ]);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

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
  const { activeHabits, endedLogs } = useMemo(() => {
    const active = [], ended = [];
    habits.forEach((h) => {
      if (h.endDate && h.endDate < today)
        ended.push({ id: `${h.id}-ended`, title: h.title, date: h.endDate, time: h.time, action: "ended" });
      else active.push(h);
    });
    return { activeHabits: active, endedLogs: ended };
  }, [habits, today]);

  const allLogs = useMemo(() => [...endedLogs, ...habitLogs], [endedLogs, habitLogs]);
  const sortedActiveHabits = useMemo(() => {
    return [...activeHabits].sort((a, b) => Number(Boolean(b.isImportant)) - Number(Boolean(a.isImportant)));
  }, [activeHabits]);
  const sortedArchivedHabits = useMemo(() => {
    const archived = habits.filter((h) => h.endDate && h.endDate < today);
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
    if (editingId) setEditForm((p) => ({ ...p, category: p.category?.toLowerCase() === name.toLowerCase() ? "" : p.category }));
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
    if (!form.neverEnds && form.endDate < form.startDate) return "End date cannot be before start date.";
    if (form.repeatType === "weekdays" && form.days.length === 0) return "Select at least one day.";
    return "";
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setTouched({ title:true, timeOfDay:true, category:true, priority:true, repeatType:true, time:true, startDate:true });
    const err = validate();
    if (err) { setError(err); return; }

    if (editingId) {
      const fixedDays2 = FIXED_DURATION[form.repeatType];
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
      setHabits((p) => p.map((h) => h.id === editingId ? { ...h, ...updated } : h));
      setHabitLogs((p) => [{ id:`${editingId}-edit-${Date.now()}`, title:form.title.trim(), date:form.startDate, time:form.time, action:"edited" }, ...p]);
      setEditingId(null);
      setError(""); setTouched({});
      setForm((p) => ({ ...p, title:"", reason:"", targetStreak:"", timeOfDay:"", category:"", priority:"", repeatType:"", time:"" }));
      return;
    }

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
    const fixedDays = FIXED_DURATION[form.repeatType];
    const habit = fixedDays
      ? { ...base, startDate: form.startDate, endDate: fixedEndDate(fixedDays, form.startDate) }
      : { ...base, startDate: form.startDate, endDate: form.neverEnds ? null : form.endDate,
          ...(form.repeatType === "weekdays" ? { days: form.days } : {}) };

    setHabits((p) => [habit, ...p]);
    const logDate = habit.startDate;
    setHabitLogs((p) => [{ id: `${habit.id}-log`, title: habit.title, date: logDate, time: habit.time }, ...p]);
    setSelectedDate(logDate);
    setViewMonth(new Date(parseISO(logDate).getFullYear(), parseISO(logDate).getMonth(), 1));
    setError(""); setTouched({});
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
  };

  const handleDelete = (id) => {
    const h = habits.find((x) => x.id === id);
    setHabits((p) => p.filter((x) => x.id !== id));
    setHabitLogs((p) => [{ id:`${id}-del-${Date.now()}`, title:h.title, date:h.startDate, time:h.time, action:"deleted", deletedItem:h }, ...p]);
    if (editingId === id) setEditingId(null);
  };

  const handleUndoDelete = (logId) => {
    const log = habitLogs.find((l) => l.id === logId);
    if (!log?.deletedItem) return;
    const item = log.deletedItem;
    const nowDate = toISO(new Date());
    const nowTime = new Date().toTimeString().slice(0, 5);
    const expired = item.endDate && (
      item.endDate < nowDate || (item.endDate === nowDate && item.time < nowTime)
    );
    if (expired) {
      setUndoError(`Undo not possible — "${item.title}" has already passed its end date/time.`);
      setTimeout(() => setUndoError(""), 4000);
      return;
    }
    setUndoError("");
    setHabits((p) => [item, ...p]);
    setHabitLogs((p) => p.filter((l) => l.id !== logId));
  };

  const toggleHabitImportant = (id) => {
    setHabits((p) => p.map((h) => (h.id === id ? { ...h, isImportant: !h.isImportant } : h)));
  };

  const startEdit = (h) => {
    setEditingId(h.id);
    setForm({ title:h.title, reason:h.reason??h.description??"", targetStreak:h.targetStreak??"", timeOfDay:h.timeOfDay??"", category:h.category, priority:h.priority,
      time:h.time, repeatType:h.repeatType, startDate:h.startDate??"",
      endDate:h.endDate??"", neverEnds:h.endDate==null, days:h.days??[] });
  };

  const handleUpdate = (id) => {
    if (!editForm.title.trim()) return;
    if (editForm.targetStreak && Number(editForm.targetStreak) < 1) return;
    const updated = {
      title: editForm.title.trim(),
      reason: editForm.reason,
      targetStreak: editForm.targetStreak ? Number(editForm.targetStreak) : null,
      timeOfDay: editForm.timeOfDay,
      category: editForm.category, priority: editForm.priority,
      time: editForm.time, repeatType: editForm.repeatType,
      ...(FIXED_DURATION[editForm.repeatType]
        ? { startDate:editForm.startDate, endDate:fixedEndDate(FIXED_DURATION[editForm.repeatType], editForm.startDate), days:undefined }
        : { startDate:editForm.startDate, endDate:editForm.neverEnds?null:editForm.endDate,
            days: editForm.repeatType==="weekdays"?editForm.days:undefined }),
    };
    setHabits((p) => p.map((h) => h.id===id ? {...h,...updated} : h));
    setHabitLogs((p) => [{ id:`${id}-edit-${Date.now()}`, title:editForm.title.trim(),
      date:editForm.startDate, time:editForm.time, action:"edited" }, ...p]);
    setEditingId(null);
  };

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
          className="schedule-main journal-scroll rounded-2xl border border-amber-100/10 bg-gradient-to-b from-black/20 to-black/10 p-5 shadow-xl shadow-black/20"
          style={{ height: PANEL_H, overflowY: "auto" }}
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
            <div className="grid grid-cols-2 gap-3">
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
                <div className="flex gap-1">
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
                    className="rounded-lg border border-amber-300/25 px-2 py-1 text-[11px] font-semibold text-amber-200 transition hover:border-amber-300/45"
                  >
                    + Category
                  </button>
                </div>

                {showCustomCat && (
                  <>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={customCat}
                        onChange={(e) => { setCustomCat(e.target.value); if (catError) setCatError(""); }}
                        onKeyDown={(e) => { if (e.key==="Enter") { e.preventDefault(); addCustomCategory(); } }}
                        placeholder="Custom category"
                        className="flex-1 rounded-lg border border-amber-100/15 bg-white/5 px-3 py-1.5 text-xs text-stone-100 outline-none transition focus:border-amber-300/35"
                      />
                      <button type="button" onClick={addCustomCategory}
                        className="rounded-lg border border-amber-400/35 bg-amber-400/10 px-3 py-1.5 text-xs font-semibold text-amber-100 transition hover:bg-amber-400/20">
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
                  className={`w-full rounded-lg border bg-stone-900 px-2 py-1.5 text-xs text-stone-100 outline-none transition focus:border-amber-300/35 ${fieldErr("repeatType") ? "border-red-400/60" : "border-amber-100/15"}`}
                >
                  <option value="" disabled style={{ backgroundColor:"#1c1917", color:"#6b7280" }}>Select repeat</option>
                  {REPEAT_TYPES.map((r) => (
                    <option key={r.value} value={r.value} style={{ backgroundColor:"#1c1917", color:"#e7e5e4" }}>{r.label}</option>
                  ))}
                </select>
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
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-stone-400">Start Date <span className="text-red-400">*</span></label>
                    <input type="date" value={form.startDate} onChange={(e) => setField("startDate", e.target.value)}
                      className="w-full rounded-lg border border-amber-100/15 bg-white/5 px-2 py-1 text-xs text-stone-100 outline-none transition focus:border-amber-300/35" />
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-stone-400">End Date (Auto)</label>
                    <input type="date" value={fixedEndDate(FIXED_DURATION[form.repeatType], form.startDate)} readOnly
                      className="w-full cursor-not-allowed rounded-lg border border-amber-100/10 bg-white/[0.03] px-2 py-1 text-xs text-stone-400 outline-none" />
                  </div>
                </div>
                <p className="text-[10px] text-amber-300/60">End date is automatically set {FIXED_DURATION[form.repeatType]} days from the start date.</p>
              </div>
            ) : form.repeatType ? (
              <div className="space-y-2 rounded-lg border border-amber-100/10 bg-white/5 p-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-stone-400">Start</label>
                    <input type="date" value={form.startDate} onChange={(e) => setField("startDate", e.target.value)}
                      className="w-full rounded-lg border border-amber-100/15 bg-white/5 px-2 py-1 text-xs text-stone-100 outline-none transition focus:border-amber-300/35" />
                  </div>
                  {!form.neverEnds && (
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-stone-400">End</label>
                      <input type="date" value={form.endDate} min={form.startDate||undefined} onChange={(e) => setField("endDate", e.target.value)}
                        className="w-full rounded-lg border border-amber-100/15 bg-white/5 px-2 py-1 text-xs text-stone-100 outline-none transition focus:border-amber-300/35" />
                    </div>
                  )}
                </div>
                <label className="flex items-center gap-2 text-xs text-stone-300">
                  <input type="checkbox" checked={form.neverEnds} onChange={(e) => setField("neverEnds", e.target.checked)} className="accent-amber-400" />
                  Never End
                </label>
                {form.repeatType === "weekdays" && (
                  <div className="grid grid-cols-7 gap-1">
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
              className="w-full rounded-lg border border-amber-400/35 bg-gradient-to-r from-amber-400/20 to-orange-400/15 px-4 py-2 text-xs font-semibold text-amber-200 transition hover:from-amber-400/25 hover:to-orange-400/20">
              {editingId ? `Update ${singular}` : `Add ${singular}`}
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
        <section className="schedule-all-tasks rounded-2xl border border-amber-100/10 bg-gradient-to-b from-black/20 to-black/10 p-5 shadow-xl shadow-black/20" style={{ height: PANEL_H }}>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-amber-200">{`All ${plural}`}</p>
              <p className="mt-0.5 text-xs text-stone-400">{`Every scheduled ${lowerSingular} at a glance.`}</p>
              <div className="mt-2 flex items-center gap-1.5">
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
              displayedHabits.map((h, i) => (
                <Motion.article
                  key={h.id}
                  className="rounded-xl border border-amber-100/10 bg-white/5 p-3"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.22 }}
                  whileHover={{ y: -2, boxShadow: "0 8px 20px rgba(0,0,0,0.35)", borderColor: "rgba(251,191,36,0.2)" }}
                >
                  {false ? (
                    /* ── Inline edit ── */
                    <div className="space-y-2">
                      <input type="text" value={editForm.title}
                        onChange={(e) => setEditForm((p) => ({...p, title:e.target.value}))}
                        className="w-full rounded-lg border border-amber-100/15 bg-black/30 px-2.5 py-1.5 text-sm text-stone-100 outline-none focus:border-amber-300/40" />
                      <input type="text" value={editForm.reason}
                        onChange={(e) => setEditForm((p) => ({...p, reason:e.target.value}))}
                        placeholder="Reason / Purpose"
                        className="w-full rounded-lg border border-amber-100/15 bg-black/30 px-2.5 py-1.5 text-xs text-stone-300 outline-none focus:border-amber-300/40" />
                      <div className="grid grid-cols-2 gap-2">
                        <input type="number" min={1} value={editForm.targetStreak}
                          onChange={(e) => setEditForm((p) => ({...p, targetStreak:e.target.value}))}
                          placeholder="Target streak (days)"
                          className="rounded-lg border border-amber-100/15 bg-black/30 px-2 py-1.5 text-xs text-stone-100 outline-none" />
                        <select value={editForm.timeOfDay}
                          onChange={(e) => setEditForm((p) => ({...p, timeOfDay:e.target.value}))}
                          className="rounded-lg border border-amber-100/15 bg-stone-900 px-2 py-1.5 text-[11px] text-stone-100 outline-none">
                          <option value="" style={{backgroundColor:"#1c1917"}}>Time of day</option>
                          {TIME_OF_DAY_OPTIONS.map((tod) => (
                            <option key={tod} value={tod} style={{backgroundColor:"#1c1917"}}>{tod}</option>
                          ))}
                        </select>
                      </div>
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
                                  onClick={() => { setEditForm((p) => ({...p, category:c})); setIsEditCatOpen(false); }}
                                  className={`w-full px-3 py-1.5 text-left text-[11px] transition hover:bg-amber-500/10 hover:text-amber-200 ${editForm.category === c ? "bg-amber-500/15 text-amber-200" : "text-stone-100"}`}
                                >
                                  {c}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        <input type="time" value={editForm.time}
                          onChange={(e) => setEditForm((p) => ({...p, time:e.target.value}))}
                          className="rounded-lg border border-amber-100/15 bg-black/30 px-2 py-1.5 text-xs text-stone-100 outline-none" />
                      </div>
                      <div className="flex gap-1.5">
                        {PRIORITIES.map((pr) => (
                          <button key={pr} type="button" onClick={() => setEditForm((p) => ({...p, priority:pr}))}
                            className={`flex flex-1 items-center justify-center gap-1 rounded-lg border py-1 text-[10px] font-semibold transition ${editForm.priority===pr ? PRIORITY_STYLES[pr] : "border-amber-100/15 bg-white/5 text-stone-400"}`}>
                            {pr} {PRIORITY_EMOJI[pr]}
                          </button>
                        ))}
                      </div>
                      <select value={editForm.repeatType} onChange={(e) => setEditForm((p) => ({...p, repeatType:e.target.value}))}
                        className="w-full rounded-lg border border-amber-100/15 bg-stone-900 px-2 py-1.5 text-[11px] text-stone-100 outline-none">
                        {REPEAT_TYPES.map((r) => <option key={r.value} value={r.value} style={{backgroundColor:"#1c1917"}}>{r.label}</option>)}
                      </select>
                      {FIXED_DURATION[editForm.repeatType] ? (
                        <div className="space-y-1.5 rounded-lg border border-amber-100/10 bg-white/[0.03] p-2">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <p className="mb-1 text-[10px] uppercase tracking-wide text-stone-500">Start</p>
                              <input type="date" value={editForm.startDate}
                                onChange={(e) => setEditForm((p) => ({...p, startDate:e.target.value}))}
                                className="w-full rounded-lg border border-amber-100/15 bg-black/30 px-2 py-1 text-[11px] text-stone-100 outline-none" />
                            </div>
                            <div>
                              <p className="mb-1 text-[10px] uppercase tracking-wide text-stone-500">End (Auto)</p>
                              <input type="date" value={fixedEndDate(FIXED_DURATION[editForm.repeatType], editForm.startDate)} readOnly
                                className="w-full cursor-not-allowed rounded-lg border border-amber-100/10 bg-black/20 px-2 py-1 text-[11px] text-stone-400 outline-none" />
                            </div>
                          </div>
                          <p className="text-[10px] text-amber-300/60">Auto-calculated: {FIXED_DURATION[editForm.repeatType]} days from start.</p>
                        </div>
                      ) : (
                        <div className="space-y-1.5 rounded-lg border border-amber-100/10 bg-white/[0.03] p-2">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <p className="mb-1 text-[10px] uppercase tracking-wide text-stone-500">Start</p>
                              <input type="date" value={editForm.startDate}
                                onChange={(e) => setEditForm((p) => ({...p, startDate:e.target.value}))}
                                className="w-full rounded-lg border border-amber-100/15 bg-black/30 px-2 py-1 text-[11px] text-stone-100 outline-none" />
                            </div>
                            {!editForm.neverEnds && (
                              <div>
                                <p className="mb-1 text-[10px] uppercase tracking-wide text-stone-500">End</p>
                                <input type="date" value={editForm.endDate} min={editForm.startDate||undefined}
                                  onChange={(e) => setEditForm((p) => ({...p, endDate:e.target.value}))}
                                  className="w-full rounded-lg border border-amber-100/15 bg-black/30 px-2 py-1 text-[11px] text-stone-100 outline-none" />
                              </div>
                            )}
                          </div>
                          <label className="flex items-center gap-2 text-[11px] text-stone-300">
                            <input type="checkbox" checked={editForm.neverEnds}
                              onChange={(e) => setEditForm((p) => ({...p, neverEnds:e.target.checked}))} className="accent-amber-400" />
                            Never End
                          </label>
                          {editForm.repeatType === "weekdays" && (
                            <div className="grid grid-cols-7 gap-1 pt-1">
                              {WEEK_DAYS.map((d) => (
                                <button key={d} type="button"
                                  onClick={() => setEditForm((p) => ({...p, days: p.days.includes(d) ? p.days.filter((x) => x!==d) : [...p.days,d]}))}
                                  className={`rounded border py-1 text-[10px] font-semibold transition ${editForm.days.includes(d) ? "border-amber-300/55 bg-amber-400/15 text-amber-100" : "border-amber-100/15 bg-white/5 text-stone-300"}`}>
                                  {d}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      <div className="flex gap-2 pt-1">
                        <button type="button" onClick={() => handleUpdate(h.id)}
                          className="flex-1 rounded-lg border border-amber-300/30 bg-amber-400/10 py-1.5 text-[11px] font-semibold text-amber-200 transition hover:bg-amber-400/20">
                          Save
                        </button>
                        <button type="button" onClick={() => setEditingId(null)}
                          className="flex-1 rounded-lg border border-amber-100/15 bg-white/5 py-1.5 text-[11px] font-semibold text-stone-400 transition hover:text-stone-200">
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* ── Normal card ── */
                    <>
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="min-w-0 flex-1 truncate text-sm font-semibold text-stone-100">{h.title}</p>
                        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
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
                              className="rounded border border-rose-400/25 bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-300 transition hover:bg-rose-500/20">
                              Delete
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
                        <span className="rounded-full border border-amber-100/10 bg-black/20 px-2 py-0.5">{fmtTime(h.time)}</span>
                        <span className="rounded-full border border-amber-100/10 bg-black/20 px-2 py-0.5">
                          {h.startDate}
                        </span>
                        <span className={`rounded-full border px-2 py-0.5 font-semibold ${h.endDate ? "border-rose-400/25 bg-rose-500/10 text-rose-200" : "border-emerald-400/25 bg-emerald-500/10 text-emerald-200"}`}>
                          {h.endDate ? `Ends ${h.endDate}` : "Never Ends"}
                        </span>
                        {h.repeatType==="weekdays" && h.days?.map((d) => (
                          <span key={d} className="rounded-full border border-amber-300/25 bg-amber-500/10 px-2 py-0.5 font-semibold text-amber-200">
                            {DAY_SHORT[d]}
                          </span>
                        ))}
                      </div>
                    </>
                  )}
                </Motion.article>
              ))
            )}
          </div>
        </section>

        {/* ── Column 3 : Calendar + Habit Log ── */}
        <aside className="schedule-sidebar">
          <div className="flex flex-col gap-0 rounded-2xl border border-amber-100/10 bg-gradient-to-b from-black/20 to-black/10 p-4 shadow-xl shadow-black/20"
            style={{ height: PANEL_H }}>

            {/* Calendar */}
            <section className="shrink-0">
              <div className="mb-3 flex items-center justify-between">
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
                  const count = habits.reduce((acc, h) => isHabitOnDate(h, iso) ? acc+1 : acc, 0);
                  const isToday = iso === today;
                  const isSel = iso === selectedDate;
                  return (
                    <button key={iso} type="button" onClick={() => setSelectedDate(iso)}
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
                  {allLogs.map((log) => (
                    <div key={log.id} className={`flex items-center justify-between gap-2 rounded-md border px-2 py-1.5 text-[11px] ${
                      log.action==="deleted" ? "border-rose-400/20 bg-rose-500/5 text-stone-300"
                      : log.action==="edited" ? "border-amber-300/20 bg-amber-500/5 text-stone-300"
                      : log.action==="ended" ? "border-blue-400/20 bg-blue-500/5 text-stone-300"
                      : "border-amber-100/10 bg-white/5 text-stone-200"
                    }`}>
                      <p className="min-w-0 flex-1">
                        <span className={`font-semibold ${
                          log.action==="deleted" ? "text-rose-300"
                          : log.action==="edited" ? "text-amber-200"
                          : log.action==="ended" ? "text-blue-300"
                          : "text-emerald-300"
                        }`}>
                          {log.action==="deleted" ? "Deleted" : log.action==="edited" ? "Edited" : log.action==="ended" ? "Ended" : "Created"}:
                        </span>{" "}
                        <span className="break-all font-semibold text-stone-100">{log.title}</span> on {log.date} at {fmtTime(log.time)}
                      </p>
                      {log.action==="deleted" && log.deletedItem && (
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
