import { useEffect, useRef, useState } from "react";
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
  const audioRef = useRef(null);
  const hasNavigatedRef = useRef(false);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);

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

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio) {
      return undefined;
    }

    audio.volume = 1.0;

    const syncMusicState = () => {
      setIsMusicPlaying(!audio.paused);
    };

    const removeInteractionListeners = () => {
      document.removeEventListener("pointerdown", handleFirstInteraction);
      document.removeEventListener("keydown", handleFirstInteraction);
    };

    const tryPlayAudio = () => {
      audio.play()
        .then(() => {
          removeInteractionListeners();
        })
        .catch(() => {});
    };

    const handleFirstInteraction = () => {
      if (!audio.paused) {
        removeInteractionListeners();
        return;
      }

      tryPlayAudio();
    };

    audio.addEventListener("play", syncMusicState);
    audio.addEventListener("pause", syncMusicState);
    document.addEventListener("pointerdown", handleFirstInteraction);
    document.addEventListener("keydown", handleFirstInteraction);
    tryPlayAudio();

    return () => {
      removeInteractionListeners();
      audio.pause();
      audio.currentTime = 0;
      audio.removeEventListener("play", syncMusicState);
      audio.removeEventListener("pause", syncMusicState);
    };
  }, []);

  const toggleMusic = async () => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    if (audio.paused) {
      try {
        await audio.play();
      } catch {
        return;
      }

      return;
    }

    audio.pause();
  };

  return (
    <div className="relative min-h-screen overflow-hidden text-white">
      <audio ref={audioRef} loop preload="auto" autoPlay>
        <source src="/meditation.mp3" type="audio/mpeg" />
      </audio>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#2a0a02,#0d0201)]" />
      <div className="absolute inset-0 opacity-10" style={animatedGradientStyle} />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(255,160,59,0.14),transparent_25%),radial-gradient(circle_at_30%_70%,rgba(59,130,246,0.1),transparent_18%),linear-gradient(180deg,rgba(22,7,4,0.12)_0%,rgba(13,2,1,0.46)_56%,rgba(13,2,1,0.8)_100%)]" />
      <div className="relative z-10">
        <LandingNavbar />
        <Hero />
      </div>
      {/* Scroll to continue — raised on mobile so it clears the bottom badges */}
      <div className="pointer-events-none fixed bottom-16 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full border border-amber-200/10 bg-stone-950/25 px-3 py-1.5 text-center shadow-[0_10px_22px_rgba(0,0,0,0.2)] backdrop-blur sm:bottom-4 md:bottom-4">
        <span className="block h-2 w-2 animate-bounce rounded-full bg-amber-300/90 shadow-[0_0_12px_rgba(251,191,36,0.5)]" />
        <p className="text-[0.56rem] font-semibold uppercase tracking-[0.24em] text-amber-100/65 md:text-[0.62rem]">
          Scroll to continue
        </p>
      </div>

      {/* Crafted with focus — bottom-right */}
      <div className="pointer-events-none fixed bottom-3 right-3 z-20 rounded-2xl border border-amber-200/10 bg-stone-950/35 px-3 py-2 text-right shadow-[0_14px_34px_rgba(0,0,0,0.28)] backdrop-blur sm:bottom-4 sm:right-4 sm:px-4 sm:py-3 md:bottom-6 md:right-6 md:px-5">
        <p className="font-serif text-[0.62rem] font-bold uppercase tracking-[0.22em] text-amber-100/70 sm:text-[0.72rem] md:text-[0.78rem]">
          Crafted with focus
        </p>
        <p
          className="mt-0.5 bg-gradient-to-r from-orange-300 via-amber-100 to-orange-200 bg-clip-text font-serif text-xs font-semibold italic tracking-[0.02em] text-transparent drop-shadow-[0_6px_14px_rgba(245,158,11,0.16)] sm:mt-1 sm:text-sm md:text-[1.1rem]"
          style={{ fontFamily: "Georgia, Times New Roman, serif" }}
        >
          by Debarghya Bandyopadhyay 🧡
        </p>
      </div>

      {/* Music toggle — bottom-left */}
      <button
        type="button"
        onClick={toggleMusic}
        className="fixed bottom-3 left-3 z-20 inline-flex items-center gap-1.5 rounded-full border border-amber-100/55 bg-gradient-to-r from-[#ffd86b] via-[#f5b52f] to-[#ea8a17] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-stone-950 shadow-[0_0_0_1px_rgba(255,236,178,0.24),0_0_26px_rgba(251,191,36,0.34),0_14px_34px_rgba(120,52,8,0.28)] transition duration-300 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200/80 sm:bottom-4 sm:left-4 sm:gap-2 sm:px-4 sm:py-2 sm:text-xs sm:tracking-[0.18em] md:bottom-6 md:left-6"
        aria-label={isMusicPlaying ? "Pause background music" : "Play background music"}
      >
        <span className="text-sm leading-none">{isMusicPlaying ? "⏸" : "🎵"}</span>
        <span className="hidden sm:inline">{isMusicPlaying ? "Pause Music" : "Play Music"}</span>
      </button>
    </div>
  );
}
