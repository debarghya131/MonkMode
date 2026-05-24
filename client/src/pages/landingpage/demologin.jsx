import { AnimatePresence, motion as Motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthBackground from "../authentication/AuthBackground";
import AuthFloatingMonk from "../authentication/AuthFloatingMonk";
import useAuth from "../../hooks/useAuth";
import monkIllustration from "../../assets/monk.webp";

const DEMO_ENTRY_DURATION = 2100;
export default function DemoLogin() {
  const navigate = useNavigate();
  const { startDemoMode } = useAuth();
  const [isEntering, setIsEntering] = useState(false);
  const [entryProgress, setEntryProgress] = useState(0);

  useEffect(() => {
    if (!isEntering) return undefined;
    const startTime = performance.now();
    let frameId = 0;

    const updateProgress = (now) => {
      const elapsed = now - startTime;
      const nextProgress = Math.min(elapsed / DEMO_ENTRY_DURATION, 1);
      setEntryProgress(nextProgress);

      if (nextProgress < 1) {
        frameId = window.requestAnimationFrame(updateProgress);
      }
    };

    frameId = window.requestAnimationFrame(updateProgress);

    const timerId = window.setTimeout(() => {
      startDemoMode();
      navigate("/dashboard", { replace: true });
    }, DEMO_ENTRY_DURATION);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(timerId);
    };
  }, [isEntering, navigate, startDemoMode]);

  const handleExploreDemo = () => {
    if (isEntering) return;
    setEntryProgress(0);
    setIsEntering(true);
  };

  const safeProgress = Number.isFinite(entryProgress)
    ? Math.max(0, Math.min(entryProgress, 1))
    : 0;
  const progressPercent = Math.round(safeProgress * 100);

  return (
    <div className="auth-page relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-4 text-white sm:min-h-screen sm:px-6 sm:py-8">
      <AuthBackground />

      <div className="relative z-10 flex w-full max-w-lg flex-col items-center sm:-translate-y-6">
        <AuthFloatingMonk />

        <Motion.div
          className="-mt-4 w-full overflow-hidden rounded-[1.75rem] border border-amber-100/10 bg-white/6 shadow-2xl shadow-black/25 backdrop-blur sm:-mt-10 sm:rounded-[2rem]"
          initial={{ opacity: 0, y: 28 }}
          animate={isEntering ? { opacity: 0.18, y: -12, scale: 0.97, filter: "blur(8px)" } : { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <div className="p-4 sm:p-8 md:p-10">
            <div className="mx-auto w-full max-w-md">
              <Motion.p
                className="auth-overline text-[0.66rem] uppercase tracking-[0.28em] text-amber-200/70 sm:text-[0.72rem] sm:tracking-[0.35em]"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.3 }}
              >
                Demo Mode
              </Motion.p>
              <Motion.h2
                className="mt-2.5 font-heading text-[1.8rem] font-bold text-amber-50 sm:mt-3 sm:text-3xl"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.3 }}
              >
                Explore MonkMode
              </Motion.h2>
              <Motion.p
                className="mt-2.5 text-sm leading-6 text-stone-300 sm:mt-3 sm:leading-7"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.3 }}
              >
                Browse the full dashboard — habits, goals, journal, gym, analytics, and reports. Create, edit, and save actions are disabled in demo mode.
              </Motion.p>

              <Motion.div
                className="mt-5 rounded-2xl border border-amber-100/10 bg-white/5 p-4 text-sm leading-5 text-stone-300 sm:mt-6 sm:leading-6"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.27, duration: 0.3 }}
              >
                <p className="font-semibold text-amber-200">Before you continue</p>
                <p className="mt-2">Demo data is sample-only. Nothing you do here will be saved.</p>
              </Motion.div>

              <Motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.34, duration: 0.3 }}
                className="mt-6 sm:mt-8"
              >
                <Motion.button
                  type="button"
                  onClick={handleExploreDemo}
                  disabled={isEntering}
                  className="relative w-full overflow-hidden rounded-full border border-amber-100/45 bg-gradient-to-r from-[#ffd86b] via-[#f5b52f] to-[#ea8a17] px-5 py-3 text-[0.78rem] font-black uppercase tracking-[0.16em] text-stone-950 shadow-[0_0_0_1px_rgba(255,236,178,0.24),0_0_30px_rgba(251,191,36,0.28),0_18px_42px_rgba(120,52,8,0.3)] transition disabled:cursor-not-allowed disabled:opacity-80 sm:px-6 sm:text-sm sm:tracking-[0.18em]"
                  animate={
                    isEntering
                      ? {
                          boxShadow: [
                            "0 0 0 1px rgba(255,236,178,0.24), 0 0 30px rgba(251,191,36,0.28), 0 18px 42px rgba(120,52,8,0.3)",
                            "0 0 0 1px rgba(255,236,178,0.34), 0 0 52px rgba(251,191,36,0.55), 0 18px 48px rgba(120,52,8,0.36)",
                            "0 0 0 1px rgba(255,236,178,0.24), 0 0 30px rgba(251,191,36,0.28), 0 18px 42px rgba(120,52,8,0.3)"
                          ]
                        }
                      : {}
                  }
                  whileHover={
                    isEntering
                      ? undefined
                      : { scale: 1.02, boxShadow: "0 0 0 1px rgba(255,236,178,0.3), 0 0 44px rgba(251,191,36,0.55), 0 18px 42px rgba(120,52,8,0.35)" }
                  }
                  whileTap={isEntering ? undefined : { scale: 0.97 }}
                  transition={{ duration: 0.18 }}
                >
                  {isEntering && (
                    <>
                      <Motion.span
                        className="absolute inset-y-0 left-0 rounded-full bg-white/25"
                        style={{ width: `${progressPercent}%` }}
                        initial={{ width: 0 }}
                      />
                      <Motion.span
                        className="absolute inset-y-0 left-[-20%] w-[24%] -skew-x-12 bg-white/40 blur-md"
                        animate={{ left: ["-20%", "118%"] }}
                        transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
                      />
                    </>
                  )}
                  <span className="relative z-10">
                    {isEntering ? "Turning On Monk Mode..." : "Turn On Monk Mode"}
                  </span>
                </Motion.button>
              </Motion.div>

              <Motion.div
                className="mt-5 flex flex-col items-center gap-2 text-center text-sm text-stone-300 sm:mt-6 sm:flex-row sm:justify-center sm:gap-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.41, duration: 0.3 }}
              >
                <span>Want the full experience?</span>
                <Link to="/signup" className="font-semibold text-amber-200 transition hover:text-amber-100">
                  Sign up free
                </Link>
              </Motion.div>

              <Motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.48, duration: 0.3 }}
              >
                <Motion.button
                  type="button"
                  className="mt-6 rounded-full border border-amber-100/15 bg-white/8 px-6 py-3 text-sm font-semibold text-amber-50 transition duration-300 hover:border-amber-200/50 hover:bg-gradient-to-r hover:from-amber-200 hover:via-yellow-300 hover:to-orange-300 hover:text-stone-950 sm:mt-8"
                  onClick={() => navigate("/")}
                  whileHover={{ scale: 1.03, boxShadow: "0 0 28px rgba(251,191,36,0.45)", y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ duration: 0.18 }}
                >
                  Back Home
                </Motion.button>
              </Motion.div>
            </div>
          </div>
        </Motion.div>
      </div>

      <AnimatePresence>
        {isEntering && (
          <Motion.div
            key="monk-mode-entry"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="absolute inset-0 z-40 flex items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,rgba(255,214,107,0.16),transparent_24%),linear-gradient(180deg,rgba(5,7,14,0.76)_0%,rgba(5,5,10,0.92)_38%,rgba(2,2,6,0.98)_100%)] backdrop-blur-md"
          >
            <Motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.42, ease: "easeOut" }}
              className="relative flex w-full max-w-xl flex-col items-center px-6 text-center"
            >
              {/* Monk + rings — all centered in one wrapper */}
              <div className="relative flex items-center justify-center">
                <Motion.div
                  className="absolute h-60 w-60 rounded-full bg-[radial-gradient(circle,rgba(255,215,120,0.55),rgba(255,176,66,0.18),transparent_68%)] blur-3xl"
                  animate={{ scale: [0.92, 1.1, 0.96], opacity: [0.62, 0.95, 0.7] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                />

                <Motion.div
                  className="absolute h-80 w-80 rounded-full border border-amber-200/12"
                  animate={{ scale: [0.88, 1.08], opacity: [0.38, 0] }}
                  transition={{ duration: 1.9, repeat: Infinity, ease: "easeOut" }}
                />

                <Motion.div
                  className="absolute h-[26rem] w-[26rem] rounded-full border border-amber-100/8"
                  animate={{ scale: [0.94, 1.16], opacity: [0.22, 0] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: "easeOut", delay: 0.3 }}
                />

                <Motion.div
                  className="relative z-10"
                  animate={{ y: [0, -10, 0], scale: [1, 1.035, 1] }}
                  transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
                >
                  <img
                    src={monkIllustration}
                    alt="Entering Monk Mode"
                    className="w-[180px] drop-shadow-[0_26px_60px_rgba(0,0,0,0.5)] sm:w-[220px]"
                  />
                </Motion.div>
              </div>

              <Motion.div
                className="relative z-10 mt-7"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.32 }}
              >
                <p className="text-[0.72rem] uppercase tracking-[0.42em] text-amber-200/70">
                  Monk Mode
                </p>
                <h2 className="mt-4 text-3xl font-bold text-amber-50 font-heading sm:text-[2.5rem]">
                  Entering Focus State...
                </h2>
                <p className="mt-3 max-w-md text-sm leading-7 text-stone-300 sm:text-base">
                  Quieting distractions, lighting the path, and opening your dashboard.
                </p>
              </Motion.div>

              <div className="relative z-10 mt-8 w-full max-w-sm">
                <div className="h-2 overflow-hidden rounded-full bg-white/8">
                  <Motion.div
                    className="h-full rounded-full bg-gradient-to-r from-amber-200 via-yellow-300 to-orange-400"
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 0.12, ease: "linear" }}
                  />
                </div>
                <div className="mt-3 flex items-center justify-between text-[0.7rem] uppercase tracking-[0.2em] text-stone-400">
                  <span>Settling In</span>
                  <span>{progressPercent}%</span>
                </div>
              </div>
            </Motion.div>
          </Motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
