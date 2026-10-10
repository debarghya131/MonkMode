const DAY_MS = 86_400_000;
const previousDayKey = (dayKey) =>
  new Date(Date.parse(`${dayKey}T00:00:00Z`) - DAY_MS).toISOString().slice(0, 10);

// Derive the streak from persisted, user-scoped section histories. No browser
// counter, visit-dependent increment or mutable cross-account cache is needed.
export const calculateMonkStreak = ({ journalDays = [], todoDays = [], habitDays = [], todayKey }) => {
  const journal = new Set(journalDays);
  const todos = new Set(todoDays);
  const habits = new Set(habitDays);
  const complete = (day) => journal.has(day) && todos.has(day) && habits.has(day);
  let cursor = complete(todayKey) ? todayKey : previousDayKey(todayKey);
  let streak = 0;
  while (complete(cursor)) {
    streak++;
    cursor = previousDayKey(cursor);
  }
  return streak;
};
