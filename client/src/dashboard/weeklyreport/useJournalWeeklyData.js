import { useCallback, useEffect, useRef, useState } from "react";
import api from "../../api/axios";
import { DEMO_JOURNAL_REPORTS, DEMO_JOURNAL_SUMMARIES } from "./journalDemoReports";

const failureMessage = (error, fallback) => error.response?.data?.error || error.response?.data?.message || fallback;
export default function useJournalWeeklyData(isDemoMode) {
  const [summaries, setSummaries] = useState([]);
  const [loadingSummaries, setLoadingSummaries] = useState(true);
  const [summariesError, setSummariesError] = useState("");
  const [listAttempt, setListAttempt] = useState(0);
  const [selectedWeekId, setSelectedWeekId] = useState(null);
  const [detailAttempt, setDetailAttempt] = useState(0);
  const [detail, setDetail] = useState({ id: null, data: null, loading: false, error: "" });
  const [analysis, setAnalysis] = useState({ text: null, loading: false, error: "", stale: false, warning: "" });
  const context = useRef(null);

  useEffect(() => {
    if (isDemoMode) {
      setSummaries(DEMO_JOURNAL_SUMMARIES);
      setSelectedWeekId(DEMO_JOURNAL_SUMMARIES[0].id);
      setLoadingSummaries(false);
      return;
    }
    const controller = new AbortController();
    setLoadingSummaries(true);
    setSummariesError("");
    api.get("/weekly-report/journal/summaries", { signal: controller.signal, timeout: 15000 })
      .then(({ data }) => {
        if (controller.signal.aborted) return;
        if (!Array.isArray(data)) throw new Error("Invalid summary response");
        setSummaries(data);
        setSelectedWeekId(current => data.some(week => week.id === current) ? current : data[0]?.id || null);
      })
      .catch(error => { if (!controller.signal.aborted) setSummariesError(failureMessage(error, "Could not load journal weeks. Please retry.")); })
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
      setDetail({ id: selectedWeekId, data: DEMO_JOURNAL_REPORTS[selectedWeekId], loading: false, error: "" });
      setAnalysis({ text: DEMO_JOURNAL_REPORTS[selectedWeekId]?.aiSummary, loading: false, error: "", stale: false, warning: "" });
    } else {
      setDetail({ id: selectedWeekId, data: null, loading: true, error: "" });
      const config = { signal: controller.signal, timeout: 15000, params: { week: selectedWeekId } };
      api.get("/weekly-report/journal", config)
        .then(({ data }) => {
          if (!alive()) return;
          if (data?.id !== selectedWeekId || !data.stats || !Array.isArray(data.missedDays)) throw new Error("Invalid report response");
          setDetail({ id: selectedWeekId, data, loading: false, error: "" });
        })
        .catch(error => { if (alive()) setDetail({ id: selectedWeekId, data: null, loading: false, error: failureMessage(error, "Could not load this journal report. Please retry.") }); });
      // Cache-only GET. Generation is an explicit, separately rate-limited POST.
      api.get("/weekly-report/journal/ai-summary", config)
        .then(({ data }) => { if (alive()) setAnalysis({ text: data.aiSummary || null, stale: Boolean(data.stale), loading: false, error: "", warning: "" }); })
        .catch(error => { if (alive()) setAnalysis(previous => ({ ...previous, loading: false, error: failureMessage(error, "Could not load saved analysis. Please retry.") })); });
    }
    return () => controller.abort();
  }, [isDemoMode, selectedWeekId, detailAttempt]);

  const generate = useCallback(async () => {
    const current = context.current;
    if (isDemoMode || !selectedWeekId || !current || current.busy || current.controller.signal.aborted || analysis.loading || !detail.data?.loggedDays) return;
    current.busy = true;
    setAnalysis(previous => ({ ...previous, loading: true, error: "", warning: "" }));
    try {
      const { data } = await api.post("/weekly-report/journal/ai-summary", { regenerate: Boolean(analysis.text) },
        { params: { week: selectedWeekId }, signal: current.controller.signal, timeout: 30000 });
      if (context.current !== current || current.controller.signal.aborted) return;
      if (!data.aiSummary) throw new Error("Empty analysis response");
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
