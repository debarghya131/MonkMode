import { motion as Motion } from "framer-motion";
import { useEffect, useState } from "react";
import api from "../api/axios";
import monkLogo from "../assets/monkmode-logo.webp";
import { INITIAL_HABITS } from "../../data/HabitDummyData";
import { INITIAL_TASKS } from "../../data/ToDoDummyData";
import useAuth from "../hooks/useAuth";
import useMobileLowMotion from "../hooks/useMobileLowMotion";
import NavbarBirdBackground from "./NavbarBirdBackground";

const formatDate = (date) => {
  return new Date(date).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
};

const MONK_STREAK_KEY = "monkmode_monk_streak";
const JOURNAL_LOGGED_DAYS_KEY = "monkmode_journal_logged_days";
const CONSISTENCY_SCORE_KEY = "monkmode_consistency_score";
const DEMO_STREAKS = {
  journal: 5,
  todo: 6,
  habit: 9,
};

const toLocalISODate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getYesterdayISODate = () => {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return toLocalISODate(date);
};

const readJSON = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch {
    return null;
  }
};

const readNumber = (key, fallback = 0) => {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === undefined || raw === "") return fallback;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
};

const getJournalSubmittedToday = (today) => {
  const loggedDays = readJSON(JOURNAL_LOGGED_DAYS_KEY);
  if (Array.isArray(loggedDays)) return loggedDays.includes(today);
  return false;
};

const calculateConsistencyScoreFromLocalDemo = () => {
  const today = toLocalISODate(new Date());
  const journalScore = getJournalSubmittedToday(today) ? 100 : 0;
  const todoScore = INITIAL_TASKS.length
    ? (INITIAL_TASKS.filter((task) => task.status === "completed").length / INITIAL_TASKS.length) * 100
    : 0;
  const habitScore = INITIAL_HABITS.length
    ? (INITIAL_HABITS.filter((habit) => habit.status === "completed").length / INITIAL_HABITS.length) * 100
    : 0;

  return Math.round((journalScore + todoScore + habitScore) / 3);
};

const calculateMonkStreak = (allSectionsComplete) => {
  const today = toLocalISODate(new Date());
  const yesterday = getYesterdayISODate();

  const stored = readJSON(MONK_STREAK_KEY);
  const currentCount = Math.max(0, Number(stored?.count) || 0);

  if (!allSectionsComplete) {
    // Don't write to localStorage — user may still complete everything today.
    // Returning 0 for display only; the previous stored state is preserved.
    return 0;
  }

  // Already counted a completed day today — return the stored value.
  if (stored?.lastDate === today && currentCount > 0) return currentCount;

  const nextCount = stored?.lastDate === yesterday ? currentCount + 1 : 1;
  localStorage.setItem(MONK_STREAK_KEY, JSON.stringify({ count: nextCount, lastDate: today }));
  return nextCount;
};

const getMonkLevel = (streak) => {
  if (streak >= 999) return { label: "Monk", icon: "🧘" };
  if (streak >= 365) return { label: "Legend", icon: "🔥" };
  if (streak >= 240) return { label: "Warrior", icon: "⚔️" };
  if (streak >= 120) return { label: "Discipline God", icon: "😤" };
  if (streak >= 60) return { label: "Disciplined", icon: "🧠" };
  if (streak >= 21) return { label: "Consistent", icon: "🎯" };
  if (streak >= 7) return { label: "Starter", icon: "🙂" };
  return { label: "Beginner", icon: "🐣" };
};

function RuleContent({ tooltip }) {
  return (
    <>
      <p className="font-semibold text-amber-200">{tooltip.title}</p>
      <ul className="mt-2 list-disc space-y-1 pl-4">
        {tooltip.rules.map((rule) => (
          <li key={rule}>{rule}</li>
        ))}
      </ul>
      <p className="mt-2 text-rose-200/90">{tooltip.reset}</p>
    </>
  );
}

function StreakStat({ label, value, days, suffix = "days", icon, labelClass, valueClass, glowColor, tooltip, mobileExpanded, onMobileToggle, simplifyMotion }) {
  const displayValue = value ?? days;

  return (
    <Motion.div
      className={`group relative flex min-w-0 flex-col gap-0.5 rounded-[1rem] border border-amber-100/10 bg-white/[0.035] px-3 py-2 sm:px-4 2xl:w-auto 2xl:rounded-xl 2xl:border-y-0 2xl:border-r-0 2xl:border-t-0 2xl:border-l 2xl:border-amber-100/15 2xl:bg-transparent 2xl:px-3 ${mobileExpanded ? "col-span-2" : ""}`}
      whileHover={simplifyMotion ? undefined : { y: -3, scale: 1.03 }}
      transition={{ type: "spring", stiffness: 320, damping: 22 }}
    >
      <Motion.span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-1 left-0 w-px rounded-full"
        animate={simplifyMotion ? undefined : {
          opacity: [0.35, 1, 0.35],
          boxShadow: [`0 0 0px ${glowColor}`, `0 0 16px ${glowColor}`, `0 0 0px ${glowColor}`],
        }}
        transition={simplifyMotion ? undefined : { duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        style={{ backgroundColor: glowColor, opacity: simplifyMotion ? 0.7 : undefined }}
      />
      <div className="flex min-w-0 items-center justify-between gap-2">
        <p className={`text-body-xs min-w-0 truncate ${labelClass}`}>{label}</p>
        {tooltip && (
          <button
            type="button"
            onClick={onMobileToggle}
            aria-label={`${mobileExpanded ? "Hide" : "Show"} ${label} instructions`}
            aria-expanded={mobileExpanded}
            className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-amber-100/15 bg-black/20 text-[11px] font-bold text-amber-200 transition hover:border-amber-200/35 hover:bg-amber-400/10 2xl:hidden"
          >
            {mobileExpanded ? "×" : "i"}
          </button>
        )}
      </div>
      <Motion.p
        className={`text-body-sm break-words font-semibold 2xl:whitespace-nowrap ${valueClass}`}
        animate={simplifyMotion ? undefined : {
          textShadow: [
            "0 0 0px rgba(255,255,255,0)",
            `0 0 10px ${glowColor}`,
            "0 0 0px rgba(255,255,255,0)",
          ],
        }}
        transition={simplifyMotion ? undefined : { duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      >
        {displayValue}{suffix ? ` ${suffix}` : ""}{" "}
        <span className="navbar-stat-emoji inline-block">
          {icon}
        </span>
      </Motion.p>
      {tooltip && mobileExpanded && (
        <div className="mt-2 border-t border-amber-100/10 pt-2 text-left text-[11px] leading-relaxed text-stone-300 2xl:hidden">
          <RuleContent tooltip={tooltip} />
        </div>
      )}
      {tooltip && (
        <div className="pointer-events-none absolute right-0 top-[calc(100%+0.6rem)] z-50 hidden w-64 max-w-[90vw] rounded-xl border border-amber-100/15 bg-stone-950/95 p-3 text-left text-[11px] leading-relaxed text-stone-300 opacity-0 shadow-2xl shadow-black/40 backdrop-blur transition duration-200 2xl:block 2xl:group-hover:opacity-100">
          <RuleContent tooltip={tooltip} />
        </div>
      )}
    </Motion.div>
  );
}

export default function Navbar({ user, onMenuToggle, mobileMenuOpen }) {
  const { isDemoMode } = useAuth();
  const lowMotion = useMobileLowMotion();
  const firstName = user?.name || "Friend";
  const [monkStreak, setMonkStreak] = useState(0);
  const [consistencyScore, setConsistencyScore] = useState(() => (isDemoMode ? readNumber(CONSISTENCY_SCORE_KEY, 0) : 0));
  const [journalStreak, setJournalStreak] = useState(() => (isDemoMode ? DEMO_STREAKS.journal : 0));
  const [habitStreak, setHabitStreak] = useState(() => (isDemoMode ? DEMO_STREAKS.habit : 0));
  const [todoStreak, setTodoStreak] = useState(() => (isDemoMode ? DEMO_STREAKS.todo : 0));
  const [showMobileStats, setShowMobileStats] = useState(false);
  const [activeMobileRule, setActiveMobileRule] = useState("");
  const [animateNavbarStats, setAnimateNavbarStats] = useState(() => window.innerWidth >= 1536);
  const currentDate = formatDate(new Date());

  useEffect(() => {
    let cancelled = false;

    const refreshNavbarStats = async () => {
      if (isDemoMode) {
        const allSectionsComplete =
          getJournalSubmittedToday(toLocalISODate(new Date())) &&
          INITIAL_TASKS.length > 0 &&
          INITIAL_TASKS.every((task) => task.status === "completed") &&
          INITIAL_HABITS.length > 0 &&
          INITIAL_HABITS.every((habit) => habit.status === "completed");

        setMonkStreak(calculateMonkStreak(allSectionsComplete));
        setConsistencyScore(calculateConsistencyScoreFromLocalDemo());
        setJournalStreak(DEMO_STREAKS.journal);
        setHabitStreak(DEMO_STREAKS.habit);
        setTodoStreak(DEMO_STREAKS.todo);
        return;
      }

      try {
        const { data } = await api.get("/insights/consistency");
        if (cancelled) return;

        const nextConsistency = Math.max(0, Math.min(100, Number(data?.consistencyScore || 0)));
        const nextJournalStreak = Math.max(0, Number(data?.sections?.journal?.currentStreakDays || 0));
        const nextTodoStreak = Math.max(0, Number(data?.sections?.todo?.fullCompletionStreakDays || 0));
        const nextHabitStreak = Math.max(0, Number(data?.sections?.habit?.fullCompletionStreakDays || 0));
        const allSectionsComplete = Boolean(data?.allSectionsComplete);

        setJournalStreak(nextJournalStreak);
        setTodoStreak(nextTodoStreak);
        setHabitStreak(nextHabitStreak);
        setConsistencyScore(nextConsistency);
        localStorage.setItem(CONSISTENCY_SCORE_KEY, String(nextConsistency));
        setMonkStreak(calculateMonkStreak(allSectionsComplete));
      } catch {
        // keep previous values on transient failure
      }
    };

    refreshNavbarStats();
    window.addEventListener("storage", refreshNavbarStats);
    window.addEventListener("focus", refreshNavbarStats);
    window.addEventListener("monkmode:habits-updated", refreshNavbarStats);
    window.addEventListener("monkmode:todos-updated", refreshNavbarStats);
    window.addEventListener("monkmode:journal-logged-days-updated", refreshNavbarStats);

    return () => {
      cancelled = true;
      window.removeEventListener("storage", refreshNavbarStats);
      window.removeEventListener("focus", refreshNavbarStats);
      window.removeEventListener("monkmode:habits-updated", refreshNavbarStats);
      window.removeEventListener("monkmode:todos-updated", refreshNavbarStats);
      window.removeEventListener("monkmode:journal-logged-days-updated", refreshNavbarStats);
    };
  }, [isDemoMode]);

  useEffect(() => {
    const handleResize = () => {
      setAnimateNavbarStats(window.innerWidth >= 1536);
      if (window.innerWidth >= 1536) {
        setShowMobileStats(false);
        setActiveMobileRule("");
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const mobileRuleProps = (label) => ({
    mobileExpanded: activeMobileRule === label,
    simplifyMotion: !animateNavbarStats,
    onMobileToggle: () => {
      setActiveMobileRule((current) => (current === label ? "" : label));
    },
  });

  return (
    <div className="relative px-2.5 py-2 sm:px-4 sm:py-2.5 lg:px-5 2xl:px-6">
      {/* Animated backgrounds — clipped so they never bleed outside the navbar */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
            className="dashboard-navbar-gradient absolute inset-0"
          style={{
            background: "linear-gradient(120deg, #07192f 0%, #1a2e58 32%, #1b1741 55%, #190b12 100%)",
            backgroundSize: "280% 280%",
            animation: "navbarGradientShift 6s ease-in-out infinite",
          }}
        />
        <div
          className="dashboard-navbar-sweep absolute inset-y-0 left-[-12%] w-[42%]"
          style={{
            background: "linear-gradient(90deg, transparent 0%, rgba(125,211,252,0.18) 40%, rgba(251,191,36,0.2) 65%, transparent 100%)",
            animation: "navbarLightSweep 5s linear infinite",
          }}
        />
        {!lowMotion && <NavbarBirdBackground />}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.04),transparent_18%),linear-gradient(180deg,rgba(5,10,22,0.12),rgba(10,8,18,0.2)_64%,rgba(7,5,14,0.34))]" />
      </div>

      <div className="relative z-10 flex items-center gap-2 sm:gap-3">

        {/* Hamburger — visible only below lg */}
        <button
          type="button"
          onClick={() => {
            setShowMobileStats(false);
            setActiveMobileRule("");
            onMenuToggle();
          }}
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileMenuOpen}
          aria-controls="dashboard-navigation-drawer"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-100/15 bg-white/5 text-amber-200 transition hover:border-amber-300/30 hover:bg-white/10 xl:hidden"
        >
          {mobileMenuOpen ? (
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>

        {/* Logo + Welcome — always visible */}
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3 lg:gap-4 xl:gap-3">
          <div className="relative h-10 w-[92px] shrink-0 overflow-hidden min-[390px]:w-[104px] sm:h-[46px] sm:w-[118px] lg:h-12 lg:w-[124px] 2xl:h-[54px] 2xl:w-[138px]">
            <img
              src={monkLogo}
              alt="MonkMode"
              className="pointer-events-none absolute h-[78px] w-[176px] max-w-none -translate-x-[34px] -translate-y-[18px] object-contain drop-shadow-[0_10px_24px_rgba(251,146,60,0.2)] min-[390px]:-translate-x-[30px] sm:h-[90px] sm:w-[204px] sm:-translate-x-[38px] sm:-translate-y-[21px] lg:h-[96px] lg:w-[216px] lg:-translate-x-[40px] lg:-translate-y-[22px] 2xl:h-[108px] 2xl:w-[242px] 2xl:-translate-x-[45px] 2xl:-translate-y-[25px]"
            />
          </div>
          <div className="min-w-0 text-left">
            <p className="hidden text-label-sm text-amber-300/70 sm:block">Welcome back</p>
            <h1 className="truncate text-[0.88rem] font-bold leading-tight text-amber-50 min-[390px]:text-[0.95rem] sm:text-heading-md lg:text-[1.45rem] 2xl:text-heading-lg">
              {firstName}
            </h1>
          </div>
        </div>

        <div className="ml-auto 2xl:hidden">
          <button
            type="button"
            aria-label={showMobileStats ? "Hide stats" : "Show stats"}
            onClick={() => {
              setShowMobileStats((open) => {
                if (open) setActiveMobileRule("");
                return !open;
              });
            }}
            className="grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-black/45 text-white transition hover:bg-black/65"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="4" width="7" height="7" rx="1.3" />
              <circle cx="16.5" cy="7.5" r="3.5" />
              <rect x="4" y="13" width="7" height="7" rx="1.3" />
              <rect x="13" y="13" width="7" height="7" rx="1.3" />
            </svg>
          </button>
        </div>

        {/* Right stats */}
        <div className={`${showMobileStats ? "grid" : "hidden"} journal-scroll absolute left-2.5 right-2.5 top-[calc(100%+6px)] z-20 max-h-[calc(100dvh-5rem)] grid-cols-2 gap-1.5 overflow-y-auto rounded-2xl border border-amber-100/12 bg-[#100a18]/95 p-1.5 shadow-xl shadow-black/40 md:backdrop-blur sm:left-4 sm:right-4 sm:gap-2 sm:p-2 lg:left-auto lg:w-[36rem] 2xl:static 2xl:z-auto 2xl:flex 2xl:w-auto 2xl:flex-nowrap 2xl:items-center 2xl:gap-1 2xl:overflow-visible 2xl:rounded-none 2xl:border-0 2xl:bg-transparent 2xl:p-0 2xl:shadow-none 2xl:backdrop-blur-0`}>

          {/* Date */}
          <div className="col-span-2 flex min-w-0 flex-col gap-0.5 rounded-[1rem] border border-amber-100/10 bg-white/[0.035] px-3 py-2 sm:px-4 2xl:col-span-1 2xl:rounded-none 2xl:border-y-0 2xl:border-r-0 2xl:border-t-0 2xl:border-l 2xl:border-amber-100/15 2xl:bg-transparent 2xl:px-3">
            <p className="text-body-xs text-stone-400">Today</p>
            <p className="text-body-sm truncate font-medium text-amber-50 2xl:whitespace-nowrap">{currentDate}</p>
          </div>

          <StreakStat
            {...mobileRuleProps("Monk Streak")}
            label="Monk Streak"
            days={monkStreak}
            icon="🔥"
            labelClass="text-amber-300/70"
            valueClass="text-amber-300"
            glowColor="rgba(251,191,36,0.72)"
            tooltip={{
              title: "Monk Streak Rules",
              rules: [
                "Submit today's journal.",
                "Complete every task with zero missed tasks.",
                "Complete every habit for the day.",
              ],
              reset: "If any one section is not completed, Monk Streak breaks and starts from 0.",
            }}
          />

          <StreakStat
            {...mobileRuleProps("Level")}
            label="Level"
            value={getMonkLevel(monkStreak).label}
            icon={getMonkLevel(monkStreak).icon}
            suffix=""
            labelClass="text-orange-300/70"
            valueClass="text-orange-300"
            glowColor="rgba(253,186,116,0.72)"
            tooltip={{
              title: "Monk Level",
              rules: [
                "1 day: Beginner🐣",
                "7 days: Starter🙂",
                "21 days: Consistent🎯",
                "60 days: Disciplined 🧠",
                "120 days: Discipline God 😤",
                "240 days: Warrior ⚔️",
                "365 days: Legend 🔥",
                "999+ days: Monk🧘",
              ],
              reset: "Your level is based on your current Monk Streak.",
            }}
          />

          <StreakStat
            {...mobileRuleProps("Consistency")}
            label="Consistency"
            value={consistencyScore}
            suffix="%"
            icon="🎯"
            labelClass="text-fuchsia-300/70"
            valueClass="text-fuchsia-300"
            glowColor="rgba(240,171,252,0.72)"
            tooltip={{
              title: "Consistency Score",
              rules: [
                "Based on today's journal, todo, and habit completion.",
                "Journal contributes 100% only after today's submission.",
                "Todo and habit sections use their completed item ratio.",
              ],
              reset: "The score updates as today's sections are completed.",
            }}
          />

          <StreakStat
            {...mobileRuleProps("Journal")}
            label="Journal"
            days={journalStreak}
            icon="📓"
            labelClass="text-violet-300/70"
            valueClass="text-violet-300"
            glowColor="rgba(196,181,253,0.72)"
            tooltip={{
              title: "Journal Streak Rule",
              rules: [
                "Submit one complete journal entry for the day.",
                "The streak increases once per day after submission.",
              ],
              reset: "If you skip a day, Journal streak breaks and starts from 0.",
            }}
          />

          <StreakStat
            {...mobileRuleProps("Todo")}
            label="Todo"
            days={todoStreak}
            icon="✅"
            labelClass="text-sky-300/70"
            valueClass="text-sky-300"
            glowColor="rgba(125,211,252,0.72)"
            tooltip={{
              title: "Todo Streak Rule",
              rules: [
                "Complete every scheduled task for the day.",
                "No task can be missed.",
              ],
              reset: "If any task is pending or missed by day end, Todo streak breaks and starts from 0.",
            }}
          />

          <StreakStat
            {...mobileRuleProps("Habit")}
            label="Habit"
            days={habitStreak}
            icon="🔁"
            labelClass="text-emerald-300/70"
            valueClass="text-emerald-300"
            glowColor="rgba(110,231,183,0.72)"
            tooltip={{
              title: "Habit Streak Rule",
              rules: [
                "Complete every habit scheduled for today.",
                "Each habit must be marked completed before the day ends.",
              ],
              reset: "If any habit remains pending or breaks, Habit streak starts from 0.",
            }}
          />

        </div>
      </div>
    </div>
  );
}
