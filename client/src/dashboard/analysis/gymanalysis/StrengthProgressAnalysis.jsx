import { useState } from "react";
import { AnalysisChart } from "../journalanalysis/AnalysisUI";
import { AnalysisView, MetricPicker } from "./GymAnalysisUI";
import { valueLabel, signedLabel } from "./gymAnalysisFormatters";
import useGymAnalysis from "./gymAnalysisContext";
const metrics = [{value:"weight",label:"Recorded load (kg)"},{value:"reps",label:"Recorded reps"},{value:"sets",label:"Recorded sets"},{value:"time",label:"Recorded exercise time (min)"},{value:"volume",label:"Estimated external-load volume (kg)"}];
const units = { weight:"kg",reps:"reps",sets:"sets",time:"min",volume:"kg" };
export default function StrengthProgressAnalysis() {
  const { data } = useGymAnalysis(), a = data?.analysis;
  const [group,setGroup] = useState("All"), [id,setId] = useState(""), [metric,setMetric] = useState("weight");
  const groups = ["All",...new Set(a?.exercises.map(row=>row.group)||[])];
  const selectedGroup = groups.includes(group) ? group : "All";
  const options = a?.exercises.filter(row=>selectedGroup==="All"||row.group===selectedGroup)||[];
  const selected = options.find(row=>row.id===id)||options[0];
  const entries = new Map(selected?.entries.map(row=>[row.date,row])||[]);
  const rows = a?.days.map(row=>({...row,[metric]:entries.get(row.date)?.[metric]??null}))||[];
  const insights = !selected ? [{title:"Exercise Comparison",value:"No data",description:"No retained exercise entries in this month. Previous months are not displayed as current progress."}] : [
    {title:"Selected Exercise",value:selected.label,description:selected.group+" · "+selected.entries.length+" dated entries. Exercises are grouped by stable ID, not their display name."},
    {title:"Latest Recorded Load",value:valueLabel(selected.latest.weight,"kg"),description:"Recorded on "+selected.latest.date+". This is the saved working load, not an estimated one-rep max or verified personal best."},
    {title:"Load Change",value:signedLabel(selected.weightChange,"kg"),description:selected.baseline ? "Compared with "+selected.baseline.date+" ("+valueLabel(selected.baseline.weight,"kg")+"). Uses the latest pre-month record, or the first entry this month if there is no earlier record." : "A comparable earlier record is needed; one entry is not a zero-load baseline."},
    {title:"Load Change Percentage",value:signedLabel(selected.weightChangePercent,"%"),description:"Requires positive baseline load and a valid latest load. Missing or zero baseline load has no percentage comparison."},
    {title:"Rep Change",value:signedLabel(selected.repsChange,"reps"),description:"Recorded reps can change independently of load. These changes do not establish strength gains or losses."},
    {title:"Exercise-time Change",value:signedLabel(selected.timeChange,"min"),description:"Time is a logged duration, not speed, intensity, or a performance judgement."},
  ];
  return <AnalysisView insights={insights}>{a && <>
    <div className="gym-analysis-metric-grid rounded-2xl border border-amber-100/10 bg-black/10 p-4">
      <MetricPicker label="Body group" value={selectedGroup} onChange={setGroup} options={groups.map(value=>({value,label:value}))}/>
      {selected && <MetricPicker label="Exercise" value={selected.id} onChange={setId} options={options.map(row=>({value:row.id,label:row.label}))}/>}
      <MetricPicker label="Strength metric" value={metric} onChange={setMetric} options={metrics}/>
    </div>
    {!selected && <p role="status" className="text-sm text-stone-400">No exercise progress recorded in this period.</p>}
    <AnalysisChart title="Exercise Progress in Selected Month" subtitle={(selected?.label||"No exercise")+" · "+units[metric]+" · only recorded dates; missing readings are gaps"}
      rows={rows} max={Math.max(1,...rows.map(row=>row[metric]||0))} integerTicks={["sets","reps"].includes(metric)}
      series={[{key:metric,label:metrics.find(row=>row.value===metric).label.replace(/\s*\([^)]*\)$/, ""),color:"#38bdf8",unit:units[metric]}]} />
  </>}</AnalysisView>;
}
