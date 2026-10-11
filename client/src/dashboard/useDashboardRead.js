import { useEffect, useState } from "react";
import api from "../api/axios";
import { todoReportDay } from "../../../shared/todoWeeklyStats.js";

// Owner/query-scoped reads with explicit empty, unavailable and stale states.
export default function useDashboardRead(path, validate, events, isDemoMode, accountId) {
  const [state, setState] = useState({ key: null, data: null, loading: true, error: "" });
  const [clock, setClock] = useState({ timezone: "Asia/Kolkata", offset: 0 });
  const [tick, setTick] = useState(() => Date.now());
  const [attempt, setAttempt] = useState(0);
  const today = todoReportDay(tick + clock.offset, clock.timezone);
  const key = `${accountId}:${path}:${today}`;
  useEffect(() => {
    if (isDemoMode) return;
    const timer = setInterval(() => setTick(Date.now()), 30000);
    return () => clearInterval(timer);
  }, [isDemoMode]);
  useEffect(() => {
    if (isDemoMode || !accountId) return;
    let disposed = false, sequence = 0, controller;
    const refresh = async () => {
      controller?.abort();
      controller = new AbortController();
      const current = controller, version = ++sequence;
      const alive = () => !disposed && !current.signal.aborted && version === sequence;
      setState(previous => ({ key, data: previous.key === key ? previous.data : null, loading: true, error: "" }));
      try {
        const { data } = await api.get(path, { signal: current.signal, timeout: 15000 });
        if (!alive()) return;
        if (!validate(data)) throw new Error("Invalid dashboard response");
        if (typeof data.timezone === "string") {
          new Intl.DateTimeFormat("en", { timeZone: data.timezone });
          setClock({ timezone: data.timezone, offset: typeof data.serverNow === "string" && Number.isFinite(Date.parse(data.serverNow))
            ? Date.parse(data.serverNow) - Date.now() : 0 });
        }
        setState({ key, data, loading: false, error: "" });
      } catch {
        if (alive()) setState(previous => ({ key, data: previous.key === key ? previous.data : null,
          loading: false, error: "Could not load this section. Please retry." }));
      }
    };
    refresh();
    const allEvents = ["focus", ...events];
    allEvents.forEach(event => window.addEventListener(event, refresh));
    return () => { disposed = true; controller?.abort(); allEvents.forEach(event => window.removeEventListener(event, refresh)); };
  }, [path, validate, events, isDemoMode, accountId, key, attempt]);
  const matches = state.key === key;
  return { data: !isDemoMode && matches ? state.data : null, loading: !isDemoMode && (!matches || state.loading),
    error: !isDemoMode && matches ? state.error : "", today, retry: () => setAttempt(value => value + 1) };
}
