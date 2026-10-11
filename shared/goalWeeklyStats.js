import { reportWeekLabel, shiftReportDay } from "./journalWeeklyStats.js";
import { todoReportDay } from "./todoWeeklyStats.js";

const finite = value => typeof value === "number" && Number.isFinite(value) && value >= 0;
const stamp = value => Date.parse(value || "") || 0;
const text = (value, fallback) => typeof value === "string" && value.trim() ? value.trim() : fallback;
const clamp = value => Math.max(0, Math.min(100, Math.round(value)));
const states = new Set(["subgoal_completed", "subgoal_reopened"]);
const dateLabel = day => day ? new Date(`${day}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }) : null;
const distance = (a, b) => Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86400000);
const subTitle = title => String(title || "").split(" (Sub-goal in ")[0];

export function goalReportRisk(goal) {
  if (goal.progress === null) return "History unavailable";
  if (goal.isCompleted) return "Completed";
  if (goal.expected === null) return "No schedule";
  const difference = goal.progress - goal.expected;
  return difference >= 0 ? "On Track" : difference >= -12 ? "Slightly Behind" : "Behind Schedule";
}

export function computeGoalWeeklyReport(goals, logs, weekDays, { today, timezone = "Asia/Kolkata", now = null, onActivity, dayCache = new Map() }) {
  const asOf = weekDays.at(-1) < today ? weekDays.at(-1) : today;
  const dayOf = value => {
    const key = value instanceof Date ? value.getTime() : value;
    if (!dayCache.has(key)) dayCache.set(key, todoReportDay(value, timezone));
    return dayCache.get(key);
  };
  const eligible = (value, cutoff) => {
    const day = dayOf(value);
    return Boolean(day && day <= cutoff && (now === null || stamp(value) <= now));
  };
  const distinct = new Map(), byGoal = new Map();
  goals.forEach((goal, index) => {
    const id = String(goal._id || goal.id || `legacy-${index}`), previous = distinct.get(id);
    if (!previous || stamp(goal.updatedAt) >= stamp(previous.updatedAt)) distinct.set(id, goal);
  });
  for (const log of logs) {
    if (!log?.goalId || !dayOf(log.date) || dayOf(log.date) > today || (now !== null && stamp(log.date) > now) || !finite(log.currentValue)) continue;
    const id = String(log.goalId);
    if (!byGoal.has(id)) byGoal.set(id, new Map());
    const key = log._id ? String(log._id) : `${stamp(log.date)}:${log.previousValue}:${log.currentValue}`;
    byGoal.get(id).set(key, log);
  }
  const rows = [], active = new Set();
  for (const [id, goal] of distinct) {
    const created = dayOf(goal.createdAt || goal.startDate), start = dayOf(goal.startDate || goal.createdAt);
    const deleted = dayOf(goal.deletedAt), deadline = dayOf(goal.deadline);
    if ((created && created > asOf) || (start && start > asOf) || (deleted && deleted < weekDays[0])) continue;
    const cutoff = deleted && deleted < asOf ? deleted : asOf;
    const activity = (Array.isArray(goal.activityLogs) ? goal.activityLogs : []).filter(entry => entry && dayOf(entry.at) && (!now || stamp(entry.at) <= now));
    const audit = [...(byGoal.get(id)?.values() || [])].sort((a, b) => stamp(a.date) - stamp(b.date) || String(a._id || "").localeCompare(String(b._id || "")));
    const historical = cutoff < today;
    const metadataChanged = historical && activity.some(entry => entry.action === "edited" && dayOf(entry.at) > cutoff);
    const removedLater = historical && activity.some(entry => entry.action === "subgoal_deleted" && dayOf(entry.at) > cutoff);
    const stable = goal.updatedAt ? eligible(goal.updatedAt, cutoff) : !historical;
    const sourceSubs = (Array.isArray(goal.subgoals) ? goal.subgoals : []).filter(Boolean);
    const subs = sourceSubs.filter(sub => !dayOf(sub.createdAt) || dayOf(sub.createdAt) <= cutoff);
    let historyLimited = metadataChanged || removedLater || (historical && !stable);
    // Later-added milestones do not prove whether the earlier goal was numeric
    // or milestone-based. An empty historical denominator is not zero progress.
    const futureOnlyMilestones = historical && sourceSubs.length > 0 && subs.length === 0;
    let total = removedLater || futureOnlyMilestones ? null : subs.length, completed = 0, value = null;
    const subStates = subs.map(sub => {
      const subId = sub._id || sub.id;
      const matching = activity.filter(entry => states.has(entry.action) && (entry.subgoalId && subId
        ? String(entry.subgoalId) === String(subId) : subTitle(entry.title) === sub.title));
      const before = matching.filter(entry => eligible(entry.at, cutoff)).sort((a, b) => stamp(a.at) - stamp(b.at));
      const last = before.at(-1);
      const completedDay = dayOf(sub.completedAt);
      if ((stable || (sub.updatedAt && eligible(sub.updatedAt, cutoff))) && (!sub.completed || completedDay))
        return sub.completed === true && Boolean(completedDay && eligible(sub.completedAt, cutoff));
      if (sub.completed && completedDay && eligible(sub.completedAt, cutoff) && (!last || stamp(sub.completedAt) >= stamp(last.at))) return true;
      if (last) {
        if (last.action === "subgoal_reopened") return false;
        if (sub.completed || matching.some(entry => entry.action === "subgoal_reopened" && dayOf(entry.at) > cutoff)) return true;
        return null; // Reopen time may have been trimmed; do not invent an old state.
      }
      if (sub.completed && completedDay) return eligible(sub.completedAt, cutoff);
      if (!historical) return Boolean(sub.completed);
      return stable && !sub.completed ? false : null;
    });
    if (total !== null && !subStates.includes(null)) completed = subStates.filter(Boolean).length;
    else completed = null;
    let isCompleted = false, progress = null, basis = "Unavailable";
    if (sourceSubs.length || removedLater) {
      if (total !== null && completed !== null && !metadataChanged) {
        progress = total ? clamp(completed / total * 100) : 0;
        isCompleted = total > 0 && completed === total; basis = "Milestone history";
      }
    } else {
      const prior = audit.filter(log => eligible(log.date, cutoff)).at(-1);
      const next = audit.find(log => dayOf(log.date) > cutoff && finite(log.previousValue));
      if (stable && finite(goal.currentValue)) { value = goal.currentValue; basis = "Saved value"; }
      else if (prior) { value = prior.currentValue; basis = "Progress log"; }
      else if (next) { value = next.previousValue; basis = "Previous logged value"; }
      const unlogged = activity.some(entry => entry.action === "progress_updated" && eligible(entry.at, cutoff)
        && !audit.some(log => Math.abs(stamp(log.date) - stamp(entry.at)) <= 1000));
      const interveningUnlogged = !prior && next && activity.some(entry => entry.action === "progress_updated"
        && dayOf(entry.at) > cutoff && stamp(entry.at) < stamp(next.date)
        && !audit.some(log => Math.abs(stamp(log.date) - stamp(entry.at)) <= 1000));
      if ((!stable && (unlogged || interveningUnlogged)) || metadataChanged || (goal.archivedReason === "deleted" && !deleted)) value = null;
      if (value !== null && finite(goal.targetValue) && goal.targetValue > 0) {
        progress = clamp(value / goal.targetValue * 100); isCompleted = value >= goal.targetValue;
      }
    }
    if (progress === null) historyLimited = true;
    let expected = start && deadline && deadline >= start && !metadataChanged
      ? clamp((distance(start, cutoff) + 1) / (distance(start, deadline) + 1) * 100) : null;
    if (goal.archivedReason === "deleted" && !deleted) { progress = null; expected = null; historyLimited = true; }
    // Distinct milestones completed during this week, including retained deleted/reopened history.
    const weekCompletions = new Map();
    const inWeek = at => eligible(at, cutoff) && dayOf(at) >= weekDays[0] && (!created || dayOf(at) >= created) && (!start || dayOf(at) >= start);
    for (const entry of activity) if (entry.action === "subgoal_completed" && inWeek(entry.at)) {
      const matching = sourceSubs.find(sub => entry.subgoalId && (sub._id || sub.id) ? String(entry.subgoalId) === String(sub._id || sub.id) : subTitle(entry.title) === sub.title);
      const key = String(entry.subgoalId || matching?._id || matching?.id || `legacy:${subTitle(entry.title)}`);
      weekCompletions.set(key, dayOf(entry.at)); active.add(dayOf(entry.at));
      onActivity?.({ goalId: id, day: dayOf(entry.at), kind: "milestone", key });
    }
    for (const [index, sub] of sourceSubs.entries()) if (sub.completed && inWeek(sub.completedAt)) {
      const key = String(sub._id || sub.id || `legacy:${sub.title || index}`);
      weekCompletions.set(key, dayOf(sub.completedAt)); active.add(dayOf(sub.completedAt));
      onActivity?.({ goalId: id, day: dayOf(sub.completedAt), kind: "milestone", key });
    }
    const updates = audit.filter(log => inWeek(log.date));
    const updateTimes = new Set(updates.map(log => stamp(log.date)));
    for (const entry of activity) if (entry.action === "progress_updated" && inWeek(entry.at)
      && !updates.some(log => Math.abs(stamp(log.date) - stamp(entry.at)) <= 1000)) updateTimes.add(stamp(entry.at));
    for (const at of updateTimes) {
      active.add(dayOf(new Date(at)));
      onActivity?.({ goalId: id, day: dayOf(new Date(at)), kind: "progress", key: String(at) });
    }
    const row = { id, title: text(goal.title, "Untitled goal"), type: goal.goalType === "long-term" ? "Long Term" : "Short Term",
      priority: ["High", "Medium", "Low"].includes(goal.priority) ? goal.priority : "Medium", progress, expected, isCompleted: progress !== null && isCompleted,
      deadline: dateLabel(deadline), deadlineDay: deadline || null, completed, total, completedThisWeek: weekCompletions.size,
      progressUpdatesThisWeek: updateTimes.size, currentValue: value, targetValue: finite(goal.targetValue) ? goal.targetValue : null,
      historyLimited, progressBasis: basis, deleted: Boolean(deleted && deleted <= asOf), asOf: cutoff };
    row.risk = goalReportRisk(row); rows.push(row);
  }
  rows.sort((a, b) => a.title.localeCompare(b.title) || a.id.localeCompare(b.id));
  const known = rows.filter(row => row.progress !== null), milestones = rows.filter(row => row.total !== null && row.completed !== null);
  const avgProgress = known.length ? Math.round(known.reduce((sum, row) => sum + row.progress, 0) / known.length) : null;
  const riskCounts = Object.fromEntries(["On Track", "Slightly Behind", "Behind Schedule", "Completed", "No schedule", "History unavailable"].map(label => [label, rows.filter(row => row.risk === label).length]));
  const pace = known.length ? known.reduce((sum, row) => sum + (row.expected === null ? row.progress : row.expected === 0 ? (row.progress > 0 ? 100 : 0) : Math.min(100, row.progress / row.expected * 100)), 0) / known.length : null;
  const stats = { goalCount: rows.length, knownProgressGoals: known.length, unknownProgressGoals: rows.length - known.length,
    completedGoals: rows.filter(row => row.isCompleted).length, avgProgress, riskCounts,
    totalMilestones: milestones.reduce((sum, row) => sum + row.total, 0), completedMilestones: milestones.reduce((sum, row) => sum + row.completed, 0),
    pendingMilestones: milestones.reduce((sum, row) => sum + row.total - row.completed, 0), unknownMilestoneGoals: rows.length - milestones.length,
    completedMilestonesThisWeek: rows.reduce((sum, row) => sum + row.completedThisWeek, 0), progressUpdatesThisWeek: rows.reduce((sum, row) => sum + row.progressUpdatesThisWeek, 0), activeDays: active.size };
  return { id: weekDays[0], date: reportWeekLabel(weekDays), asOf, status: weekDays.at(-1) < today ? "Ready" : "Draft",
    signal: `${stats.completedMilestonesThisWeek} milestone completions · ${stats.progressUpdatesThisWeek} progress updates`,
    goals: rows, stats, weeklyScore: avgProgress === null ? null : clamp(avgProgress * 0.6 + pace * 0.4),
    historyNote: rows.some(row => row.historyLimited) ? "Some historical values are incomplete. Progress uses retained definitions and recorded events; unknown values are excluded from averages and pace comparisons." : null };
}

export const goalReportDays = monday => Array.from({ length: 7 }, (_, index) => shiftReportDay(monday, index));
