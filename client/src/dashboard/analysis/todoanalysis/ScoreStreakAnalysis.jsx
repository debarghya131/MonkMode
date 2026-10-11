import { AnalysisChart } from "../journalanalysis/AnalysisUI";
import { AnalysisView } from "./TodoAnalysisUI";
import useTodoAnalysis from "./todoAnalysisContext";

const percent = value => value === null || value === undefined ? "No data" : `${value}%`;
export default function ScoreStreakAnalysis() {
  const { data } = useTodoAnalysis();
  const analysis = data?.analysis, totals = analysis?.totals;
  const insights = !analysis ? [] : [
    { title: "Monthly Activity Score", value: totals.score === null ? "No data" : `${totals.score}/100`,
      description: "Same formula as ToDo Weekly Report: 70% task completion rate + 30% active-day consistency. It is a product metric, not a personal or health rating." },
    { title: "Scheduled-day Consistency", value: percent(totals.consistency),
      description: `${totals.activeDays} days with at least one completion out of ${totals.scheduledDays} days with scheduled occurrences. Days without tasks and future dates do not enter this denominator.` },
    { title: "Task Completion Rate", value: percent(totals.completionRate),
      description: `${totals.completed} completed of ${totals.total} occurrences. Pending tasks are included in the scheduled denominator but are not called missed. The current month is provisional.` },
    { title: "Longest ToDo Activity Streak", value: totals.total ? `${analysis.longestStreak} days` : "No data",
      description: "Consecutive calendar days with at least one completed task, within the selected month. A past day with no completion breaks the run, including days without scheduled tasks. This is not the cross-module Monk Streak." },
    { title: "Activity Streak Breaks", value: totals.total ? String(analysis.streakBreaks) : "No data",
      description: "Counts transitions from an active run to a past day without any completion, not every inactive day. Unfinished today and future dates do not break a run." },
    { title: "Current Month-local Activity Run", value: totals.total ? `${analysis.currentStreak} days` : "No data",
      description: "Only a selected month containing the current app date can have a current run. A completed run from an old month is not a current streak; cross-month carry is not claimed." },
    { title: "Average Month-block Score", value: analysis.averageBlockScore === null ? "No data" : `${analysis.averageBlockScore}/100`,
      description: "Arithmetic mean of blocks with scheduled occurrences: days 1–7, 8–14, 15–21, 22–28, and remaining days. Includes the final partial block; these are not calendar weeks." },
  ];
  return <AnalysisView insights={insights}>
    {analysis && <>
      <AnalysisChart title="Weekday Consistency & Completion" subtitle="Different denominators · active/scheduled days versus completed/total tasks" rows={analysis.weekdays}
        series={[{key:"consistency",label:"Active-day consistency",color:"#a855f7",unit:"%"},{key:"completionRate",label:"Task completion",color:"#34d399",unit:"%"}]} type="bar" />
      <AnalysisChart title="Month-block Activity Score" subtitle="70% task completion + 30% active-day consistency · blocks are not calendar weeks"
        rows={analysis.weeks.map(row=>({...row,label:row.label+" · "+Number(row.from.slice(-2))+"–"+Number(row.to.slice(-2))}))}
        series={[{key:"score",label:"Activity score",color:"#fbbf24",unit:"/100"}]} type="bar" />
      <AnalysisChart title="Daily Completion Rate" subtitle="Zero means scheduled tasks with no completion · no tasks and future days have no rate" rows={analysis.days}
        series={[{key:"completionRate",label:"Task completion",color:"#34d399",unit:"%"}]} type="bar" />
      <AnalysisChart title="ToDo Activity Streak" subtitle="Month-local consecutive calendar days with completed activity · pink zero points mark inactive days" rows={analysis.days}
        series={[{key:"streak",label:"Activity streak",color:"#38bdf8",unit:" days"}]} integerTicks max={Math.max(1,analysis.longestStreak)} />
    </>}
  </AnalysisView>;
}
