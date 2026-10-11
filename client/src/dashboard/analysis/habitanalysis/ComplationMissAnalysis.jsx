import { AnalysisChart } from "../journalanalysis/AnalysisUI";
import { AnalysisView } from "./HabitAnalysisUI";
import useHabitAnalysis from "./habitAnalysisContext";

const percent = value => value === null || value === undefined ? "No data" : `${value}%`;
const outcomes = [
  { key: "completionRate", label: "Completed", color: "#34d399", unit: "%" },
  { key: "missedRate", label: "Missed", color: "#fb7185", unit: "%" },
  { key: "pendingRate", label: "Pending", color: "#fbbf24", unit: "%" },
];
export default function ComplationMissAnalysis() {
  const { data } = useHabitAnalysis();
  const analysis = data?.analysis, totals = analysis?.totals;
  const mostCompleted = analysis?.habits.slice().sort((a,b) => b.completionRate - a.completionRate)[0];
  const mostMissed = analysis?.habits.filter(row => row.missed > 0).sort((a,b) => b.missedRate - a.missedRate)[0];
  const insights = !analysis ? [] : [
    { title: "Completed Habit Check-ins", value: `${totals.completed} · ${percent(totals.completionRate)}`,
      description: `${totals.completed} of ${totals.total} scheduled habit occurrences were completed. Each habit is counted by its ID, so duplicate names never merge.` },
    { title: "Missed Habit Check-ins", value: `${totals.missed} · ${percent(totals.missedRate)}`,
      description: "Only unfinished past scheduled occurrences count as missed. Future dates and days when a habit was not scheduled are excluded." },
    { title: "Pending Habit Check-ins", value: `${totals.pending} · ${percent(totals.pendingRate)}`,
      description: "Today's unfinished habits stay pending until the app day ends. Habit reminder times are not deadlines; passing a reminder does not make a habit missed." },
    { title: "Highest Completion Habit", value: mostCompleted ? `${mostCompleted.label} · ${mostCompleted.completionRate}%` : "No data",
      description: mostCompleted ? `${mostCompleted.completed} of ${mostCompleted.total} scheduled occurrences completed. Same-name habits have separate numbered labels.` : "No retained habit occurrences in this period." },
    { title: "Highest Missed Rate Habit", value: mostMissed ? `${mostMissed.label} · ${mostMissed.missedRate}%` : totals.total ? "No missed occurrences" : "No data",
      description: mostMissed ? `${mostMissed.missed} of ${mostMissed.total} occurrences missed. Pending is separate, not a missed outcome.` : "No missed occurrence is recorded in this period." },
    { title: "Highest Completion Weekday", value: analysis.highestWeekday ? `${analysis.highestWeekday.label} · ${analysis.highestWeekday.completionRate}%` : "No data",
      description: analysis.highestWeekday ? `${analysis.highestWeekday.completed} of ${analysis.highestWeekday.total} check-ins completed. This rate is occurrence-weighted, not an average of daily percentages.` : "No scheduled weekdays in this period." },
  ];
  return <AnalysisView insights={insights}>
    {analysis && <>
      <AnalysisChart title="Completion, Missed & Pending by Weekday" subtitle="All scheduled check-ins in the selected month · occurrence-weighted rates" rows={analysis.weekdays} series={outcomes} type="bar" />
      <AnalysisChart title="Habit-wise Completion & Miss Analysis" subtitle="Separate habit IDs · numbered labels distinguish duplicate names" rows={analysis.habits} series={outcomes} type="bar" />
      <AnalysisChart title="Daily Habit Outcomes" subtitle="Complete calendar month · today's unfinished check-ins remain pending"
        rows={analysis.days.map(row => ({...row,completed:row.future?null:row.completed,missed:row.future?null:row.missed,pending:row.future?null:row.pending}))}
        series={[{key:"completed",label:"Completed",color:"#34d399"},{key:"missed",label:"Missed",color:"#fb7185"},{key:"pending",label:"Pending",color:"#fbbf24"}]}
        type="bar" integerTicks max={Math.max(1,...analysis.days.map(row=>row.total))} />
    </>}
  </AnalysisView>;
}
