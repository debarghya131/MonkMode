import { test } from "node:test";
import assert from "node:assert/strict";
import User from "../models/User.js";
import GymExerciseProgress from "../models/GymExerciseProgress.js";
import GymMeasurement from "../models/GymMeasurement.js";
import GymDietPlan from "../models/GymDietPlan.js";
import routes from "../routes/gymRoutes.js";
import { getGymAnalysis } from "../controllers/gymController.js";
import { computeGymAnalysis } from "../../shared/gymAnalysisStats.js";
import { computeGymWeeklyReport } from "../../shared/gymWeeklyStats.js";
import { journalMonthDays } from "../../shared/journalAnalysisStats.js";
import { demoGymAnalysis } from "../../client/src/dashboard/analysis/gymanalysis/gymAnalysisData.js";
import { validGymAnalysisResponse } from "../../client/src/dashboard/analysis/gymanalysis/gymAnalysisResponse.js";

const USER = "000000000000000000000001";
const clock = {year:2026,month:10,today:"2026-10-10"};
const ex = (extra={})=>({exerciseId:"press",exerciseName:"Press",bodyPart:"Chest",date:"2026-10-02",sets:"3",reps:"10",weight:"40",totalTime:"12",...extra});
const measure = (extra={})=>({checkInDate:"2026-10-02",bodyWeight:"80",waist:"85",...extra});
const plan = (extra={})=>({day:"Mon",planType:"macros",isActive:true,values:{protein:"100 g",calories:"2000 kcal",sugar:"0"},...extra});
const calc = (records={},extra={})=>computeGymAnalysis(records,{...clock,...extra});
const query = value=>({select(){return this;},lean:async()=>value});
async function call(params={year:"2026",month:"10"}) {
 let status=200,body;
 await getGymAnalysis({user:{id:USER},query:params},{status(code){status=code;return this;},json(value){body=value;return this;}});
 return {status,body};
}
function fixture(t,records={},account={createdAt:"2026-01-01"}) {
 t.mock.timers.enable({apis:["Date"],now:Date.parse("2026-10-10T06:00:00Z")});
 t.mock.method(User,"findById",id=>{assert.equal(id,USER);return query(account);});
 t.mock.method(GymExerciseProgress,"find",(filter,fields)=>{
  assert.equal(filter.userId,USER);assert.deepEqual(filter.date,{$gte:"2026-10-01",$lte:clock.today});
  assert.equal(fields.notes,undefined);assert.equal(fields.weight,1);return query(records.exercises||[]);
 });
 t.mock.method(GymExerciseProgress,"aggregate",pipeline=>{
  assert.equal(String(pipeline[0].$match.userId),USER);assert.deepEqual(pipeline[0].$match.date,{$lt:"2026-10-01"});
  assert.equal(pipeline[2].$group._id,"$exerciseId");return Promise.resolve(records.baseline||[]);
 });
 t.mock.method(GymMeasurement,"find",(filter,fields)=>{
  assert.equal(filter.userId,USER);assert.equal(filter.deletedAt,null);assert.deepEqual(filter.checkInDate,{$lte:clock.today});
  assert.equal(fields.bodyWeight,1);return query(records.measurements||[]);
 });
 t.mock.method(GymDietPlan,"find",(filter,fields)=>{
  assert.equal(filter.userId,USER);assert.equal(filter.isActive,true);assert.equal(filter.planType,"macros");
  assert.equal(fields.meals,undefined);return query(records.macroPlans||[]);
 });
}
test("strict malformed period rejection occurs before database reads",async t=>{
 t.mock.method(User,"findById",()=>assert.fail("Unexpected read"));
 for(const [year,month] of [["2026x",10],[2026,"10x"],[26,1],[1899,1],[2026,0],[2026,13],[[2026],10],[2026,[10]],[{},1],[undefined,1]])
  assert.equal((await call({year,month})).status,400);
});
test("future months reject with app clock before reads",async t=>{
 t.mock.timers.enable({apis:["Date"],now:Date.parse("2026-10-10T06:00:00Z")});
 t.mock.method(User,"findById",()=>assert.fail("Unexpected read"));
 const result=await call({year:"2026",month:"11"});assert.equal(result.status,400);assert.equal(result.body.today,clock.today);
});
test("owner-scoped endpoint combines monthly entries and minimal baselines without leaking raw logs",async t=>{
 fixture(t,{exercises:[ex({notes:"PRIVATE"})],baseline:[ex({date:"2026-09-20",weight:"30"})],measurements:[measure()],macroPlans:[plan()]});
 const result=await call();assert.equal(result.status,200);
 assert.equal(result.body.analysis.exercises[0].weightChange,10);assert.ok(!JSON.stringify(result.body).includes("PRIVATE"));
 assert.ok(validGymAnalysisResponse(result.body,{year:"2026",month:"10"}));
});
test("missing account returns 404",async t=>{fixture(t,{},null);assert.equal((await call()).status,404);});
test("database failure is sanitized, not a successful empty result",async t=>{
 fixture(t);t.mock.method(GymMeasurement,"find",()=>{throw new Error("secret database URI");});
 const result=await call();assert.equal(result.status,500);assert.ok(!JSON.stringify(result.body).includes("secret"));
});
test("analysis route is authenticated",()=>{
 const stack=routes.stack;const endpoint=stack.find(row=>row.route?.path==="/analysis");
 assert.ok(endpoint?.route.methods.get);assert.ok(stack.slice(0,stack.indexOf(endpoint)).some(row=>row.name==="protect"));
});
test("empty current month retains full calendar but no invented measurements or volume",()=>{
 const a=calc();assert.equal(a.days.length,31);assert.equal(a.totals.elapsedDays,10);assert.equal(a.totals.coverage,0);
 assert.equal(a.totals.volume,null);assert.equal(a.totals.time,null);assert.equal(a.measurements.filter(row=>row.latest).length,0);
 assert.equal(a.days.at(-1).exerciseLogs,null);assert.equal(a.weeks.at(-1).coverage,null);
});
test("leap February and final partial calendar blocks are accurate",()=>{
 const a=calc({}, {year:2024,month:2});assert.equal(a.days.length,29);assert.equal(a.weeks.length,5);
 assert.equal(a.weeks.at(-1).elapsedDays,1);assert.equal(a.weeks.at(-1).to,"2024-02-29");
});
test("future, malformed, blank and unidentified exercise records are excluded",()=>{
 const a=calc({exercises:[ex({date:"2026-10-11"}),ex({date:"2026-02-30"}),ex({exerciseId:""}),ex({sets:"",reps:"",weight:"",totalTime:""})]});
 assert.equal(a.totals.exerciseLogs,0);
});
test("distinct dates count logged days, not individual exercises",()=>{
 const a=calc({exercises:[ex(),ex({exerciseId:"row",bodyPart:"Back"}),ex({date:"2026-10-03"})]});
 assert.equal(a.totals.exerciseLogs,3);assert.equal(a.totals.loggedDays,2);assert.equal(a.totals.coverage,20);
 for(const rows of [a.weeks,a.weekdays]) assert.equal(rows.reduce((sum,row)=>sum+row.loggedDays,0),2);
});
test("latest duplicates win deterministically regardless of input order",()=>{
 const entries=[ex({_id:"a",weight:"20"}),ex({_id:"b",weight:"50"})];
 assert.equal(calc({exercises:entries}).totals.volume,1500);assert.equal(calc({exercises:entries.reverse()}).totals.volume,1500);
});
test("new blank record does not revive superseded progress",()=>{
 const entries=[ex({_id:"a"}),ex({_id:"b",sets:"",reps:"",weight:"",totalTime:""})];
 assert.equal(calc({exercises:entries}).totals.exerciseLogs,0);
});
test("invalid numeric/unit values do not become fabricated zeros",()=>{
 const a=calc({exercises:[ex({weight:"40lbs",totalTime:"12junk",sets:"3x",reps:"10"})]});
 assert.equal(a.totals.volume,null);assert.equal(a.totals.time,null);assert.equal(a.totals.sets,null);
});
test("legitimate zero external load is calculable, not unknown",()=>{
 const a=calc({exercises:[ex({weight:"0"})]});assert.equal(a.totals.volume,0);assert.equal(a.totals.volumeLogs,1);
});
test("volume respects final-set overrides and rep breakdowns",()=>{
 assert.equal(calc({exercises:[ex({sets:"2",lastSetReps:"5",lastSetWeight:"20"})]}).totals.volume,500);
 assert.equal(calc({exercises:[ex({sets:"2",repsBreakdown:["8+2","6+2"],lastSetWeight:"20"})]}).totals.volume,560);
});
test("missing exercise load creates unknown volume even with valid reps",()=>{
 const a=calc({exercises:[ex({weight:"",totalTime:""})]});assert.equal(a.totals.volume,null);assert.equal(a.totals.timedLogs,0);
});
test("partial recorded volume/time use their own known entry denominators",()=>{
 const a=calc({exercises:[ex(),ex({exerciseId:"run",sets:"",reps:"",weight:"",totalTime:"20"})]});
 assert.equal(a.totals.volume,1200);assert.equal(a.totals.volumeLogs,1);assert.equal(a.totals.time,32);assert.equal(a.totals.timedLogs,2);
});
test("unknown body groups stay visible and prototype keys are safe",()=>{
 const a=calc({exercises:[ex({bodyPart:"constructor"}),ex({exerciseId:"x",bodyPart:"triceps"})]});
 assert.deepEqual(a.groups.map(row=>row.label),["Arms","Other"]);
});
test("strength uses stable exercise IDs and distinguishes duplicate names",()=>{
 const a=calc({exercises:[ex(),ex({exerciseId:"other"})]});assert.equal(a.exercises.length,2);
 assert.deepEqual(a.exercises.map(row=>row.label),["Press · 1","Press · 2"]);
});
test("strength latest pre-month baseline has signed change, not PR claim",()=>{
 const a=calc({exercises:[ex({date:"2026-09-20",weight:"30"}),ex({date:"2026-09-25",weight:"50"}),ex({weight:"40"})]});
 assert.equal(a.exercises[0].baseline.date,"2026-09-25");assert.equal(a.exercises[0].weightChange,-10);assert.equal(a.exercises[0].weightChangePercent,-20);
});
test("first entry alone and zero/blank baseline never manufacture percentage gains",()=>{
 assert.equal(calc({exercises:[ex()]}).exercises[0].weightChangePercent,null);
 for(const weight of ["0",""]) {
 const a=calc({exercises:[ex({date:"2026-09-20",weight}),ex()]});
 assert.equal(a.exercises[0].weightChangePercent,null);
 }
});
test("when no prior baseline exists, first and latest selected-month entries compare",()=>{
 const a=calc({exercises:[ex(),ex({date:"2026-10-05",weight:"45"})]});
 assert.equal(a.exercises[0].weightChange,5);assert.equal(a.exercises[0].baseline.date,"2026-10-02");
});
test("body readings are sorted, per-field baselines ignore missing fields",()=>{
 const a=calc({measurements:[measure({checkInDate:"2026-10-06",bodyWeight:"79",waist:""}),measure({checkInDate:"2026-09-20",bodyWeight:"81"}),measure({checkInDate:"2026-09-28",bodyWeight:"",waist:"86"})]});
 const weight=a.measurements.find(row=>row.id==="bodyWeight"),waist=a.measurements.find(row=>row.id==="waist");
 assert.equal(weight.change,-2);assert.equal(weight.baseline.date,"2026-09-20");assert.equal(waist.latest,null);
});
test("deleted, future, zero, malformed and wrong-unit body values are excluded",()=>{
 const a=calc({measurements:[measure({deletedAt:"2026-10-03"}),measure({checkInDate:"2026-10-12"}),measure({checkInDate:"bad"}),measure({bodyWeight:"0",waist:"85 kg"})]});
 assert.equal(a.totals.measurementDays,0);
});
test("body changes carry distinct units and neutral signed comparisons",()=>{
 const a=calc({measurements:[measure({checkInDate:"2026-09-20"}),measure({bodyWeight:"81 kg",waist:"84 cm"})]});
 assert.equal(a.measurements[0].change,1);assert.equal(a.measurements[0].unit,"kg");
 assert.equal(a.measurements.find(row=>row.id==="waist").change,-1);
});
test("latest duplicate measurement wins without reviving overwritten invalid fields",()=>{
 const a=calc({measurements:[measure({_id:"a"}),measure({_id:"b",bodyWeight:"",waist:"86"})]});
 assert.equal(a.measurements[0].latest,null);assert.equal(a.totals.measurementDays,1);
});
test("nutrition is current active weekdays only with per-nutrient valid denominators",()=>{
 const a=calc({macroPlans:[plan(),plan({day:"Tue",values:{protein:"200",calories:"garbage",sugar:"0"}}),plan({isActive:false,day:"Wed"}),plan({planType:"diet",day:"Thu"}),plan({day:"bad"})]});
 assert.equal(a.nutrition[0].average,150);assert.equal(a.nutrition[0].configuredDays,2);
 assert.equal(a.nutrition.find(row=>row.id==="calories").average,2000);
 assert.equal(a.nutrition.find(row=>row.id==="sugar").average,0);assert.match(a.nutritionNote,/not recorded intake/);
});
test("latest duplicate current macro weekday wins, not arbitrary findOne",()=>{
 const a=calc({macroPlans:[plan({_id:"a"}),plan({_id:"b",values:{protein:"150 g"}})]});
 assert.equal(a.nutrition[0].average,150);
});
test("monthly exercise volume agrees with weekly report for the same calendar scope",()=>{
 const records={exercises:[ex(),ex({date:"2026-10-05",lastSetWeight:"30"})]};
 const monthly=calc(records),weekly=computeGymWeeklyReport(records,journalMonthDays(2026,10),clock);
 assert.equal(monthly.totals.volume,weekly.stats.totalVolumeKg);assert.equal(monthly.totals.loggedDays,weekly.workoutDays);
});
test("all demo tabs derive from the same coherent sample, unsupported periods are empty",()=>{
 for(const [year,month] of [[2026,4],[2025,4],[2026,5],[2026,10]]) {
 const data=demoGymAnalysis(year,month);assert.ok(validGymAnalysisResponse(data,{year:String(year),month:String(month)}));
 assert.equal(data.analysis.totals.exerciseLogs,year===2026 && month===4 ? 24 : 0);
 }
});
test("response validator rejects missing nested rows, bad clocks and malformed readings",()=>{
 const valid=demoGymAnalysis(2026,4),period={year:"2026",month:"04"};
 for(const mutate of [
 data=>{data.analysis.days.pop();},data=>{data.analysis.measurements[0].latest.value="bad";},
 data=>{data.analysis.exercises[0].id=null;},data=>{data.analysis.nutritionDays[0].protein="bad";},
 data=>{data.timezone="invalid";},data=>{data.analysis.totals.coverage=101;},
 data=>{data.analysis.weeks=[];},data=>{data.analysis.exercises[0].entries=null;},
 data=>{data.analysis.measurements[0].entries=[null];},data=>{data.analysis.totals.exerciseLogs++;},
 ]) {const data=structuredClone(valid);mutate(data);assert.equal(validGymAnalysisResponse(data,period),false);}
});

