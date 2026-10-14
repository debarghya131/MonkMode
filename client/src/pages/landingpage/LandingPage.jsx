import { useEffect, useRef, useState } from "react";
import api from "../../api/axios";
import Hero from "./Hero";
import LandingNavbar from "./LandingNavbar";
import LandingBackground3D from "./LandingBackground3D";
import "./landing-mobile.css";
import "./landing-modern.css";

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
    <div className="landing-page home-modern">
      <div className="home-ambient" aria-hidden="true">
        <div className="home-aurora home-aurora-gold" />
        <div className="home-aurora home-aurora-amber" />
        <div className="home-aurora home-aurora-sage" />
        <LandingBackground3D />
      </div>
      <a className="home-skip" href="#main-content">Skip to content</a>
      <audio ref={audioRef} loop preload="auto" autoPlay>
        <source src="/meditation.mp3" type="audio/mpeg" />
      </audio>
      <LandingNavbar viewCount={viewCount} viewCountFailed={viewCountFailed} />
      <Hero />
      <footer className="home-footer">
        <button ref={musicButtonRef} type="button" onClick={toggleMusic}
          className="home-music" aria-pressed={isMusicPlaying}
          aria-label={isMusicPlaying ? "Pause background music" : "Play background music"}>
          <span className={isMusicPlaying ? "home-sound is-playing" : "home-sound"} aria-hidden="true"><i /><i /><i /><i /></span>
          {isMusicPlaying ? "Pause music" : "Play music"}
        </button>
        <span className="home-footer-motto">A calmer mind. A more intentional life.</span>
        <a className="home-creator" href="https://portfolio.debarghya.org/" target="_blank" rel="noopener noreferrer" aria-label="Crafted with focus by Debarghya — visit portfolio (opens in a new tab)">
          <span>Crafted with focus</span>
          <strong>by Debarghya <span aria-hidden="true">↗</span></strong>
        </a>
      </footer>
    </div>
  );
}
