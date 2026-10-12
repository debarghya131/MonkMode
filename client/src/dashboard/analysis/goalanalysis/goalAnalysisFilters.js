export const filterAnalysisGoals = (goals,filter) => goals.filter(row=>filter==="All" || row.type===filter || row.priority===filter)
  .map(row=>{
    const characters = Array.from(row.label);
    // Keep numbered suffixes visible for duplicate titles. Full labels remain
    // available in tooltips, keyboard descriptions, summaries and tables.
    const suffix = row.label.match(/ · \d+$/)?.[0] || "";
    const prefix = characters.slice(0, 15 - Array.from(suffix).length).join("").trimEnd();
    return {...row,chartLabel:characters.length>16 ? `${prefix}…${suffix}` : row.label};
  });

