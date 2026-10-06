import { AnimatePresence, MotionConfig, motion as Motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import GymNav from "./gymNav";
import TodaysWorkout from "./TodaysWorkout";
import AddWorkout from "./AddWorkout";
import DietChart from "./DietChart";
import Measurements from "./Measurements";
import ExerciseLibrary from "./ExerciseLibrary";
import Progress from "./Progress";
import Gallery from "./Gallery";
import useMobileLowMotion from "../../hooks/useMobileLowMotion";

const GYM_SECTIONS = new Set([
  "todays-workout",
  "add-workout",
  "diet-chart",
  "measurements",
  "library",
  "progress",
  "gallery",
]);

export default function Gym() {
  const location = useLocation();
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

  useEffect(() => {
    setActive(routeTab);
  }, [routeTab]);

  const section = {
    "todays-workout": <TodaysWorkout lowMotion={lowMotion} />,
    "add-workout":    <AddWorkout lowMotion={lowMotion} />,
    "diet-chart":     <DietChart />,
    "measurements":   <Measurements lowMotion={lowMotion} />,
    "library":        <ExerciseLibrary />,
    "progress":       <Progress initialTab={progressTab} lowMotion={lowMotion} />,
    "gallery":        <Gallery />,
  };

  return (
    <MotionConfig reducedMotion={lowMotion ? "always" : "user"}>
    <div className="gym-page w-full" data-active={active} data-low-motion={lowMotion ? "true" : "false"}>

      {/* TOP ROW */}
      <div className="gym-top-row flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <GymNav active={active} onChange={setActive} />
        </div>
      </div>

      {/* CONTENT */}
      {lowMotion ? (
        <div key={active} className="gym-content">{section[active]}</div>
      ) : (
        <AnimatePresence mode="wait">
          <Motion.div
            key={active}
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

    </div>
    </MotionConfig>
  );
}
