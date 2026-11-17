import { useCallback, useEffect, useState } from "react";
import api from "../api/axios";

const COUNTDOWN_SECONDS = 60;
const MAX_WAIT_MS = 75_000;
const RETRY_DELAY_MS = 2_500;
const REQUEST_TIMEOUT_MS = 15_000;

/**
 * Starts a sleeping API service and waits until it can answer a health check.
 * A free Render instance can answer an initial request with a transient error
 * while its container starts, so the check is retried for a short window.
 */
export default function useBackendWarmup({ enabled = true } = {}) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({ status: "warming", secondsRemaining: COUNTDOWN_SECONDS });

  useEffect(() => {
    if (!enabled) {
      setState({ status: "idle", secondsRemaining: 0 });
      return undefined;
    }

    const controller = new AbortController();
    const startedAt = Date.now();
    let retryTimer;

    const updateCountdown = () => {
      const elapsedSeconds = (Date.now() - startedAt) / 1000;
      setState((current) => current.status === "warming"
        ? { ...current, secondsRemaining: Math.max(0, Math.ceil(COUNTDOWN_SECONDS - elapsedSeconds)) }
        : current);
    };

    const markFailed = () => {
      setState({
        status: "failed",
        secondsRemaining: 0,
        message: "MonkMode is taking longer than usual to wake up. Please try again."
      });
    };

    const checkHealth = async () => {
      try {
        const response = await api.get("/health", {
          signal: controller.signal,
          timeout: REQUEST_TIMEOUT_MS,
          skipColdStartRetry: true,
        });

        if (response.data?.status !== "ok") throw new Error("Unexpected health response");
        setState({ status: "ready", secondsRemaining: 0 });
      } catch {
        if (controller.signal.aborted) return;

        if (Date.now() - startedAt >= MAX_WAIT_MS) {
          markFailed();
          return;
        }

        retryTimer = window.setTimeout(checkHealth, RETRY_DELAY_MS);
      }
    };

    setState({ status: "warming", secondsRemaining: COUNTDOWN_SECONDS });
    updateCountdown();
    const countdownTimer = window.setInterval(updateCountdown, 250);
    void checkHealth();

    return () => {
      controller.abort();
      window.clearInterval(countdownTimer);
      window.clearTimeout(retryTimer);
    };
  }, [attempt, enabled]);

  return {
    isReady: state.status === "ready",
    isWarming: state.status === "warming",
    secondsRemaining: state.secondsRemaining,
    error: state.status === "failed" ? state.message : "",
    retry: useCallback(() => setAttempt((current) => current + 1), []),
  };
}
