import { GoalChart as AnalysisChart, AnalysisView, GoalFilter } from "./GoalAnalysisUI";
import { percentLabel, countLabel } from "./goalAnalysisFormatters";
import { filterAnalysisGoals } from "./goalAnalysisFilters";
import useGoalAnalysis from "./goalAnalysisContext";

export default function GoalProgressAnalysis() {
  const { data,goalFilter } = useGoalAnalysis(), a = data?.analysis, t = a?.totals;
  const rows = filterAnalysisGoals(a?.goals||[],goalFilter), known = a?.goals.filter(row=>row.progress!==null)||[];
  const highest = [...known].sort((a,b)=>b.progress-a.progress || a.id.localeCompare(b.id))[0];
  const insights = !a ? [] : [
    {title:"Eligible Retained Goals",value:countLabel(t.goalCount,"goal"),description:"Goals created and started by the selected period's checkpoint, including "+t.deletedGoals+" retained deletions during this month. Deleted goals stop at their deletion date; earlier deletions and future starts are excluded."},
    {title:"Completed Goals at Checkpoint",value:countLabel(t.completedGoals,"goal"),description:"Completion requires all known milestones done, or the actual numeric value reaching its positive target. A rounded 100% alone does not complete a goal."},
    {title:"Average Known Progress",value:percentLabel(t.avgProgress),description:t.knownProgressGoals+" comparable goals have known progress; "+t.unknownProgressGoals+" unavailable snapshots are excluded. Each goal contributes equally; targets and milestone units are not summed."},
    {title:"Known Milestone State",value:t.completedMilestones+" / "+t.totalMilestones,description:"Completed / total milestones across "+t.knownMilestoneGoals+" milestone-based goals with reconstructable counts. Numeric goals are not treated as zero-milestone goals. Unknown milestone denominators are excluded."},
    {title:"Milestone Completion Check-ins",value:countLabel(t.milestoneCheckins,"check-in"),description:t.distinctMilestonesCompleted+" distinct milestones were completed at least once this month. Duplicate sources on the same day count once per milestone; recompletion on another day is another check-in. Reopened milestones remain historical activity, not currently completed milestones."},
    {title:"Late Latest Milestone Completions",value:t.lateMilestones+" late",description:"Compares retained completedAt with a usable unchanged milestone deadline by app-calendar day; the deadline day is on time. "+t.unknownMilestoneTimings+" completed milestone timings have missing or edited deadline history and are not classified."},
    {title:"Highest Known Progress",value:highest ? highest.label+" · "+percentLabel(highest.progress) : "No data",description:"A percentage comparison at the checkpoint, not proof of the fastest goal or greatest effort. Duplicate names are numbered by stable goal ID."},
  ];
  return <AnalysisView insights={insights}>{a && <>
    <GoalFilter/>
    <AnalysisChart title="Goal Progress Analysis" subtitle="Known checkpoint progress · milestone ratio or numeric value / target · unknown history is a gap"
      rows={rows.map(row=>({...row,status:row.deleted ? "deleted · "+row.asOf : row.isCompleted ? "completed" : row.progress===null ? "history unavailable" : "not completed"}))}
      type="bar" max={100} series={[{key:"progress",label:"Progress",color:"#38bdf8",unit:"%"}]}/>
    {!rows.length && <p role="status" className="text-sm text-stone-400">No eligible goals match this chart filter.</p>}
    <AnalysisChart title="Sub Goal Completion Analysis" subtitle="All eligible goals · cumulative recorded milestone check-ins this month, not net completed milestone state"
      rows={a.days} max={Math.max(1,t.milestoneCheckins)} integerTicks
      series={[{key:"cumulativeMilestoneCheckins",label:"Cumulative check-ins",color:"#34d399"}]}/>
    <section className="goal-analysis-detail-card rounded-2xl border border-white/10 p-4">
      <h4 className="font-semibold text-stone-100">Goal Snapshot Details</h4>
      <p className="mt-2 text-xs text-stone-400">Filtered goals · titles and definitions are retained metadata, not immutable historical snapshots.</p>
      <p className="mt-2 text-xs text-stone-400 lg:hidden">↔ Swipe or scroll the table to see all columns.</p>
      <div className="goal-analysis-detail-scroll mt-4 overflow-x-auto" tabIndex={0} role="region" aria-label="Goal snapshot details"><table className="w-full text-left text-xs text-stone-300">
        <thead><tr>{["Goal","Progress","Basis","Milestones","Checkpoint"].map(label=><th key={label} className="p-2">{label}</th>)}</tr></thead>
        <tbody>{rows.map(row=><tr key={row.id} className="border-t border-white/10">
          <td className="p-2">{row.label}<br/>{row.type} · {row.priority}</td><td className="p-2">{percentLabel(row.progress)}<br/>{row.deleted ? "Deleted" : row.isCompleted ? "Completed" : "Not completed"}</td>
          <td className="p-2">{row.progressBasis}</td><td className="p-2">{!row.milestoneBased ? "Numeric goal" : row.total===null || row.completed===null ? "History unavailable" : row.completed+" / "+row.total}</td>
          <td className="p-2">{row.asOf}</td>
        </tr>)}</tbody>
      </table></div>
    </section>
  </>}</AnalysisView>;
}
