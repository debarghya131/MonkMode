import { AnimatePresence, motion as Motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import monkIllustration from "../../assets/monk.png";
import AuthBackground from "./AuthBackground";
import AuthFloatingMonk from "./AuthFloatingMonk";
import useAuth from "../../hooks/useAuth";

const ENTRY_DURATION = 2100;

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEntering, setIsEntering] = useState(false);
  const [entryProgress, setEntryProgress] = useState(0);

  useEffect(() => {
    if (!isEntering) return undefined;
    const startTime = performance.now();
    let frameId = 0;

    const updateProgress = (now) => {
      const next = Math.min((now - startTime) / ENTRY_DURATION, 1);
      setEntryProgress(next);
      if (next < 1) frameId = window.requestAnimationFrame(updateProgress);
    };

    frameId = window.requestAnimationFrame(updateProgress);
    const timerId = window.setTimeout(() => navigate("/dashboard", { replace: true }), ENTRY_DURATION);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(timerId);
    };
  }, [isEntering, navigate]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!form.email.trim() || !form.password) {
      setError("Please enter your email and password.");
      return;
    }

    setIsSubmitting(true);

    try {
      await login({ email: form.email.trim(), password: form.password });
      setIsEntering(true);
    } catch (requestError) {
      setError(requestError.response?.data?.message ?? "Unable to login right now.");
      setIsSubmitting(false);
    }
  };

  const progressPercent = Math.round(Math.max(0, Math.min(entryProgress, 1)) * 100);

  return (
    <div className="auth-page relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-6 text-white sm:px-6 sm:py-8">
      <AuthBackground />

      <div className="relative z-10 flex w-full max-w-lg -translate-y-4 flex-col items-center sm:-translate-y-6">
        <AuthFloatingMonk />

        <Motion.div
          className="-mt-8 w-full overflow-hidden rounded-[2rem] border border-amber-100/10 bg-white/6 shadow-2xl shadow-black/25 backdrop-blur sm:-mt-10"
          initial={{ opacity: 0, y: 28 }}
          animate={isEntering ? { opacity: 0.18, y: -12, scale: 0.97, filter: "blur(8px)" } : { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <div className="p-5 sm:p-8 md:p-10">
            <div className="mx-auto w-full max-w-md">
              <Motion.p
                className="auth-overline text-[0.72rem] uppercase tracking-[0.35em] text-amber-200/70"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.3 }}
              >
                Login
              </Motion.p>
              <Motion.h2
                className="mt-3 text-3xl font-bold text-amber-50 font-heading"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.3 }}
              >
                Welcome back
              </Motion.h2>
              <Motion.p
                className="mt-3 text-sm leading-7 text-stone-300"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.3 }}
              >
                Sign in to continue your habits, goals, workouts, and deep work streaks.
              </Motion.p>

              <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
                <Motion.label
                  className="block"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.27, duration: 0.3 }}
                >
                  <span className="mb-2 block text-sm font-medium text-stone-200">Email</span>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    className="w-full rounded-2xl border border-amber-100/10 bg-stone-950/55 px-4 py-3 text-sm text-white outline-none transition placeholder:text-stone-500 focus:border-amber-300/50 focus:ring-2 focus:ring-amber-300/20"
                    placeholder="you@example.com"
                  />
                </Motion.label>

                <Motion.label
                  className="block"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.34, duration: 0.3 }}
                >
                  <span className="mb-2 block text-sm font-medium text-stone-200">Password</span>
                  <input
                    type="password"
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    className="w-full rounded-2xl border border-amber-100/10 bg-stone-950/55 px-4 py-3 text-sm text-white outline-none transition placeholder:text-stone-500 focus:border-amber-300/50 focus:ring-2 focus:ring-amber-300/20"
                    placeholder="Your password"
                  />
                </Motion.label>

                <AnimatePresence>
                  {error && (
                    <Motion.div
                      className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200"
                      initial={{ opacity: 0, height: 0, marginTop: 0 }}
                      animate={{ opacity: 1, height: "auto", marginTop: 16 }}
                      exit={{ opacity: 0, height: 0, marginTop: 0 }}
                      transition={{ duration: 0.22 }}
                    >
                      {error}
                    </Motion.div>
                  )}
                </AnimatePresence>

                <Motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.41, duration: 0.3 }}
                >
                  <Motion.button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full rounded-full border border-amber-100/45 bg-gradient-to-r from-[#ffd86b] via-[#f5b52f] to-[#ea8a17] px-6 py-3 text-sm font-black uppercase tracking-[0.18em] text-stone-950 shadow-[0_0_0_1px_rgba(255,236,178,0.24),0_0_30px_rgba(251,191,36,0.28),0_18px_42px_rgba(120,52,8,0.3)] transition disabled:cursor-not-allowed disabled:opacity-70"
                    whileHover={{ scale: 1.02, boxShadow: "0 0 0 1px rgba(255,236,178,0.3), 0 0 44px rgba(251,191,36,0.55), 0 18px 42px rgba(120,52,8,0.35)" }}
                    whileTap={{ scale: 0.97 }}
                    transition={{ duration: 0.18 }}
                  >
                    {isSubmitting ? "Logging in..." : "Login"}
                  </Motion.button>
                </Motion.div>
              </form>

              <Motion.div
                className="mt-6 flex items-center gap-3 text-sm text-stone-300"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.48, duration: 0.3 }}
              >
                <span>Need an account?</span>
                <Link to="/signup" className="font-semibold text-amber-200 transition hover:text-amber-100">
                  Create one
                </Link>
              </Motion.div>

              <Motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.54, duration: 0.3 }}
              >
                <Motion.button
                  type="button"
                  className="mt-8 rounded-full border border-amber-100/15 bg-white/8 px-6 py-3 text-sm font-semibold text-amber-50 transition duration-300 hover:border-amber-200/50 hover:bg-gradient-to-r hover:from-amber-200 hover:via-yellow-300 hover:to-orange-300 hover:text-stone-950"
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
            key="login-entry"
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
                <p className="text-[0.72rem] uppercase tracking-[0.42em] text-amber-200/70">Monk Mode</p>
                <h2 className="mt-4 font-heading text-3xl font-bold text-amber-50 sm:text-[2.5rem]">
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
