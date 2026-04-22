import { useState, useEffect } from "react";
import GymNav from "./gymNav";
import TodaysWorkout from "./TodaysWorkout";
import AddWorkout from "./AddWorkout";
import DietChart from "./DietChart";
import Measurements from "./Measurements";
import ExerciseLibrary from "./ExerciseLibrary";
import Progress from "./Progress";
import Gallery from "./Gallery";

const STREAK_KEY = "monkmode_gym_streak";

const getStreak = () => {
  try {
    const stored = localStorage.getItem(STREAK_KEY);
    return stored ? JSON.parse(stored) : { count: 0, lastDate: "" };
  } catch { return { count: 0, lastDate: "" }; }
};

const updateStreak = () => {
  const today = new Date().toISOString().slice(0, 10);
  const data = getStreak();
  if (data.lastDate === today) return data.count;
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const newCount = data.lastDate === yesterday ? data.count + 1 : 1;
  localStorage.setItem(STREAK_KEY, JSON.stringify({ count: newCount, lastDate: today }));
  return newCount;
};

export default function Gym() {
  const [active, setActive] = useState("todays-workout");
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    setStreak(updateStreak());
  }, []);

  const section = {
    "todays-workout": <TodaysWorkout />,
    "add-workout":    <AddWorkout />,
    "diet-chart":     <DietChart />,
    "measurements":   <Measurements />,
    "library":        <ExerciseLibrary />,
    "progress":       <Progress />,
    "gallery":        <Gallery />,
  };

  return (
    <div className="mx-auto max-w-8xl space-y-4">

      {/* TOP ROW — streak + navbar side by side */}
      <div className="flex items-center gap-20">

        {/* STREAK */}
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl shrink-0
          bg-amber-950/50 border border-amber-500/25 shadow-lg">
          <span className="flex items-center gap-1 text-xs text-amber-300/80">
            🔥 <span className="font-semibold text-amber-300">{streak}</span> day streak
          </span>
        </div>

        {/* NAVBAR — takes remaining space */}
        <div className="flex-1 min-w-0">
          <GymNav active={active} onChange={setActive} />
        </div>

      </div>

      {/* CONTENT */}
      <div>{section[active]}</div>

    </div>
  );
}
