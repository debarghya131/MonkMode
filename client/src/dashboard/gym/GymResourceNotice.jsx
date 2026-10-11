export default function GymResourceNotice({ resource }) {
  if (!resource.error && resource.ready) return null;
  return <div role={resource.error ? "alert" : "status"} className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-100">
    <span>{resource.error || "Loading this section…"}</span>
    {resource.error && <button type="button" disabled={resource.loading} onClick={resource.refresh} className="rounded-lg border border-amber-300/30 px-3 py-1 text-xs disabled:opacity-50">{resource.loading ? "Retrying…" : "Retry"}</button>}
  </div>;
}
