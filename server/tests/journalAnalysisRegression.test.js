import test from "node:test";
import assert from "node:assert/strict";
import Journal from "../models/Journal.js";
import User from "../models/User.js";
import journalRoutes from "../routes/journalRoutes.js";
import { getJournalAnalysis } from "../controllers/journalController.js";
import { canonicalJournalAnalysisEntries, computeJournalAnalysis, journalMonthDays, journalMood, journalSleepMinutes, JOURNAL_MOODS } from "../../shared/journalAnalysisStats.js";
import { durationLabel, clockLabel, dayLabel } from "../../client/src/dashboard/analysis/journalanalysis/analysisFormatters.js";
import { demoJournalAnalysis } from "../../client/src/dashboard/analysis/journalanalysis/journalAnalysisData.js";

const USER="000000000000000000000001", today="2026-10-10", days=journalMonthDays(2026,10);
const options={year:2026,month:10,today,joinedDay:"2026-10-01"};
const normalize=docs=>canonicalJournalAnalysisEntries(docs,days,{today,timezone:"Asia/Kolkata"});
const calculate=(docs=[],extra={})=>computeJournalAnalysis(normalize(docs),{...options,...extra});
const doc=(dayKey,extra={})=>({dayKey,...extra});
const query=value=>({select(){return this;},lean:async()=>value});
async function call(queryParams={year:"2026",month:"10"}){
 let status=200,body;
 await getJournalAnalysis({user:{id:USER},query:queryParams},{status(code){status=code;return this;},json(value){body=value;return this;}});
 return {status,body};
}
function fixture(t,docs=[],account={createdAt:"2026-10-01"}){
 t.mock.timers.enable({apis:["Date"],now:Date.parse("2026-10-10T06:00:00Z")});
 t.mock.method(Journal,"find",(filter,fields)=>{
  assert.equal(filter.userId,USER);assert.equal(fields.content,undefined);assert.equal(fields.customFields,undefined);assert.equal(fields.summary,undefined);
  assert.deepEqual(filter.$or[0].dayKey,{$gte:"2026-10-01",$lte:today});
  return query(docs);
 });
 t.mock.method(User,"findById",id=>{assert.equal(id,USER);return query(account);});
}

test("month validation rejects partial strings, arrays, objects and out-of-range values before DB reads",async t=>{
 t.mock.method(Journal,"find",()=>assert.fail("Unexpected read"));
 for(const [year,month] of [["2026x","10"],["2026","10x"],["26","10"],["2026","0"],["2026","13"],[["2026"],"10"],["2026",["10"]],[{},10],["1899","1"],[undefined,"1"]]){
  assert.throws(()=>journalMonthDays(year,month));assert.equal((await call({year,month})).status,400);
 }
});
test("Gregorian months include leap days and the complete final block",()=>{
 assert.equal(journalMonthDays(2028,2).length,29);assert.equal(journalMonthDays(2026,2).length,28);
 assert.equal(journalMonthDays(2026,4).length,30);assert.equal(days.length,31);assert.equal(days.at(-1),"2026-10-31");
 assert.equal(journalMonthDays(1900,2).length,28);assert.equal(journalMonthDays(2000,2).length,29);
});
test("all 20 journal moods normalize case without prototype lookups or invented Neutral values",()=>{
 for(const [mood] of JOURNAL_MOODS)assert.equal(journalMood(mood.toLowerCase()).label,mood);
 for(const value of ["__proto__","constructor","toString",{},null,""])assert.equal(journalMood(value),null);
 assert.equal(normalize([doc(today,{mood:"unknown"})])[0].mood,null);
});
test("canonical day keys win over timestamps; legacy timestamps use application timezone",()=>{
 const entries=normalize([doc("2026-10-01",{date:"2026-09-01"}),{date:"2026-09-30T19:00:00Z",mood:"happy",updatedAt:"2026-10-02"}]);
 assert.equal(entries.length,1);assert.equal(entries[0].date,"2026-10-01");assert.equal(entries[0].mood,"Happy");
});
test("duplicate journal days retain latest update and deterministic ID ties without double counting",()=>{
 const entries=normalize([doc(today,{_id:"a",energyLevel:10,updatedAt:today}),doc(today,{_id:"b",energyLevel:80,updatedAt:today}),doc(today,{_id:"c",energyLevel:90,updatedAt:"2026-10-09"})]);
 assert.equal(entries.length,1);assert.equal(entries[0].energy,80);
});
test("invalid and future days are excluded rather than producing bogus dates or metrics",()=>{
 const entries=normalize([doc("2026-10-11",{energyLevel:100}),doc("2026-02-31"),doc("2026-09-30"),doc("invalid")]);assert.deepEqual(entries,[]);
});
test("scores exclude null, zero, NaN, negatives and malformed values instead of defaulting to 50",()=>{
 const stats=calculate([doc("2026-10-01",{energyLevel:80}),doc("2026-10-02",{energyLevel:null,overallRating:0}),doc("2026-10-03",{energyLevel:"50",overallRating:101})]);
 assert.equal(stats.avgEnergy,80);assert.equal(stats.energyRecordedDays,1);assert.equal(stats.avgRating,null);
 assert.equal(stats.days[1].energy,null);assert.equal(stats.avgWeeklyScore,null);
});
test("mood groups count recorded days independently of metric coverage and preserve every mood type",()=>{
 const stats=calculate([doc("2026-10-01",{mood:"sad"}),doc("2026-10-02",{mood:"Sad",energyLevel:70}),doc("2026-10-03",{mood:"curious",overallRating:90}),doc("2026-10-04")]);
 assert.equal(stats.loggedDays,4);assert.equal(stats.moodLoggedDays,3);assert.equal(stats.moods.length,2);
 const sad=stats.moods.find(row=>row.mood==="Sad");assert.equal(sad.count,2);assert.equal(sad.energy,70);assert.equal(sad.energyCount,1);assert.equal(sad.rating,null);
 assert.equal(stats.days[0].date,"2026-10-01");assert.equal(stats.days[3].date,"2026-10-04");
});
test("sleep duration handles midnight, validates clock strings and rejects zero/implausible intervals",()=>{
 assert.equal(journalSleepMinutes("23:40","06:30"),410);assert.equal(journalSleepMinutes("00:20","06:30"),370);
 assert.equal(journalSleepMinutes("09:00","15:00"),360);
 for(const pair of [["25:00","06:00"],["23:99","06:00"],["23:00","23:00"],["","06:00"],["07:00","06:00"],[{},"06:00"]])assert.equal(journalSleepMinutes(...pair),null);
});
test("bedtime circular means cross midnight correctly and opposing times remain unknown",()=>{
 const stats=calculate([doc("2026-10-01",{sleepTime:"23:40",wakeUpTime:"06:30"}),doc("2026-10-02",{sleepTime:"00:20",wakeUpTime:"06:30"})]);
 assert.equal(stats.avgSleepTime,"00:00");assert.equal(stats.avgWakeTime,"06:30");assert.equal(stats.avgSleepMinutes,390);assert.equal(stats.sleepRecordedDays,2);
 assert.equal(calculate([doc("2026-10-01",{sleepTime:"00:00"}),doc("2026-10-02",{sleepTime:"12:00"})]).avgSleepTime,null);
});
test("sleep and energy gaps remain unknown; today pending and future days cannot become missed",()=>{
 const stats=calculate([doc("2026-10-01",{energyLevel:70,sleepTime:"23:00"})]);
 assert.equal(stats.days[0].sleep,null);assert.equal(stats.days[1].energy,null);
 assert.equal(stats.days[9].status,"pending");assert.equal(stats.days[10].status,"future");assert.equal(stats.missedDays,8);
});
test("month energy extremes use the full month, not the selected seven-day block",()=>{
 const stats=calculate([doc("2026-10-01",{energyLevel:50}),doc("2026-10-09",{energyLevel:95}),doc(today,{energyLevel:20})]);
 assert.equal(stats.highestEnergy.date,"2026-10-09");assert.equal(stats.lowestEnergy.date,today);
});
test("weekday averages exclude missing ratings and publish sample counts",()=>{
 const stats=calculate([doc("2026-10-02",{overallRating:40}),doc("2026-10-09",{overallRating:80}),doc("2026-10-03")]);
 const friday=stats.weekdays.find(row=>row.label==="Fri");assert.equal(friday.rating,60);assert.equal(friday.count,2);
 assert.equal(stats.weekdays.find(row=>row.label==="Sat").rating,null);
});
test("days before account creation and future dates are not missed; imported history remains eligible",()=>{
 const fresh=calculate([],{joinedDay:today});assert.equal(fresh.missedDays,0);assert.equal(fresh.pendingDays,1);
 const imported=calculate([doc("2026-10-01")],{joinedDay:"2026-10-09"});assert.equal(imported.missedDays,8);
 const unknown=calculate([],{joinedDay:null});assert.equal(unknown.missedDays,0);
});
test("streak breaks count transitions once, while unfinished today retains the last run",()=>{
 const stats=calculate([doc("2026-10-01"),doc("2026-10-02"),doc("2026-10-05"),doc("2026-10-08"),doc("2026-10-09")]);
 assert.equal(stats.longestStreak,2);assert.equal(stats.streakBreaks,2);assert.equal(stats.days[9].streak,null);
 assert.equal(stats.days[2].streak,0);assert.equal(stats.days[8].streak,2);
});
test("reflection totals count non-empty strings; repeated tags deduplicate per day case-insensitively",()=>{
 const stats=calculate([doc("2026-10-01",{wins:["one","",null,"two"],mistakes:["Phone"," phone ","__proto__"],distractions:["Tabs"]}),doc("2026-10-02",{achievement:["a"],mistakes:["PHONE","__proto__"],distractions:["tabs"]})]);
 assert.equal(stats.wins,2);assert.equal(stats.achievements,1);assert.equal(stats.mistakes,5);
 assert.equal(stats.topMistakes.find(item=>item.label.toLowerCase()==="phone").count,2);
 assert.equal(stats.topMistakes.find(item=>item.label==="__proto__").count,2);assert.equal(stats.topDistractions[0].count,2);
});
test("final partial month block contributes to scores and future-only blocks remain unknown",()=>{
 const aprilDays=journalMonthDays(2026,4);
 const entries=canonicalJournalAnalysisEntries([doc("2026-04-29",{overallRating:80}),doc("2026-04-30",{overallRating:100})],aprilDays,{today});
 const stats=computeJournalAnalysis(entries,{year:2026,month:4,today,joinedDay:"2026-04-01"});
 assert.equal(stats.weeks.length,5);assert.equal(stats.weeks[4].loggedDays,2);assert.equal(stats.weeks[4].expectedDays,2);assert.ok(stats.weeks[4].score>0);
 assert.equal(stats.avgWeeklyScore,stats.weeks[4].score);
 assert.equal(calculate().weeks[4].score,null);assert.equal(calculate().weeks[4].expectedDays,0);
});
test("all demo tabs use consistent canonical records and month totals without protected APIs",()=>{
 for(const month of [2,3,4,5]){
  const data=demoJournalAnalysis(2026,month),stats=data.analysis;
  assert.equal(stats.loggedDays,data.entries.length);assert.equal(stats.days.length,journalMonthDays(2026,month).length);
  assert.equal(stats.wins,data.entries.reduce((sum,row)=>sum+row.wins,0));
  assert.equal(stats.moods.reduce((sum,row)=>sum+row.count,0),stats.moodLoggedDays);
  assert.match(data.dataNote,/Demo sample/);
 }
});
test("endpoint is owner scoped, uses canonical keys, publishes app clock and excludes private fields",async t=>{
 fixture(t,[doc(today,{mood:"happy",content:"PRIVATE NOTES",energyLevel:80})]);
 const result=await call();assert.equal(result.status,200);assert.equal(result.body.today,today);assert.equal(result.body.timezone,"Asia/Kolkata");
 assert.equal(result.body.entries[0].mood,"Happy");assert.equal(result.body.analysis.avgEnergy,80);
 assert.doesNotMatch(JSON.stringify(result.body),/PRIVATE NOTES/);
});
test("future periods fail before reads and return authoritative clock for correcting browser defaults",async t=>{
 fixture(t);const result=await call({year:"2026",month:"11"});assert.equal(result.status,400);assert.equal(result.body.today,today);
});
test("failed database reads return safe retryable errors, not successful empty data or internals",async t=>{
 fixture(t);t.mock.method(Journal,"find",()=>{throw new Error("PRIVATE DATABASE ERROR");});
 const result=await call();assert.equal(result.status,500);assert.doesNotMatch(JSON.stringify(result.body),/PRIVATE DATABASE/);assert.equal(result.body.entries,undefined);
});
test("missing account fails closed instead of inventing a month of missed entries",async t=>{
 fixture(t,[],null);assert.equal((await call()).status,404);
});
test("clock and duration formatting preserves midnight and rolls rounded minutes into the next hour",()=>{
 assert.equal(durationLabel(359.6),"6h 00m");assert.equal(durationLabel(null),"No data");
 assert.equal(clockLabel("00:00"),"12:00 AM");assert.equal(clockLabel("23:59"),"11:59 PM");
 assert.match(dayLabel("2026-10-01"),/Thu.*Oct 1/);
});
test("analysis route remains an authenticated read-only GET",()=>{
 assert.ok(journalRoutes.stack[0].handle);const layer=journalRoutes.stack.find(item=>item.route?.path==="/analysis");assert.equal(layer.route.methods.get,true);assert.equal(layer.route.methods.post,undefined);
});
