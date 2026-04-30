import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion as Motion } from "framer-motion";
import littleMonkLogo from "../../assets/littlemonklogo.png";
import photo1 from "../../assets/transformatiom image 1.png";
import photo2 from "../../assets/transformatiom image 2.png";
import photo3 from "../../assets/transformatiom image 3.png";
import photo4 from "../../assets/transformatiom image 4.png";
import photo5 from "../../assets/transformatiom image 5.png";
import photo6 from "../../assets/transformatiom image 6.png";

const WEEKLY_GYM_DATA = [
  {
    id: "2026-04-13",
    date: "Apr 13 - Apr 19",
    workoutDays: 5,
    totalDays: 6,
    avgWorkoutTime: "72 min",
    avgVolumeLifted: "12,460 kg",
    consistencyScore: 84,
    weeklyScore: 81,
    aiSummary:
      "Strong training rhythm this week with steady output across Push, Pull, and Legs. Your best progress came from compound lifts in chest and back. Recovery slipped slightly on Friday, which lowered total set quality. Keep one deload-style session after heavy pull day to protect consistency and improve next week's volume quality.",
    nutrition: {
      proteinSummary:
        "Protein intake stayed mostly aligned with muscle gain targets. You crossed the 150g mark on 5 out of 7 days, and hydration supported recovery well. The main nutrition gap was sodium and sugar on two late meals.",
      avgProtein: "158 g",
      avgCarbs: "236 g",
      avgFats: "67 g",
      avgFiber: "31 g",
      avgCalories: "2,484 kcal",
      avgWater: "3.7 L",
      avgSugar: "42 g",
      avgSodium: "2,260 mg",
    },
    strengthProgress: [
      { exercise: "Barbell Bench Press",          bodyGroup: "Chest",     previous: "62.5 kg x 6",  current: "67.5 kg x 6",  improvement: "+8.0%",  sets: 4, totalTime: "14 min", repsChange: 0,  timeChange: +2 },
      { exercise: "Incline Dumbbell Press",        bodyGroup: "Chest",     previous: "24 kg x 10",   current: "26 kg x 10",   improvement: "+8.3%",  sets: 3, totalTime: "10 min", repsChange: 0,  timeChange: +1 },
      { exercise: "Bent-Over Barbell Row",         bodyGroup: "Back",      previous: "70 kg x 8",    current: "75 kg x 8",    improvement: "+7.1%",  sets: 4, totalTime: "13 min", repsChange: +1, timeChange: +2 },
      { exercise: "Lat Pulldown",                  bodyGroup: "Back",      previous: "60 kg x 10",   current: "65 kg x 10",   improvement: "+8.3%",  sets: 3, totalTime: "10 min", repsChange: 0,  timeChange: +1 },
      { exercise: "Back Squat",                    bodyGroup: "Legs",      previous: "95 kg x 5",    current: "102.5 kg x 5", improvement: "+7.9%",  sets: 5, totalTime: "18 min", repsChange: +1, timeChange: +3 },
      { exercise: "Romanian Deadlift",             bodyGroup: "Legs",      previous: "92.5 kg x 8",  current: "97.5 kg x 8",  improvement: "+5.4%",  sets: 3, totalTime: "12 min", repsChange: 0,  timeChange: -1 },
      { exercise: "Seated Dumbbell Shoulder Press",bodyGroup: "Shoulders", previous: "22 kg x 8",    current: "24 kg x 8",    improvement: "+9.1%",  sets: 3, totalTime: "10 min", repsChange: 0,  timeChange:  0 },
      { exercise: "Cable Lateral Raise",           bodyGroup: "Shoulders", previous: "9 kg x 14",    current: "10 kg x 14",   improvement: "+11.1%", sets: 3, totalTime: "8 min",  repsChange: +2, timeChange: +1 },
      { exercise: "EZ Bar Curl",                   bodyGroup: "Arms",      previous: "30 kg x 10",   current: "32.5 kg x 10", improvement: "+8.3%",  sets: 3, totalTime: "9 min",  repsChange: 0,  timeChange: +1 },
      { exercise: "Rope Triceps Pushdown",         bodyGroup: "Arms",      previous: "32 kg x 12",   current: "35 kg x 12",   improvement: "+9.4%",  sets: 3, totalTime: "8 min",  repsChange: +1, timeChange:  0 },
      { exercise: "Cable Crunch",                  bodyGroup: "Core",      previous: "38 kg x 15",   current: "42 kg x 15",   improvement: "+10.5%", sets: 3, totalTime: "7 min",  repsChange: +2, timeChange: -1 },
    ],
    bodyProgress: [
      { bodyPart: "Weight",    category: "Overall",    previous: "74.6 kg",  current: "74.9 kg",  change: "+0.3 kg",  trend: "up" },
      { bodyPart: "Body Fat",  category: "Overall",    previous: "16.4%",    current: "16.1%",    change: "-0.3%",    trend: "down" },
      { bodyPart: "Chest",     category: "Upper Body", previous: "99.2 cm",  current: "100.1 cm", change: "+0.9 cm",  trend: "up" },
      { bodyPart: "Waist",     category: "Core",       previous: "82.8 cm",  current: "82.2 cm",  change: "-0.6 cm",  trend: "down" },
      { bodyPart: "Biceps",    category: "Arms",       previous: "34.1 cm",  current: "34.8 cm",  change: "+0.7 cm",  trend: "up" },
      { bodyPart: "Thigh",     category: "Lower Body", previous: "56.3 cm",  current: "56.8 cm",  change: "+0.5 cm",  trend: "up" },
      { bodyPart: "Shoulders", category: "Upper Body", previous: "118.4 cm", current: "119.0 cm", change: "+0.6 cm",  trend: "up" },
    ],
    progressPhotos: [
      { day: "Mon, Apr 13", photo: photo1 },
      { day: "Tue, Apr 14", photo: photo2 },
      { day: "Wed, Apr 15", photo: photo3 },
      { day: "Thu, Apr 16", photo: null },
      { day: "Fri, Apr 17", photo: photo4 },
      { day: "Sat, Apr 18", photo: photo5 },
    ],
  },
  {
    id: "2026-04-06",
    date: "Apr 6 - Apr 12",
    workoutDays: 4,
    totalDays: 6,
    avgWorkoutTime: "64 min",
    avgVolumeLifted: "10,980 kg",
    consistencyScore: 71,
    weeklyScore: 69,
    aiSummary:
      "Volume dipped from the prior week, mostly due to one skipped lower-body session. Push-day quality remained good, but back and posterior chain lifts stalled. Keep your first workout of the week focused on high-priority compounds to stabilize progression.",
    nutrition: {
      proteinSummary:
        "Protein was adequate but inconsistent. Carb timing before training helped performance on two heavy days, but hydration was low mid-week. Sugar intake was slightly high from late snacks.",
      avgProtein: "147 g",
      avgCarbs: "221 g",
      avgFats: "70 g",
      avgFiber: "27 g",
      avgCalories: "2,362 kcal",
      avgWater: "3.1 L",
      avgSugar: "49 g",
      avgSodium: "2,180 mg",
    },
    strengthProgress: [
      { exercise: "Barbell Bench Press",           bodyGroup: "Chest",     previous: "60 kg x 6",    current: "62.5 kg x 6",  improvement: "+4.2%",  sets: 4, totalTime: "13 min", repsChange:  0, timeChange: +1 },
      { exercise: "Lat Pulldown",                  bodyGroup: "Back",      previous: "57.5 kg x 10", current: "60 kg x 10",   improvement: "+4.3%",  sets: 3, totalTime: "9 min",  repsChange:  0, timeChange:  0 },
      { exercise: "Back Squat",                    bodyGroup: "Legs",      previous: "90 kg x 5",    current: "95 kg x 5",    improvement: "+5.6%",  sets: 4, totalTime: "16 min", repsChange: +1, timeChange: +2 },
      { exercise: "Seated Dumbbell Shoulder Press",bodyGroup: "Shoulders", previous: "20 kg x 8",    current: "22 kg x 8",    improvement: "+10.0%", sets: 3, totalTime: "10 min", repsChange:  0, timeChange: +1 },
      { exercise: "EZ Bar Curl",                   bodyGroup: "Arms",      previous: "27.5 kg x 10", current: "30 kg x 10",   improvement: "+9.1%",  sets: 3, totalTime: "9 min",  repsChange: +1, timeChange: +1 },
      { exercise: "Cable Crunch",                  bodyGroup: "Core",      previous: "35 kg x 15",   current: "38 kg x 15",   improvement: "+8.6%",  sets: 3, totalTime: "7 min",  repsChange:  0, timeChange: -1 },
    ],
    bodyProgress: [
      { bodyPart: "Weight",   category: "Overall",    previous: "74.4 kg", current: "74.6 kg", change: "+0.2 kg", trend: "up" },
      { bodyPart: "Body Fat", category: "Overall",    previous: "16.6%",   current: "16.4%",   change: "-0.2%",   trend: "down" },
      { bodyPart: "Chest",    category: "Upper Body", previous: "98.9 cm", current: "99.2 cm", change: "+0.3 cm", trend: "up" },
      { bodyPart: "Waist",    category: "Core",       previous: "83.1 cm", current: "82.8 cm", change: "-0.3 cm", trend: "down" },
      { bodyPart: "Biceps",   category: "Arms",       previous: "33.7 cm", current: "34.1 cm", change: "+0.4 cm", trend: "up" },
    ],
    progressPhotos: [
      { day: "Mon, Apr 6",  photo: photo2 },
      { day: "Tue, Apr 7",  photo: null },
      { day: "Wed, Apr 8",  photo: photo4 },
      { day: "Thu, Apr 9",  photo: null },
      { day: "Fri, Apr 10", photo: photo6 },
      { day: "Sat, Apr 11", photo: null },
    ],
  },
  {
    id: "2026-03-30",
    date: "Mar 30 - Apr 5",
    workoutDays: 6,
    totalDays: 6,
    avgWorkoutTime: "76 min",
    avgVolumeLifted: "13,140 kg",
    consistencyScore: 92,
    weeklyScore: 89,
    aiSummary:
      "Excellent week with all planned sessions completed. Strength trend was positive across every major body group, and your recovery markers were stable. This is the standard to repeat: same structure, slight load progression, and tight sleep routine.",
    nutrition: {
      proteinSummary:
        "Nutrition supported peak training output. Protein and fiber were both on target, hydration remained high, and sugar stayed controlled through the week.",
      avgProtein: "163 g",
      avgCarbs: "244 g",
      avgFats: "64 g",
      avgFiber: "33 g",
      avgCalories: "2,520 kcal",
      avgWater: "3.9 L",
      avgSugar: "37 g",
      avgSodium: "2,210 mg",
    },
    strengthProgress: [
      { exercise: "Barbell Bench Press",           bodyGroup: "Chest",     previous: "57.5 kg x 6", current: "60 kg x 6",   improvement: "+4.3%",  sets: 4, totalTime: "14 min", repsChange:  0, timeChange: +2 },
      { exercise: "Bent-Over Barbell Row",         bodyGroup: "Back",      previous: "67.5 kg x 8", current: "70 kg x 8",   improvement: "+3.7%",  sets: 4, totalTime: "12 min", repsChange: +1, timeChange: +1 },
      { exercise: "Back Squat",                    bodyGroup: "Legs",      previous: "85 kg x 5",   current: "90 kg x 5",   improvement: "+5.9%",  sets: 5, totalTime: "17 min", repsChange:  0, timeChange: +3 },
      { exercise: "Seated Dumbbell Shoulder Press",bodyGroup: "Shoulders", previous: "18 kg x 8",   current: "20 kg x 8",   improvement: "+11.1%", sets: 3, totalTime: "10 min", repsChange: +2, timeChange:  0 },
      { exercise: "Rope Triceps Pushdown",         bodyGroup: "Arms",      previous: "28 kg x 12",  current: "32 kg x 12",  improvement: "+14.3%", sets: 3, totalTime: "8 min",  repsChange: +1, timeChange: +1 },
      { exercise: "Cable Crunch",                  bodyGroup: "Core",      previous: "32 kg x 15",  current: "35 kg x 15",  improvement: "+9.4%",  sets: 3, totalTime: "7 min",  repsChange:  0, timeChange: -1 },
    ],
    bodyProgress: [
      { bodyPart: "Weight",   category: "Overall",    previous: "74.2 kg", current: "74.4 kg", change: "+0.2 kg", trend: "up" },
      { bodyPart: "Body Fat", category: "Overall",    previous: "16.9%",   current: "16.6%",   change: "-0.3%",   trend: "down" },
      { bodyPart: "Chest",    category: "Upper Body", previous: "98.3 cm", current: "98.9 cm", change: "+0.6 cm", trend: "up" },
      { bodyPart: "Waist",    category: "Core",       previous: "83.5 cm", current: "83.1 cm", change: "-0.4 cm", trend: "down" },
      { bodyPart: "Thigh",    category: "Lower Body", previous: "55.8 cm", current: "56.2 cm", change: "+0.4 cm", trend: "up" },
    ],
    progressPhotos: [
      { day: "Mon, Mar 30", photo: photo1 },
      { day: "Tue, Mar 31", photo: photo3 },
      { day: "Wed, Apr 1",  photo: photo5 },
      { day: "Thu, Apr 2",  photo: photo6 },
      { day: "Fri, Apr 3",  photo: null },
      { day: "Sat, Apr 4",  photo: photo2 },
    ],
  },
];

const BODY_GROUP_FILTERS = ["All", "Chest", "Back", "Legs", "Shoulders", "Arms", "Core"];
const BODY_PART_FILTERS  = ["All", "Overall", "Upper Body", "Core", "Arms", "Lower Body"];

function scoreColor(score) {
  if (score >= 80) return "text-emerald-300";
  if (score >= 65) return "text-amber-300";
  return "text-rose-300";
}

function trendClass(trend) {
  if (trend === "up") return "text-emerald-300";
  if (trend === "down") return "text-sky-300";
  return "text-stone-300";
}

function useFade(ref, deps) {
  const [fade, setFade] = useState({ top: false, bottom: false });
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const update = () => {
      const canScroll = node.scrollHeight > node.clientHeight + 1;
      setFade({
        top: node.scrollTop > 1,
        bottom: canScroll && node.scrollTop + node.clientHeight < node.scrollHeight - 1,
      });
    };
    update();
    node.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      node.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return fade;
}

function FadeContainer({ refProp, fade, className = "", children }) {
  return (
    <div className={`relative min-h-0 flex-1 ${className}`}>
      <div ref={refProp} className="journal-scroll h-full overflow-y-auto scroll-smooth pr-1">
        {children}
      </div>
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-4 bg-gradient-to-b from-[#1d0f0c] to-transparent transition-opacity duration-200 ${fade.top ? "opacity-100" : "opacity-0"}`} />
      <div className={`pointer-events-none absolute inset-x-0 bottom-0 h-5 bg-gradient-to-t from-[#1d0f0c] to-transparent transition-opacity duration-200 ${fade.bottom ? "opacity-100" : "opacity-0"}`} />
    </div>
  );
}

function ReportCard({ children, className = "" }) {
  return (
    <Motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3, boxShadow: "0 18px 36px rgba(0,0,0,0.34)" }}
      transition={{ duration: 0.22 }}
      className={`rounded-2xl border border-amber-100/10 bg-white/6 p-5 shadow-xl shadow-black/25 backdrop-blur ${className}`}
    >
      {children}
    </Motion.section>
  );
}

export default function GYMWeeklyReport() {
  const [selectedWeekId, setSelectedWeekId] = useState(WEEKLY_GYM_DATA[0].id);
  const [bodyGroupFilter, setBodyGroupFilter] = useState("All");
  const [bodyPartFilter, setBodyPartFilter]   = useState("All");
  const [showPhotos, setShowPhotos] = useState(false);

  const aiRef      = useRef(null);
  const strengthRef = useRef(null);
  const bodyRef    = useRef(null);

  const selectedWeek = WEEKLY_GYM_DATA.find((w) => w.id === selectedWeekId) ?? WEEKLY_GYM_DATA[0];

  const filteredStrength = selectedWeek.strengthProgress.filter(
    (ex) => bodyGroupFilter === "All" || ex.bodyGroup === bodyGroupFilter
  );

  const aiFade      = useFade(aiRef,       [selectedWeekId, selectedWeek.aiSummary]);
  const strengthFade = useFade(strengthRef, [selectedWeekId, bodyGroupFilter, filteredStrength.length]);
  const bodyFade    = useFade(bodyRef,      [selectedWeekId, selectedWeek.bodyProgress.length]);

  useEffect(() => {
    if (aiRef.current) aiRef.current.scrollTop = 0;
    if (strengthRef.current) strengthRef.current.scrollTop = 0;
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
  }, [selectedWeekId]);

  useEffect(() => {
    if (strengthRef.current) strengthRef.current.scrollTop = 0;
  }, [bodyGroupFilter]);

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
  }, [bodyPartFilter]);

  return (
    <>
    {/* Progress Photos Modal */}
    {typeof document !== "undefined" &&
      createPortal(
        <AnimatePresence>
          {showPhotos && (
            <Motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 z-[100] flex items-end justify-center overflow-y-auto bg-black/70 p-3 backdrop-blur-sm sm:items-center sm:p-4"
              onClick={() => setShowPhotos(false)}
            >
              <Motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ duration: 0.2 }}
                className="journal-scroll relative max-h-[82vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-amber-100/10 bg-[#1a0d0a] p-4 shadow-2xl sm:p-6"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal header */}
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-label-md">Progress Photos</p>
                    <p className="mt-0.5 text-xs font-semibold text-stone-500">{selectedWeek.date}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPhotos(false)}
                    className="shrink-0 rounded-full border border-stone-700 px-3 py-1 text-xs font-semibold text-stone-400 transition-colors hover:border-stone-500 hover:text-stone-200"
                  >
                    ✕ Close
                  </button>
                </div>

                {/* Photo grid */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {selectedWeek.progressPhotos.map((entry, i) => (
                    <Motion.div
                      key={entry.day}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className={`relative overflow-hidden rounded-xl border ${
                        entry.photo
                          ? "border-amber-400/20 bg-stone-900"
                          : "border-dashed border-stone-700/50 bg-stone-950/60"
                      }`}
                      style={{ aspectRatio: "3/4" }}
                    >
                      {entry.photo ? (
                        <img
                          src={entry.photo}
                          alt={entry.day}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center gap-2">
                          <span className="text-2xl opacity-20">📷</span>
                          <p className="text-[10px] font-semibold text-stone-600">No photo</p>
                        </div>
                      )}
                      <div className="absolute bottom-0 inset-x-0 bg-black/50 px-2 py-1.5">
                        <p className="text-center text-[10px] font-semibold text-stone-400">{entry.day}</p>
                      </div>
                    </Motion.div>
                  ))}
                </div>

                {/* Uploaded count */}
                <p className="mt-4 text-center text-[11px] font-semibold text-stone-500">
                  {selectedWeek.progressPhotos.filter((p) => p.photo).length} of {selectedWeek.progressPhotos.length} photos uploaded
                </p>
              </Motion.div>
            </Motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

    <div className="flex flex-col gap-5 lg:flex-row lg:items-start">

      {/* ── LEFT: Main content ─────────────────────────────────── */}
      <div className="journal-scroll min-w-0 flex-1 overflow-y-auto lg:max-h-[calc(100vh-170px)]">
        <AnimatePresence mode="wait">
          <Motion.div
            key={selectedWeek.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22 }}
            className="space-y-5"
          >
            {/* Weekly Summary header */}
            <ReportCard className="px-5 py-3.5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                {/* Title */}
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-base">
                    💪
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300/80">GYM Weekly Summary</p>
                </div>

                {/* Right badges */}
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-stone-700/60 bg-stone-900/50 px-3 py-1 text-[11px] font-semibold text-stone-400">
                    📅 {selectedWeek.date}
                  </span>
                  <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold text-amber-300">
                    ⚡ {selectedWeek.workoutDays} / {selectedWeek.totalDays} days
                  </span>
                  <Motion.button
                    type="button"
                    onClick={() => setShowPhotos(true)}
                    whileHover={{ scale: 1.05, boxShadow: "0 0 14px rgba(167,139,250,0.38)" }}
                    whileTap={{ scale: 0.95 }}
                    className="relative overflow-hidden rounded-full border border-violet-400/30 bg-violet-500/10 px-3 py-1 text-[11px] font-semibold text-violet-300 transition-colors hover:border-violet-400/50 hover:bg-violet-500/20"
                  >
                    <Motion.span
                      className="pointer-events-none absolute inset-y-0 left-[-40%] w-[30%] -skew-x-12 bg-white/25 blur-sm"
                      animate={{ left: ["-40%", "130%"] }}
                      transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 1.5, ease: "easeInOut" }}
                    />
                    <span className="relative z-10">📸 Progress Photos</span>
                  </Motion.button>
                </div>
              </div>

              {/* Stat pills + Most Trained Muscles row */}
              {(() => {
                const GROUP_COLORS = {
                  Chest:     { text: "text-sky-300",     border: "border-sky-400/30",     bg: "bg-sky-500/12" },
                  Back:      { text: "text-violet-300",  border: "border-violet-400/30",  bg: "bg-violet-500/12" },
                  Legs:      { text: "text-emerald-300", border: "border-emerald-400/30", bg: "bg-emerald-500/12" },
                  Shoulders: { text: "text-amber-300",   border: "border-amber-400/30",   bg: "bg-amber-500/12" },
                  Arms:      { text: "text-orange-300",  border: "border-orange-400/30",  bg: "bg-orange-500/12" },
                  Core:      { text: "text-rose-300",    border: "border-rose-400/30",    bg: "bg-rose-500/12" },
                };
                const counts = selectedWeek.strengthProgress.reduce((acc, ex) => {
                  acc[ex.bodyGroup] = (acc[ex.bodyGroup] ?? 0) + 1;
                  return acc;
                }, {});
                const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
                const topMuscles = sorted.slice(0, 2).map(([g]) => g);

                return (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1.5 rounded-full border border-sky-400/20 bg-sky-500/10 px-3 py-1">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">Avg Time</p>
                      <span className="text-xs font-bold text-sky-300">{selectedWeek.avgWorkoutTime}</span>
                    </div>

                    <Motion.div
                      className="relative flex items-center gap-1.5 overflow-hidden rounded-full border border-violet-400/25 bg-violet-500/10 px-3 py-1"
                      animate={{
                        boxShadow: [
                          "0 0 0px rgba(167,139,250,0)",
                          "0 0 10px rgba(167,139,250,0.36)",
                          "0 0 0px rgba(167,139,250,0)",
                        ],
                      }}
                      transition={{
                        boxShadow: { duration: 2.2, repeat: Infinity, ease: "easeInOut" },
                      }}
                    >
                      <Motion.span
                        className="pointer-events-none absolute inset-y-0 left-[-40%] w-[30%] -skew-x-12 bg-white/25 blur-sm"
                        animate={{ left: ["-40%", "130%"] }}
                        transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 1.5, ease: "easeInOut" }}
                      />
                      <p className="relative z-10 text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">Avg Volume Lifted</p>
                      <span className="relative z-10 text-xs font-bold text-violet-300">{selectedWeek.avgVolumeLifted}</span>
                    </Motion.div>

                    <div className="flex items-center gap-1.5 rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">Consistency</p>
                      <span className="text-xs font-bold text-amber-300">
                        {selectedWeek.consistencyScore}<span className="text-[10px] font-semibold text-stone-500"> /100</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">Weekly Score</p>
                      <span className={`text-xs font-bold ${scoreColor(selectedWeek.weeklyScore)}`}>
                        {selectedWeek.weeklyScore}<span className="text-[10px] font-semibold text-stone-500"> /100</span>
                      </span>
                    </div>

                    <div className="ml-auto flex items-center gap-2">
                      <div className="h-4 w-px bg-amber-100/15" />
                      <p className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">
                        Most Trained {topMuscles.length > 1 ? "Muscles" : "Muscle"}
                      </p>
                      {topMuscles.map((group) => {
                        const c = GROUP_COLORS[group] ?? { text: "text-stone-300", border: "border-stone-400/25", bg: "bg-stone-500/10" };
                        return (
                          <Motion.span
                            key={group}
                            className={`relative shrink-0 overflow-hidden rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${c.border} ${c.bg} ${c.text}`}
                            animate={{
                              boxShadow: [
                                "0 0 0px rgba(251,146,60,0)",
                                "0 0 9px rgba(251,146,60,0.32)",
                                "0 0 0px rgba(251,146,60,0)",
                              ],
                            }}
                            transition={{
                              boxShadow: { duration: 2.2, repeat: Infinity, ease: "easeInOut" },
                            }}
                          >
                            <Motion.span
                              className="pointer-events-none absolute inset-y-0 left-[-40%] w-[30%] -skew-x-12 bg-white/25 blur-sm"
                              animate={{ left: ["-40%", "130%"] }}
                              transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 1.5, ease: "easeInOut" }}
                            />
                            <span className="relative z-10">🔥 {group}</span>
                          </Motion.span>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </ReportCard>

            {/* Little Monk AI Summary */}
            <ReportCard className="flex h-[22vh] flex-col overflow-hidden">
              <div className="mb-3 flex shrink-0 items-center gap-2">
                <Motion.img
                  src={littleMonkLogo}
                  alt="Little Monk"
                  className="h-14 w-17 object-contain"
                  animate={{ y: [0, -3, 0] }}
                  transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
                />
                <div>
                  <p className="text-label-md">Little Monk's Analysis</p>
                  <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-amber-300/70">AI Generated</p>
                </div>
              </div>
              <FadeContainer refProp={aiRef} fade={aiFade}>
                <p className="text-sm leading-relaxed text-stone-300">{selectedWeek.aiSummary}</p>
              </FadeContainer>
            </ReportCard>

            {/* Strength Progress + Body Progress side by side */}
            <div className="flex flex-col gap-5 items-start 2xl:flex-row">

              {/* Strength Progress */}
              <ReportCard className="flex h-[44vh] min-h-[22rem] min-w-0 flex-1 flex-col overflow-hidden 2xl:basis-0">
                <div className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-3 bg-[#1d0f0c]/95 pb-2 backdrop-blur">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">Strength Progress</p>
                  <div className="flex flex-wrap items-center gap-1 rounded-full border border-amber-100/10 bg-stone-900/60 p-0.5">
                    {BODY_GROUP_FILTERS.map((filter) => (
                      <button
                        key={filter}
                        type="button"
                        onClick={() => setBodyGroupFilter(filter)}
                        className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-[10px] font-semibold transition-colors ${
                          bodyGroupFilter === filter
                            ? "bg-amber-500/20 text-amber-300"
                            : "text-stone-500 hover:text-stone-300"
                        }`}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>
                </div>
                <FadeContainer refProp={strengthRef} fade={strengthFade} className="space-y-2.5">
                  {filteredStrength.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-amber-100/10 py-8 text-center text-xs text-stone-600">
                      No strength progress found for this body group.
                    </p>
                  ) : (
                    filteredStrength.map((ex) => (
                      <div key={ex.exercise} className="rounded-xl border border-stone-700/35 bg-stone-950/35 px-3 py-2.5">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-stone-200 break-words">{ex.exercise}</p>
                            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-500">{ex.bodyGroup}</p>
                          </div>
                          <p className="text-xs font-bold text-emerald-300">{ex.improvement}</p>
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] font-semibold sm:grid-cols-4">
                          <p className="rounded-md border border-stone-700/40 bg-black/15 px-2 py-1 text-stone-400">Last: {ex.previous}</p>
                          <p className="rounded-md border border-emerald-500/25 bg-emerald-500/8 px-2 py-1 text-emerald-200">Now: {ex.current}</p>
                          <p className={`rounded-md border px-2 py-1 ${ex.repsChange > 0 ? "border-emerald-500/25 bg-emerald-500/8 text-emerald-300" : ex.repsChange < 0 ? "border-rose-500/25 bg-rose-500/8 text-rose-300" : "border-stone-700/40 bg-black/15 text-stone-500"}`}>
                            🔁 {ex.repsChange > 0 ? `+${ex.repsChange}` : ex.repsChange < 0 ? ex.repsChange : "—"} reps
                          </p>
                          <p className={`rounded-md border px-2 py-1 ${ex.timeChange < 0 ? "border-emerald-500/25 bg-emerald-500/8 text-emerald-300" : ex.timeChange > 0 ? "border-rose-500/25 bg-rose-500/8 text-rose-300" : "border-stone-700/40 bg-black/15 text-stone-500"}`}>
                            ⏱ {ex.timeChange > 0 ? `+${ex.timeChange}` : ex.timeChange < 0 ? ex.timeChange : "—"} min
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </FadeContainer>
              </ReportCard>

              {/* Body Progress */}
              <ReportCard className="flex h-[44vh] min-h-[22rem] min-w-0 flex-1 flex-col overflow-hidden 2xl:basis-0">
                <div className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-2 bg-[#1d0f0c]/95 pb-2 backdrop-blur">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">Body Progress</p>
                  <div className="flex flex-wrap items-center gap-1 rounded-full border border-amber-100/10 bg-stone-900/60 p-0.5">
                    {BODY_PART_FILTERS.map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setBodyPartFilter(f)}
                        className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-[10px] font-semibold transition-colors ${
                          bodyPartFilter === f
                            ? "bg-amber-500/20 text-amber-300"
                            : "text-stone-500 hover:text-stone-300"
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
                <FadeContainer refProp={bodyRef} fade={bodyFade} className="space-y-2.5">
                  {selectedWeek.bodyProgress
                    .filter((item) => bodyPartFilter === "All" || item.category === bodyPartFilter)
                    .map((item) => (
                      <div key={item.bodyPart} className="rounded-lg border border-stone-700/30 bg-stone-950/35 px-3 py-2.5">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-stone-200">{item.bodyPart}</p>
                            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-stone-600">{item.category}</p>
                          </div>
                          <p className={`text-xs font-bold ${trendClass(item.trend)}`}>{item.change}</p>
                        </div>
                        <p className="mt-1 text-[10px] font-semibold text-stone-500">
                          {item.previous} {"->"} {item.current}
                        </p>
                      </div>
                    ))}
                </FadeContainer>
              </ReportCard>

            </div>
          </Motion.div>
        </AnimatePresence>
      </div>

      {/* ── RIGHT: Week selector + Nutrition ──────────────────── */}
      <div className="grid w-full items-start gap-4 lg:w-[360px] lg:shrink-0">

        {/* Week selector card */}
        <ReportCard className="flex h-[44vh] flex-col overflow-hidden">
          <div className="mb-4 flex shrink-0 items-center gap-3">
            <Motion.div
              className="relative grid h-16 w-17 place-items-center"
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
            >
              <Motion.span
                className="absolute inset-2 rounded-full bg-amber-400/15 blur-md"
                animate={{ opacity: [0.35, 0.8, 0.35], scale: [0.9, 1.12, 0.9] }}
                transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
              />
              <Motion.img
                src={littleMonkLogo}
                alt="Little Monk AI Assistant"
                className="relative z-10 h-20 w-20 object-contain drop-shadow-[0_10px_18px_rgba(245,158,11,0.16)]"
                whileHover={{ scale: 1.08, rotate: -3 }}
                transition={{ type: "spring", stiffness: 260, damping: 14 }}
              />
            </Motion.div>
            <div>
              <h3 className="text-label-md">Little Monk's Analysis</h3>
              <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.14em] text-amber-300/70">AI Assistant</p>
            </div>
          </div>

          <div className="journal-scroll min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
            {WEEKLY_GYM_DATA.map((week) => {
              const isSelected = selectedWeekId === week.id;
              return (
                <Motion.div
                  key={week.id}
                  layout
                  className={`rounded-xl border p-3 text-sm transition-colors ${
                    isSelected
                      ? "border-amber-400/30 bg-amber-500/8"
                      : "border-amber-100/10 bg-stone-950/45 hover:border-amber-400/20"
                  }`}
                >
                  <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
                    <div className="min-w-0">
                      <span className="text-xs font-semibold text-amber-300/80">{week.workoutDays} workout days</span>
                      <p className="text-sm font-semibold text-stone-200">Weekly Summary</p>
                      <p className="text-xs text-stone-500">({week.date})</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedWeekId(week.id)}
                      className={`w-fit rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                        isSelected
                          ? "border-amber-400/40 bg-amber-400/15 text-amber-200"
                          : "border-amber-400/20 text-amber-300 hover:border-amber-300/45 hover:bg-amber-400/10"
                      }`}
                    >
                      {isSelected ? "Open" : "View"}
                    </button>
                  </div>
                </Motion.div>
              );
            })}
          </div>
        </ReportCard>

        {/* Nutrition Summary card */}
        <ReportCard>
          <div className="mb-3 flex items-center gap-2">
            <span className="text-base">🥗</span>
            <div>
              <p className="text-label-md">Nutrition Summary</p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {[
              ["Avg Protein",   selectedWeek.nutrition.avgProtein],
              ["Avg Carbs",     selectedWeek.nutrition.avgCarbs],
              ["Avg Fats",      selectedWeek.nutrition.avgFats],
              ["Avg Fiber",     selectedWeek.nutrition.avgFiber],
              ["Avg Calories",  selectedWeek.nutrition.avgCalories],
              ["Avg Water",     selectedWeek.nutrition.avgWater],
              ["Avg Sugar",     selectedWeek.nutrition.avgSugar],
              ["Avg Sodium",    selectedWeek.nutrition.avgSodium],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-amber-100/10 bg-stone-950/35 px-2.5 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-500">{label}</p>
                <p className="mt-1 text-xs font-bold text-amber-200">{value}</p>
              </div>
            ))}
          </div>
        </ReportCard>

      </div>
    </div>
    </>
  );
}
