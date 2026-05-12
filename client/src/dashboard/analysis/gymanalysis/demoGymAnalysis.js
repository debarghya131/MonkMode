// Demo data for GYM Analysis — April 2026

const DEMO_SESSIONS = [
  { date: "2026-04-01", day: "Wed", exerciseCount: 5, volume: 8400,  bodyGroups: ["Chest", "Arms"] },
  { date: "2026-04-03", day: "Fri", exerciseCount: 6, volume: 11200, bodyGroups: ["Back", "Arms"] },
  { date: "2026-04-05", day: "Sun", exerciseCount: 4, volume: 7800,  bodyGroups: ["Legs"] },
  { date: "2026-04-07", day: "Tue", exerciseCount: 5, volume: 9600,  bodyGroups: ["Chest", "Shoulders"] },
  { date: "2026-04-09", day: "Thu", exerciseCount: 6, volume: 12400, bodyGroups: ["Back", "Arms"] },
  { date: "2026-04-11", day: "Sat", exerciseCount: 4, volume: 8900,  bodyGroups: ["Legs"] },
  { date: "2026-04-14", day: "Tue", exerciseCount: 5, volume: 10200, bodyGroups: ["Chest", "Shoulders"] },
  { date: "2026-04-16", day: "Thu", exerciseCount: 6, volume: 13100, bodyGroups: ["Back", "Arms"] },
  { date: "2026-04-18", day: "Sat", exerciseCount: 4, volume: 9200,  bodyGroups: ["Legs"] },
  { date: "2026-04-21", day: "Tue", exerciseCount: 5, volume: 10800, bodyGroups: ["Chest", "Shoulders"] },
  { date: "2026-04-23", day: "Thu", exerciseCount: 6, volume: 13900, bodyGroups: ["Back", "Arms"] },
  { date: "2026-04-25", day: "Sat", exerciseCount: 4, volume: 9500,  bodyGroups: ["Legs"] },
  { date: "2026-04-28", day: "Tue", exerciseCount: 5, volume: 11400, bodyGroups: ["Chest", "Shoulders"] },
  { date: "2026-04-29", day: "Wed", exerciseCount: 4, volume: 8600,  bodyGroups: ["Arms"] },
  { date: "2026-04-30", day: "Thu", exerciseCount: 6, volume: 14200, bodyGroups: ["Back", "Arms"] },
];

function weekSessions(start, end) {
  return DEMO_SESSIONS.filter((s) => s.date >= start && s.date <= end);
}
function weekStat(label, start, end, total) {
  const ws = weekSessions(start, end);
  return {
    weekLabel: label,
    workoutDays: ws.length,
    totalDays: total,
    volume: ws.reduce((s, d) => s + d.volume, 0),
    exerciseCount: ws.reduce((s, d) => s + d.exerciseCount, 0),
    consistencyScore: Math.round((ws.length / total) * 100),
  };
}

const DEMO_WEEKLY_STATS = [
  weekStat("Apr 1–7",   "2026-04-01", "2026-04-07", 7),
  weekStat("Apr 8–14",  "2026-04-08", "2026-04-14", 7),
  weekStat("Apr 15–21", "2026-04-15", "2026-04-21", 7),
  weekStat("Apr 22–28", "2026-04-22", "2026-04-28", 7),
  weekStat("Apr 29–30", "2026-04-29", "2026-04-30", 2),
];

const DEMO_MACROS = { protein: 150, carbs: 220, fats: 55, calories: 2000 };

export function buildDemoGymMonthAnalysis() {
  return { sessions: DEMO_SESSIONS, weeklyStats: DEMO_WEEKLY_STATS, macros: DEMO_MACROS };
}

// ─── Measurements ────────────────────────────────────────────────────────────
// Oldest → newest (already reversed, ready for MeasurementsAnalysis)
export const DEMO_MEASUREMENTS = [
  { checkInDate: "2025-12-01", bodyWeight: "78.2", chest: "98",   upperWaist: "86", waist: "88", lowerWaist: "90", shoulders: "120", armsBiceps: "34",   forearms: "29",   thighs: "58",   calves: "36",   deletedAt: null },
  { checkInDate: "2026-01-05", bodyWeight: "77.0", chest: "97.5", upperWaist: "85", waist: "87", lowerWaist: "88", shoulders: "120", armsBiceps: "34.5", forearms: "29.5", thighs: "57.5", calves: "36.5", deletedAt: null },
  { checkInDate: "2026-02-02", bodyWeight: "75.8", chest: "97",   upperWaist: "84", waist: "86", lowerWaist: "87", shoulders: "120.5", armsBiceps: "35", forearms: "29.5", thighs: "57",   calves: "37",   deletedAt: null },
  { checkInDate: "2026-02-23", bodyWeight: "75.0", chest: "96.5", upperWaist: "83", waist: "85", lowerWaist: "86", shoulders: "121",   armsBiceps: "35.5", forearms: "30", thighs: "56.5", calves: "37",   deletedAt: null },
  { checkInDate: "2026-03-16", bodyWeight: "74.2", chest: "96",   upperWaist: "82", waist: "84", lowerWaist: "85", shoulders: "121",   armsBiceps: "35.5", forearms: "30", thighs: "56",   calves: "37.5", deletedAt: null },
  { checkInDate: "2026-04-06", bodyWeight: "73.5", chest: "95.5", upperWaist: "81", waist: "83", lowerWaist: "84", shoulders: "121.5", armsBiceps: "36",   forearms: "30.5", thighs: "55.5", calves: "37.5", deletedAt: null },
  { checkInDate: "2026-04-21", bodyWeight: "73.0", chest: "95",   upperWaist: "80", waist: "82", lowerWaist: "83", shoulders: "122",   armsBiceps: "36.5", forearms: "31",   thighs: "55",   calves: "38",   deletedAt: null },
];

// ─── Exercise Progress ────────────────────────────────────────────────────────
const mkMetric = (dates, vals) => dates.map((date, i) => ({ date, value: vals[i] }));

const BENCH_DATES = [
  "2026-03-10","2026-03-13","2026-03-17","2026-03-20","2026-03-24",
  "2026-03-27","2026-03-31","2026-04-03","2026-04-07","2026-04-10",
  "2026-04-14","2026-04-17","2026-04-21","2026-04-25","2026-04-28",
];

const DEMO_EXERCISES = [
  {
    id: "demo-bench", name: "Bench Press", bodyGroup: "Chest", logsCount: 15,
    lastLoggedDate: "2026-04-28",
    latest: { weight: 82.5, reps: 8, sets: 4 },
    metrics: {
      weight: mkMetric(BENCH_DATES, [65,67.5,70,70,72.5,72.5,75,75,77.5,77.5,80,80,82.5,82.5,82.5]),
      reps:   mkMetric(BENCH_DATES, [10,10,8,10,8,10,8,8,8,10,8,8,8,8,8]),
      sets:   mkMetric(BENCH_DATES, [3,3,4,3,4,3,4,4,4,3,4,4,4,4,4]),
    },
  },
  {
    id: "demo-squat", name: "Barbell Squat", bodyGroup: "Legs", logsCount: 12,
    lastLoggedDate: "2026-04-25",
    latest: { weight: 100, reps: 6, sets: 4 },
    metrics: {
      weight: mkMetric(
        ["2026-03-12","2026-03-16","2026-03-19","2026-03-23","2026-03-26","2026-03-30",
         "2026-04-02","2026-04-06","2026-04-09","2026-04-13","2026-04-18","2026-04-25"],
        [80,80,85,85,90,90,92.5,92.5,95,95,97.5,100]
      ),
      reps: mkMetric(
        ["2026-03-12","2026-03-16","2026-03-19","2026-03-23","2026-03-26","2026-03-30",
         "2026-04-02","2026-04-06","2026-04-09","2026-04-13","2026-04-18","2026-04-25"],
        [8,8,6,8,6,8,6,6,6,6,6,6]
      ),
      sets: mkMetric(
        ["2026-03-12","2026-03-16","2026-03-19","2026-03-23","2026-03-26","2026-03-30",
         "2026-04-02","2026-04-06","2026-04-09","2026-04-13","2026-04-18","2026-04-25"],
        [3,4,4,3,4,4,4,4,4,4,4,4]
      ),
    },
  },
  {
    id: "demo-deadlift", name: "Deadlift", bodyGroup: "Back", logsCount: 10,
    lastLoggedDate: "2026-04-30",
    latest: { weight: 120, reps: 5, sets: 3 },
    metrics: {
      weight: mkMetric(
        ["2026-03-14","2026-03-21","2026-03-28","2026-04-04","2026-04-11",
         "2026-04-16","2026-04-19","2026-04-23","2026-04-27","2026-04-30"],
        [100,100,105,110,110,112.5,115,115,117.5,120]
      ),
      reps: mkMetric(
        ["2026-03-14","2026-03-21","2026-03-28","2026-04-04","2026-04-11",
         "2026-04-16","2026-04-19","2026-04-23","2026-04-27","2026-04-30"],
        [5,5,5,5,5,5,5,5,5,5]
      ),
      sets: mkMetric(
        ["2026-03-14","2026-03-21","2026-03-28","2026-04-04","2026-04-11",
         "2026-04-16","2026-04-19","2026-04-23","2026-04-27","2026-04-30"],
        [3,3,3,3,3,3,3,3,3,3]
      ),
    },
  },
  {
    id: "demo-ohp", name: "Overhead Press", bodyGroup: "Shoulders", logsCount: 10,
    lastLoggedDate: "2026-04-28",
    latest: { weight: 55, reps: 8, sets: 4 },
    metrics: {
      weight: mkMetric(
        ["2026-03-11","2026-03-15","2026-03-18","2026-03-22","2026-03-25",
         "2026-04-01","2026-04-08","2026-04-15","2026-04-22","2026-04-28"],
        [42.5,45,45,47.5,47.5,50,50,52.5,52.5,55]
      ),
      reps: mkMetric(
        ["2026-03-11","2026-03-15","2026-03-18","2026-03-22","2026-03-25",
         "2026-04-01","2026-04-08","2026-04-15","2026-04-22","2026-04-28"],
        [8,8,8,8,8,8,8,8,8,8]
      ),
      sets: mkMetric(
        ["2026-03-11","2026-03-15","2026-03-18","2026-03-22","2026-03-25",
         "2026-04-01","2026-04-08","2026-04-15","2026-04-22","2026-04-28"],
        [3,3,4,3,4,4,4,4,4,4]
      ),
    },
  },
  {
    id: "demo-pullup", name: "Pull-up", bodyGroup: "Back", logsCount: 8,
    lastLoggedDate: "2026-04-30",
    latest: { weight: 0, reps: 12, sets: 4 },
    metrics: {
      weight: mkMetric(
        ["2026-03-13","2026-03-20","2026-03-27","2026-04-03",
         "2026-04-09","2026-04-16","2026-04-23","2026-04-30"],
        [0,0,0,0,0,0,0,0]
      ),
      reps: mkMetric(
        ["2026-03-13","2026-03-20","2026-03-27","2026-04-03",
         "2026-04-09","2026-04-16","2026-04-23","2026-04-30"],
        [6,7,8,8,9,10,11,12]
      ),
      sets: mkMetric(
        ["2026-03-13","2026-03-20","2026-03-27","2026-04-03",
         "2026-04-09","2026-04-16","2026-04-23","2026-04-30"],
        [3,3,3,4,4,4,4,4]
      ),
    },
  },
];

export function buildDemoExerciseAnalysis(exerciseId, groupFilter) {
  const groups = ["All", "Chest", "Back", "Legs", "Shoulders"];
  let filtered = groupFilter && groupFilter !== "All"
    ? DEMO_EXERCISES.filter((e) => e.bodyGroup === groupFilter)
    : DEMO_EXERCISES;

  const selected = exerciseId
    ? filtered.find((e) => e.id === exerciseId) ?? filtered[0]
    : filtered[0];

  return {
    exercises: filtered,
    groups,
    selectedExercise: selected ?? null,
    selectedExerciseId: selected?.id ?? null,
  };
}
