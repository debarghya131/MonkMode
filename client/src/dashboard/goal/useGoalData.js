import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import api from "../../api/axios";
import { GOALS } from "../../../data/GoalDummyData";
import { buildDemoGoals, DEFAULT_GOAL_TIMEZONE, goalDayKey, normalizeGoal } from "./goalUtils";

export default function useGoalData(isDemoMode) {
  const [rawGoals, setRawGoals] = useState([]);
  const [goalLogs, setGoalLogs] = useState([]);
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
  const live = useRef(false);
  const controller = useRef(null);
  const version = useRef(0);
  const writeLock = useRef(false);
  const today = goalDayKey(new Date(tick + skew), timezone);
  const goals = useMemo(() => isDemoMode ? buildDemoGoals(GOALS, today) : rawGoals.map(goal => normalizeGoal(goal, timezone, today)), [isDemoMode, rawGoals, timezone, today]);

  const refresh = useCallback(async () => {
    if (isDemoMode || !live.current || writeLock.current) return;
    const current = ++version.current;
    const options = { signal: controller.current.signal, timeout: 15000 };
    const isCurrent = () => live.current && current === version.current && !writeLock.current;
    const message = error => error?.response?.data?.message || "Could not refresh goal data. Please retry.";
    const listJob = async () => {
      try {
        const [summary, list] = await Promise.all([api.get("/goals/summary", options), api.get("/goals", options)]);
        if (!isCurrent()) return;
        if (!Array.isArray(list.data)) throw new Error("The server returned an invalid goal list. Please retry.");
        const zone = summary.data.timezone || DEFAULT_GOAL_TIMEZONE;
        goalDayKey(new Date(), zone);
        setTimezone(zone);
        if (Number.isFinite(Date.parse(summary.data.serverNow))) setSkew(Date.parse(summary.data.serverNow) - Date.now());
        setTick(Date.now());
        setRawGoals(list.data);
        setReady(true);
        setLoadError("");
      } catch (error) {
        if (isCurrent()) setLoadError(error.response ? message(error) : error.message || message(error));
      }
    };
    const logsJob = async () => {
      try {
        const { data } = await api.get("/goals/logs", options);
        if (!isCurrent()) return;
        if (!Array.isArray(data)) throw new Error("Invalid goal activity response.");
        setGoalLogs(data);
        setLogsReady(true);
        setLogsError("");
      } catch {
        if (isCurrent()) setLogsError("Could not refresh goal activity. Your goal list is still available.");
      }
    };
    await Promise.all([listJob(), logsJob()]);
  }, [isDemoMode]);

  useEffect(() => {
    live.current = true;
    controller.current = new AbortController();
    const update = () => setTick(Date.now());
    const onFocus = () => { update(); refresh(); };
    const clock = window.setInterval(update, 1000);
    const poll = window.setInterval(() => { if (document.visibilityState === "visible") refresh(); }, 60000);
    window.addEventListener("focus", onFocus);
    window.addEventListener("monkmode:goals-updated", refresh);
    return () => {
      live.current = false;
      version.current += 1;
      controller.current.abort();
      window.clearInterval(clock);
      window.clearInterval(poll);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("monkmode:goals-updated", refresh);
    };
  }, [refresh]);

  useEffect(() => { refresh(); }, [today, refresh]);

  const mutate = async (method, path, body) => {
    if (isDemoMode) throw new Error("Demo goals are read-only.");
    if (!live.current || writeLock.current) throw new Error("Another goal update is saving. Please try again shortly.");
    writeLock.current = true;
    version.current += 1; // Invalidate any pre-write list snapshot.
    setBusy(true);
    setActionError("");
    setWarning("");
    try {
      const { data } = await api.request({ method, url: path, data: body, signal: controller.current.signal });
      if (!live.current) throw new Error("The account changed before this update finished.");
      const goal = data.goal || data;
      if (!goal._id && !goal.id) throw new Error("Saved response was incomplete. Refresh before retrying.");
      const id = String(goal.id || goal._id);
      setRawGoals(previous => [goal, ...previous.filter(item => String(item.id || item._id) !== id)]);
      if (data.warning || goal.warning) setWarning(data.warning || goal.warning);
      return goal;
    } catch (error) {
      if (live.current) setActionError(error.response?.data?.message || error.message || "Could not save the goal. Please retry.");
      throw error;
    } finally {
      writeLock.current = false;
      if (live.current) {
        setBusy(false);
        // A failed background read must not turn a successful save into a failure.
        window.dispatchEvent(new Event("monkmode:goals-updated"));
      }
    }
  };

  const demoLogs = useMemo(() => goals.slice(0, 3).map(goal => ({ id: `${goal.id}-created`, goalId: goal.id, title: goal.title, action: "created", date: goal.startDate < today ? goal.startDate : today, time: "06:30" })), [goals, today]);
  return { goals, goalLogs: isDemoMode ? demoLogs : goalLogs, timezone, today, nowMs: tick + skew, ready, loadError, logsError, logsReady, actionError, warning, busy, refresh, mutate, isDemoMode };
}
