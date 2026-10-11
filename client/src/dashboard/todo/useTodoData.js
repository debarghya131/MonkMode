import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import api from "../../api/axios";
import { DEFAULT_CATEGORIES, DEFAULT_IMPORTANT_CATEGORIES } from "./todoShared";
import { DEFAULT_TODO_TIMEZONE, todoClock, todosOnDay } from "./todoUtils";

export default function useTodoData(isDemoMode, demoTasks) {
  const [storedTasks, setTaskState] = useState([]);
  const tasks = isDemoMode ? demoTasks : storedTasks;
  const [preferences, setPreferences] = useState({ categories: DEFAULT_CATEGORIES, importantCategories: DEFAULT_IMPORTANT_CATEGORIES });
  const [summary, setSummary] = useState(null);
  const [timezone, setTimezone] = useState(DEFAULT_TODO_TIMEZONE);
  const [clockSkew, setClockSkew] = useState(0);
  const [tick, setTick] = useState(Date.now());
  const [ready, setReady] = useState(isDemoMode);
  const [loading, setLoading] = useState(!isDemoMode);
  const [error, setError] = useState("");
  const [actionErrors, setActionErrors] = useState({});
  const [preferencesError, setPreferencesError] = useState("");
  const [busyIds, setBusyIds] = useState(new Set());
  const live = useRef(true);
  const requestController = useRef(new AbortController());
  const requestVersion = useRef(0);
  const summaryVersion = useRef(0);
  const readyRef = useRef(isDemoMode);
  const lockedIds = useRef(new Set());
  const preferencesRef = useRef(preferences);
  const pendingPreferences = useRef(null);
  const savingPreferences = useRef(false);
  const clock = todoClock(new Date(tick + clockSkew), timezone);

  const setTasks = useCallback(update => {
    requestVersion.current += 1;
    setTaskState(update);
  }, []);

  const refreshTasks = useCallback(async () => {
    if (isDemoMode || lockedIds.current.size || !live.current) return;
    const version = ++requestVersion.current;
    const statsVersion = ++summaryVersion.current;
    if (!readyRef.current) setLoading(true);
    try {
      const options = { signal: requestController.current.signal };
      const requests = [api.get("/todos", options), api.get("/todos/summary", options)];
      if (!readyRef.current) requests.push(api.get("/todos/preferences", options));
      const [taskResponse, summaryResponse, preferenceResponse] = await Promise.all(requests);
      if (!live.current || version !== requestVersion.current) return;
      if (!Array.isArray(taskResponse.data)) throw new Error("Invalid task response");
      const nextTimezone = summaryResponse.data.timezone || DEFAULT_TODO_TIMEZONE;
      todoClock(new Date(), nextTimezone); // Validate before publishing the snapshot.
      setTaskState(taskResponse.data);
      if (statsVersion === summaryVersion.current) setSummary(summaryResponse.data);
      setTimezone(nextTimezone);
      if (Number.isFinite(Date.parse(summaryResponse.data.serverNow))) setClockSkew(Date.parse(summaryResponse.data.serverNow) - Date.now());
      setTick(Date.now());
      if (preferenceResponse) {
        preferencesRef.current = preferenceResponse.data;
        setPreferences(preferenceResponse.data);
      }
      readyRef.current = true;
      setReady(true);
      setError("");
      setActionErrors({});
    } catch (err) {
      if (live.current && version === requestVersion.current) setError(err.response?.data?.message || "Could not load tasks and settings. Please retry.");
    } finally {
      if (live.current && version === requestVersion.current) setLoading(false);
    }
  }, [isDemoMode]);

  useEffect(() => {
    live.current = true;
    requestController.current = new AbortController();
    refreshTasks();
    const update = event => { setTick(Date.now()); if (event?.detail?.source !== "todo-status") refreshTasks(); };
    const onVisible = () => { if (document.visibilityState === "visible") update(); };
    const clockTimer = window.setInterval(() => setTick(Date.now()), 15000);
    const refreshTimer = window.setInterval(() => { if (document.visibilityState === "visible") refreshTasks(); }, 60000);
    window.addEventListener("focus", update);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("monkmode:todos-updated", update);
    return () => {
      live.current = false;
      requestController.current.abort();
      requestVersion.current += 1;
      window.clearInterval(clockTimer);
      window.clearInterval(refreshTimer);
      window.removeEventListener("focus", update);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("monkmode:todos-updated", update);
    };
  }, [refreshTasks]);

  const persistPreferences = useCallback(async () => {
    if (isDemoMode || savingPreferences.current) return;
    savingPreferences.current = true;
    try {
      while (pendingPreferences.current && live.current) {
        const next = pendingPreferences.current;
        pendingPreferences.current = null;
        try {
          await api.patch("/todos/preferences", next, { signal: requestController.current.signal });
          if (live.current) setPreferencesError("");
        } catch (err) {
          if (live.current) setPreferencesError(err.response?.data?.message || "Category changes were not saved. Retry to sync your account.");
        }
      }
    } finally {
      savingPreferences.current = false;
    }
  }, [isDemoMode]);

  const changePreference = useCallback((field, update) => {
    if (isDemoMode || !readyRef.current) return;
    const current = preferencesRef.current;
    const next = { ...current, [field]: typeof update === "function" ? update(current[field]) : update };
    preferencesRef.current = next;
    setPreferences(next);
    pendingPreferences.current = next;
    persistPreferences();
  }, [isDemoMode, persistPreferences]);
  const setCategoryOptions = useCallback(update => changePreference("categories", update), [changePreference]);
  const setImportantCategories = useCallback(update => changePreference("importantCategories", update), [changePreference]);
  const retryPreferences = () => { pendingPreferences.current = preferencesRef.current; persistPreferences(); };

  const updateStatus = useCallback(async (id, date, status, completedAt = "") => {
    if (isDemoMode || lockedIds.current.has(id)) return false;
    lockedIds.current.add(id);
    requestVersion.current += 1;
    summaryVersion.current += 1;
    setBusyIds(new Set(lockedIds.current));
    try {
      const { data } = await api.patch(`/todos/${id}/status`, { date, status, completedAt }, { signal: requestController.current.signal });
      if (!live.current) return false;
      setTasks(previous => previous.map(task => task.id === id ? data : task));
      setActionErrors(previous => { const next = { ...previous }; delete next[id]; return next; });
      return true;
    } catch (err) {
      if (live.current) setActionErrors(previous => ({ ...previous, [id]: err.response?.data?.message || "Task update failed. Your task has not been changed; please retry." }));
      return false;
    } finally {
      lockedIds.current.delete(id);
      if (live.current) {
        setBusyIds(new Set(lockedIds.current));
        if (!lockedIds.current.size) {
          // Refresh statistics without clearing a failed action's message.
          const statsVersion = ++summaryVersion.current;
          api.get("/todos/summary", { signal: requestController.current.signal }).then(({ data }) => { if (live.current && statsVersion === summaryVersion.current) setSummary(data); }).catch(() => {
            if (live.current && statsVersion === summaryVersion.current) setError(current => current || "Task saved, but consistency could not refresh. Retry loading statistics.");
          });
          window.dispatchEvent(new CustomEvent("monkmode:todos-updated", { detail: { source: "todo-status" } }));
        }
      }
    }
  }, [isDemoMode, setTasks]);

  const todayTasks = useMemo(() => todosOnDay(tasks, clock.date, { date: clock.date, time: clock.time }, timezone), [tasks, clock.date, clock.time, timezone]);
  const consistency = {
    todayCompleted: todayTasks.filter(task => task.status === "completed").length,
    todayTotal: todayTasks.length,
    lifetimeCompleted: Number(summary?.totalCompletedLifetime ?? summary?.lifetime?.completed ?? 0),
    lifetimeTotal: Number(summary?.totalExpectedLifetime ?? summary?.lifetime?.total ?? 0),
    lifetimeConsistency: Number(summary?.lifetimeConsistency ?? 0),
  };
  const categoryOptions = [...new Map([...DEFAULT_CATEGORIES, ...preferences.categories, ...preferences.importantCategories, ...tasks.map(task => task.category).filter(Boolean)].map(name => [name.toLowerCase(), name])).values()];
  return { tasks, setTasks, todayTasks, clock, timezone, consistency, loading, ready, requestSignal: requestController.current.signal, error: error || Object.values(actionErrors).join(" "), preferencesError, refreshTasks, retryPreferences, busyIds, updateStatus,
    categoryOptions, setCategoryOptions, importantCategories: preferences.importantCategories, setImportantCategories };
}
