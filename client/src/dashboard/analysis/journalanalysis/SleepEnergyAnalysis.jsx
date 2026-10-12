import { useState } from "react";
import useJournalAnalysis from "./journalAnalysisContext";
import { AnalysisView, AnalysisChart } from "./AnalysisUI";
import { clockLabel, durationLabel, scoreLabel, dayLabel } from "./analysisFormatters";

export default function SleepEnergyAnalysis() {
  const { data } = useJournalAnalysis();
  const [selectedWeek, setSelectedWeek] = useState(0);
  const stats=data?.analysis;
  const week=stats?.weeks[Math.min(selectedWeek,stats.weeks.length-1)];
  const insights=[
    {title:"Avg Sleep Duration",value:durationLabel(stats?.avgSleepMinutes),description:`Average from ${stats?.sleepRecordedDays || 0} valid bedtime/wakeup pairs. These inferred durations are not measured sleep quality; missing or implausible pairs are excluded.`},
    {title:"Avg Wakeup Time",value:clockLabel(stats?.avgWakeTime),description:"Circular clock average across valid recorded wake times. Averages alone do not establish consistency."},
    {title:"Avg Sleep Time",value:clockLabel(stats?.avgSleepTime),description:"Circular clock average handles bedtimes on both sides of midnight. Opposing times have no meaningful average."},
    {title:"Avg Energy This Month",value:scoreLabel(stats?.avgEnergy),description:`Self-reported energy across ${stats?.energyRecordedDays || 0} recorded scores. Missing values are not zero or 50.`},
    {title:"Avg Day Rating This Month",value:scoreLabel(stats?.avgRating),description:`Overall day rating across ${stats?.ratingRecordedDays || 0} recorded scores.`},
    {title:"Highest Rated Weekday",value:stats?.highestRatedWeekday ? `${stats.highestRatedWeekday.label} · ${scoreLabel(stats.highestRatedWeekday.rating)}` : "No data",description:"Weekday with the highest average rating across the whole selected month, not just the selected seven-day block."},
    {title:"Lowest Rated Weekday",value:stats?.lowestRatedWeekday ? `${stats.lowestRatedWeekday.label} · ${scoreLabel(stats.lowestRatedWeekday.rating)}` : "No data",description:"Weekday with the lowest average recorded rating this month. Different weekdays may have different sample sizes."},
    {title:"Highest Energy Day",value:stats?.highestEnergy ? `${dayLabel(stats.highestEnergy.date)} · ${scoreLabel(stats.highestEnergy.energy)}` : "No data",description:"Highest recorded energy across the whole selected month."},
    {title:"Lowest Energy Day",value:stats?.lowestEnergy ? `${dayLabel(stats.lowestEnergy.date)} · ${scoreLabel(stats.lowestEnergy.energy)}` : "No data",description:"Lowest recorded energy across the whole selected month. This does not diagnose fatigue or establish a cause."},
  ];
  return <AnalysisView insights={insights}>
    <AnalysisChart title="Total Sleep Duration" subtitle="Sleep trend · Missing logs/times remain gaps; future days are not missing" rows={stats?.days || []} max={Math.max(8,Math.ceil(Math.max(0,...(stats?.days || []).map(day=>day.sleep ?? 0))))} integerTicks
      series={[{key:"sleep",label:"Inferred sleep",color:"#38bdf8",unit:"h"}]}/>
    <section className="journal-comparison-controls rounded-2xl border border-white/10 p-4">
      <h4 className="font-bold text-amber-50">Select comparison block</h4><p className="mt-2 text-xs text-stone-400">Month blocks: days 1–7, 8–14, 15–21, 22–28, and remaining days. These are not Monday–Sunday calendar weeks.</p>
      <div className="mt-3 flex flex-wrap gap-2">{stats?.weeks.map((item,index)=><button key={item.label} type="button" aria-pressed={week?.label===item.label} onClick={()=>setSelectedWeek(index)}
        className={`rounded-full border px-3 py-2 text-xs ${week?.label===item.label ? "border-amber-300/40 bg-amber-500/15 text-amber-200" : "border-white/10 text-stone-300"}`}>{item.label} · {Number(item.from.slice(-2))}–{Number(item.to.slice(-2))}</button>)}</div>
    </section>
    <AnalysisChart title="Sleep Duration vs Energy and Overall Day Rating" subtitle={week?.label || "Comparison"} rows={week?.days || []} type="bar" max={18} rightAxis
      series={[{key:"sleep",label:"Sleep",color:"#38bdf8",unit:"h"},{key:"energy",label:"Energy",color:"#fbbf24",unit:"/100",max:100},{key:"rating",label:"Day rating",color:"#6ee7b7",unit:"/100",max:100}]}/>
    <AnalysisChart title="Energy Level" subtitle={week?.label || "Selected block"} rows={week?.days || []} type="bar"
      series={[{key:"energy",label:"Energy",color:"#fbbf24",unit:"/100"}]}/>
  </AnalysisView>;
}
