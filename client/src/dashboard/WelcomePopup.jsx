import { AnimatePresence, motion as Motion } from "framer-motion";
import monkGreetings from "../assets/monkgreetingslogo.png";

export default function WelcomePopup({ onClose }) {
  return (
    <AnimatePresence>
      <Motion.div
        key="welcome-backdrop"
        className="fixed inset-0 z-[999] flex items-center justify-center px-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Card */}
        <Motion.div
          className="relative z-10 flex w-full max-w-2xl overflow-hidden rounded-3xl border border-amber-100/15 bg-[#1a120e] shadow-[0_0_80px_rgba(245,158,11,0.12)]"
          initial={{ opacity: 0, scale: 0.93, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.93, y: 24 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 z-20 flex h-8 w-8 items-center justify-center rounded-full border border-amber-100/15 bg-white/5 text-stone-400 transition hover:border-amber-300/40 hover:text-amber-200"
            aria-label="Close welcome popup"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>

          {/* Left — monk image */}
          <div className="hidden sm:flex w-[220px] shrink-0 flex-col items-center justify-end bg-gradient-to-b from-amber-900/20 to-[#120d0a] px-6 pb-0 pt-8">
            <img
              src={monkGreetings}
              alt="Monk greeting"
              className="w-full max-w-[180px] object-contain drop-shadow-[0_0_24px_rgba(245,158,11,0.25)]"
            />
          </div>

          {/* Right — instructions */}
          <div className="flex flex-1 flex-col justify-center px-7 py-10 sm:px-8">
            {/* Mobile image */}
            <div className="mb-5 flex justify-center sm:hidden">
              <img
                src={monkGreetings}
                alt="Monk greeting"
                className="w-28 object-contain"
              />
            </div>

            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-amber-400/70">
              Welcome to MonkMode
            </p>

            <h2 className="mt-2 font-heading text-2xl font-black text-amber-100 sm:text-3xl">
              Namo Buddhaya 🙏
            </h2>

            <p className="mt-3 text-sm leading-relaxed text-stone-300">
              Before you begin your journey, we humbly suggest exploring the app with our{" "}
              <span className="font-semibold text-amber-300">Demo Account</span> first — so you can experience every feature fully before setting up your own.
            </p>

            <div className="mt-5 rounded-2xl border border-amber-100/10 bg-white/4 px-5 py-4 text-sm">
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-amber-300/80">
                Demo Login Credentials
              </p>
              <div className="space-y-1.5 text-stone-300">
                <div className="flex items-center gap-2">
                  <span className="text-amber-400/60">✉</span>
                  <span className="font-mono text-amber-100">demo@monkmode.com</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-amber-400/60">🔑</span>
                  <span className="font-mono text-amber-100">demo1234</span>
                </div>
              </div>
            </div>

            <p className="mt-4 text-xs leading-relaxed text-stone-400">
              The demo account is pre-filled with sample habits, goals, journal entries, workouts and analysis data — perfect for a complete walkthrough. ☸️
            </p>

            <button
              type="button"
              onClick={onClose}
              className="mt-7 self-start rounded-full border border-amber-100/30 bg-gradient-to-r from-[#ffd86b] via-[#f5b52f] to-[#ea8a17] px-6 py-2.5 text-xs font-black uppercase tracking-[0.18em] text-stone-950 shadow-[0_0_24px_rgba(251,191,36,0.3)] transition hover:shadow-[0_0_36px_rgba(251,191,36,0.5)]"
            >
              Got it, let's begin
            </button>
          </div>
        </Motion.div>
      </Motion.div>
    </AnimatePresence>
  );
}
