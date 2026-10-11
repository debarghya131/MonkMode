import { reportDayLabel, reportWeekLabel, shiftReportDay } from "./journalWeeklyStats.js";
import { todoReportDay } from "./todoWeeklyStats.js";

const round = value => Math.round(value * 10) / 10;
const stamp = value => Date.parse(value || "") || 0;
export function gymReportNumber(value, unit = "", max = 100000) {
  if (!["string", "number"].includes(typeof value)) return null;
  const input = String(value).trim().replace(/,/g, "");
  const match = /^(\d+(?:\.\d+)?|\.\d+)\s*([a-z]*)$/i.exec(input);
  if (!match || (match[2] && match[2].toLowerCase() !== unit.toLowerCase())) return null;
  const number = Number(match[1]);
  return Number.isFinite(number) && number >= 0 && number <= max ? number : null;
}
const integer = (value, max) => {
  const number = gymReportNumber(value, "", max);
  return Number.isInteger(number) ? number : null;
};
const signed = value => `${value > 0 ? "+" : ""}${round(value)}`;
const fmt = (value, unit) => value === null ? "—" : `${round(value)} ${unit}`;
const label = value => typeof value === "string" && value.trim() ? value.trim() : "Untitled exercise";
export const GYM_REPORT_IMAGE_PATTERN = "^(data:image/(png|jpe?g|webp);base64,|https?://|/(?!/))";
const imageSource = new RegExp(GYM_REPORT_IMAGE_PATTERN, "i");
export function gymReportBodyGroup(value) {
  const key = String(value || "").split(/\s+-\s+/)[0].trim().toLowerCase();
  const names = { chest: "Chest", back: "Back", legs: "Legs", shoulders: "Shoulders", arms: "Arms", core: "Core", cardio: "Cardio", fullbody: "Full Body", "full body": "Full Body", biceps: "Arms", triceps: "Arms", abs: "Core", glutes: "Legs", calves: "Legs" };
  return Object.hasOwn(names, key) ? names[key] : "Other";
}
export function gymExerciseValues(entry) {
  const sets = integer(entry.sets, 20), reps = integer(entry.reps, 200);
  const weight = gymReportNumber(entry.weight, "kg", 1000), time = gymReportNumber(entry.totalTime, "min", 600);
  let volume = null;
  if (sets > 0 && weight !== null) {
    const breakdown = (Array.isArray(entry.repsBreakdown) ? entry.repsBreakdown : []).map(value => {
      const parts = String(value).split("+").map(part => integer(part.trim(), 200));
      return parts.some(part => part === null) ? null : parts.reduce((sum, part) => sum + part, 0);
    });
    const finalWeight = gymReportNumber(entry.lastSetWeight, "kg", 1000) ?? weight;
    const finalReps = integer(entry.lastSetReps, 200) ?? reps;
    if (breakdown.length === sets && !breakdown.includes(null))
      volume = weight * breakdown.slice(0, -1).reduce((sum, part) => sum + part, 0) + finalWeight * breakdown.at(-1);
    else if (reps !== null && finalReps !== null) volume = weight * reps * (sets - 1) + finalWeight * finalReps;
  }
  return { sets, reps, weight, time, volume };
}
export const GYM_REPORT_MEASUREMENTS = [
  ["bodyWeight", "Weight", "Overall", "kg"], ["chest", "Chest", "Upper Body", "cm"],
  ["upperChest", "Upper chest", "Upper Body", "cm"], ["lowerChest", "Lower chest", "Upper Body", "cm"],
  ["waist", "Waist", "Core", "cm"], ["upperWaist", "Upper waist", "Core", "cm"], ["lowerWaist", "Lower waist", "Core", "cm"],
  ["shoulders", "Shoulders", "Upper Body", "cm"], ["neck", "Neck", "Upper Body", "cm"], ["hips", "Hips", "Lower Body", "cm"],
  ["armsBiceps", "Biceps", "Arms", "cm"], ["leftArm", "Left arm", "Arms", "cm"], ["rightArm", "Right arm", "Arms", "cm"],
  ["forearms", "Forearms", "Arms", "cm"], ["leftForearm", "Left forearm", "Arms", "cm"], ["rightForearm", "Right forearm", "Arms", "cm"],
  ["thighs", "Thighs", "Lower Body", "cm"], ["leftThigh", "Left thigh", "Lower Body", "cm"], ["rightThigh", "Right thigh", "Lower Body", "cm"],
  ["calves", "Calves", "Lower Body", "cm"], ["leftCalf", "Left calf", "Lower Body", "cm"], ["rightCalf", "Right calf", "Lower Body", "cm"], ["ankle", "Ankle", "Lower Body", "cm"],
];
export function gymNutritionReference(plans) {
  const days = new Map();
  for (const plan of plans) {
    if (plan.planType !== "macros" || !plan.isActive || !["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].includes(plan.day)) continue;
    if (!days.has(plan.day) || stamp(plan.updatedAt || plan.createdAt) >= stamp(days.get(plan.day).updatedAt || days.get(plan.day).createdAt)) days.set(plan.day, plan);
  }
  const values = {}, counts = {};
  for (const [key, unit] of [["protein", "g"], ["carbs", "g"], ["fats", "g"], ["fiber", "g"], ["calories", "kcal"], ["water", "L"], ["sugar", "g"], ["sodium", "mg"]]) {
    const samples = [...days.values()].map(plan => gymReportNumber(plan.values?.[key], unit)).filter(value => value !== null);
    values[`avg${key[0].toUpperCase()}${key.slice(1)}`] = samples.length ? fmt(samples.reduce((a, b) => a + b, 0) / samples.length, unit) : "";
    counts[key] = samples.length;
  }
  return Object.values(counts).some(Boolean) ? { ...values, dayCount: days.size, counts,
    note: "Current active macro-plan averages by configured weekday. These are planned values, not recorded intake or historical weekly nutrition." } : null;
}

export function computeGymWeeklyReport({ exercises = [], measurements = [], gallery = [], macroPlans = [] }, weekDays, { today, timezone = "Asia/Kolkata", now = null }) {
  const dayOf = value => todoReportDay(value, timezone);
  const asOf = weekDays.at(-1) < today ? weekDays.at(-1) : today;
  const elapsed = weekDays.filter(day => day <= asOf);
  const workoutMap = new Map();
  for (const entry of exercises) {
    const day = dayOf(entry.date), id = String(entry.exerciseId || "").trim();
    if (!id || !day || day > asOf) continue;
    const values = gymExerciseValues(entry);
    // A blank prior record is evidence of an earlier entry, not a zero-load
    // baseline or proof that this week's entry was the user's first.
    if (day >= weekDays[0] && ![values.sets, values.reps, values.weight, values.time].some(value => value > 0)) continue;
    const key = `${day}:${id}`, previous = workoutMap.get(key);
    if (!previous || stamp(entry.updatedAt || entry.createdAt) >= stamp(previous.updatedAt || previous.createdAt)) workoutMap.set(key, { ...entry, date: day, id, values });
  }
  const logs = [...workoutMap.values()].sort((a, b) => a.date.localeCompare(b.date) || stamp(a.updatedAt) - stamp(b.updatedAt));
  const current = logs.filter(entry => entry.date >= weekDays[0]), previous = logs.filter(entry => entry.date < weekDays[0]);
  const workoutDays = new Set(current.map(entry => entry.date)).size;
  const timed = current.filter(entry => entry.values.time > 0), timedDays = new Set(timed.map(entry => entry.date)).size;
  const totalTimeMin = round(timed.reduce((sum, entry) => sum + entry.values.time, 0));
  const volumeLogs = current.filter(entry => entry.values.volume !== null);
  const totalVolumeKg = volumeLogs.length ? round(volumeLogs.reduce((sum, entry) => sum + entry.values.volume, 0)) : null;
  const latest = new Map(), baseline = new Map(), groups = new Map();
  previous.forEach(entry => baseline.set(entry.id, entry));
  current.forEach(entry => { latest.set(entry.id, entry); const group = gymReportBodyGroup(entry.bodyPart); groups.set(group, (groups.get(group) || 0) + 1); });
  const strengthProgress = [...latest.values()].map(entry => {
    const prior = baseline.get(entry.id), a = entry.values, b = prior?.values;
    const delta = b && a.weight !== null && b.weight > 0 ? round((a.weight - b.weight) / b.weight * 100) : null;
    const read = item => item ? `${fmt(item.values.weight, "kg")} × ${item.values.reps ?? "—"} reps` : "—";
    return { id: entry.id, exercise: label(entry.exerciseName), bodyGroup: gymReportBodyGroup(entry.bodyPart), previous: read(prior), current: read(entry),
      previousDate: prior?.date || null, currentDate: entry.date, improvement: delta === null ? null : `${signed(delta)}%`, sets: a.sets, totalTime: fmt(a.time, "min"),
      repsChange: b && a.reps !== null && b.reps !== null ? a.reps - b.reps : null,
      timeChange: b && a.time !== null && b.time !== null ? round(a.time - b.time) : null, isFirstEntry: !prior };
  }).sort((a, b) => a.exercise.localeCompare(b.exercise) || a.id.localeCompare(b.id));
  const measureMap = new Map();
  for (const entry of measurements) {
    const day = dayOf(entry.checkInDate);
    if (entry.deletedAt || !day || day > asOf || !GYM_REPORT_MEASUREMENTS.some(([key, , , unit]) => gymReportNumber(entry[key], unit, 1000) > 0)) continue;
    const old = measureMap.get(day);
    if (!old || stamp(entry.updatedAt || entry.createdAt) >= stamp(old.updatedAt || old.createdAt)) measureMap.set(day, { ...entry, day });
  }
  const measureList = [...measureMap.values()].sort((a, b) => a.day.localeCompare(b.day));
  const thisMeasures = measureList.filter(entry => entry.day >= weekDays[0]);
  const bodyProgress = [];
  for (const [key, name, category, unit] of GYM_REPORT_MEASUREMENTS) {
    const currentMeasure = thisMeasures.filter(entry => gymReportNumber(entry[key], unit, 1000) > 0).at(-1);
    if (!currentMeasure) continue;
    const prior = measureList.filter(entry => entry.day < currentMeasure.day && gymReportNumber(entry[key], unit, 1000) > 0).at(-1);
    const cur = gymReportNumber(currentMeasure[key], unit, 1000), prev = prior ? gymReportNumber(prior[key], unit, 1000) : null;
    const delta = prev === null ? null : round(cur - prev);
    bodyProgress.push({ id: key, bodyPart: name, category, previous: fmt(prev, unit), current: fmt(cur, unit),
      change: delta === null ? "First reading" : `${signed(delta)} ${unit}`, delta, trend: delta === null || delta === 0 ? "flat" : delta > 0 ? "up" : "down",
      previousDate: prior?.day || null, currentDate: currentMeasure.day });
  }
  const photos = new Map(weekDays.map(day => [day, []])), imageIds = new Set();
  for (const entry of [...gallery].sort((a, b) => stamp(a.checkInDate) - stamp(b.checkInDate) || stamp(a.createdAt) - stamp(b.createdAt))) {
    const day = dayOf(entry.checkInDate);
    if (!photos.has(day) || day > asOf) continue;
    for (const [index, photo] of (Array.isArray(entry.images) ? entry.images : []).entries()) {
      if (photo.hasSource !== true && (typeof photo.src !== "string" || !imageSource.test(photo.src))) continue;
      if (now !== null && photo.uploadedAt && stamp(photo.uploadedAt) > now) continue;
      const id = String(photo._id || photo.id || `${entry._id || day}:${index}`);
      if (imageIds.has(id)) continue;
      imageIds.add(id); photos.get(day).push({ id, photo: photo.src, day: reportDayLabel(day), dayKey: day });
    }
  }
  const photoEntries = [...photos.values()].flat();
  const progressPhotos = weekDays.map(day => ({ day: reportDayLabel(day), dayKey: day, photo: photos.get(day)[0]?.photo || null, count: photos.get(day).length }));
  const consistencyScore = elapsed.length ? Math.round(workoutDays / elapsed.length * 100) : 0;
  const stats = { exerciseLogs: current.length, uniqueExercises: latest.size, totalSets: current.reduce((sum, entry) => sum + (entry.values.sets || 0), 0),
    timedLogs: timed.length, timedDays, totalTimeMin, avgTimeMin: timedDays ? round(totalTimeMin / timedDays) : null,
    volumeLogs: volumeLogs.length, totalVolumeKg, measurementDays: thisMeasures.length, photoCount: photoEntries.length,
    photoDays: progressPhotos.filter(entry => entry.count > 0).length, bodyGroupCounts: Object.fromEntries([...groups].sort((a,b) => b[1]-a[1] || a[0].localeCompare(b[0]))) };
  return { id: weekDays[0], date: reportWeekLabel(weekDays), asOf, status: weekDays.at(-1) < today ? "Ready" : "Draft", workoutDays, totalDays: elapsed.length,
    avgWorkoutTime: fmt(stats.avgTimeMin, "min"), totalVolume: fmt(totalVolumeKg, "kg"), consistencyScore, weeklyScore: consistencyScore,
    stats, strengthProgress, bodyProgress, progressPhotos, photoEntries, nutrition: gymNutritionReference(macroPlans),
    dataNote: "Logged days are activity coverage, not adherence to a workout plan. Time sums recorded exercise minutes, not elapsed session time. Volume estimates external load from recorded sets/reps; missing values are excluded. Retained records can be edited or deleted, so past reports are not immutable snapshots." };
}
export const gymReportDays = monday => Array.from({ length: 7 }, (_, index) => shiftReportDay(monday, index));
