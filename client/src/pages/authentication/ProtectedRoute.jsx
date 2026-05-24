import { Navigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth";

export default function ProtectedRoute({ children }) {
  const { isBootstrapping, isAuthenticated } = useAuth();

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

  return children;
}
