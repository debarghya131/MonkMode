import { AnimatePresence, motion as Motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";

export default function DashboardLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isBootstrapping, isAuthenticated, user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close drawer whenever the route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileMenuOpen]);

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

      {/* Navbar */}
      <header className="shrink-0 z-30 border-b border-amber-100/10">
        <Navbar
          user={user}
          onMenuToggle={() => setMobileMenuOpen((prev) => !prev)}
          mobileMenuOpen={mobileMenuOpen}
        />
      </header>

      {/* Body row */}
      <div className="flex flex-1 overflow-hidden">

        {/* Desktop sidebar */}
        <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-amber-100/10 bg-black/10 backdrop-blur overflow-y-auto">
          <Sidebar onLogout={handleLogout} />
        </aside>

        {/* Mobile / tablet drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <>
              {/* Backdrop */}
              <Motion.div
                key="backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => setMobileMenuOpen(false)}
                className="fixed inset-0 z-40 bg-black/65 backdrop-blur-sm lg:hidden"
              />

              {/* Drawer */}
              <Motion.aside
                key="drawer"
                initial={{ x: -288 }}
                animate={{ x: 0 }}
                exit={{ x: -288 }}
                transition={{ type: "spring", stiffness: 320, damping: 32 }}
                className="fixed left-0 top-0 bottom-0 z-50 flex w-72 flex-col border-r border-amber-100/10 bg-[#17110f] overflow-y-auto lg:hidden"
              >
                {/* Drawer header with close button */}
                <div className="flex items-center justify-between border-b border-amber-100/10 px-5 py-4">
                  <p className="text-sm font-semibold text-amber-200 tracking-wide">MonkMode</p>
                  <button
                    type="button"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex h-8 w-8 items-center justify-center rounded-xl border border-amber-100/15 bg-white/5 text-stone-400 transition hover:border-amber-300/30 hover:text-amber-200"
                    aria-label="Close menu"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto">
                  <Sidebar onLogout={handleLogout} />
                </div>
              </Motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Main content */}
        <main className="flex-1 min-w-0 overflow-y-auto px-3 py-5 sm:px-5 sm:py-7 md:px-6 md:py-8 lg:px-6 lg:py-10">
          {children}
        </main>

      </div>
    </div>
  );
}
