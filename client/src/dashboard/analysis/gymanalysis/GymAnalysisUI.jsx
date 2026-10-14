import DashboardSelect from "../../../components/DashboardSelect";
import { AnalysisChart as SharedAnalysisChart, InsightRail } from "../journalanalysis/AnalysisUI";
import useGymAnalysis from "./gymAnalysisContext";
import { countLabel } from "./gymAnalysisFormatters";

const months = Array.from({ length: 12 }, (_, index) => ({ value: String(index + 1).padStart(2,"0"), label: new Date(Date.UTC(2026,index,1)).toLocaleDateString("en", { month: "long", timeZone: "UTC" }) }));

export function GymChart(props) {
  return <SharedAnalysisChart {...props} height={250} />;
}

export function GymPeriodFilters() {
  const { data, period, setPeriod, today } = useGymAnalysis();
  const currentYear = Number(today.slice(0, 4));
  const oldest = Math.min(currentYear - 3, Number(data?.joinedDay?.slice(0,4)) || currentYear, Number(period.year));
  const years = Array.from({ length: Math.min(100, currentYear-oldest+1) },(_,index)=>String(currentYear-index));
  const changeYear = year => setPeriod({ year, month: year === today.slice(0,4) && period.month > today.slice(5,7) ? today.slice(5,7) : period.month });
  return <div className="dashboard-period-controls gym-analysis-filters flex flex-wrap gap-2">
      <label className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm text-stone-300">Year
        <DashboardSelect aria-label="Analysis year" value={period.year} onChange={event=>changeYear(event.target.value)}>
          {years.map(year=><option key={year} value={year}>{year}</option>)}
        </DashboardSelect>
      </label>
      <label className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm text-stone-300">Month
        <DashboardSelect aria-label="Analysis month" value={period.month} onChange={event=>setPeriod({ ...period, month: event.target.value })}>
          {months.filter(month=>period.year !== today.slice(0,4) || month.value <= today.slice(5,7)).map(month=><option key={month.value} value={month.value}>{month.label}</option>)}
        </DashboardSelect>
      </label>
    </div>;
}

export function AnalysisView({ children, insights }) {
  const { data, error, loading, retry, period, isDemoMode } = useGymAnalysis();
  return <section className="gym-analysis-section space-y-4">
    {loading ? <div role="status" className="rounded-2xl border border-white/10 p-8 text-stone-300">Loading Gym Analysis…</div>
      : error ? <div className="rounded-2xl border border-red-400/20 p-6 text-red-200"><p role="alert">{error}</p><button type="button" onClick={retry} className="mt-3 rounded-lg border px-3 py-2">Retry analysis</button></div>
      : data && <div className="gym-analysis-layout flex min-h-0 flex-col gap-4 lg:flex-row">
        <div className="gym-analysis-chart-column journal-scroll min-w-0 flex-1 overflow-y-auto rounded-[2rem] border border-amber-100/10 bg-white/[0.03]">
          <div className="space-y-6 p-4 sm:p-6">
            <p className="gym-analysis-data-note text-xs leading-5 text-stone-400">{isDemoMode ? "Demo sample · " : ""}{period.year}-{period.month} · {data.timezone} · {countLabel(data.analysis.totals.exerciseLogs, "exercise log")}. <span className="analysis-secondary-instruction">{data.dataNote}</span></p>
            {!data.analysis.totals.exerciseLogs && <p role="status" className="rounded-xl border border-amber-200/20 bg-amber-500/10 p-4 text-sm text-amber-100">No retained exercise logs in this period. Measurements and current macro plans, if configured, remain available.</p>}
            {children}
          </div>
        </div>
        <div className="gym-analysis-side-column journal-scroll flex w-full shrink-0 flex-col gap-4 lg:max-w-[360px]">
          <InsightRail insights={insights} />
        </div>
      </div>}
  </section>;
}



export function MetricPicker({ label, value, onChange, options }) {
  return <label className="gym-analysis-metric-picker text-sm text-stone-300"><span>{label}</span>
    <DashboardSelect aria-label={label} value={value} onChange={event=>onChange(event.target.value)}>
      {options.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}
    </DashboardSelect>
  </label>;
}

