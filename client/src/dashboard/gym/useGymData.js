import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import api from "../../api/axios";
import { createDummyWorkouts, DEMO_DIETS, DEMO_WORKOUT_NUTRITION, DEMO_SUPP_PLANS, DEMO_MACRO_PLANS } from "../../../data/GymDummyData";
import { gymDay, gymWeekday, gymStorageKey, normalizeDemoWorkouts, GYM_TIMEZONE } from "./gymUtils";
import { validWorkoutPlans, validDietPlans, validGymClock, validGymResponse, gymFailureMessage, gymRevision } from "./gymResponse";
import { useGymEnvironment } from "./gymContext";

const cancelled = () => Object.assign(new Error("Request cancelled"), { code: "ERR_CANCELED" });
const demoDiets = () => [
  ...DEMO_DIETS.map(plan => ({ ...plan, planType: "diet" })),
  ...DEMO_WORKOUT_NUTRITION.map(plan => ({ ...plan, planType: "workoutNutrition" })),
  ...DEMO_SUPP_PLANS.map(plan => ({ ...plan, planType: "supplements" })),
  ...DEMO_MACRO_PLANS.map(plan => ({ ...plan, planType: "macros" })),
];

export default function useGymData(isDemoMode, userId, preciseClock = false) {
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
  const [writeBlocked, setWriteBlocked] = useState(false);
  const [recoveryEpoch, setRecoveryEpoch] = useState(0);
  const control = useRef({ mounted: false, locked: false, version: 0, fetchId: 0, abort: null });

  useEffect(() => {
    const current = control.current;
    current.mounted = true;
    current.abort = new AbortController();
    return () => { current.mounted = false; current.abort.abort(); };
  }, []);

  useEffect(() => {
    const update = () => setNow(Date.now());
    update();
    const timer = window.setInterval(update, preciseClock ? 1000 : 30000);
    window.addEventListener("focus", update);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", update); };
  }, [preciseClock]);

  const refresh = useCallback(async ({ recover = false } = {}) => {
    if (isDemoMode || !control.current.mounted) return;
    if (control.current.locked) { control.current.pending = true; return; }
    const current = control.current;
    const version = current.version, fetchId = ++current.fetchId;
    setLoading(true);
    try {
      const config = { signal: current.abort.signal, timeout: 15000 };
      const [workouts, nutrition, clockResponse] = await Promise.all([api.get("/gym/plans", config), api.get("/gym/diet-plans", config), api.get("/gym/clock", config)]);
      if (!current.mounted || version !== current.version || fetchId !== current.fetchId) return;
      if (!validWorkoutPlans(workouts.data) || !validDietPlans(nutrition.data) || !validGymClock(clockResponse.data)) throw new Error("Invalid Gym response. Please retry.");
      const serverNow = Date.parse(clockResponse.data?.serverNow);
      const timezone = clockResponse.data?.timezone;
      if (!Number.isFinite(serverNow) || !timezone) throw new Error("Could not verify the app clock. Please retry.");
      gymDay(serverNow, timezone); // Validate the timezone before publishing it.
      setClock({ timezone, offset: serverNow - Date.now() });
      setPlans(workouts.data); setDiets(nutrition.data); setReady(true); setLoadError("");
      if (recover) {
        try { localStorage.removeItem(gymStorageKey(userId, "diet-draft")); } catch { /* Storage may be unavailable. */ }
        current.blocked = false; setWriteBlocked(false); setError(""); setRecoveryEpoch(value => value + 1);
      }
    } catch (failure) {
      if (current.mounted && failure.code !== "ERR_CANCELED" && version === current.version && fetchId === current.fetchId) {
        setLoadError(gymFailureMessage(failure, "Could not load Gym data. Your saved plans have not been changed."));
      }
    } finally {
      if (current.mounted && fetchId === current.fetchId) setLoading(false);
    }
  }, [isDemoMode, userId]);

  useEffect(() => {
    void refresh();
    if (isDemoMode) return;
    const visibleRefresh = () => { if (document.visibilityState === "visible") void refresh(); };
    window.addEventListener("focus", visibleRefresh);
    window.addEventListener("monkmode:gym-workouts-updated", visibleRefresh);
    window.addEventListener("monkmode:gym-diet-updated", visibleRefresh);
    document.addEventListener("visibilitychange", visibleRefresh);
    const timer = window.setInterval(visibleRefresh, 60000);
    return () => { window.removeEventListener("focus", visibleRefresh); window.removeEventListener("monkmode:gym-workouts-updated", visibleRefresh); window.removeEventListener("monkmode:gym-diet-updated", visibleRefresh); document.removeEventListener("visibilitychange", visibleRefresh); window.clearInterval(timer); };
  }, [isDemoMode, refresh, today]);

  const guard = useCallback(task => async (...args) => {
    const current = control.current;
    if (!ready) { if (current.mounted && !isDemoMode) setError("Gym data must finish syncing before you can save. Retry the sync above."); return false; }
    if (isDemoMode || current.blocked || current.locked || !current.mounted) return false;
    current.locked = true; current.version++; setBusy(true); setError("");
    try { return await task(...args); }
    catch (failure) {
      if (current.mounted && failure.code !== "ERR_CANCELED") setError(gymFailureMessage(failure, "Could not save. Please retry."));
      return false;
    } finally { current.locked = false; if (current.mounted) { setBusy(false); if (current.pending) { current.pending = false; void refresh(); } } }
  }, [isDemoMode, ready, refresh]);

  const blockWrites = useCallback(message => {
    control.current.blocked = true;
    if (control.current.mounted) { setWriteBlocked(true); setError(message || "The update was interrupted. Reload Gym to verify saved records."); }
  }, []);
  const isWriteBlocked = useCallback(() => Boolean(control.current.blocked), []);

  return { isDemoMode, userId, today, weekday: gymWeekday(today), timezone: clock.timezone, now: now + clock.offset,
    plans, setPlans, diets, setDiets, ready, loading, loadError, refresh, error, setError, busy: busy || writeBlocked, saving: busy, writeBlocked, blockWrites, isWriteBlocked, recoveryEpoch, guard };
}

// Each tab/modal aborts its own requests when it closes or the account changes.
export function useGymApi() {
  const { isDemoMode, setError, blockWrites, isWriteBlocked, plans, diets } = useGymEnvironment();
  const snapshot = useRef({ plans, diets });
  snapshot.current = { plans, diets };
  const control = useRef(null);
  useEffect(() => {
    control.current = new AbortController();
    return () => control.current.abort();
  }, []);
  return useMemo(() => Object.fromEntries(["get", "post", "patch", "delete"].map(method => [method, async (url, ...args) => {
    if (isDemoMode || !control.current || control.current.signal.aborted) throw cancelled();
    const signal = control.current.signal;
    let acknowledged = false;
    try {
      if (method !== "get" && isWriteBlocked()) throw new Error("Reload Gym before another change. The last change could not be confirmed.");
      if (["patch", "delete"].includes(method)) {
        const selected = [...snapshot.current.plans, ...snapshot.current.diets].find(row => row.id === url.split("/")[3]);
        if (selected) {
          if (method === "delete") args[0] = { ...args[0], data: { ...gymRevision(selected), ...args[0]?.data } };
          else args[0] = { ...gymRevision(selected), ...args[0] };
        }
      }
      const config = { signal, timeout: 15000 };
      const response = method === "get" || method === "delete"
        ? await api[method](url, { ...args[0], ...config })
        : await api[method](url, args[0], { ...args[1], ...config });
      if (signal.aborted) throw cancelled();
      acknowledged = method !== "get";
      if (!validGymResponse(url, method, response.data, method === "delete" ? args[0]?.data : args[0])) throw new Error(method === "get"
        ? "Invalid Gym section response. Please retry." : "Save could not be confirmed. Reload Gym and check the saved records before trying again. Your draft is kept.");
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
      if (method !== "get" && url !== "/gym/plans/logs" && (acknowledged || !failure.response || failure.response.status === 409 || failure.response.status >= 500)) blockWrites(signal.aborted ? undefined : gymFailureMessage(failure));
      if (method !== "get" && !signal.aborted && failure.code !== "ERR_CANCELED") setError(
        url === "/gym/plans/logs" && method === "post"
          ? "Workout saved, but its history entry could not be saved. Reload history before trying an undo."
          : gymFailureMessage(failure)
      );
      const safe = new Error(gymFailureMessage(failure));
      safe.code = failure.code;
      if (failure.response) safe.response = { status: failure.response.status, data: { message: safe.message } };
      throw safe;
    }
  }])), [isDemoMode, setError, blockWrites, isWriteBlocked]);
}
