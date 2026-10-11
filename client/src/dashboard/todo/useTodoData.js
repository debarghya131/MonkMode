import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import api from "../../api/axios";
import { DEFAULT_CATEGORIES, DEFAULT_IMPORTANT_CATEGORIES } from "./todoShared";
import { DEFAULT_TODO_TIMEZONE, todoClock, todosOnDay } from "./todoUtils";
import { validTodoStatusResponse, validTodos, validTodoSummary, validTodoPreferences, todoFailureMessage, todoRevision, uncertainTodoWrite } from "./todoResponse";

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
  const blockedIds = useRef(new Set());
  const tasksRef = useRef([]);
  const refreshController = useRef(null);
  const preferencesRef = useRef(preferences);
  const pendingPreferences = useRef(null);
  const savingPreferences = useRef(false);
  const unsyncedPreferences = useRef(false);
  const clock = todoClock(new Date(tick + clockSkew), timezone);
  const previousDay = useRef(clock.date);

  const setTasks = useCallback(update => {
    requestVersion.current += 1;
    setTaskState(previous => {
      const next = typeof update === "function" ? update(previous) : update;
      tasksRef.current = next;
      return next;
    });
  }, []);

  const refreshTasks = useCallback(async () => {
    if (isDemoMode || lockedIds.current.size || !live.current) return false;
    refreshController.current?.abort();
    const controller = new AbortController();
    refreshController.current = controller;
    const version = ++requestVersion.current;
    const statsVersion = ++summaryVersion.current;
    const previousPreferences = preferencesRef.current;
    if (!readyRef.current) setLoading(true);
    try {
      const options = { signal: controller.signal, timeout: 15000 };
      const requests = [api.get("/todos", options), api.get("/todos/summary", options), api.get("/todos/preferences", options)];
      const [taskResponse, summaryResponse, preferenceResponse] = await Promise.all(requests);
      if (!live.current || version !== requestVersion.current || controller.signal.aborted) return false;
      if (!validTodos(taskResponse.data) || !validTodoSummary(summaryResponse.data)
        || (preferenceResponse && !validTodoPreferences(preferenceResponse.data))) throw new Error("Invalid task snapshot");
      const nextTimezone = summaryResponse.data.timezone;
      todoClock(new Date(), nextTimezone); // Validate before publishing the snapshot.
      setTaskState(taskResponse.data);
      tasksRef.current = taskResponse.data;
      if (statsVersion === summaryVersion.current) setSummary(summaryResponse.data);
      setTimezone(nextTimezone);
      if (Number.isFinite(Date.parse(summaryResponse.data.serverNow))) setClockSkew(Date.parse(summaryResponse.data.serverNow) - Date.now());
      setTick(Date.now());
      if (preferenceResponse && preferencesRef.current === previousPreferences && !savingPreferences.current && !pendingPreferences.current && !unsyncedPreferences.current) {
        preferencesRef.current = preferenceResponse.data;
        setPreferences(preferenceResponse.data);
      }
      readyRef.current = true;
      setReady(true);
      setError("");
      setActionErrors({});
      blockedIds.current.clear();
      return true;
    } catch (err) {
      if (live.current && version === requestVersion.current && !controller.signal.aborted) setError(todoFailureMessage(err, "Could not load tasks and settings. Please retry. Last loaded tasks, if any, are still shown."));
      return false;
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
      refreshController.current?.abort();
      requestVersion.current += 1;
      window.clearInterval(clockTimer);
      window.clearInterval(refreshTimer);
      window.removeEventListener("focus", update);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("monkmode:todos-updated", update);
    };
  }, [refreshTasks]);

  useEffect(() => {
    if (previousDay.current !== clock.date) { previousDay.current = clock.date; refreshTasks(); }
  }, [clock.date, refreshTasks]);

  const persistPreferences = useCallback(async () => {
    if (isDemoMode || savingPreferences.current) return;
    savingPreferences.current = true;
    try {
      while (pendingPreferences.current && live.current) {
        const next = pendingPreferences.current;
        pendingPreferences.current = null;
        try {
          const { data } = await api.patch("/todos/preferences", next, { signal: requestController.current.signal, timeout: 15000 });
          if (!validTodoPreferences(data)) throw new Error("Invalid preference confirmation");
          if (live.current) {
            if (preferencesRef.current === next) { preferencesRef.current = data; setPreferences(data); unsyncedPreferences.current = false; }
            setPreferencesError("");
            window.dispatchEvent(new CustomEvent("monkmode:todos-updated", { detail: { source: "todo-preferences" } }));
          }
        } catch (err) {
          if (live.current) setPreferencesError(todoFailureMessage(err, "Category changes could not be confirmed. Retry to sync your account."));
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
    unsyncedPreferences.current = true;
    setPreferences(next);
    pendingPreferences.current = next;
    persistPreferences();
  }, [isDemoMode, persistPreferences]);
  const setCategoryOptions = useCallback(update => changePreference("categories", update), [changePreference]);
  const setImportantCategories = useCallback(update => changePreference("importantCategories", update), [changePreference]);
  const retryPreferences = () => { pendingPreferences.current = preferencesRef.current; persistPreferences(); };

  const updateStatus = useCallback(async (id, date, status, completedAt = "") => {
    if (isDemoMode || lockedIds.current.has(id) || blockedIds.current.has(id)) return false;
    const original = tasksRef.current.find(task => task.id === id);
    if (!original) return false;
    lockedIds.current.add(id);
    requestVersion.current += 1;
    summaryVersion.current += 1;
    setBusyIds(new Set(lockedIds.current));
    let acknowledged = false;
    let saved = false;
    try {
      const { data } = await api.patch(`/todos/${id}/status`, { date, status, completedAt, ...todoRevision(original) }, { signal: requestController.current.signal, timeout: 20000 });
      if (!live.current) return false;
      acknowledged = true;
      if (!validTodoStatusResponse(data, id, date, status)) throw new Error("Invalid task update confirmation");
      saved = true;
      setTasks(previous => previous.map(task => task.id === id ? data : task));
      setActionErrors(previous => { const next = { ...previous }; delete next[id]; return next; });
      return true;
    } catch (err) {
      if (live.current) {
        const uncertain = uncertainTodoWrite(err, acknowledged);
        if (uncertain) blockedIds.current.add(id);
        setActionErrors(previous => ({ ...previous, [id]: todoFailureMessage(err, uncertain
          ? "Task update could not be confirmed. Reload tasks using Retry before changing it again."
          : "Task update was rejected. Your selection has been kept; please retry.") }));
      }
      return false;
    } finally {
      lockedIds.current.delete(id);
      if (live.current) {
        setBusyIds(new Set(lockedIds.current));
        if (!lockedIds.current.size) {
          // Refresh statistics without clearing a failed action's message.
          const statsVersion = ++summaryVersion.current;
          api.get("/todos/summary", { signal: requestController.current.signal, timeout: 15000 }).then(({ data }) => {
            if (!live.current || statsVersion !== summaryVersion.current) return;
            if (!validTodoSummary(data)) throw new Error("Invalid summary confirmation");
            setSummary(data);
          }).catch(() => {
            if (live.current && statsVersion === summaryVersion.current) setError(current => current || (saved
              ? "Task saved, but consistency could not refresh. Retry loading statistics."
              : "Task change was not confirmed, and statistics could not refresh. Retry loading tasks."));
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
