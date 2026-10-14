export const percentLabel = value => value === null || value === undefined ? "No data" : value + "%";
export const countLabel = (value, singular) => `${value} ${singular}${value === 1 ? "" : "s"}`;
export const deadlineLabel = row => row.deadlineDays === null ? row.deadlineStatus : row.deadlineStatus + " · " +
  (row.deadlineDays < 0 ? countLabel(Math.abs(row.deadlineDays), "day") + " past deadline" : row.deadlineDays === 0 ? "deadline day" : countLabel(row.deadlineDays, "day") + " remaining");

