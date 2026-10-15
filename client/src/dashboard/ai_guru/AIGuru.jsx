import { useRef, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { motion as Motion, AnimatePresence, MotionConfig } from "framer-motion";
import api from "../../api/axios";
import useAuth from "../../hooks/useAuth";
import useMobileLowMotion from "../../hooks/useMobileLowMotion";
import mingLogo from "../../assets/minglogo1.webp";
import mingAvatar from "../../assets/minglogo2.webp";
import { GURU_MESSAGE_LIMIT, GURU_HISTORY_LIMIT } from "../../../../shared/guruInsightsConfig.js";
import { demoGuruReply, guruCards, guruPatterns, guruSuggestions } from "./guruPresentation";
import { validGuruInsights, validGuruReply, guruFailureMessage } from "./guruResponse";

// ── Constants ─────────────────────────────────────────────────────────────────

const SCOPES = [
  { key: "7d",  label: "7 Days"   },
  { key: "30d", label: "30 Days"  },
  { key: "all", label: "All Time" },
];
const INSIGHTS_CACHE_MS = 30_000;

const INITIAL_MESSAGES = [
  {
    id: "greeting",
    role: "guru",
    text: "Namo Buddhaya. I am Ming — your AI discipline guide. Ask me anything about your goals, habits, mindset, or daily practice. I will walk beside you.",
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

function StatCard({ card, index, lowMotion }) {
  const c = COLOR_MAP[card.color] ?? COLOR_MAP.stone;
  return (
    <Motion.div
      initial={lowMotion ? false : { opacity: 0, y: 12 }}
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

function ChatBubble({ role, text }) {
  const isUser = role === "user";
  return (
    <div className={`msg-slide-in flex w-full items-start gap-2.5 sm:gap-3 ${isUser ? "justify-end flex-row-reverse" : ""}`}>
      {!isUser && (
        <img src={mingAvatar} alt="Ming" className="soft-float h-10 w-auto shrink-0 self-end sm:h-14" />
      )}
      <article className={`rounded-2xl border px-3 py-3 text-sm leading-6 shadow-none sm:px-4 ${
        isUser
          ? "ml-auto w-fit max-w-[88%] border-amber-300/30 bg-amber-500/12 text-amber-100 sm:max-w-[85%]"
          : "w-full max-w-[calc(100%-3rem)] border-sky-200/15 bg-stone-950/65 text-stone-200 shadow-none drop-shadow-none backdrop-blur-0 sm:max-w-4xl"
      }`}>
        {!isUser && (
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-amber-300/60">Ming</p>
        )}
        <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">
          {text}
        </p>
      </article>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function AIGuru() {
  const { isDemoMode, user } = useAuth();
  const lowMotion = useMobileLowMotion();
  const accountKey = isDemoMode ? "demo" : user?._id || user?.id || user?.clerkId || "signed-out";
  return <MotionConfig reducedMotion={lowMotion ? "always" : "user"}><GuruSession key={accountKey} isDemoMode={isDemoMode} lowMotion={lowMotion} /></MotionConfig>;
}

function GuruSession({ isDemoMode, lowMotion }) {

  // Insights state
  const [scope, setScope]     = useState("7d");
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const [activeTab, setActiveTab] = useState("chat"); // "insights" | "chat"
  const insightsCacheRef = useRef(new Map());

  // Chat state
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [prompt, setPrompt]     = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const messagesScrollRef = useRef(null);
  const composerInputRef = useRef(null);

  useLayoutEffect(() => {
    const resizeInput = () => {
      const input = composerInputRef.current;
      if (!input) return;
      if (!window.matchMedia("(max-width: 1023px)").matches) {
        input.style.height = "";
        return;
      }
      input.style.height = "0px";
      const maximum = Number.parseFloat(getComputedStyle(input).maxHeight) || 88;
      input.style.height = `${Math.min(input.scrollHeight, maximum)}px`;
    };
    resizeInput();
    window.addEventListener("resize", resizeInput);
    return () => window.removeEventListener("resize", resizeInput);
  }, [prompt, activeTab]);
  const idRef = useRef(0);
  const requestRef = useRef(null);
  const [chatError, setChatError] = useState("");
  const [failedPrompt, setFailedPrompt] = useState(null);
  const [chatRetryable, setChatRetryable] = useState(true);
  const [insightsAttempt, setInsightsAttempt] = useState(0);

  useEffect(() => () => requestRef.current?.abort(), []);

  useEffect(() => {
    if (activeTab !== "insights") return;
    const controller = new AbortController();
    const cached = insightsCacheRef.current.get(scope);
    if (cached && Date.now() - cached.savedAt < INSIGHTS_CACHE_MS) {
      setData(cached.data);
      setError(null);
      setLoading(false);
      return;
    }
    setData(null);
    setError(null);
    setLoading(true);
    if (isDemoMode) {
      import("./guruDemoInsights")
        .then(({ createDemoGuruInsights }) => {
          if (controller.signal.aborted) return;
          const result = createDemoGuruInsights(scope);
          insightsCacheRef.current.set(scope, { data: result, savedAt: Date.now() });
          setData(result);
        })
        .catch(() => { if (!controller.signal.aborted) setError("Could not load sample Insights. Please retry."); })
        .finally(() => { if (!controller.signal.aborted) setLoading(false); });
      return () => controller.abort();
    }
    api.get("/insights/summary", { params: { scope }, signal: controller.signal, timeout: 15000 })
      .then(({ data: result }) => {
        if (controller.signal.aborted) return;
        if (!validGuruInsights(result, scope))
          throw new Error("Invalid insights response");
        insightsCacheRef.current.set(scope, { data: result, savedAt: Date.now() });
        setData(result);
      })
      .catch(err => {
        if (!controller.signal.aborted) setError(guruFailureMessage(err, "Could not load Insights. Please retry."));
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [scope, activeTab, isDemoMode, insightsAttempt]);

  // Chat helpers
  useEffect(() => {
    if (activeTab !== "chat") return;
    const pane = messagesScrollRef.current;
    if (pane) pane.scrollTo({ top: pane.scrollHeight, behavior: "auto" });
  }, [messages, chatLoading, activeTab]);

  const sendPrompt = async (value, retry = false) => {
    const clean = value.trim();
    if (!clean || clean.length > GURU_MESSAGE_LIMIT || requestRef.current || (retry && (!failedPrompt || !chatRetryable))) return;
    const nextId = (idRef.current += 1);
    setChatError("");
    setChatRetryable(true);
    setFailedPrompt(null);
    const history = retry ? failedPrompt.history : messages
      .filter(m => m.id !== "greeting")
      .map(m => ({ role: m.role === "guru" ? "assistant" : "user", content: m.text.slice(0, 4000) }))
      .slice(-GURU_HISTORY_LIMIT);
    // Keep only complete turns within the server's input budget.
    while (history.reduce((sum, item) => sum + item.content.length, 0) > 20000) history.splice(0, 2);
    if (!retry) setMessages(prev => [...prev, { id: `user-${nextId}`, role: "user", text: clean }]);
    setPrompt("");
    if (isDemoMode) {
      setMessages(prev => [...prev, { id: `guru-${nextId}`, role: "guru", text: demoGuruReply(clean) }]);
      return;
    }
    const controller = new AbortController();
    requestRef.current = controller;
    setChatLoading(true);
    try {
      const { data: result } = await api.post("/insights/chat", { message: clean, history, scope },
        { signal: controller.signal, timeout: 75000 });
      if (controller.signal.aborted) return;
      if (!validGuruReply(result, scope)) throw new Error("Invalid reply");
      setMessages(prev => [...prev, { id: `guru-${nextId}`, role: "guru", text: result.reply.trim().slice(0, 8000) }]);
    } catch (err) {
      if (controller.signal.aborted) return;
      setChatError(guruFailureMessage(err, "Ming could not respond. Please retry."));
      setChatRetryable(err.response?.data?.retryable !== false);
      setFailedPrompt({ message: clean, history });
    } finally {
      if (requestRef.current === controller) {
        requestRef.current = null;
        if (!controller.signal.aborted) setChatLoading(false);
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); sendPrompt(prompt); }
  };

  const cards = useMemo(() => data ? guruCards(data) : [], [data]);
  const patterns = useMemo(() => data ? guruPatterns(data) : [], [data]);
  const suggestions = useMemo(() => data ? guruSuggestions(data) : [], [data]);

  return (
    <section data-demo-allow="true" className="ai-guru-page min-h-0 w-full">
      <div className="ai-guru-frame grid min-h-0 overflow-hidden rounded-[1.4rem] border border-amber-100/10 shadow-2xl shadow-black/30 xl:rounded-[2rem]">

        {/* ── LEFT: Avatar panel ── */}
        <div className="ai-guru-profile order-1 flex flex-col gap-4 border-b border-amber-100/10 bg-stone-950/60 px-4 py-4 backdrop-blur sm:px-5 sm:py-5 md:px-6 lg:order-1 lg:min-h-0 lg:gap-4 lg:overflow-y-auto lg:border-r lg:border-b-0 lg:px-6 lg:py-4 xl:px-8 xl:py-5">
          <div className="ai-guru-identity flex flex-col items-center gap-4 text-center sm:gap-5 lg:gap-4">
            <div className="relative">
              <div className="amber-glow absolute -inset-3 rounded-full bg-amber-400/10 blur-2xl" />
              <img
                src={mingLogo}
                alt="Ming — AI Insights"
                className="ai-guru-avatar soft-float relative h-16 w-16 rounded-full object-cover ring-2 ring-amber-300/25 shadow-xl shadow-amber-900/30 sm:h-20 sm:w-20 lg:h-40 lg:w-40 xl:h-52 xl:w-52"
              />
            </div>
            <div className="ai-guru-identity-copy min-w-0 max-w-sm space-y-1.5 lg:space-y-2">
              <p className="text-[0.625rem] font-semibold uppercase tracking-[0.28em] text-amber-300/60 sm:text-xs sm:tracking-[0.35em]">
                Namo Buddhaya
              </p>
              <h2 className="font-heading text-xl font-bold text-amber-50 sm:text-2xl xl:text-[clamp(1.6rem,1.2rem+0.8vw,2.1rem)]">
                I am Ming
              </h2>
              <p className="ai-guru-description mx-auto max-w-xs text-sm leading-6 text-stone-400 sm:text-[0.95rem] sm:leading-7">
                Your personal discipline guide — shaped by ancient wisdom and modern focus. I walk beside those who seek mastery over themselves.
              </p>
            </div>
          </div>

          {/* Tab switcher */}
          <div role="group" aria-label="Ming view" className="ai-guru-tabs flex w-full gap-2 rounded-xl border border-amber-100/10 bg-white/[0.03] p-1">
            {[
              { key: "chat",     label: "Ask Ming"  },
              { key: "insights", label: "Insights" },
            ].map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setActiveTab(t.key)}
                aria-pressed={activeTab === t.key}
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
            <div className="ai-guru-scopes grid w-full grid-cols-3 gap-1.5 rounded-xl border border-amber-100/10 bg-white/[0.03] p-1">
              {SCOPES.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setScope(s.key)}
                  aria-pressed={scope === s.key}
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
              AI guidance · You stay in control
            </Motion.p>
          </div>
        </div>

        {/* ── RIGHT: Insights / Chat ── */}
        <div className="ai-guru-content order-2 flex min-h-0 flex-col bg-white/[0.025] backdrop-blur lg:order-2">

          {/* Header */}
          <div className="ai-guru-content-header shrink-0 border-b border-amber-100/10 px-4 py-4 sm:px-5 md:px-6">
            <div className="ai-guru-heading-row flex flex-wrap items-start justify-between gap-3">
              <div className="ai-guru-heading-copy">
                <p className="ai-guru-heading-eyebrow text-[0.625rem] uppercase tracking-[0.3em] text-amber-200/50">
                  {activeTab === "insights" ? "Recorded Insights" : "Your AI guide"}
                </p>
                <h3 className="text-base font-bold text-amber-50 sm:text-lg">
                  {activeTab === "insights" ? "Your Discipline Overview" : "Your Discipline Co-Pilot"}
                </h3>
              </div>
              <div className="ai-guru-header-actions ml-auto flex shrink-0 items-center gap-2">
                {activeTab === "chat" && (
                  <button type="button" className="ai-guru-clear-chat rounded-lg border border-amber-100/20 px-2 py-1 text-xs text-stone-300" onClick={() => {
                    requestRef.current?.abort(); requestRef.current = null;
                    setMessages(INITIAL_MESSAGES); setPrompt(""); setChatError("");
                    setFailedPrompt(null); setChatLoading(false);
                  }}>Clear chat</button>
                )}
                <Motion.span
                  className="ai-guru-beta-status relative shrink-0 overflow-hidden rounded-full border border-emerald-300/30 bg-emerald-500/10 px-3 py-1 text-[0.625rem] font-semibold uppercase tracking-[0.12em] text-emerald-200"
                  animate={lowMotion ? {} : { boxShadow: ["0 0 0px rgba(52,211,153,0)", "0 0 12px rgba(52,211,153,0.36)", "0 0 0px rgba(52,211,153,0)"] }}
                  transition={{ boxShadow: { duration: 2.2, repeat: Infinity, ease: "easeInOut" } }}
                >
                  <Motion.span
                    className="pointer-events-none absolute inset-y-0 left-[-40%] w-[30%] -skew-x-12 bg-white/25 blur-sm"
                    animate={lowMotion ? {} : { left: ["-40%", "130%"] }}
                    transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 1.5, ease: "easeInOut" }}
                  />
                  <span className="relative z-10">{isDemoMode ? "Demo" : "Beta"}</span>
                </Motion.span>
              </div>
            </div>
          </div>

          {/* ── Insights Tab ── */}
          <AnimatePresence mode="wait">
            {activeTab === "insights" && (
              <Motion.div
                key="insights"
                initial={lowMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="ai-guru-insights-scroll journal-scroll min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5 md:px-6"
              >
                {loading && (
                  <div className="flex h-40 items-center justify-center gap-3">
                    <p role="status" className="text-sm text-stone-400">Loading Insights…</p>
                    <Motion.div
                      className="h-7 w-7 rounded-full border-2 border-amber-400/30 border-t-amber-400"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                    />
                  </div>
                )}

                {error && !loading && (
                  <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-300">
                    <p role="alert">{error}</p>
                    <button type="button" onClick={() => setInsightsAttempt(n => n + 1)} className="mt-2 rounded-lg border px-3 py-1">Retry Insights</button>
                  </div>
                )}

                <div className="ai-guru-beta-banner mb-4 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-3 text-xs leading-5 text-stone-300">
                  {isDemoMode ? "Demo sample · Fixed sample data, separate from your account. " : ""}
                  Insights and suggestions are calculated from retained records, not AI-generated. Missing scores appear as —.
                </div>

                {data && data.scope === scope && !loading && !error && (
                  <div className="ai-guru-insights-body space-y-6">
                    {/* Period label */}
                    {data.period && (
                      <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-stone-500">
                        {data.period.from} → {data.period.to} · {data.timezone}
                      </p>
                    )}

                    <p className="text-xs leading-5 text-stone-400">{data.dataNote}</p>
                    {/* Stat cards */}
                    <div data-scope={data.scope} className="ai-guru-stat-grid grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
                      {cards.map((card, i) => (
                        <StatCard key={card.label} card={card} index={i} lowMotion={lowMotion} />
                      ))}
                    </div>

                    {/* Pattern observations */}
                    <Motion.div
                      initial={lowMotion ? false : { opacity: 0, y: 8 }}
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
                      initial={lowMotion ? false : { opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.45 }}
                      className="rounded-2xl border border-amber-400/20 bg-amber-500/[0.06] p-4"
                    >
                      <p className="mb-3 text-[0.65rem] font-semibold uppercase tracking-widest text-amber-300/70">
                        ✦ Suggested Next Steps
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
                        initial={lowMotion ? false : { opacity: 0, y: 8 }}
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
                        initial={lowMotion ? false : { opacity: 0, y: 8 }}
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
                initial={lowMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="ai-guru-chat flex min-h-0 flex-1 flex-col"
              >
                <p className="shrink-0 px-4 pt-2 text-[11px] leading-4 text-stone-400">
                  Context: {SCOPES.find(item => item.key === scope)?.label}. {isDemoMode ? "Demo · Scripted sample replies. No AI requests or saved conversations." : "Send shares your message, recent conversation, and aggregate app statistics with Groq. Notes and photos are not sent automatically. Chat resets when you leave or change accounts."}
                </p>
                {/* Messages */}
                <div className="ai-guru-messages-region relative min-h-0 flex-1 overflow-hidden">
                  <div ref={messagesScrollRef} role="log" aria-label="Conversation with Ming" aria-live="polite" aria-relevant="additions" className="ai-guru-messages-scroll journal-scroll scrollbar-none flex h-full min-h-0 flex-col gap-2.5 overflow-y-auto px-4 py-4 sm:gap-3 sm:px-5 md:px-6">
                    {messages.map((msg) => (
                      <ChatBubble key={msg.id} role={msg.role} text={msg.text} />
                    ))}
                    {chatLoading && (
                      <div className="flex items-start gap-2.5 sm:gap-3">
                        <img src={mingAvatar} alt="Ming" className="h-10 w-auto shrink-0 self-end sm:h-14" />
                        <div className="rounded-2xl border border-sky-200/15 bg-stone-950/65 px-4 py-3 shadow-none drop-shadow-none backdrop-blur-0">
                          <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-amber-300/60">Ming</p>
                          <p role="status" className="sr-only">Ming is responding…</p>
                          <div className="flex items-center gap-1.5">
                            {[0, 1, 2].map((i) => (
                              <Motion.span
                                key={i}
                                className="h-1.5 w-1.5 rounded-full bg-amber-400/60"
                                animate={lowMotion ? {} : { opacity: [0.3, 1, 0.3] }}
                                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {chatError && (
                  <div className="shrink-0 border-t border-red-400/20 px-4 py-2 text-xs text-red-200">
                    <p role="alert">{chatError}</p>
                    <button type="button" disabled={chatLoading || !chatRetryable} onClick={() => sendPrompt(failedPrompt.message, true)} className="mr-3 mt-1 rounded border px-2 py-1 disabled:cursor-not-allowed disabled:opacity-50">Retry message</button>
                    <button type="button" onClick={() => {
                      setPrompt(failedPrompt.message);
                      setMessages(prev => prev.slice(0, -1));
                      setFailedPrompt(null); setChatError("");
                    }} className="mt-1 rounded border px-2 py-1">Edit message</button>
                    <p className="mt-1">Retries may use another AI request from your quota.</p>
                  </div>
                )}
                {/* Input */}
                <div className="ai-guru-composer shrink-0 border-t border-amber-100/10 px-4 py-4 sm:px-5 md:px-6">
                  <div className="ai-guru-composer-row flex flex-col gap-2 rounded-[1.15rem] border border-amber-200/10 bg-[#120d0c]/88 p-2 ring-1 ring-inset ring-amber-300/5 sm:flex-row sm:items-center">
                    <div className="flex min-w-0 flex-1 items-center rounded-[1rem] border border-amber-100/10 bg-black/30 px-3">
                      <img src={mingAvatar} alt="Ming" className="ai-guru-composer-avatar mr-3 h-10 w-auto shrink-0 object-contain" />
                      <textarea
                        ref={composerInputRef}
                        data-demo-chat="true"
                        aria-label="Message to Ming"
                        maxLength={GURU_MESSAGE_LIMIT}
                        disabled={chatLoading || Boolean(failedPrompt)}
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Message Ming…"
                        rows={1}
                        className="min-h-[3rem] w-full flex-1 resize-none bg-transparent py-3 text-sm leading-6 text-stone-100 outline-none placeholder:text-stone-500"
                      />
                    </div>
                    <Motion.button
                      type="button"
                      onClick={() => sendPrompt(prompt)}
                      disabled={chatLoading || Boolean(failedPrompt) || !prompt.trim()}
                      animate={chatLoading || lowMotion ? {} : { boxShadow: ["0 8px 20px rgba(245,181,47,0.2)", "0 0 22px rgba(245,181,47,0.48)", "0 8px 20px rgba(245,181,47,0.2)"] }}
                      transition={{ boxShadow: { duration: 2.2, repeat: Infinity, ease: "easeInOut" } }}
                      whileHover={chatLoading || lowMotion ? {} : { y: -2, scale: 1.04 }}
                      whileTap={chatLoading || lowMotion ? {} : { scale: 0.95 }}
                      className="ai-guru-send relative min-h-[3rem] w-full overflow-hidden rounded-[1rem] border border-amber-200/35 bg-gradient-to-r from-[#ffd86b] via-[#f7bc3a] to-[#ee971d] px-5 text-sm font-black uppercase tracking-[0.16em] text-stone-950 transition hover:brightness-105 disabled:opacity-50 disabled:cursor-not-allowed sm:w-auto sm:min-w-[6.5rem]"
                    >
                      <Motion.span
                        className="pointer-events-none absolute inset-y-0 left-[-40%] w-[30%] -skew-x-12 bg-white/35 blur-sm"
                        animate={lowMotion ? {} : { left: ["-40%", "130%"] }}
                        transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 1.5, ease: "easeInOut" }}
                      />
                      <span className="relative z-10">Send</span>
                    </Motion.button>
                  </div>
                  <p className="ai-guru-composer-help mt-2 px-1 text-[10px] text-stone-600">{prompt.length}/{GURU_MESSAGE_LIMIT} · Enter to send · Shift + Enter for new line · AI can make mistakes; not medical advice.</p>
                </div>
              </Motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
