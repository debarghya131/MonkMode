import { motion as Motion } from "framer-motion";
import { useEffect, useState } from "react";
import monkLogo from "../assets/monkmode-logo.png";
import monkGreetingsLogo from "../assets/monkgreetingslogo.png";
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

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning . . . . 🌞";
  if (h < 18) return "Good Afternoon . . . . 🌄";
  return "Good Evening . . . . 🌙";
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

function StreakStat({ label, days, icon, labelClass, valueClass, glowColor, tooltip }) {
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
        {days} days{" "}
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
  const currentDate = formatDate(new Date());

  const journalStreak = getStreak("monkmode_journal_streak") || DEMO_STREAKS.journal;
  const todoStreak    = getStreak("monkmode_todo_streak") || DEMO_STREAKS.todo;
  const habitStreak   = getStreak("monkmode_habit_streak") || DEMO_STREAKS.habit;

  useEffect(() => {
    const refreshMonkStreak = () => setMonkStreak(calculateMonkStreak());

    refreshMonkStreak();
    window.addEventListener("storage", refreshMonkStreak);
    window.addEventListener("monkmode:journal-logged-days-updated", refreshMonkStreak);

    return () => {
      window.removeEventListener("storage", refreshMonkStreak);
      window.removeEventListener("monkmode:journal-logged-days-updated", refreshMonkStreak);
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

      <div className="relative z-10 grid grid-cols-[1fr_auto_1fr] items-center gap-4">

        {/* LEFT: Logo */}
        <div className="flex items-center gap-8">
          <img src={monkLogo} alt="MonkMode" className="h-20 w-auto translate-x-12 scale-[2.2] object-contain shrink-0" />
          <div className="pl-28">
            <div className="ml-14 flex items-center gap-0">
              <img src={monkGreetingsLogo} alt="" className="h-16 w-16 object-contain shrink-0" aria-hidden="true" />
              <p className="text-heading-sm text-amber-200 font-semibold">{getGreeting()}</p>
            </div>
          </div>
        </div>

        {/* CENTER: Welcome */}
        <div className="text-center">
          <p className="text-label-sm text-amber-300/70">Welcome back</p>
          <h1 className="text-heading-md md:text-heading-lg text-amber-50 mt-0.5">{firstName}</h1>
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
