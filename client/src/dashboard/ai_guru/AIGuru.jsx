import { useRef, useEffect, useState } from "react";
import { motion as Motion } from "framer-motion";
import mingLogo from "../../assets/minglogo1.png";
import mingAvatar from "../../assets/minglogo2.png";

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

const buildGuruReply = () =>
  `Here is your next best move: set one non-negotiable priority, time-box it for 45 minutes, then execute before switching tabs. If you wish, I can break this into an exact hour-by-hour action plan.`;

function TypewriterText({ text }) {
  const [displayed, setDisplayed] = useState("");

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      i += 1;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(interval);
    }, 18);
    return () => clearInterval(interval);
  }, [text]);

  return (
    <>
      {displayed}
      <span className="animate-pulse">|</span>
    </>
  );
}

function ChatBubble({ role, text }) {
  const isUser = role === "user";
  return (
    <div className={`msg-slide-in flex w-full items-start gap-3 ${isUser ? "justify-end flex-row-reverse" : ""}`}>
      {!isUser && (
        <img
          src={mingAvatar}
          alt="Ming"
          className="soft-float h-16 w-auto shrink-0 self-end drop-shadow-[0_0_8px_rgba(245,181,47,0.5)]"
        />
      )}
      <article
        className={`rounded-2xl border px-4 py-3 text-sm leading-6 shadow-none ${
          isUser
            ? "ml-auto w-fit max-w-[85%] border-amber-300/30 bg-amber-500/12 text-amber-100"
            : "w-full max-w-4xl border-sky-200/20 bg-sky-500/10 text-stone-200"
        }`}
      >
        {!isUser && (
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-amber-300/60">
            Ming
          </p>
        )}
        <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
          {isUser ? text : <TypewriterText key={text} text={text} />}
        </p>
      </article>
    </div>
  );
}

export default function AIGuru() {
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [prompt, setPrompt] = useState("");
  const [showPrompts, setShowPrompts] = useState(false);
  const bottomRef = useRef(null);
  const idRef = useRef(0);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendPrompt = (value) => {
    const clean = value.trim();
    if (!clean) return;

    const nextId = (idRef.current += 1);
    const userMsg = { id: `user-${nextId}`, role: "user", text: clean };
    const guruMsg = { id: `guru-${nextId}`, role: "guru", text: buildGuruReply() };

    setMessages((prev) => [...prev, userMsg, guruMsg]);
    setPrompt("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendPrompt(prompt);
    }
  };

  return (
    <section className="h-full min-h-0 w-full lg:-mt-4 xl:-mt-6">
      <div className="panel-rise-in grid min-h-[78vh] overflow-hidden rounded-[1.5rem] border border-amber-100/10 shadow-2xl shadow-black/30 lg:h-[calc(100vh-9rem)] lg:min-h-0 lg:grid-cols-[minmax(16rem,22rem)_minmax(0,1fr)] xl:rounded-[2rem]">

        {/* ── LEFT: Avatar + Instructions ── */}
        <div className="order-1 flex flex-col gap-4 border-b border-amber-100/10 bg-stone-950/60 px-4 py-5 backdrop-blur sm:px-5 md:px-6 lg:order-1 lg:min-h-0 lg:gap-4 lg:overflow-y-auto lg:border-r lg:border-b-0 lg:px-6 lg:py-4 xl:px-8 xl:py-5">
          <div className="flex flex-col items-center gap-4 text-center sm:gap-5 lg:gap-4">
            <div className="relative">
              <div className="amber-glow absolute -inset-3 rounded-full bg-amber-400/10 blur-2xl" />
              <img
                src={mingLogo}
                alt="Ming — AI Guru"
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

          <div className="panel-rise-in w-full space-y-3 rounded-2xl border border-amber-100/10 bg-white/[0.03] p-4 lg:mt-2">
            <p className="text-[0.625rem] font-semibold uppercase tracking-[0.26em] text-amber-300/50">
              How to talk with Ming
            </p>
            <ul className="space-y-2.5 text-xs leading-6 text-stone-400 sm:text-[0.8125rem]">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-amber-400">✦</span>
                Share your current state — goals, struggles, or what you want to plan.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-amber-400">✦</span>
                Ask for recovery plans, deep work schedules, or habit reviews.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-amber-400">✦</span>
                Be honest. Ming responds to what you give.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-amber-400">✦</span>
                Use quick prompts below the chat to get started instantly.
              </li>
            </ul>
          </div>

          <div className="mt-1 hidden lg:block lg:text-center">
            <p className="text-[10px] italic leading-5 text-stone-600">
              "Discipline is the bridge between goals and accomplishment."
            </p>
            <p className="shimmer-text mt-6 text-[10px] font-medium uppercase tracking-[0.18em] [text-shadow:0_0_12px_rgba(245,181,47,0.34),0_0_24px_rgba(245,181,47,0.24)] lg:mt-8">
              Full Features Comming Soon
            </p>
          </div>
        </div>

        {/* ── RIGHT: Chat ── */}
        <div className="order-2 flex min-h-[32rem] flex-col bg-white/[0.025] backdrop-blur lg:order-2 lg:min-h-0">
          {/* Header */}
          <div className="border-b border-amber-100/10 px-4 py-4 sm:px-5 md:px-6">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[0.625rem] uppercase tracking-[0.3em] text-amber-200/50">
                  AI Guru
                </p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <h3 className="text-base font-bold text-amber-50 sm:text-lg xl:text-[clamp(1.05rem,0.95rem+0.35vw,1.3rem)]">
                    Your Discipline Co-Pilot
                  </h3>
                  <p className="shimmer-text text-[10px] font-medium uppercase tracking-[0.18em] [text-shadow:0_0_12px_rgba(245,181,47,0.34),0_0_24px_rgba(245,181,47,0.24)]">
                    Full Features Comming Soon
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Motion.span
                  className="soft-float relative min-h-8 overflow-hidden rounded-full border border-emerald-300/30 bg-emerald-500/10 px-3 py-1 text-[0.625rem] font-semibold uppercase tracking-[0.12em] text-emerald-200"
                  animate={{
                    boxShadow: [
                      "0 0 0px rgba(52,211,153,0)",
                      "0 0 12px rgba(52,211,153,0.36)",
                      "0 0 0px rgba(52,211,153,0)",
                    ],
                  }}
                  transition={{
                    boxShadow: { duration: 2.2, repeat: Infinity, ease: "easeInOut" },
                  }}
                >
                  <Motion.span
                    className="pointer-events-none absolute inset-y-0 left-[-40%] w-[30%] -skew-x-12 bg-white/25 blur-sm"
                    animate={{ left: ["-40%", "130%"] }}
                    transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 1.5, ease: "easeInOut" }}
                  />
                  <span className="relative z-10">Beta</span>
                </Motion.span>
                <button
                  type="button"
                  onClick={() => setShowPrompts((p) => !p)}
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border transition sm:hidden ${
                    showPrompts
                      ? "border-amber-400/50 bg-amber-500/25 text-amber-300"
                      : "border-amber-200/20 bg-amber-500/10 text-amber-400"
                  }`}
                  aria-label="Toggle quick prompts"
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                    <rect x="2" y="2" width="7" height="7" rx="1.5" />
                    <rect x="11" y="2" width="7" height="7" rx="1.5" />
                    <rect x="2" y="11" width="7" height="7" rx="1.5" />
                    <rect x="11" y="11" width="7" height="7" rx="1.5" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Quick prompts — toggleable on mobile, always visible on sm+ */}
            <div className={`mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 ${showPrompts ? "grid" : "hidden sm:grid"}`}>
              {QUICK_PROMPTS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => { sendPrompt(item); setShowPrompts(false); }}
                  className="min-h-12 rounded-2xl border border-amber-200/20 bg-amber-500/10 px-3 py-2 text-left text-xs font-semibold leading-5 text-amber-200 transition duration-200 hover:-translate-y-0.5 hover:border-amber-200/40 hover:bg-amber-500/20"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          {/* Messages */}
          <div className="relative flex-1 overflow-hidden lg:min-h-0">
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 hidden h-14 bg-gradient-to-t from-[#221714] to-transparent lg:block" />
            <div className="journal-scroll flex min-h-[15rem] flex-col gap-3 overflow-y-auto px-4 py-4 pr-2 sm:min-h-[18rem] sm:px-5 md:px-6 md:pr-3 lg:h-full lg:min-h-0">
              {messages.map((msg) => (
                <ChatBubble key={msg.id} role={msg.role} text={msg.text} />
              ))}
              <div ref={bottomRef} />
            </div>
          </div>

          {/* Input */}
          <div className="border-t border-amber-100/10 px-4 py-4 sm:px-5 md:px-6">
            <div className="mb-1.5 flex items-center justify-between gap-3 px-1">
              <p className="text-[0.62rem] font-semibold uppercase tracking-[0.26em] text-amber-300/55">
                Message Ming
              </p>
              <p className="hidden text-[10px] text-stone-500 sm:block">
                Enter to send · Shift + Enter for new line
              </p>
            </div>

            <div className="flex flex-col gap-2 rounded-[1.15rem] border border-amber-200/10 bg-[#120d0c]/88 p-2 ring-1 ring-inset ring-amber-300/5 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-center rounded-[1rem] border border-amber-100/10 bg-black/30 px-3">
                <img
                  src={mingAvatar}
                  alt="Ming"
                  className="mr-3 h-11 w-auto shrink-0 object-contain"
                />
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask Ming anything about your discipline system..."
                  rows={1}
                  className="min-h-[3.5rem] w-full flex-1 resize-none bg-transparent py-3 text-sm leading-6 text-stone-100 outline-none transition placeholder:text-stone-500 sm:min-h-[3.25rem]"
                />
              </div>
              <Motion.button
                type="button"
                onClick={() => sendPrompt(prompt)}
                animate={{
                  boxShadow: [
                    "0 8px 20px rgba(245,181,47,0.2)",
                    "0 0 22px rgba(245,181,47,0.48)",
                    "0 8px 20px rgba(245,181,47,0.2)",
                  ],
                }}
                transition={{
                  boxShadow: { duration: 2.2, repeat: Infinity, ease: "easeInOut" },
                }}
                whileHover={{
                  y: -2,
                  scale: 1.04,
                  boxShadow: "0 0 24px rgba(245,181,47,0.64), 0 0 46px rgba(245,181,47,0.22)",
                }}
                whileTap={{ scale: 0.95 }}
                className="relative min-h-[3.25rem] w-full overflow-hidden rounded-[1rem] border border-amber-200/35 bg-gradient-to-r from-[#ffd86b] via-[#f7bc3a] to-[#ee971d] px-5 text-sm font-black uppercase tracking-[0.16em] text-stone-950 transition duration-200 hover:brightness-105 sm:w-auto sm:min-w-[6.5rem] sm:self-auto"
              >
                <Motion.span
                  className="pointer-events-none absolute inset-y-0 left-[-40%] w-[30%] -skew-x-12 bg-white/35 blur-sm"
                  animate={{ left: ["-40%", "130%"] }}
                  transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 1.5, ease: "easeInOut" }}
                />
                <span className="relative z-10">Send</span>
              </Motion.button>
            </div>

            <p className="mt-2 px-1 text-[10px] text-stone-600 sm:hidden">
              Enter to send · Shift + Enter for new line
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
