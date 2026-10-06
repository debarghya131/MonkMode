import DashboardDateTimeInput from "../../components/DashboardDateTimeInput";
import { motion as Motion } from "framer-motion";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import useMobileLowMotion from "../../hooks/useMobileLowMotion";

const PRIORITY_BADGE = {
  High: "border-red-400/30 bg-red-500/10 text-red-200",
  Medium: "border-yellow-400/30 bg-yellow-500/10 text-yellow-200",
  Low: "border-green-400/30 bg-green-500/10 text-green-200",
};
const TYPE_BADGE = {
  "Long-term": "border-violet-400/30 bg-violet-500/10 text-violet-200",
  "Short-term": "border-cyan-400/30 bg-cyan-500/10 text-cyan-200",
};

const getDaysLeft = (deadlineISO) => {
  const [y, m, d] = deadlineISO.split("-").map(Number);
  const deadline = new Date(y, m - 1, d);
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((deadline - todayStart) / msPerDay);
};

const toStartOfDay = (value) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const toISODate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const getSubgoalMinDate = (goal) => {
  const today = toStartOfDay(new Date());
  const goalStart = goal?.startDate ? toStartOfDay(goal.startDate) : null;
  if (!goalStart) return toISODate(today);
  return toISODate(goalStart > today ? goalStart : today);
};

function DeadlineBadge({ deadline }) {
  if (!deadline) return null;
  const days = getDaysLeft(deadline);
  const label =
    days > 0 ? `Due ${deadline} · ${days}d left` : days === 0 ? `Due today · ${deadline}` : `Overdue · ${deadline}`;
  const cls =
    days > 3
      ? "border-sky-400/30 bg-sky-500/8 text-sky-300"
      : days >= 0
        ? "border-amber-400/30 bg-amber-500/8 text-amber-300"
        : "border-rose-400/30 bg-rose-500/8 text-rose-300";
  return (
    <span className={`mt-0.5 inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold ${cls}`}>
      {label}
    </span>
  );
}

export default function Mygoals({
  goals = [],
  importantByGoal,
  onToggleImportant,
  milestonesByGoal,
  setMilestonesByGoal,
  onAddSubgoal,
  onUpdateSubgoalStatus,
  onDeleteSubgoal
}) {
  const navigate = useNavigate();
  const lowMotion = useMobileLowMotion();
  const GoalCard = lowMotion ? "article" : Motion.article;
  const [addPopupGoalId, setAddPopupGoalId] = useState(null);
  const [popupGoalId, setPopupGoalId] = useState(null);
  const [newSubgoal, setNewSubgoal] = useState("");
  const [newDeadline, setNewDeadline] = useState("");
  const [subgoalError, setSubgoalError] = useState("");
  const [isSubmittingSubgoal, setIsSubmittingSubgoal] = useState(false);
  const [pendingMilestoneActions, setPendingMilestoneActions] = useState({});

  const visibleGoals = goals.filter((goal) => !(goal.deletedAt || goal.archiveReason === "deleted"));
  const addPopupGoal = visibleGoals.find((goal) => goal.id === addPopupGoalId) || null;
  const popupGoal = visibleGoals.find((goal) => goal.id === popupGoalId) || null;
  const subgoalMinDate = getSubgoalMinDate(addPopupGoal);
  const subgoalMaxDate = addPopupGoal?.deadline || "";
  const isSubgoalDateRangeInvalid = Boolean(subgoalMinDate && subgoalMaxDate && subgoalMinDate > subgoalMaxDate);
  const sortedGoals = [...visibleGoals].sort((a, b) => {
    const aArchived = a.status === "Archived";
    const bArchived = b.status === "Archived";

    if (aArchived !== bArchived) return aArchived ? 1 : -1;

    return Number(Boolean(importantByGoal[b.id])) - Number(Boolean(importantByGoal[a.id]));
  });
  const popupMilestones = popupGoal ? milestonesByGoal[popupGoal.id] || [] : [];
  const pendingMilestones = popupMilestones.filter((m) => !m.completed);
  const completedMilestones = popupMilestones.filter((m) => m.completed);

  const updateMilestoneStatus = async (goalId, milestoneId, completed) => {
    if (!goalId || !milestoneId) return;
    const actionKey = `${goalId}:${milestoneId}:${completed ? "done" : "undo"}`;
    setSubgoalError("");
    setPendingMilestoneActions((prev) => ({ ...prev, [actionKey]: true }));
    try {
      if (typeof onUpdateSubgoalStatus === "function") {
        await onUpdateSubgoalStatus({
          goalId,
          subgoalId: milestoneId,
          completed
        });
      } else {
        setMilestonesByGoal((prev) => ({
          ...prev,
          [goalId]: (prev[goalId] || []).map((milestone) =>
            milestone.id === milestoneId ? { ...milestone, completed } : milestone
          ),
        }));
      }
    } catch (error) {
      setSubgoalError(error?.response?.data?.message || "Unable to update sub-goal progress. Please try again.");
    } finally {
      setPendingMilestoneActions((prev) => {
        const next = { ...prev };
        delete next[actionKey];
        return next;
      });
    }
  };

  const addSubgoal = async () => {
    const title = newSubgoal.trim();
    if (!title || !newDeadline || !addPopupGoal) return;
    setSubgoalError("");
    setIsSubmittingSubgoal(true);
    try {
      if (typeof onAddSubgoal === "function") {
        await onAddSubgoal({
          goalId: addPopupGoal.id,
          title,
          deadline: newDeadline
        });
      } else {
        const id = `${addPopupGoal.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        setMilestonesByGoal((prev) => ({
          ...prev,
          [addPopupGoal.id]: [...(prev[addPopupGoal.id] || []), { id, title, deadline: newDeadline, completed: false }],
        }));
      }
      setNewSubgoal("");
      setNewDeadline("");
    } catch (error) {
      setSubgoalError(error?.response?.data?.message || "Unable to save sub-goal. Please try again.");
    } finally {
      setIsSubmittingSubgoal(false);
    }
  };

  const deleteSubgoal = async (goalId, milestoneId) => {
    if (!goalId || !milestoneId) return;
    const actionKey = `${goalId}:${milestoneId}:delete`;
    setSubgoalError("");
    setPendingMilestoneActions((prev) => ({ ...prev, [actionKey]: true }));
    try {
      if (typeof onDeleteSubgoal === "function") {
        await onDeleteSubgoal({ goalId, subgoalId: milestoneId });
      } else {
        setMilestonesByGoal((prev) => ({
          ...prev,
          [goalId]: (prev[goalId] || []).filter((milestone) => milestone.id !== milestoneId),
        }));
      }
    } catch (error) {
      setSubgoalError(error?.response?.data?.message || "Unable to delete sub-goal. Please try again.");
    } finally {
      setPendingMilestoneActions((prev) => {
        const next = { ...prev };
        delete next[actionKey];
        return next;
      });
    }
  };

  return (
    <div className="goals-my-view flex flex-col rounded-[1.6rem] border border-amber-100/10 bg-white/6 p-4 shadow-2xl shadow-black/25 backdrop-blur sm:rounded-[2rem] sm:p-6">
      <header className="goals-my-header">
        <p className="text-label-lg">My Goals</p>
        <h2 className="mt-2 text-2xl font-bold text-amber-100">All Goals</h2>
        <p className="text-body-md mt-3 text-stone-300/90">
          View all your goals with active and archived status, then break each goal into habits and milestones.
        </p>
      </header>

      <div className="goals-list journal-scroll mt-5 flex-1 space-y-3 pr-1">
        {sortedGoals.map((goal, i) => {
          const daysLeft = getDaysLeft(goal.deadline);
          return (
            <GoalCard
              key={goal.id}
              className="goal-card rounded-[1.3rem] border border-amber-100/10 bg-gradient-to-b from-black/20 to-black/10 p-3.5 sm:rounded-2xl sm:p-4"
              {...(lowMotion ? {} : {
                initial: { opacity: 0, y: 14 },
                animate: { opacity: 1, y: 0 },
                transition: { delay: i * 0.06, duration: 0.25 },
                whileHover: { y: -3, boxShadow: "0 12px 32px rgba(0,0,0,0.4)", borderColor: "rgba(251,191,36,0.2)" }
              })}
            >
              <div className="goal-card-layout">
                <div className="goal-card-info min-w-0">
                  <div className="goal-card-title flex min-w-0 items-center gap-2">
                    <h3 className="min-w-0 text-lg font-semibold text-amber-100">{goal.title}</h3>
                    {importantByGoal[goal.id] ? (
                      <span
                        className="goal-important-symbol shrink-0 text-amber-400"
                        title="Important goal"
                        aria-label="Important goal"
                      >
                        ★
                      </span>
                    ) : null}
                  </div>
                  <div className="goal-card-metadata mt-1 flex flex-wrap items-center gap-1.5">
                    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${TYPE_BADGE[goal.type]}`}>
                      {goal.type} Goal
                    </span>
                    <span className="rounded-full border border-rose-400/30 bg-rose-500/10 px-2 py-0.5 text-[11px] font-semibold text-rose-200">
                      Deadline {goal.deadline}
                    </span>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                        daysLeft > 7
                          ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
                          : daysLeft >= 0
                            ? "border-amber-400/30 bg-amber-500/10 text-amber-200"
                            : "border-rose-400/30 bg-rose-500/10 text-rose-200"
                      }`}
                    >
                      {daysLeft > 0
                        ? `${daysLeft} days left`
                        : daysLeft === 0
                          ? "Due today"
                          : `${Math.abs(daysLeft)} days overdue`}
                    </span>
                    {(() => {
                      const milestones = milestonesByGoal[goal.id] || [];
                      const done = milestones.filter((m) => m.completed).length;
                      return milestones.length === 0 ? (
                        <span className="rounded-full border border-stone-600/40 bg-stone-500/10 px-2 py-0.5 text-[11px] font-semibold text-stone-400">
                          No sub-goals
                        </span>
                      ) : (
                        <span className="rounded-full border border-sky-400/30 bg-sky-500/10 px-2 py-0.5 text-[11px] font-semibold text-sky-200">
                          {done}/{milestones.length} sub-goals
                        </span>
                      );
                    })()}
                  </div>
                </div>

                <div className="goal-card-side flex min-w-0 flex-col gap-2">
                  <div className="goal-card-state flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onToggleImportant?.(goal.id)}
                      className="dashboard-card-action goal-important-action"
                      data-tone={importantByGoal[goal.id] ? "warning" : "neutral"}
                      aria-pressed={Boolean(importantByGoal[goal.id])}
                    >
                      <span aria-hidden="true">{importantByGoal[goal.id] ? "★" : "☆"}</span>
                      <span>{importantByGoal[goal.id] ? "Remove from Important" : "Mark Important"}</span>
                    </button>
                    <div className="goal-card-labels flex items-center gap-2">
                    <span className={`dashboard-card-priority ${PRIORITY_BADGE[goal.priority]}`}>
                      {goal.priority}
                    </span>
                    <span
                      className="dashboard-card-status"
                      data-tone={goal.status === "Archived" ? "info" : "success"}
                    >
                      {goal.status}
                    </span>
                    </div>
                  </div>
                  <div className="goal-card-actions">
                    <button
                      type="button"
                      onClick={() => {
                        setAddPopupGoalId(goal.id);
                        setNewSubgoal("");
                        setNewDeadline("");
                        setSubgoalError("");
                      }}
                      className="dashboard-card-action"
                      data-tone="warning"
                    >
                      Add Sub-goals
                    </button>
                    <button
                      type="button"
                      onClick={() => setPopupGoalId(goal.id)}
                      className="dashboard-card-action"
                      data-tone="info"
                    >
                      Update Progress
                    </button>
                  </div>
                </div>
              </div>
            </GoalCard>
          );
        })}
      </div>

      {addPopupGoal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/65 p-3 sm:items-center sm:p-4">
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-amber-100/10 bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.08),transparent_35%),linear-gradient(180deg,rgba(30,18,14,0.95),rgba(12,8,8,0.97))] shadow-2xl shadow-black/50 backdrop-blur">
            <div className="sticky top-0 z-10 mb-4 flex items-start justify-between gap-3 border-b border-amber-100/10 bg-[#1a100c]/95 px-4 py-3 sm:px-5">
              <div>
                <p className="text-label-lg">Add Sub-goals</p>
                <h3 className="mt-1 text-xl font-semibold text-amber-100">{addPopupGoal.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setAddPopupGoalId(null)}
                className="rounded border border-amber-100/20 bg-white/5 px-2.5 py-1 text-xs font-semibold text-stone-300 transition hover:text-stone-100"
              >
                Close
              </button>
            </div>

            <div className="journal-scroll max-h-[calc(100dvh-9rem)] space-y-3 overflow-y-auto px-4 pb-4 text-sm sm:px-5 sm:pb-5">
              <div className="rounded-lg border border-amber-100/10 bg-white/5 p-3">
                <p className="mb-2 text-sm font-semibold text-amber-200">1. Create Habit</p>
                <button
                  type="button"
                  onClick={() => {
                    setAddPopupGoalId(null);
                    navigate("/dashboard/habit", { state: { tab: "create" } });
                  }}
                  className="rounded border border-amber-400/35 bg-amber-400/10 px-2.5 py-1 text-xs font-semibold text-amber-200 transition hover:bg-amber-400/20"
                >
                  Open Create Habit
                </button>
              </div>

              <div className="rounded-lg border border-amber-100/10 bg-white/5 p-3">
                <p className="mb-2 text-sm font-semibold text-amber-200">2. Add Sub-goals</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newSubgoal}
                    onChange={(e) => setNewSubgoal(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void addSubgoal();
                      }
                    }}
                    placeholder="e.g. Complete DBMS revision"
                    className="w-full rounded-lg border border-amber-100/15 bg-black/20 px-3 py-1.5 text-sm text-stone-100 outline-none transition focus:border-amber-300/35"
                  />
                </div>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end">
                  <div className="flex flex-1 flex-col gap-1">
                    <label className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">
                      Deadline <span className="text-rose-400">*</span>
                    </label>
<DashboardDateTimeInput
                      type="date"
                      value={newDeadline}
                      min={subgoalMinDate}
                      max={subgoalMaxDate}
                      disabled={isSubgoalDateRangeInvalid}
                      onChange={(e) => setNewDeadline(e.target.value)}
                      className="rounded-lg border border-amber-100/15 bg-black/20 px-3 py-1.5 text-sm text-stone-100 outline-none transition focus:border-amber-300/35 [color-scheme:dark]"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => void addSubgoal()}
                    disabled={!newSubgoal.trim() || !newDeadline || isSubmittingSubgoal || isSubgoalDateRangeInvalid}
                    className="self-stretch rounded border border-sky-300/25 bg-sky-400/10 px-4 py-2 text-xs font-semibold text-sky-200 transition hover:bg-sky-400/20 disabled:cursor-not-allowed disabled:opacity-40 sm:self-end sm:py-1.5"
                  >
                    {isSubmittingSubgoal ? "Saving..." : "Add"}
                  </button>
                </div>
                {subgoalError ? <p className="mt-2 text-xs text-rose-300">{subgoalError}</p> : null}
                {isSubgoalDateRangeInvalid ? (
                  <p className="mt-2 text-xs text-rose-300">
                    This goal cannot accept new sub-goals because its valid date window has already passed.
                  </p>
                ) : null}
                <p className="mt-2 text-xs text-stone-400">
                  Sub-goal deadline must be between {subgoalMinDate || "today"} and {subgoalMaxDate || "goal deadline"}.
                </p>
                <p className="mt-1 text-xs text-stone-400">
                  Added sub-goals will be visible in the `Update Progress` popup.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {popupGoal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/65 p-3 sm:items-center sm:p-4">
          <div className="w-full max-w-4xl overflow-hidden rounded-2xl border border-amber-100/10 bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.08),transparent_35%),linear-gradient(180deg,rgba(30,18,14,0.95),rgba(12,8,8,0.97))] shadow-2xl shadow-black/50 backdrop-blur">
            <div className="sticky top-0 z-10 mb-4 flex items-start justify-between gap-3 border-b border-amber-100/10 bg-[#1a100c]/95 px-4 py-3 sm:px-5">
              <div>
                <p className="text-label-lg">Update Progress</p>
                <h3 className="mt-1 text-xl font-semibold text-amber-100">{popupGoal.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setPopupGoalId(null)}
                className="rounded border border-amber-100/20 bg-white/5 px-2.5 py-1 text-xs font-semibold text-stone-300 transition hover:text-stone-100"
              >
                Close
              </button>
            </div>

            <div className="journal-scroll max-h-[calc(100dvh-9rem)] overflow-y-auto px-4 pb-4 sm:px-5 sm:pb-5">
              {subgoalError ? (
                <p className="mb-3 rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                  {subgoalError}
                </p>
              ) : null}
              <div className="grid gap-4 md:grid-cols-2">
              <section className="flex min-h-[18rem] flex-col rounded-xl border border-amber-100/10 bg-white/5 p-3 sm:h-[47vh]">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-semibold text-amber-200">Pending</p>
                  <span className="rounded-full border border-amber-100/10 bg-black/20 px-2 py-0.5 text-[11px] text-stone-300">
                    {pendingMilestones.length}
                  </span>
                </div>
                {pendingMilestones.length === 0 ? (
                  <p className="text-xs text-stone-400">No pending breakdowns.</p>
                ) : (
                  <div className="journal-scroll min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                    {pendingMilestones.map((milestone) => (
                      <div key={milestone.id} className="flex flex-col items-start gap-2 rounded-lg border border-amber-100/10 bg-black/20 px-2.5 py-2 sm:flex-row sm:justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="break-all text-sm leading-relaxed text-stone-100">{milestone.title}</p>
                          <DeadlineBadge deadline={milestone.deadline} />
                        </div>
                        <div className="flex shrink-0 flex-wrap items-start gap-1.5 sm:justify-end">
                          <button
                            type="button"
                            onClick={() => void updateMilestoneStatus(popupGoal.id, milestone.id, true)}
                            disabled={Boolean(pendingMilestoneActions[`${popupGoal.id}:${milestone.id}:done`])}
                            className="dashboard-card-action"
                            data-tone="success"
                          >
                            {pendingMilestoneActions[`${popupGoal.id}:${milestone.id}:done`] ? "Saving..." : "✓ Mark as Done"}
                          </button>
                          <button
                            type="button"
                            onClick={() => void deleteSubgoal(popupGoal.id, milestone.id)}
                            disabled={Boolean(pendingMilestoneActions[`${popupGoal.id}:${milestone.id}:delete`])}
                            className="dashboard-card-action"
                            data-tone="danger"
                            title="Delete sub-goal"
                          >
                            {pendingMilestoneActions[`${popupGoal.id}:${milestone.id}:delete`] ? "..." : "X"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="flex min-h-[18rem] flex-col rounded-xl border border-amber-100/10 bg-white/5 p-3 sm:h-[47vh]">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-semibold text-amber-200">Completed</p>
                  <span className="rounded-full border border-amber-100/10 bg-black/20 px-2 py-0.5 text-[11px] text-stone-300">
                    {completedMilestones.length}
                  </span>
                </div>
                {completedMilestones.length === 0 ? (
                  <p className="text-xs text-stone-400">No completed breakdowns yet.</p>
                ) : (
                  <div className="journal-scroll min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                    {completedMilestones.map((milestone) => (
                      <div key={milestone.id} className="flex flex-col items-start gap-2 rounded-lg border border-emerald-400/20 bg-emerald-500/5 px-2.5 py-2 sm:flex-row sm:justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="break-all text-sm leading-relaxed text-emerald-100">{milestone.title}</p>
                          <DeadlineBadge deadline={milestone.deadline} />
                        </div>
                        <div className="flex shrink-0 flex-wrap items-start gap-1.5 sm:justify-end">
                          <button
                            type="button"
                            onClick={() => void updateMilestoneStatus(popupGoal.id, milestone.id, false)}
                            disabled={Boolean(pendingMilestoneActions[`${popupGoal.id}:${milestone.id}:undo`])}
                            className="dashboard-card-action"
                            data-tone="warning"
                          >
                            {pendingMilestoneActions[`${popupGoal.id}:${milestone.id}:undo`] ? "Saving..." : "↶ Undo"}
                          </button>
                          <button
                            type="button"
                            onClick={() => void deleteSubgoal(popupGoal.id, milestone.id)}
                            disabled={Boolean(pendingMilestoneActions[`${popupGoal.id}:${milestone.id}:delete`])}
                            className="dashboard-card-action"
                            data-tone="danger"
                            title="Delete sub-goal"
                          >
                            {pendingMilestoneActions[`${popupGoal.id}:${milestone.id}:delete`] ? "..." : "X"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
