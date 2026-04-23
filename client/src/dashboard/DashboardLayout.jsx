import { Navigate, useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";

export default function DashboardLayout({ children }) {
  const navigate = useNavigate();
  const { isBootstrapping, isAuthenticated, user, logout } = useAuth();

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

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="dashboard-shell h-screen flex flex-col bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.12),transparent_34%),linear-gradient(180deg,#17110f_0%,#241714_45%,#120d0c_100%)] text-white">

      {/* Navbar: direct child of flex-col → always full viewport width */}
      <header className="shrink-0 z-30 border-b border-amber-100/10">
        <Navbar user={user} />
      </header>

      {/* Body row: fills all remaining height, clips overflow so children scroll */}
      <div className="flex flex-1 overflow-hidden">

        {/* Sidebar: pinned to extreme left, full remaining height, own scroll */}
        <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-amber-100/10 bg-black/10 backdrop-blur overflow-y-auto">
          <Sidebar onLogout={handleLogout} />
        </aside>

        {/* Content: fills remaining width, scrolls independently */}
        <main className="flex-1 min-w-0 overflow-y-auto px-6 py-10">
          {children}
        </main>

      </div>
    </div>
  );
}
