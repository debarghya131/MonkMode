import { computeGoalAnalysis, GOAL_ANALYSIS_NOTE } from "../../../../../shared/goalAnalysisStats.js";
export function demoGoalAnalysis(year,month) {
  const sample = Number(year)===2026 && [3,4].includes(Number(month));
  const subgoals = Array.from({length:4},(_,index)=>({ _id:"milestone-"+index,title:"Milestone "+(index+1),
    createdAt:"2026-03-01",updatedAt:index<3 ? "2026-04-0"+(index+2) : "2026-03-01",
    deadline:"2026-04-15",completed:index<3,completedAt:index<3 ? "2026-04-0"+(index+2)+"T06:00:00Z" : null }));
  const goals = !sample ? [] : [
    {_id:"portfolio",title:"Build a portfolio",priority:"High",goalType:"short-term",createdAt:"2026-03-01",updatedAt:"2026-04-05",
      startDate:"2026-03-01",deadline:"2026-04-30",subgoals,activityLogs:subgoals.filter(row=>row.completed).map(row=>({action:"subgoal_completed",subgoalId:row._id,title:row.title,at:row.completedAt}))},
    {_id:"books",title:"Read 20 books",priority:"Medium",goalType:"long-term",createdAt:"2026-03-01",updatedAt:"2026-04-12",
      startDate:"2026-03-01",deadline:"2026-12-31",targetValue:20,currentValue:7,subgoals:[]},
    {_id:"practice",title:"Practice drawing",priority:"Low",createdAt:"2026-03-01",updatedAt:"2026-04-02",
      currentValue:5,targetValue:20,subgoals:[]},
    {_id:"import",title:"Imported goal",priority:"Medium",createdAt:"2026-03-01",updatedAt:"2026-09-01",currentValue:90,targetValue:100,subgoals:[]},
  ];
  const logs = !sample ? [] : [{_id:"book-1",goalId:"books",previousValue:0,currentValue:5,date:"2026-03-20T06:00:00Z"},
    {_id:"book-2",goalId:"books",previousValue:5,currentValue:7,date:"2026-04-12T06:00:00Z"},
    {_id:"practice-1",goalId:"practice",previousValue:0,currentValue:5,date:"2026-04-02T06:00:00Z"}];
  const clock = {today:"2026-10-10",timezone:"Asia/Kolkata",serverNow:"2026-10-10T06:00:00Z"};
  return {year:Number(year),month:Number(month),...clock,joinedDay:"2026-03-01",
    analysis:computeGoalAnalysis(goals,logs,{year,month,...clock,now:Date.parse(clock.serverNow)}),dataNote:GOAL_ANALYSIS_NOTE};
}

