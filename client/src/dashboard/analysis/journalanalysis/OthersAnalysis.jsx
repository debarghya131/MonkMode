import { useEffect, useMemo, useState } from "react";
import { motion as Motion } from "framer-motion";
import littleMonkLogo from "../../../assets/littlemonklogo.png";
import api from "../../../api/axios";
import useAuth from "../../../hooks/useAuth";

const MONTH_OPTIONS = [
  { value: "01", label: "January" }, { value: "02", label: "February" },
  { value: "03", label: "March" },   { value: "04", label: "April" },
  { value: "05", label: "May" },     { value: "06", label: "June" },
  { value: "07", label: "July" },    { value: "08", label: "August" },
  { value: "09", label: "September" },{ value: "10", label: "October" },
  { value: "11", label: "November" },{ value: "12", label: "December" },
];

const WEEKDAY_ORDER = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MISTAKE_POOL = [
  "Late start",
  "Skipped planning",
  "Context switching",
  "Over-committing",
  "Phone checking",
  "Delayed deep work",
  "Poor time blocking",
  "No evening review",
  "Multitasking",
];
const DISTRACTION_POOL = [
  "Instagram",
  "YouTube",
  "WhatsApp",
  "Email refresh",
  "Random browsing",
  "Notification checks",
  "Unplanned calls",
  "News feed",
  "Chat hopping",
];
const BAR_H = 190;
const LABEL_H = 56;
const CHART_HEADROOM = 16;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function average(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function round(value, precision = 1) {
  return Number(value.toFixed(precision));
}

function getDaysInMonth(year, month) {
  return new Date(Number(year), Number(month), 0).getDate();
}

function getTagSet(pool, daySeed, shift) {
  const first = pool[(daySeed + shift) % pool.length];
  const second = pool[(daySeed * 3 + shift + 2) % pool.length];
  const picks = daySeed % 4 === 0 ? [first, second] : [first];
  return [...new Set(picks)];
}

function generateMonthReflectionLogs(year, month, baseShift) {
  const days = getDaysInMonth(year, month);
  return Array.from({ length: days }, (_, index) => {
    const day = index + 1;
    const date = `${year}-${month}-${String(day).padStart(2, "0")}`;

    return {
      date,
      wins: clamp(2 + ((day * 2 + baseShift) % 5), 1, 6),
      mistakes: clamp(1 + ((day + baseShift) % 4), 0, 5),
      achievements: clamp(1 + ((day * 3 + baseShift) % 5), 1, 6),
      mistakeTags: getTagSet(MISTAKE_POOL, day, baseShift),
      distractionTags: getTagSet(DISTRACTION_POOL, day + 2, baseShift),
    };
  });
}

function generateMonthScoreLogs(year, month, seed, missedDays) {
  const days = getDaysInMonth(year, month);

  return Array.from({ length: days }, (_, index) => {
    const day = index + 1;
    const date = `${year}-${month}-${String(day).padStart(2, "0")}`;
    const weekdayIndex = new Date(`${date}T00:00:00`).getDay();
    const logged = !missedDays.includes(day);

    const base = 64 + ((day * 7 + seed * 5) % 30);
    const weekendBoost = weekdayIndex === 0 || weekdayIndex === 6 ? 2 : 0;
    const dip = day % 6 === 0 ? 3 : 0;
    const rating = logged ? clamp(base + weekendBoost - dip, 50, 96) : null;

    return {
      date,
      day,
      weekday: WEEKDAY_ORDER[weekdayIndex],
      logged,
      rating,
    };
  });
}

const NOW = new Date();
const YEARS = Array.from({ length: 4 }, (_, i) => String(NOW.getFullYear() - i));
const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const DEMO_SCORE_LOGS = [
  ...generateMonthScoreLogs("2026", "02", 1, [4, 9, 15, 23]),
  ...generateMonthScoreLogs("2026", "03", 3, [2, 11, 18, 24, 29]),
  ...generateMonthScoreLogs("2026", "04", 5, [6, 14, 21, 30]),
];
const DEMO_REFLECTION_LOGS = [
  ...generateMonthReflectionLogs("2026", "02", 1),
  ...generateMonthReflectionLogs("2026", "03", 3),
  ...generateMonthReflectionLogs("2026", "04", 5),
];

function buildLogsFromEntries(apiEntries, year, month, maxDay) {
  const entryMap = new Map(apiEntries.map(e => [e.date, e]));
  const daysInMonth = getDaysInMonth(year, String(month).padStart(2, "0"));
  const lastDay = maxDay != null ? Math.min(daysInMonth, maxDay) : daysInMonth;
  const y = String(year);
  const m = String(month).padStart(2, "0");
  const scoreLogs = [];
  const reflectionLogs = [];
  for (let d = 1; d <= lastDay; d++) {
    const date = `${y}-${m}-${String(d).padStart(2, "0")}`;
    const weekday = WEEKDAY_NAMES[new Date(`${date}T00:00:00`).getDay()];
    const entry = entryMap.get(date);
    scoreLogs.push({ date, day: d, weekday, logged: !!entry, rating: entry?.rating ?? null });
    reflectionLogs.push({
      date,
      wins:            entry?.wins            ?? 0,
      mistakes:        entry?.mistakes         ?? 0,
      achievements:    entry?.achievement      ?? 0,
      mistakeTags:     entry?.mistakeTags      ?? [],
      distractionTags: entry?.distractionTags  ?? [],
    });
  }
  return { scoreLogs, reflectionLogs };
}

function buildMonthlySeries(logs, year, month, key, maxDay) {
  const entryMap = new Map(logs.map((entry) => [Number(entry.date.slice(8, 10)), entry]));
  const daysInMonth = getDaysInMonth(year, month);
  const lastDay = maxDay != null ? Math.min(daysInMonth, maxDay) : daysInMonth;

  return Array.from({ length: lastDay }, (_, index) => {
    const day = index + 1;
    const item = entryMap.get(day);
    return {
      date: `${year}-${month}-${String(day).padStart(2, "0")}`,
      day,
      value: item?.[key] ?? 0,
    };
  });
}

function sumBy(logs, key) {
  return logs.reduce((total, entry) => total + (entry[key] ?? 0), 0);
}

function topRepeated(logs, key, limit = 5) {
  const counts = new Map();

  logs.forEach((entry) => {
    (entry[key] ?? []).forEach((label) => {
      counts.set(label, (counts.get(label) ?? 0) + 1);
    });
  });

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, count]) => ({ label, count }));
}

function toListSummary(items, emptyText) {
  if (!items.length) return emptyText;
  return items.map((item, index) => `${index + 1}. ${item.label} (${item.count})`).join("\n");
}

function buildWeeklyScoreSeries(logs) {
  return [1, 2, 3, 4].map((week) => {
    const startDay = (week - 1) * 7 + 1;
    const endDay = week * 7;
    const values = logs
      .filter((entry) => entry.day >= startDay && entry.day <= endDay && entry.logged)
      .map((entry) => entry.rating);

    return {
      label: `W${week}`,
      week,
      value: values.length ? round(average(values)) : 0,
    };
  });
}

function buildStreakSeries(logs, year, month, maxDay) {
  const daysInMonth = getDaysInMonth(year, month);
  const lastDay = maxDay != null ? Math.min(daysInMonth, maxDay) : daysInMonth;
  const entryMap = new Map(logs.map((entry) => [entry.day, entry]));
  const series = [{ day: 0, value: 0, logged: true, isStart: true }];
  let streak = 0;

  for (let day = 1; day <= lastDay; day += 1) {
    const entry = entryMap.get(day);
    const logged = Boolean(entry?.logged);
    streak = logged ? streak + 1 : 0;
    series.push({ day, value: streak, logged, isStart: false });
  }

  return series;
}

function buildMissedByWeekdaySeries(logs) {
  return WEEKDAY_ORDER.map((weekday) => ({
    label: weekday,
    value: logs.filter((entry) => !entry.logged && entry.weekday === weekday).length,
  }));
}

function countStreakBreaks(logs) {
  let breaks = 0;
  for (let index = 1; index < logs.length; index += 1) {
    if (logs[index - 1].logged && !logs[index].logged) breaks += 1;
  }
  return breaks;
}

function InsightRail({ insights }) {
  const [selectedInsight, setSelectedInsight] = useState(null);

  return (
    <aside className="flex h-full w-full flex-col overflow-hidden rounded-2xl border border-amber-100/10 bg-white/6 shadow-xl shadow-black/25 backdrop-blur">
      <div className="shrink-0 p-5 pb-4">
        <div className="flex items-center gap-3">
          <Motion.div
            className="relative grid h-16 w-16 place-items-center"
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
          >
            <Motion.span
              className="absolute inset-2 rounded-full bg-amber-400/15 blur-md"
              animate={{ opacity: [0.35, 0.8, 0.35], scale: [0.9, 1.12, 0.9] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
            />
            <Motion.img
              src={littleMonkLogo}
              alt="Little Monk AI Assistant"
              className="relative z-10 h-20 w-20 object-contain drop-shadow-[0_10px_18px_rgba(245,158,11,0.16)]"
              whileHover={{ scale: 1.08, rotate: -3 }}
              transition={{ type: "spring", stiffness: 260, damping: 14 }}
            />
          </Motion.div>
          <div>
            <h3 className="text-label-md">Little Monk's Analysis</h3>
            <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.14em] text-amber-300/70">
              AI Assistant
            </p>
          </div>
        </div>
      </div>

      <div className="journal-scroll min-h-0 flex-1 space-y-3 overflow-y-auto px-5 pb-5 pr-4">
        {insights.map((insight) => {
          const isSelected = selectedInsight === insight.title;
          return (
            <Motion.div
              key={insight.title}
              layout
              className={`rounded-xl border p-3 text-sm transition-colors ${
                isSelected
                  ? "border-sky-400/30 bg-sky-500/8"
                  : "border-sky-100/10 bg-stone-950/45 hover:border-sky-300/20"
              }`}
            >
              <div className="grid grid-cols-[1fr_auto] items-start gap-3">
                <div className="min-w-0">
                  <span className="text-xs font-semibold text-sky-200">{insight.title}</span>
                  <p className="text-sm font-semibold text-stone-200">{insight.value}</p>
                  {isSelected && (
                    <Motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-1.5 text-xs leading-relaxed text-stone-400"
                    >
                      {insight.description}
                    </Motion.p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedInsight(isSelected ? null : insight.title)}
                  className={`w-fit rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                    isSelected
                      ? "border-sky-400/40 bg-sky-400/15 text-sky-100"
                      : "border-sky-400/20 text-sky-200 hover:border-sky-300/45 hover:bg-sky-400/10"
                  }`}
                >
                  {isSelected ? "Hide" : "View"}
                </button>
              </div>
            </Motion.div>
          );
        })}
      </div>
    </aside>
  );
}

function VerticalBarGraph({ title, subtitle, series, yMax, ticks, theme, valueSuffix = "" }) {
  const [hovered, setHovered] = useState(null);
  const drawableBarH = BAR_H - CHART_HEADROOM;

  const yLabelBottom = (mark) => {
    if (mark === yMax) return drawableBarH - 2;
    if (mark === 0) return 0;
    return (mark / yMax) * drawableBarH - 7;
  };

  return (
    <section className="rounded-[1.75rem] border border-sky-100/10 bg-stone-950/30 p-5 shadow-xl shadow-black/20">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-stone-500">{subtitle}</p>
          <h4 className="mt-2 text-xl font-semibold text-sky-50">{title}</h4>
        </div>
        <span className="flex items-center gap-2 text-xs text-stone-400">
          <span className={`h-2.5 w-2.5 rounded-full ${theme.dot}`} />Daily count
        </span>
      </div>

      <div className="mt-6 flex gap-3">
        <div className="relative z-10 shrink-0 w-9 text-right text-[11px] font-semibold text-stone-300" style={{ height: BAR_H, marginBottom: LABEL_H }}>
          {ticks.map((tick) => (
            <span
              key={tick}
              className="absolute right-0 rounded bg-stone-950/55 px-0.5"
              style={{ bottom: `${yLabelBottom(tick)}px` }}
            >
              {tick}
            </span>
          ))}
        </div>

        <div className="relative flex-1">
          <div className="relative" style={{ height: BAR_H + LABEL_H }}>
            {ticks.map((tick) => (
              <div
                key={tick}
                className="absolute left-0 right-0 border-t border-dashed border-white/6"
                style={{ bottom: LABEL_H + (tick / yMax) * drawableBarH }}
              />
            ))}

            <div className="absolute inset-0 flex items-end gap-2" style={{ paddingBottom: `${LABEL_H}px` }}>
              {series.map((item, index) => (
                <div
                  key={`${item.label}-${index}`}
                  className="flex min-w-0 flex-1 flex-col items-center justify-end"
                  style={{ opacity: hovered !== null && hovered !== index ? 0.4 : 1, transition: "opacity 0.18s ease", cursor: "default" }}
                  onMouseEnter={() => setHovered(index)}
                  onMouseLeave={() => setHovered(null)}
                >
                  <span className={`mb-1 text-[10px] font-semibold ${theme.value}`}>
                    {item.value}
                    {valueSuffix}
                  </span>
                  <Motion.div
                    className={`w-full max-w-[42px] rounded-t-xl border ${theme.border} ${theme.fill}`}
                    initial={{ height: 0 }}
                    animate={{ height: Math.max(10, Math.round((item.value / yMax) * drawableBarH)) }}
                    transition={{ duration: 0.4, delay: index * 0.04 }}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="mt-1 flex items-center text-[10px] text-stone-500">
            {series.map((item, index) => (
              <span key={`x-${item.label}-${index}`} className="flex-1 text-center">
                {item.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function CombinedMonthlyLineGraph({ seriesGroups }) {
  const [hovered, setHovered] = useState(null);
  const baseSeries = seriesGroups[0]?.series ?? [];
  const maxValue = Math.max(6, ...seriesGroups.flatMap((group) => group.series.map((item) => item.value)));
  const marks = [0, 2, 4, 6].filter((mark) => mark <= maxValue);
  if (!marks.includes(maxValue)) marks.push(maxValue);

  const width = 900;
  const height = 228;
  const pad = { top: 26, right: 14, bottom: 24, left: 34 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;
  const xOf = (index) => pad.left + (baseSeries.length <= 1 ? chartW / 2 : (index / (baseSeries.length - 1)) * chartW);
  const yOf = (value) => pad.top + ((maxValue - value) / maxValue) * chartH;
  const buildPath = (series) =>
    series.map((item, index) => `${index === 0 ? "M" : "L"} ${xOf(index).toFixed(1)} ${yOf(item.value).toFixed(1)}`).join(" ");

  return (
    <section className="rounded-[1.75rem] border border-sky-100/10 bg-stone-950/30 p-5 shadow-xl shadow-black/20">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-stone-500">Monthly Reflection</p>
          <h4 className="mt-2 text-xl font-semibold text-sky-50">Wins, Mistakes & Achievements This Month</h4>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-xs text-stone-400">
          {seriesGroups.map((group) => (
            <span key={group.label} className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: group.stroke }} />
              {group.label}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-5 overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ minWidth: "640px" }}>
          {marks.map((mark) => (
            <g key={mark}>
              <line x1={pad.left} x2={width - pad.right} y1={yOf(mark)} y2={yOf(mark)} stroke="rgba(255,255,255,0.07)" strokeDasharray="4 5" />
              <text x={pad.left - 8} y={yOf(mark) + 4} textAnchor="end" fontSize="10" fill="rgba(168,162,158,0.7)">
                {mark}
              </text>
            </g>
          ))}

          {seriesGroups.map((group, groupIndex) => (
            <g key={group.label}>
              <Motion.path
                d={buildPath(group.series)}
                fill="none"
                stroke={group.stroke}
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 1.2, delay: groupIndex * 0.12, ease: "easeInOut" }}
              />
              {group.series.map((item, index) => (
                <Motion.circle
                  key={`${group.label}-${item.date}`}
                  cx={xOf(index)}
                  cy={yOf(item.value)}
                  r={hovered === index ? 5 : 3}
                  fill={hovered === index ? group.stroke : "#0c0a09"}
                  stroke={group.stroke}
                  strokeWidth="1.6"
                  animate={{ opacity: hovered !== null && hovered !== index ? 0.42 : 1 }}
                />
              ))}
            </g>
          ))}

          {hovered !== null && baseSeries[hovered] && (
            <g pointerEvents="none">
              <line x1={xOf(hovered)} x2={xOf(hovered)} y1={pad.top} y2={height - pad.bottom} stroke="rgba(255,255,255,0.18)" strokeDasharray="4 4" />
              <rect x={Math.min(Math.max(xOf(hovered) - 58, pad.left), width - pad.right - 116)} y={pad.top + 4} width="116" height="62" rx="8" fill="rgba(15,15,15,0.94)" stroke="rgba(255,255,255,0.16)" />
              <text x={Math.min(Math.max(xOf(hovered), pad.left + 58), width - pad.right - 58)} y={pad.top + 20} textAnchor="middle" fontSize="10" fontWeight="700" fill="#e7e5e4">
                Day {baseSeries[hovered].day}
              </text>
              {seriesGroups.map((group, index) => (
                <text key={group.label} x={Math.min(Math.max(xOf(hovered), pad.left + 58), width - pad.right - 58)} y={pad.top + 36 + index * 12} textAnchor="middle" fontSize="10" fontWeight="700" fill={group.stroke}>
                  {group.label}: {group.series[hovered]?.value ?? 0}
                </text>
              ))}
            </g>
          )}

          {baseSeries.map((item, index) => {
            const hitW = baseSeries.length > 1 ? chartW / (baseSeries.length - 1) : chartW;
            return (
              <rect
                key={item.date}
                x={Math.max(pad.left, xOf(index) - hitW / 2)}
                y={pad.top}
                width={hitW}
                height={chartH}
                fill="transparent"
                onMouseEnter={() => setHovered(index)}
                onMouseLeave={() => setHovered(null)}
              />
            );
          })}

          {baseSeries.map((item, index) =>
            index % 3 === 0 || index === baseSeries.length - 1 ? (
              <text key={`label-${item.date}`} x={xOf(index)} y={height - 5} textAnchor="middle" fontSize="9" fill="rgba(120,113,108,0.85)">
                {item.day}
              </text>
            ) : null
          )}
        </svg>
      </div>
    </section>
  );
}

function StreakLineGraph({ series, daysInMonth }) {
  const [hovered, setHovered] = useState(null);
  const width = Math.max(920, (daysInMonth + 1) * 28);
  const height = 304;
  const pad = { top: 24, right: 20, bottom: 42, left: 42 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;
  const maxStreak = Math.max(7, Math.max(...series.map((item) => item.value), 0));
  const yMarks = Array.from({ length: maxStreak + 1 }, (_, index) => index).filter((value) => value % 2 === 0 || value === maxStreak);

  const xOf = (index) => (series.length === 1 ? pad.left + chartW / 2 : pad.left + (index / (series.length - 1)) * chartW);
  const yOf = (value) => pad.top + ((maxStreak - value) / maxStreak) * chartH;
  const linePath = series
    .map((point, index) => `${index === 0 ? "M" : "L"}${xOf(index).toFixed(1)},${yOf(point.value).toFixed(1)}`)
    .join(" ");

  return (
    <section className="rounded-[1.75rem] border border-sky-100/10 bg-stone-950/30 p-5 shadow-xl shadow-black/20">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-stone-500">Streak</p>
          <h4 className="mt-2 text-xl font-semibold text-sky-50">Streak Analysis (Breaks shown at 0)</h4>
        </div>
        <div className="flex items-center gap-3 text-xs text-stone-400">
          <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-sky-400" />Streak count</span>
          <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-rose-300" />Break day</span>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ minWidth: `${width}px` }}>
          {yMarks.map((mark) => {
            const y = yOf(mark);
            return (
              <g key={mark}>
                <line x1={pad.left} y1={y} x2={width - pad.right} y2={y} stroke="rgba(255,255,255,0.08)" strokeDasharray="4 6" />
                <text x={pad.left - 10} y={y + 4} textAnchor="end" fontSize="10" fill="rgba(255,255,255,0.45)">
                  {mark}
                </text>
              </g>
            );
          })}

          <Motion.path
            d={linePath}
            fill="none"
            stroke="#38bdf8"
            strokeWidth="3"
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 3.2, ease: "easeInOut" }}
          />

          {series.map((point, index) => {
            if (point.day === 0) return null;
            const x = xOf(index);
            const y = yOf(point.value);
            const isBreak = !point.logged;

            return (
              <g key={`pt-${point.day}`}>
                <circle
                  cx={x}
                  cy={y}
                  r={hovered === index ? 7 : 4.5}
                  fill={hovered === index ? (isBreak ? "#fda4af" : "#38bdf8") : (isBreak ? "rgba(251,113,133,0.3)" : "#0f172a")}
                  stroke={isBreak ? "#fda4af" : "#7dd3fc"}
                  strokeWidth="2"
                  style={{ transition: "r 0.15s ease, fill 0.15s ease" }}
                />
              </g>
            );
          })}

          {series.map((point, index) => {
            if (point.day === 0) return null;
            return (
              <text
                key={`x-label-${point.day}`}
                x={xOf(index)}
                y={height - 12}
                textAnchor="middle"
                fontSize="10"
                fill="rgba(255,255,255,0.45)"
              >
                {point.day}
              </text>
            );
          })}

          {(() => {
            if (hovered === null || !series[hovered] || series[hovered].day === 0) return null;
            const point = series[hovered];
            const x = xOf(hovered);
            const y = yOf(point.value);
            const ttW = 72;
            const ttH = 34;
            const ttX = Math.min(Math.max(x - ttW / 2, pad.left + 2), width - pad.right - ttW - 2);
            const ttY = Math.max(y - ttH - 10, pad.top + 2);
            return (
              <g style={{ pointerEvents: "none" }}>
                <line x1={x} y1={pad.top} x2={x} y2={pad.top + chartH} stroke="rgba(56,189,248,0.4)" strokeWidth="1" strokeDasharray="4 3" />
                <rect x={ttX} y={ttY} width={ttW} height={ttH} rx="6" fill="rgba(15,23,42,0.92)" stroke="rgba(56,189,248,0.4)" strokeWidth="1" />
                <text x={ttX + ttW / 2} y={ttY + 13} textAnchor="middle" fontSize="11" fontWeight="700" fill={point.logged ? "#bae6fd" : "#fda4af"}>
                  {point.logged ? `Streak: ${point.value}` : "Break"}
                </text>
                <text x={ttX + ttW / 2} y={ttY + 26} textAnchor="middle" fontSize="9" fill="rgba(148,163,184,0.8)">
                  Day {point.day}
                </text>
              </g>
            );
          })()}

          {(() => {
            const stepW = series.length > 1 ? chartW / (series.length - 1) : chartW;
            return series.map((point, index) => {
              if (point.day === 0) return null;
              return (
                <rect
                  key={`hz-${index}`}
                  x={Math.max(pad.left, xOf(index) - stepW / 2)}
                  y={pad.top}
                  width={stepW}
                  height={chartH}
                  fill="transparent"
                  style={{ cursor: "crosshair" }}
                  onMouseEnter={() => setHovered(index)}
                  onMouseLeave={() => setHovered(null)}
                />
              );
            });
          })()}
        </svg>
      </div>
    </section>
  );
}

export default function OthersAnalysis() {
  const { isDemoMode } = useAuth();
  const [selectedYear, setSelectedYear]   = useState(YEARS[0]);
  const [selectedMonth, setSelectedMonth] = useState(isDemoMode ? "04" : String(NOW.getMonth() + 1).padStart(2, "0"));
  const [apiEntries, setApiEntries]       = useState([]);
  const [loading, setLoading]             = useState(false);

  useEffect(() => {
    if (isDemoMode) { setApiEntries([]); return; }
    let cancelled = false;
    setLoading(true);
    api.get(`/journal/analysis?year=${selectedYear}&month=${parseInt(selectedMonth, 10)}`)
      .then(res => { if (!cancelled) setApiEntries(res.data.entries || []); })
      .catch(() => { if (!cancelled) setApiEntries([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [isDemoMode, selectedYear, selectedMonth]);

  const isCurrentMonth = selectedYear === String(NOW.getFullYear()) && selectedMonth === String(NOW.getMonth() + 1).padStart(2, "0");
  const maxDay = isCurrentMonth ? NOW.getDate() : null;

  const { scoreLogs: monthLogs, reflectionLogs } = useMemo(() => {
    if (isDemoMode) {
      return {
        scoreLogs: DEMO_SCORE_LOGS.filter(
          e => e.date.startsWith(selectedYear) && e.date.slice(5, 7) === selectedMonth
        ),
        reflectionLogs: DEMO_REFLECTION_LOGS.filter(
          e => e.date.startsWith(selectedYear) && e.date.slice(5, 7) === selectedMonth
        ),
      };
    }
    return buildLogsFromEntries(apiEntries, selectedYear, parseInt(selectedMonth, 10), maxDay);
  }, [isDemoMode, apiEntries, selectedYear, selectedMonth, maxDay]);

  const weeklyScoreSeries = useMemo(() => buildWeeklyScoreSeries(monthLogs), [monthLogs]);
  const streakSeries = useMemo(() => buildStreakSeries(monthLogs, selectedYear, selectedMonth, maxDay), [monthLogs, selectedMonth, selectedYear, maxDay]);
  const missedDaySeries = useMemo(() => buildMissedByWeekdaySeries(monthLogs), [monthLogs]);
  const winSeries = useMemo(
    () => buildMonthlySeries(reflectionLogs, selectedYear, selectedMonth, "wins", maxDay),
    [reflectionLogs, selectedMonth, selectedYear, maxDay]
  );
  const mistakeSeries = useMemo(
    () => buildMonthlySeries(reflectionLogs, selectedYear, selectedMonth, "mistakes", maxDay),
    [reflectionLogs, selectedMonth, selectedYear, maxDay]
  );
  const achievementSeries = useMemo(
    () => buildMonthlySeries(reflectionLogs, selectedYear, selectedMonth, "achievements", maxDay),
    [reflectionLogs, selectedMonth, selectedYear, maxDay]
  );
  const totalWins = sumBy(reflectionLogs, "wins");
  const totalAchievements = sumBy(reflectionLogs, "achievements");
  const totalMistakes = sumBy(reflectionLogs, "mistakes");
  const topMistakes = topRepeated(reflectionLogs, "mistakeTags", 5);
  const topDistractions = topRepeated(reflectionLogs, "distractionTags", 5);

  const avgWeeklyScore = round(average(weeklyScoreSeries.filter((item) => item.value > 0).map((item) => item.value)));
  const longestJournalStreak = Math.max(...streakSeries.map((item) => item.value), 0);
  const streakBreaks = countStreakBreaks(monthLogs);
  const totalMissedDays = monthLogs.filter((entry) => !entry.logged).length;

  const insights = [
    {
      title: "Total Wins This Month",
      value: `${totalWins}`,
      description: "Total number of wins recorded in the selected month.",
    },
    {
      title: "Total Achievements This Month",
      value: `${totalAchievements}`,
      description: "Total number of achievements recorded in the selected month.",
    },
    {
      title: "Total Mistakes This Month",
      value: `${totalMistakes}`,
      description: "Total number of mistakes recorded in the selected month.",
    },
    {
      title: "Top 5 Repeated Mistakes",
      value: topMistakes.length ? topMistakes.map((item) => item.label).join(", ") : "No data",
      description: toListSummary(topMistakes, "No repeated mistakes found."),
    },
    {
      title: "Top 5 Repeated Distractions",
      value: topDistractions.length ? topDistractions.map((item) => item.label).join(", ") : "No data",
      description: toListSummary(topDistractions, "No repeated distractions found."),
    },
    {
      title: "Avg Weekly Score",
      value: `${avgWeeklyScore}%`,
      description: "Average of Week 1 to Week 4 score values.",
    },
    {
      title: "Longest Journal Streak",
      value: `${longestJournalStreak} days`,
      description: "Longest consecutive logged-day streak in this month.",
    },
    {
      title: "Streak Breaks This Month",
      value: `${streakBreaks}`,
      description: "Number of times a logged streak ended with a missed day.",
    },
    {
      title: "Total Missed Days This Month",
      value: `${totalMissedDays}`,
      description: "Total days in the selected month where no journal entry was logged.",
    },
  ];

  const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        {String(NOW.getFullYear()) === selectedYear && String(NOW.getMonth() + 1).padStart(2, "0") === selectedMonth && (
          <span className="flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-300">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            Live · updates daily
          </span>
        )}
        <label className="flex items-center gap-2 rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2 text-sm text-stone-300">
          <span className="text-stone-400">Year</span>
          <select
            value={selectedYear}
            onChange={(event) => {
              const newYear = event.target.value;
              setSelectedYear(newYear);
              if (newYear === String(NOW.getFullYear()) && parseInt(selectedMonth) > NOW.getMonth() + 1) {
                setSelectedMonth(String(NOW.getMonth() + 1).padStart(2, "0"));
              }
            }}
            className="bg-transparent text-sky-100 outline-none"
          >
            {YEARS.map((year) => (
              <option key={year} value={year} className="bg-stone-950 text-stone-200">
                {year}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2 text-sm text-stone-300">
          <span className="text-stone-400">Month</span>
          <select
            value={selectedMonth}
            onChange={(event) => setSelectedMonth(event.target.value)}
            className="bg-transparent text-sky-100 outline-none"
          >
            {(selectedYear === String(NOW.getFullYear())
              ? MONTH_OPTIONS.filter(m => parseInt(m.value) <= NOW.getMonth() + 1)
              : MONTH_OPTIONS
            ).map((month) => (
              <option key={month.value} value={month.value} className="bg-stone-950 text-stone-200">
                {month.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {loading ? (
        <div className="space-y-3">
          <div className="h-48 animate-pulse rounded-2xl border border-sky-100/10 bg-white/[0.03]" />
          <div className="h-36 animate-pulse rounded-2xl border border-sky-100/10 bg-white/[0.03]" />
        </div>
      ) : (
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        <div
          className="journal-scroll min-w-0 flex-1 scroll-smooth overflow-y-auto rounded-[2rem] border border-sky-100/10 bg-white/[0.03] shadow-2xl shadow-black/30 backdrop-blur"
          style={{ maxHeight: "calc(100vh - 350px)" }}
        >
          <div className="space-y-6 p-6">
            <CombinedMonthlyLineGraph
              seriesGroups={[
                { label: "Wins", series: winSeries, stroke: "#10b981" },
                { label: "Mistakes", series: mistakeSeries, stroke: "#ef4444" },
                { label: "Achievements", series: achievementSeries, stroke: "#f59e0b" },
              ]}
            />

            <StreakLineGraph series={streakSeries} daysInMonth={daysInMonth} />

            <VerticalBarGraph
              title="Missed Day Analysis"
              subtitle="Missed Logs by Weekday"
              series={missedDaySeries}
              yMax={Math.max(4, Math.max(...missedDaySeries.map((item) => item.value), 0))}
              ticks={[0, 1, 2, 3, 4]}
              theme={{
                dot: "bg-red-400",
                fill: "bg-red-500/90 bg-gradient-to-t from-red-700/95 via-red-500/95 to-red-300/95 shadow-[0_0_12px_rgba(239,68,68,0.35)]",
                border: "border-red-300/40",
                value: "text-red-200",
              }}
            />
          </div>
        </div>

        <div
          className="journal-scroll flex w-full self-start flex-col gap-2 overflow-hidden scroll-smooth lg:max-w-[360px] lg:shrink-0"
          style={{ height: "calc(100vh - 350px)", maxHeight: "calc(100vh - 350px)" }}
        >
          <InsightRail insights={insights} />
        </div>
      </div>
      )}
    </section>
  );
}
