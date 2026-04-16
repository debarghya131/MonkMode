import { useState } from "react";
import JournalRightSidebar from "./JournalRightSidebar";

const MOODS = [
  { emoji: "🔥", label: "Motivated" },
  { emoji: "😊", label: "Happy" },
  { emoji: "😌", label: "Calm" },
  { emoji: "😐", label: "Neutral" },
  { emoji: "😔", label: "Sad" },
  { emoji: "😰", label: "Anxious" },
  { emoji: "😤", label: "Focused" },
  { emoji: "😴", label: "Tired" },
  { emoji: "🤩", label: "Excited" },
  { emoji: "🙏", label: "Grateful" },
  { emoji: "✨", label: "Inspired" },
  { emoji: "😣", label: "Frustrated" },
  { emoji: "🥺", label: "Overwhelmed" },
  { emoji: "💪", label: "Strong" },
  { emoji: "🧘", label: "Peaceful" },
  { emoji: "😒", label: "Bored" },
  { emoji: "😎", label: "Confident" },
  { emoji: "🤔", label: "Curious" },
  { emoji: "🥲", label: "Emotional" },
  { emoji: "🤗", label: "Content" },
];

const MANDATORY_STEPS = [
  { id: 1,  icon: "😊", label: "Mood"        },
  { id: 2,  icon: "⚡", label: "Energy"      },
  { id: 3,  icon: "📝", label: "Summary"     },
  { id: 4,  icon: "✅", label: "Wins"        },
  { id: 5,  icon: "❌", label: "Mistakes"    },
  { id: 6,  icon: "💡", label: "Insight"     },
  { id: 7,  icon: "🙏", label: "Gratitude"   },
  { id: 8,  icon: "🏆", label: "Achievement" },
  { id: 9,  icon: "💬", label: "Affirmation" },
  { id: 10, icon: "📅", label: "Tomorrow"    },
  { id: 11, icon: "⭐", label: "Rating"      },
];

const INITIAL_FORM = {
  mood:           null,
  energyLevel:    50,
  energyTouched:  false,
  summary:        "",
  wins:           ["", "", ""],
  mistakes:       ["", "", ""],
  insight:        "",
  gratitude:      ["", ""],
  achievement:    ["", ""],
  affirmation:    "",
  tomorrowPlan:   "",
  overallRating:  50,
  ratingTouched:  false,
};

/* ── shared style tokens ── */
const inputBase =
  "w-full rounded-xl border border-amber-100/10 bg-stone-950/45 px-4 py-3 text-sm text-amber-50/90 placeholder-stone-500 outline-none transition focus:border-amber-400/40 focus:shadow-[0_0_12px_rgba(251,191,36,0.08)]";

const textareaBase =
  "w-full resize-none rounded-2xl border border-amber-100/10 bg-stone-950/45 px-5 py-4 text-sm text-amber-50/90 placeholder-stone-500 outline-none transition focus:border-amber-400/40 focus:shadow-[0_0_20px_rgba(251,191,36,0.1)]";

const btnPrimary =
  "rounded-full border border-amber-100/15 bg-white/8 px-6 py-2.5 text-sm font-semibold text-amber-50 transition duration-300 hover:-translate-y-0.5 hover:border-amber-200/50 hover:bg-gradient-to-r hover:from-amber-200 hover:via-yellow-300 hover:to-orange-300 hover:text-stone-950 hover:shadow-[0_0_28px_rgba(251,191,36,0.45)] disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:translate-y-0 disabled:hover:bg-transparent disabled:hover:border-amber-100/15 disabled:hover:text-amber-50 disabled:hover:shadow-none";

/* ── Journal View Modal ───────────────────────────────────────────────────── */
function Section({ icon, title, children }) {
  return (
    <div>
      <p className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-amber-300/70">
        <span>{icon}</span>{title}
      </p>
      {children}
    </div>
  );
}

function JournalViewModal({ form, customFields, date, onClose }) {
  const moodObj = MOODS.find((m) => m.label === form.mood);

  const energyLabel =
    form.energyLevel >= 80 ? "Fully charged 🔋"
    : form.energyLevel >= 50 ? "Decent energy ⚡"
    : form.energyLevel >= 30 ? "Running low 😮‍💨"
    : "Drained 😴";

  const ratingLabel =
    form.overallRating >= 80 ? "Exceptional day 🌟"
    : form.overallRating >= 60 ? "Solid day 👍"
    : form.overallRating >= 40 ? "Average day 🤝"
    : "Rough day, but you showed up 💪";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <div
        className="relative z-10 my-8 w-full max-w-2xl rounded-2xl border border-amber-100/15 bg-[linear-gradient(160deg,#1e1208,#120d0c)] shadow-2xl shadow-black/60"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky header */}
        <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-2xl border-b border-amber-100/10 bg-[#1c1007] px-6 py-4">
          <div>
            <p className="text-sm font-bold text-amber-200">📔 Journal Entry</p>
            <p className="mt-0.5 text-xs text-stone-500">{date}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-amber-100/10 bg-white/5 p-1.5 text-stone-400 transition hover:border-amber-400/30 hover:text-amber-300"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="journal-scroll max-h-[78vh] space-y-6 overflow-y-auto p-6">

          {/* Mood + Energy row */}
          <div className="grid grid-cols-2 gap-4">
            <Section icon="😊" title="Mood">
              {form.mood ? (
                <div className="flex items-center gap-2 rounded-xl border border-amber-400/20 bg-amber-500/10 px-4 py-3">
                  <span className="text-2xl">{moodObj?.emoji}</span>
                  <span className="text-sm font-semibold text-amber-200">{form.mood}</span>
                </div>
              ) : <p className="text-xs text-stone-500">Not answered</p>}
            </Section>

            <Section icon="⚡" title="Energy Level">
              <div className="rounded-xl border border-amber-100/10 bg-white/5 px-4 py-3 text-center">
                <p className="text-3xl font-bold text-amber-200">{form.energyLevel}</p>
                <p className="mt-1 text-xs text-stone-400">{energyLabel}</p>
              </div>
            </Section>
          </div>

          <div className="border-t border-amber-100/8" />

          {/* Summary */}
          <Section icon="📝" title="Summary">
            <p className="rounded-xl border border-amber-100/10 bg-white/5 px-4 py-3 text-sm leading-relaxed text-stone-300">
              {form.summary || <span className="text-stone-600">Not answered</span>}
            </p>
          </Section>

          {/* Wins */}
          <Section icon="✅" title="Wins">
            <ul className="space-y-2">
              {form.wins.filter((w) => w.trim()).map((w, i) => (
                <li key={i} className="flex items-start gap-2 rounded-xl border border-emerald-400/15 bg-emerald-500/8 px-4 py-2.5 text-sm text-stone-200">
                  <span className="mt-0.5 text-emerald-400 font-bold shrink-0">{i + 1}.</span>{w}
                </li>
              ))}
              {form.wins.every((w) => !w.trim()) && <p className="text-xs text-stone-600">Not answered</p>}
            </ul>
          </Section>

          {/* Mistakes */}
          <Section icon="❌" title="Mistakes">
            <ul className="space-y-2">
              {form.mistakes.filter((m) => m.trim()).map((m, i) => (
                <li key={i} className="flex items-start gap-2 rounded-xl border border-red-400/15 bg-red-500/8 px-4 py-2.5 text-sm text-stone-200">
                  <span className="mt-0.5 text-red-400 font-bold shrink-0">{i + 1}.</span>{m}
                </li>
              ))}
              {form.mistakes.every((m) => !m.trim()) && <p className="text-xs text-stone-600">Not answered</p>}
            </ul>
          </Section>

          {/* Insight */}
          <Section icon="💡" title="Lesson of the Day">
            <p className="rounded-xl border border-amber-100/10 bg-white/5 px-4 py-3 text-sm leading-relaxed text-stone-300">
              {form.insight || <span className="text-stone-600">Not answered</span>}
            </p>
          </Section>

          {/* Gratitude + Achievement row */}
          <div className="grid grid-cols-2 gap-4">
            <Section icon="🙏" title="Gratitude">
              <ul className="space-y-2">
                {form.gratitude.filter((g) => g.trim()).map((g, i) => (
                  <li key={i} className="rounded-xl border border-amber-100/10 bg-white/5 px-3 py-2 text-xs text-stone-300">🙏 {g}</li>
                ))}
                {form.gratitude.every((g) => !g.trim()) && <p className="text-xs text-stone-600">Not answered</p>}
              </ul>
            </Section>

            <Section icon="🏆" title="Achievement">
              <ul className="space-y-2">
                {form.achievement.filter((a) => a.trim()).map((a, i) => (
                  <li key={i} className="rounded-xl border border-amber-100/10 bg-white/5 px-3 py-2 text-xs text-stone-300">🏆 {a}</li>
                ))}
                {form.achievement.every((a) => !a.trim()) && <p className="text-xs text-stone-600">Not answered</p>}
              </ul>
            </Section>
          </div>

          {/* Affirmation */}
          <Section icon="💬" title="Affirmation">
            <p className="rounded-2xl border border-amber-400/20 bg-amber-500/8 px-5 py-4 text-center text-sm italic text-amber-100/80">
              {form.affirmation ? `"${form.affirmation}"` : <span className="text-stone-600 not-italic">Not answered</span>}
            </p>
          </Section>

          {/* Tomorrow Plan */}
          <Section icon="📅" title="Tomorrow's Plan">
            <p className="rounded-xl border border-amber-100/10 bg-white/5 px-4 py-3 text-sm leading-relaxed text-stone-300">
              {form.tomorrowPlan || <span className="text-stone-600">Not answered</span>}
            </p>
          </Section>

          {/* Overall Rating */}
          <Section icon="⭐" title="Overall Day Rating">
            <div className="rounded-xl border border-amber-100/10 bg-white/5 px-4 py-3 text-center">
              <p className="text-4xl font-bold text-amber-200">{form.overallRating}</p>
              <p className="mt-1 text-xs text-stone-400">{ratingLabel}</p>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-400 transition-all duration-500"
                  style={{ width: `${form.overallRating}%` }} />
              </div>
            </div>
          </Section>

          {/* Custom fields */}
          {customFields.length > 0 && (
            <>
              <div className="border-t border-amber-100/8" />
              {customFields.map((cf, i) => (
                <Section key={i} icon="✏️" title={cf.title || `Custom ${i + 1}`}>
                  {cf.description && <p className="mb-2 text-xs text-stone-500">{cf.description}</p>}
                  <p className="rounded-xl border border-amber-100/10 bg-white/5 px-4 py-3 text-sm leading-relaxed text-stone-300">
                    {cf.answer || <span className="text-stone-600">Not answered</span>}
                  </p>
                </Section>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Journal() {
  const [step, setStep]               = useState(1);
  const [form, setForm]               = useState(INITIAL_FORM);
  const [customFields, setCustomFields] = useState([]);
  const [submitted, setSubmitted]       = useState(false);
  const [submittedDate, setSubmittedDate] = useState(null);
  const [showJournalView, setShowJournalView] = useState(false);

  const streak = 7;

  const todayStr = () => new Date().toISOString().slice(0, 10);

  /* ── derived ── */
  const totalSteps  = 11 + customFields.length;
  const isCustom    = step > 11;
  const customIdx   = step - 12; // 0-based index into customFields

  /* ── all steps for the progress bar ── */
  const allSteps = [
    ...MANDATORY_STEPS,
    ...customFields.map((cf, i) => ({
      id:    12 + i,
      icon:  "✏️",
      label: cf.title.trim() || `Custom ${i + 1}`,
    })),
  ];

  /* ── form helpers ── */
  const set = (key, val) => setForm((p) => ({ ...p, [key]: val }));

  const setArr = (key, idx, val) =>
    setForm((p) => {
      const arr = [...p[key]];
      arr[idx] = val;
      return { ...p, [key]: arr };
    });

  const addToArr = (key) =>
    setForm((p) => ({ ...p, [key]: [...p[key], ""] }));

  const removeFromArr = (key, idx) =>
    setForm((p) => ({ ...p, [key]: p[key].filter((_, i) => i !== idx) }));

  const updateCustom = (idx, key, val) =>
    setCustomFields((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [key]: val };
      return next;
    });

  /* ── add / delete custom field ── */
  const addCustomField = () => {
    setCustomFields((prev) => [...prev, { title: "", description: "", answer: "" }]);
    setStep(12 + customFields.length); // jump to the new step
  };

  const deleteCustomField = (idx) => {
    setCustomFields((prev) => prev.filter((_, i) => i !== idx));
    // if we were on or after the deleted step, move back one
    if (step >= 12 + idx) setStep((s) => Math.max(1, s - 1));
  };

  /* ── step validation ── */
  const stepValid = () => {
    if (isCustom) {
      const cf = customFields[customIdx];
      return cf && cf.title.trim().length > 0 && cf.answer.trim().length > 0;
    }
    switch (step) {
      case 1:  return !!form.mood;
      case 2:  return form.energyTouched;
      case 3:  return form.summary.trim().length > 0;
      case 4:  return form.wins.some((w) => w.trim());
      case 5:  return form.mistakes.some((m) => m.trim());
      case 6:  return form.insight.trim().length > 0;
      case 7:  return form.gratitude.some((g) => g.trim());
      case 8:  return form.achievement.some((a) => a.trim());
      case 9:  return form.affirmation.trim().length > 0;
      case 10: return form.tomorrowPlan.trim().length > 0;
      case 11: return form.ratingTouched;
      default: return false;
    }
  };

  const isLastStep = step === totalSteps;

  /* ── per-step completion (answer-based, not position-based) ── */
  const isStepComplete = (id) => {
    if (id > 11) {
      const cf = customFields[id - 12];
      return cf && cf.title.trim().length > 0 && cf.answer.trim().length > 0;
    }
    switch (id) {
      case 1:  return !!form.mood;
      case 2:  return form.energyTouched;
      case 3:  return form.summary.trim().length > 0;
      case 4:  return form.wins.some((w) => w.trim());
      case 5:  return form.mistakes.some((m) => m.trim());
      case 6:  return form.insight.trim().length > 0;
      case 7:  return form.gratitude.some((g) => g.trim());
      case 8:  return form.achievement.some((a) => a.trim());
      case 9:  return form.affirmation.trim().length > 0;
      case 10: return form.tomorrowPlan.trim().length > 0;
      case 11: return form.ratingTouched;
      default: return false;
    }
  };

  const completedCount = allSteps.filter((s) => isStepComplete(s.id)).length;
  const allComplete    = completedCount === totalSteps;

  /* ─────────── submitted screen ─────────── */
  if (submitted) {
    const canEditToday = submittedDate === todayStr();

    return (
      <div className="flex gap-6">
        <div className="flex-1 min-w-0 flex flex-col items-center justify-center py-24 space-y-5">
          <div className="text-7xl">🎉</div>
          <h2 className="text-heading-xl text-center">Day Logged!</h2>
          <p className="text-sm text-stone-400 text-center max-w-sm leading-relaxed">
            Your journal entry has been saved. Come back tomorrow and keep that streak alive.
          </p>

          {/* Editable-today badge */}
          <div className={`flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold ${
            canEditToday
              ? "border-amber-400/30 bg-amber-500/10 text-amber-300"
              : "border-stone-700 bg-stone-900/50 text-stone-500"
          }`}>
            <span className={`h-1.5 w-1.5 rounded-full ${canEditToday ? "bg-amber-400" : "bg-stone-600"}`} />
            {canEditToday ? "Editable until midnight" : "Locked — entry moved to history"}
          </div>

          <div className="flex items-center gap-3 mt-2">
            {/* See Journal */}
            <button
              type="button"
              onClick={() => setShowJournalView(true)}
              className="flex items-center gap-2 rounded-full border border-stone-600 bg-white/5 px-5 py-2.5 text-sm font-semibold text-stone-300 transition duration-200 hover:border-stone-400 hover:text-stone-100"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              See Journal
            </button>

            {/* Edit — only available on the same day */}
            {canEditToday && (
              <button
                type="button"
                onClick={() => { setSubmitted(false); setStep(1); }}
                className="flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-500/10 px-5 py-2.5 text-sm font-semibold text-amber-300 transition duration-200 hover:border-amber-400/60 hover:bg-amber-500/20 hover:text-amber-200"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Edit Today's Entry
              </button>
            )}
          </div>
        </div>

        <div className="w-64 shrink-0">
          <div className="sticky top-0">
            <JournalRightSidebar />
          </div>
        </div>

        {showJournalView && (
          <JournalViewModal
            form={form}
            customFields={customFields}
            date={new Date(submittedDate).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
            onClose={() => setShowJournalView(false)}
          />
        )}
      </div>
    );
  }

  /* ─────────── main wizard ─────────── */
  return (
    <div className="flex gap-6">
      <div className="flex-1 min-w-0 space-y-5">

        {/* Streak badge */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-500/10 px-4 py-2">
            <span className="text-lg">🔥</span>
            <span className="text-sm font-semibold text-amber-300">{streak} day streak</span>
          </div>
          <p className="text-sm text-stone-400">Keep it up — consistency builds clarity.</p>
        </div>

        {/* ── Progress bar ── */}
        <section className="rounded-2xl border border-amber-100/10 bg-white/6 p-5 shadow-xl shadow-black/25 backdrop-blur">

          {/* Header row */}
          <div className="flex items-center justify-between mb-3 gap-3">
            <p className="text-label-md truncate">
              Step {step} of {totalSteps} &mdash; {allSteps[step - 1]?.label}
            </p>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-xs text-stone-500">
                {completedCount}/{totalSteps} answered
              </span>
              {/* Add custom field button */}
              <button
                type="button"
                onClick={addCustomField}
                title="Add a custom field"
                className="flex items-center gap-1.5 rounded-full border border-amber-400/25 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300 transition hover:border-amber-400/50 hover:bg-amber-500/20 hover:text-amber-200"
              >
                <span className="text-sm leading-none">+</span> Add Field
              </button>
            </div>
          </div>

          {/* Segment track */}
          <div className="flex gap-1">
            {allSteps.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setStep(s.id)}
                title={s.label}
                className={`flex-1 h-2 rounded-full transition-all duration-300 ${
                  s.id === step && isStepComplete(s.id)
                    ? "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.55)]"
                    : s.id === step
                    ? "bg-amber-400/50 shadow-[0_0_6px_rgba(251,191,36,0.3)]"
                    : isStepComplete(s.id)
                    ? "bg-gradient-to-r from-amber-400 to-orange-400"
                    : s.id > 11
                    ? "bg-indigo-900/60 hover:bg-indigo-800/60"
                    : "bg-stone-800 hover:bg-stone-700"
                }`}
              />
            ))}
          </div>

          {/* Icon row */}
          <div className="flex mt-2">
            {allSteps.map((s) => (
              <div key={s.id} className="flex-1 flex justify-center">
                <span
                  className={`text-[11px] leading-none transition-opacity duration-200 select-none ${
                    s.id === step ? "opacity-100" : "opacity-20"
                  }`}
                >
                  {s.icon}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* ── Step content ── */}
        <section className="journal-step-card rounded-2xl border border-amber-100/10 bg-white/6 p-6 shadow-2xl shadow-black/25 backdrop-blur">

          {/* ── Mandatory steps 1–11 ── */}
          <div className="journal-scroll journal-step-body pr-1">

          {/* Step 1 — Mood */}
          {step === 1 && (
            <div className="flex-1 flex flex-col">
              <p className="text-label-lg">Step 1 · Mood</p>
              <h2 className="text-heading-xl mt-1 mb-5">How are you feeling?</h2>
              <div className="grid grid-cols-4 gap-2">
                {MOODS.map((mood) => (
                  <button
                    key={mood.label}
                    type="button"
                    onClick={() => set("mood", mood.label)}
                    className={`flex flex-col items-center gap-1 rounded-xl border p-2.5 transition-all duration-200 ${
                      form.mood === mood.label
                        ? "border-amber-400/60 bg-amber-500/20 shadow-[0_0_16px_rgba(251,191,36,0.2)]"
                        : "border-amber-100/10 bg-stone-950/45 hover:border-amber-400/30 hover:bg-amber-500/10"
                    }`}
                  >
                    <span className="text-lg">{mood.emoji}</span>
                    <span className="text-[10px] font-medium text-amber-50/70">{mood.label}</span>
                  </button>
                ))}
              </div>
              {form.mood && (
                <p className="mt-4 text-sm text-stone-400">
                  Selected: {MOODS.find((m) => m.label === form.mood)?.emoji} {form.mood}
                </p>
              )}
            </div>
          )}

          {/* Step 2 — Energy Level */}
          {step === 2 && (
            <div className="flex-1 flex flex-col justify-center gap-2">
              <p className="text-label-lg">Step 2 · Energy Level</p>
              <h2 className="text-heading-xl mt-1">How charged are you?</h2>
              <p className="text-stone-400 text-sm mb-8">
                Rate your physical &amp; mental energy from 1 to 100.
              </p>
              <div className="flex items-center gap-4">
                <span className="text-stone-500 text-xs w-4">1</span>
                <input
                  type="range" min="1" max="100"
                  value={form.energyLevel}
                  onChange={(e) => { set("energyLevel", Number(e.target.value)); set("energyTouched", true); }}
                  className="flex-1 h-2 cursor-pointer accent-amber-400"
                />
                <span className="text-stone-500 text-xs w-8 text-right">100</span>
              </div>
              <div className="mt-6 text-center">
                <span className="text-heading-xl text-7xl">{form.energyLevel}</span>
                <p className="text-stone-400 text-sm mt-3">
                  {form.energyLevel >= 80 ? "Fully charged 🔋"
                    : form.energyLevel >= 50 ? "Decent energy ⚡"
                    : form.energyLevel >= 30 ? "Running low 😮‍💨"
                    : "Drained 😴"}
                </p>
              </div>
            </div>
          )}

          {/* Step 3 — Summary */}
          {step === 3 && (
            <div className="flex-1 flex flex-col">
              <p className="text-label-lg">Step 3 · Summary</p>
              <h2 className="text-heading-xl mt-1 mb-2">What happened today?</h2>
              <p className="text-stone-400 text-sm mb-5">Short summary — just facts, no overthinking.</p>
              <textarea
                value={form.summary}
                onChange={(e) => set("summary", e.target.value)}
                placeholder="Today I woke up at 6am, completed my workout, had a productive deep-work session…"
                rows={7}
                className={textareaBase + " flex-1"}
              />
              <p className="mt-2 text-xs text-stone-500 text-right">{form.summary.length} chars</p>
            </div>
          )}

          {/* Step 4 — Wins */}
          {step === 4 && (
            <div className="flex-1 flex flex-col">
              <p className="text-label-lg">Step 4 · Wins</p>
              <h2 className="text-heading-xl mt-1 mb-2">What went RIGHT?</h2>
              <p className="text-stone-400 text-sm mb-6">2–3 things you did well today. Own your progress.</p>
              <div className="space-y-3">
                {form.wins.map((win, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-amber-400 text-sm font-bold w-5 shrink-0 text-center">{i + 1}.</span>
                    <input
                      type="text" value={win}
                      onChange={(e) => setArr("wins", i, e.target.value)}
                      placeholder={`Win #${i + 1}…`}
                      className={inputBase}
                    />
                    {form.wins.length > 1 && (
                      <button type="button" onClick={() => removeFromArr("wins", i)}
                        className="shrink-0 flex items-center justify-center h-8 w-8 rounded-full border border-amber-100/10 bg-white/5 text-stone-500 transition hover:border-red-400/30 hover:bg-red-500/10 hover:text-red-400">
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => addToArr("wins")}
                className="mt-4 self-start flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-500/8 px-4 py-1.5 text-xs font-semibold text-amber-400/80 transition hover:border-amber-400/40 hover:bg-amber-500/15 hover:text-amber-300">
                <span className="text-sm leading-none">+</span> Add Win
              </button>
            </div>
          )}

          {/* Step 5 — Mistakes */}
          {step === 5 && (
            <div className="flex-1 flex flex-col">
              <p className="text-label-lg">Step 5 · Mistakes</p>
              <h2 className="text-heading-xl mt-1 mb-2">What went WRONG?</h2>
              <p className="text-stone-400 text-sm mb-6">2–3 things you messed up. Honesty is how you grow.</p>
              <div className="space-y-3">
                {form.mistakes.map((m, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-red-400 text-sm font-bold w-5 shrink-0 text-center">{i + 1}.</span>
                    <input
                      type="text" value={m}
                      onChange={(e) => setArr("mistakes", i, e.target.value)}
                      placeholder={`Mistake #${i + 1}…`}
                      className="w-full rounded-xl border border-red-400/15 bg-stone-950/45 px-4 py-3 text-sm text-amber-50/90 placeholder-stone-500 outline-none transition focus:border-red-400/30 focus:shadow-[0_0_12px_rgba(248,113,113,0.08)]"
                    />
                    {form.mistakes.length > 1 && (
                      <button type="button" onClick={() => removeFromArr("mistakes", i)}
                        className="shrink-0 flex items-center justify-center h-8 w-8 rounded-full border border-amber-100/10 bg-white/5 text-stone-500 transition hover:border-red-400/30 hover:bg-red-500/10 hover:text-red-400">
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => addToArr("mistakes")}
                className="mt-4 self-start flex items-center gap-2 rounded-full border border-red-400/20 bg-red-500/8 px-4 py-1.5 text-xs font-semibold text-red-400/80 transition hover:border-red-400/40 hover:bg-red-500/15 hover:text-red-300">
                <span className="text-sm leading-none">+</span> Add Mistake
              </button>
            </div>
          )}

          {/* Step 6 — Insight */}
          {step === 6 && (
            <div className="flex-1 flex flex-col">
              <p className="text-label-lg">Step 6 · Insight</p>
              <h2 className="text-heading-xl mt-1 mb-2">Lesson of the Day</h2>
              <p className="text-stone-400 text-sm mb-5">What did today teach you?</p>
              <textarea
                value={form.insight}
                onChange={(e) => set("insight", e.target.value)}
                placeholder="Today I learned that…"
                rows={7}
                className={textareaBase + " flex-1"}
              />
            </div>
          )}

          {/* Step 7 — Gratitude */}
          {step === 7 && (
            <div className="flex-1 flex flex-col">
              <p className="text-label-lg">Step 7 · Gratitude</p>
              <h2 className="text-heading-xl mt-1 mb-2">What are you thankful for?</h2>
              <p className="text-stone-400 text-sm mb-6">1–2 things that made today worth living.</p>
              <div className="space-y-3">
                {form.gratitude.map((g, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xl">🙏</span>
                    <input
                      type="text" value={g}
                      onChange={(e) => setArr("gratitude", i, e.target.value)}
                      placeholder="I'm grateful for…"
                      className={inputBase}
                    />
                    {form.gratitude.length > 1 && (
                      <button type="button" onClick={() => removeFromArr("gratitude", i)}
                        className="shrink-0 flex items-center justify-center h-8 w-8 rounded-full border border-amber-100/10 bg-white/5 text-stone-500 transition hover:border-red-400/30 hover:bg-red-500/10 hover:text-red-400">
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => addToArr("gratitude")}
                className="mt-4 self-start flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-500/8 px-4 py-1.5 text-xs font-semibold text-amber-400/80 transition hover:border-amber-400/40 hover:bg-amber-500/15 hover:text-amber-300">
                <span className="text-sm leading-none">+</span> Add Gratitude
              </button>
            </div>
          )}

          {/* Step 8 — Achievement */}
          {step === 8 && (
            <div className="flex-1 flex flex-col">
              <p className="text-label-lg">Step 8 · Achievement</p>
              <h2 className="text-heading-xl mt-1 mb-2">Real Accomplishments</h2>
              <p className="text-stone-400 text-sm mb-6">1–2 things you actually finished or moved forward today.</p>
              <div className="space-y-3">
                {form.achievement.map((a, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xl">🏆</span>
                    <input
                      type="text" value={a}
                      onChange={(e) => setArr("achievement", i, e.target.value)}
                      placeholder="I accomplished…"
                      className={inputBase}
                    />
                    {form.achievement.length > 1 && (
                      <button type="button" onClick={() => removeFromArr("achievement", i)}
                        className="shrink-0 flex items-center justify-center h-8 w-8 rounded-full border border-amber-100/10 bg-white/5 text-stone-500 transition hover:border-red-400/30 hover:bg-red-500/10 hover:text-red-400">
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => addToArr("achievement")}
                className="mt-4 self-start flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-500/8 px-4 py-1.5 text-xs font-semibold text-amber-400/80 transition hover:border-amber-400/40 hover:bg-amber-500/15 hover:text-amber-300">
                <span className="text-sm leading-none">+</span> Add Achievement
              </button>
            </div>
          )}

          {/* Step 9 — Affirmation */}
          {step === 9 && (
            <div className="flex-1 flex flex-col justify-center gap-2">
              <p className="text-label-lg">Step 9 · Affirmation</p>
              <h2 className="text-heading-xl mt-1 mb-2">One Strong Line</h2>
              <p className="text-stone-400 text-sm mb-8">
                Write one powerful statement about yourself. Make it count.
              </p>
              <input
                type="text"
                value={form.affirmation}
                onChange={(e) => set("affirmation", e.target.value)}
                placeholder="I am capable of building the life I want…"
                className="w-full rounded-2xl border border-amber-400/25 bg-stone-950/45 px-6 py-5 text-base italic text-center text-amber-50/90 placeholder-stone-500 outline-none transition focus:border-amber-400/50 focus:shadow-[0_0_20px_rgba(251,191,36,0.12)]"
              />
            </div>
          )}

          {/* Step 10 — Tomorrow Plan */}
          {step === 10 && (
            <div className="flex-1 flex flex-col">
              <p className="text-label-lg">Step 10 · Tomorrow Plan</p>
              <h2 className="text-heading-xl mt-1 mb-2">Plan for Tomorrow</h2>
              <p className="text-stone-400 text-sm mb-5">What are your top priorities for tomorrow?</p>
              <textarea
                value={form.tomorrowPlan}
                onChange={(e) => set("tomorrowPlan", e.target.value)}
                placeholder="Tomorrow I will focus on…"
                rows={7}
                className={textareaBase + " flex-1"}
              />
            </div>
          )}

          {/* Step 11 — Overall Day Rating */}
          {step === 11 && (
            <div className="flex-1 flex flex-col justify-center gap-2">
              <p className="text-label-lg">Step 11 · Overall Rating</p>
              <h2 className="text-heading-xl mt-1">How was your day?</h2>
              <p className="text-stone-400 text-sm mb-8">Give your overall day a score from 1 to 100.</p>
              <div className="flex items-center gap-4">
                <span className="text-stone-500 text-xs w-4">1</span>
                <input
                  type="range" min="1" max="100"
                  value={form.overallRating}
                  onChange={(e) => { set("overallRating", Number(e.target.value)); set("ratingTouched", true); }}
                  className="flex-1 h-2 cursor-pointer accent-amber-400"
                />
                <span className="text-stone-500 text-xs w-8 text-right">100</span>
              </div>
              <div className="mt-6 text-center">
                <span className="text-heading-xl text-7xl">{form.overallRating}</span>
                <p className="text-stone-400 text-sm mt-3">
                  {form.overallRating >= 80 ? "Exceptional day 🌟"
                    : form.overallRating >= 60 ? "Solid day 👍"
                    : form.overallRating >= 40 ? "Average day 🤝"
                    : "Rough day, but you showed up 💪"}
                </p>
              </div>
            </div>
          )}

          {/* ── Custom field steps (12+) ── */}
          {isCustom && customFields[customIdx] !== undefined && (
            <div className="flex-1 flex flex-col">
              {/* Header with delete button */}
              <div className="flex items-start justify-between gap-3 mb-1">
                <div>
                  <p className="text-label-lg">
                    Custom Field {customIdx + 1}
                  </p>
                  <h2 className="text-heading-xl mt-1">
                    {customFields[customIdx].title.trim() || "Untitled Field"}
                  </h2>
                </div>
                {/* Delete button — only on custom steps */}
                <button
                  type="button"
                  onClick={() => deleteCustomField(customIdx)}
                  title="Delete this custom field"
                  className="shrink-0 mt-1 flex items-center gap-1.5 rounded-full border border-red-400/20 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-400 transition hover:border-red-400/40 hover:bg-red-500/20 hover:text-red-300"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Delete Field
                </button>
              </div>

              <div className="mt-5 space-y-4 flex-1 flex flex-col">
                {/* Title */}
                <div>
                  <label className="text-label-sm block mb-2">Title <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    value={customFields[customIdx].title}
                    onChange={(e) => updateCustom(customIdx, "title", e.target.value)}
                    placeholder="Name this field (e.g. Morning Reflection, Book Notes…)"
                    className={inputBase}
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="text-label-sm block mb-2">Description <span className="text-stone-600 normal-case font-normal">optional</span></label>
                  <input
                    type="text"
                    value={customFields[customIdx].description}
                    onChange={(e) => updateCustom(customIdx, "description", e.target.value)}
                    placeholder="Add context or a prompt for this field…"
                    className={inputBase}
                  />
                </div>

                {/* Answer */}
                <div className="flex-1 flex flex-col">
                  <label className="text-label-sm block mb-2">Answer <span className="text-red-400">*</span></label>
                  <textarea
                    value={customFields[customIdx].answer}
                    onChange={(e) => updateCustom(customIdx, "answer", e.target.value)}
                    placeholder="Write your response here…"
                    rows={5}
                    className={textareaBase + " flex-1"}
                  />
                </div>
              </div>
            </div>
          )}

          </div>

          {/* ── Navigation ── */}
          <div className="journal-step-nav mt-8 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              disabled={step === 1}
              className="rounded-full border border-amber-100/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-amber-50/60 transition duration-200 hover:border-amber-200/30 hover:text-amber-50 disabled:cursor-not-allowed disabled:opacity-20"
            >
              ← Back
            </button>

            <span className="text-xs text-stone-600">{step} / {totalSteps}</span>

            {!isLastStep ? (
              <button
                type="button"
                onClick={() => setStep((s) => s + 1)}
                disabled={!stepValid()}
                className={btnPrimary}
              >
                Next →
              </button>
            ) : (
              <button
                type="button"
                disabled={!allComplete}
                onClick={() => { setSubmitted(true); setSubmittedDate(todayStr()); }}
                title={!allComplete ? `${totalSteps - completedCount} field(s) still unanswered` : ""}
                className="rounded-full border border-amber-400/50 bg-gradient-to-r from-amber-400 to-orange-400 px-8 py-2.5 text-sm font-bold text-stone-950 transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_28px_rgba(251,191,36,0.55)] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
              >
                {allComplete ? "Submit Journal ✓" : `${totalSteps - completedCount} left to answer`}
              </button>
            )}
          </div>

        </section>
      </div>

      {/* Right sidebar */}
      <div className="w-64 shrink-0">
        <div className="sticky top-0">
          <JournalRightSidebar />
        </div>
      </div>
    </div>
  );
}
