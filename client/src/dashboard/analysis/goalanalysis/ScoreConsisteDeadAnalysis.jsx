import { AnalysisChart } from "../journalanalysis/AnalysisUI";
import { AnalysisView, GoalFilter } from "./GoalAnalysisUI";
import { percentLabel, deadlineLabel } from "./goalAnalysisFormatters";
import { filterAnalysisGoals } from "./goalAnalysisFilters";
import useGoalAnalysis from "./goalAnalysisContext";

export default function ScoreConsisteDeadAnalysis() {
  const { data,goalFilter } = useGoalAnalysis(), a = data?.analysis,t = a?.totals;
  const rows = filterAnalysisGoals(a?.goals||[],goalFilter);
  const eligible = a?.goals.filter(row=>row.consistency!==null)||[];
  const highest = [...eligible].sort((a,b)=>b.consistency-a.consistency || a.id.localeCompare(b.id))[0];
  const deadlines = rows.map(row=>({...row,status:deadlineLabel(row),remaining:row.deadlineStatus==="Upcoming" ? row.deadlineDays : null,
    overdue:row.deadlineStatus==="Overdue" ? -row.deadlineDays : null}));
  const insights = !a ? [] : [
    {title:"Recorded Activity Consistency",value:percentLabel(t.consistency),description:t.activeDays+" distinct app-calendar dates with retained progress or milestone events out of "+t.eligibleDays+" elapsed dates having eligible goals. Future dates, pre-start dates, and activity after deletion are excluded. No event is not proof of no effort."},
    {title:"Most Recorded Activity Goal",value:highest ? highest.label+" · "+percentLabel(highest.consistency) : "No data",description:highest ? highest.activeDays+" dates with updates across "+highest.eligibleDays+" eligible calendar dates. Each goal has its own created/start/deletion bounds." : "No eligible goals in this period."},
    {title:"Month Activity Score",value:percentLabel(t.activityScore),description:t.activeGoals+" of "+t.goalCount+" eligible goals have a recorded update this month. This engagement percentage is distinct from progress, pace and daily consistency."},
    {title:"Checkpoint Progress/Pace Score",value:t.score===null ? "No data" : t.score+" / 100",description:a.scoreNote},
    {title:"Overdue Incomplete Goals",value:t.overdueGoals+" goals",description:"Deadline is before the goal's selected checkpoint, not before today's date for a past-month report. Completed and deleted goals are not overdue. Unknown completion or edited deadline history is not classified."},
    {title:"Goals Due on Checkpoint Day",value:t.dueTodayGoals+" goals",description:"A zero-day difference means due on that app-calendar date, not already overdue. Deadlines are date-based; no hourly cutoff is inferred."},
    {title:"Retained Progress Updates",value:t.progressUpdates+" updates",description:"Numeric audit entries and matching embedded progress events within one second are deduplicated. Decreases are genuine updates, not automatically missed days. Milestone completions and their automatic numeric updates can appear in both event categories; activity coverage counts their date once."},
  ];
  return <AnalysisView insights={insights}>{a && <>
    <GoalFilter/>
    <AnalysisChart title="Goal Activity Consistency" subtitle="Recorded active dates / each goal's eligible elapsed dates · not daily plan adherence" rows={rows}
      type="bar" max={100} series={[{key:"consistency",label:"Activity consistency",color:"#34d399",unit:"%"}]}/>
    <AnalysisChart title="Progress vs Linear Calendar Pace" subtitle="Checkpoint progress and date-based expected pace · a pacing reference, not a forecast" rows={rows}
      type="bar" max={100} series={[{key:"progress",label:"Known progress",color:"#38bdf8",unit:"%"},{key:"expected",label:"Linear calendar pace",color:"#fbbf24",unit:"%"}]}/>
    <AnalysisChart title="Deadline Analysis" subtitle="Positive blue days remaining; positive pink days overdue · exact signed dates in the table below"
      rows={deadlines} type="bar" integerTicks max={Math.max(1,...deadlines.flatMap(row=>[row.remaining||0,row.overdue||0]))}
      series={[{key:"remaining",label:"Days remaining",color:"#38bdf8",unit:"days"},{key:"overdue",label:"Days overdue",color:"#fb7185",unit:"days"}]}/>
    <section className="rounded-2xl border border-white/10 p-4">
      <h4 className="font-semibold text-stone-100">Deadline Checkpoints</h4>
      <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-xs text-stone-300">
        <thead><tr>{["Goal","Deadline","Checkpoint","Status","Signed days"].map(label=><th key={label} className="p-2">{label}</th>)}</tr></thead>
        <tbody>{rows.map(row=><tr key={row.id} className="border-t border-white/10"><td className="p-2">{row.label}</td>
          <td className="p-2">{row.deadlineDay||"No known deadline"}</td><td className="p-2">{row.asOf}</td><td className="p-2">{row.deadlineStatus}</td>
          <td className="p-2">{row.deadlineDays===null ? "No data" : row.deadlineDays}</td></tr>)}</tbody>
      </table></div>
    </section>
    <p className="rounded-xl border border-amber-200/20 p-4 text-xs leading-5 text-amber-100">{a.scoreNote}</p>
    <AnalysisChart title="Month-block Goal Scores" subtitle="Includes the final partial block · activity engagement and checkpoint progress/pace have different formulas"
      rows={a.weeks} type="bar" max={100} series={[{key:"activityScore",label:"Goal engagement",color:"#34d399",unit:"%"},{key:"score",label:"Progress/pace score",color:"#fbbf24",unit:"/100"}]}/>
  </>}</AnalysisView>;
}
