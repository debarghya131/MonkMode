import { AnimatePresence, motion as Motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";

const RATE_LIMIT_EVENT = "monkmode:rate-limit";
const TOAST_EVENT = "monkmode:toast";

const normalizeMessage = (message, tone = "danger") => {
  const value = String(message || "").trim();
  if (!value) {
    return tone === "danger" ? "Today's limit for this feature is over. Please try again tomorrow." : "Action completed.";
  }
  return value;
};

export default function GlobalRateLimitToast() {
  const location = useLocation();
  const [toast, setToast] = useState(null);

  useEffect(() => {
    let dismissTimerId = null;

    const showToast = (event, fallbackTone = "danger") => {
      const tone = ["success", "warning", "danger"].includes(event?.detail?.tone)
        ? event.detail.tone
        : fallbackTone;
      const nextMessage = normalizeMessage(event?.detail?.message, tone);

      setToast({
        id: Date.now(),
        message: nextMessage,
        tone,
      });

      if (dismissTimerId) {
        window.clearTimeout(dismissTimerId);
      }

      dismissTimerId = window.setTimeout(() => {
        setToast(null);
      }, 3600);
    };

    const handleRateLimit = (event) => showToast(event, "danger");
    const handleToast = (event) => showToast(event, "success");
    window.addEventListener(RATE_LIMIT_EVENT, handleRateLimit);
    window.addEventListener(TOAST_EVENT, handleToast);

    return () => {
      window.removeEventListener(RATE_LIMIT_EVENT, handleRateLimit);
      window.removeEventListener(TOAST_EVENT, handleToast);
      if (dismissTimerId) {
        window.clearTimeout(dismissTimerId);
      }
    };
  }, []);

  const toneClass = toast?.tone === "success"
    ? "border-emerald-300/25 text-emerald-50 shadow-[0_18px_40px_rgba(0,0,0,0.38),0_0_24px_rgba(16,185,129,0.14)]"
    : toast?.tone === "warning"
      ? "border-amber-300/25 text-amber-50 shadow-[0_18px_40px_rgba(0,0,0,0.38),0_0_24px_rgba(245,158,11,0.14)]"
      : "border-rose-300/20 text-amber-50 shadow-[0_18px_40px_rgba(0,0,0,0.38),0_0_24px_rgba(244,63,94,0.14)]";

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
            role={toast.tone === "danger" ? "alert" : "status"}
            aria-live={toast.tone === "danger" ? "assertive" : "polite"}
            className={`pointer-events-none fixed inset-x-3 z-[1100] rounded-[1.25rem] border bg-stone-950/95 px-4 py-3.5 text-center text-[0.78rem] font-semibold leading-5 backdrop-blur sm:hidden ${toneClass} ${mobilePositionClass}`}
          >
            {toast.message}
          </Motion.div>

          <Motion.div
            key={`rate-limit-desktop-${toast.id}`}
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            role={toast.tone === "danger" ? "alert" : "status"}
            aria-live={toast.tone === "danger" ? "assertive" : "polite"}
            className={`pointer-events-none fixed bottom-5 left-1/2 z-[1100] hidden w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 rounded-2xl border bg-stone-950/95 px-5 py-3 text-center text-sm font-semibold leading-snug backdrop-blur sm:block ${toneClass}`}
          >
            {toast.message}
          </Motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
