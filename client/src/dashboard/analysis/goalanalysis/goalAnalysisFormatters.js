export const percentLabel = value => value === null || value === undefined ? "No data" : value + "%";
export const deadlineLabel = row => row.deadlineDays === null ? row.deadlineStatus : row.deadlineStatus + " · " +
  (row.deadlineDays < 0 ? Math.abs(row.deadlineDays) + " days past deadline" : row.deadlineDays === 0 ? "deadline day" : row.deadlineDays + " days remaining");

