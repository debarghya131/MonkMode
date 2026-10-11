import { AnalysisChart } from "../journalanalysis/AnalysisUI";
import { AnalysisView } from "./TodoAnalysisUI";
import useTodoAnalysis from "./todoAnalysisContext";

const percent = value => value === null || value === undefined ? "No data" : `${value}%`;
const outcomeSeries = [
  { key: "completionRate", label: "Completed", color: "#34d399", unit: "%" },
  { key: "missedRate", label: "Missed", color: "#fb7185", unit: "%" },
  { key: "pendingRate", label: "Pending", color: "#fbbf24", unit: "%" },
];
export default function CompleteMissTime() {
  const { data } = useTodoAnalysis();
  const analysis = data?.analysis, totals = analysis?.totals;
  const bestTime = analysis?.timeSlots.filter(row => row.total > 0 && row.start !== undefined).sort((a, b) => b.completionRate - a.completionRate)[0];
  const insights = !analysis ? [] : [
    { title: "Completed Task Occurrences", value: `${totals.completed} · ${percent(totals.completionRate)}`,
      description: `${totals.completed} completed out of ${totals.total} scheduled occurrences through the app date. A recurring task counts once per scheduled day.` },
    { title: "Missed Task Occurrences", value: `${totals.missed} · ${percent(totals.missedRate)}`,
      description: "Only overdue or saved missed outcomes count as missed. Today's unfinished tasks whose scheduled time has not passed remain pending." },
    { title: "Pending Task Occurrences", value: `${totals.pending} · ${percent(totals.pendingRate)}`,
      description: "Pending is separate from missed. Future dates are excluded from all totals and rates." },
    { title: "Highest Completion Weekday", value: analysis.highestWeekday ? `${analysis.highestWeekday.label} · ${percent(analysis.highestWeekday.completionRate)}` : "No data",
      description: analysis.highestWeekday ? `${analysis.highestWeekday.completed} of ${analysis.highestWeekday.total} occurrences completed. This is a task-weighted rate, not a mean of daily percentages.` : "No scheduled occurrences in this period." },
    { title: "Lowest Completion Weekday", value: analysis.lowestWeekday ? `${analysis.lowestWeekday.label} · ${percent(analysis.lowestWeekday.completionRate)}` : "No data",
      description: analysis.lowestWeekday ? `${analysis.lowestWeekday.completed} of ${analysis.lowestWeekday.total} occurrences completed. Zero-completion weekdays are included; unscheduled weekdays are excluded.` : "No scheduled occurrences in this period." },
    { title: "Highest Completion Time Slot", value: bestTime ? `${bestTime.label} · ${percent(bestTime.completionRate)}` : "No data",
      description: bestTime ? `${bestTime.completed} of ${bestTime.total} occurrences completed. Grouping uses scheduled task time, not when work actually happened or how long it took.` : "No retained scheduled-time data." },
  ];
  return <AnalysisView insights={insights}>
    {analysis && <>
      <AnalysisChart title="Completion, Missed & Pending by Weekday" subtitle="Whole selected month · task-weighted outcome rates" rows={analysis.weekdays} series={outcomeSeries} type="bar" />
      <AnalysisChart title="Scheduled Time Analysis" subtitle="Scheduled time, not actual completion time · early morning and unspecified times included" rows={analysis.timeSlots} series={outcomeSeries} type="bar" />
      <AnalysisChart title="Daily Task Outcomes" subtitle="Full calendar month · future days excluded from totals" rows={analysis.days.map(row => ({ ...row, completed: row.future ? null : row.completed, missed: row.future ? null : row.missed, pending: row.future ? null : row.pending }))}
        series={[{key:"completed",label:"Completed",color:"#34d399"},{key:"missed",label:"Missed",color:"#fb7185"},{key:"pending",label:"Pending",color:"#fbbf24"}]} type="bar" integerTicks max={Math.max(1,...analysis.days.map(row=>row.total))} />
    </>}
  </AnalysisView>;
}
