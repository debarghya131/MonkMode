import { AnimatePresence, MotionConfig, motion as Motion } from "framer-motion";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import GymNav from "./gymNav";
import useAuth from "../../hooks/useAuth";
import { GymContext } from "./gymContext";
import useGymData from "./useGymData";
import GymNotice from "./GymNotice";
import useMobileLowMotion from "../../hooks/useMobileLowMotion";

const loadToday = () => import("./TodaysWorkout");
const loadAddWorkout = () => import("./AddWorkout");
const loadDietChart = () => import("./DietChart");
const loadMeasurements = () => import("./Measurements");
const loadProgress = () => import("./Progress");
const loadLibrary = () => import("./ExerciseLibrary");
const loadGallery = () => import("./Gallery");
const viewLoaders = {
  "todays-workout": loadToday,
  "add-workout": loadAddWorkout,
  "diet-chart": loadDietChart,
  measurements: loadMeasurements,
  progress: loadProgress,
  library: loadLibrary,
  gallery: loadGallery,
};
const TodaysWorkout = lazy(loadToday);
const AddWorkout = lazy(loadAddWorkout);
const DietChart = lazy(loadDietChart);
const Measurements = lazy(loadMeasurements);
const Progress = lazy(loadProgress);
const ExerciseLibrary = lazy(loadLibrary);
const Gallery = lazy(loadGallery);

const GYM_SECTIONS = new Set([
  "todays-workout",
  "add-workout",
  "diet-chart",
  "measurements",
  "library",
  "progress",
  "gallery",
]);
const INDEPENDENT_SECTIONS = new Set(["measurements", "progress", "library", "gallery"]);

export default function Gym() {
  const { isDemoMode, user } = useAuth();
  return <GymContent key={isDemoMode ? "demo" : user?.id || "guest"} />;
}

function GymContent() {
  const { isDemoMode, user } = useAuth();
  const location = useLocation();
  const [, setSearchParams] = useSearchParams();
  const lowMotion = useMobileLowMotion();
  const routeTab = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get("tab") || location.state?.tab;
    return GYM_SECTIONS.has(tab) ? tab : "todays-workout";
  }, [location.search, location.state]);

  const progressTab = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get("progress") || location.state?.progressTab;
    return tab === "workouts" ? "workouts" : "measurements";
  }, [location.search, location.state]);

  const [active, setActive] = useState(routeTab);
  const environment = useGymData(isDemoMode, user?.id, active === "add-workout" || active === "measurements");

  useEffect(() => {
    setActive(routeTab);
  }, [routeTab]);
  useEffect(() => { void viewLoaders[active]?.(); }, [active]);

  const section = {
    "todays-workout": <TodaysWorkout lowMotion={lowMotion} />,
    "add-workout":    <AddWorkout lowMotion={lowMotion} />,
    "diet-chart":     <DietChart />,
    "measurements":   <Measurements lowMotion={lowMotion} />,
    "library":        <ExerciseLibrary />,
    "progress":       <Progress initialTab={progressTab} lowMotion={lowMotion} />,
    "gallery":        <Gallery />,
  };

  const requestedSections = GYM_SECTIONS.has(active);
  return (
    <GymContext.Provider value={environment}>
    <MotionConfig reducedMotion={lowMotion ? "always" : "user"}>
    <div className="gym-page w-full" data-active={active} data-low-motion={lowMotion ? "true" : "false"}>

      {/* TOP ROW */}
      <div className="gym-top-row flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <GymNav active={active} onPrefetch={tab => viewLoaders[tab]?.()} onChange={tab => {
            if (environment.busy) return;
            setActive(tab);
            setSearchParams(previous => { const next = new URLSearchParams(previous); next.set("tab", tab); return next; }, { replace: true });
          }} />
        </div>
      </div>

      {/* CONTENT */}
      {requestedSections && <GymNotice />}
      <fieldset disabled={environment.busy || (!environment.ready && !environment.loadError)} className="m-0 min-w-0 border-0 p-0 contents" aria-busy={environment.busy || (!environment.ready && !environment.loadError)}>
      {(!requestedSections || environment.ready || INDEPENDENT_SECTIONS.has(active)) && (
        <Suspense fallback={<p role="status" className="p-6 text-sm text-stone-400">Loading {GYM_SECTIONS.has(active) ? active.replaceAll("-", " ") : "Gym"}…</p>}>
          {lowMotion ? (
            <div key={`${active}-${environment.recoveryEpoch}`} className="gym-content">{section[active]}</div>
          ) : (
            <AnimatePresence mode="wait">
              <Motion.div
                key={`${active}-${environment.recoveryEpoch}`}
                className="gym-content"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22, ease: "easeInOut" }}
              >
                {section[active]}
              </Motion.div>
            </AnimatePresence>
          )}
        </Suspense>
      )}
      </fieldset>
    </div>
    </MotionConfig>
    </GymContext.Provider>
  );
}
