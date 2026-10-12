// Only shorten chart axes. Tooltips, keyboard descriptions and tables keep
// full names; preserve numbered suffixes that distinguish same-name habits.
export const compactChartLabels = rows => rows.map(row => {
  const characters = Array.from(row.label);
  const suffix = row.label.match(/ · \d+$/)?.[0] || "";
  const prefix = characters.slice(0, 19 - Array.from(suffix).length).join("").trimEnd();
  return { ...row, chartLabel: characters.length > 20 ? `${prefix}…${suffix}` : row.label };
});
