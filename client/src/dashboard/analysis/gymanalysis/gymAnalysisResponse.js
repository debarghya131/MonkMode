import { journalMonthDays } from "../../../../../shared/journalAnalysisStats.js";
import { validReportDay } from "../../../../../shared/journalWeeklyStats.js";
import { GYM_REPORT_MEASUREMENTS } from "../../../../../shared/gymWeeklyStats.js";
import { GYM_MACRO_METRICS } from "../../../../../shared/gymAnalysisStats.js";
export { habitAnalysisClockValid as gymAnalysisClockValid } from "../habitanalysis/habitAnalysisResponse.js";
import { habitAnalysisClockValid as clockValid } from "../habitanalysis/habitAnalysisResponse.js";
const count = value => Number.isSafeInteger(value) && value >= 0;
const numeric = value => value === null || (typeof value === "number" && Number.isFinite(value) && value >= 0);
const signed = value => value === null || (typeof value === "number" && Number.isFinite(value));
const rows = (value, check) => Array.isArray(value) && value.every(check);
const activity = row => row && count(row.elapsedDays) && count(row.loggedDays) && row.loggedDays <= row.elapsedDays && numeric(row.coverage) && (row.coverage === null || row.coverage <= 100);
const reading = row => row === null || (validReportDay(row?.date) && numeric(row.value) && row.value > 0);
const exercise = row => row && typeof row.id === "string" && typeof row.name === "string" && typeof row.group === "string"
  && validReportDay(row.date) && ["sets","reps","weight","time","volume"].every(key=>numeric(row[key]));
export function validGymAnalysisResponse(data, period) {
  if (data?.year !== Number(period.year) || data.month !== Number(period.month) || !clockValid(data) || typeof data.dataNote !== "string") return false;
  if (data.joinedDay !== null && !validReportDay(data.joinedDay)) return false;
  const a = data.analysis, calendar = journalMonthDays(period.year,period.month);
  if (!activity(a?.totals) || !["exerciseLogs","uniqueExercises","volumeLogs","timedLogs","measurementDays"].every(key=>count(a.totals[key]))
    || !["sets","volume","time"].every(key=>numeric(a.totals[key]))) return false;
  if (!rows(a.days,row=>validReportDay(row.date) && typeof row.label==="string" && typeof row.weekday==="string"
    && typeof row.status==="string" && typeof row.future==="boolean" && ["exerciseLogs","logged","sets","time","volume"].every(key=>numeric(row[key]))
    && count(row.volumeLogs) && count(row.timedLogs)) || a.days.length!==calendar.length || a.days.some((row,index)=>row.date!==calendar[index])) return false;
  if (!rows(a.weeks,row=>activity(row) && validReportDay(row.from) && validReportDay(row.to) && typeof row.label==="string" && numeric(row.volume))
    || a.weeks.length!==Math.ceil(calendar.length/7) || !rows(a.weekdays,row=>activity(row) && typeof row.label==="string") || a.weekdays.length!==7
    || !rows(a.groups,row=>typeof row.label==="string" && count(row.exerciseLogs))) return false;
  if (!rows(a.exercises,row=>typeof row.id==="string" && typeof row.name==="string" && typeof row.group==="string" && typeof row.label==="string" && exercise(row.latest) && (row.baseline===null || exercise(row.baseline))
    && rows(row.entries,exercise) && row.entries.length>0 && ["weightChange","weightChangePercent","repsChange","timeChange"].every(key=>signed(row[key])))
    || new Set(a.exercises.map(row=>row.id)).size!==a.exercises.length) return false;
  if (!rows(a.measurements,(row)=>typeof row.label==="string" && typeof row.group==="string" && ["kg","cm"].includes(row.unit)
    && reading(row.latest) && reading(row.baseline) && rows(row.entries,entry=>entry !== null && reading(entry)) && signed(row.change) && signed(row.changePercent))
    || a.measurements.length!==GYM_REPORT_MEASUREMENTS.length || a.measurements.some((row,index)=>row.id!==GYM_REPORT_MEASUREMENTS[index][0])) return false;
  if (a.days.reduce((sum,row)=>sum+(row.exerciseLogs || 0),0)!==a.totals.exerciseLogs
    || a.days.filter(row=>row.logged===1).length!==a.totals.loggedDays
    || a.days.some(row=>row.future!== (row.date>data.today) || (row.future && row.exerciseLogs!==null))) return false;
  return rows(a.nutrition,row=>typeof row.label==="string" && typeof row.unit==="string" && count(row.configuredDays) && row.configuredDays<=7 && numeric(row.average))
    && a.nutrition.length===GYM_MACRO_METRICS.length && a.nutrition.every((row,index)=>row.id===GYM_MACRO_METRICS[index][0])
    && rows(a.nutritionDays,row=>typeof row.label==="string" && GYM_MACRO_METRICS.every(([key])=>numeric(row[key])))
    && a.nutritionDays.length===7 && typeof a.nutritionNote==="string";
}

