import { useGymEnvironment } from "./gymContext";

export default function GymNotice() {
  const { loadError, error, loading, refresh, ready } = useGymEnvironment();
  if (!loadError && !error && ready) return null;
  return <div role={loadError || error ? "alert" : "status"} className="mb-3 rounded-xl border border-amber-100/20 bg-black/30 p-3 text-sm text-amber-100">
    {loadError || error || "Loading Gym plans…"}
    {loadError && <button type="button" className="ml-3 underline" disabled={loading} onClick={refresh}>Retry</button>}
  </div>;
}
