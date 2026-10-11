import { createHash } from "node:crypto";
import { APP_TIMEZONE } from "../config/runtime.js";
import { journalDayKey } from "./journalCalendarUtils.js";
import { journalReportWeek, completedJournalWeeks } from "./journalWeeklyReportUtils.js";
import { computeGymWeeklyReport, GYM_REPORT_MEASUREMENTS, GYM_REPORT_IMAGE_PATTERN } from "../../shared/gymWeeklyStats.js";

export const gymReportWeek = journalReportWeek;
export const completedGymWeeks = completedJournalWeeks;
export const GYM_EXERCISE_FIELDS = { date: 1, exerciseId: 1, exerciseName: 1, bodyPart: 1, sets: 1, reps: 1, weight: 1,
  lastSetWeight: 1, lastSetReps: 1, repsBreakdown: 1, totalTime: 1, createdAt: 1, updatedAt: 1 };
export const GYM_MEASUREMENT_FIELDS = Object.fromEntries([...GYM_REPORT_MEASUREMENTS.map(([key]) => [key, 1]), ["checkInDate", 1], ["deletedAt", 1], ["createdAt", 1], ["updatedAt", 1]]);
export const gymExerciseFilter = (userId, days) => ({ userId, date: { $gte: days[0], $lte: days.at(-1) } });
export const gymMeasurementFilter = (userId, days) => ({ userId, deletedAt: null, checkInDate: { $lte: days.at(-1) } });
// Broad candidate bounds only; the calculator assigns the exact app-calendar day.
export const gymGalleryFilter = (userId, days) => ({ userId, checkInDate: {
  $gte: new Date(Date.parse(`${days[0]}T00:00:00Z`) - 2 * 86400000),
  $lt: new Date(Date.parse(`${days.at(-1)}T00:00:00Z`) + 3 * 86400000),
} });
export const GYM_GALLERY_METADATA = { checkInDate: 1, createdAt: 1, images: { $map: { input: { $ifNull: ["$images", []] }, as: "image", in: {
  _id: "$$image._id", uploadedAt: "$$image.uploadedAt", hasSource: { $regexMatch: { input: { $ifNull: ["$$image.src", ""] },
    regex: GYM_REPORT_IMAGE_PATTERN, options: "i" } },
} } } };
export function buildGymWeeklyReport(records, days) {
  const now = new Date();
  return { ...computeGymWeeklyReport(records, days, { today: journalDayKey(now), now: now.getTime(), timezone: APP_TIMEZONE }), timezone: APP_TIMEZONE, serverNow: now.toISOString() };
}
export function gymAiContext(report) {
  const { id, date, asOf, status, workoutDays, totalDays, consistencyScore, stats, dataNote } = report;
  return { id, date, asOf, status, workoutDays, totalDays, activityCoverage: consistencyScore, stats, dataNote,
    comparisons: { exercisesWithBaseline: report.strengthProgress.filter(row => !row.isFirstEntry).length,
      increasedLoad: report.strengthProgress.filter(row => Number.parseFloat(row.improvement) > 0).length,
      decreasedLoad: report.strengthProgress.filter(row => Number.parseFloat(row.improvement) < 0).length,
      unchangedLoad: report.strengthProgress.filter(row => row.improvement !== null && Number.parseFloat(row.improvement) === 0).length,
      measurementComparisons: report.bodyProgress.filter(row => row.delta !== null).length },
    nutritionNote: "Only current macro plans exist; no dated intake or historical adherence is available." };
}
export const gymReportFingerprint = report => createHash("sha256").update(JSON.stringify({ version: 1, ...gymAiContext(report) })).digest("hex");
