import { Navigate, useNavigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth";

export default function Dashboard() {
  const navigate = useNavigate();
  const { isBootstrapping, isAuthenticated, logout, user } = useAuth();

  if (isBootstrapping) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.12),transparent_34%),linear-gradient(180deg,#17110f_0%,#241714_45%,#120d0c_100%)] px-6 py-10 text-white">
        <div className="rounded-2xl border border-amber-100/10 bg-white/6 px-6 py-5 text-sm text-stone-200 backdrop-blur">
          Loading your MonkMode session...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.12),transparent_34%),linear-gradient(180deg,#17110f_0%,#241714_45%,#120d0c_100%)] px-6 py-10 text-white">
      <div className="w-full max-w-xl rounded-[2rem] border border-amber-100/10 bg-white/6 p-8 shadow-2xl shadow-black/25 backdrop-blur">
        <p className="text-[0.72rem] uppercase tracking-[0.35em] text-amber-200/70">Dashboard</p>
        <h2 className="mt-3 text-3xl font-bold text-amber-50">Welcome, {user?.name}.</h2>
        <p className="mt-4 text-sm leading-7 text-stone-300">
          Your authentication flow is working now. This placeholder dashboard is ready for your next app screens.
        </p>
        <div className="mt-6 rounded-2xl border border-amber-100/10 bg-stone-950/45 p-4 text-sm text-stone-200">
          <p><span className="font-semibold text-amber-100">Signed in as:</span> {user?.email}</p>
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            className="rounded-full border border-amber-100/15 bg-white/8 px-6 py-3 text-sm font-semibold text-amber-50 transition hover:-translate-y-0.5 hover:bg-white/12"
            onClick={() => navigate("/")}
          >
            Return to Landing Page
          </button>
          <button
            type="button"
            className="rounded-full bg-gradient-to-r from-amber-300 to-orange-500 px-6 py-3 text-sm font-bold text-stone-950 shadow-xl shadow-orange-950/25 transition hover:-translate-y-0.5"
            onClick={() => {
              logout();
              navigate("/login");
            }}
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
