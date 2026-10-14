import { AnimatePresence, motion as Motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import monkGreetings from "../assets/monkgreetingslogo.webp";

const PARTICLES = Array.from({ length: 14 }, (_, i) => ({
  id: i,
  size: 2 + (i % 4),
  left: 5 + i * 6.5,
  delay: (i * 0.45) % 5,
  duration: 7 + (i % 5),
}));

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.11, delayChildren: 0.28 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" } },
};

export default function WelcomePopup({ onClose }) {
  const navigate = useNavigate();
  const dialogRef = useRef(null);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    const previousFocus = document.activeElement;
    dialogRef.current?.focus({ preventScroll: true });
    return () => {
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, []);

  const handleDismiss = () => onClose({ dontShowAgain });

  const handleExploreDemo = () => {
    onClose({ dontShowAgain });
    navigate("/demo-login");
  };

  return (
    <AnimatePresence>
      <Motion.div
        key="welcome-backdrop"
        className="welcome-backdrop fixed inset-0 z-[999] flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/72 backdrop-blur-sm"
          onClick={handleDismiss}
        />

        {/* Floating golden particles */}
        {PARTICLES.map((p) => (
          <Motion.span
            key={p.id}
            className="pointer-events-none absolute bottom-0 rounded-full bg-amber-300"
            style={{ width: p.size, height: p.size, left: `${p.left}%`, opacity: 0 }}
            animate={{ y: [0, -820], opacity: [0, 0.55, 0.55, 0] }}
            transition={{
              duration: p.duration,
              delay: p.delay,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        ))}

        {/* Card */}
        <Motion.div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="welcome-title"
          tabIndex={-1}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.stopPropagation();
              handleDismiss();
            }
            if (event.key !== "Tab") return;
            const controls = dialogRef.current.querySelectorAll("button, input");
            const first = controls[0];
            const last = controls[controls.length - 1];
            if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
              event.preventDefault();
              last.focus();
            } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialogRef.current)) {
              event.preventDefault();
              first.focus();
            }
          }}
          className="welcome-card relative z-10 w-full max-w-4xl rounded-3xl border border-amber-100/15 bg-[#1a120e]"
          initial={{ opacity: 0, scale: 0.91, y: 28 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.91, y: 28 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
            {/* Keep animated decoration inside the card when the viewport resizes. */}
            {/* Pulsing border glow */}
            <Motion.div
              className="pointer-events-none absolute inset-0 rounded-3xl"
              animate={{
                boxShadow: [
                  "0 0 0px rgba(245,158,11,0)",
                  "0 0 50px rgba(245,158,11,0.18)",
                  "0 0 0px rgba(245,158,11,0)",
                ],
              }}
              transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
            />

            {/* Top shimmer sweep */}
            <Motion.div
              className="pointer-events-none absolute left-0 top-0 h-px w-full"
              style={{
                background:
                  "linear-gradient(90deg,transparent,rgba(251,191,36,0.55),transparent)",
              }}
              animate={{ x: ["-100%", "100%"] }}
              transition={{ duration: 2.8, delay: 0.6, repeat: Infinity, repeatDelay: 4 }}
            />
          </div>

          <div className="welcome-layout grid min-w-0 gap-0 md:grid-cols-[clamp(220px,34vw,320px)_minmax(0,1fr)]">
            {/* ── Left panel ── */}
            <div className="welcome-greeting relative flex min-w-0 items-center justify-center gap-3 overflow-hidden bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.12),transparent_45%),linear-gradient(180deg,rgba(82,42,20,0.55),rgba(18,13,10,0.98))] px-4 py-3 text-center sm:px-6 md:flex-col md:gap-0 md:py-8 lg:py-10">
              {/* Ambient glow orb */}
              <Motion.div
                className="pointer-events-none absolute left-1/2 top-1/3 h-52 w-52 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-500/10 blur-3xl"
                animate={{ scale: [1, 1.35, 1], opacity: [0.4, 0.9, 0.4] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
              />

              {/* Floating monk */}
              <Motion.img
                src={monkGreetings}
                alt="Monk greeting"
                className="welcome-monk relative w-20 shrink-0 object-contain sm:w-24 md:w-40 lg:w-52"
                style={{ filter: "drop-shadow(0 0 24px rgba(245,158,11,0.3))" }}
                initial={{ opacity: 0, scale: 0.78, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: [0, -11, 0] }}
                transition={{
                  opacity: { duration: 0.5 },
                  scale: { duration: 0.5 },
                  y: { duration: 3.8, repeat: Infinity, ease: "easeInOut", delay: 0.5 },
                }}
              />

              {/* Glow ring under monk */}
              <Motion.div
                className="pointer-events-none mt-2 hidden h-2 w-28 rounded-full bg-amber-400/20 blur-md md:block"
                animate={{ scaleX: [1, 0.7, 1], opacity: [0.5, 0.2, 0.5] }}
                transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
              />

              <Motion.h2
                className="min-w-0 font-heading text-lg font-black leading-snug text-amber-100 sm:text-[1.35rem] md:mt-2 md:w-full md:px-2 md:text-xl lg:text-[1.5rem]"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45, duration: 0.4 }}
              >
                Namo Buddhaya 🙏
              </Motion.h2>
            </div>

            {/* ── Right panel ── */}
            <Motion.div
              className="welcome-content flex min-w-0 flex-1 flex-col justify-center px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-9"
              variants={stagger}
              initial="hidden"
              animate="visible"
            >
              <Motion.p
                id="welcome-title"
                variants={fadeUp}
                className="text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-amber-400/70"
              >
                Welcome to MonkMode
              </Motion.p>

              <Motion.p
                variants={fadeUp}
                className="welcome-intro mt-3 max-w-xl text-sm leading-relaxed text-stone-300"
              >
                <span className="font-semibold text-amber-200">New here?</span>{" "}
                Preview MonkMode with sample data, or start your own journey.
              </Motion.p>

              <Motion.div variants={fadeUp} className="welcome-paths mt-3">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-300/80">
                  Choose your path
                </p>

                <div className="welcome-options mt-3 grid min-w-0 gap-3 sm:grid-cols-2">
                  {/* Demo button */}
                  <Motion.button
                    type="button"
                    onClick={handleExploreDemo}
                    className="welcome-option min-w-0 rounded-2xl border border-amber-100/12 bg-white/[0.03] p-3 text-left sm:p-4"
                    whileHover={{
                      scale: 1.04,
                      borderColor: "rgba(251,191,36,0.38)",
                      backgroundColor: "rgba(245,158,11,0.08)",
                      boxShadow: "0 0 20px rgba(245,158,11,0.12)",
                    }}
                    whileTap={{ scale: 0.96 }}
                    transition={{ type: "spring", stiffness: 320, damping: 22 }}
                  >
                    <p className="welcome-option-title text-sm font-semibold text-amber-100">Explore the Demo</p>
                    <p className="welcome-option-description mt-2 text-xs leading-5 text-stone-400">
                      <span className="font-semibold text-amber-200">No signup needed.</span>{" "}
                      Try sample habits, journals, workouts, and reports.
                    </p>
                  </Motion.button>

                  {/* Begin button */}
                  <Motion.button
                    type="button"
                    onClick={handleDismiss}
                    className="welcome-option min-w-0 rounded-2xl border border-amber-300/18 bg-gradient-to-br from-amber-400/[0.14] to-orange-400/[0.06] p-3 text-left sm:p-4"
                    whileHover={{
                      scale: 1.04,
                      boxShadow: "0 0 32px rgba(251,191,36,0.28)",
                      borderColor: "rgba(251,191,36,0.45)",
                    }}
                    whileTap={{ scale: 0.96 }}
                    transition={{ type: "spring", stiffness: 320, damping: 22 }}
                  >
                    <p className="welcome-option-title text-sm font-semibold text-amber-50">Got It, Let&apos;s Begin</p>
                    <p className="welcome-option-description mt-2 text-xs leading-5 text-stone-300/80">
                      Track with your own data.
                    </p>
                  </Motion.button>
                </div>
              </Motion.div>

              <Motion.div
                variants={fadeUp}
                className="welcome-preferences mt-3 flex min-w-0 flex-col gap-2 border-t border-amber-100/10 pt-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:pt-4"
              >
                <label className="inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-3 text-xs text-stone-400">
                  <input
                    type="checkbox"
                    checked={dontShowAgain}
                    onChange={(e) => setDontShowAgain(e.target.checked)}
                    className="h-4 w-4 shrink-0 rounded border border-amber-200/20 bg-white/5 accent-amber-300"
                  />
                  <span>Don&apos;t show again</span>
                </label>

                <p className="welcome-reminder text-xs leading-5 text-stone-500">
                  Reopen the demo from the landing page anytime.
                </p>
              </Motion.div>
            </Motion.div>
          </div>
        </Motion.div>
      </Motion.div>
    </AnimatePresence>
  );
}
