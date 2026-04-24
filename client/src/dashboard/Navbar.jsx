import { motion as Motion } from "framer-motion";
import { useEffect, useState } from "react";
import monkLogo from "../assets/monkmode-logo.png";
import { INITIAL_HABITS } from "./habits/TodaysHabit";
import { INITIAL_TASKS } from "./todo/Today";
import NavbarBirdBackground from "./NavbarBirdBackground";

const formatDate = (date) => {
  return new Date(date).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
};

const getStreak = (key) => {
  try {
    const data = JSON.parse(localStorage.getItem(key));
    return data?.count ?? 0;
  } catch { return 0; }
};

const MONK_STREAK_KEY = "monkmode_monk_streak";
const JOURNAL_LOGGED_DAYS_KEY = "monkmode_journal_logged_days";
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

const getJournalSubmittedToday = (today) => {
  const loggedDays = readJSON(JOURNAL_LOGGED_DAYS_KEY);
  if (Array.isArray(loggedDays)) return loggedDays.includes(today);
  return false;
};

const getTodoCompletedWithoutMiss = () =>
  INITIAL_TASKS.length > 0 &&
  INITIAL_TASKS.every((task) => task.status === "completed") &&
  INITIAL_TASKS.every((task) => task.status !== "missed");

const getHabitsCompletedToday = () =>
  INITIAL_HABITS.length > 0 &&
  INITIAL_HABITS.every((habit) => habit.status === "completed");

const calculateConsistencyScore = () => {
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

const calculateMonkStreak = () => {
  const today = toLocalISODate(new Date());
  const yesterday = getYesterdayISODate();
  const allSectionsComplete =
    getJournalSubmittedToday(today) &&
    getTodoCompletedWithoutMiss() &&
    getHabitsCompletedToday();

  const stored = readJSON(MONK_STREAK_KEY);
  const currentCount = Math.max(0, Number(stored?.count) || 0);

  if (!allSectionsComplete) {
    localStorage.setItem(MONK_STREAK_KEY, JSON.stringify({ count: 0, lastDate: today }));
    return 0;
  }

  if (stored?.lastDate === today) return currentCount;

  const nextCount = stored?.lastDate === yesterday ? currentCount + 1 : 1;
  localStorage.setItem(MONK_STREAK_KEY, JSON.stringify({ count: nextCount, lastDate: today }));
  return nextCount;
};

const getMonkLevel = (streak) => {
  if (streak >= 999) return "Monk🧘";
  if (streak >= 365) return "Legend 🔥";
  if (streak >= 240) return "Warrior ⚔️";
  if (streak >= 120) return "Discipline God 😤";
  if (streak >= 60) return "Disciplined 🧠";
  if (streak >= 21) return "Consistent🎯";
  if (streak >= 7) return "Starter";
  if (streak >= 1) return "Beginner🐣";
  return "Beginner🐣";
};

function StreakStat({ label, value, days, suffix = "days", icon, labelClass, valueClass, glowColor, tooltip }) {
  const displayValue = value ?? days;

  return (
    <Motion.div
      className="group relative flex flex-col gap-0.5 rounded-xl border-l border-amber-100/15 px-4 py-2"
      whileHover={{ y: -3, scale: 1.03 }}
      transition={{ type: "spring", stiffness: 320, damping: 22 }}
    >
      <Motion.span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-1 left-0 w-px rounded-full"
        animate={{
          opacity: [0.35, 1, 0.35],
          boxShadow: [
            `0 0 0px ${glowColor}`,
            `0 0 16px ${glowColor}`,
            `0 0 0px ${glowColor}`,
          ],
        }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        style={{ backgroundColor: glowColor }}
      />
      <p className={`text-body-xs ${labelClass}`}>{label}</p>
      <Motion.p
        className={`text-body-sm font-semibold ${valueClass}`}
        animate={{
          textShadow: [
            "0 0 0px rgba(255,255,255,0)",
            `0 0 10px ${glowColor}`,
            "0 0 0px rgba(255,255,255,0)",
          ],
        }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      >
        {displayValue}{suffix ? ` ${suffix}` : ""}{" "}
        <Motion.span
          className="inline-block"
          animate={{ y: [0, -2, 0], scale: [1, 1.16, 1] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
        >
          {icon}
        </Motion.span>
      </Motion.p>
      {tooltip && (
        <div className="pointer-events-none absolute right-0 top-[calc(100%+0.6rem)] z-50 w-72 rounded-xl border border-amber-100/15 bg-stone-950/95 p-3 text-left text-[11px] leading-relaxed text-stone-300 opacity-0 shadow-2xl shadow-black/40 backdrop-blur transition duration-200 group-hover:opacity-100">
          <p className="font-semibold text-amber-200">{tooltip.title}</p>
          <ul className="mt-2 list-disc space-y-1 pl-4">
            {tooltip.rules.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
          <p className="mt-2 text-rose-200/90">{tooltip.reset}</p>
        </div>
      )}
    </Motion.div>
  );
}

export default function Navbar({ user }) {
  const firstName = user?.name || "Friend";
  const [monkStreak, setMonkStreak] = useState(0);
  const [consistencyScore, setConsistencyScore] = useState(0);
  const currentDate = formatDate(new Date());

  const journalStreak = getStreak("monkmode_journal_streak") || DEMO_STREAKS.journal;
  const todoStreak    = getStreak("monkmode_todo_streak") || DEMO_STREAKS.todo;
  const habitStreak   = getStreak("monkmode_habit_streak") || DEMO_STREAKS.habit;

  useEffect(() => {
    const refreshNavbarStats = () => {
      setMonkStreak(calculateMonkStreak());
      setConsistencyScore(calculateConsistencyScore());
    };

    refreshNavbarStats();
    window.addEventListener("storage", refreshNavbarStats);
    window.addEventListener("monkmode:journal-logged-days-updated", refreshNavbarStats);

    return () => {
      window.removeEventListener("storage", refreshNavbarStats);
      window.removeEventListener("monkmode:journal-logged-days-updated", refreshNavbarStats);
    };
  }, []);

  return (
    <div className="relative overflow-visible px-6 py-3">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background: "linear-gradient(120deg, #07192f 0%, #1a2e58 32%, #1b1741 55%, #190b12 100%)",
          backgroundSize: "280% 280%",
          animation: "navbarGradientShift 6s ease-in-out infinite",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-[-12%] w-[42%]"
        style={{
          background: "linear-gradient(90deg, transparent 0%, rgba(125,211,252,0.2) 40%, rgba(251,191,36,0.22) 65%, transparent 100%)",
          filter: "blur(10px)",
          animation: "navbarLightSweep 5s linear infinite",
        }}
      />
      <NavbarBirdBackground />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.04),transparent_18%),linear-gradient(180deg,rgba(5,10,22,0.12),rgba(10,8,18,0.2)_64%,rgba(7,5,14,0.34))]"
      />

      <div className="relative z-10 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">

        {/* LEFT: Logo + Welcome */}
        <div className="flex min-w-0 items-center gap-0">
          <img src={monkLogo} alt="MonkMode" className="h-20 w-auto translate-x-12 scale-[2.2] object-contain shrink-0" />
          <div className="min-w-0 pl-36 text-left">
            <p className="text-label-sm text-amber-300/70">Welcome back</p>
            <h1 className="mt-0.5 truncate text-heading-md text-amber-50 md:text-heading-lg">{firstName}</h1>
          </div>
        </div>

        {/* RIGHT: Info */}
        <div className="flex items-center gap-5 justify-end">

          <div className="flex flex-col gap-0.5">
            <p className="text-body-xs text-stone-400">Today</p>
            <p className="text-body-sm text-amber-50 font-medium">{currentDate}</p>
          </div>

          <StreakStat
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
            label="Level"
            value={getMonkLevel(monkStreak)}
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
