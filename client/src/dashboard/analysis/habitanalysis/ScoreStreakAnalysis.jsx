import { AnalysisChart } from "../journalanalysis/AnalysisUI";
import { AnalysisView } from "./HabitAnalysisUI";
import useHabitAnalysis from "./habitAnalysisContext";

export default function ScoreStreakAnalysis() {
  const { data } = useHabitAnalysis();
  const analysis = data?.analysis, totals = analysis?.totals;
  const score = value => value === null || value === undefined ? "No data" : `${value}/100`;
  const insights = !analysis ? [] : [
    { title:"Monthly Habit Activity Score",value:score(totals.score),description:"Same product formula and rounding as Habit Weekly Report: 70% check-in completion rate + 30% active-day consistency. This is not a personal or clinical assessment." },
    { title:"Scheduled-day Consistency",value:totals.consistency===null?"No data":`${totals.consistency}%`,description:`${totals.activeDays} days with at least one completed habit out of ${totals.scheduledDays} days with scheduled habits. This is different from completing every habit.` },
    { title:"Full-completion Days",value:totals.total?String(analysis.fullCompletionDays):"No data",description:"Days with at least one scheduled habit and every expected check-in completed. Empty/future days do not qualify. This does not claim to match the cross-module navbar Monk Streak." },
    { title:"Longest Habit Occurrence Streak",value:totals.total?`${analysis.longestHabitStreak} check-ins`:"No data",description:"Largest within-month run for one habit over consecutive scheduled occurrences. Unscheduled days are skipped; a missed scheduled occurrence breaks the run. Pending today does not break it." },
    { title:"Habit Streak Breaks",value:totals.total?String(analysis.habitStreakBreaks):"No data",description:"Run-ending transitions for individual habits, not every missed check-in. A habit with no prior completed run cannot have a streak break." },
    { title:"Most Common Broken Run Length",value:analysis.commonBreak?`${analysis.commonBreak.length} check-ins · ${analysis.commonBreak.count} breaks`:"No completed run ended",description:"Frequency of completed scheduled-occurrence run lengths immediately before a miss; calculated only within this selected month." },
    { title:"Habits Without Past Misses",value:totals.total?String(analysis.maintainedHabits):"No data",description:`${analysis.maintainedHabits} habits have no missed scheduled check-ins in this month; ${analysis.missedHabits} have at least one miss. Pending today is not proof of completion or a maintained lifetime streak.` },
    { title:"Longest Full-completion Calendar Run",value:totals.total?`${analysis.longestFullCompletionStreak} days`:"No data",description:"Consecutive calendar days with all scheduled habits completed. Past partial/no-habit days break this separate calendar run; unfinished today and future days do not." },
    { title:"Current Month-local Full-completion Run",value:totals.total?`${analysis.currentFullCompletionRun} days`:"No data",description:"Only a selected month containing the current app date can have a current run. Old-month and ended/deleted individual-habit runs are not current; cross-month or lifetime carry is not inferred." },
    { title:"Average Month-block Score",value:score(analysis.averageBlockScore),description:"Mean of blocks with scheduled check-ins: days 1–7, 8–14, 15–21, 22–28 and remaining days. These are not calendar weeks; today's result is provisional." },
  ];
  return <AnalysisView insights={insights}>
    {analysis && <>
      <AnalysisChart title="Weekday Habit Consistency & Completion" subtitle="Active/scheduled days versus completed/expected check-ins" rows={analysis.weekdays}
        series={[{key:"consistency",label:"Active-day consistency",color:"#a855f7",unit:"%"},{key:"completionRate",label:"Check-in completion",color:"#34d399",unit:"%"}]} type="bar" />
      <AnalysisChart title="Month-block Habit Activity Score" subtitle="Weekly product formula · final partial block included"
        rows={analysis.weeks.map(row=>({...row,label:row.label+" · "+Number(row.from.slice(-2))+"–"+Number(row.to.slice(-2))}))}
        series={[{key:"score",label:"Activity score",color:"#fbbf24",unit:"/100"}]} type="bar" />
      <AnalysisChart title="Full-completion Calendar Streak" subtitle="Separate from per-habit scheduled-occurrence streaks · pink zero points mark inactive days"
        rows={analysis.days.map(row=>({...row,streak:row.fullStreak}))} series={[{key:"streak",label:"Full-completion streak",color:"#38bdf8",unit:" days"}]}
        integerTicks max={Math.max(1,analysis.longestFullCompletionStreak)} />
      <AnalysisChart title="Individual Habit Occurrence Streaks" subtitle="Scheduled check-ins, not calendar days · old or ended runs are not current" rows={analysis.habits}
        series={[{key:"longestStreak",label:"Longest in month",color:"#fbbf24",unit:" check-ins"},{key:"currentRun",label:"Current month-local run",color:"#34d399",unit:" check-ins"}]}
        type="bar" integerTicks max={Math.max(1,analysis.longestHabitStreak)} />
    </>}
  </AnalysisView>;
}
