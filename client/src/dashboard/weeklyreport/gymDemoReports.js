import { computeGymWeeklyReport, gymReportDays } from "../../../../shared/gymWeeklyStats.js";
import { shiftReportDay } from "../../../../shared/journalWeeklyStats.js";

const samplePhoto = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9WQAAAAASUVORK5CYII=";
export function createDemoGymReports(photoSources = [samplePhoto]) {
  return Object.fromEntries(["2026-04-13", "2026-04-06", "2026-03-30"].map((id, index) => {
    const days = gymReportDays(id), exercises = [];
    const names = [["bench", "Bench press", "Chest - Upper"], ["row", "Cable row", "Back"], ["squat", "Squat", "Legs"], ["run", "Easy run", "Cardio"]];
    names.forEach(([exerciseId, exerciseName, bodyPart], offset) => {
      exercises.push({ exerciseId, exerciseName, bodyPart, date: shiftReportDay(id, -3), sets: "3", reps: "8", weight: offset === 3 ? "0" : String(40 + offset * 10), totalTime: "12" });
      exercises.push({ exerciseId, exerciseName, bodyPart, date: days[offset === 3 ? 6 : offset * 2], sets: "3", reps: String(8 + index),
        weight: offset === 3 ? "0" : String(45 + offset * 10 - index * 2), totalTime: String(12 + offset * 3), repsBreakdown: offset === 0 ? ["8", "8", "6"] : [] });
    });
    const measurements = [{ checkInDate: shiftReportDay(id, -4), bodyWeight: "74.5", waist: "82", leftArm: "34" },
      { checkInDate: days[5], bodyWeight: String(74.8 - index / 10), waist: String(81.8 + index / 10), leftArm: "34.2", calves: "37" }];
    const gallery = [0, 2, 5, 6].map((offset, imageIndex) => ({ _id: `entry-${offset}`, checkInDate: `${days[offset]}T00:00:00+05:30`,
      images: [{ _id: `photo-${offset}`, src: photoSources[imageIndex % photoSources.length] || samplePhoto },
        ...(offset === 0 ? [{ _id: "second-monday", src: photoSources[1] || samplePhoto }] : [])] }));
    const macroPlans = ["Mon", "Wed", "Sun"].map(day => ({ day, planType: "macros", isActive: true,
      values: { protein: "150 g", carbs: "220 g", fats: "65 g", fiber: "28 g", calories: "2,350 kcal", water: "3.7 L", sugar: "30 g", sodium: "2,100 mg" } }));
    const report = computeGymWeeklyReport({ exercises, measurements, gallery, macroPlans }, days, { today: "2026-10-10" });
    report.aiSummary = `Sample analysis: ${report.workoutDays} of 7 days contain exercise logs, totaling ${report.stats.exerciseLogs} entries. The report compares retained exercise readings and ${report.stats.measurementDays} measurement day, without assuming that load or body changes are automatically beneficial. Keep logging exercise time and sets consistently next week; current macro plans are not historical intake.`;
    return [id, report];
  }));
}
