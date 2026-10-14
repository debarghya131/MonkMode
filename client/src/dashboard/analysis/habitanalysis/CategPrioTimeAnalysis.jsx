import { HabitChart as AnalysisChart, AnalysisView } from "./HabitAnalysisUI";
import useHabitAnalysis from "./habitAnalysisContext";
import { compactChartLabels } from "./habitAnalysisFormatters";

const series = [
  { key: "completionRate", label: "Completed", color: "#34d399", unit: "%" },
  { key: "missedRate", label: "Missed", color: "#fb7185", unit: "%" },
  { key: "pendingRate", label: "Pending", color: "#fbbf24", unit: "%" },
];
export default function CategPrioTimeAnalysis() {
  const { data } = useHabitAnalysis();
  const analysis = data?.analysis;
  const bestCategory = analysis?.categories.slice().sort((a,b)=>b.completionRate-a.completionRate)[0];
  const missedCategory = analysis?.categories.filter(row=>row.missed>0).sort((a,b)=>b.missedRate-a.missedRate)[0];
  const bestTime = analysis?.times.filter(row=>row.total>0 && row.name!=="Unspecified").sort((a,b)=>b.completionRate-a.completionRate)[0];
  const missedTime = analysis?.times.filter(row=>row.missed>0 && row.name!=="Unspecified").sort((a,b)=>b.missedRate-a.missedRate)[0];
  const high = analysis?.priorities.find(row=>row.name==="High");
  const unspecified = analysis?.times.find(row=>row.name==="Unspecified");
  const describe = row => row ? `${row.completed} completed, ${row.missed} missed and ${row.pending} pending of ${row.total} scheduled check-ins. Rates are occurrence-weighted; this pattern does not establish a cause.` : "No eligible scheduled check-ins in this period.";
  const insights = !analysis ? [] : [
    { title:"Highest Completion Category",value:bestCategory?`${bestCategory.name} · ${bestCategory.completionRate}%`:"No data",description:describe(bestCategory) },
    { title:"Highest Missed Rate Category",value:missedCategory?`${missedCategory.name} · ${missedCategory.missedRate}%`:analysis.totals.total?"No missed occurrences":"No data",description:describe(missedCategory) },
    { title:"High-priority Completion",value:high.total?`${high.completed}/${high.total} · ${high.completionRate}%`:"No data",description:describe(high) },
    { title:"Highest Completion Time of Day",value:bestTime?`${bestTime.name} · ${bestTime.completionRate}%`:"No assigned time-of-day data",description:describe(bestTime) },
    { title:"Highest Missed Rate Time of Day",value:missedTime?`${missedTime.name} · ${missedTime.missedRate}%`:analysis.totals.total?"No assigned missed occurrences":"No data",description:describe(missedTime) },
    { title:"Unspecified Time of Day",value:String(unspecified.total),description:"Check-ins without a valid Morning, Afternoon, Evening or Night assignment remain in an explicit Unspecified group. They are not guessed from reminder hours or omitted from totals." },
  ];
  return <AnalysisView insights={insights}>
    {analysis && <>
      <AnalysisChart title="Category-wise Habit Analysis" subtitle="All retained categories · pending is not missed" rows={compactChartLabels(analysis.categories)} series={series} type="bar" />
      <AnalysisChart title="Priority-wise Habit Analysis" subtitle="High, Medium & Low · unscheduled priorities have no rate" rows={analysis.priorities} series={series} type="bar" />
      <AnalysisChart title="Time of Day Habit Analysis" subtitle="Configured time of day, not actual check-in time · Unspecified included" rows={analysis.times} series={series} type="bar" />
      <p className="rounded-xl border border-amber-200/20 bg-amber-500/5 p-4 text-sm leading-6 text-stone-300">Time-of-day charts use your habit assignments, not actual completion hours or work duration. Today's reminder time is not a deadline. Retained schedule edits may affect historical groupings.</p>
    </>}
  </AnalysisView>;
}
