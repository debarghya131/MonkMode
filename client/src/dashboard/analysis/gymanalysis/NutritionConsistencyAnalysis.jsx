import { useState } from "react";
import { AnalysisChart } from "../journalanalysis/AnalysisUI";
import { AnalysisView, MetricPicker } from "./GymAnalysisUI";
import { valueLabel } from "./gymAnalysisFormatters";
import useGymAnalysis from "./gymAnalysisContext";

export default function NutritionConsistencyAnalysis() {
  const { data } = useGymAnalysis(), a = data?.analysis;
  const [metric,setMetric] = useState("protein");
  const selected = a?.nutrition.find(row=>row.id===metric);
  const insights = !a ? [] : [
    {title:"Workout Activity Coverage",value:valueLabel(a.totals.coverage,"%"),description:a.totals.loggedDays+" logged dates across "+a.totals.elapsedDays+" elapsed calendar days. Future days are excluded; missing logs do not prove missed workouts or dietary non-adherence."},
    {title:"Current Planned "+selected.label,value:valueLabel(selected.average,selected.unit),description:selected.configuredDays+" of 7 weekdays have valid configured values. This is a simple mean of configured weekdays, not recorded intake or selected-month historical nutrition."},
    {title:"Nutrition Adherence",value:"Not measured",description:"The app stores nutrition plans, not dated intake records. Calories consumed, calorie deficits, actual protein intake and adherence cannot be calculated."},
    ...a.nutrition.filter(row=>row.id!==metric).map(row=>({title:"Current Planned "+row.label,value:valueLabel(row.average,row.unit),description:row.configuredDays+" configured weekdays. Zero is a valid planned amount; missing or invalid values are excluded from this nutrient's average."})),
  ];
  return <AnalysisView insights={insights}>{a && <>
    <AnalysisChart title="Workout Coverage by Month Block" subtitle="Calendar blocks 1–7, 8–14, etc. · only elapsed dates · includes the final partial block" rows={a.weeks}
      type="bar" max={100} series={[{key:"coverage",label:"Logged-day coverage",color:"#fbbf24",unit:"%"}]}/>
    <AnalysisChart title="Workout Coverage by Weekday" subtitle="Logged dates / elapsed occurrences of each weekday · no hard-coded rest days" rows={a.weekdays}
      type="bar" max={100} series={[{key:"coverage",label:"Logged-day coverage",color:"#34d399",unit:"%"}]}/>
    <p className="rounded-xl border border-amber-200/20 p-4 text-sm text-amber-100">{a.nutritionNote}</p>
    <MetricPicker label="Nutrition metric" value={metric} onChange={setMetric} options={a.nutrition.map(row=>({value:row.id,label:row.label+" ("+row.unit+")"}))}/>
    <AnalysisChart title="Current Weekday Nutrition Plan" subtitle={selected.label+" · "+selected.unit+" · current reference, independent of the selected historical month"}
      rows={a.nutritionDays} type="bar" max={Math.max(1,...a.nutritionDays.map(row=>row[metric]||0))}
      series={[{key:metric,label:"Planned "+selected.label,color:"#38bdf8",unit:selected.unit}]}/>
    {!a.nutrition.some(row=>row.configuredDays) && <p role="status" className="text-sm text-stone-400">No valid active macro-plan values configured.</p>}
  </>}</AnalysisView>;
}
