import { useRef, useEffect, useState, useCallback } from "react";
import { motion as Motion, AnimatePresence } from "framer-motion";
import api from "../../api/axios";
import useAuth from "../../hooks/useAuth";
import mingLogo from "../../assets/minglogo1.png";
import mingAvatar from "../../assets/minglogo2.png";

// ── Constants ─────────────────────────────────────────────────────────────────

const SCOPES = [
  { key: "7d",  label: "7 Days"   },
  { key: "30d", label: "30 Days"  },
  { key: "all", label: "All Time" },
];

const QUICK_PROMPTS = [
  "Plan my next 3 hours for deep work",
  "Review my missed tasks and suggest recovery",
  "Create a habit consistency strategy",
  "Design a weekly gym discipline plan",
];

const INITIAL_MESSAGES = [
  {
    id: "greeting",
    role: "guru",
    text: "Namo Buddhaya. I am Ming — your discipline guide. Ask me anything about your goals, habits, mindset, or daily practice. I will walk beside you.",
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const COLOR_MAP = {
  sky:     { border: "border-sky-400/30",     bg: "bg-sky-500/10",     text: "text-sky-200",     num: "text-sky-300"     },
  emerald: { border: "border-emerald-400/30", bg: "bg-emerald-500/10", text: "text-emerald-200", num: "text-emerald-300" },
  yellow:  { border: "border-yellow-400/30",  bg: "bg-yellow-500/10",  text: "text-yellow-200",  num: "text-yellow-300"  },
  red:     { border: "border-red-400/30",     bg: "bg-red-500/10",     text: "text-red-200",     num: "text-red-300"     },
  violet:  { border: "border-violet-400/30",  bg: "bg-violet-500/10",  text: "text-violet-200",  num: "text-violet-300"  },
  amber:   { border: "border-amber-400/30",   bg: "bg-amber-500/10",   text: "text-amber-200",   num: "text-amber-300"   },
  orange:  { border: "border-orange-400/30",  bg: "bg-orange-500/10",  text: "text-orange-200",  num: "text-orange-300"  },
  stone:   { border: "border-stone-500/30",   bg: "bg-stone-500/10",   text: "text-stone-400",   num: "text-stone-400"   },
};

function getSectionCards(data) {
  const { journal, habits, todos, goals, gym } = data;
  return [
    {
      label: "Journal",
      icon: "📓",
      value: journal.entryCount,
      unit: journal.entryCount === 1 ? "entry" : "entries",
      sub: journal.entryCount > 0
        ? `Avg energy ${journal.avgEnergyLevel}/100 · Rating ${journal.avgOverallRating}/100`
        : "No entries this period",
      color: "sky",
    },
    {
      label: "Habits",
      icon: "⚡",
      value: `${habits.completionRate}%`,
      unit: "completion",
      sub: `${habits.completedLogs} completions · ${habits.totalActiveHabits} active habits`,
      color: habits.completionRate >= 70 ? "emerald" : habits.completionRate >= 40 ? "yellow" : "red",
    },
    {
      label: "To-Do",
      icon: "✓",
      value: todos.completed,
      unit: todos.completed === 1 ? "task done" : "tasks done",
      sub: todos.created > 0 ? `${todos.completionRate}% of ${todos.created} tasks created` : "No tasks logged",
      color: "violet",
    },
    {
      label: "Goals",
      icon: "🎯",
      value: goals.progressUpdates,
      unit: goals.progressUpdates === 1 ? "update" : "updates",
      sub: `${goals.goalsUpdated} goals touched · ${goals.completedGoals} completed`,
      color: "amber",
    },
    {
      label: "Gym",
      icon: "💪",
      value: gym.workoutDays,
      unit: gym.workoutDays === 1 ? "session" : "sessions",
      sub: gym.workoutDays > 0
        ? `${gym.uniqueExercises} exercises · ${gym.measurementsTaken} check-ins`
        : "No workouts logged",
      color: gym.workoutDays > 0 ? "orange" : "stone",
    },
  ];
}

function generatePatterns(data) {
  const { journal, habits, todos, goals, gym } = data;
  const pts = [];

  if (journal.entryCount > 0) {
    pts.push(`Journaled ${journal.entryCount} ${journal.entryCount === 1 ? "time" : "times"}${journal.topMood ? ` — top mood: ${journal.topMood}` : ""}`);
    pts.push(`Average energy ${journal.avgEnergyLevel}/100 · Overall rating ${journal.avgOverallRating}/100`);
  } else {
    pts.push("No journal entries recorded this period");
  }

  if (habits.totalActiveHabits > 0) {
    pts.push(`${habits.completedLogs} habit completions from ${habits.totalActiveHabits} active habits (${habits.completionRate}% rate)`);
  }

  if (todos.created > 0) {
    pts.push(`${todos.completed} of ${todos.created} tasks completed — ${todos.completionRate}% completion rate`);
  }

  if (goals.progressUpdates > 0) {
    pts.push(`${goals.progressUpdates} goal progress logs across ${goals.goalsUpdated} of ${goals.activeGoals} goals`);
  } else if (goals.activeGoals > 0) {
    pts.push(`${goals.activeGoals} active goals — no progress logged this period`);
  }

  if (gym.workoutDays > 0) {
    pts.push(`${gym.workoutDays} workout ${gym.workoutDays === 1 ? "day" : "days"} · ${gym.uniqueExercises} unique exercises logged`);
    if (gym.bodyPartsWorked.length > 0) {
      pts.push(`Body parts trained: ${gym.bodyPartsWorked.join(", ")}`);
    }
    if (gym.measurementsTaken > 0) {
      pts.push(`${gym.measurementsTaken} body measurement ${gym.measurementsTaken === 1 ? "check-in" : "check-ins"}`);
    }
  } else {
    pts.push("No gym sessions logged this period");
  }

  return pts;
}

function generateRecommendations(data) {
  const { journal, habits, todos, goals, gym } = data;
  const recs = [];

  if (journal.entryCount === 0) {
    recs.push({ area: "Journal", icon: "📓", text: "No entries this period. Reflection is the foundation — even 3 minutes of writing sharpens clarity." });
  } else if (journal.avgEnergyLevel < 50) {
    recs.push({ area: "Journal", icon: "📓", text: `Average energy at ${journal.avgEnergyLevel}/100. Review your sleep schedule and nutrition — recovery drives performance.` });
  } else if (journal.avgOverallRating >= 75) {
    recs.push({ area: "Journal", icon: "📓", text: `Strong average rating of ${journal.avgOverallRating}/100. Your daily reflection practice is working — keep it consistent.` });
  }

  if (habits.totalActiveHabits > 0) {
    if (habits.completionRate < 50) {
      recs.push({ area: "Habits", icon: "⚡", text: `Completion at ${habits.completionRate}%. Reduce your active habits to your top 3 and execute those perfectly before expanding.` });
    } else if (habits.completionRate < 75) {
      recs.push({ area: "Habits", icon: "⚡", text: `At ${habits.completionRate}% completion. Identify which habits you most often skip and either reschedule them or simplify them.` });
    } else if (habits.completionRate >= 90) {
      recs.push({ area: "Habits", icon: "⚡", text: `Excellent ${habits.completionRate}% habit completion. You have earned the right to add one more high-impact habit.` });
    }
  } else {
    recs.push({ area: "Habits", icon: "⚡", text: "No active habits tracked. Start with 2–3 keystone habits: morning routine, reading, and exercise." });
  }

  if (todos.created > 0 && todos.completionRate < 50) {
    recs.push({ area: "To-Do", icon: "✓", text: "Less than half your tasks are completed. Apply the 80/20 rule — identify the 20% of tasks that produce 80% of your results." });
  } else if (todos.created === 0) {
    recs.push({ area: "To-Do", icon: "✓", text: "No tasks logged. Break your goals into daily action items — execution starts with a clear task list." });
  }

  if (goals.activeGoals > 0 && goals.goalsUpdated === 0) {
    recs.push({ area: "Goals", icon: "🎯", text: `You have ${goals.activeGoals} active ${goals.activeGoals === 1 ? "goal" : "goals"} with no progress logged. Log even a small update — tracking creates accountability.` });
  } else if (goals.completedGoals > 0) {
    recs.push({ area: "Goals", icon: "🎯", text: `You completed ${goals.completedGoals} ${goals.completedGoals === 1 ? "goal" : "goals"}. Set a new stretch goal to maintain momentum.` });
  }

  if (gym.workoutDays === 0) {
    recs.push({ area: "Gym", icon: "💪", text: "No workouts this period. Commit to 2 sessions this week — consistency over intensity at the start." });
  } else if (gym.workoutDays > 0 && gym.bodyPartsWorked.length < 3 && gym.workoutDays >= 3) {
    recs.push({ area: "Gym", icon: "💪", text: "You are training frequently but targeting few muscle groups. Add variety to prevent imbalances and plateaus." });
  } else if (gym.measurementsTaken === 0 && gym.workoutDays > 0) {
    recs.push({ area: "Gym", icon: "💪", text: "No body measurements logged. Tracking measurements weekly gives you objective progress data beyond what the mirror shows." });
  }

  if (recs.length === 0) {
    recs.push({ area: "Overall", icon: "✦", text: "You are maintaining strong progress across all disciplines. The goal now is to raise the ceiling — increase intensity in your weakest area." });
  }

  return recs;
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatCard({ card, index }) {
  const c = COLOR_MAP[card.color] ?? COLOR_MAP.stone;
  return (
    <Motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className={`rounded-2xl border ${c.border} ${c.bg} p-4 flex flex-col gap-1.5`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[0.65rem] font-semibold uppercase tracking-widest text-stone-400">{card.icon} {card.label}</span>
      </div>
      <p className={`text-2xl font-black leading-none ${c.num}`}>{card.value}</p>
      <p className={`text-[0.7rem] font-medium ${c.text}`}>{card.unit}</p>
      <p className="text-[0.65rem] text-stone-500 leading-4">{card.sub}</p>
    </Motion.div>
  );
}

function TypewriterText({ text }) {
  const [displayed, setDisplayed] = useState("");
  useEffect(() => {
    let i = 0;
    const iv = setInterval(() => {
      i += 1;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(iv);
    }, 18);
    return () => clearInterval(iv);
  }, [text]);
  return <>{displayed}<span className="animate-pulse">|</span></>;
}

function ChatBubble({ role, text }) {
  const isUser = role === "user";
  return (
    <div className={`msg-slide-in flex w-full items-start gap-3 ${isUser ? "justify-end flex-row-reverse" : ""}`}>
      {!isUser && (
        <img src={mingAvatar} alt="Ming" className="soft-float h-14 w-auto shrink-0 self-end drop-shadow-[0_0_8px_rgba(245,181,47,0.5)]" />
      )}
      <article className={`rounded-2xl border px-4 py-3 text-sm leading-6 shadow-none ${
        isUser
          ? "ml-auto w-fit max-w-[85%] border-amber-300/30 bg-amber-500/12 text-amber-100"
          : "w-full max-w-4xl border-sky-200/20 bg-sky-500/10 text-stone-200"
      }`}>
        {!isUser && (
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-amber-300/60">Ming</p>
        )}
        <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
          {isUser ? text : <TypewriterText key={text} text={text} />}
        </p>
      </article>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function AIGuru() {
  const { isDemoMode } = useAuth();

  // Insights state
  const [scope, setScope]     = useState("7d");
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const [activeTab, setActiveTab] = useState("chat"); // "insights" | "chat"

  // Chat state
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [prompt, setPrompt]     = useState("");
  const bottomRef = useRef(null);
  const idRef     = useRef(0);

  const fetchInsights = useCallback(async (s) => {
    setLoading(true);
    setError(null);
    try {
      const { data: res } = await api.get(`/insights/summary?scope=${s}`);
      setData(res);
    } catch {
      setError("Could not load insights. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isDemoMode) fetchInsights(scope);
  }, [scope, isDemoMode, fetchInsights]);

  // Chat helpers
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const sendPrompt = (value) => {
    const clean = value.trim();
    if (!clean) return;
    const nextId = (idRef.current += 1);
    setMessages((prev) => [
      ...prev,
      { id: `user-${nextId}`, role: "user", text: clean },
      { id: `guru-${nextId}`, role: "guru", text: "Here is your next best move: set one non-negotiable priority, time-box it for 45 minutes, then execute before switching tabs. Full AI features coming soon." },
    ]);
    setPrompt("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendPrompt(prompt); }
  };

  const cards       = data ? getSectionCards(data)            : [];
  const patterns    = data ? generatePatterns(data)           : [];
  const suggestions = data ? generateRecommendations(data)    : [];

  return (
    <section className="h-full min-h-0 w-full lg:-mt-4 xl:-mt-6">
      <div className="panel-rise-in grid min-h-[78vh] overflow-hidden rounded-[1.5rem] border border-amber-100/10 shadow-2xl shadow-black/30 lg:h-[calc(100vh-9rem)] lg:min-h-0 lg:grid-cols-[minmax(15rem,20rem)_minmax(0,1fr)] xl:rounded-[2rem]">

        {/* ── LEFT: Avatar panel ── */}
        <div className="order-1 flex flex-col gap-4 border-b border-amber-100/10 bg-stone-950/60 px-4 py-5 backdrop-blur sm:px-5 md:px-6 lg:order-1 lg:min-h-0 lg:gap-4 lg:overflow-y-auto lg:border-r lg:border-b-0 lg:px-6 lg:py-4 xl:px-8 xl:py-5">
          <div className="flex flex-col items-center gap-4 text-center sm:gap-5 lg:gap-4">
            <div className="relative">
              <div className="amber-glow absolute -inset-3 rounded-full bg-amber-400/10 blur-2xl" />
              <img
                src={mingLogo}
                alt="Ming — AI Insights"
                className="soft-float relative h-18 w-18 rounded-full object-cover ring-2 ring-amber-300/25 shadow-xl shadow-amber-900/30 sm:h-20 sm:w-20 lg:h-40 lg:w-40 xl:h-52 xl:w-52"
              />
            </div>
            <div className="min-w-0 max-w-sm space-y-1.5 lg:space-y-2">
              <p className="text-[0.625rem] font-semibold uppercase tracking-[0.28em] text-amber-300/60 sm:text-xs sm:tracking-[0.35em]">
                Namo Buddhaya
              </p>
              <h2 className="font-heading text-xl font-bold text-amber-50 sm:text-2xl xl:text-[clamp(1.6rem,1.2rem+0.8vw,2.1rem)]">
                I am Ming
              </h2>
              <p className="mx-auto max-w-xs text-sm leading-6 text-stone-400 sm:text-[0.95rem] sm:leading-7">
                Your personal discipline guide — shaped by ancient wisdom and modern focus. I walk beside those who seek mastery over themselves.
              </p>
            </div>
          </div>

          {/* Tab switcher */}
          <div className="flex w-full gap-2 rounded-xl border border-amber-100/10 bg-white/[0.03] p-1">
            {[
              { key: "chat",     label: "Ask Ming"  },
              { key: "insights", label: "Insights" },
            ].map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setActiveTab(t.key)}
                className={`flex-1 rounded-lg py-1.5 text-xs font-semibold uppercase tracking-widest transition ${
                  activeTab === t.key
                    ? "bg-amber-500/20 text-amber-200 border border-amber-400/30"
                    : "text-stone-500 hover:text-stone-300"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Scope selector (only when insights tab active) */}
          {activeTab === "insights" && (
            <div className="flex w-full gap-1.5 rounded-xl border border-amber-100/10 bg-white/[0.03] p-1">
              {SCOPES.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setScope(s.key)}
                  className={`flex-1 rounded-lg py-1.5 text-[0.65rem] font-semibold uppercase tracking-wider transition ${
                    scope === s.key
                      ? "bg-amber-500/20 text-amber-300 border border-amber-400/25"
                      : "text-stone-500 hover:text-stone-400"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}

          <div className="mt-1 hidden lg:block lg:text-center">
            <p className="text-[10px] italic leading-5 text-stone-600">
              "Discipline is the bridge between goals and accomplishment."
            </p>
            <Motion.p
              className="shimmer-text mt-6 text-[10px] font-medium uppercase tracking-[0.18em] [text-shadow:0_0_12px_rgba(245,181,47,0.34),0_0_24px_rgba(245,181,47,0.24)] lg:mt-8"
            >
              AI Features Coming Soon
            </Motion.p>
          </div>
        </div>

        {/* ── RIGHT: Insights / Chat ── */}
        <div className="order-2 flex min-h-[32rem] flex-col bg-white/[0.025] backdrop-blur lg:order-2 lg:min-h-0">

          {/* Header */}
          <div className="shrink-0 border-b border-amber-100/10 px-4 py-4 sm:px-5 md:px-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[0.625rem] uppercase tracking-[0.3em] text-amber-200/50">AI Insights</p>
                <h3 className="text-base font-bold text-amber-50 sm:text-lg">
                  {activeTab === "insights" ? "Your Discipline Overview" : "Your Discipline Co-Pilot"}
                </h3>
              </div>
              <Motion.span
                className="relative shrink-0 overflow-hidden rounded-full border border-emerald-300/30 bg-emerald-500/10 px-3 py-1 text-[0.625rem] font-semibold uppercase tracking-[0.12em] text-emerald-200"
                animate={{ boxShadow: ["0 0 0px rgba(52,211,153,0)", "0 0 12px rgba(52,211,153,0.36)", "0 0 0px rgba(52,211,153,0)"] }}
                transition={{ boxShadow: { duration: 2.2, repeat: Infinity, ease: "easeInOut" } }}
              >
                <Motion.span
                  className="pointer-events-none absolute inset-y-0 left-[-40%] w-[30%] -skew-x-12 bg-white/25 blur-sm"
                  animate={{ left: ["-40%", "130%"] }}
                  transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 1.5, ease: "easeInOut" }}
                />
                <span className="relative z-10">Beta</span>
              </Motion.span>
            </div>
          </div>

          {/* ── Insights Tab ── */}
          <AnimatePresence mode="wait">
            {activeTab === "insights" && (
              <Motion.div
                key="insights"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="journal-scroll flex-1 overflow-y-auto px-4 py-5 sm:px-5 md:px-6 lg:min-h-0"
              >
                {loading && (
                  <div className="flex h-40 items-center justify-center">
                    <Motion.div
                      className="h-7 w-7 rounded-full border-2 border-amber-400/30 border-t-amber-400"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                    />
                  </div>
                )}

                {error && !loading && (
                  <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-300">
                    {error}
                  </div>
                )}

                {isDemoMode && !loading && (
                  <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4 text-sm text-amber-200">
                    Insights are not available in demo mode. Sign in to see your data.
                  </div>
                )}

                {data && !loading && !error && (
                  <div className="space-y-6">
                    {/* Period label */}
                    {data.period && (
                      <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-stone-500">
                        {data.period.from} → {data.period.to}
                      </p>
                    )}

                    {/* Stat cards */}
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
                      {cards.map((card, i) => (
                        <StatCard key={card.label} card={card} index={i} />
                      ))}
                    </div>

                    {/* Pattern observations */}
                    <Motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.35 }}
                      className="rounded-2xl border border-sky-400/20 bg-sky-500/[0.07] p-4"
                    >
                      <p className="mb-3 text-[0.65rem] font-semibold uppercase tracking-widest text-sky-300/70">
                        ✦ Pattern Observations
                      </p>
                      <ul className="space-y-2">
                        {patterns.map((pt, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs leading-5 text-stone-300">
                            <span className="mt-0.5 shrink-0 text-sky-400">·</span>
                            {pt}
                          </li>
                        ))}
                      </ul>
                    </Motion.div>

                    {/* Recommendations */}
                    <Motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.45 }}
                      className="rounded-2xl border border-amber-400/20 bg-amber-500/[0.06] p-4"
                    >
                      <p className="mb-3 text-[0.65rem] font-semibold uppercase tracking-widest text-amber-300/70">
                        ✦ Ming's Recommendations
                      </p>
                      <ul className="space-y-3">
                        {suggestions.map((rec, i) => (
                          <li key={i} className="flex items-start gap-3 rounded-xl border border-amber-100/10 bg-white/[0.03] p-3">
                            <span className="mt-0.5 shrink-0 text-base leading-none">{rec.icon}</span>
                            <div className="min-w-0">
                              <p className="mb-0.5 text-[0.65rem] font-semibold uppercase tracking-widest text-amber-300/60">{rec.area}</p>
                              <p className="text-xs leading-5 text-stone-300">{rec.text}</p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </Motion.div>

                    {/* Mood distribution (if available) */}
                    {data.journal.moodDistribution?.length > 0 && (
                      <Motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.55 }}
                        className="rounded-2xl border border-violet-400/20 bg-violet-500/[0.06] p-4"
                      >
                        <p className="mb-3 text-[0.65rem] font-semibold uppercase tracking-widest text-violet-300/70">
                          ✦ Mood Breakdown
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {data.journal.moodDistribution.map((m) => (
                            <span
                              key={m.mood}
                              className="rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-xs text-violet-200"
                            >
                              {m.mood} <span className="text-violet-400/70">×{m.count}</span>
                            </span>
                          ))}
                        </div>
                      </Motion.div>
                    )}

                    {/* Gym body parts (if any) */}
                    {data.gym.bodyPartsWorked?.length > 0 && (
                      <Motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.62 }}
                        className="rounded-2xl border border-orange-400/20 bg-orange-500/[0.06] p-4"
                      >
                        <p className="mb-3 text-[0.65rem] font-semibold uppercase tracking-widest text-orange-300/70">
                          ✦ Body Parts Trained
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {data.gym.bodyPartsWorked.map((bp) => (
                            <span
                              key={bp}
                              className="rounded-full border border-orange-400/20 bg-orange-500/10 px-3 py-1 text-xs text-orange-200"
                            >
                              {bp}
                            </span>
                          ))}
                        </div>
                      </Motion.div>
                    )}
                  </div>
                )}
              </Motion.div>
            )}

            {/* ── Chat Tab ── */}
            {activeTab === "chat" && (
              <Motion.div
                key="chat"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-1 flex-col lg:min-h-0"
              >
                {/* Quick prompts */}
                <div className="shrink-0 border-b border-amber-100/10 px-4 py-3 sm:px-5 md:px-6">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {QUICK_PROMPTS.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => sendPrompt(item)}
                        className="min-h-10 rounded-2xl border border-amber-200/20 bg-amber-500/10 px-3 py-2 text-left text-xs font-semibold leading-5 text-amber-200 transition hover:-translate-y-0.5 hover:border-amber-200/40 hover:bg-amber-500/20"
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Messages */}
                <div className="relative flex-1 overflow-hidden lg:min-h-0">
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 hidden h-14 bg-gradient-to-t from-[#221714] to-transparent lg:block" />
                  <div className="journal-scroll flex min-h-[12rem] flex-col gap-3 overflow-y-auto px-4 py-4 pr-2 sm:px-5 md:px-6 md:pr-3 lg:h-full lg:min-h-0">
                    {messages.map((msg) => (
                      <ChatBubble key={msg.id} role={msg.role} text={msg.text} />
                    ))}
                    <div ref={bottomRef} />
                  </div>
                </div>

                {/* Input */}
                <div className="shrink-0 border-t border-amber-100/10 px-4 py-4 sm:px-5 md:px-6">
                  <div className="flex flex-col gap-2 rounded-[1.15rem] border border-amber-200/10 bg-[#120d0c]/88 p-2 ring-1 ring-inset ring-amber-300/5 sm:flex-row sm:items-center">
                    <div className="flex min-w-0 flex-1 items-center rounded-[1rem] border border-amber-100/10 bg-black/30 px-3">
                      <img src={mingAvatar} alt="Ming" className="mr-3 h-10 w-auto shrink-0 object-contain" />
                      <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask Ming anything about your discipline system..."
                        rows={1}
                        className="min-h-[3rem] w-full flex-1 resize-none bg-transparent py-3 text-sm leading-6 text-stone-100 outline-none placeholder:text-stone-500"
                      />
                    </div>
                    <Motion.button
                      type="button"
                      onClick={() => sendPrompt(prompt)}
                      animate={{ boxShadow: ["0 8px 20px rgba(245,181,47,0.2)", "0 0 22px rgba(245,181,47,0.48)", "0 8px 20px rgba(245,181,47,0.2)"] }}
                      transition={{ boxShadow: { duration: 2.2, repeat: Infinity, ease: "easeInOut" } }}
                      whileHover={{ y: -2, scale: 1.04 }}
                      whileTap={{ scale: 0.95 }}
                      className="relative min-h-[3rem] w-full overflow-hidden rounded-[1rem] border border-amber-200/35 bg-gradient-to-r from-[#ffd86b] via-[#f7bc3a] to-[#ee971d] px-5 text-sm font-black uppercase tracking-[0.16em] text-stone-950 transition hover:brightness-105 sm:w-auto sm:min-w-[6.5rem]"
                    >
                      <Motion.span
                        className="pointer-events-none absolute inset-y-0 left-[-40%] w-[30%] -skew-x-12 bg-white/35 blur-sm"
                        animate={{ left: ["-40%", "130%"] }}
                        transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 1.5, ease: "easeInOut" }}
                      />
                      <span className="relative z-10">Send</span>
                    </Motion.button>
                  </div>
                  <p className="mt-2 px-1 text-[10px] text-stone-600">Enter to send · Shift + Enter for new line</p>
                </div>
              </Motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
