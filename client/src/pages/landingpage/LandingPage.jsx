import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Hero from "./Hero";
import LandingNavbar from "./LandingNavbar";

const animatedGradientStyle = {
  background: "linear-gradient(120deg, #ff7a00, #3b82f6)",
  backgroundSize: "300% 300%",
  animation: "landingGradientMove 12s ease-in-out infinite"
};

export default function LandingPage() {
  const navigate = useNavigate();
  const hasNavigatedRef = useRef(false);

  useEffect(() => {
    let touchStartY = 0;

    const goToSignup = () => {
      if (hasNavigatedRef.current) {
        return;
      }

      hasNavigatedRef.current = true;
      navigate("/login");
    };

    const handleWheel = (event) => {
      if (event.deltaY > 35) {
        goToSignup();
      }
    };

    const handleTouchStart = (event) => {
      touchStartY = event.touches[0]?.clientY ?? 0;
    };

    const handleTouchMove = (event) => {
      const currentY = event.touches[0]?.clientY ?? 0;

      if (touchStartY - currentY > 40) {
        goToSignup();
      }
    };

    window.addEventListener("wheel", handleWheel, { passive: true });
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });

    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
    };
  }, [navigate]);

  return (
    <div className="relative min-h-screen overflow-hidden text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#2a0a02,#0d0201)]" />
      <div className="absolute inset-0 opacity-10" style={animatedGradientStyle} />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(255,160,59,0.14),transparent_25%),radial-gradient(circle_at_30%_70%,rgba(59,130,246,0.1),transparent_18%),linear-gradient(180deg,rgba(22,7,4,0.12)_0%,rgba(13,2,1,0.46)_56%,rgba(13,2,1,0.8)_100%)]" />
      <div className="relative z-10">
        <LandingNavbar />
        <Hero />
      </div>
      <div className="pointer-events-none fixed bottom-2 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full border border-amber-200/10 bg-stone-950/25 px-3 py-1.5 text-center shadow-[0_10px_22px_rgba(0,0,0,0.2)] backdrop-blur md:bottom-4">
        <span className="block h-2 w-2 animate-bounce rounded-full bg-amber-300/90 shadow-[0_0_12px_rgba(251,191,36,0.5)]" />
        <p className="text-[0.56rem] font-semibold uppercase tracking-[0.24em] text-amber-100/65 md:text-[0.62rem]">
          Scroll to continue
        </p>
      </div>
      <div className="pointer-events-none fixed bottom-4 right-4 z-20 max-w-[calc(100vw-2rem)] rounded-2xl border border-amber-200/10 bg-stone-950/35 px-4 py-3 text-right shadow-[0_14px_34px_rgba(0,0,0,0.28)] backdrop-blur md:bottom-6 md:right-6 md:max-w-none md:px-5">
        <p className="font-serif text-[0.72rem] font-bold uppercase tracking-[0.28em] text-amber-100/70 md:text-[0.78rem]">
          Made by
        </p>
        <p className="mt-1 text-xs font-bold tracking-[0.04em] text-stone-100 sm:text-sm md:text-base">
          <span className="text-orange-300">🧡</span> Debarghya Bandyopadhyay
        </p>
      </div>
    </div>
  );
}
