import { useCallback, useEffect, useRef, useState } from "react";
import api from "../../api/axios";
import { validWeeklySummaries, validWeeklyReport, validWeeklyAiResponse, readWeeklySavedAnalysis, weeklyFailureMessage as failureMessage } from "./weeklyReportResponse";
import { DEMO_GOAL_REPORTS, DEMO_GOAL_SUMMARIES } from "./goalDemoReports";

export default function useGoalWeeklyData(isDemoMode) {
  const [summaries, setSummaries] = useState([]);
  const [loadingSummaries, setLoadingSummaries] = useState(true);
  const [summariesError, setSummariesError] = useState("");
  const [listAttempt, setListAttempt] = useState(0);
  const [selectedWeekId, setSelectedWeekId] = useState(null);
  const [detailAttempt, setDetailAttempt] = useState(0);
  const [detail, setDetail] = useState({ id: null, data: null, loading: false, error: "" });
  const [analysis, setAnalysis] = useState({ text: null, loading: false, error: "", stale: false, warning: "" });
  const context = useRef(null);
  const preloaded = useRef(null);

  useEffect(() => {
    if (isDemoMode) {
      preloaded.current = null;
      setSummaries(DEMO_GOAL_SUMMARIES);
      setSelectedWeekId(DEMO_GOAL_SUMMARIES[0].id);
      setLoadingSummaries(false);
      return;
    }
    const controller = new AbortController();
    setLoadingSummaries(true);
    setSummariesError("");
    api.get("/weekly-report/goals/summaries", { signal: controller.signal, timeout: 15000, params: { includeLatest: "1" } })
      .then(({ data }) => {
        if (controller.signal.aborted) return;
        const rows = Array.isArray(data) ? data : data?.summaries;
        if (!validWeeklySummaries(rows)) throw new Error("Invalid summary response");
        if (data?.latestReport && !validWeeklyReport(data.latestReport, "goal", rows[0]?.id)) throw new Error("Invalid latest report response");
        preloaded.current = data?.latestReport || null;
        setSummaries(rows);
        setSelectedWeekId(current => rows.some(week => week.id === current) ? current : rows[0]?.id || null);
      })
      .catch(error => { if (!controller.signal.aborted) setSummariesError(failureMessage(error, "Could not load goal weeks. Please retry.")); })
      .finally(() => { if (!controller.signal.aborted) setLoadingSummaries(false); });
    return () => controller.abort();
  }, [isDemoMode, listAttempt]);

  useEffect(() => {
    const controller = new AbortController();
    const current = { controller, busy: false };
    context.current = current;
    const alive = () => context.current === current && !controller.signal.aborted;
    setAnalysis({ text: null, loading: Boolean(selectedWeekId && !isDemoMode), error: "", stale: false, warning: "" });
    if (!selectedWeekId) {
      setDetail({ id: null, data: null, loading: false, error: "" });
    } else if (isDemoMode) {
      setDetail({ id: selectedWeekId, data: DEMO_GOAL_REPORTS[selectedWeekId], loading: false, error: "" });
      setAnalysis({ text: DEMO_GOAL_REPORTS[selectedWeekId]?.aiSummary, loading: false, error: "", stale: false, warning: "" });
    } else if (preloaded.current?.id === selectedWeekId && detailAttempt === 0) {
      const data = preloaded.current;
      preloaded.current = null;
      setDetail({ id: selectedWeekId, data, loading: false, error: "" });
      setAnalysis({ text: data.savedAnalysis?.aiSummary || null, stale: Boolean(data.savedAnalysis?.stale), loading: false,
        error: data.savedAnalysis?.error || "", warning: "" });
    } else {
      setDetail({ id: selectedWeekId, data: null, loading: true, error: "" });
      const config = { signal: controller.signal, timeout: 15000, params: { week: selectedWeekId, includeAnalysis: "1" } };
      api.get("/weekly-report/goals", config)
        .then(({ data }) => {
          if (!alive()) return;
          if (!validWeeklyReport(data, "goal", selectedWeekId)) throw new Error("Invalid report response");
          setDetail({ id: selectedWeekId, data, loading: false, error: "" });
          readWeeklySavedAnalysis(data, api, "/weekly-report/goals/ai-summary", config)
            .then(saved => { if (alive()) setAnalysis({ text: saved.aiSummary, stale: Boolean(saved.stale), loading: false, error: saved.error || "", warning: "" }); })
            .catch(error => { if (alive()) setAnalysis(previous => ({ ...previous, loading: false, error: failureMessage(error, "Could not load saved analysis. Please retry.") })); });
        })
        .catch(error => { if (alive()) {
          setDetail({ id: selectedWeekId, data: null, loading: false, error: failureMessage(error, "Could not load this goal report. Please retry.") });
          setAnalysis(previous => ({ ...previous, loading: false }));
        } });
    }
    return () => controller.abort();
  }, [isDemoMode, selectedWeekId, detailAttempt]);

  const generate = useCallback(async () => {
    const current = context.current;
    if (isDemoMode || !selectedWeekId || !current || current.busy || current.controller.signal.aborted || analysis.loading || !detail.data?.stats?.goalCount) return;
    current.busy = true;
    setAnalysis(previous => ({ ...previous, loading: true, error: "", warning: "" }));
    try {
      const { data } = await api.post("/weekly-report/goals/ai-summary", { regenerate: Boolean(analysis.text) },
        { params: { week: selectedWeekId }, signal: current.controller.signal, timeout: 30000 });
      if (context.current !== current || current.controller.signal.aborted) return;
      if (!validWeeklyAiResponse(data, true)) throw new Error("Invalid analysis response");
      setAnalysis({ text: data.aiSummary, loading: false, error: "", stale: Boolean(data.stale), warning: data.warning || "" });
    } catch (error) {
      if (context.current === current && !current.controller.signal.aborted)
        setAnalysis(previous => ({ ...previous, loading: false, error: failureMessage(error, "Could not generate analysis. Please retry."), retryWith: "generate" }));
    } finally { current.busy = false; }
  }, [isDemoMode, selectedWeekId, analysis.loading, analysis.text, detail.data]);

  // Do not flash previous-week data before the selection effect runs.
  const matches = detail.id === selectedWeekId;
  return { summaries, loadingSummaries, summariesError, retrySummaries: () => setListAttempt(value => value + 1),
    selectedWeekId, setSelectedWeekId, weekData: matches ? detail.data : null,
    loadingWeekData: Boolean(selectedWeekId && (!matches || detail.loading)), weekError: matches ? detail.error : "",
    retryWeek: () => setDetailAttempt(value => value + 1), analysis, generate };
}


