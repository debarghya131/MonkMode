import useJournalAnalysis from "./journalAnalysisContext";
import { AnalysisView, AnalysisChart } from "./AnalysisUI";

export default function OthersAnalysis() {
  const { data }=useJournalAnalysis();
  const stats=data?.analysis;
  const tags=items=>items?.length ? items.map(item=>`${item.label} (${item.count} days)`).join(", ") : "No repeated tags";
  const insights=[
    {title:"Total Wins This Month",value:stats?.wins ?? 0,description:"Count of non-empty wins recorded in retained journal entries. Unlogged days are unknown, not zero-win days."},
    {title:"Total Achievements This Month",value:stats?.achievements ?? 0,description:"Count of non-empty recorded achievements; this is not a goal-completion total."},
    {title:"Total Mistakes This Month",value:stats?.mistakes ?? 0,description:"Count of non-empty recorded mistakes, without judging or inferring unlogged experiences."},
    {title:"Top 5 Repeated Mistakes",value:tags(stats?.topMistakes),description:"Case-insensitive tags appearing on at least two distinct logged days. Repeating a tag twice in one entry counts as one day."},
    {title:"Top 5 Repeated Distractions",value:tags(stats?.topDistractions),description:"Recorded distractions repeated on at least two days. This is not a diagnosis or a causal analysis."},
    {title:"Avg Weekly Score",value:stats?.avgWeeklyScore===null || !stats ? "No rating data" : `${stats.avgWeeklyScore}/100`,description:"Average known month-block scores, including the final partial block. Formula matches weekly reports: 45% logged-day coverage + 45% average rating + up to 10 streak points. Missing ratings leave scores unknown; these blocks are not calendar weeks."},
    {title:"Longest Journal Streak",value:`${stats?.longestStreak || 0} days`,description:"Longest consecutive logged-day run within this month. It is not a lifetime or Monk Streak; future days and unfinished today are not breaks."},
    {title:"Streak Breaks This Month",value:stats?.streakBreaks || 0,description:"Transitions from a logged run to a past eligible day with no journal. Consecutive missed days count as one break."},
    {title:"Total Missed Days This Month",value:stats?.missedDays || 0,description:`Past eligible days without a journal, excluding future/pre-account dates. Today without a journal is pending (${stats?.pendingDays || 0} day), not missed.`},
  ];
  return <AnalysisView insights={insights}>
    <AnalysisChart title="Wins, Mistakes & Achievements This Month" subtitle="Monthly reflection · Blank journal days remain gaps" rows={stats?.days || []}
      max={Math.max(1,...(stats?.days || []).flatMap(row=>[row.wins || 0,row.mistakes || 0,row.achievement || 0]))}
      series={[{key:"wins",label:"Wins",color:"#10b981"},{key:"mistakes",label:"Mistakes",color:"#fb7185"},{key:"achievement",label:"Achievements",color:"#f59e0b"}]}/>
    <AnalysisChart title="Streak Analysis (Past Breaks Shown at 0)" subtitle="Within-month consecutive journal days" rows={stats?.days || []} max={Math.max(1,stats?.longestStreak || 0)}
      series={[{key:"streak",label:"Journal streak",color:"#38bdf8",unit:" days"}]}/>
    <AnalysisChart title="Missed Day Analysis" subtitle="Past eligible no-log days by weekday" rows={stats?.weekdays || []} type="bar" max={Math.max(1,...(stats?.weekdays || []).map(row=>row.missed))}
      series={[{key:"missed",label:"Missed logs",color:"#fb7185",unit:" days"}]}/>
    <AnalysisChart title="Month-block Scores" subtitle="Recorded ratings and coverage · All month blocks included" rows={(stats?.weeks || []).map(week=>({...week,value:week.score}))} type="bar"
      series={[{key:"value",label:"Composite score",color:"#fbbf24",unit:"/100"}]}/>
  </AnalysisView>;
}
