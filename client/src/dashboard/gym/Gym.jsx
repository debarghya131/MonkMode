import { AnimatePresence, motion as Motion } from "framer-motion";
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
    "todays-workout": <TodaysWorkout />,
    "add-workout":    <AddWorkout />,
    "diet-chart":     <DietChart />,
    "measurements":   <Measurements />,
    "library":        <ExerciseLibrary />,
    "progress":       <Progress initialTab={progressTab} />,
    "gallery":        <Gallery />,
  };

  return (
    <div className="mx-auto max-w-8xl space-y-4">

      {/* TOP ROW */}
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <GymNav active={active} onChange={setActive} />
        </div>
      </div>

      {/* CONTENT */}
      <AnimatePresence mode="wait">
        <Motion.div
          key={active}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.22, ease: "easeInOut" }}
        >
          {section[active]}
        </Motion.div>
      </AnimatePresence>

    </div>
  );
}
