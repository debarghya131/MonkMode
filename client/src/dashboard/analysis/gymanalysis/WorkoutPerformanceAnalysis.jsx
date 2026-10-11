import { AnalysisChart } from "../journalanalysis/AnalysisUI";
import { AnalysisView } from "./GymAnalysisUI";
import { valueLabel } from "./gymAnalysisFormatters";
import useGymAnalysis from "./gymAnalysisContext";

export default function WorkoutPerformanceAnalysis() {
  const { data } = useGymAnalysis(), a = data?.analysis, t = a?.totals;
  const insights = !a ? [] : [
    { title:"Logged Workout Days", value:t.loggedDays+" days", description:t.exerciseLogs+" retained exercise entries across "+t.loggedDays+" distinct dates. Multiple exercises on one date count as one logged day, not separate sessions." },
    { title:"Activity Coverage", value:valueLabel(t.coverage,"%"), description:t.loggedDays+" of "+t.elapsedDays+" elapsed calendar days have logs, including today provisionally. This is not workout-plan completion; a day without a log is not proof of a missed workout or rest." },
    { title:"Estimated External-load Volume", value:valueLabel(t.volume,"kg"), description:t.volumeLogs+" of "+t.exerciseLogs+" entries have valid recorded load and reps. This is a partial estimate when values are missing, not total workload or a performance ranking. Last-set overrides and recorded rep breakdowns are included." },
    { title:"Recorded Exercise Time", value:valueLabel(t.time,"min"), description:t.timedLogs+" entries have valid time values. Summed exercise minutes are not elapsed workout/session time." },
    { title:"Body-group Coverage", value:a.groups.length+" groups", description:"Counts exercise entries, not muscle growth or training quality. Unrecognized body groups remain visible as Other." },
  ];
  return <AnalysisView insights={insights}>{a && <>
    <AnalysisChart title="Daily Exercise Logs" subtitle="Distinct retained exercise IDs per date · future dates remain unknown" rows={a.days} type="bar" integerTicks max={Math.max(1,...a.days.map(row=>row.exerciseLogs||0))}
      series={[{key:"exerciseLogs",label:"Exercise entries",color:"#fbbf24"}]} />
    <AnalysisChart title="Estimated Daily Training Volume" subtitle="kg external load × recorded reps · gaps mean no calculable volume, not zero work" rows={a.days}
      max={Math.max(1,...a.days.map(row=>row.volume||0))} series={[{key:"volume",label:"Estimated volume",color:"#38bdf8",unit:"kg"}]} />
    <AnalysisChart title="Body-group Exercise Entries" subtitle="Entry counts only; load across different exercises is not comparable" rows={a.groups} type="bar" integerTicks max={Math.max(1,...a.groups.map(row=>row.exerciseLogs))}
      series={[{key:"exerciseLogs",label:"Exercise entries",color:"#34d399"}]} />
  </>}</AnalysisView>;
}
