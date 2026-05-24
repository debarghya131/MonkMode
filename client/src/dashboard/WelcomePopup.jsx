import { AnimatePresence, motion as Motion } from "framer-motion";
import { useState } from "react";
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
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const handleDismiss = () => onClose({ dontShowAgain });

  const handleExploreDemo = () => {
    onClose({ dontShowAgain });
    navigate("/demo-login");
  };

  return (
    <AnimatePresence>
      <Motion.div
        key="welcome-backdrop"
        className="fixed inset-0 z-[999] flex items-center justify-center px-4"
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
          className="relative z-10 w-full max-w-4xl overflow-hidden rounded-3xl border border-amber-100/15 bg-[#1a120e]"
          initial={{ opacity: 0, scale: 0.91, y: 28 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.91, y: 28 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
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

          <div className="grid gap-0 md:grid-cols-[320px_minmax(0,1fr)]">
            {/* ── Left panel ── */}
            <div className="relative flex flex-col items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.12),transparent_45%),linear-gradient(180deg,rgba(82,42,20,0.55),rgba(18,13,10,0.98))] px-6 py-8 text-center md:py-10">
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
                className="relative w-36 object-contain md:w-52"
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
                className="pointer-events-none mt-2 h-2 w-28 rounded-full bg-amber-400/20 blur-md"
                animate={{ scaleX: [1, 0.7, 1], opacity: [0.5, 0.2, 0.5] }}
                transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
              />

              <Motion.h2
                className="mt-2 w-full whitespace-nowrap px-2 text-center font-heading text-[1.35rem] font-black leading-none text-amber-100 md:text-[1.5rem]"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45, duration: 0.4 }}
              >
                Namo Buddhaya 🙏
              </Motion.h2>
            </div>

            {/* ── Right panel ── */}
            <Motion.div
              className="flex flex-1 flex-col justify-center px-6 py-8 sm:px-8 sm:py-9"
              variants={stagger}
              initial="hidden"
              animate="visible"
            >
              <Motion.p
                variants={fadeUp}
                className="text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-amber-400/70"
              >
                Welcome to MonkMode
              </Motion.p>

              <Motion.p
                variants={fadeUp}
                className="mt-3 max-w-xl text-sm leading-relaxed text-stone-300"
              >
                <span className="font-semibold text-amber-200">New here ?</span>{" "}
                Try the Demo first 👀 &nbsp;Explore how everything works before you start
                building your own habits, analytics, and insights.
              </Motion.p>

              <Motion.div variants={fadeUp} className="mt-6">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-300/80">
                  Choose your path
                </p>

                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {/* Demo button */}
                  <Motion.button
                    type="button"
                    onClick={handleExploreDemo}
                    className="rounded-2xl border border-amber-100/12 bg-white/[0.03] px-4 py-4 text-left"
                    whileHover={{
                      scale: 1.04,
                      borderColor: "rgba(251,191,36,0.38)",
                      backgroundColor: "rgba(245,158,11,0.08)",
                      boxShadow: "0 0 20px rgba(245,158,11,0.12)",
                    }}
                    whileTap={{ scale: 0.96 }}
                    transition={{ type: "spring", stiffness: 320, damping: 22 }}
                  >
                    <p className="text-sm font-semibold text-amber-100">Explore Try Demo</p>
                    <p className="mt-2 text-xs leading-5 text-stone-400">
                      <span className="font-semibold text-amber-200">No Signup Required !</span>{" "}
                      Walk through sample habits, journals, workouts, and reports before
                      setting up your own flow.
                    </p>
                  </Motion.button>

                  {/* Begin button */}
                  <Motion.button
                    type="button"
                    onClick={handleDismiss}
                    className="rounded-2xl border border-amber-300/18 bg-gradient-to-br from-amber-400/[0.14] to-orange-400/[0.06] px-4 py-4 text-left"
                    whileHover={{
                      scale: 1.04,
                      boxShadow: "0 0 32px rgba(251,191,36,0.28)",
                      borderColor: "rgba(251,191,36,0.45)",
                    }}
                    whileTap={{ scale: 0.96 }}
                    transition={{ type: "spring", stiffness: 320, damping: 22 }}
                  >
                    <p className="text-sm font-semibold text-amber-50">Got It, Let&apos;s Begin</p>
                    <p className="mt-2 text-xs leading-5 text-stone-300/80">
                      Skip the walkthrough and begin customizing MonkMode with your own data
                      right away.
                    </p>
                  </Motion.button>
                </div>
              </Motion.div>

              <Motion.div
                variants={fadeUp}
                className="mt-6 flex flex-col gap-4 border-t border-amber-100/10 pt-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <label className="inline-flex cursor-pointer items-center gap-3 text-xs text-stone-400">
                  <input
                    type="checkbox"
                    checked={dontShowAgain}
                    onChange={(e) => setDontShowAgain(e.target.checked)}
                    className="h-4 w-4 rounded border border-amber-200/20 bg-white/5 accent-amber-300"
                  />
                  <span>Don&apos;t show again</span>
                </label>

                <p className="text-xs leading-5 text-stone-500">
                  You can revisit the demo any time from the landing page.
                </p>
              </Motion.div>
            </Motion.div>
          </div>
        </Motion.div>
      </Motion.div>
    </AnimatePresence>
  );
}
