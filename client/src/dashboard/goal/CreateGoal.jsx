import DashboardDateTimeInput from "../../components/DashboardDateTimeInput";
import { motion as Motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useGoalContext } from "./goalContext";
import { goalFailureMessage, goalRevision } from "./goalResponse";
import { addGoalMonths, formatGoalTime, shiftGoalDay } from "./goalUtils";
import useMobileLowMotion from "../../hooks/useMobileLowMotion";

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
const CREATE_GOAL_VIEWS = [
  { id: "create", icon: "+", label: "New Goal" },
  { id: "goals", icon: "✓", label: "All Goals" },
  { id: "logs", icon: "↻", label: "Goal Logs" },
];
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

const addDaysToISO = shiftGoalDay;
const addMonthsToISO = addGoalMonths;
const fmtTime = formatGoalTime;

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

export default function CreateGoal() {
  const { isDemoMode, goals, goalLogs, today, nowMs, busy, saving, mutate, logsError, logsReady } = useGoalContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedMobileView = searchParams.get("goalCreate");
  const mobileView = CREATE_GOAL_VIEWS.some((view) => view.id === requestedMobileView)
    ? requestedMobileView
    : "create";
  const selectMobileView = (view) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set("tab", "create-goals");
      next.set("goalCreate", view);
      return next;
    });
  };
  const lowMotion = useMobileLowMotion();
  const GoalListCard = lowMotion ? "article" : Motion.article;
  const [error, setError] = useState("");
  const [undoError, setUndoError] = useState("");
  const [form, setForm] = useState({
    title: "",
    description: "",
    goalType: "",
    startDate: today,
    deadline: "",
    priority: "",
  });
  const [goalsView, setGoalsView] = useState("active");
  const [editingId, setEditingId] = useState(null);
  const editingRevision = useRef({});
  const [archiveEditGoal, setArchiveEditGoal] = useState(null);
  const [archiveEditForm, setArchiveEditForm] = useState({});
  const [archiveDeleteId, setArchiveDeleteId] = useState(null);
  const formPanelRef = useRef(null);

  useEffect(() => {
    if (!editingId && !form.title && !form.description && !form.goalType && !form.deadline && !form.priority) {
      setForm(previous => previous.startDate === today ? previous : { ...previous, startDate: today });
    }
  }, [today, editingId, form.title, form.description, form.goalType, form.deadline, form.priority]);

  const activeGoals = goals.filter((goal) => goal.status === "Active");
  const archivedGoals = goals.filter((goal) => goal.status === "Archived");
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
    if (!editingId && form.startDate < today) return "New goals cannot start in the past.";
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
    if (isDemoMode || busy) return;
    editingRevision.current = goalRevision(goal);
    setEditingId(goal.id);
    setForm({
      title: goal.title,
      description: goal.description || "",
      goalType: goal.goalType,
      startDate: goal.startDate,
      deadline: goal.deadline,
      priority: goal.priority,
    });
    selectMobileView("create");
    requestAnimationFrame(() => {
      formPanelRef.current?.scrollIntoView({
        block: "start",
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      });
    });
  };

  const handleDelete = async (id) => {
    if (isDemoMode || busy) return false;
    try {
      await mutate("delete", `/goals/${id}`);
      if (editingId === id) resetForm();
      setError("");
      return true;
    } catch (error) {
      setError(goalFailureMessage(error, "Failed to delete goal."));
      return false;
    }
  };

  const handleRestoreGoal = async (log) => {
    if (isDemoMode || busy || !log?.goalId) return;
    try {
      await mutate("patch", `/goals/${log.goalId}/restore`);
      setUndoError("");
    } catch (error) {
      setUndoError(goalFailureMessage(error, "Failed to restore goal."));
    }
  };

  const saveArchiveEdit = async () => {
    if (isDemoMode || busy || !archiveEditGoal?.id || !archiveEditForm.title?.trim()) return;
    try {
      await mutate("patch", `/goals/${archiveEditGoal.id}`, {
        ...goalRevision(archiveEditGoal),
        title: archiveEditForm.title.trim(),
        description: archiveEditForm.description || "",
        goalType: archiveEditForm.goalType || "short-term",
        startDate: isArchiveEditStartedGoal ? archiveEditGoal.startDate : archiveEditForm.startDate || null,
        deadline: archiveEditForm.deadline || null,
        priority: archiveEditForm.priority || "Medium"
      });
      setArchiveEditGoal(null);
      setError("");
    } catch (error) {
      setError(goalFailureMessage(error, "Failed to update goal."));
    }
  };

  const doArchiveDelete = async () => {
    if (archiveDeleteId && await handleDelete(archiveDeleteId)) setArchiveDeleteId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isDemoMode || busy) return;
    const validation = validate();
    if (validation) { setError(validation); return; }
    try {
      await mutate(editingId ? "patch" : "post", editingId ? `/goals/${editingId}` : "/goals", {
        ...(editingId ? editingRevision.current : {}),
        title: form.title.trim(), description: form.description.trim(),
        goalType: form.goalType,
        startDate: form.startDate,
        deadline: form.deadline, priority: form.priority
      });
      resetForm();
    } catch (error) {
      setError(goalFailureMessage(error, "Failed to save goal."));
    }
  };

  return (
    <div className="goal-create-view" data-mobile-view={mobileView}>
      <nav className="goal-create-mobile-nav" aria-label="Create goal sections" data-demo-allow="true">
        {CREATE_GOAL_VIEWS.map((view) => (
          <button
            key={view.id}
            type="button"
            onClick={() => selectMobileView(view.id)}
            aria-pressed={mobileView === view.id}
            className="goal-create-mobile-nav-button"
          >
            <span className="goal-create-mobile-nav-icon" aria-hidden="true">{view.icon}</span>
            <span>{view.label}</span>
            {view.id === "goals" ? <span className="goal-create-mobile-nav-count">{displayedGoals.length}</span> : null}
            {view.id === "logs" ? <span className="goal-create-mobile-nav-count">{goalLogs.length}</span> : null}
          </button>
        ))}
      </nav>

      <div className="goal-create-heading">
        <p className="text-label-lg">Create Goal</p>
        <h2 className="mt-2 text-2xl font-bold text-amber-100">Build Your Goals</h2>
      </div>

      <div className="schedule-layout goal-create-layout">
        <div ref={formPanelRef} data-goal-create-panel="create" className="schedule-main goal-create-form journal-scroll rounded-[1.4rem] border border-amber-100/10 bg-gradient-to-b from-black/20 to-black/10 p-4 shadow-xl shadow-black/20 sm:rounded-2xl sm:p-5">
          <h3 className="mb-4 text-sm font-semibold text-amber-200">New Goal</h3>
          <form className="space-y-3" onSubmit={handleSubmit}>
            <fieldset disabled={busy || isDemoMode} className="space-y-3 min-w-0 border-0 p-0">
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-stone-400">
                Goal Title *
              </label>
              <input
                type="text"
                maxLength={180}
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
                maxLength={2500}
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
              <div className="goal-type-options grid grid-cols-1 gap-2">
                {GOAL_TYPES.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setField("goalType", type.value)}
                    className={`rounded-lg border px-3 py-2 text-left transition sm:px-3.5 ${
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

            <div className="goal-date-fields grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-stone-400">
                  Start Date *
                </label>
<DashboardDateTimeInput
                  type="date" today={today}
                  value={form.startDate}
                  min={editingId && isEditingStartedGoal ? undefined : today}
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
<DashboardDateTimeInput
                  type="date" today={today}
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
              <div className="goal-priority-options flex flex-wrap gap-1.5 rounded-lg p-0.5">
                {PRIORITIES.map((priority) => (
                  <button
                    key={priority}
                    type="button"
                    onClick={() => setField("priority", priority)}
                    className={`flex min-w-[88px] flex-1 items-center justify-center whitespace-nowrap rounded-lg border px-2 py-1.5 text-[10px] font-semibold transition ${
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
              disabled={busy || isDemoMode}
              className="w-full rounded-lg border border-amber-400/35 bg-gradient-to-r from-amber-400/20 to-orange-400/15 px-4 py-2 text-xs font-semibold text-amber-200 transition hover:from-amber-400/25 hover:to-orange-400/20"
            >
              {saving ? "Saving..." : editingId ? "Update Goal" : "Add Goal"}
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
            </fieldset>
          </form>
        </div>

        <section
          data-goal-create-panel="goals"
          className="schedule-all-tasks goal-create-list rounded-[1.4rem] border border-amber-100/10 bg-gradient-to-b from-black/20 to-black/10 p-4 shadow-xl shadow-black/20 sm:rounded-2xl sm:p-5"
        >
          <div className="goal-create-list-header mb-4 flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-amber-200">All Goals</p>
              <p className="mt-0.5 text-xs text-stone-400">Your created goals appear here.</p>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
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

          <div className="goal-create-list-body journal-scroll flex-1 space-y-2 overflow-y-auto pr-1">
            {displayedGoals.length === 0 ? (
              <p className="mt-6 text-center text-xs text-stone-500">
                {goalsView === "active"
                  ? "No active goals yet. Create one to get started."
                  : "No archived goals yet."}
              </p>
            ) : (
              displayedGoals.map((goal, i) => {
                const isDeletedGoal = Boolean(goal.deletedAt || goal.archiveReason === "deleted");
                const isEndedGoal = !isDeletedGoal && (
                  goal.archiveReason === "ended" ||
                  Boolean(goal.deadline && goal.deadline < today)
                );

                return (
                <GoalListCard
                  key={goal.id}
                  className="goal-created-card rounded-xl border border-amber-100/10 bg-white/5 p-3"
                  {...(lowMotion ? {} : {
                    initial: { opacity: 0, y: 8 },
                    animate: { opacity: 1, y: 0 },
                    transition: { delay: i * 0.06, duration: 0.22 },
                    whileHover: { y: -2, boxShadow: "0 8px 24px rgba(0,0,0,0.4)", borderColor: "rgba(251,191,36,0.2)" }
                  })}
                >
                  <div className="goal-created-card-head flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <p className="min-w-0 flex-1 break-words text-sm font-semibold leading-relaxed text-stone-100">
                      {goal.title}
                    </p>
                    <div className="goal-created-card-controls flex w-full flex-col items-start gap-2 sm:w-auto sm:shrink-0 sm:items-end">
                      <div className="goal-created-card-state flex flex-wrap items-center gap-1.5 sm:justify-end">
                        {goalsView === "archive" && (
                          <span className="dashboard-card-status" data-tone={isDeletedGoal || isEndedGoal ? "danger" : undefined}>
                            {isDeletedGoal ? "Deleted" : isEndedGoal ? "Ended" : "Archived"}
                          </span>
                        )}
                        <span className={`dashboard-card-priority ${PRIORITY_STYLES[goal.priority]}`}>
                          {goal.priority}
                        </span>
                      </div>
                      {isDeletedGoal && goal.canUndoDelete && Date.parse(goal.deleteUndoExpiresAt) > nowMs && (
                        <button type="button" className="dashboard-card-action" data-tone="success"
                          disabled={busy || isDemoMode} onClick={() => handleRestoreGoal({ goalId: goal.id })}>
                          Restore
                        </button>
                      )}
                      {goalsView !== "archive" && (
                        <div className="goal-created-card-actions flex flex-wrap items-center gap-1.5 sm:justify-end">
                          <button
                            type="button"
                            disabled={busy || isDemoMode}
                            onClick={() => startEdit(goal)}
                            className="dashboard-card-action" data-tone="warning"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            disabled={busy || isDemoMode}
                            onClick={() => handleDelete(goal.id)}
                            className="dashboard-card-action" data-tone="danger"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  {goal.description && (
                    <p className="mt-1 break-words text-xs leading-relaxed text-stone-400">{goal.description}</p>
                  )}
                  <div className="goal-created-card-meta mt-2.5 flex flex-wrap items-center gap-1.5 text-[11px] text-stone-300">
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
                </GoalListCard>
                );
              })
            )}
          </div>
        </section>

        <aside data-goal-create-panel="logs" className="schedule-sidebar goal-create-logs">
          <div className="goal-create-log-panel flex h-full flex-col rounded-[1.4rem] border border-amber-100/10 bg-gradient-to-b from-black/20 to-black/10 p-4 shadow-xl shadow-black/20 sm:rounded-2xl">
            <div className="mb-3 shrink-0 border-b border-amber-100/10 pb-3">
              <p className="text-sm font-semibold tracking-wide text-amber-200">Goal Logs</p>
              <p className="mt-0.5 text-xs text-stone-400">Recent goal activity</p>
            </div>
            {undoError && (
              <p className="mb-2 shrink-0 rounded-md border border-rose-400/30 bg-rose-500/10 px-2 py-1.5 text-[11px] text-rose-300">{undoError}</p>
            )}

            {logsError ? (
              <p role="alert" className="text-sm text-rose-200">{logsError}</p>
            ) : !logsReady ? (
              <p className="text-sm text-stone-400">Loading goal activity...</p>
            ) : goalLogs.length === 0 ? (
              <p className="text-sm text-stone-400">No goal logs yet.</p>
            ) : (
              <div className="goal-create-log-list journal-scroll min-h-0 flex-1 space-y-1.5 overflow-x-hidden overflow-y-auto pr-1">
                {goalLogs.map((log) => (
                  (() => {
                    const deleteUndoExpiresAt = log?.deleteUndoExpiresAt ? new Date(log.deleteUndoExpiresAt).getTime() : 0;
                    const countdownText = log.action === "deleted" && deleteUndoExpiresAt
                      ? formatUndoCountdown(deleteUndoExpiresAt - nowMs)
                      : "";
                    return (
                  <div
                    key={log.id}
                    className={`goal-create-log-row flex flex-col items-start gap-2 rounded-md border px-2 py-1.5 text-[11px] sm:flex-row sm:items-center sm:justify-between ${
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
                        disabled={busy || isDemoMode}
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
<DashboardDateTimeInput
                    type="date" today={today}
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
<DashboardDateTimeInput type="date" today={today} value={archiveEditForm.deadline || ""} onChange={(e) => setArchiveEditForm((p) => ({ ...p, deadline: e.target.value }))}
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
              <button type="button" disabled={busy || isDemoMode} onClick={saveArchiveEdit}
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
              <button type="button" disabled={busy || isDemoMode} onClick={doArchiveDelete}
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
