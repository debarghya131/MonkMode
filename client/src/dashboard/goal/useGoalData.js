import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import api from "../../api/axios";
import { GOALS } from "../../../data/GoalDummyData";
import { buildDemoGoals, DEFAULT_GOAL_TIMEZONE, goalDayKey, normalizeGoal } from "./goalUtils";
import { validGoals, validGoalSummary, validGoalLogs, validGoalConfirmation, goalFailureMessage, goalRevision } from "./goalResponse";
import { showDashboardToast } from "../../utils/dashboardToast";

const demoLog = (goal, action, today) => ({
  id: `demo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  goalId: goal.id,
  title: goal.title,
  action,
  date: today,
  time: new Intl.DateTimeFormat("en-GB", { timeZone: DEFAULT_GOAL_TIMEZONE, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date()),
  ...(action === "deleted" ? { deletedItem: true } : {}),
});

export default function useGoalData(isDemoMode, loadLogs = false) {
  const [rawGoals, setRawGoals] = useState([]);
  const [demoGoals, setDemoGoals] = useState(() => buildDemoGoals(GOALS, goalDayKey(new Date(), DEFAULT_GOAL_TIMEZONE)));
  const [goalLogs, setGoalLogs] = useState([]);
  const [demoGoalLogs, setDemoGoalLogs] = useState([]);
  const [timezone, setTimezone] = useState(DEFAULT_GOAL_TIMEZONE);
  const [skew, setSkew] = useState(0);
  const [tick, setTick] = useState(Date.now());
  const [ready, setReady] = useState(isDemoMode);
  const [loadError, setLoadError] = useState("");
  const [logsError, setLogsError] = useState("");
  const [logsReady, setLogsReady] = useState(isDemoMode);
  const [actionError, setActionError] = useState("");
  const [warning, setWarning] = useState("");
  const [busy, setBusy] = useState(false);
  const [writeBlocked, setWriteBlocked] = useState(false);
  const [recoveryEpoch, setRecoveryEpoch] = useState(0);
  const readController = useRef(null);
  const live = useRef(false);
  const controller = useRef(null);
  const version = useRef(0);
  const writeLock = useRef(false);
  const logsEnabled = useRef(loadLogs);
  const wasLogsEnabled = useRef(loadLogs);
  logsEnabled.current = loadLogs;
  const today = goalDayKey(new Date(tick + skew), timezone);
  const goals = useMemo(() => isDemoMode ? demoGoals.map(goal => normalizeGoal(goal, timezone, today)) : rawGoals.map(goal => normalizeGoal(goal, timezone, today)), [isDemoMode, demoGoals, rawGoals, timezone, today]);

  const refresh = useCallback(async ({ recover = false } = {}) => {
    if (isDemoMode || !live.current || writeLock.current) return false;
    readController.current?.abort();
    readController.current = new AbortController();
    const current = ++version.current;
    const options = { signal: readController.current.signal, timeout: 15000 };
    const isCurrent = () => live.current && current === version.current && !writeLock.current;
    const listJob = async () => {
      try {
        const [summary, list] = await Promise.all([api.get("/goals/summary", options), api.get("/goals", options)]);
        if (!isCurrent()) return false;
        if (!validGoals(list.data) || !validGoalSummary(summary.data)) throw new Error("The server returned invalid goal data. Please retry.");
        const zone = summary.data.timezone;
        goalDayKey(new Date(), zone);
        setTimezone(zone);
        if (Number.isFinite(Date.parse(summary.data.serverNow))) setSkew(Date.parse(summary.data.serverNow) - Date.now());
        setTick(Date.now());
        setRawGoals(list.data);
        setReady(true);
        setLoadError("");
        return true;
      } catch (error) {
        if (isCurrent()) setLoadError(goalFailureMessage(error, "Could not refresh goal data. Please retry."));
        return false;
      }
    };
    const logsJob = async () => {
      try {
        const { data } = await api.get("/goals/logs", options);
        if (!isCurrent()) return;
        if (!validGoalLogs(data)) throw new Error("Invalid goal activity response.");
        setGoalLogs(data);
        setLogsReady(true);
        setLogsError("");
      } catch {
        if (isCurrent()) setLogsError("Could not refresh goal activity. Your goal list is still available.");
      }
    };
    const [loaded] = await Promise.all([listJob(), ...(logsEnabled.current ? [logsJob()] : [])]);
    if (loaded && isCurrent() && recover) { setWriteBlocked(false); setActionError(""); setRecoveryEpoch(value => value + 1); }
    return Boolean(loaded && isCurrent());
  }, [isDemoMode]);

  useEffect(() => {
    live.current = true;
    controller.current = new AbortController();
    const update = () => setTick(Date.now());
    const onFocus = () => { update(); refresh(); };
    const poll = window.setInterval(() => { if (document.visibilityState === "visible") refresh(); }, 60000);
    window.addEventListener("focus", onFocus);
    window.addEventListener("monkmode:goals-updated", refresh);
    return () => {
      live.current = false;
      version.current += 1;
      controller.current.abort();
      readController.current?.abort();
      window.clearInterval(poll);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("monkmode:goals-updated", refresh);
    };
  }, [refresh]);

  useEffect(() => {
    const update = () => setTick(Date.now());
    update();
    const clock = window.setInterval(update, loadLogs ? 1000 : 30000);
    return () => window.clearInterval(clock);
  }, [loadLogs]);

  useEffect(() => { refresh(); }, [today, refresh]);
  useEffect(() => {
    if (loadLogs && !wasLogsEnabled.current) void refresh();
    wasLogsEnabled.current = loadLogs;
  }, [loadLogs, refresh]);

  const mutate = async (method, path, body) => {
    if (isDemoMode) {
      const parts = path.split("/").filter(Boolean);
      const goalId = parts[1];
      const subgoalId = parts[3];
      let result;
      let action = "edited";
      let next = [...demoGoals];
      if (method === "post" && path === "/goals") {
        result = normalizeGoal({ id: `demo-goal-${Date.now()}`, ...body, description: body.description || "", isImportant: false, currentValue: 0, targetValue: 0, milestones: [], status: "Active", archiveReason: null }, timezone, today);
        next = [result, ...next]; action = "created";
      } else {
        const index = next.findIndex(item => item.id === goalId);
        if (index < 0) throw new Error("That demo goal is no longer available.");
        const goal = next[index];
        if (parts[2] === "important") { next[index] = { ...goal, isImportant: body.isImportant }; action = "important_toggled"; }
        else if (parts[2] === "restore") { next[index] = { ...goal, deletedAt: null, archiveReason: null, canUndoDelete: false, deleteUndoExpiresAt: null }; action = "restored"; }
        else if (parts[2] === "subgoals" && method === "post") {
          const milestone = { id: `demo-milestone-${Date.now()}`, title: body.title.trim(), deadline: body.deadline, completed: false };
          next[index] = { ...goal, milestones: [...(goal.milestones || []), milestone] }; action = "subgoal_added";
        } else if (parts[2] === "subgoals" && parts[4] === "progress") {
          next[index] = { ...goal, milestones: goal.milestones.map(row => row.id === subgoalId ? { ...row, completed: Boolean(body.completed) } : row) };
          action = body.completed ? "subgoal_completed" : "subgoal_reopened";
        } else if (parts[2] === "subgoals" && method === "delete") {
          next[index] = { ...goal, milestones: goal.milestones.filter(row => row.id !== subgoalId) }; action = "subgoal_deleted";
        } else if (method === "delete") {
          next[index] = { ...goal, deletedAt: new Date().toISOString(), archiveReason: "deleted", canUndoDelete: true, deleteUndoExpiresAt: new Date(Date.now() + 86400000).toISOString() }; action = "deleted";
        } else {
          next[index] = normalizeGoal({ ...goal, ...body }, timezone, today); action = "edited";
        }
        result = next[index];
      }
      setDemoGoals(next);
      setDemoGoalLogs(previous => [demoLog(result, action, today), ...previous.map(log => action === "restored" && log.goalId === result.id ? { ...log, deletedItem: false } : log)].slice(0, 50));
      showDashboardToast(`${action === "created" ? "Goal created" : action === "edited" ? "Goal updated" : action === "deleted" ? "Goal deleted" : action === "restored" ? "Goal restored" : action === "important_toggled" ? "Goal importance updated" : action === "subgoal_added" ? "Sub-goal added" : action === "subgoal_deleted" ? "Sub-goal deleted" : action === "subgoal_completed" ? "Sub-goal completed" : "Sub-goal reopened"}. Demo changes are temporary.`, "success");
      return result;
    }
    if (writeBlocked) throw new Error("Reload goals before another change. The last change could not be confirmed.");
    if (!live.current || writeLock.current) throw new Error("Another goal update is saving. Please try again shortly.");
    writeLock.current = true;
    version.current += 1; // Invalidate any pre-write list snapshot.
    setBusy(true);
    setActionError("");
    setWarning("");
    let acknowledged = false;
    try {
      const selected = rawGoals.find(goal => String(goal.id || goal._id) === path.split("/")[2]);
      const payload = { ...goalRevision(selected), ...body };
      const { data } = await api.request({ method, url: path, data: payload, signal: controller.current.signal, timeout: 20000 });
      if (!live.current) throw new Error("The account changed before this update finished.");
      acknowledged = true;
      if (!validGoalConfirmation(data, method, path, payload, rawGoals, timezone)) throw new Error("Save could not be confirmed. Reload goals and check the list before trying again. Your draft is kept.");
      const goal = data.goal || data;
      const id = String(goal.id || goal._id);
      setRawGoals(previous => [goal, ...previous.filter(item => String(item.id || item._id) !== id)]);
      if (data.warning || goal.warning) setWarning(data.warning || goal.warning);
      return goal;
    } catch (error) {
      const message = goalFailureMessage(error, "Could not save the goal. Please retry.");
      showDashboardToast(message, "danger");
      if (live.current) {
        if (acknowledged || !error.response || error.response.status === 409 || error.response.status >= 500) setWriteBlocked(true);
        setActionError(message);
      }
      throw new Error(message);
    } finally {
      writeLock.current = false;
      if (live.current) {
        setBusy(false);
        // A failed background read must not turn a successful save into a failure.
        window.dispatchEvent(new Event("monkmode:goals-updated"));
      }
    }
  };

  const demoLogs = useMemo(() => [...demoGoalLogs, ...goals.filter(goal => GOALS.slice(0, 3).some(sample => sample.id === goal.id)).map(goal => ({ id: `${goal.id}-created`, goalId: goal.id, title: goal.title, action: "created", date: goal.startDate < today ? goal.startDate : today, time: "06:30" }))], [demoGoalLogs, goals, today]);
  return { goals, goalLogs: isDemoMode ? demoLogs : goalLogs, timezone, today, nowMs: tick + skew, ready, loadError, logsError, logsReady, actionError, warning, busy: busy || writeBlocked, saving: busy, writeBlocked, recoveryEpoch, refresh, mutate, isDemoMode };
}
