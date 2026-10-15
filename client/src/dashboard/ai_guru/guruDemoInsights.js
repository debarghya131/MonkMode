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
