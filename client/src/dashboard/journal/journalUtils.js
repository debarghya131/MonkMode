export const journalDayKey = (date = new Date(), timeZone = "Asia/Kolkata") => {
  const parts = new Intl.DateTimeFormat("en", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const part = (type) => parts.find(item => item.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
};

export const formatJournalDay = (dayKey, options = {}) =>
  new Date(`${dayKey}T12:00:00Z`).toLocaleDateString("en-US", { ...options, timeZone: "UTC" });

export const demoJournalConsistency = (entries) => {
  const days = [...new Set(entries.map(entry => entry.dayKey || entry.date?.slice(0, 10)).filter(Boolean))].sort();
  const expected = days.length ? Math.round((Date.parse(days.at(-1)) - Date.parse(days[0])) / 86_400_000) + 1 : 0;
  return {
    lifetimeLoggedDays: days.length,
    lifetimeExpectedDays: expected,
    lifetimeConsistency: expected ? Number((days.length / expected * 100).toFixed(1)) : 0
  };
};
