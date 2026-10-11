import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import api from "../../api/axios";
import { createDummyWorkouts, DEMO_DIETS, DEMO_WORKOUT_NUTRITION, DEMO_SUPP_PLANS, DEMO_MACRO_PLANS } from "../../../data/GymDummyData";
import { gymDay, gymWeekday, normalizeDemoWorkouts, GYM_TIMEZONE } from "./gymUtils";
import { useGymEnvironment } from "./gymContext";

const cancelled = () => Object.assign(new Error("Request cancelled"), { code: "ERR_CANCELED" });
const demoDiets = () => [
  ...DEMO_DIETS.map(plan => ({ ...plan, planType: "diet" })),
  ...DEMO_WORKOUT_NUTRITION.map(plan => ({ ...plan, planType: "workoutNutrition" })),
  ...DEMO_SUPP_PLANS.map(plan => ({ ...plan, planType: "supplements" })),
  ...DEMO_MACRO_PLANS.map(plan => ({ ...plan, planType: "macros" })),
];

export default function useGymData(isDemoMode, userId) {
  const [clock, setClock] = useState({ timezone: GYM_TIMEZONE, offset: 0 });
  const [now, setNow] = useState(Date.now());
  const today = gymDay(now + clock.offset, clock.timezone);
  const [plans, setPlans] = useState(() => isDemoMode ? normalizeDemoWorkouts(createDummyWorkouts(new Date(`${today}T12:00:00`))) : []);
  const [diets, setDiets] = useState(() => isDemoMode ? demoDiets() : []);
  const [ready, setReady] = useState(isDemoMode);
  const [loading, setLoading] = useState(!isDemoMode);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const control = useRef({ mounted: false, locked: false, version: 0, fetchId: 0, abort: null });

  useEffect(() => {
    const current = control.current;
    current.mounted = true;
    current.abort = new AbortController();
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => { current.mounted = false; current.abort.abort(); window.clearInterval(timer); };
  }, []);

  const refresh = useCallback(async () => {
    if (isDemoMode || control.current.locked || !control.current.mounted) return;
    const current = control.current;
    const version = current.version, fetchId = ++current.fetchId;
    setLoading(true);
    try {
      const config = { signal: current.abort.signal, timeout: 15000 };
      const [workouts, nutrition, clockResponse] = await Promise.all([api.get("/gym/plans", config), api.get("/gym/diet-plans", config), api.get("/gym/clock", config)]);
      if (!current.mounted || version !== current.version || fetchId !== current.fetchId) return;
      if (!Array.isArray(workouts.data) || !Array.isArray(nutrition.data)) throw new Error("Invalid Gym response. Please retry.");
      const serverNow = Date.parse(clockResponse.data?.serverNow);
      const timezone = clockResponse.data?.timezone;
      if (!Number.isFinite(serverNow) || !timezone) throw new Error("Could not verify the app clock. Please retry.");
      gymDay(serverNow, timezone); // Validate the timezone before publishing it.
      setClock({ timezone, offset: serverNow - Date.now() });
      setPlans(workouts.data); setDiets(nutrition.data); setReady(true); setLoadError("");
    } catch (failure) {
      if (current.mounted && failure.code !== "ERR_CANCELED" && version === current.version && fetchId === current.fetchId) {
        setLoadError(failure.response?.data?.message || "Could not load Gym data. Your saved plans have not been changed.");
      }
    } finally {
      if (current.mounted && fetchId === current.fetchId) setLoading(false);
    }
  }, [isDemoMode]);

  useEffect(() => {
    void refresh();
    if (isDemoMode) return;
    const visibleRefresh = () => { if (document.visibilityState === "visible") void refresh(); };
    window.addEventListener("focus", visibleRefresh);
    document.addEventListener("visibilitychange", visibleRefresh);
    const timer = window.setInterval(visibleRefresh, 60000);
    return () => { window.removeEventListener("focus", visibleRefresh); document.removeEventListener("visibilitychange", visibleRefresh); window.clearInterval(timer); };
  }, [isDemoMode, refresh, today]);

  const guard = useCallback(task => async (...args) => {
    const current = control.current;
    if (isDemoMode || current.locked || !current.mounted) return false;
    current.locked = true; current.version++; setBusy(true); setError("");
    try { return await task(...args); }
    catch (failure) {
      if (current.mounted && failure.code !== "ERR_CANCELED") setError(failure.response?.data?.message || failure.message || "Could not save. Please retry.");
      return false;
    } finally { current.locked = false; if (current.mounted) setBusy(false); }
  }, [isDemoMode]);

  return { isDemoMode, userId, today, weekday: gymWeekday(today), timezone: clock.timezone, now: now + clock.offset,
    plans, setPlans, diets, setDiets, ready, loading, loadError, refresh, error, setError, busy, guard };
}

// Each tab/modal aborts its own requests when it closes or the account changes.
export function useGymApi() {
  const { isDemoMode, setError } = useGymEnvironment();
  const control = useRef(null);
  useEffect(() => {
    control.current = new AbortController();
    return () => control.current.abort();
  }, []);
  return useMemo(() => Object.fromEntries(["get", "post", "patch", "delete"].map(method => [method, async (url, ...args) => {
    if (isDemoMode || !control.current || control.current.signal.aborted) throw cancelled();
    const signal = control.current.signal;
    try {
      const config = { signal, timeout: 15000 };
      const response = method === "get" || method === "delete"
        ? await api[method](url, { ...args[0], ...config })
        : await api[method](url, args[0], { ...args[1], ...config });
      if (signal.aborted) throw cancelled();
      if (method !== "get") {
        if (response.data?.warning) setError(response.data.warning);
        if (url !== "/gym/plans/logs") {
          const event = url.startsWith("/gym/diet-plans") ? "monkmode:gym-diet-updated"
            : url.startsWith("/gym/exercise-progress") ? "monkmode:exercise-progress-updated"
            : url.startsWith("/gym/library") ? "monkmode:gym-library-updated"
            : url.startsWith("/gym/measurements") ? "monkmode:gym-measurements-updated"
            : url.startsWith("/gym/gallery") ? "monkmode:gym-gallery-updated" : "monkmode:gym-workouts-updated";
          window.dispatchEvent(new Event(event));
        }
      }
      return response;
    } catch (failure) {
      if (!signal.aborted && failure.code !== "ERR_CANCELED") setError(
        url === "/gym/plans/logs" && method === "post"
          ? "Workout saved, but its history entry could not be saved. Reload history before trying an undo."
          : failure.response?.data?.message || "Gym request failed. Please retry; unsaved changes are kept."
      );
      throw failure;
    }
  }])), [isDemoMode, setError]);
}
