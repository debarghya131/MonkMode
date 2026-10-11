import { useCallback, useEffect, useRef, useState } from "react";
import { useGymEnvironment } from "./gymContext";
import { useGymApi } from "./useGymData";
import { gymFailureMessage } from "./gymResponse";

// Resource requests belong to this tab/account. A late read must not overwrite
// a confirmed mutation, and a failed refresh must not erase the last good data.
export default function useGymResource(path, demoData, eventName, initialData = []) {
  const api = useGymApi();
  const { isDemoMode, busy } = useGymEnvironment();
  const [data, publish] = useState(() => isDemoMode ? demoData : initialData);
  const [ready, setReady] = useState(isDemoMode);
  const [loading, setLoading] = useState(!isDemoMode);
  const [error, setLoadError] = useState("");
  const control = useRef({ alive: false, sequence: 0, busy, pending: false });
  control.current.busy = busy;

  const setData = useCallback(value => {
    control.current.sequence++;
    if (control.current.alive) { publish(value); setReady(true); setLoading(false); setLoadError(""); }
  }, []);

  const refresh = useCallback(async () => {
    const state = control.current;
    if (isDemoMode || !state.alive) return;
    if (state.busy) { state.pending = true; return; }
    const sequence = ++state.sequence;
    setLoading(true);
    try {
      const response = await api.get(path);
      const objectResource = path === "/gym/exercise-progress";
      if (objectResource ? !response.data || typeof response.data !== "object" || Array.isArray(response.data) : !Array.isArray(response.data)) throw new Error("Invalid section response. Please retry.");
      if (!state.alive || sequence !== state.sequence) return;
      if (state.busy) { state.pending = true; return; }
      publish(response.data);
      setReady(true);
      setLoadError("");
    } catch (failure) {
      if (!state.alive || sequence !== state.sequence || failure.code === "ERR_CANCELED") return;
      setLoadError(gymFailureMessage(failure, "Could not load this section. Please retry."));
    } finally {
      if (state.alive && sequence === state.sequence) setLoading(false);
    }
  }, [api, isDemoMode, path]);

  useEffect(() => {
    const state = control.current;
    state.alive = true;
    void refresh();
    const update = () => { void refresh(); };
    window.addEventListener("focus", update);
    if (eventName) window.addEventListener(eventName, update);
    return () => {
      state.alive = false; state.sequence++;
      window.removeEventListener("focus", update);
      if (eventName) window.removeEventListener(eventName, update);
    };
  }, [refresh, eventName]);

  useEffect(() => {
    if (!busy && control.current.pending) {
      control.current.pending = false;
      void refresh();
    }
  }, [busy, refresh]);

  return { data, setData, loading, error, ready, refresh };
}
