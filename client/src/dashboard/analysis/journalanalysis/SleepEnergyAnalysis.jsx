import { useMemo, useState } from "react";
import { motion as Motion } from "framer-motion";
import littleMonkLogo from "../../../assets/littlemonklogo.png";

const MONTH_OPTIONS = [
  { value: "01", label: "January" },
  { value: "02", label: "February" },
  { value: "03", label: "March" },
  { value: "04", label: "April" },
];

const SLEEP_ENTRIES = [
  { date: "2026-04-01", sleepDuration: 7.4, sleepTime: "23:18", wakeTime: "06:44", energy: 78, rating: 80 },
  { date: "2026-04-02", sleepDuration: 8.1, sleepTime: "22:56", wakeTime: "07:02", energy: 88, rating: 90 },
  { date: "2026-04-03", sleepDuration: 7.0, sleepTime: "23:42", wakeTime: "06:40", energy: 73, rating: 76 },
  { date: "2026-04-04", sleepDuration: 7.8, sleepTime: "23:08", wakeTime: "06:55", energy: 76, rating: 78 },
  { date: "2026-04-05", sleepDuration: 8.3, sleepTime: "22:48", wakeTime: "07:05", energy: 84, rating: 85 },
  { date: "2026-04-06", sleepDuration: 6.3, sleepTime: "00:14", wakeTime: "06:32", energy: 58, rating: 60 },
  { date: "2026-04-07", sleepDuration: 8.0, sleepTime: "22:58", wakeTime: "06:59", energy: 90, rating: 91 },
  { date: "2026-04-08", sleepDuration: 5.8, sleepTime: "00:36", wakeTime: "06:21", energy: 52, rating: 54 },
  { date: "2026-04-09", sleepDuration: 7.2, sleepTime: "23:26", wakeTime: "06:39", energy: 74, rating: 76 },
  { date: "2026-04-10", sleepDuration: 7.7, sleepTime: "23:04", wakeTime: "06:48", energy: 82, rating: 83 },
  { date: "2026-04-11", sleepDuration: 7.1, sleepTime: "23:32", wakeTime: "06:37", energy: 72, rating: 74 },
  { date: "2026-04-12", sleepDuration: 8.0, sleepTime: "22:53", wakeTime: "07:00", energy: 86, rating: 88 },
  { date: "2026-04-13", sleepDuration: 7.4, sleepTime: "23:17", wakeTime: "06:43", energy: 77, rating: 79 },
  { date: "2026-04-14", sleepDuration: 6.8, sleepTime: "23:48", wakeTime: "06:34", energy: 66, rating: 68 },
  { date: "2026-04-15", sleepDuration: 7.9, sleepTime: "22:58", wakeTime: "06:56", energy: 84, rating: 86 },
  { date: "2026-04-16", sleepDuration: 7.3, sleepTime: "23:23", wakeTime: "06:40", energy: 74, rating: 75 },
  { date: "2026-04-17", sleepDuration: 6.6, sleepTime: "00:08", wakeTime: "06:29", energy: 61, rating: 63 },
  { date: "2026-04-18", sleepDuration: 8.2, sleepTime: "22:46", wakeTime: "07:03", energy: 89, rating: 90 },
  { date: "2026-04-19", sleepDuration: 7.5, sleepTime: "23:13", wakeTime: "06:46", energy: 78, rating: 80 },
  { date: "2026-04-20", sleepDuration: 7.0, sleepTime: "23:37", wakeTime: "06:36", energy: 70, rating: 71 },
  { date: "2026-04-21", sleepDuration: 8.1, sleepTime: "22:51", wakeTime: "07:01", energy: 87, rating: 89 },
  { date: "2026-04-22", sleepDuration: 7.6, sleepTime: "23:10", wakeTime: "06:49", energy: 80, rating: 81 },
  { date: "2026-04-23", sleepDuration: 6.9, sleepTime: "23:42", wakeTime: "06:35", energy: 68, rating: 70 },
  { date: "2026-04-24", sleepDuration: 7.8, sleepTime: "23:01", wakeTime: "06:54", energy: 83, rating: 84 },
  { date: "2026-04-25", sleepDuration: 7.2, sleepTime: "23:28", wakeTime: "06:39", energy: 73, rating: 75 },
  { date: "2026-04-26", sleepDuration: 8.3, sleepTime: "22:44", wakeTime: "07:06", energy: 90, rating: 91 },
  { date: "2026-04-27", sleepDuration: 7.4, sleepTime: "23:15", wakeTime: "06:44", energy: 77, rating: 78 },
  { date: "2026-04-28", sleepDuration: 6.7, sleepTime: "23:55", wakeTime: "06:33", energy: 64, rating: 66 },
  { date: "2026-04-29", sleepDuration: 7.9, sleepTime: "22:57", wakeTime: "06:58", energy: 85, rating: 87 },
  { date: "2026-04-30", sleepDuration: 7.5, sleepTime: "23:11", wakeTime: "06:47", energy: 79, rating: 80 },
  { date: "2026-03-01", sleepDuration: 7.3, sleepTime: "23:18", wakeTime: "06:36", energy: 76, rating: 78 },
  { date: "2026-03-02", sleepDuration: 7.8, sleepTime: "22:58", wakeTime: "06:49", energy: 82, rating: 84 },
  { date: "2026-03-03", sleepDuration: 6.9, sleepTime: "23:45", wakeTime: "06:38", energy: 69, rating: 71 },
  { date: "2026-03-04", sleepDuration: 8.1, sleepTime: "22:50", wakeTime: "07:00", energy: 86, rating: 87 },
  { date: "2026-03-05", sleepDuration: 7.4, sleepTime: "23:20", wakeTime: "06:44", energy: 77, rating: 79 },
  { date: "2026-03-06", sleepDuration: 6.5, sleepTime: "00:12", wakeTime: "06:32", energy: 60, rating: 62 },
  { date: "2026-03-07", sleepDuration: 7.9, sleepTime: "22:57", wakeTime: "06:56", energy: 85, rating: 86 },
  { date: "2026-03-08", sleepDuration: 6.8, sleepTime: "23:48", wakeTime: "06:35", energy: 67, rating: 69 },
  { date: "2026-03-09", sleepDuration: 7.2, sleepTime: "23:30", wakeTime: "06:42", energy: 72, rating: 74 },
  { date: "2026-03-10", sleepDuration: 7.7, sleepTime: "23:06", wakeTime: "06:50", energy: 80, rating: 81 },
  { date: "2026-03-11", sleepDuration: 8.0, sleepTime: "22:54", wakeTime: "06:58", energy: 84, rating: 85 },
  { date: "2026-03-12", sleepDuration: 7.5, sleepTime: "23:10", wakeTime: "06:42", energy: 81, rating: 84 },
  { date: "2026-03-13", sleepDuration: 7.1, sleepTime: "23:34", wakeTime: "06:38", energy: 74, rating: 77 },
  { date: "2026-03-14", sleepDuration: 8.4, sleepTime: "22:44", wakeTime: "07:07", energy: 87, rating: 88 },
  { date: "2026-03-15", sleepDuration: 7.6, sleepTime: "23:12", wakeTime: "06:49", energy: 72, rating: 74 },
  { date: "2026-03-16", sleepDuration: 6.0, sleepTime: "00:22", wakeTime: "06:18", energy: 56, rating: 55 },
  { date: "2026-03-17", sleepDuration: 8.2, sleepTime: "22:50", wakeTime: "07:01", energy: 89, rating: 91 },
  { date: "2026-03-18", sleepDuration: 7.0, sleepTime: "23:34", wakeTime: "06:40", energy: 71, rating: 73 },
  { date: "2026-03-19", sleepDuration: 7.4, sleepTime: "23:16", wakeTime: "06:45", energy: 76, rating: 77 },
  { date: "2026-03-20", sleepDuration: 8.1, sleepTime: "22:46", wakeTime: "07:02", energy: 88, rating: 89 },
  { date: "2026-03-21", sleepDuration: 6.7, sleepTime: "00:08", wakeTime: "06:31", energy: 62, rating: 64 },
  { date: "2026-03-22", sleepDuration: 7.3, sleepTime: "23:24", wakeTime: "06:41", energy: 74, rating: 75 },
  { date: "2026-03-23", sleepDuration: 7.8, sleepTime: "23:02", wakeTime: "06:52", energy: 81, rating: 82 },
  { date: "2026-03-24", sleepDuration: 6.9, sleepTime: "23:40", wakeTime: "06:36", energy: 68, rating: 70 },
  { date: "2026-03-25", sleepDuration: 7.5, sleepTime: "23:14", wakeTime: "06:46", energy: 78, rating: 79 },
  { date: "2026-03-26", sleepDuration: 8.3, sleepTime: "22:42", wakeTime: "07:06", energy: 90, rating: 91 },
  { date: "2026-03-27", sleepDuration: 7.1, sleepTime: "23:32", wakeTime: "06:39", energy: 72, rating: 73 },
  { date: "2026-03-28", sleepDuration: 7.6, sleepTime: "23:09", wakeTime: "06:51", energy: 79, rating: 80 },
  { date: "2026-02-01", sleepDuration: 7.0, sleepTime: "23:28", wakeTime: "06:31", energy: 70, rating: 72 },
  { date: "2026-02-02", sleepDuration: 7.6, sleepTime: "23:08", wakeTime: "06:45", energy: 78, rating: 79 },
  { date: "2026-02-03", sleepDuration: 6.4, sleepTime: "00:05", wakeTime: "06:24", energy: 58, rating: 60 },
  { date: "2026-02-04", sleepDuration: 7.9, sleepTime: "22:55", wakeTime: "06:52", energy: 83, rating: 84 },
  { date: "2026-02-05", sleepDuration: 7.2, sleepTime: "23:26", wakeTime: "06:37", energy: 73, rating: 74 },
  { date: "2026-02-06", sleepDuration: 8.0, sleepTime: "22:49", wakeTime: "07:00", energy: 86, rating: 87 },
  { date: "2026-02-07", sleepDuration: 6.8, sleepTime: "23:41", wakeTime: "06:30", energy: 66, rating: 68 },
  { date: "2026-02-08", sleepDuration: 7.4, sleepTime: "23:18", wakeTime: "06:41", energy: 75, rating: 76 },
  { date: "2026-02-09", sleepDuration: 7.7, sleepTime: "23:00", wakeTime: "06:47", energy: 80, rating: 81 },
  { date: "2026-02-10", sleepDuration: 6.6, sleepTime: "23:55", wakeTime: "06:28", energy: 61, rating: 63 },
  { date: "2026-02-11", sleepDuration: 8.2, sleepTime: "22:43", wakeTime: "07:03", energy: 88, rating: 89 },
  { date: "2026-02-12", sleepDuration: 7.1, sleepTime: "23:29", wakeTime: "06:36", energy: 71, rating: 72 },
  { date: "2026-02-13", sleepDuration: 7.5, sleepTime: "23:12", wakeTime: "06:44", energy: 77, rating: 78 },
  { date: "2026-02-14", sleepDuration: 7.8, sleepTime: "23:04", wakeTime: "06:49", energy: 82, rating: 83 },
  { date: "2026-02-15", sleepDuration: 6.9, sleepTime: "23:46", wakeTime: "06:34", energy: 67, rating: 69 },
  { date: "2026-02-16", sleepDuration: 7.3, sleepTime: "23:22", wakeTime: "06:39", energy: 74, rating: 75 },
  { date: "2026-02-17", sleepDuration: 8.1, sleepTime: "22:52", wakeTime: "07:01", energy: 87, rating: 88 },
  { date: "2026-02-18", sleepDuration: 6.4, sleepTime: "00:10", wakeTime: "06:31", energy: 57, rating: 59 },
  { date: "2026-02-19", sleepDuration: 7.9, sleepTime: "23:00", wakeTime: "06:56", energy: 82, rating: 84 },
  { date: "2026-02-20", sleepDuration: 7.3, sleepTime: "23:22", wakeTime: "06:41", energy: 72, rating: 74 },
  { date: "2026-02-21", sleepDuration: 7.7, sleepTime: "23:06", wakeTime: "06:50", energy: 79, rating: 80 },
  { date: "2026-02-22", sleepDuration: 6.7, sleepTime: "23:50", wakeTime: "06:33", energy: 63, rating: 65 },
  { date: "2026-02-23", sleepDuration: 7.2, sleepTime: "23:27", wakeTime: "06:38", energy: 72, rating: 73 },
  { date: "2026-02-24", sleepDuration: 8.0, sleepTime: "22:48", wakeTime: "07:00", energy: 85, rating: 86 },
  { date: "2026-02-25", sleepDuration: 7.4, sleepTime: "23:17", wakeTime: "06:42", energy: 76, rating: 77 },
  { date: "2026-02-26", sleepDuration: 6.5, sleepTime: "00:04", wakeTime: "06:26", energy: 59, rating: 61 },
  { date: "2026-02-27", sleepDuration: 7.6, sleepTime: "23:11", wakeTime: "06:46", energy: 79, rating: 80 },
  { date: "2026-02-28", sleepDuration: 8.2, sleepTime: "22:45", wakeTime: "07:04", energy: 89, rating: 90 },
];

const YEARS = [...new Set(SLEEP_ENTRIES.map((entry) => entry.date.slice(0, 4)))].sort().reverse();
const WEEKDAY_ORDER = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEK_OPTIONS = [
  { value: 1, label: "Week 1", range: "1-7" },
  { value: 2, label: "Week 2", range: "8-14" },
  { value: 3, label: "Week 3", range: "15-21" },
  { value: 4, label: "Week 4", range: "22-28" },
];
const SLEEP_BAR_THEMES = [
  { border: "border-sky-200/20", bar: "from-sky-900/95 to-sky-400/90" },
  { border: "border-sky-200/25", bar: "from-sky-800/95 to-sky-300/95" },
  { border: "border-sky-200/20", bar: "from-blue-900/95 to-sky-300/90" },
  { border: "border-sky-200/25", bar: "from-blue-800/95 to-sky-300/90" },
  { border: "border-sky-200/20", bar: "from-sky-900/95 to-blue-300/90" },
  { border: "border-sky-200/25", bar: "from-blue-900/95 to-sky-400/90" },
  { border: "border-sky-200/20", bar: "from-sky-800/95 to-sky-200/95" },
];
const ENERGY_BAR_THEMES = [
  { border: "border-amber-200/20", bar: "from-amber-900/95 to-amber-400/90" },
  { border: "border-amber-200/25", bar: "from-amber-800/95 to-amber-300/95" },
  { border: "border-orange-200/20", bar: "from-orange-900/95 to-amber-300/90" },
  { border: "border-amber-200/25", bar: "from-orange-800/95 to-amber-300/90" },
  { border: "border-amber-200/20", bar: "from-amber-900/95 to-yellow-300/90" },
  { border: "border-orange-200/25", bar: "from-orange-900/95 to-amber-400/90" },
  { border: "border-amber-200/20", bar: "from-amber-800/95 to-yellow-300/95" },
];
const RATING_BAR_THEMES = [
  { border: "border-emerald-200/20", bar: "from-emerald-900/95 to-emerald-300/90" },
  { border: "border-green-200/25", bar: "from-green-800/95 to-green-200/95" },
  { border: "border-emerald-200/20", bar: "from-green-900/95 to-emerald-300/90" },
  { border: "border-green-200/25", bar: "from-emerald-700/95 to-green-300/90" },
  { border: "border-emerald-200/20", bar: "from-emerald-900/95 to-green-300/90" },
  { border: "border-green-200/25", bar: "from-green-800/95 to-emerald-300/90" },
  { border: "border-emerald-200/20", bar: "from-emerald-800/95 to-green-100/95" },
];
const BAR_H = 200;
const LABEL_H = 54;
const TOP_LABEL_H = 40;

const formatDay = (date) =>
  new Date(`${date}T00:00:00`).toLocaleDateString("en-US", { weekday: "short" });
const formatDayDate = (date) =>
  new Date(`${date}T00:00:00`).toLocaleDateString("en-US", { day: "numeric", month: "short" });

const average = (values) =>
  values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

const round = (value, precision = 1) => Number(value.toFixed(precision));

function timeToMinutes(time) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function formatDuration(hours) {
  const whole = Math.floor(hours);
  const minutes = Math.round((hours - whole) * 60);
  return `${whole}h ${String(minutes).padStart(2, "0")}m`;
}

function formatClock(totalMinutes) {
  const normalized = ((Math.round(totalMinutes) % 1440) + 1440) % 1440;
  const hours24 = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  const period = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 || 12;
  return `${hours12}:${String(minutes).padStart(2, "0")} ${period}`;
}

function getDaysInMonth(year, month) {
  return new Date(Number(year), Number(month), 0).getDate();
}

function getWeekBounds(week) {
  const weekNumber = Math.min(4, Math.max(1, Number(week) || 1));
  const startDay = (weekNumber - 1) * 7 + 1;
  const endDay = weekNumber * 7;

  return { weekNumber, startDay, endDay };
}

function buildMonthlySleepSeries(entries, year, month) {
  const entryMap = new Map(entries.map((entry) => [entry.date.slice(8, 10), entry]));
  const daysInMonth = getDaysInMonth(year, month);

  return Array.from({ length: daysInMonth }, (_, index) => {
    const dayNumber = index + 1;
    const dayKey = String(dayNumber).padStart(2, "0");
    const entry = entryMap.get(dayKey);

    return {
      date: `${year}-${month}-${dayKey}`,
      dayOfMonth: dayNumber,
      sleepDuration: entry?.sleepDuration ?? null,
      hasEntry: Boolean(entry),
    };
  });
}

function buildWeeklySeries(entries, year, month, week) {
  const { startDay } = getWeekBounds(week);
  const entryMap = new Map(entries.map((entry) => [Number(entry.date.slice(8, 10)), entry]));

  return Array.from({ length: 7 }, (_, index) => {
    const dayOfMonth = startDay + index;
    const dayKey = String(dayOfMonth).padStart(2, "0");
    const date = `${year}-${month}-${dayKey}`;
    const entry = entryMap.get(dayOfMonth);

    return {
      date,
      dayOfMonth,
      day: formatDay(date),
      sleepDuration: entry?.sleepDuration ?? null,
      energy: entry?.energy ?? null,
      rating: entry?.rating ?? null,
      hasEntry: Boolean(entry),
    };
  });
}

function buildWeekdayRatingSeries(entries) {
  return WEEKDAY_ORDER.map((weekday) => {
    const values = entries.filter((entry) => formatDay(entry.date) === weekday).map((entry) => entry.rating);
    return {
      label: weekday,
      value: values.length ? round(average(values)) : 0,
    };
  });
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
            <h3 className="text-label-md">Little Monk's Summary</h3>
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
                      className="mt-1.5 text-xs leading-relaxed text-stone-500"
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

function SleepDurationLineGraph({ data }) {
  const [hovered, setHovered] = useState(null);
  const populatedData = data.filter((item) => item.sleepDuration !== null);

  if (populatedData.length === 0) {
    return (
      <section className="rounded-[1.75rem] border border-sky-100/10 bg-stone-950/30 p-5 shadow-xl shadow-black/20">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-stone-500">Sleep Trend</p>
          <h4 className="mt-2 text-xl font-semibold text-sky-50">Total Sleep Duration</h4>
        </div>
        <div className="mt-6 flex h-[29vh] items-center justify-center rounded-2xl border border-dashed border-sky-100/10 text-sm text-stone-400">
          No sleep logs for this month.
        </div>
      </section>
    );
  }

  const width = Math.max(980, data.length * 34);
  const height = 280;
  const pad = { top: 24, right: 20, bottom: 42, left: 42 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;
  const maxSleep = Math.max(9, Math.ceil(Math.max(...populatedData.map((item) => item.sleepDuration), 8.5)));
  const minSleep = 5;
  const yMarks = [5, 6, 7, 8, 9];
  const showDensePointLabels = data.length <= 16;

  const xOf = (index) => (data.length === 1 ? pad.left + chartW / 2 : pad.left + (index / (data.length - 1)) * chartW);
  const yOf = (value) => pad.top + ((maxSleep - value) / (maxSleep - minSleep)) * chartH;
  const lineSegments = [];
  let currentSegment = [];

  data.forEach((item, index) => {
    if (item.sleepDuration === null) {
      if (currentSegment.length) lineSegments.push(currentSegment);
      currentSegment = [];
      return;
    }

    currentSegment.push({ x: xOf(index), y: yOf(item.sleepDuration), value: item.sleepDuration, day: item.dayOfMonth });
  });

  if (currentSegment.length) lineSegments.push(currentSegment);

  return (
    <Motion.section
      className="rounded-[1.75rem] border border-sky-100/10 bg-stone-950/30 p-5 shadow-xl shadow-black/20"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-stone-500">Sleep Trend</p>
          <h4 className="mt-2 text-xl font-semibold text-sky-50">Total Sleep Duration</h4>
          <p className="mt-2 text-xs text-stone-400">
            Gaps or faint markers mean the journal was not submitted on those days.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs text-stone-400">
          <span className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-sky-400" />
            Logged sleep
          </span>
          <span className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full border border-dashed border-rose-300/70" />
            No journal
          </span>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto">
        <div style={{ minWidth: `${width}px` }}>
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
          {yMarks.map((mark) => {
            const y = yOf(mark);
            return (
              <g key={mark}>
                <Motion.line
                  x1={pad.left}
                  y1={y}
                  x2={width - pad.right}
                  y2={y}
                  stroke="rgba(255,255,255,0.08)"
                  strokeDasharray="4 6"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 1, delay: 0.14 * mark }}
                />
                <text x={pad.left - 10} y={y + 4} textAnchor="end" fontSize="10" fill="rgba(255,255,255,0.35)">
                  {mark}h
                </text>
              </g>
            );
          })}

          <defs>
            <linearGradient id="sleepLineFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.02" />
            </linearGradient>
            <filter id="sleepLineGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#38bdf8" floodOpacity="0.35" />
            </filter>
          </defs>

          {lineSegments.map((segment, index) => {
            const line = segment
              .map((point, pointIndex) => `${pointIndex === 0 ? "M" : "L"}${point.x.toFixed(1)},${point.y.toFixed(1)}`)
              .join(" ");
            const area = `${line} L ${segment[segment.length - 1].x},${pad.top + chartH} L ${segment[0].x},${pad.top + chartH} Z`;

            return (
              <g key={`segment-${index}`}>
                <Motion.path
                  d={area}
                  fill="url(#sleepLineFill)"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 1.4, delay: 1.2 + index * 0.25 }}
                />
                <Motion.path
                  d={line}
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="3"
                  strokeLinecap="round"
                  filter="url(#sleepLineGlow)"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 2.2, delay: 1.5 + index * 0.3, ease: "easeOut" }}
                />
              </g>
            );
          })}

          {data.map((item, index) => {
            if (item.sleepDuration === null) return null;
            const x = xOf(index);
            const y = yOf(item.sleepDuration);
            const isEdgePoint = index === 0 || index === data.length - 1;
            const isEvenPoint = index % 2 === 0;
            const isExtrema = item.sleepDuration >= maxSleep - 0.2 || item.sleepDuration <= minSleep + 1;
            const shouldShowValueLabel = showDensePointLabels || isEdgePoint || isEvenPoint || isExtrema;
            return (
              <Motion.g
                key={item.date}
                initial={{ opacity: 0, scale: 0.75 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.55, delay: 1.4 + index * 0.09, ease: "easeOut" }}
              >
                <Motion.circle
                  cx={x}
                  cy={y}
                  r="9"
                  fill="#38bdf8"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 0.26, 0.1] }}
                  transition={{ duration: 1.8, delay: 1.6 + index * 0.09, ease: "easeOut" }}
                />
                <circle
                  cx={x}
                  cy={y}
                  r={hovered === index ? 7 : 5}
                  fill={hovered === index ? "#38bdf8" : "#0f172a"}
                  stroke="#7dd3fc"
                  strokeWidth="2.5"
                  style={{ transition: "r 0.15s ease, fill 0.15s ease" }}
                />
                <Motion.text
                  x={x}
                  y={y - 12}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#bae6fd"
                  fontWeight="700"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: shouldShowValueLabel ? 1 : 0 }}
                  transition={{ duration: 0.5, delay: 2 + index * 0.12 }}
                >
                  {shouldShowValueLabel ? `${round(item.sleepDuration)}h` : ""}
                </Motion.text>
              </Motion.g>
            );
          })}

          {data.map((item, index) => {
            if (item.sleepDuration !== null) return null;
            const x = xOf(index);
            const y = pad.top + chartH;

            return (
              <g key={`missing-${item.date}`}>
                <Motion.circle
                  cx={x}
                  cy={y}
                  r="4"
                  fill="rgba(244,63,94,0.14)"
                  stroke="rgba(253,164,175,0.75)"
                  strokeWidth="1.5"
                  strokeDasharray="2 2"
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: [0.45, 0.85, 0.45], scale: [0.9, 1.2, 0.9] }}
                  transition={{ duration: 1.6, delay: 0.2 + index * 0.05, repeat: Infinity, ease: "easeInOut" }}
                />
              </g>
            );
          })}

          {(() => {
            if (hovered === null || data[hovered]?.sleepDuration === null) return null;
            const item = data[hovered];
            const x = xOf(hovered);
            const y = yOf(item.sleepDuration);
            const ttW = 64;
            const ttH = 34;
            const ttX = Math.min(Math.max(x - ttW / 2, pad.left + 2), width - pad.right - ttW - 2);
            const ttY = Math.max(y - ttH - 10, pad.top + 2);
            return (
              <g style={{ pointerEvents: "none" }}>
                <line
                  x1={x} y1={pad.top} x2={x} y2={pad.top + chartH}
                  stroke="rgba(56,189,248,0.45)" strokeWidth="1" strokeDasharray="4 3"
                />
                <rect x={ttX} y={ttY} width={ttW} height={ttH} rx="6"
                  fill="rgba(15,23,42,0.92)" stroke="rgba(56,189,248,0.45)" strokeWidth="1"
                />
                <text x={ttX + ttW / 2} y={ttY + 13} textAnchor="middle" fontSize="11" fontWeight="700" fill="#bae6fd">
                  {round(item.sleepDuration)}h
                </text>
                <text x={ttX + ttW / 2} y={ttY + 26} textAnchor="middle" fontSize="9" fill="rgba(148,163,184,0.8)">
                  Day {item.dayOfMonth}
                </text>
              </g>
            );
          })()}

          {(() => {
            const stepW = data.length > 1 ? chartW / (data.length - 1) : chartW;
            return data.map((_, index) => (
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
            ));
          })()}

          </svg>

          <Motion.div
            className="mt-1 flex items-center text-[10px] text-stone-500"
            style={{ paddingLeft: `${pad.left}px`, paddingRight: `${pad.right}px` }}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.2 }}
          >
            {data.map((item, index) => (
              <Motion.span
                key={`day-label-${item.date}`}
                className="flex-1 text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2, delay: 0.22 + index * 0.01 }}
              >
                {item.dayOfMonth}
              </Motion.span>
            ))}
          </Motion.div>
        </div>
      </div>
    </Motion.section>
  );
}

function SleepVsScoreGraph({ data, selectedWeek, onWeekChange }) {
  const [hovered, setHovered] = useState(null);
  return (
    <section className="rounded-[1.75rem] border border-sky-100/10 bg-stone-950/30 p-5 shadow-xl shadow-black/20">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-stone-500">Comparison</p>
          <h4 className="mt-2 text-xl font-semibold text-sky-50">Sleep Duration vs Energy and Overall Day Rate</h4>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-3 text-xs text-stone-400">
            <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-sky-400" />Sleep</span>
            <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-amber-400" />Energy</span>
            <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />Day Rate</span>
          </div>

          <div className="flex items-center gap-1">
            {WEEK_OPTIONS.map((week) => {
              const isActive = selectedWeek === week.value;
              return (
                <button
                  key={week.value}
                  type="button"
                  onClick={() => onWeekChange(week.value)}
                  className={`rounded-xl border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                    isActive
                      ? "border-sky-300/50 bg-sky-500/20 text-sky-100"
                      : "border-white/10 text-stone-300 hover:border-sky-200/30 hover:text-sky-100"
                  }`}
                  title={`${week.label} (${week.range})`}
                >
                  {week.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto pb-1">
      <div className="flex min-w-[680px] gap-3 pr-1">
        <div
          className="flex shrink-0 flex-col justify-between text-right text-[11px] text-stone-500"
          style={{ height: BAR_H, marginBottom: LABEL_H }}
        >
          {[100, 80, 60, 40, 20, 0].map((mark) => (
            <span key={mark}>{mark}</span>
          ))}
        </div>

        <div className="relative flex-1" style={{ height: BAR_H + LABEL_H }}>
          {[0, 20, 40, 60, 80, 100].map((mark) => (
            <div
              key={mark}
              className="absolute left-0 right-0 border-t border-dashed border-white/6"
              style={{ bottom: LABEL_H + (mark / 100) * BAR_H }}
            />
          ))}

          <div className="absolute inset-0 flex items-end justify-around gap-2">
            {data.map((item, index) => {
              const sleepPercent = item.sleepDuration === null ? 0 : (item.sleepDuration / 10) * 100;
              const sleepTheme = SLEEP_BAR_THEMES[index % SLEEP_BAR_THEMES.length];
              const energyTheme = ENERGY_BAR_THEMES[index % ENERGY_BAR_THEMES.length];
              const ratingTheme = RATING_BAR_THEMES[index % RATING_BAR_THEMES.length];
              return (
                <Motion.div
                  key={item.date}
                  className="flex min-w-0 flex-1 flex-col items-center"
                  style={{
                    height: BAR_H + LABEL_H,
                    opacity: hovered !== null && hovered !== index ? 0.4 : 1,
                    transition: "opacity 0.18s ease",
                  }}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: hovered !== null && hovered !== index ? 0.4 : 1, y: 0 }}
                  transition={{ duration: 0.35, delay: index * 0.06, ease: "easeOut" }}
                  onMouseEnter={() => setHovered(index)}
                  onMouseLeave={() => setHovered(null)}
                >
                  <div className="flex items-end justify-center gap-1.5" style={{ height: BAR_H }}>
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[10px] font-semibold text-sky-200">
                        {item.sleepDuration === null ? "--" : `${round(item.sleepDuration)}h`}
                      </span>
                      {item.sleepDuration === null ? (
                        <div className={`h-2 w-5 rounded-t-lg border border-dashed bg-sky-400/10 ${sleepTheme.border}`} />
                      ) : (
                        <Motion.div
                          className={`w-5 rounded-t-lg border bg-gradient-to-t ${sleepTheme.border} ${sleepTheme.bar}`}
                          initial={{ height: 0 }}
                          animate={{ height: Math.round((sleepPercent / 100) * BAR_H) }}
                          transition={{ duration: 0.45, delay: index * 0.06 }}
                        />
                      )}
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[10px] font-semibold text-amber-200">{item.energy ?? "--"}</span>
                      {item.energy === null ? (
                        <div className={`h-2 w-5 rounded-t-lg border border-dashed bg-amber-400/10 ${energyTheme.border}`} />
                      ) : (
                        <Motion.div
                          className={`w-5 rounded-t-lg border bg-gradient-to-t ${energyTheme.border} ${energyTheme.bar}`}
                          initial={{ height: 0 }}
                          animate={{ height: Math.round((item.energy / 100) * BAR_H) }}
                          transition={{ duration: 0.45, delay: index * 0.06 + 0.04 }}
                        />
                      )}
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[10px] font-semibold text-emerald-200">{item.rating ?? "--"}</span>
                      {item.rating === null ? (
                        <div className={`h-2 w-5 rounded-t-lg border border-dashed bg-emerald-400/10 ${ratingTheme.border}`} />
                      ) : (
                        <Motion.div
                          className={`w-5 rounded-t-lg border bg-gradient-to-t ${ratingTheme.border} ${ratingTheme.bar}`}
                          initial={{ height: 0 }}
                          animate={{ height: Math.round((item.rating / 100) * BAR_H) }}
                          transition={{ duration: 0.45, delay: index * 0.06 + 0.08 }}
                        />
                      )}
                    </div>
                  </div>
                  <div className="flex h-[54px] flex-col items-center justify-start pt-2">
                    <span className="text-[11px] font-semibold text-stone-300">{item.day}</span>
                    <span className="text-[10px] text-stone-500">{item.dayOfMonth}</span>
                  </div>
                </Motion.div>
              );
            })}
          </div>
        </div>
      </div>
      </div>
    </section>
  );
}

function EnergyLevelGraph({ data }) {
  const [hovered, setHovered] = useState(null);
  return (
    <section className="rounded-[1.75rem] border border-sky-100/10 bg-stone-950/30 p-5 shadow-xl shadow-black/20">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-stone-500">Energy & Rating</p>
          <h4 className="mt-2 text-xl font-semibold text-sky-50">7 Day-wise Energy Level and Day Rating</h4>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-xs text-stone-400">
          <span className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-cyan-300" />
            Energy
          </span>
          <span className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
            Overall rating
          </span>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto pb-1">
      <div className="flex min-w-[640px] gap-3 pr-1">
        <div
          className="flex shrink-0 flex-col justify-between text-right text-[11px] text-stone-500"
          style={{ height: BAR_H, marginTop: TOP_LABEL_H, marginBottom: LABEL_H / 2 }}
        >
          {[100, 80, 60, 40, 20, 0].map((mark) => (
            <span key={mark}>{mark}%</span>
          ))}
        </div>

        <div className="relative flex-1" style={{ height: TOP_LABEL_H + BAR_H + LABEL_H / 2 }}>
          {[0, 20, 40, 60, 80, 100].map((mark) => (
            <div
              key={mark}
              className="absolute left-0 right-0 border-t border-dashed border-white/6"
              style={{ bottom: LABEL_H / 2 + (mark / 100) * BAR_H }}
            />
          ))}

          <div className="absolute inset-0 flex items-end justify-around gap-2">
            {data.map((item, index) => (
              <Motion.div
                key={item.date}
                className="flex min-w-0 flex-1 flex-col items-center"
                style={{
                  height: TOP_LABEL_H + BAR_H + LABEL_H / 2,
                  opacity: hovered !== null && hovered !== index ? 0.4 : 1,
                  transition: "opacity 0.18s ease",
                }}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: hovered !== null && hovered !== index ? 0.4 : 1, y: 0 }}
                transition={{ duration: 0.35, delay: index * 0.06, ease: "easeOut" }}
                onMouseEnter={() => setHovered(index)}
                onMouseLeave={() => setHovered(null)}
              >
                <div className="flex items-end justify-center gap-2 pb-1" style={{ height: TOP_LABEL_H }}>
                  <span className="w-9 text-center text-[10px] font-semibold text-sky-200">
                    {item.energy === null ? "--" : `${item.energy}%`}
                  </span>
                  <span className="w-9 text-center text-[10px] font-semibold text-emerald-200">
                    {item.rating === null ? "--" : `${item.rating}%`}
                  </span>
                </div>
                <div className="flex w-full items-end justify-center gap-2" style={{ height: BAR_H }}>
                  {item.energy === null ? (
                    <div className="h-2 w-full max-w-[30px] rounded-t-2xl border border-dashed border-cyan-200/50 bg-cyan-400/10" />
                  ) : (
                    <Motion.div
                      className="w-full max-w-[30px] rounded-t-2xl border border-white/10 bg-gradient-to-t from-sky-800/90 via-cyan-600/85 to-cyan-300/90"
                      initial={{ height: 0 }}
                      animate={{ height: Math.max(12, Math.round((item.energy / 100) * BAR_H)) }}
                      transition={{ duration: 0.5, delay: index * 0.06 }}
                    />
                  )}
                  {item.rating === null ? (
                    <div className="h-2 w-full max-w-[30px] rounded-t-2xl border border-dashed border-emerald-200/50 bg-emerald-400/10" />
                  ) : (
                    <Motion.div
                      className="w-full max-w-[30px] rounded-t-2xl border border-white/10 bg-gradient-to-t from-emerald-900/90 via-emerald-600/85 to-emerald-300/90"
                      initial={{ height: 0 }}
                      animate={{ height: Math.max(12, Math.round((item.rating / 100) * BAR_H)) }}
                      transition={{ duration: 0.5, delay: index * 0.06 + 0.04 }}
                    />
                  )}
                </div>
                <div className="flex items-start justify-center pt-2" style={{ height: LABEL_H / 2 }}>
                  <span className="text-[11px] font-bold text-stone-300">{item.day}</span>
                </div>
              </Motion.div>
            ))}
          </div>
        </div>
      </div>
      </div>
    </section>
  );
}

export default function SleepEnergyAnalysis() {
  const [selectedYear, setSelectedYear] = useState(YEARS[0]);
  const [selectedMonth, setSelectedMonth] = useState("04");
  const [selectedWeek, setSelectedWeek] = useState(1);

  const availableMonths = useMemo(() => {
    const months = new Set(
      SLEEP_ENTRIES.filter((entry) => entry.date.startsWith(selectedYear)).map((entry) => entry.date.slice(5, 7))
    );
    return MONTH_OPTIONS.filter((month) => months.has(month.value));
  }, [selectedYear]);

  const filteredEntries = useMemo(
    () =>
      SLEEP_ENTRIES.filter(
        (entry) => entry.date.startsWith(selectedYear) && entry.date.slice(5, 7) === selectedMonth
      ).sort((a, b) => a.date.localeCompare(b.date)),
    [selectedMonth, selectedYear]
  );

  const lineSeries = useMemo(
    () => buildMonthlySleepSeries(filteredEntries, selectedYear, selectedMonth),
    [filteredEntries, selectedMonth, selectedYear]
  );
  const comparisonSeries = useMemo(
    () => buildWeeklySeries(filteredEntries, selectedYear, selectedMonth, selectedWeek),
    [filteredEntries, selectedMonth, selectedWeek, selectedYear]
  );
  const energySeries = comparisonSeries;

  const avgSleepDuration = average(filteredEntries.map((entry) => entry.sleepDuration));
  const avgWakeupTime = average(filteredEntries.map((entry) => timeToMinutes(entry.wakeTime)));
  const avgSleepTime = average(filteredEntries.map((entry) => timeToMinutes(entry.sleepTime)));
  const avgEnergy = average(filteredEntries.map((entry) => entry.energy));
  const avgDayRating = average(filteredEntries.map((entry) => entry.rating));
  const weekdayRatingSeries = useMemo(() => buildWeekdayRatingSeries(filteredEntries), [filteredEntries]);
  const validWeekdayRatings = weekdayRatingSeries.filter((item) => item.value > 0);
  const highestRatedDay = validWeekdayRatings.length
    ? [...validWeekdayRatings].sort((a, b) => b.value - a.value)[0]
    : null;
  const lowestRatedDay = validWeekdayRatings.length
    ? [...validWeekdayRatings].sort((a, b) => a.value - b.value)[0]
    : null;
  const weeklyEnergyEntries = energySeries.filter((entry) => entry.energy !== null);
  const highestEnergyEntry = weeklyEnergyEntries.length
    ? weeklyEnergyEntries.reduce((highest, entry) => (entry.energy > highest.energy ? entry : highest), weeklyEnergyEntries[0])
    : null;
  const lowestEnergyEntry = weeklyEnergyEntries.length
    ? weeklyEnergyEntries.reduce((lowest, entry) => (entry.energy < lowest.energy ? entry : lowest), weeklyEnergyEntries[0])
    : null;

  const littleMonkInsights = [
    {
      title: "Avg Sleep Duration",
      value: formatDuration(avgSleepDuration),
      description: "This month’s average nightly sleep duration across your logged days.",
    },
    {
      title: "Avg Wakeup Time",
      value: formatClock(avgWakeupTime),
      description: "Your average wakeup time shows how consistent your morning rhythm has been this month.",
    },
    {
      title: "Avg Sleep Time",
      value: formatClock(avgSleepTime),
      description: "Your average sleep time reflects when your nights usually begin in the selected month.",
    },
    {
      title: "Avg Energy This Month",
      value: `${Math.round(avgEnergy)}%`,
      description: "Average daytime energy across the current month’s entries.",
    },
    {
      title: "Avg Day Rating This Month",
      value: `${round(avgDayRating)}%`,
      description: "Average overall day rating across the current month’s sleep and energy entries.",
    },
    {
      title: "Highest Rated Day",
      value: highestRatedDay ? `${highestRatedDay.label} · ${highestRatedDay.value}%` : "No data",
      description: "Weekday with the highest average day rating this month.",
    },
    {
      title: "Lowest Rated Day",
      value: lowestRatedDay ? `${lowestRatedDay.label} · ${lowestRatedDay.value}%` : "No data",
      description: "Weekday with the lowest average day rating this month.",
    },
    {
      title: "Highest Energy Day",
      value: highestEnergyEntry
        ? `${formatDay(highestEnergyEntry.date)}, ${formatDayDate(highestEnergyEntry.date)} · ${highestEnergyEntry.energy}%`
        : "No data",
      description: "Your strongest energy day in the selected month.",
    },
    {
      title: "Lowest Energy Day",
      value: lowestEnergyEntry
        ? `${formatDay(lowestEnergyEntry.date)}, ${formatDayDate(lowestEnergyEntry.date)} · ${lowestEnergyEntry.energy}%`
        : "No data",
      description: "Your lowest energy day in the selected month.",
    },
  ];

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2 text-sm text-stone-300">
          <span className="text-stone-400">Year</span>
          <select
            value={selectedYear}
            onChange={(event) => {
              const nextYear = event.target.value;
              setSelectedYear(nextYear);
              const nextMonths = MONTH_OPTIONS.filter((month) =>
                SLEEP_ENTRIES.some((entry) => entry.date.startsWith(nextYear) && entry.date.slice(5, 7) === month.value)
              );
              setSelectedMonth(nextMonths[0]?.value ?? "01");
              setSelectedWeek(1);
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
            onChange={(event) => {
              setSelectedMonth(event.target.value);
              setSelectedWeek(1);
            }}
            className="bg-transparent text-sky-100 outline-none"
          >
            {availableMonths.map((month) => (
              <option key={month.value} value={month.value} className="bg-stone-950 text-stone-200">
                {month.label}
              </option>
            ))}
          </select>
        </label>

      </div>

      <div className="flex flex-col gap-5 xl:flex-row xl:items-start">
        <div className="journal-scroll min-w-0 flex-1 scroll-smooth overflow-y-auto rounded-[2rem] border border-sky-100/10 bg-white/[0.03] shadow-2xl shadow-black/30 backdrop-blur xl:max-h-[calc(100vh-350px)]">
          <div className="space-y-6 p-6">
            <SleepDurationLineGraph data={lineSeries} />
            <SleepVsScoreGraph
              data={comparisonSeries}
              selectedWeek={selectedWeek}
              onWeekChange={setSelectedWeek}
            />
            <EnergyLevelGraph data={energySeries} />
          </div>
        </div>

        <div className="journal-scroll flex w-full flex-col gap-2 overflow-hidden scroll-smooth xl:h-[calc(100vh-350px)] xl:max-h-[calc(100vh-350px)] xl:max-w-[360px] xl:shrink-0 xl:self-start">
          <InsightRail insights={littleMonkInsights} />
        </div>
      </div>
    </section>
  );
}
