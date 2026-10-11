import { computeGuruInsights } from "../../../../shared/guruInsightsStats.js";
import { shiftReportDay } from "../../../../shared/journalWeeklyStats.js";

export function createDemoGuruInsights(scope) {
  // Explicitly isolated sample records. No account data, network calls or persistence.
  const today = "2026-10-10";
  const days = Array.from({ length: 30 }, (_, index) => shiftReportDay(today, index - 29));
  const habits = [{ _id: "demo-habit", title: "Sample meditation", repeatType: "daily", startDate: days[0], createdAt: days[0] }];
  return computeGuruInsights({ habits,
    journals: days.filter((_, index) => index % 4 !== 0).map(dayKey => ({ dayKey, mood: "Calm", energyLevel: 70, overallRating: 75 })),
    habitLogs: days.filter((_, index) => index % 3 !== 0).map(dayKey => ({ habitId: "demo-habit", dayKey, completed: true })),
    todos: [{ _id: "demo-task", title: "Sample reading", repeatType: "daily", startDate: days[0], dayStates: days.filter((_, index) => index % 2 === 0).map(dayKey => ({ dayKey, status: "completed" })) }],
    goals: [{ _id: "demo-goal", title: "Sample books", createdAt: days[0], updatedAt: today, currentValue: 3, targetValue: 10 }],
    goalLogs: [{ goalId: "demo-goal", date: days[27], previousValue: 2, currentValue: 3 }],
    exercises: days.filter((_, index) => index % 3 === 0).map(date => ({ date, exerciseId: "demo-row", bodyPart: "Back", sets: "3", reps: "8" })),
    measurements: [{ checkInDate: days[25], bodyWeight: "75" }],
  }, scope, { today, time: "12:00", timezone: "Asia/Kolkata" });
}

export function guruCards({ journal, habits, todos, goals, gym }) {
  const rate = value => value === null ? "—" : `${value}%`;
  return [
    { label: "Journal", icon: "📓", value: journal.entryCount, unit: "logged days", color: "sky",
      sub: `Avg energy ${journal.avgEnergyLevel ?? "—"}/100 · Rating ${journal.avgOverallRating ?? "—"}/100` },
    { label: "Habits", icon: "⚡", value: rate(habits.completionRate), unit: "scheduled check-ins completed", color: "emerald",
      sub: `${habits.completedLogs} of ${habits.possibleLogs} check-ins · ${habits.totalActiveHabits} currently active` },
    { label: "To-Do", icon: "✓", value: todos.completed, unit: "task occurrences completed", color: "yellow",
      sub: `${rate(todos.completionRate)} of ${todos.total} scheduled · ${todos.missed} missed · ${todos.pending} pending` },
    { label: "Goals", icon: "🎯", value: goals.progressUpdates, unit: "recorded progress updates", color: "violet",
      sub: `${goals.milestoneCompletions} milestone completions · ${goals.completedGoals}/${goals.activeGoals} current goals complete` },
    { label: "Gym", icon: "💪", value: gym.workoutDays, unit: "logged workout days", color: "orange",
      sub: `${gym.exercisesLogged} exercise entries · ${gym.uniqueExercises} distinct exercises · ${gym.measurementsTaken} measurement days` },
  ];
}

export function guruPatterns(data) {
  const { journal, habits, todos, goals, gym } = data;
  return [
    journal.entryCount ? `${journal.entryCount} journal days recorded.${journal.topMood ? ` Most recorded mood: ${journal.topMood}.` : " No recorded mood."} Energy and rating averages exclude missing scores.` : "No journal entries retained in this period.",
    `${habits.completedLogs} completed, ${habits.missed} missed and ${habits.pending} pending habit check-ins from retained schedules.`,
    `${todos.completed} completed, ${todos.missed} missed and ${todos.pending} pending task occurrences. Ending a schedule is not a completion.`,
    `${goals.progressUpdates} progress updates across ${goals.goalsUpdated} goals; ${goals.milestoneCompletions} distinct milestone completions.${goals.unknownProgressGoals ? " Some goal history is unavailable." : ""}`,
    `${gym.workoutDays} logged workout days and ${gym.measurementsTaken} measurement days. Logged activity does not establish workout-plan adherence or health outcomes.`,
  ];
}

export function guruSuggestions(data) {
  const suggestions = [];
  if (!data.journal.entryCount) suggestions.push({ area: "Journal", icon: "📓", text: "If useful, make a brief journal entry to start a record. Missing logs are not evidence of a bad day." });
  if (data.todos.missed) suggestions.push({ area: "Tasks", icon: "✓", text: "Review missed tasks and choose one realistic recovery step. Ming does not reschedule or complete tasks for you." });
  if (data.habits.missed) suggestions.push({ area: "Habits", icon: "⚡", text: "Choose one missed habit and check whether its reminder and repeat days fit your routine." });
  if (data.goals.activeGoals) suggestions.push({ area: "Goals", icon: "🎯", text: "Choose one next milestone or measurable step, then record progress when it happens." });
  suggestions.push({ area: "Review", icon: "✦", text: "Compare another period in your weekly reports before drawing trend conclusions. These suggestions are rule-based, not AI-generated." });
  return suggestions;
}

export function demoGuruReply(message) {
  const suffix = " This is a scripted demo, not personalized AI advice. Sign in to chat with Ming using your own aggregate data.";
  if (/gym|workout/i.test(message)) return "Sample planning idea: reserve time to review a workout plan appropriate for you, and log only activity you actually perform. Consult a qualified professional for exercise or health guidance." + suffix;
  if (/missed|recover/i.test(message)) return "Sample recovery idea: review missed tasks, choose one manageable next step, and adjust the remaining schedule yourself." + suffix;
  if (/habit/i.test(message)) return "Sample habit idea: choose one habit, pair it with a repeatable cue, and use a reminder that fits your day." + suffix;
  return "Sample focus plan: choose one clear outcome, reserve a focused work block, take a break, and review what remains. Adjust the plan to your available time." + suffix;
}
