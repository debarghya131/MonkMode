import { canonicalJournalAnalysisEntries, computeJournalAnalysis, journalMonthDays, JOURNAL_MOODS } from "../../../../../shared/journalAnalysisStats.js";

export function demoJournalAnalysis(year, month) {
  const today = "2026-10-10", days = journalMonthDays(year, month);
  const docs = Number(year) === 2026 && [2, 3, 4].includes(Number(month)) ? days.filter((_, index) => index % 8 !== 5).map((dayKey, index) => ({
    dayKey, mood: JOURNAL_MOODS[[0, 6, 2, 1, 7, 5][index % 6]][0], energyLevel: 55 + index * 7 % 40, overallRating: 60 + index * 5 % 35,
    sleepTime: index % 3 === 0 ? "00:20" : "23:40", wakeUpTime: "06:30",
    wins: Array.from({ length: index % 4 }, (_, i) => `Sample win ${i + 1}`),
    mistakes: index % 3 === 0 ? ["Skipped planning"] : [], achievement: index % 2 === 0 ? ["Sample milestone"] : [],
    distractions: index % 4 === 0 ? ["Phone checking"] : [],
  })) : [];
  const entries = canonicalJournalAnalysisEntries(docs, days, { today });
  return { year: Number(year), month: Number(month), today, timezone: "Asia/Kolkata", joinedDay: "2026-02-01", entries,
    analysis: computeJournalAnalysis(entries, { year, month, today, joinedDay: "2026-02-01" }),
    dataNote: "Demo sample · All three tabs use the same isolated sample records. Calculated summaries, not AI-generated advice." };
}
