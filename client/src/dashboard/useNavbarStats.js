import { useEffect, useState } from "react";
import api from "../api/axios";
import { todoReportDay } from "../../../shared/todoWeeklyStats.js";
import { validNavbarStats } from "./navbarResponse";

const UPDATE_EVENTS = ["storage", "focus", "monkmode:habits-updated", "monkmode:todos-updated", "monkmode:journal-logged-days-updated"];

export default function useNavbarStats(isDemoMode, accountId) {
  const [state, setState] = useState({ owner: null, data: null, loading: true, error: "" });
  const [clock, setClock] = useState({ timezone: "Asia/Kolkata", offset: 0 });
  const [tick, setTick] = useState(() => Date.now());
  const [attempt, setAttempt] = useState(0);
  const today = todoReportDay(tick + clock.offset, clock.timezone);

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
      setState(previous => ({ owner: accountId, data: previous.owner === accountId ? previous.data : null, loading: true, error: "" }));
      try {
        const { data } = await api.get("/insights/consistency", { signal: current.signal, timeout: 15000 });
        if (!alive()) return;
        if (!validNavbarStats(data)) throw new Error("Invalid header statistics");
        setClock({ timezone: data.timezone, offset: data.serverNow ? Date.parse(data.serverNow) - Date.now() : 0 });
        setTick(Date.now());
        setState({ owner: accountId, data, loading: false, error: "" });
      } catch (error) {
        if (!alive()) return;
        setState(previous => ({ owner: accountId, data: previous.owner === accountId ? previous.data : null,
          loading: false, error: error.response?.status === 401
            ? "Please sign in again to load header statistics." : "Could not load header statistics. Please retry." }));
      }
    };
    refresh();
    UPDATE_EVENTS.forEach(event => window.addEventListener(event, refresh));
    return () => {
      disposed = true;
      controller?.abort();
      UPDATE_EVENTS.forEach(event => window.removeEventListener(event, refresh));
    };
  }, [isDemoMode, accountId, today, attempt]);

  const matches = state.owner === accountId;
  return { data: !isDemoMode && matches && state.data?.date === today ? state.data : null,
    loading: !isDemoMode && (!matches || state.loading), error: !isDemoMode && matches ? state.error : "",
    today, retry: () => setAttempt(value => value + 1) };
}
