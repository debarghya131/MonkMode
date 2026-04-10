export const calculateStreak = (logs) => {
  if (!logs.length) return 0;

  const normalizeDate = (value) => {
    const date = new Date(value);
    date.setHours(0, 0, 0, 0);
    return date;
  };

  const uniqueLogDays = [
    ...new Set(logs.map((log) => normalizeDate(log.date).getTime()))
  ].sort((a, b) => b - a);

  let streak = 0;
  let expectedDate = normalizeDate(new Date());

  for (const logDay of uniqueLogDays) {
    const logDate = new Date(logDay);

    if (logDate.getTime() === expectedDate.getTime()) {
      streak++;
      expectedDate.setDate(expectedDate.getDate() - 1);
    } else if (logDate.getTime() > expectedDate.getTime()) {
      continue;
    } else {
      break;
    }
  }

  return streak;
};
