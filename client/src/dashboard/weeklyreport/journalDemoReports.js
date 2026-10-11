import { computeJournalWeeklyStats, reportDayLabel, reportWeekLabel, shiftReportDay } from "../../../../shared/journalWeeklyStats.js";

// Sample entries, never combined with account data or sent to protected APIs.
const samples = [
  { id: "2026-04-27", offsets: [0, 1, 2, 3, 4, 5], energy: [62, 78, 88, 85, 75, 68], rating: [78, 82, 85, 90, 77, 68], wins: [1, 2, 3, 4, 2, 2], mistakes: [1, 1, 0, 0, 1, 2], achievements: [0, 1, 1, 2, 1, 1], moods: ["Focused", "Happy", "Focused", "Focused", "Calm", "Tired"], reasons: { "2026-05-03": "Rest day — intentional break after a full week" },
    analysis: "Six days were logged in this sample week, a six-day run and 86% consistency. Thursday had the highest rating and most wins; Wednesday had the highest energy. Next week, set a short Sunday reminder to aim for seven logged days." },
  { id: "2026-04-20", offsets: [0, 1, 3, 4, 6], energy: [72, 85, 70, 55, 68], rating: [75, 84, 74, 60, 72], wins: [2, 3, 2, 1, 2], mistakes: [1, 0, 2, 3, 1], achievements: [0, 2, 1, 0, 1], moods: ["Motivated", "Motivated", "Happy", "Tired", "Calm"], reasons: { "2026-04-25": "Weekend trip, forgot to log" },
    analysis: "Five days were logged in this sample week, with a longest run of two days. Tuesday had the highest energy and rating; Friday recorded the most mistakes. Next week, add a two-minute journal reminder on Wednesday and Saturday." },
  { id: "2026-04-13", offsets: [0, 2, 3, 5], energy: [78, 68, 50, 60], rating: [80, 72, 55, 65], wins: [3, 2, 1, 2], mistakes: [1, 1, 2, 2], achievements: [0, 2, 0, 1], moods: ["Calm", "Focused", "Tired", "Calm"], reasons: { "2026-04-19": "Sick day" },
    analysis: "Four days were logged in this sample week, with a longest run of two days. Monday had the highest energy and rating, while Wednesday had the most achievements. Next week, use the same evening journal reminder every day." },
];
const list = (length, label) => Array.from({ length }, (_, index) => `${label} ${index + 1}`);
export const DEMO_JOURNAL_REPORTS = Object.fromEntries(samples.map(sample => {
  const days = Array.from({ length: 7 }, (_, index) => shiftReportDay(sample.id, index));
  const entries = sample.offsets.map((offset, index) => ({
    dayKey: days[offset], mood: sample.moods[index], energyLevel: sample.energy[index], overallRating: sample.rating[index],
    wins: list(sample.wins[index], "Sample win"), mistakes: list(sample.mistakes[index], "Sample mistake"), achievement: list(sample.achievements[index], "Sample achievement"),
  }));
  const stats = computeJournalWeeklyStats(entries, days);
  const logged = new Set(entries.map(entry => entry.dayKey));
  return [sample.id, { id: sample.id, date: reportWeekLabel(days), signal: `${stats.loggedDays} logged days`, status: "Ready", ...stats,
    missedDays: days.filter(day => !logged.has(day)).map(day => ({ date: day, label: reportDayLabel(day), reason: sample.reasons[day] || null })),
    aiSummary: sample.analysis }];
}));
export const DEMO_JOURNAL_SUMMARIES = Object.values(DEMO_JOURNAL_REPORTS).map(report => ({
  id: report.id, date: report.date, signal: report.signal, status: report.status,
  loggedDays: report.loggedDays, expectedDays: report.expectedDays, consistency: report.consistency,
  topMood: report.topMood, weeklyScore: report.weeklyScore, longestStreak: report.longestStreak,
}));
