import useJournalAnalysis from "./journalAnalysisContext";
import { AnalysisView, AnalysisChart, MoodDistribution } from "./AnalysisUI";
import { scoreLabel } from "./analysisFormatters";
import { journalMood } from "../../../../../shared/journalAnalysisStats.js";

export default function MoodAnalysis() {
  const { data } = useJournalAnalysis();
  const stats = data?.analysis;
  const moods = stats?.moods || [];
  const strongest = [...moods].filter(row=>row.rating!==null).sort((a,b)=>b.rating-a.rating)[0];
  const lowest = [...moods].filter(row=>row.energy!==null).sort((a,b)=>a.energy-b.energy)[0];
  const top = moods[0];
  const insights = [
    { title: "Most Frequent Mood", value: top ? `${top.emoji} ${top.mood}` : "No recorded mood",
      description: top ? `${top.count} of ${stats.moodLoggedDays} mood-logged days (${top.percentage}%). This describes recorded entries, not your mood on unlogged days.` : "No valid mood has been recorded in this period." },
    { title: "Highest Average Day Rating", value: strongest ? `${strongest.mood} · ${scoreLabel(strongest.rating)}` : "No rating data",
      description: strongest ? `Average from ${strongest.ratingCount} entries with ratings in this mood group. Association does not prove causation; a small group is not a reliable trend.` : "Missing ratings are excluded, not replaced with 50." },
    { title: "Lowest Average Energy", value: lowest ? `${lowest.mood} · ${scoreLabel(lowest.energy)}` : "No energy data",
      description: lowest ? `Average from ${lowest.energyCount} entries with energy scores in this mood group. These are self-reported scores, not health measurements.` : "Missing energy scores are excluded." },
  ];
  const comparisons=moods.map(row=>({ ...row, label:row.mood }));
  const timeline=(stats?.days || []).map(row=>({ ...row, ...journalMood(row.mood), label:row.label, energy:row.energy }));
  return <AnalysisView insights={insights} distribution={stats && <MoodDistribution analysis={stats}/>}>
    <AnalysisChart title="Mood vs Energy and Overall Day Rating" subtitle="Comparison · All recorded mood groups" rows={comparisons} type="bar"
      series={[{key:"energy",label:"Energy",color:"#fbbf24",unit:"/100"},{key:"rating",label:"Overall day rating",color:"#22d3ee",unit:"/100"}]}/>
    <AnalysisChart title="Day-wise Mood Analysis" subtitle="Chronological month timeline · Bar height is energy, not mood intensity" rows={timeline} type="bar" colorByRow
      series={[{key:"energy",label:"Energy",color:"#fbbf24",unit:"/100"}]}/>
  </AnalysisView>;
}
