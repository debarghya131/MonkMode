import { motion as Motion } from "framer-motion";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";


const MOCK_HISTORY = [
  {
    date: "2026-04-15",
    mood: { emoji: "🔥", label: "Motivated" },
    wakeUpTime: "05:00",
    energyLevel: 88,
    overallRating: 91,
    summary: "Started the day with a 5am wake-up and 30 minutes of meditation. Crushed my deep work session and felt completely in flow.",
    wins: ["Finished the dashboard module", "Hit 10k steps", "Read 40 pages"],
    mistakes: ["Skipped lunch break", "Replied to messages too late"],
    insight: "Protecting the first 2 hours of the day from distractions is what makes everything else possible.",
    distractions: ["Slack notifications kept pulling me out of focus during the afternoon.", "Checked email too often between work blocks."],
    gratitude: ["Grateful for my health and energy today", "Thankful for a supportive team"],
    achievement: ["Shipped the schedule feature", "Completed 3 deep work blocks"],
    affirmation: "I build discipline one decision at a time.",
    tomorrowPlan: "Review PRs, write tests for the new module, and go for a morning run.",
    sleepTime: "22:45",
  },
  {
    date: "2026-04-14",
    mood: { emoji: "😌", label: "Calm" },
    wakeUpTime: "06:20",
    energyLevel: 62,
    overallRating: 74,
    summary: "Slow morning. Had a long walk and got core tasks done. Sometimes stillness is the most productive thing.",
    wins: ["Cleared my inbox", "Had a great 1:1 meeting", "Cooked a healthy dinner"],
    mistakes: ["Got distracted by social media for 45 min", "Didn't finish the blog draft"],
    insight: "Stillness is not the absence of progress — it's the foundation of it.",
    distractions: ["Instagram scrolling after lunch made it harder to restart deep work.", "Kept refreshing chat messages."],
    gratitude: ["Grateful for the quiet morning", "Thankful for good coffee and clean air"],
    achievement: ["Reviewed and merged 2 PRs", "Planned the week ahead"],
    affirmation: "Calm is a superpower I choose every day.",
    tomorrowPlan: "Start the day with journaling, finish the blog draft, evening yoga.",
    sleepTime: "23:10",
  },
  {
    date: "2026-04-13",
    mood: { emoji: "😤", label: "Focused" },
    wakeUpTime: "05:30",
    energyLevel: 95,
    overallRating: 88,
    summary: "Deep work block from 9am to 1pm. Phone off, inbox closed. Wrote 2,000 words and shipped a feature.",
    wins: ["4-hour deep work session", "Wrote 2000 words", "Shipped the auth feature"],
    mistakes: ["Forgot to hydrate until 2pm", "Cancelled evening workout"],
    insight: "When you eliminate options, focus becomes inevitable.",
    distractions: ["Checking analytics too often interrupted the writing rhythm."],
    gratitude: ["Grateful for uninterrupted time", "Thankful for the energy to push through"],
    achievement: ["Delivered auth module", "Completed sprint goal 2 days early"],
    affirmation: "I do my best work when I eliminate noise and go deep.",
    tomorrowPlan: "Light day — review, rest, and prep for the weekend.",
    sleepTime: "22:30",
  },
  {
    date: "2026-04-12",
    mood: { emoji: "😰", label: "Anxious" },
    wakeUpTime: "07:15",
    energyLevel: 38,
    overallRating: 45,
    summary: "Felt scattered today. Need to go back to basics — one task at a time. Tomorrow will be better.",
    wins: ["Showed up despite feeling off", "Completed one important task"],
    mistakes: ["Multitasked and finished nothing properly", "Let anxiety drive decisions"],
    insight: "When overwhelmed, narrow the focus to one thing only.",
    distractions: ["Jumping between tabs and unfinished tasks scattered my attention.", "Overthinking the task order instead of starting."],
    gratitude: ["Grateful that today is over", "Thankful for the ability to start fresh tomorrow"],
    achievement: ["Sent the client report", "Cleared pending notifications"],
    affirmation: "I can reset at any moment. Tomorrow is a clean slate.",
    tomorrowPlan: "Single task focus all day. No multitasking. Phone away.",
    sleepTime: "00:05",
  },
  {
    date: "2026-04-11",
    mood: { emoji: "🙏", label: "Grateful" },
    wakeUpTime: "06:00",
    energyLevel: 76,
    overallRating: 82,
    summary: "Grateful for the consistency and small wins. Wrote a letter to my future self.",
    wins: ["Maintained 7-day streak", "Wrote a letter to future self", "Evening run completed"],
    mistakes: ["Spent too long on low-priority tasks", "Skipped breakfast"],
    insight: "Gratitude is not just a feeling — it's a practice that rewires how you see the world.",
    distractions: ["Low-priority admin tasks expanded and ate up the afternoon."],
    gratitude: ["Grateful for 7 days of consistency", "Thankful for good health and a clear mind"],
    achievement: ["7-day journal streak", "Completed weekly report"],
    affirmation: "Every small consistent action is building the person I want to become.",
    tomorrowPlan: "Morning meditation, DSA practice, team standup, evening walk.",
    sleepTime: "22:55",
  },
];

function EntryModal({ entry, onClose }) {
  const energyLabel =
    entry.energyLevel >= 80 ? "Fully charged 🔋"
    : entry.energyLevel >= 50 ? "Decent energy ⚡"
    : entry.energyLevel >= 30 ? "Running low 😮‍💨"
    : "Drained 😴";

  const ratingLabel =
    entry.overallRating >= 80 ? "Exceptional day 🌟"
    : entry.overallRating >= 60 ? "Solid day 👍"
    : entry.overallRating >= 40 ? "Average day 🤝"
    : "Rough day, but you showed up 💪";

  const formattedDate = new Date(entry.date).toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto p-4 sm:p-6 md:p-8" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <div
        className="relative z-10 my-4 w-full max-w-2xl overflow-hidden rounded-2xl border border-amber-100/15 bg-[linear-gradient(160deg,#1e1208,#120d0c)] shadow-2xl shadow-black/60 sm:my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-amber-100/10 bg-[#1c1007] px-5 py-4 sm:px-6">
          <div>
            <p className="text-sm font-bold text-amber-200">📔 Journal Entry</p>
            <p className="mt-0.5 text-xs text-stone-500">{formattedDate}</p>
          </div>
          <button type="button" onClick={onClose}
            className="rounded-full border border-amber-100/10 bg-white/5 p-1.5 text-stone-400 transition hover:border-amber-400/30 hover:text-amber-300">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="journal-scroll max-h-[calc(100dvh-8rem)] space-y-6 overflow-y-auto p-4 sm:max-h-[calc(100dvh-11rem)] sm:p-6">

          {/* Mood + Wake-up + Energy */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-amber-300/70">😊 Mood</p>
            <div className="dashboard-glow-card flex items-center gap-2 rounded-xl border border-amber-400/20 bg-amber-500/10 px-4 py-3">
                <span className="text-2xl">{entry.mood.emoji}</span>
                <span className="text-sm font-semibold text-amber-200">{entry.mood.label}</span>
              </div>
            </div>
            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-amber-300/70">🌅 Wake-up Time</p>
              <div className="dashboard-glow-card rounded-xl border border-amber-100/10 bg-white/5 px-4 py-3 text-center">
                <p className="text-2xl font-bold text-amber-200">{entry.wakeUpTime || "--:--"}</p>
                <p className="mt-1 text-xs text-stone-400">Morning start</p>
              </div>
            </div>
            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-amber-300/70">⚡ Energy Level</p>
              <div className="dashboard-glow-card rounded-xl border border-amber-100/10 bg-white/5 px-4 py-3 text-center">
                <p className="text-3xl font-bold text-amber-200">{entry.energyLevel}</p>
                <p className="mt-1 text-xs text-stone-400">{energyLabel}</p>
              </div>
            </div>
          </div>

          <div className="border-t border-amber-100/8" />

          {/* Summary */}
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-amber-300/70">📝 Summary</p>
            <p className="dashboard-glow-card rounded-xl border border-amber-100/10 bg-white/5 px-4 py-3 text-sm leading-relaxed text-stone-300">{entry.summary}</p>
          </div>

          {/* Wins */}
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-amber-300/70">✅ Wins</p>
            <ul className="space-y-2">
              {entry.wins.map((w, i) => (
                <li key={i} className="dashboard-glow-card flex items-start gap-2 rounded-xl border border-emerald-400/15 bg-emerald-500/8 px-4 py-2.5 text-sm text-stone-200">
                  <span className="mt-0.5 shrink-0 font-bold text-emerald-400">{i + 1}.</span>{w}
                </li>
              ))}
            </ul>
          </div>

          {/* Mistakes */}
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-amber-300/70">❌ Mistakes</p>
            <ul className="space-y-2">
              {entry.mistakes.map((m, i) => (
                <li key={i} className="dashboard-glow-card flex items-start gap-2 rounded-xl border border-red-400/15 bg-red-500/8 px-4 py-2.5 text-sm text-stone-200">
                  <span className="mt-0.5 shrink-0 font-bold text-red-400">{i + 1}.</span>{m}
                </li>
              ))}
            </ul>
          </div>

          {/* Insight */}
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-amber-300/70">💡 Lesson of the Day</p>
            <p className="dashboard-glow-card rounded-xl border border-amber-100/10 bg-white/5 px-4 py-3 text-sm leading-relaxed text-stone-300">{entry.insight}</p>
          </div>

          {/* Distraction */}
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-amber-300/70">🚫 Biggest Distraction</p>
            <ul className="space-y-2">
              {(entry.distractions || [entry.distraction]).filter(Boolean).map((item, i) => (
                <li key={i} className="dashboard-glow-card flex items-start gap-2 rounded-xl border border-red-400/15 bg-red-500/8 px-4 py-2.5 text-sm text-stone-200">
                  <span className="mt-0.5 shrink-0 font-bold text-red-400">{i + 1}.</span>{item}
                </li>
              ))}
            </ul>
          </div>

          {/* Gratitude + Achievement */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-amber-300/70">🙏 Gratitude</p>
              <ul className="space-y-2">
                {entry.gratitude.map((g, i) => (
                  <li key={i} className="rounded-xl border border-amber-100/10 bg-white/5 px-3 py-2 text-xs text-stone-300">🙏 {g}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-amber-300/70">🏆 Achievement</p>
              <ul className="space-y-2">
                {entry.achievement.map((a, i) => (
                  <li key={i} className="rounded-xl border border-amber-100/10 bg-white/5 px-3 py-2 text-xs text-stone-300">🏆 {a}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Affirmation */}
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-amber-300/70">💬 Affirmation</p>
            <p className="rounded-2xl border border-amber-400/20 bg-amber-500/8 px-5 py-4 text-center text-sm italic text-amber-100/80">
              &ldquo;{entry.affirmation}&rdquo;
            </p>
          </div>

          {/* Tomorrow Plan */}
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-amber-300/70">📅 Tomorrow&apos;s Plan</p>
            <p className="rounded-xl border border-amber-100/10 bg-white/5 px-4 py-3 text-sm leading-relaxed text-stone-300">{entry.tomorrowPlan}</p>
          </div>

          {/* Sleep Time */}
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-amber-300/70">😴 Sleep Time</p>
            <div className="rounded-xl border border-amber-100/10 bg-white/5 px-4 py-3 text-center">
              <p className="text-3xl font-bold text-amber-200">{entry.sleepTime || "--:--"}</p>
              <p className="mt-1 text-xs text-stone-400">Planned rest window</p>
            </div>
          </div>

          {/* Overall Rating */}
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-amber-300/70">⭐ Overall Day Rating</p>
            <div className="rounded-xl border border-amber-100/10 bg-white/5 px-4 py-3 text-center">
              <p className="text-4xl font-bold text-amber-200">{entry.overallRating}</p>
              <p className="mt-1 text-xs text-stone-400">{ratingLabel}</p>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-400 transition-all duration-500"
                  style={{ width: `${entry.overallRating}%` }} />
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>,
    document.body,
  );
}

export default function JournalRightSidebar() {
  const [modalEntry, setModalEntry] = useState(null);

  return (
    <>
      <div className="space-y-4">

        {/* Weekly Analysis */}
        {(() => {
          const entries = MOCK_HISTORY;
          const count = entries.length;

          // Top mood
          const moodFreq = {};
          entries.forEach((e) => {
            const key = e.mood.label;
            moodFreq[key] = (moodFreq[key] || { count: 0, emoji: e.mood.emoji });
            moodFreq[key].count += 1;
          });
          const topMood = Object.entries(moodFreq).sort((a, b) => b[1].count - a[1].count)[0];

          const avgEnergy   = Math.round(entries.reduce((s, e) => s + e.energyLevel, 0) / count);
          const totalWins   = entries.reduce((s, e) => s + e.wins.length, 0);
          const totalMistakes = entries.reduce((s, e) => s + e.mistakes.length, 0);
          const totalAchievements = entries.reduce((s, e) => s + e.achievement.length, 0);
          const avgRating   = Math.round(entries.reduce((s, e) => s + e.overallRating, 0) / count);

          const stats = [
            { icon: "⚡", label: "Avg Energy",      value: avgEnergy,         color: "text-amber-300" },
            { icon: "⭐", label: "Avg Day Rating",   value: avgRating,         color: "text-yellow-300" },
            { icon: "✅", label: "Total Wins",       value: totalWins,         color: "text-emerald-400" },
            { icon: "❌", label: "Total Mistakes",   value: totalMistakes,     color: "text-red-400" },
            { icon: "🏆", label: "Achievements",     value: totalAchievements, color: "text-amber-400" },
            { icon: "📓", label: "Days Logged",      value: count,             color: "text-stone-300" },
          ];

          return (
            <section className="rounded-2xl border border-amber-100/10 bg-white/6 p-4 shadow-xl shadow-black/25 backdrop-blur">
              <div className="mb-3 flex items-center gap-2">
                <span className="text-sm">📈</span>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-300/80">
                  Current Week Analysis
                </p>
              </div>

              {/* Top Mood banner */}
              <div className="mb-3 flex items-center justify-between rounded-xl border border-amber-400/20 bg-amber-500/10 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-300/70">Top Mood</p>
                <p className="text-xs font-bold text-amber-200">
                  {topMood[1].emoji} {topMood[0]}
                </p>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-2">
                {stats.map((s, i) => (
                  <Motion.div
                    key={s.label}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.07, duration: 0.3 }}
                    whileHover={{ y: -2, boxShadow: "0 8px 20px rgba(0,0,0,0.35)" }}
                    className="min-h-[50px] rounded-xl border border-amber-100/8 bg-stone-950/40 px-3 py-2"
                  >
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="text-xs leading-none">{s.icon}</span>
                      <p className={`text-sm font-bold leading-none ${s.color}`}>{s.value}</p>
                    </div>
                    <p className="whitespace-nowrap text-[7px] font-semibold uppercase leading-none tracking-[0.02em] text-stone-500">
                      {s.label}
                    </p>
                  </Motion.div>
                ))}
              </div>
            </section>
          );
        })()}

        {/* Past Entries */}
        <section className="rounded-2xl border border-amber-100/10 bg-white/6 p-5 shadow-xl shadow-black/25 backdrop-blur">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-base">📖</span>
            <p className="text-label-md">Past Entries</p>
          </div>

          <div className="h-[47vh] overflow-y-auto space-y-3 pr-1 journal-scroll xl:h-[47vh]">
            {MOCK_HISTORY.map((item, i) => {
              const formattedDate = new Date(item.date).toLocaleDateString("en-US", {
                month: "short", day: "numeric", weekday: "short",
              });

              return (
                <Motion.div
                  key={item.date}
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06, duration: 0.25 }}
                  whileHover={{ y: -2 }}
                  className="rounded-xl border border-amber-100/10 bg-stone-950/45 p-3 transition-colors duration-200 hover:border-amber-400/20"
                >

                  {/* Date + mood */}
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-stone-500">{formattedDate}</p>
                    <span className="flex items-center gap-1 rounded-full border border-amber-400/20 bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-300">
                      {item.mood.emoji} {item.mood.label}
                    </span>
                  </div>

                  {/* Stats row */}
                  <div className="mt-2 flex items-center gap-3 text-[11px] text-stone-500">
                    <span>🌅 {item.wakeUpTime}</span>
                    <span>⚡ {item.energyLevel}</span>
                    <span>⭐ {item.overallRating}</span>
                    <span>😴 {item.sleepTime}</span>
                    <span>✅ {item.wins.length} wins</span>
                  </div>

                  {/* Summary preview */}
                  <p className="mt-2 text-xs leading-relaxed text-stone-400">
                    {item.summary.length > 75 ? item.summary.slice(0, 75) + "…" : item.summary}
                  </p>

                  <button type="button" onClick={() => setModalEntry(item)}
                    className="mt-1.5 text-xs font-semibold text-amber-500 transition hover:text-amber-300">
                    See full entry ↓
                  </button>
                </Motion.div>
              );
            })}
          </div>
        </section>

      </div>

      {modalEntry && <EntryModal entry={modalEntry} onClose={() => setModalEntry(null)} />}
    </>
  );
}
