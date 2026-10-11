import { journalMonthDays } from "./journalAnalysisStats.js";
import { validReportDay } from "./journalWeeklyStats.js";
import { gymExerciseValues, gymReportBodyGroup, gymReportNumber, GYM_REPORT_MEASUREMENTS } from "./gymWeeklyStats.js";

const round = value => Math.round(value * 10) / 10;
const stamp = row => Date.parse(row.updatedAt || row.createdAt || "") || 0;
const newer = (row, old) => !old || stamp(row) > stamp(old) || (stamp(row) === stamp(old) && String(row._id || "") >= String(old._id || ""));
const sumKnown = values => {
  const known = values.filter(value => value !== null);
  return known.length ? round(known.reduce((sum, value) => sum + value, 0)) : null;
};
export const GYM_MACRO_METRICS = [["protein","Protein","g"],["carbs","Carbohydrates","g"],["fats","Fat","g"],["fiber","Fiber","g"],["calories","Calories","kcal"],["water","Water","L"],["sugar","Sugar","g"],["sodium","Sodium","mg"]];
const weekdayNames = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
export const GYM_ANALYSIS_NOTE = "Calculated from retained exercise and measurement logs, not AI-generated. Logged days measure calendar activity coverage, not plan adherence. Missing values are unknown; edits and deletions can change historical results.";
export function computeGymAnalysis({ exercises = [], measurements = [], macroPlans = [] }, { year, month, today }) {
  const calendar = journalMonthDays(year, month);
  if (!validReportDay(today)) throw new Error("Invalid app date");
  const from = calendar[0], through = calendar.at(-1) < today ? calendar.at(-1) : today;
  const exerciseMap = new Map();
  for (const row of exercises) {
    if (!validReportDay(row.date) || row.date > through || typeof row.exerciseId !== "string" || !row.exerciseId.trim()) continue;
    const key = row.date + ":" + row.exerciseId.trim();
    if (newer(row, exerciseMap.get(key))) exerciseMap.set(key, row);
  }
  const allExercises = [...exerciseMap.values()].sort((a,b) => a.date.localeCompare(b.date));
  const prior = new Map(), selected = new Map(), logs = [];
  for (const row of allExercises) {
    const id = row.exerciseId.trim(), values = gymExerciseValues(row);
    const entry = { id, date: row.date, name: typeof row.exerciseName === "string" && row.exerciseName.trim() ? row.exerciseName.trim() : "Untitled exercise",
      group: gymReportBodyGroup(row.bodyPart), ...values };
    if (row.date < from) prior.set(id, entry);
    else if ([values.sets,values.reps,values.weight,values.time].some(value => value > 0)) {
      logs.push(entry);
      if (!selected.has(id)) selected.set(id, []);
      selected.get(id).push(entry);
    }
  }
  const exerciseRows = [...selected].map(([id, entries]) => {
    const first = entries[0], latest = entries.at(-1), baseline = prior.get(id) || (entries.length > 1 ? first : null);
    const delta = key => baseline && baseline[key] !== null && latest[key] !== null ? round(latest[key] - baseline[key]) : null;
    return { id, name: latest.name, label: latest.name, group: latest.group, baseline, latest, entries,
      weightChange: delta("weight"), repsChange: delta("reps"), timeChange: delta("time"),
      weightChangePercent: baseline?.weight > 0 && latest.weight !== null ? round((latest.weight-baseline.weight)/baseline.weight*100) : null };
  }).sort((a,b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  const nameCounts = new Map(), ordinals = new Map();
  for (const row of exerciseRows) nameCounts.set(row.name, (nameCounts.get(row.name) || 0) + 1);
  for (const row of exerciseRows) if (nameCounts.get(row.name) > 1) {
    const ordinal = (ordinals.get(row.name) || 0) + 1;
    ordinals.set(row.name, ordinal); row.label = row.name + " · " + ordinal;
  }
  const daily = calendar.map(date => {
    const entries = logs.filter(row => row.date === date), future = date > today;
    return { date, label: String(Number(date.slice(-2))), weekday: weekdayNames[new Date(date+"T12:00:00Z").getUTCDay()],
      status: future ? "future" : entries.length ? "logged" : "no retained log", future,
      exerciseLogs: future ? null : entries.length, logged: future ? null : Number(entries.length > 0),
      sets: sumKnown(entries.map(row=>row.sets)), time: sumKnown(entries.map(row=>row.time)), volume: sumKnown(entries.map(row=>row.volume)),
      volumeLogs: entries.filter(row=>row.volume !== null).length, timedLogs: entries.filter(row=>row.time !== null).length };
  });
  const activity = rows => {
    const elapsed = rows.filter(row=>!row.future), loggedDays = elapsed.filter(row=>row.logged).length;
    return { elapsedDays: elapsed.length, loggedDays, coverage: elapsed.length ? round(loggedDays/elapsed.length*100) : null };
  };
  const weeks = Array.from({ length: Math.ceil(calendar.length/7) },(_,index)=>{
    const rows = daily.slice(index*7,index*7+7);
    return { label: "Week "+(index+1), from: rows[0].date, to: rows.at(-1).date, ...activity(rows), volume: sumKnown(rows.map(row=>row.volume)) };
  });
  const weekdays = weekdayNames.map(label=>({ label, ...activity(daily.filter(row=>row.weekday===label)) }));
  const groups = new Map();
  for (const row of logs) {
    if (!groups.has(row.group)) groups.set(row.group, { label: row.group, exerciseLogs: 0 });
    groups.get(row.group).exerciseLogs++;
  }
  const measureMap = new Map();
  for (const row of measurements) {
    if (row.deletedAt || !validReportDay(row.checkInDate) || row.checkInDate > through) continue;
    if (newer(row, measureMap.get(row.checkInDate))) measureMap.set(row.checkInDate, row);
  }
  const allMeasures = [...measureMap.values()].sort((a,b)=>a.checkInDate.localeCompare(b.checkInDate));
  const fields = GYM_REPORT_MEASUREMENTS.map(([id,label,group,unit])=>{
    const readings = allMeasures.map(row=>({ date: row.checkInDate, value: gymReportNumber(row[id],unit,1000) })).filter(row=>row.value > 0);
    const entries = readings.filter(row=>row.date >= from), latest = entries.at(-1) || null;
    const baseline = readings.filter(row=>row.date < from).at(-1) || (entries.length > 1 ? entries[0] : null);
    const change = latest && baseline ? round(latest.value-baseline.value) : null;
    return { id,label,group,unit,entries,baseline,latest,change,
      changePercent: change !== null && baseline.value > 0 ? round(change/baseline.value*100) : null };
  });
  const plans = new Map();
  for (const row of macroPlans) if (row.planType === "macros" && row.isActive === true && weekdayNames.includes(row.day) && newer(row,plans.get(row.day))) plans.set(row.day,row);
  const nutritionDays = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(label=>{
    const row = { label };
    for (const [key,,unit] of GYM_MACRO_METRICS) row[key] = gymReportNumber(plans.get(label)?.values?.[key],unit);
    return row;
  });
  const nutrition = GYM_MACRO_METRICS.map(([id,label,unit])=>{
    const values = nutritionDays.map(row=>row[id]).filter(value=>value !== null);
    return { id,label,unit,configuredDays: values.length, average: values.length ? round(values.reduce((a,b)=>a+b,0)/values.length) : null };
  });
  const measurementDays = new Set(fields.flatMap(row=>row.entries.map(entry=>entry.date))).size;
  return { days: daily, weeks, weekdays, groups: [...groups.values()].sort((a,b)=>b.exerciseLogs-a.exerciseLogs || a.label.localeCompare(b.label)),
    exercises: exerciseRows, measurements: fields, nutrition, nutritionDays,
    totals: { ...activity(daily), exerciseLogs: logs.length, uniqueExercises: selected.size,
      sets: sumKnown(logs.map(row=>row.sets)), volume: sumKnown(logs.map(row=>row.volume)), volumeLogs: logs.filter(row=>row.volume !== null).length,
      time: sumKnown(logs.map(row=>row.time)), timedLogs: logs.filter(row=>row.time !== null).length, measurementDays },
    nutritionNote: "Current active weekday macro plans are references, not recorded intake, historical month nutrition, or adherence. Each nutrient average uses only weekdays with a valid configured value." };
}

