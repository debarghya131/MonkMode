import { AnalysisChart } from "../journalanalysis/AnalysisUI";
import { AnalysisView } from "./TodoAnalysisUI";
import useTodoAnalysis from "./todoAnalysisContext";

const outcomes = [
  { key: "completed", label: "Completed", color: "#34d399" },
  { key: "missed", label: "Missed", color: "#fb7185" },
  { key: "pending", label: "Pending", color: "#fbbf24" },
];
export default function CategPrioAnalyProca() {
  const { data } = useTodoAnalysis();
  const analysis = data?.analysis, totals = analysis?.totals;
  const strong = analysis?.categories.slice().sort((a,b)=>b.completionRate-a.completionRate)[0];
  const missed = analysis?.categories.filter(row=>row.missed>0).sort((a,b)=>b.missedRate-a.missedRate)[0];
  const lateCategory = analysis?.categories.filter(row=>row.lateCompleted>0).sort((a,b)=>b.lateCompleted-a.lateCompleted)[0];
  const lateDay = analysis?.weekdays.filter(row=>row.lateCompleted>0).sort((a,b)=>b.lateCompleted-a.lateCompleted)[0];
  const insights = !analysis ? [] : [
    { title: "Highest Completion Category", value: strong ? `${strong.name} · ${strong.completionRate}%` : "No data",
      description: strong ? `${strong.completed} of ${strong.total} occurrences completed. Category rates are based on retained schedules and outcomes, not inferred importance.` : "No scheduled categories in this period." },
    { title: "Highest Missed Rate Category", value: missed ? `${missed.name} · ${missed.missedRate}%` : totals.total ? "No missed occurrences" : "No data",
      description: missed ? `${missed.missed} of ${missed.total} occurrences missed; pending tasks are not counted as missed.` : "No missed occurrence was recorded in this period." },
    { title: "Recorded Late Completions", value: totals.total ? `${totals.lateCompleted} · ${totals.lateRate === null ? "No timing rate" : totals.lateRate+"% of timing-known completions"}` : "No data",
      description: `${totals.timingKnown} of ${totals.completed} completed occurrences have usable lateness evidence. ${totals.completed-totals.timingKnown} have unknown timing; these are not assumed on time. Saved late flags stay completed, not missed.` },
    { title: "Most Recorded Late Category", value: lateCategory ? `${lateCategory.name} · ${lateCategory.lateCompleted} late` : totals.total ? "No late flags recorded" : "No data",
      description: "This is a count of retained late-completion flags, not a diagnosis of procrastination. Workload, rescheduling and missing history can also affect this signal." },
    { title: "Most Recorded Late Weekday", value: lateDay ? `${lateDay.label} · ${lateDay.lateCompleted} late` : totals.total ? "No late flags recorded" : "No data",
      description: "Grouped by the occurrence's scheduled date. A late completion may have been recorded on a different date; the stored clock does not establish an actual completion day." },
    { title: "Important Categories", value: analysis.categories.filter(row=>row.important).map(row=>row.name).join(", ") || "No occurrences",
      description: "Uses Health, Bill & Payment, and your custom starred categories. Stars indicate your preferences, not an AI assessment." },
  ];
  const max = rows => Math.max(1,...rows.map(row=>row.total));
  // Compact axis labels; tooltips, keyboard descriptions and tables retain
  // the full category name so long custom names cannot overlap the bars.
  const categoryRows = (analysis?.categories || []).map(row => ({ ...row,
    chartLabel: row.name.length > 20 ? `${row.name.slice(0,19).trimEnd()}…` : row.name,
  }));
  return <AnalysisView insights={insights}>
    {analysis && <>
      <AnalysisChart title="Category-wise Task Outcomes" subtitle="All retained categories · stars use your important-category preferences"
        rows={categoryRows.map(row=>({...row,label:row.name+(row.important?" ★":""),chartLabel:row.chartLabel+(row.important?" ★":"")}))} series={outcomes} type="bar" integerTicks max={max(analysis.categories)} />
      <AnalysisChart title="Priority-wise Task Outcomes" subtitle="High, Medium & Low · pending stays separate from missed" rows={analysis.priorities} series={outcomes} type="bar" integerTicks max={max(analysis.priorities)} />
      <p className="rounded-xl border border-amber-200/20 bg-amber-500/5 p-4 text-sm leading-6 text-stone-300">Procrastination detection: recorded late completion is a possible signal, not proof of intent or cause. Missing timing is unknown, not on time. These charts do not measure work duration.</p>
      <AnalysisChart title="Recorded Late Completions by Category" subtitle="Counts of saved late flags · unknown timing excluded" rows={categoryRows} series={[{key:"lateCompleted",label:"Recorded late completions",color:"#fb923c"}]} type="bar" integerTicks max={Math.max(1,...analysis.categories.map(row=>row.lateCompleted))} />
      <AnalysisChart title="Recorded Late Completions by Weekday" subtitle="Scheduled weekday, not actual completion weekday" rows={analysis.weekdays} series={[{key:"lateCompleted",label:"Recorded late completions",color:"#fb923c"}]} type="bar" integerTicks max={Math.max(1,...analysis.weekdays.map(row=>row.lateCompleted))} />
    </>}
  </AnalysisView>;
}
