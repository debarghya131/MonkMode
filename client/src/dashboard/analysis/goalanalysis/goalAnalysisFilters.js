export const filterAnalysisGoals = (goals,filter) => goals.filter(row=>filter==="All" || row.type===filter || row.priority===filter)
  .map(row=>({...row,chartLabel:row.label.length>16 ? row.label.slice(0,15)+"…" : row.label}));

