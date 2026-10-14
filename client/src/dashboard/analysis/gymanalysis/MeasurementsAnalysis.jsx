import { useState } from "react";
import { GymChart as AnalysisChart, AnalysisView, MetricPicker } from "./GymAnalysisUI";
import { valueLabel, signedLabel, countLabel } from "./gymAnalysisFormatters";
import useGymAnalysis from "./gymAnalysisContext";

export default function MeasurementsAnalysis() {
  const { data } = useGymAnalysis(), a = data?.analysis;
  const [group,setGroup] = useState("All"), [id,setId] = useState("bodyWeight");
  const groups = ["All",...new Set(a?.measurements.map(row=>row.group)||[])];
  const selectedGroup = groups.includes(group) ? group : "All";
  const options = a?.measurements.filter(row=>selectedGroup==="All"||row.group===selectedGroup)||[];
  const selected = options.find(row=>row.id===id)||options[0];
  const entries = new Map(selected?.entries.map(row=>[row.date,row.value])||[]);
  const rows = a?.days.map(row=>({...row,value:entries.get(row.date)??null}))||[];
  const insights = !selected ? [] : [
    {title:"Measurement Check-in Days",value:countLabel(a.totals.measurementDays,"day"),description:"Distinct dates with at least one valid positive reading. Deleted, invalid and future measurements are excluded."},
    {title:"Latest "+selected.label,value:valueLabel(selected.latest?.value,selected.unit),description:selected.latest ? "Latest valid "+selected.label.toLowerCase()+" reading this month: "+selected.latest.date+"." : "No valid reading for this field in the selected month. Other fields are not used as substitutes."},
    {title:"Measurement Change",value:signedLabel(selected.change,selected.unit),description:selected.baseline && selected.latest ? "From "+selected.baseline.date+" ("+selected.baseline.value+" "+selected.unit+") to "+selected.latest.date+". Uses the latest valid pre-month reading, or the first reading this month." : "Two valid dated readings are needed for a comparison."},
    {title:"Relative Change",value:signedLabel(selected.changePercent,"%"),description:"Signed change from the selected field's positive baseline. An increase or decrease is not automatically healthy or unhealthy; no target or diagnosis is inferred."},
    {title:"Recorded Fields This Month",value:countLabel(a.measurements.filter(row=>row.latest).length,"field"),description:"Each field retains its own units and dates. Missing readings are unknown, not zero; kilograms and centimetres are never compared on the same scale."},
  ];
  return <AnalysisView insights={insights}>{a && <>
    <div className="gym-analysis-metric-grid rounded-2xl border border-amber-100/10 bg-black/10 p-4">
      <MetricPicker label="Measurement group" value={selectedGroup} onChange={setGroup} options={groups.map(value=>({value,label:value}))}/>
      {selected && <MetricPicker label="Measurement" value={selected.id} onChange={setId} options={options.map(row=>({value:row.id,label:row.label+" ("+row.unit+")"}))}/>}
    </div>
    <AnalysisChart title="Body Measurement Trend" subtitle={(selected?.label||"Measurement")+" · "+(selected?.unit||"")+" · only valid readings this month"}
      rows={rows} max={Math.max(1,...rows.map(row=>row.value||0))} series={[{key:"value",label:selected?.label||"Measurement",color:"#34d399",unit:selected?.unit||""}]} />
    <section className="gym-analysis-detail-card rounded-2xl border border-white/10 p-4">
      <h4 className="font-semibold text-stone-100">Measurement Changes</h4>
      <p className="mt-2 text-xs text-stone-400">Neutral, signed comparisons with each field's own baseline date. No reading means no comparison.</p>
      <p className="mt-2 text-xs text-stone-400 lg:hidden">↔ Swipe or scroll the table to see all columns.</p>
      <div className="gym-analysis-detail-scroll mt-4 overflow-x-auto" tabIndex={0} role="region" aria-label="Measurement changes"><table className="w-full text-left text-xs text-stone-300">
        <thead><tr>{["Field","Baseline","Latest","Change"].map(label=><th key={label} className="p-2">{label}</th>)}</tr></thead>
        <tbody>{a.measurements.filter(row=>row.latest).map(row=><tr key={row.id} className="border-t border-white/10">
          <td className="p-2">{row.label}</td><td className="p-2">{valueLabel(row.baseline?.value,row.unit)}<br/>{row.baseline?.date}</td>
          <td className="p-2">{valueLabel(row.latest.value,row.unit)}<br/>{row.latest.date}</td><td className="p-2">{signedLabel(row.change,row.unit)}</td>
        </tr>)}</tbody>
      </table></div>
      {!a.totals.measurementDays && <p role="status" className="mt-3 text-sm text-stone-400">No measurement readings this month.</p>}
    </section>
  </>}</AnalysisView>;
}
