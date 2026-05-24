import { AnimatePresence, motion as Motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";

const RATE_LIMIT_EVENT = "monkmode:rate-limit";

const normalizeMessage = (message) => {
  const value = String(message || "").trim();
  if (!value) {
    return "Today's limit for this feature is over. Please try again tomorrow.";
  }
  return value;
};

export default function GlobalRateLimitToast() {
  const location = useLocation();
  const [toast, setToast] = useState(null);

  useEffect(() => {
    let dismissTimerId = null;

    const handleRateLimit = (event) => {
      const nextMessage = normalizeMessage(event?.detail?.message);

      setToast({
        id: Date.now(),
        message: nextMessage,
      });

      if (dismissTimerId) {
        window.clearTimeout(dismissTimerId);
      }

      dismissTimerId = window.setTimeout(() => {
        setToast(null);
      }, 3600);
    };

    window.addEventListener(RATE_LIMIT_EVENT, handleRateLimit);

    return () => {
      window.removeEventListener(RATE_LIMIT_EVENT, handleRateLimit);
      if (dismissTimerId) {
        window.clearTimeout(dismissTimerId);
      }
    };
  }, []);

  const mobilePositionClass = useMemo(() => {
    return location.pathname === "/dashboard/ai_guru"
      ? "bottom-[calc(env(safe-area-inset-bottom)+6.5rem)]"
      : "bottom-[max(1rem,env(safe-area-inset-bottom))]";
  }, [location.pathname]);

  return (
    <AnimatePresence>
      {toast && (
        <>
          <Motion.div
            key={`rate-limit-mobile-${toast.id}`}
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            className={`pointer-events-none fixed inset-x-3 z-[1100] rounded-[1.25rem] border border-rose-300/20 bg-stone-950/95 px-4 py-3.5 text-center text-[0.78rem] font-semibold leading-5 text-amber-50 shadow-[0_18px_40px_rgba(0,0,0,0.38),0_0_24px_rgba(244,63,94,0.14)] backdrop-blur sm:hidden ${mobilePositionClass}`}
          >
            {toast.message}
          </Motion.div>

          <Motion.div
            key={`rate-limit-desktop-${toast.id}`}
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className="pointer-events-none fixed bottom-5 left-1/2 z-[1100] hidden w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 rounded-2xl border border-rose-300/20 bg-stone-950/95 px-5 py-3 text-center text-sm font-semibold leading-snug text-amber-50 shadow-[0_20px_60px_rgba(0,0,0,0.45),0_0_30px_rgba(244,63,94,0.14)] backdrop-blur sm:block"
          >
            {toast.message}
          </Motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
