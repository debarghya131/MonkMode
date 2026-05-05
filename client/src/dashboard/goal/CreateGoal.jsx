import { motion as Motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import api from "../../api/axios";
import useAuth from "../../hooks/useAuth";

const PANEL_H = "620px";

const GOAL_TYPES = [
  {
    value: "short-term",
    label: "🎯 Short-term",
    helper: "1 week - 1 month",
  },
  {
    value: "long-term",
    label: "🚀 Long-term",
    helper: "3 - 12 months",
  },
];

const PRIORITIES = ["High", "Medium", "Low"];
const PRIORITY_STYLES = {
  High: "border-red-400/40 text-red-200 bg-red-500/10",
  Medium: "border-yellow-400/40 text-yellow-200 bg-yellow-500/10",
  Low: "border-green-400/40 text-green-200 bg-green-500/10",
};
const PRIORITY_DOT_STYLES = {
  High: "bg-red-400",
  Medium: "bg-yellow-400",
  Low: "bg-green-400",
};

const toISO = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const addDaysToISO = (startISO, n) => {
  const [y, m, d] = startISO.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + n);
  return toISO(date);
};

const currentTime = () => {
  const d = new Date();
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
};

const fmtTime = (t) => {
  if (!t) return "--";
  const [h, m] = t.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
};

const addMonthsToISO = (startISO, months) => {
  const [y, m, d] = startISO.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setMonth(date.getMonth() + months);
  return toISO(date);
};

const getMinimumDeadlineByType = (startDate, goalType) => {
  if (!startDate) return "";
  if (goalType === "long-term") return addMonthsToISO(startDate, 3);
  return addDaysToISO(startDate, 7);
};

const formatUndoCountdown = (remainingMs) => {
  const ms = Math.max(0, Number(remainingMs) || 0);
  if (ms <= 0) return "Undo window expired";
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `Undo in ${hours}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`;
};

const normalizeGoal = (goal) => {
  const id = goal?.id || goal?._id || "";
  const startDate = toISO(goal?.startDate ? new Date(goal.startDate) : new Date());
  const deadline = goal?.deadline ? toISO(new Date(goal.deadline)) : "";
  return {
    ...goal,
    id,
    startDate,
    deadline,
    goalType: goal?.goalType || "short-term",
    priority: goal?.priority || "Medium",
    title: goal?.title || "",
    description: goal?.description || ""
  };
};

const buildDemoGoals = (today) => [
  {
    id: "demo-goal-1",
    title: "Crack GATE 2027",
    description: "Complete syllabus + PYQs with weekly revisions.",
    goalType: "long-term",
    startDate: addDaysToISO(today, -25),
    deadline: addDaysToISO(today, 260),
    priority: "High"
  },
  {
    id: "demo-goal-2",
    title: "Learn Web Dev",
    description: "Finish React + backend basics and ship 2 projects.",
    goalType: "short-term",
    startDate: addDaysToISO(today, -8),
    deadline: addDaysToISO(today, 24),
    priority: "Medium"
  },
  {
    id: "demo-goal-3-archived",
    title: "30-Day DSA Sprint",
    description: "Solved 120 curated questions in 30 days.",
    goalType: "short-term",
    startDate: addDaysToISO(today, -45),
    deadline: addDaysToISO(today, -8),
    priority: "Low"
  }
];

const buildDemoLogs = (today) => [
  {
    id: "demo-goal-log-1",
    action: "created",
    title: "Crack GATE 2027",
    date: addDaysToISO(today, -25),
    time: "06:30"
  },
  {
    id: "demo-goal-log-2",
    action: "updated",
    title: "Learn Web Dev",
    date: addDaysToISO(today, -3),
    time: "20:15"
  },
  {
    id: "demo-goal-log-3",
    action: "archived",
    title: "30-Day DSA Sprint",
    date: addDaysToISO(today, -8),
    time: "21:00"
  }
];
const emitGoalsUpdated = () => {
  window.dispatchEvent(new Event("monkmode:goals-updated"));
};

export default function CreateGoal({ onGoalChanged }) {
  const { isDemoMode } = useAuth();
  const today = useMemo(() => toISO(new Date()), []);
  const [error, setError] = useState("");
  const [undoError, setUndoError] = useState("");
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    title: "",
    description: "",
    goalType: "",
    startDate: today,
    deadline: "",
    priority: "",
  });
  const [goals, setGoals] = useState([]);
  const [goalLogs, setGoalLogs] = useState([]);
  const [goalsView, setGoalsView] = useState("active");
  const [editingId, setEditingId] = useState(null);
  const [archiveEditGoal, setArchiveEditGoal] = useState(null);
  const [archiveEditForm, setArchiveEditForm] = useState({});
  const [archiveDeleteId, setArchiveDeleteId] = useState(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const fetchGoalData = async () => {
    if (isDemoMode) {
      setGoals(buildDemoGoals(today));
      setGoalLogs(buildDemoLogs(today));
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [{ data: goalsData }, { data: logsData }] = await Promise.all([
        api.get("/goals"),
        api.get("/goals/logs")
      ]);

      const normalizedGoals = Array.isArray(goalsData) ? goalsData.map(normalizeGoal) : [];
      const normalizedLogs = Array.isArray(logsData) ? logsData : [];
      setGoals(normalizedGoals);
      setGoalLogs(normalizedLogs);
    } catch (fetchError) {
      console.error("Failed to fetch goal data:", fetchError);
      setGoals([]);
      setGoalLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoalData();
  }, [isDemoMode, today]);

  useEffect(() => {
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const activeGoals = goals.filter((goal) => !goal.deletedAt && goal.deadline >= today);
  const archivedGoals = goals.filter((goal) => goal.deletedAt || goal.deadline < today);
  const displayedGoals = goalsView === "active" ? activeGoals : archivedGoals;
  const editingGoal = editingId ? goals.find((goal) => goal.id === editingId) : null;
  const isEditingStartedGoal = Boolean(editingGoal?.startDate && editingGoal.startDate <= today);
  const isArchiveEditStartedGoal = Boolean(archiveEditGoal?.startDate && archiveEditGoal.startDate <= today);
  const minimumDeadline = getMinimumDeadlineByType(form.startDate, form.goalType);

  const setField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (error) setError("");
  };

  const validate = () => {
    if (!form.title.trim()) return "Goal title is required.";
    if (!form.goalType) return "Goal type is required.";
    if (!form.startDate) return "Start date is required.";
    if (!form.deadline) return "Deadline is required.";
    if (form.deadline < form.startDate) return "Deadline cannot be before start date.";
    if (form.goalType === "short-term" && form.deadline < addDaysToISO(form.startDate, 7)) {
      return "Short-term goal deadline must be at least 1 week after start date.";
    }
    if (form.goalType === "long-term" && form.deadline < addMonthsToISO(form.startDate, 3)) {
      return "Long-term goal deadline must be at least 3 months after start date.";
    }
    if (!form.priority) return "Priority level is required.";
    return "";
  };

  const resetForm = () => {
    setForm({
      title: "",
      description: "",
      goalType: "",
      startDate: today,
      deadline: "",
      priority: "",
    });
    setEditingId(null);
    setError("");
  };

  const startEdit = (goal) => {
    setEditingId(goal.id);
    setForm({
      title: goal.title,
      description: goal.description || "",
      goalType: goal.goalType,
      startDate: goal.startDate,
      deadline: goal.deadline,
      priority: goal.priority,
    });
  };

  const handleDelete = async (id) => {
    const goal = goals.find((g) => g.id === id);
    if (!goal) return;
    if (isDemoMode) {
      setGoals((prev) => prev.filter((g) => g.id !== id));
      setGoalLogs((prev) => [
        {
          id: `${id}-deleted-${Date.now()}`,
          action: "deleted",
          title: goal.title,
          date: toISO(new Date()),
          time: currentTime(),
          deletedItem: goal,
        },
        ...prev,
      ]);
      if (editingId === id) resetForm();
      emitGoalsUpdated();
      return;
    }

    try {
      await api.delete(`/goals/${id}`);
      await fetchGoalData();
      onGoalChanged?.();
      emitGoalsUpdated();
      if (editingId === id) resetForm();
    } catch (deleteError) {
      console.error("Failed to delete goal:", deleteError);
      setError(deleteError?.response?.data?.message || "Failed to delete goal.");
    }
  };

  const handleUndoDelete = (logId) => {
    const log = goalLogs.find((l) => l.id === logId);
    if (!log?.deletedItem) return;
    const item = log.deletedItem;
    const nowDate = toISO(new Date());
    const expired = item.deadline && item.deadline < nowDate;
    if (expired) {
      setUndoError(`Undo not possible — "${item.title}" deadline has already passed.`);
      setTimeout(() => setUndoError(""), 4000);
      return;
    }
    setUndoError("");
    setGoals((prev) => [item, ...prev]);
    setGoalLogs((prev) => prev.filter((l) => l.id !== logId));
  };

  const handleRestoreGoal = async (log) => {
    if (!log) return;

    if (isDemoMode) {
      handleUndoDelete(log.id);
      emitGoalsUpdated();
      return;
    }

    if (!log.goalId) return;

    try {
      await api.patch(`/goals/${log.goalId}/restore`);
      setUndoError("");
      await fetchGoalData();
      onGoalChanged?.();
      emitGoalsUpdated();
    } catch (error) {
      setUndoError(error?.response?.data?.message || "Failed to restore goal.");
    }
  };

  const openArchiveEdit = (goal) => {
    setArchiveEditGoal(goal);
    setArchiveEditForm({
      title: goal.title,
      description: goal.description || "",
      goalType: goal.goalType,
      startDate: goal.startDate,
      deadline: goal.deadline,
      priority: goal.priority,
    });
  };

  const saveArchiveEdit = async () => {
    if (!archiveEditForm.title?.trim()) return;
    if (!archiveEditGoal?.id) return;
    const resolvedArchiveStartDate = isArchiveEditStartedGoal
      ? archiveEditGoal.startDate
      : (archiveEditForm.startDate || null);

    if (!isDemoMode) {
      try {
        await api.patch(`/goals/${archiveEditGoal.id}`, {
          title: archiveEditForm.title?.trim(),
          description: archiveEditForm.description || "",
          goalType: archiveEditForm.goalType || "short-term",
          startDate: resolvedArchiveStartDate,
          deadline: archiveEditForm.deadline || null,
          priority: archiveEditForm.priority || "Medium"
        });
        setArchiveEditGoal(null);
        await fetchGoalData();
        onGoalChanged?.();
        emitGoalsUpdated();
      } catch (updateError) {
        console.error("Failed to update goal:", updateError);
        setError(updateError?.response?.data?.message || "Failed to update goal.");
      }
      return;
    }

    setGoals((prev) =>
      prev.map((g) => g.id === archiveEditGoal.id
        ? {
          ...g,
          ...archiveEditForm,
          startDate: resolvedArchiveStartDate || g.startDate,
          title: archiveEditForm.title.trim()
        }
        : g)
    );
    setGoalLogs((prev) => [
      { id: `${archiveEditGoal.id}-updated-${Date.now()}`, action: "updated", title: archiveEditForm.title.trim(), date: toISO(new Date()), time: currentTime() },
      ...prev,
    ]);
    setArchiveEditGoal(null);
    emitGoalsUpdated();
  };

  const confirmArchiveDelete = (id) => setArchiveDeleteId(id);

  const doArchiveDelete = async () => {
    if (!archiveDeleteId) return;
    await handleDelete(archiveDeleteId);
    setArchiveDeleteId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validation = validate();
    if (validation) {
      setError(validation);
      return;
    }

    const resolvedStartDate = isEditingStartedGoal ? (editingGoal?.startDate || form.startDate) : form.startDate;
    const newGoal = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      ...form,
      startDate: resolvedStartDate,
      title: form.title.trim(),
      description: form.description.trim(),
    };

    if (isDemoMode) {
      if (editingId) {
        setGoals((prev) => prev.map((g) => (g.id === editingId ? { ...newGoal, id: editingId } : g)));
        setGoalLogs((prev) => [
          {
            id: `${editingId}-updated-${Date.now()}`,
            action: "updated",
            title: newGoal.title,
            date: toISO(new Date()),
            time: currentTime(),
          },
          ...prev,
        ]);
        resetForm();
        emitGoalsUpdated();
        return;
      }

      setGoals((prev) => [newGoal, ...prev]);
      setGoalLogs((prev) => [
        {
          id: `${newGoal.id}-created`,
          action: "created",
          title: newGoal.title,
          date: toISO(new Date()),
          time: currentTime(),
        },
        ...prev,
      ]);
      resetForm();
      emitGoalsUpdated();
      return;
    }

    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        goalType: form.goalType,
        startDate: resolvedStartDate,
        deadline: form.deadline,
        priority: form.priority
      };

      if (editingId) {
        await api.patch(`/goals/${editingId}`, payload);
      } else {
        await api.post("/goals", payload);
      }

      await fetchGoalData();
      onGoalChanged?.();
      emitGoalsUpdated();
      resetForm();
    } catch (submitError) {
      console.error("Failed to save goal:", submitError);
      setError(submitError?.response?.data?.message || "Failed to save goal.");
    }
  };

  return (
    <div className="space-y-5">
      <div className="mb-5">
        <p className="text-label-lg">Create Goal</p>
        <h2 className="mt-2 text-2xl font-bold text-amber-100">Build Your Goals</h2>
      </div>

      <div className="schedule-layout">
        <div
          className="schedule-main journal-scroll rounded-2xl border border-amber-100/10 bg-gradient-to-b from-black/20 to-black/10 p-5 shadow-xl shadow-black/20"
          style={{ height: PANEL_H, overflowY: "auto" }}
        >
          <h3 className="mb-4 text-sm font-semibold text-amber-200">New Goal</h3>
          <form className="space-y-3" onSubmit={handleSubmit}>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-stone-400">
                Goal Title *
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setField("title", e.target.value)}
                placeholder="e.g. Crack GATE 2027"
                className="w-full rounded-lg border border-amber-100/15 bg-white/5 px-3 py-1.5 text-sm text-stone-100 outline-none transition focus:border-amber-300/35 focus:ring-1 focus:ring-amber-300/30"
              />
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-stone-400">
                Reason / Motivation
              </label>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => setField("description", e.target.value)}
                placeholder="e.g. Complete core subjects, solve PYQs, and revise weekly."
                className="w-full resize-none rounded-lg border border-amber-100/15 bg-white/5 px-3 py-1.5 text-sm text-stone-100 outline-none transition focus:border-amber-300/35 focus:ring-1 focus:ring-amber-300/30"
              />
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-stone-400">
                Goal Type *
              </label>
              <div className="grid grid-cols-1 gap-2">
                {GOAL_TYPES.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setField("goalType", type.value)}
                    className={`rounded-lg border px-3 py-2 text-left transition ${
                      form.goalType === type.value
                        ? "border-amber-300/45 bg-amber-500/15"
                        : "border-amber-100/15 bg-white/5 hover:border-amber-300/35"
                    }`}
                  >
                    <p className="text-sm font-semibold text-stone-100">{type.label}</p>
                    <p className="text-xs text-stone-400">{type.helper}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-stone-400">
                  Start Date *
                </label>
                <input
                  type="date"
                  value={form.startDate}
                  disabled={Boolean(editingId && isEditingStartedGoal)}
                  onChange={(e) => setField("startDate", e.target.value)}
                  className="w-full rounded-lg border border-amber-100/15 bg-white/5 px-2 py-1.5 text-xs text-stone-100 outline-none transition focus:border-amber-300/35"
                />
                {editingId && isEditingStartedGoal && (
                  <p className="mt-1 text-[11px] text-stone-500">
                    Start date cannot be edited after the goal has started.
                  </p>
                )}
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-stone-400">
                  Deadline *
                </label>
                <input
                  type="date"
                  value={form.deadline}
                  min={minimumDeadline || form.startDate || undefined}
                  onChange={(e) => setField("deadline", e.target.value)}
                  className="w-full rounded-lg border border-amber-100/15 bg-white/5 px-2 py-1.5 text-xs text-stone-100 outline-none transition focus:border-amber-300/35"
                />
                {form.goalType && form.startDate && (
                  <p className="mt-1 text-[11px] text-stone-500">
                    {form.goalType === "long-term"
                      ? "Minimum deadline is 3 months after start date."
                      : "Minimum deadline is 1 week after start date."}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-stone-400">
                Priority Level *
              </label>
              <div className="flex gap-1.5 rounded-lg p-0.5">
                {PRIORITIES.map((priority) => (
                  <button
                    key={priority}
                    type="button"
                    onClick={() => setField("priority", priority)}
                    className={`flex flex-1 items-center justify-center whitespace-nowrap rounded-lg border px-1.5 py-1.5 text-[10px] font-semibold transition ${
                      form.priority === priority
                        ? PRIORITY_STYLES[priority]
                        : "border-amber-100/15 bg-white/5 text-stone-300"
                    }`}
                  >
                    <span>{priority}</span>
                    <span className={`ml-1 inline-block h-2.5 w-2.5 rounded-full ${PRIORITY_DOT_STYLES[priority]}`} />
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="text-xs text-red-300">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg border border-amber-400/35 bg-gradient-to-r from-amber-400/20 to-orange-400/15 px-4 py-2 text-xs font-semibold text-amber-200 transition hover:from-amber-400/25 hover:to-orange-400/20"
            >
              {editingId ? "Update Goal" : "Add Goal"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="w-full rounded-lg border border-amber-100/15 bg-white/5 px-4 py-2 text-xs font-semibold text-stone-300 transition hover:text-stone-100"
              >
                Cancel Edit
              </button>
            )}
          </form>
        </div>

        <section
          className="schedule-all-tasks rounded-2xl border border-amber-100/10 bg-gradient-to-b from-black/20 to-black/10 p-5 shadow-xl shadow-black/20"
          style={{ height: PANEL_H }}
        >
          <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-amber-200">All Goals</p>
              <p className="mt-0.5 text-xs text-stone-400">Your created goals appear here.</p>
              <div className="mt-2 flex items-center gap-1.5">
                {["active", "archive"].map((view) => (
                  <button
                    key={view}
                    type="button"
                    onClick={() => setGoalsView(view)}
                    className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize transition ${
                      goalsView === view
                        ? "border-amber-300/45 bg-amber-500/15 text-amber-100"
                        : "border-amber-100/10 bg-white/5 text-stone-400 hover:border-amber-300/35 hover:text-amber-200"
                    }`}
                  >
                    {view}
                  </button>
                ))}
              </div>
            </div>
            <span className="shrink-0 rounded-full border border-amber-100/10 bg-white/5 px-3 py-1 text-xs text-stone-300">
              {displayedGoals.length} total
            </span>
          </div>

          <div className="journal-scroll flex-1 space-y-2 overflow-y-auto pr-1">
            {loading ? (
              <p className="mt-6 text-center text-xs text-stone-500">Loading goals...</p>
            ) : displayedGoals.length === 0 ? (
              <p className="mt-6 text-center text-xs text-stone-500">
                {goalsView === "active"
                  ? "No active goals yet. Create one to get started."
                  : "No archived goals yet."}
              </p>
            ) : (
              displayedGoals.map((goal, i) => (
                <Motion.article
                  key={goal.id}
                  className="rounded-xl border border-amber-100/10 bg-white/5 p-3"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06, duration: 0.22 }}
                  whileHover={{ y: -2, boxShadow: "0 8px 24px rgba(0,0,0,0.4)", borderColor: "rgba(251,191,36,0.2)" }}
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <p className="min-w-0 flex-1 break-words text-sm font-semibold leading-relaxed text-stone-100">
                      {goal.title}
                    </p>
                    <div className="flex w-full flex-wrap items-center justify-start gap-1.5 sm:w-auto sm:shrink-0 sm:justify-end">
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${PRIORITY_STYLES[goal.priority]}`}>
                        {goal.priority}
                      </span>
                      {goalsView !== "archive" && (
                        <>
                          <button
                            type="button"
                            onClick={() => startEdit(goal)}
                            className="rounded border border-amber-300/25 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold text-amber-200 transition hover:bg-amber-400/20"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(goal.id)}
                            className="rounded border border-rose-400/25 bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-300 transition hover:bg-rose-500/20"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  {goal.description && (
                    <p className="mt-1 break-words text-xs leading-relaxed text-stone-400">{goal.description}</p>
                  )}
                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[11px] text-stone-300">
                    <span className="rounded-full border border-amber-300/35 bg-amber-500/15 px-2 py-0.5 font-semibold text-amber-200">
                      {goal.goalType === "short-term" ? "🎯 Short-term" : "🚀 Long-term"}
                    </span>
                    <span className="rounded-full border border-amber-100/10 bg-black/20 px-2 py-0.5">
                      Start {goal.startDate}
                    </span>
                    <span className="rounded-full border border-rose-400/25 bg-rose-500/10 px-2 py-0.5 font-semibold text-rose-200">
                      Deadline {goal.deadline}
                    </span>
                  </div>
                </Motion.article>
              ))
            )}
          </div>
        </section>

        <aside className="schedule-sidebar">
          <div
            className="flex h-full flex-col rounded-2xl border border-amber-100/10 bg-gradient-to-b from-black/20 to-black/10 p-4 shadow-xl shadow-black/20"
            style={{ height: PANEL_H }}
          >
            <div className="mb-3 shrink-0 border-b border-amber-100/10 pb-3">
              <p className="text-sm font-semibold tracking-wide text-amber-200">Goal Logs</p>
              <p className="mt-0.5 text-xs text-stone-400">Recent goal activity</p>
            </div>
            {undoError && (
              <p className="mb-2 shrink-0 rounded-md border border-rose-400/30 bg-rose-500/10 px-2 py-1.5 text-[11px] text-rose-300">{undoError}</p>
            )}

            {loading ? (
              <p className="text-sm text-stone-400">Loading goal logs...</p>
            ) : goalLogs.length === 0 ? (
              <p className="text-sm text-stone-400">No goal logs yet.</p>
            ) : (
              <div className="journal-scroll min-h-0 flex-1 space-y-1.5 overflow-x-hidden overflow-y-auto pr-1">
                {goalLogs.map((log) => (
                  (() => {
                    const deleteUndoExpiresAt = log?.deleteUndoExpiresAt ? new Date(log.deleteUndoExpiresAt).getTime() : 0;
                    const countdownText = log.action === "deleted" && deleteUndoExpiresAt
                      ? formatUndoCountdown(deleteUndoExpiresAt - nowMs)
                      : "";
                    return (
                  <div
                    key={log.id}
                    className={`flex items-center justify-between gap-2 rounded-md border px-2 py-1.5 text-[11px] ${
                      log.action === "archived"
                        ? "border-blue-400/20 bg-blue-500/5 text-stone-300"
                        : log.action === "ended"
                          ? "border-blue-400/20 bg-blue-500/5 text-stone-300"
                        : log.action === "deleted"
                          ? "border-rose-400/20 bg-rose-500/5 text-stone-300"
                        : log.action === "subgoal_deleted"
                          ? "border-rose-400/20 bg-rose-500/5 text-stone-300"
                        : log.action === "restored"
                          ? "border-emerald-400/20 bg-emerald-500/5 text-stone-300"
                        : log.action === "subgoal_added"
                          ? "border-emerald-400/20 bg-emerald-500/5 text-stone-300"
                        : log.action === "subgoal_completed"
                          ? "border-emerald-400/20 bg-emerald-500/5 text-stone-300"
                        : log.action === "subgoal_reopened"
                          ? "border-amber-300/20 bg-amber-500/5 text-stone-300"
                        : log.action === "subgoal_updated"
                          ? "border-sky-300/20 bg-sky-500/5 text-stone-300"
                        : log.action === "updated" || log.action === "edited"
                          ? "border-amber-300/20 bg-amber-500/5 text-stone-300"
                        : log.action === "important_toggled"
                          ? "border-violet-300/20 bg-violet-500/5 text-stone-300"
                        : log.action === "progress_updated"
                          ? "border-sky-300/20 bg-sky-500/5 text-stone-300"
                          : "border-amber-100/10 bg-white/5 text-stone-200"
                    }`}
                  >
                    <p className="min-w-0 flex-1">
                      <span className={`font-semibold ${
                        log.action === "archived"
                          ? "text-blue-300"
                          : log.action === "ended"
                            ? "text-blue-300"
                          : log.action === "deleted"
                            ? "text-rose-300"
                          : log.action === "subgoal_deleted"
                            ? "text-rose-300"
                          : log.action === "restored"
                            ? "text-emerald-300"
                          : log.action === "subgoal_added"
                            ? "text-emerald-300"
                          : log.action === "subgoal_completed"
                            ? "text-emerald-300"
                          : log.action === "subgoal_reopened"
                            ? "text-amber-200"
                          : log.action === "subgoal_updated"
                            ? "text-sky-200"
                          : log.action === "updated" || log.action === "edited"
                            ? "text-amber-200"
                            : log.action === "important_toggled"
                              ? "text-violet-200"
                              : log.action === "progress_updated"
                                ? "text-sky-200"
                            : "text-emerald-300"
                      }`}>
                        {log.action === "archived"
                          ? "Archived"
                          : log.action === "ended"
                            ? "Ended"
                          : log.action === "deleted"
                            ? "Deleted"
                          : log.action === "subgoal_deleted"
                            ? "Sub-goal Deleted"
                          : log.action === "restored"
                              ? "Restored"
                            : log.action === "subgoal_added"
                              ? "Sub-goal Added"
                            : log.action === "subgoal_completed"
                              ? "Sub-goal Completed"
                            : log.action === "subgoal_reopened"
                              ? "Sub-goal Reopened"
                            : log.action === "subgoal_updated"
                              ? "Sub-goal Updated"
                            : log.action === "updated" || log.action === "edited"
                              ? "Updated"
                              : log.action === "important_toggled"
                                ? "Important Toggled"
                                : log.action === "progress_updated"
                                  ? "Progress Updated"
                              : "Created"}:
                      </span>{" "}
                      <span className="break-words font-semibold text-stone-100">{log.title}</span> on {log.date} at {fmtTime(log.time)}
                      {Boolean(countdownText) && (
                        <span className="mt-1 block text-[10px] font-semibold text-rose-300/90">
                          {countdownText}
                        </span>
                      )}
                    </p>
                    {log.action === "deleted" &&
                      ((isDemoMode && log.deletedItem) || (!isDemoMode && log.canUndoDelete && log.goalId)) && (
                      <button
                        type="button"
                        onClick={() => handleRestoreGoal(log)}
                        className="shrink-0 rounded border border-rose-400/30 bg-rose-500/10 px-1.5 py-0.5 text-[11px] font-semibold text-rose-300 transition hover:bg-rose-500/20"
                        title="Restore goal"
                      >
                        ↺
                      </button>
                    )}
                  </div>
                    );
                  })()
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Archive Edit Modal */}
      {archiveEditGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4">
          <div className="w-full max-w-md rounded-2xl border border-amber-100/10 bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.08),transparent_35%),linear-gradient(180deg,rgba(30,18,14,0.95),rgba(12,8,8,0.97))] p-5 shadow-2xl shadow-black/50 backdrop-blur">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-amber-200/60">Edit Archived Goal</p>
                <h3 className="mt-1 text-base font-semibold text-amber-100">{archiveEditGoal.title}</h3>
              </div>
              <button type="button" onClick={() => setArchiveEditGoal(null)}
                className="rounded border border-amber-100/20 bg-white/5 px-2.5 py-1 text-xs font-semibold text-stone-300 transition hover:text-stone-100">
                Close
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-stone-400">Goal Title</label>
                <input type="text" value={archiveEditForm.title || ""} onChange={(e) => setArchiveEditForm((p) => ({ ...p, title: e.target.value }))}
                  className="w-full rounded-lg border border-amber-100/15 bg-white/5 px-3 py-1.5 text-sm text-stone-100 outline-none transition focus:border-amber-300/35" />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-stone-400">Reason / Motivation</label>
                <textarea rows={2} value={archiveEditForm.description || ""} onChange={(e) => setArchiveEditForm((p) => ({ ...p, description: e.target.value }))}
                  className="w-full resize-none rounded-lg border border-amber-100/15 bg-white/5 px-3 py-1.5 text-sm text-stone-100 outline-none transition focus:border-amber-300/35" />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-stone-400">Start Date</label>
                  <input
                    type="date"
                    value={archiveEditForm.startDate || ""}
                    disabled={isArchiveEditStartedGoal}
                    onChange={(e) => setArchiveEditForm((p) => ({ ...p, startDate: e.target.value }))}
                    className="w-full rounded-lg border border-amber-100/15 bg-white/5 px-2 py-1.5 text-xs text-stone-100 outline-none transition focus:border-amber-300/35" />
                  {isArchiveEditStartedGoal && (
                    <p className="mt-1 text-[11px] text-stone-500">
                      Start date cannot be edited after the goal has started.
                    </p>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-stone-400">Deadline</label>
                  <input type="date" value={archiveEditForm.deadline || ""} onChange={(e) => setArchiveEditForm((p) => ({ ...p, deadline: e.target.value }))}
                    className="w-full rounded-lg border border-amber-100/15 bg-white/5 px-2 py-1.5 text-xs text-stone-100 outline-none transition focus:border-amber-300/35" />
                </div>
              </div>
              <div className="flex gap-1.5">
                {["High", "Medium", "Low"].map((p) => (
                  <button key={p} type="button" onClick={() => setArchiveEditForm((f) => ({ ...f, priority: p }))}
                    className={`flex-1 rounded-lg border px-2 py-1.5 text-[10px] font-semibold transition ${archiveEditForm.priority === p ? PRIORITY_STYLES[p] : "border-amber-100/15 bg-white/5 text-stone-300"}`}>
                    {p}
                  </button>
                ))}
              </div>
              {!archiveEditForm.title?.trim() && (
                <p className="text-[11px] text-rose-300">Title is required.</p>
              )}
              <button type="button" onClick={saveArchiveEdit}
                className="w-full rounded-lg border border-amber-400/35 bg-gradient-to-r from-amber-400/20 to-orange-400/15 px-4 py-2 text-xs font-semibold text-amber-200 transition hover:from-amber-400/25 hover:to-orange-400/20">
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Archive Delete Confirm */}
      {archiveDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-rose-400/20 bg-[linear-gradient(180deg,rgba(30,18,14,0.97),rgba(12,8,8,0.98))] p-5 shadow-2xl shadow-black/50 backdrop-blur">
            <p className="text-sm font-semibold text-stone-100">Delete this archived goal?</p>
            <p className="mt-1 text-xs text-stone-400">This action cannot be undone — the goal will be permanently removed.</p>
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={doArchiveDelete}
                className="flex-1 rounded-lg border border-rose-400/35 bg-rose-500/15 px-4 py-2 text-xs font-semibold text-rose-200 transition hover:bg-rose-500/25">
                Yes, Delete
              </button>
              <button type="button" onClick={() => setArchiveDeleteId(null)}
                className="flex-1 rounded-lg border border-amber-100/15 bg-white/5 px-4 py-2 text-xs font-semibold text-stone-300 transition hover:text-stone-100">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
