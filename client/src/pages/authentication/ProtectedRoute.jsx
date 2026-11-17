import { Link, Navigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import useBackendWarmup from "../../hooks/useBackendWarmup";

export default function ProtectedRoute({ children }) {
  const { isBootstrapping, isAuthenticated, isDemoMode } = useAuth();
  const { isReady, isWarming, secondsRemaining, error, retry } = useBackendWarmup({
    enabled: !isBootstrapping && isAuthenticated && !isDemoMode,
  });

  if (isBootstrapping) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.12),transparent_34%),linear-gradient(180deg,#17110f_0%,#241714_45%,#120d0c_100%)] px-6 py-10 text-white">
        <div className="w-full max-w-xl rounded-[1.75rem] border border-amber-100/10 bg-white/6 p-6 shadow-2xl shadow-black/25 backdrop-blur">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <div className="skeleton-shimmer h-4 w-36 rounded-full" />
              <div className="skeleton-shimmer mt-3 h-3 w-52 rounded-full opacity-70" />
            </div>
            <div className="skeleton-shimmer h-11 w-11 rounded-2xl" />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="skeleton-shimmer h-24 rounded-2xl" />
            <div className="skeleton-shimmer h-24 rounded-2xl" />
            <div className="skeleton-shimmer h-24 rounded-2xl" />
          </div>
          <p className="mt-5 text-sm text-stone-300">Loading your MonkMode session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Demo data does not use the API. A signed-in dashboard waits here so its
  // first real requests never race a sleeping free-tier Render service.
  if (!isDemoMode && !isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.12),transparent_34%),linear-gradient(180deg,#17110f_0%,#241714_45%,#120d0c_100%)] px-6 py-10 text-white">
        <section className="w-full max-w-lg rounded-[1.75rem] border border-amber-300/15 bg-white/6 p-6 text-center shadow-2xl shadow-black/25 backdrop-blur sm:p-8" aria-live="polite">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-amber-300/30 bg-amber-500/10 text-2xl" aria-hidden="true">🧘</span>
          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-amber-200/75">Preparing your workspace</p>
          <h1 className="mt-2 text-2xl font-bold text-amber-50">{error ? "MonkMode is still waking" : "Waking MonkMode"}</h1>
          {error ? (
            <>
              <p className="mt-3 text-sm leading-6 text-stone-300">{error}</p>
              <button type="button" onClick={retry} className="mt-5 rounded-xl border border-amber-300/40 bg-amber-300/10 px-4 py-2 text-sm font-semibold text-amber-100 transition hover:bg-amber-300/20">
                Retry wake-up
              </button>
            </>
          ) : (
            <>
              <p className="mt-3 text-sm leading-6 text-stone-300">
                Your secure workspace is starting. On Render&apos;s free plan, this can take up to a minute after inactivity.
              </p>
              <p className="mt-5 text-3xl font-bold tabular-nums text-amber-200">{isWarming ? `${secondsRemaining}s` : "Starting..."}</p>
            </>
          )}
          <Link to="/" className="mt-6 inline-flex text-sm font-semibold text-stone-300 transition hover:text-amber-100">Back to home</Link>
        </section>
      </div>
    );
  }

  return children;
}
