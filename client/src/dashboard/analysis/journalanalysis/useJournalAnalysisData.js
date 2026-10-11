import { useEffect, useState } from "react";
import api from "../../../api/axios";
import { todoReportDay } from "../../../../../shared/todoWeeklyStats.js";
import { demoJournalAnalysis } from "./journalAnalysisData";

export default function useJournalAnalysisData(isDemoMode) {
  const [clock, setClock] = useState({ timezone: "Asia/Kolkata", offset: 0 });
  const [tick, setTick] = useState(() => Date.now());
  const today = isDemoMode ? "2026-10-10" : todoReportDay(tick + clock.offset, clock.timezone);
  const [period, setPeriod] = useState(() => ({ year: isDemoMode ? "2026" : today.slice(0, 4), month: isDemoMode ? "04" : today.slice(5, 7) }));
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({ loading: true, error: "", data: null });
  useEffect(() => {
    if (isDemoMode) return;
    const timer = setInterval(() => setTick(Date.now()), 30000);
    return () => clearInterval(timer);
  }, [isDemoMode]);
  useEffect(() => {
    const controller = new AbortController();
    setState({ loading: true, error: "", data: null });
    if (isDemoMode) {
      setState({ loading: false, error: "", data: demoJournalAnalysis(period.year, period.month) });
      return;
    }
    api.get("/journal/analysis", { params: { year: period.year, month: Number(period.month) }, signal: controller.signal, timeout: 15000 })
      .then(({ data }) => {
        if (controller.signal.aborted) return;
        if (data?.year !== Number(period.year) || data.month !== Number(period.month) || !Array.isArray(data.entries)
          || !Array.isArray(data.analysis?.days) || !Array.isArray(data.analysis?.weeks) || !Array.isArray(data.analysis?.moods)) throw new Error("Invalid analysis response");
        if (data.serverNow && data.timezone) setClock({ timezone: data.timezone, offset: Date.parse(data.serverNow) - Date.now() });
        setState({ loading: false, error: "", data });
      })
      .catch(err => {
        if (controller.signal.aborted) return;
        const meta = err.response?.data;
        if (meta?.today && meta?.timezone && meta?.serverNow && `${period.year}-${period.month}` > meta.today.slice(0, 7)) {
          setClock({ timezone: meta.timezone, offset: Date.parse(meta.serverNow) - Date.now() });
          setPeriod({ year: meta.today.slice(0, 4), month: meta.today.slice(5, 7) });
          return;
        }
        setState({ loading: false, error: meta?.message || "Could not load Journal Analysis. Please retry.", data: null });
      });
    return () => controller.abort();
  }, [period, today, attempt, isDemoMode]);
  return { ...state, period, today, setPeriod, isDemoMode, retry: () => setAttempt(value => value + 1) };
}
