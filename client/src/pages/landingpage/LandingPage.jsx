import { motion as Motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import api from "../../api/axios";
import Hero from "./Hero";
import LandingNavbar from "./LandingNavbar";

const animatedGradientStyle = {
  background: "linear-gradient(120deg, #ff7a00, #3b82f6)",
  backgroundSize: "100% 100%"
};

const VISITOR_ID_KEY = "monkmode_visitor_id";
let siteViewRequest;

const getVisitorId = () => {
  try {
    const existingVisitorId = localStorage.getItem(VISITOR_ID_KEY);
    if (existingVisitorId) return existingVisitorId;

    const visitorId = crypto.randomUUID();
    localStorage.setItem(VISITOR_ID_KEY, visitorId);
    return visitorId;
  } catch {
    return "";
  }
};

const recordSiteView = () => {
  if (!siteViewRequest) {
    const visitorId = getVisitorId();
    siteViewRequest = visitorId
      ? api.post("/site-views", { visitorId })
      : api.get("/site-views");
  }

  return siteViewRequest;
};

export default function LandingPage() {
  const audioRef = useRef(null);
  const musicButtonRef = useRef(null);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [viewCount, setViewCount] = useState(null);
  const [viewCountFailed, setViewCountFailed] = useState(false);

  useEffect(() => {
    let isActive = true;

    recordSiteView()
      .then(({ data }) => {
        const nextCount = Number(data?.count);

        if (isActive && Number.isFinite(nextCount) && nextCount >= 0) {
          setViewCount(nextCount);
          setViewCountFailed(false);
        }
      })
      .catch(() => {
        if (isActive) {
          setViewCountFailed(true);
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

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

    const handleFirstInteraction = (event) => {
      // The button owns this gesture. Starting here would make its click
      // handler immediately pause the audio again (including keyboard clicks).
      if (musicButtonRef.current?.contains(event.target)) {
        removeInteractionListeners();
        return;
      }
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
    <div className="relative flex min-h-dvh flex-col overflow-x-hidden text-white">
      <audio ref={audioRef} loop preload="auto" autoPlay>
        <source src="/meditation.mp3" type="audio/mpeg" />
      </audio>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#2a0a02,#0d0201)]" />
      <div className="absolute inset-0 opacity-10" style={animatedGradientStyle} />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(255,160,59,0.14),transparent_25%),radial-gradient(circle_at_30%_70%,rgba(59,130,246,0.1),transparent_18%),linear-gradient(180deg,rgba(22,7,4,0.12)_0%,rgba(13,2,1,0.46)_56%,rgba(13,2,1,0.8)_100%)]" />
      <div className="relative z-10 flex flex-1 flex-col">
        <LandingNavbar viewCount={viewCount} viewCountFailed={viewCountFailed} />
        <Hero />
      </div>
      <div className="relative z-20 flex items-end justify-between gap-3 px-3 pb-3 sm:px-6 sm:pb-6 md:contents">
        {/* Crafted with focus — bottom-right */}
        <Motion.div
          className="pointer-events-none order-2 max-w-[min(66vw,15rem)] overflow-hidden rounded-2xl border border-amber-200/10 bg-stone-950/35 px-3 py-2 text-right shadow-[0_14px_34px_rgba(0,0,0,0.28)] backdrop-blur sm:max-w-none sm:px-4 sm:py-3 md:fixed md:bottom-6 md:right-6 md:px-5"
        >
          <Motion.span
            className="pointer-events-none absolute inset-y-0 left-[-40%] w-[30%] -skew-x-12 bg-white/20 blur-sm"
            animate={{ x: ["0%", "680%"] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 1.6, ease: "easeInOut" }}
          />
          <p className="font-serif text-[0.54rem] font-bold uppercase tracking-[0.18em] text-amber-100/70 sm:text-[0.72rem] md:text-[0.78rem]">
            Crafted with focus
          </p>
          <p
            className="mt-0.5 bg-gradient-to-r from-orange-300 via-amber-100 to-orange-200 bg-clip-text font-serif text-[0.78rem] font-semibold italic leading-snug tracking-[0.02em] text-transparent drop-shadow-[0_6px_14px_rgba(245,158,11,0.16)] sm:mt-1 sm:text-sm md:text-[1.1rem]"
            style={{ fontFamily: "Georgia, Times New Roman, serif" }}
          >
            by Debarghya 🧡
          </p>
        </Motion.div>

        {/* Desktop display:contents removes the wrapper's stacking layer;
            the fixed music button must sit above the z-10 hero itself. */}
        <button
          ref={musicButtonRef}
          type="button"
          onClick={toggleMusic}
          style={{ zIndex: 30 }}
          className="order-1 inline-flex h-11 w-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full border border-amber-100/55 bg-gradient-to-r from-[#ffd86b] via-[#f5b52f] to-[#ea8a17] text-xs font-black uppercase leading-none tracking-[0.14em] text-stone-950 shadow-[0_0_0_1px_rgba(255,236,178,0.24),0_0_26px_rgba(251,191,36,0.34),0_14px_34px_rgba(120,52,8,0.28)] transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200/80 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-950 sm:w-40 sm:px-4 md:fixed md:bottom-6 md:left-6"
          aria-label={isMusicPlaying ? "Pause background music" : "Play background music"}
          title={isMusicPlaying ? "Pause background music" : "Play background music"}
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 shrink-0">
            {isMusicPlaying ? (
              <path d="M6 4h4v16H6zm8 0h4v16h-4z" />
            ) : (
              <path d="M8 4v16l12-8z" />
            )}
          </svg>
          <span className="hidden sm:inline">{isMusicPlaying ? "Pause Music" : "Play Music"}</span>
        </button>
      </div>
    </div>
  );
}
