import { useId, useState } from "react";
import DashboardSelect from "../../../components/DashboardSelect";
import littleMonkLogo from "../../../assets/littlemonklogo.webp";
import useJournalAnalysis from "./journalAnalysisContext";

import { dayLabel } from "./analysisFormatters";
const months = Array.from({ length: 12 }, (_, index) => ({ value: String(index + 1).padStart(2,"0"), label: new Date(Date.UTC(2026,index,1)).toLocaleDateString("en", { month: "long", timeZone: "UTC" }) }));

export function AnalysisView({ children, insights, distribution }) {
  const { data, error, loading, retry, period, setPeriod, today, isDemoMode } = useJournalAnalysis();
  const currentYear = Number(today.slice(0, 4));
  const oldest = Math.min(currentYear - 3, Number(data?.joinedDay?.slice(0,4)) || currentYear, Number(period.year));
  const years = Array.from({ length: Math.min(100, currentYear-oldest+1) },(_,index)=>String(currentYear-index));
  const changeYear = year => setPeriod({ year, month: year === today.slice(0,4) && period.month > today.slice(5,7) ? today.slice(5,7) : period.month });
  return <section className="journal-analysis-section space-y-4">
    <div className="journal-analysis-filters flex flex-wrap gap-2">
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
    </div>
    {loading ? <div role="status" className="rounded-2xl border border-white/10 p-8 text-stone-300">Loading Journal Analysis…</div>
      : error ? <div className="rounded-2xl border border-red-400/20 p-6 text-red-200"><p role="alert">{error}</p><button type="button" onClick={retry} className="mt-3 rounded-lg border px-3 py-2">Retry analysis</button></div>
      : data && <div className="journal-analysis-layout flex min-h-0 flex-col gap-4 lg:flex-row">
        <div className="journal-analysis-chart-column journal-scroll min-w-0 flex-1 overflow-y-auto rounded-[2rem] border border-amber-100/10 bg-white/[0.03]">
          <div className="space-y-6 p-4 sm:p-6">
            <p className="text-xs leading-5 text-stone-400">{isDemoMode ? "Demo sample · " : ""}{period.year}-{period.month} · {data.timezone} · {data.analysis.loggedDays} logged days. {data.dataNote}</p>
            {!data.entries.length && <p role="status" className="rounded-xl border border-amber-200/20 bg-amber-500/10 p-4 text-sm text-amber-100">No journal entries in this period. Missing logs are not zero scores or proof of how a day felt.</p>}
            {children}
          </div>
        </div>
        <div className={`journal-analysis-side-column ${distribution ? "journal-analysis-mood-side" : ""} journal-scroll flex w-full shrink-0 flex-col gap-4 lg:max-w-[360px]`}>
          <InsightRail insights={insights} />
          {distribution}
        </div>
      </div>}
  </section>;
}

export function InsightRail({ insights }) {
  const [expanded, setExpanded] = useState(null);
  const id = useId();
  return <aside className="rounded-2xl border border-amber-100/10 bg-white/[0.03] p-5">
    <div className="mb-5 flex items-center gap-3"><img src={littleMonkLogo} alt="" className="h-14 w-14 object-contain"/><div><h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-200">Little Monk’s Summary</h3><p className="mt-1 text-[10px] uppercase tracking-widest text-stone-400">Calculated insights · Not AI-generated</p></div></div>
    <div className="space-y-3">{insights.map((insight,index)=><div key={insight.title} className="rounded-xl border border-white/10 bg-black/20 p-3">
      <div className="journal-analysis-insight-row flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-semibold text-amber-200">{insight.title}</p><p className="mt-1 break-words text-sm font-semibold text-stone-200 [overflow-wrap:anywhere]">{insight.value}</p></div>
        <button type="button" aria-label={`${expanded===index ? "Hide" : "View"} ${insight.title}`} aria-expanded={expanded===index} aria-controls={`${id}-${index}`} onClick={()=>setExpanded(expanded===index ? null : index)} className="shrink-0 rounded-full border border-amber-300/20 px-3 py-1 text-xs text-amber-200">{expanded===index ? "Hide" : "View"}</button>
      </div>
      <p id={`${id}-${index}`} hidden={expanded!==index} className="mt-3 border-t border-white/10 pt-3 text-xs leading-5 text-stone-300">{insight.description}</p>
    </div>)}</div>
  </aside>;
}

const readValue = (value, unit = "") => value === null || value === undefined ? "No data" : `${Math.round(value*10)/10}${unit}`;
export function AnalysisChart({ title, subtitle, rows, series, type="line", max=100, rightAxis=false, colorByRow=false, integerTicks=false }) {
  const [selected, setSelected] = useState(null);
  const row = rows[selected];
  const width = Math.max(660, rows.length * (rows.some(item => !item.date && String(item.label).length > 3) ? 95 : 20)), left=48, right=rightAxis?55:20, top=30, bottom=70, height=290;
  const plotWidth=width-left-right, plotHeight=height-top-bottom, step=plotWidth/Math.max(rows.length,1);
  const tickStep = integerTicks ? Math.max(1, Math.ceil(max / 5)) : max / 5;
  const ticks = Array.from({ length: Math.floor(max / tickStep) + 1 }, (_, index) => index * tickStep);
  const x = index=>left+step*(index+0.5);
  const y = (value,limit)=>top+plotHeight*(1-Math.min(limit,Math.max(0,value))/limit);
  const formatRow = item=>`${item.date ? dayLabel(item.date) : item.label}${item.status ? ` · ${item.status}` : ""}${item.mood ? ` · ${item.mood}` : ""}: ${series.map(line=>`${line.label} ${readValue(item[line.key],line.unit)}`).join("; ")}`;
  return <section className="rounded-[1.8rem] border border-white/10 bg-white/[0.025] p-4 sm:p-5">
    <p className="text-[10px] uppercase tracking-[0.24em] text-stone-400">{subtitle}</p><h4 className="mt-2 text-lg font-bold text-amber-50">{title}</h4>
    <div className="mt-3 flex flex-wrap gap-4 text-xs text-stone-300">{series.map(line=><span key={line.key} className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{background:line.color}}/>{line.label}{line.unit ? ` (${line.unit})` : ""}</span>)}</div>
    {rightAxis && <p className="mt-2 text-xs text-stone-400">Left axis: sleep hours · Right axis: self-reported scores /100. Different units are not directly comparable.</p>}
    <p role="status" className="mt-3 min-h-10 text-xs leading-5 text-stone-300">{row ? formatRow(row) : "Hover, tap or focus a day for exact values. Gaps indicate unknown values, not zero."}</p>
    <div className="overflow-x-auto rounded-xl" tabIndex={0} aria-label={`${title} chart; scroll horizontally if needed`}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ minWidth: width }} className="w-full max-w-none" role="group" aria-label={title}>
        {ticks.map((value,index)=>{
          const position=y(value,max);
          return <g key={index}><line x1={left} x2={width-right} y1={position} y2={position} stroke="#a8a29e" strokeOpacity="0.25" strokeDasharray="3 4"/><text x={left-10} y={position+4} textAnchor="end" fontSize="11" fill="#a8a29e">{Math.round(value*10)/10}</text>{rightAxis && <text x={width-right+10} y={position+4} fontSize="11" fill="#a8a29e">{index*20}</text>}</g>;
        })}
        {series.map((line,seriesIndex)=>{
          const limit=line.max || max;
          if(type==="bar") return <g key={line.key}>{rows.map((item,index)=>{
            const value=item[line.key]; if(value===null || value===undefined)return null;
            const barWidth=Math.min(30,step*0.72/series.length), position=y(value,limit);
            return <rect key={index} x={x(index)+(seriesIndex-series.length/2)*barWidth} y={position} width={barWidth-2} height={Math.max(0,top+plotHeight-position)} rx="5" fill={colorByRow ? item.color || line.color : line.color} opacity="0.85"/>;
          })}</g>;
          let path="", previous=false;
          rows.forEach((item,index)=>{const value=item[line.key];if(value===null || value===undefined){previous=false;return;}path+=`${previous?" L":" M"}${x(index)},${y(value,limit)}`;previous=true;});
          return <g key={line.key}><path d={path} fill="none" stroke={line.color} strokeWidth="2.5"/>{rows.map((item,index)=>item[line.key]===null || item[line.key]===undefined ? null : <circle key={index} cx={x(index)} cy={y(item[line.key],limit)} r="3.5" fill="#1c1512" stroke={line.key === "streak" && item.streak === 0 ? "#fb7185" : line.color} strokeWidth="2"/>)}</g>;
        })}
        {rows.map((item,index)=><g key={item.date || item.label || index}>
          <text x={x(index)} y={height-bottom+22} textAnchor="middle" fontSize="11" fill="#d6d3d1">{item.chartLabel || item.label}</text>
          {item.mood && <text x={x(index)} y={height-bottom+42} textAnchor="middle" fontSize="11" fill={item.color || "#d6d3d1"}>{item.emoji || ""}</text>}
          <rect x={left+index*step} y={top} width={step} height={plotHeight} fill="transparent" tabIndex={0} role="button" aria-label={formatRow(item)}
            onPointerEnter={()=>setSelected(index)} onPointerLeave={()=>setSelected(null)} onFocus={()=>setSelected(index)} onBlur={()=>setSelected(null)} onClick={()=>setSelected(index)} onKeyDown={event=>{if(event.key==="Enter" || event.key===" "){event.preventDefault();setSelected(index);}}} />
        </g>)}
      </svg>
    </div>
    <details className="mt-3 text-xs text-stone-300"><summary className="cursor-pointer rounded-lg py-2 text-amber-200">View data table: {title}</summary>
      <div className="overflow-x-auto"><table className="w-full text-left"><thead><tr><th className="p-2">Day / group</th>{series.map(line=><th key={line.key} className="p-2">{line.label}{line.unit ? ` (${line.unit})` : ""}</th>)}</tr></thead>
        <tbody>{rows.map((item,index)=><tr key={index} className="border-t border-white/10"><th className="p-2 font-normal">{item.date ? dayLabel(item.date) : item.label}{item.mood ? ` · ${item.mood}` : ""}{item.status ? ` · ${item.status}` : ""}</th>{series.map(line=><td key={line.key} className="p-2">{readValue(item[line.key],line.unit)}</td>)}</tr>)}</tbody>
      </table></div>
    </details>
  </section>;
}

export function MoodDistribution({ analysis }) {
  const total=analysis.moodLoggedDays;
  return <section className="rounded-[1.8rem] border border-white/10 bg-white/[0.025] p-5">
    <p className="text-[10px] uppercase tracking-[0.24em] text-stone-400">Distribution</p><h4 className="mt-2 text-lg font-bold text-amber-50">Mood Distribution</h4>
    <svg viewBox="0 0 220 220" className="mx-auto w-56 max-w-full" role="img" aria-label={`${total} journal days with recorded moods; ${analysis.moods.length} distinct moods`}>
      <circle cx="110" cy="110" r="68" fill="none" stroke="#292524" strokeWidth="28"/>
      {analysis.moods.map((mood,index)=>{const fraction=mood.count/total, old=analysis.moods.slice(0,index).reduce((sum,item)=>sum+item.count/total,0);return <circle key={mood.mood} cx="110" cy="110" r="68" fill="none" stroke={mood.color} strokeWidth="28" pathLength="1" strokeDasharray={`${fraction} ${1-fraction}`} strokeDashoffset={-old} transform="rotate(-90 110 110)"><title>{mood.mood}: {mood.count} days ({mood.percentage}%)</title></circle>;})}
      <text x="110" y="106" textAnchor="middle" fontSize="10" fill="#a8a29e">MOOD-LOGGED DAYS</text><text x="110" y="131" textAnchor="middle" fontSize="25" fill="#fafaf9">{total}</text>
    </svg>
    <ul className="space-y-2 text-xs text-stone-300">{analysis.moods.map(mood=><li key={mood.mood}>{mood.emoji} {mood.mood} · {mood.count} days · {mood.percentage}%</li>)}</ul>
    <p className="mt-3 text-xs text-stone-400">{analysis.moods.length} distinct moods · Unknown moods excluded.</p>
  </section>;
}
