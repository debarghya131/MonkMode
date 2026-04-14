import { useState } from "react";

const MOCK_ANALYTICS = [
  { day: "Mon", mood: "🔥", label: "Motivated", score: 90 },
  { day: "Tue", mood: "😊", label: "Happy",     score: 80 },
  { day: "Wed", mood: "😌", label: "Calm",       score: 65 },
  { day: "Thu", mood: "😐", label: "Neutral",    score: 50 },
  { day: "Fri", mood: "😤", label: "Focused",    score: 85 },
  { day: "Sat", mood: "😴", label: "Tired",      score: 30 },
  { day: "Sun", mood: "😊", label: "Happy",      score: 75 },
];

const MOCK_HISTORY = [
  {
    date: "2026-04-13",
    mood: { emoji: "🔥", label: "Motivated" },
    entry: "Started the day with a 5am wake-up and 30 minutes of meditation. Crushed my deep work session and felt completely in flow.",
  },
  {
    date: "2026-04-12",
    mood: { emoji: "😌", label: "Calm" },
    entry: "Slow morning. Had a long walk and got core tasks done. Sometimes stillness is the most productive thing.",
  },
  {
    date: "2026-04-11",
    mood: { emoji: "😤", label: "Focused" },
    entry: "Deep work block from 9am to 1pm. Phone off, inbox closed. Wrote 2,000 words and shipped a feature.",
  },
  {
    date: "2026-04-10",
    mood: { emoji: "😰", label: "Anxious" },
    entry: "Felt scattered today. Need to go back to basics — one task at a time. Tomorrow will be better.",
  },
  {
    date: "2026-04-09",
    mood: { emoji: "🙏", label: "Grateful" },
    entry: "Grateful for the consistency and small wins. Wrote a letter to my future self.",
  },
];

export default function JournalRightSidebar() {
  const [expandedEntry, setExpandedEntry] = useState(null);
  const [modalEntry, setModalEntry] = useState(null);

  return (
    <>

      <div className="space-y-4">
      {/* Mood Analytics */}
      <section className="rounded-2xl border border-amber-100/10 bg-white/6 p-5 shadow-xl shadow-black/25 backdrop-blur">

        <div className="flex items-center gap-2 mb-4">
          <span className="text-base">📊</span>
          <p className="text-label-md">Mood This Week</p>
        </div>

        <div className="space-y-2.5">
          {MOCK_ANALYTICS.map((item) => (
            <div key={item.day} className="flex items-center gap-2">
              <span className="w-7 shrink-0 text-xs text-stone-500">{item.day}</span>
              <span className="text-sm">{item.mood}</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-stone-950/60">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-400 transition-all duration-500"
                  style={{ width: `${item.score}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Most Frequent */}
        <div className="mt-4 flex items-center justify-between rounded-xl border border-amber-100/10 bg-stone-950/45 px-3 py-2.5">
          <p className="text-xs text-stone-500 uppercase tracking-wider">Top Mood</p>
          <p className="text-sm font-semibold text-amber-300">😊 Happy</p>
        </div>
      </section>

      {/* Journal History */}
      <section className="rounded-2xl border border-amber-100/10 bg-white/6 p-5 shadow-xl shadow-black/25 backdrop-blur">

        <div className="flex items-center gap-2 mb-4">
          <span className="text-base">📖</span>
          <p className="text-label-md">Past Entries</p>
        </div>

        <div className="h-[calc(70vh-380px)] overflow-y-auto space-y-3 pr-1 journal-scroll">
          {MOCK_HISTORY.map((item) => {
            const dateObj = new Date(item.date);
            const formattedDate = dateObj.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              weekday: "short",
            });
            const isExpanded = expandedEntry === item.date;
            const preview = item.entry.length > 80 ? item.entry.slice(0, 80) + "…" : item.entry;

            return (
              <div
                key={item.date}
                className="rounded-xl border border-amber-100/10 bg-stone-950/45 p-3 transition-all duration-200 hover:border-amber-400/20"
              >
                {/* Date + mood on same row */}
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-stone-500">{formattedDate}</p>
                  <span className="flex items-center gap-1 rounded-full border border-amber-400/20 bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-300">
                    {item.mood.emoji} {item.mood.label}
                  </span>
                </div>

                <p className="mt-2 text-xs leading-relaxed text-stone-400">
                  {isExpanded ? item.entry : preview}
                </p>

                {item.entry.length > 80 && (
                  <button
                    type="button"
                    onClick={() => setModalEntry(item)}
                    className="mt-1.5 text-xs font-semibold text-amber-500 transition hover:text-amber-300"
                  >
                    More ↓
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      </div>

      {/* Entry Detail Modal */}
      {modalEntry && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setModalEntry(null)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          {/* Modal card */}
          <div
            className="relative z-10 w-full max-w-md rounded-2xl border border-amber-100/15 bg-[linear-gradient(160deg,#1e1208,#120d0c)] p-6 shadow-2xl shadow-black/50"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">
                  {new Date(modalEntry.date).toLocaleDateString("en-US", {
                    weekday: "long", month: "long", day: "numeric", year: "numeric",
                  })}
                </p>
                <span className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300">
                  {modalEntry.mood.emoji} {modalEntry.mood.label}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setModalEntry(null)}
                className="shrink-0 rounded-full border border-amber-100/10 bg-white/5 p-1.5 text-stone-400 transition hover:border-amber-400/30 hover:text-amber-300"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Divider */}
            <div className="my-4 border-t border-amber-100/10" />

            {/* Full entry */}
            <p className="text-sm leading-relaxed text-stone-300">{modalEntry.entry}</p>
          </div>
        </div>
      )}
    </>
  );
}
