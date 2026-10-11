import { test } from "node:test";
import assert from "node:assert/strict";
import User from "../models/User.js";
import Goal from "../models/Goal.js";
import GoalProgressLog from "../models/GoalProgressLog.js";
import routes from "../routes/goalRoutes.js";
import { getGoalAnalysis } from "../controllers/goalController.js";
import { computeGoalAnalysis } from "../../shared/goalAnalysisStats.js";
import { computeGoalWeeklyReport } from "../../shared/goalWeeklyStats.js";
import { journalMonthDays } from "../../shared/journalAnalysisStats.js";
import { demoGoalAnalysis } from "../../client/src/dashboard/analysis/goalanalysis/goalAnalysisData.js";
import { validGoalAnalysisResponse } from "../../client/src/dashboard/analysis/goalanalysis/goalAnalysisResponse.js";
import { filterAnalysisGoals } from "../../client/src/dashboard/analysis/goalanalysis/goalAnalysisFilters.js";

const USER="000000000000000000000001",clock={year:2026,month:10,today:"2026-10-10",timezone:"Asia/Kolkata",now:Date.parse("2026-10-10T06:00:00Z")};
const goal = (extra={})=>({_id:"goal",title:"Read",goalType:"short-term",priority:"High",createdAt:"2026-10-01",
 updatedAt:"2026-10-01",startDate:"2026-10-01",deadline:"2026-10-20",targetValue:100,currentValue:50,subgoals:[],activityLogs:[],...extra});
const log = (extra={})=>({_id:"log-"+(extra.date||"2026-10-02T06:00:00Z"),goalId:"goal",previousValue:0,currentValue:50,date:"2026-10-02T06:00:00Z",...extra});
const sub = (extra={})=>({_id:"sub",title:"Milestone",deadline:"2026-10-03",createdAt:"2026-10-01",
 updatedAt:"2026-10-02",completed:true,completedAt:"2026-10-02T06:00:00Z",...extra});
const calc=(goals=[goal()],logs=[],extra={})=>computeGoalAnalysis(goals,logs,{...clock,...extra});
const query=value=>({select(){return this;},lean:async()=>value});
async function call(params={year:"2026",month:"10"}) {
 let status=200,body;
 await getGoalAnalysis({user:{id:USER},query:params},{status(code){status=code;return this;},json(value){body=value;return this;}});
 return {status,body};
}
function fixture(t,goals=[goal()],logs=[],account={createdAt:"2026-01-01"}) {
 t.mock.timers.enable({apis:["Date"],now:clock.now});
 t.mock.method(User,"findById",id=>{assert.equal(id,USER);return query(account);});
 t.mock.method(Goal,"find",(filter,fields)=>{
  assert.equal(filter.userId,USER);assert.equal(filter.deletedAt,undefined);
  assert.equal(fields.description,undefined);assert.equal(fields.activityLogs,1);assert.equal(fields.subgoals,1);
  return query(goals);
 });
 t.mock.method(GoalProgressLog,"find",filter=>{
  assert.equal(filter.userId,USER);assert.deepEqual(filter.goalId.$in,goals.map(row=>row._id));
  assert.equal(filter.date.$lte.getTime(),clock.now);return query(logs);
 });
}
function reconcile(a) {
 assert.equal(a.totals.goalCount,a.goals.length);
 assert.equal(a.totals.knownProgressGoals+a.totals.unknownProgressGoals,a.goals.length);
 for(const key of ["milestoneCheckins","progressUpdates"]) {
  assert.equal(a.days.reduce((sum,row)=>sum+(row[key]||0),0),a.totals[key]);
  assert.equal(a.goals.reduce((sum,row)=>sum+row[key],0),a.totals[key]);
 }
 assert.equal(a.totals.activeDays,a.days.filter(row=>row.activeGoals>0).length);
 for(const row of a.goals) assert.ok(row.activeDays<=row.eligibleDays);
}
test("strict malformed period validation rejects before owner reads",async t=>{
 t.mock.method(User,"findById",()=>assert.fail("Unexpected read"));
 for(const [year,month] of [["2026x",10],[2026,"10x"],[26,1],[1899,1],[2026,0],[2026,13],[[2026],10],[2026,[10]],[{},1],[undefined,1]])
  assert.equal((await call({year,month})).status,400);
});
test("future month rejection includes authoritative clock without database access",async t=>{
 t.mock.timers.enable({apis:["Date"],now:clock.now});t.mock.method(User,"findById",()=>assert.fail("Unexpected read"));
 const r=await call({year:"2026",month:"11"});assert.equal(r.status,400);assert.equal(r.body.today,clock.today);assert.equal(r.body.timezone,clock.timezone);
});
test("endpoint is owner scoped and returns reconstructed analysis without private descriptions or raw activity",async t=>{
 fixture(t,[goal({description:"PRIVATE DESCRIPTION",activityLogs:[{action:"progress_updated",title:"PRIVATE AUDIT",at:"2026-10-02"}]})],[log()]);
 const r=await call();assert.equal(r.status,200);assert.equal(r.body.analysis.totals.goalCount,1);
 assert.ok(!JSON.stringify(r.body).includes("PRIVATE"));assert.ok(validGoalAnalysisResponse(r.body,{year:"2026",month:"10"}));
});
test("missing account and database failure are not successful empty reports",async t=>{
 fixture(t,[],[],null);assert.equal((await call()).status,404);
 t.mock.method(User,"findById",()=>{throw new Error("private database credentials");});
 const r=await call();assert.equal(r.status,500);assert.ok(!JSON.stringify(r.body).includes("credentials"));
});
test("analysis route remains authenticated and read only",()=>{
 const index=routes.stack.findIndex(row=>row.route?.path==="/analysis");
 assert.ok(index>=0);assert.ok(routes.stack[index].route.methods.get);assert.ok(routes.stack.slice(0,index).some(row=>row.name==="protect"));
});
test("empty months have full calendar and unknown scores, never fabricated zero goal progress",()=>{
 const a=calc([]);reconcile(a);assert.equal(a.days.length,31);assert.equal(a.totals.avgProgress,null);assert.equal(a.totals.score,null);
 assert.equal(a.totals.consistency,null);assert.equal(a.totals.activityScore,null);assert.equal(a.days.at(-1).milestoneCheckins,null);
});
test("leap February and the fifth partial block use the exact calendar",()=>{
 const a=calc([],[],{year:2024,month:2});assert.equal(a.days.length,29);assert.equal(a.weeks.length,5);assert.equal(a.weeks[4].to,"2024-02-29");
});
test("current month future days and future month blocks have no scores or counts",()=>{
 const a=calc();assert.equal(a.days[10].avgProgress,null);assert.equal(a.days[10].goalCount,null);assert.equal(a.weeks[2].score,null);
 assert.equal(a.weeks[2].activityScore,null);
});
test("historical numeric progress uses retained cutoff snapshots rather than today's saved value",()=>{
 const a=calc([goal({createdAt:"2026-09-01",startDate:"2026-09-01",updatedAt:"2026-10-05",currentValue:90})],
  [log({date:"2026-09-20",currentValue:30}),log({date:"2026-10-05",previousValue:30,currentValue:90})],{month:9});
 assert.equal(a.goals[0].progress,30);assert.equal(a.asOf,"2026-09-30");assert.equal(a.totals.progressUpdates,1);
});
test("unknown history is excluded from averages and score rather than treated as zero",()=>{
 const a=calc([goal(),goal({_id:"unknown",updatedAt:"2026-10-05",currentValue:90})],[],{month:9});
 assert.equal(a.totals.goalCount,0);
 const b=calc([goal({createdAt:"2026-09-01",startDate:"2026-09-01"}),goal({_id:"unknown",createdAt:"2026-09-01",startDate:"2026-09-01",updatedAt:clock.today})],[],{month:9});
 assert.equal(b.totals.knownProgressGoals,0);assert.equal(b.totals.avgProgress,null);
 const c=calc([goal({createdAt:"2026-09-01",startDate:"2026-09-01",updatedAt:"2026-09-20"}),goal({_id:"unknown",createdAt:"2026-09-01",startDate:"2026-09-01",updatedAt:clock.today})],[],{month:9});
 assert.equal(c.totals.avgProgress,50);assert.equal(c.totals.unknownProgressGoals,1);
});
test("numeric completion requires actual target attainment, not a rounded 100 percent",()=>{
 const a=calc([goal({currentValue:99.9}),goal({_id:"complete",currentValue:100})]);
 assert.equal(a.totals.completedGoals,1);assert.equal(a.goals.find(row=>row.id==="goal").progress,100);
 assert.equal(a.goals.find(row=>row.id==="goal").isCompleted,false);
});
test("legacy null array entries and malformed audit arrays do not break monthly analysis",()=>{
 const a=calc([goal({subgoals:[null,sub()],activityLogs:[null]}),goal({_id:"numeric",activityLogs:{legacy:true}})]);
 reconcile(a);assert.equal(a.totals.goalCount,2);assert.equal(a.totals.completedMilestones,1);
});
test("removing the last milestone before the checkpoint does not mislabel a current numeric goal",()=>{
 const a=calc([goal({subgoals:[],activityLogs:[{action:"subgoal_deleted",at:"2026-10-02"}]})]);
 assert.equal(a.goals[0].milestoneBased,false);assert.equal(a.totals.knownMilestoneGoals,0);
});
test("milestone based goals ignore the default numeric target and respect known counts",()=>{
 const a=calc([goal({subgoals:[sub(),sub({_id:"pending",completed:false,completedAt:null})],currentValue:100})]);
 assert.equal(a.goals[0].progress,50);assert.equal(a.totals.completedMilestones,1);assert.equal(a.totals.totalMilestones,2);
});
test("removed or later added milestones leave historical denominators unknown",()=>{
 const a=calc([goal({createdAt:"2026-09-01",startDate:"2026-09-01",updatedAt:clock.today,
 subgoals:[sub({createdAt:"2026-10-02"})]})],[],{month:9});
 assert.equal(a.goals[0].progress,null);assert.equal(a.goals[0].total,null);assert.equal(a.totals.knownMilestoneGoals,0);
});
test("later metadata edits hide unavailable historical progress and deadline definitions",()=>{
 const a=calc([goal({createdAt:"2026-09-01",startDate:"2026-09-01",updatedAt:clock.today,
 activityLogs:[{action:"edited",at:clock.today}]})],[log({date:"2026-09-20"})],{month:9});
 assert.equal(a.goals[0].progress,null);assert.equal(a.goals[0].expected,null);assert.equal(a.goals[0].deadlineDay,null);
 assert.equal(a.goals[0].deadlineStatus,"History unavailable");assert.equal(a.totals.overdueGoals,0);
});
test("same-name goals stay distinct by ID and have numbered chart labels",()=>{
 const a=calc([goal({_id:"b"}),goal({_id:"a"})]);assert.equal(a.goals.length,2);
 assert.deepEqual(a.goals.map(row=>row.label),["Read · 1","Read · 2"]);
});
test("duplicate goal records use the latest updated document, not duplicate denominators",()=>{
 const a=calc([goal({updatedAt:"2026-10-01",currentValue:20}),goal({updatedAt:"2026-10-02",currentValue:40})]);
 assert.equal(a.totals.goalCount,1);assert.equal(a.totals.avgProgress,40);
});
test("legacy completions and retained audit sources deduplicate on the same milestone day",()=>{
 const at="2026-10-02T06:00:00Z",a=calc([goal({subgoals:[sub()],activityLogs:[
 {action:"subgoal_completed",subgoalId:"sub",title:"Milestone",at},
 {action:"subgoal_completed",title:"Milestone (Sub-goal in Read)",at}]})]);
 reconcile(a);assert.equal(a.totals.milestoneCheckins,1);assert.equal(a.days[1].cumulativeMilestoneCheckins,1);
});
test("recompletion on another date is another check-in, not another distinct milestone",()=>{
 const a=calc([goal({updatedAt:"2026-10-05",subgoals:[sub({completedAt:"2026-10-05"})],activityLogs:[
 {action:"subgoal_completed",subgoalId:"sub",at:"2026-10-02"},{action:"subgoal_reopened",subgoalId:"sub",at:"2026-10-03"},
 {action:"subgoal_completed",subgoalId:"sub",at:"2026-10-05"}]})]);
 reconcile(a);assert.equal(a.totals.milestoneCheckins,2);assert.equal(a.totals.distinctMilestonesCompleted,1);assert.equal(a.totals.activeDays,2);
});
test("reopened milestones retain completion activity but are not marked currently complete",()=>{
 const a=calc([goal({updatedAt:"2026-10-05",subgoals:[sub({completed:false,completedAt:null,updatedAt:"2026-10-05"})],
 activityLogs:[{action:"subgoal_completed",subgoalId:"sub",at:"2026-10-02"},{action:"subgoal_reopened",subgoalId:"sub",at:"2026-10-05"}]})]);
 assert.equal(a.totals.completedMilestones,0);assert.equal(a.totals.milestoneCheckins,1);
});
test("numeric audit and embedded progress updates deduplicate while real decreases remain activity",()=>{
 const at="2026-10-02T06:00:00Z",a=calc([goal({activityLogs:[{action:"progress_updated",at}]})],
 [log(),log({date:"2026-10-05",previousValue:50,currentValue:30})]);
 reconcile(a);assert.equal(a.totals.progressUpdates,2);assert.equal(a.totals.activeDays,2);
});
test("goal activity consistency starts at creation/start and stops at deletion",()=>{
 const a=calc([goal({createdAt:"2026-10-04",startDate:"2026-10-05",deletedAt:"2026-10-08",updatedAt:"2026-10-08"})],
 [log({date:"2026-10-02"}),log({date:"2026-10-06"}),log({date:"2026-10-09"})]);
 reconcile(a);assert.equal(a.goals[0].eligibleDays,4);assert.equal(a.goals[0].activeDays,1);assert.equal(a.goals[0].consistency,25);
 assert.equal(a.goals[0].asOf,"2026-10-08");assert.equal(a.goals[0].deadlineStatus,"Deleted");assert.equal(a.totals.progressUpdates,1);
});
test("goals created/started after the checkpoint and deleted before the period are excluded",()=>{
 const a=calc([goal({createdAt:"2026-10-11"}),goal({_id:"future",startDate:"2026-10-12"}),goal({_id:"old",deletedAt:"2026-09-30"})]);
 assert.equal(a.totals.goalCount,0);
});
test("app-calendar event boundaries and future event timestamps are handled consistently",()=>{
 const a=calc([goal({createdAt:"2026-09-01",startDate:"2026-09-01"})],[
 log({date:"2026-09-30T18:45:00Z"}),log({_id:"future-time",date:"2026-10-10T09:00:00Z"}),
 log({_id:"future-day",date:"2026-10-11T06:00:00Z"})]);
 reconcile(a);assert.equal(a.days[0].progressUpdates,1);assert.equal(a.totals.progressUpdates,1);
});
test("future numeric audit cannot fabricate an older baseline",()=>{
 const a=calc([goal({createdAt:"2026-09-01",startDate:"2026-09-01",updatedAt:clock.today})],
 [log({date:"2026-11-01",previousValue:80,currentValue:90})],{month:9});
 assert.equal(a.goals[0].progress,null);assert.equal(a.totals.progressUpdates,0);
});
test("past-month deadline differences are signed relative to that checkpoint, not today",()=>{
 const a=calc([goal({createdAt:"2026-03-01",startDate:"2026-03-01",updatedAt:"2026-04-05",deadline:"2026-05-10"})],[],{month:4});
 assert.equal(a.goals[0].deadlineDays,10);assert.equal(a.goals[0].deadlineStatus,"Upcoming");assert.equal(a.totals.overdueGoals,0);
});
test("past due, due today, no deadline, completed and deleted cases remain distinct",()=>{
 const a=calc([goal({deadline:"2026-10-08"}),goal({_id:"due",deadline:clock.today}),goal({_id:"none",deadline:null}),
 goal({_id:"done",deadline:"2026-10-08",currentValue:100}),goal({_id:"deleted",deadline:"2026-10-08",deletedAt:clock.today})]);
 assert.equal(a.goals.find(row=>row.id==="goal").deadlineDays,-2);assert.equal(a.totals.overdueGoals,1);assert.equal(a.totals.dueTodayGoals,1);
 assert.equal(a.goals.find(row=>row.id==="none").deadlineStatus,"No deadline");
});
test("inclusive linear calendar pace handles same-day schedules without division by zero",()=>{
 const a=calc([goal({createdAt:clock.today,startDate:clock.today,deadline:clock.today,currentValue:50})]);
 assert.equal(a.goals[0].expected,100);assert.equal(a.goals[0].eligibleDays,1);assert.equal(a.goals[0].deadlineDays,0);
});
test("unknown completion history is not evidence of an overdue incomplete goal",()=>{
 const a=calc([goal({createdAt:"2026-09-01",startDate:"2026-09-01",updatedAt:clock.today,deadline:"2026-09-20"})],[],{month:9});
 assert.equal(a.goals[0].progress,null);assert.equal(a.goals[0].deadlineDays,-10);
 assert.equal(a.goals[0].deadlineStatus,"History unavailable");assert.equal(a.totals.overdueGoals,0);
});
test("late milestones use app-calendar deadline day, not exact midnight instant",()=>{
 const a=calc([goal({subgoals:[sub({deadline:"2026-10-02",completedAt:"2026-10-02T18:00:00+05:30"})]})]);
 assert.equal(a.totals.lateMilestones,0);
 const b=calc([goal({subgoals:[sub({deadline:"2026-10-01"})]})]);assert.equal(b.totals.lateMilestones,1);
});
test("changed or missing milestone deadlines are unknown lateness, not on-time or late",()=>{
 const a=calc([goal({subgoals:[sub()],activityLogs:[{action:"subgoal_updated",subgoalId:"sub",at:"2026-10-05"}]})]);
 assert.equal(a.totals.unknownMilestoneTimings,1);assert.equal(a.totals.lateMilestones,0);
});
test("activity score and progress/pace score have explicit different denominators and match weekly calculation",()=>{
 const goals=[goal(),goal({_id:"other",title:"Build",currentValue:20})],logs=[log()],a=calc(goals,logs);
 const weekly=computeGoalWeeklyReport(goals,logs,journalMonthDays(2026,10),clock);
 assert.equal(a.totals.activityScore,50);assert.equal(a.totals.consistency,10);assert.equal(a.totals.score,weekly.weeklyScore);
 assert.match(a.scoreNote,/60%/);
});
test("month blocks include the partial fifth block without averaging future zero scores",()=>{
 const a=calc([goal({createdAt:"2026-09-01",startDate:"2026-09-01",updatedAt:"2026-09-01"})],[],{month:9});
 assert.equal(a.weeks.length,5);assert.equal(a.weeks.at(-1).eligibleDays,2);assert.equal(a.weeks.at(-1).to,"2026-09-30");
});
test("current legacy undated milestone state never invents dated completion activity",()=>{
 const a=calc([goal({updatedAt:clock.today,subgoals:[sub({completedAt:null,updatedAt:clock.today})]})]);
 assert.equal(a.totals.completedMilestones,1);assert.equal(a.totals.milestoneCheckins,0);
});
test("zero/invalid numeric targets and hostile goal titles never manufacture completion or scores",()=>{
 const a=calc([goal({targetValue:0,title:"constructor"}),goal({_id:"bad",currentValue:NaN})]);
 assert.equal(a.totals.knownProgressGoals,0);assert.equal(a.totals.avgProgress,null);assert.equal(a.totals.completedGoals,0);
});
test("filters distinguish types and priorities without truncating accessible goal names",()=>{
 const a=calc([goal({title:"A very long goal title for accessible chart values"}),goal({_id:"low",priority:"Low",goalType:"long-term"})]);
 const filtered=filterAnalysisGoals(a.goals,"High");assert.equal(filtered.length,1);assert.ok(filtered[0].chartLabel.endsWith("…"));
 assert.equal(filtered[0].label,"A very long goal title for accessible chart values");assert.equal(filterAnalysisGoals(a.goals,"Long Term").length,1);
});
test("demo snapshots share real calculations and unsupported months remain empty",()=>{
 for(const [year,month] of [[2026,3],[2026,4],[2026,5],[2025,4],[2026,10]]) {
 const d=demoGoalAnalysis(year,month);reconcile(d.analysis);assert.ok(validGoalAnalysisResponse(d,{year:String(year),month:String(month)}));
 assert.equal(d.analysis.totals.goalCount,year===2026 && [3,4].includes(month) ? 4 : 0);
 }
});
test("nested response validator rejects malformed snapshots, dates, counts, clocks and future values",()=>{
 const valid=demoGoalAnalysis(2026,4),period={year:"2026",month:"04"};
 for(const mutate of [d=>{d.analysis.days.pop();},d=>{d.analysis.goals[0].progress="80";},d=>{d.analysis.goals[0].id=null;},
 d=>{d.analysis.totals.milestoneCheckins++;},d=>{d.analysis.weeks=[];},d=>{d.timezone="invalid";},
 d=>{d.analysis.goals[0].deadlineDays="0";},d=>{d.analysis.days[0].future=true;},d=>{d.analysis.goals=[null];}]) {
 const d=structuredClone(valid);mutate(d);assert.equal(validGoalAnalysisResponse(d,period),false);
 }
});

