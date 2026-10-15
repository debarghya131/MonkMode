import { useEffect, useState } from "react";
import api from "../../../api/axios";
import { todoReportDay } from "../../../../../shared/todoWeeklyStats.js";
import { journalAnalysisClockValid, validJournalAnalysisResponse } from "./journalAnalysisResponse";

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
      // The sample generator and its aggregation code are not needed by live
      // accounts. Keep them out of the initial production analysis download.
      import("./journalAnalysisData")
        .then(({ demoJournalAnalysis }) => {
          if (!controller.signal.aborted) setState({ loading: false, error: "", data: demoJournalAnalysis(period.year, period.month) });
        })
        .catch(() => {
          if (!controller.signal.aborted) setState({ loading: false, error: "Could not load Journal Analysis. Please retry.", data: null });
        });
      return () => controller.abort();
    }
    api.get("/journal/analysis", { params: { year: period.year, month: Number(period.month) }, signal: controller.signal, timeout: 15000 })
      .then(({ data }) => {
        if (controller.signal.aborted) return;
        if (!validJournalAnalysisResponse(data, period)) throw new Error("Invalid analysis response");
        setClock({ timezone: data.timezone, offset: Date.parse(data.serverNow) - Date.now() });
        setState({ loading: false, error: "", data });
      })
      .catch(err => {
        if (controller.signal.aborted) return;
        const meta = err.response?.data;
        if (err.response?.status === 400 && journalAnalysisClockValid(meta) && `${period.year}-${period.month}` > meta.today.slice(0, 7)) {
          setClock({ timezone: meta.timezone, offset: Date.parse(meta.serverNow) - Date.now() });
          setPeriod({ year: meta.today.slice(0, 4), month: meta.today.slice(5, 7) });
          return;
        }
        setState({ loading: false, error: typeof meta?.message === "string" && meta.message.trim()
          ? meta.message : "Could not load Journal Analysis. Please retry.", data: null });
      });
    return () => controller.abort();
  }, [period, today, attempt, isDemoMode]);
  return { ...state, period, today, setPeriod, isDemoMode, retry: () => setAttempt(value => value + 1) };
}
