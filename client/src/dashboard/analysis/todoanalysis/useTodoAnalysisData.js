import { useEffect, useState } from "react";
import api from "../../../api/axios";
import { todoReportDay } from "../../../../../shared/todoWeeklyStats.js";
import { todoAnalysisClockValid, validTodoAnalysisResponse } from "./todoAnalysisResponse";

export default function useTodoAnalysisData(isDemoMode) {
  const [clock, setClock] = useState({ timezone: "Asia/Kolkata", offset: 0 });
  const [tick, setTick] = useState(() => Date.now());
  const today = isDemoMode ? "2026-10-10" : todoReportDay(tick + clock.offset, clock.timezone);
  const [period, setPeriod] = useState(() => ({ year: isDemoMode ? "2026" : today.slice(0, 4), month: isDemoMode ? "04" : today.slice(5, 7) }));
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({ loading: true, error: "", data: null });
  useEffect(() => {
    if (isDemoMode) return;
    const refresh = () => { setTick(Date.now()); setAttempt(value => value + 1); };
    const timer = setInterval(refresh, 60000);
    window.addEventListener("focus", refresh);
    window.addEventListener("monkmode:todos-updated", refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("monkmode:todos-updated", refresh);
    };
  }, [isDemoMode]);
  useEffect(() => {
    const controller = new AbortController();
    setState({ loading: true, error: "", data: null });
    if (isDemoMode) {
      // Live accounts do not need the sample task generator or its calculator.
      import("./todoAnalysisData")
        .then(({ demoTodoAnalysis }) => {
          if (!controller.signal.aborted) setState({ loading: false, error: "", data: demoTodoAnalysis(period.year, period.month) });
        })
        .catch(() => {
          if (!controller.signal.aborted) setState({ loading: false, error: "Could not load ToDo Analysis. Please retry.", data: null });
        });
      return () => controller.abort();
    }
    api.get("/todos/analysis", { params: { year: period.year, month: Number(period.month) }, signal: controller.signal, timeout: 15000 })
      .then(({ data }) => {
        if (controller.signal.aborted) return;
        if (!validTodoAnalysisResponse(data, period)) throw new Error("Invalid analysis response");
        setClock({ timezone: data.timezone, offset: Date.parse(data.serverNow) - Date.now() });
        setState({ loading: false, error: "", data });
      })
      .catch(err => {
        if (controller.signal.aborted) return;
        const meta = err.response?.data;
        if (todoAnalysisClockValid(meta) && `${period.year}-${period.month}` > meta.today.slice(0, 7)) {
          setClock({ timezone: meta.timezone, offset: Date.parse(meta.serverNow) - Date.now() });
          setPeriod({ year: meta.today.slice(0, 4), month: meta.today.slice(5, 7) });
          return;
        }
        setState({ loading: false, error: typeof meta?.message === "string" ? meta.message : "Could not load ToDo Analysis. Please retry.", data: null });
      });
    return () => controller.abort();
  }, [period, today, attempt, isDemoMode]);
  return { ...state, period, today, setPeriod, isDemoMode, retry: () => setAttempt(value => value + 1) };
}

