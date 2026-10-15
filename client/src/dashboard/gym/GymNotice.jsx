import { useGymEnvironment } from "./gymContext";

export default function GymNotice() {
  const { loadError, error, loading, refresh, ready, writeBlocked, saving } = useGymEnvironment();
  if (!loadError && !error && !writeBlocked && ready) return null;
  return <div role={loadError || error ? "alert" : "status"} className="mb-3 rounded-xl border border-amber-100/20 bg-black/30 p-3 text-sm text-amber-100">
    {loadError || error || "Syncing Gym data…"}
    {loadError && <button type="button" className="ml-3 underline" disabled={loading} onClick={refresh}>Retry</button>}
    {writeBlocked && <div className="mt-2">
      <p>The last change was not confirmed or conflicted. Reload before another change. Reloading replaces open drafts.</p>
      <button type="button" className="mt-2 underline" disabled={saving || loading} onClick={() => refresh({ recover: true })}>Reload Gym (replaces drafts)</button>
    </div>}
  </div>;
}
