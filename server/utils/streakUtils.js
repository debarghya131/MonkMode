export const calculateStreak = (logs) => {
  if (!logs.length) return 0;

  // sort logs by date descending
  logs.sort((a, b) => new Date(b.date) - new Date(a.date));

  let streak = 0;
  let currentDate = new Date();

  for (let i = 0; i < logs.length; i++) {
    const logDate = new Date(logs[i].date);

    const diffDays = Math.floor(
      (currentDate - logDate) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === streak) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
};