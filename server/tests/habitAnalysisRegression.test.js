import test from "node:test";
import assert from "node:assert/strict";
import Habit from "../models/Habit.js";
import HabitLog from "../models/HabitLog.js";
import User from "../models/User.js";
import routes from "../routes/habitRoutes.js";
import { getHabitAnalysis } from "../controllers/habitController.js";
import { computeHabitAnalysis } from "../../shared/habitAnalysisStats.js";
import { computeHabitWeeklyReport } from "../../shared/habitWeeklyStats.js";
import { journalMonthDays } from "../../shared/journalAnalysisStats.js";
import { demoHabitAnalysis } from "../../client/src/dashboard/analysis/habitanalysis/habitAnalysisData.js";
import { validHabitAnalysisResponse, habitAnalysisClockValid } from "../../client/src/dashboard/analysis/habitanalysis/habitAnalysisResponse.js";

const USER = "000000000000000000000001";
const clock = { year: 2026, month: 10, today: "2026-10-10", timezone: "Asia/Kolkata" };
const habit = (extra = {}) => ({ _id: "habit", title: "Read", category: "Study", priority: "High", repeatType: "daily", startDate: "2026-10-01", time: "08:00", ...extra });
const log = (dayKey, extra = {}) => ({ habitId: "habit", dayKey, completed: true, ...extra });
const calculate = (habits = [habit()], logs = [], extra = {}) => computeHabitAnalysis(habits, logs, { ...clock, ...extra });
const sum = (rows, key) => rows.reduce((total, row) => total + row[key], 0);
function reconcile(analysis) {
  const totals = analysis.totals;
  assert.equal(totals.total, totals.completed + totals.pending + totals.missed);
  for (const rows of [analysis.days, analysis.weekdays, analysis.weeks, analysis.categories, analysis.priorities, analysis.times, analysis.habits]) {
    for (const key of ["total", "completed", "pending", "missed"]) assert.equal(sum(rows, key), totals[key]);
  }
}
const query = value => ({ select() { return this; }, lean: async () => value });
async function call(params = { year: "2026", month: "10" }) {
  let status = 200, body;
  await getHabitAnalysis({ user: { id: USER }, query: params }, { status(code) { status = code; return this; }, json(value) { body = value; return this; } });
  return { status, body };
}
function fixture(t, habits = [habit()], logs = [], account = { createdAt: "2026-10-01" }) {
  t.mock.timers.enable({ apis: ["Date"], now: Date.parse("2026-10-10T06:00:00Z") });
  t.mock.method(User, "findById", id => { assert.equal(id, USER); return query(account); });
  t.mock.method(Habit, "find", (filter, fields) => {
    assert.equal(filter.userId, USER); assert.equal(filter.deletedAt, undefined);
    assert.equal(fields.title, 1); assert.equal(fields.note, undefined); assert.equal(fields.activityLogs, undefined);
    assert.equal(fields.pendingDays, 1); assert.equal(fields.updatedAt, 1);
    return query(habits);
  });
  t.mock.method(HabitLog, "find", filter => {
    assert.deepEqual(filter.habitId.$in, habits.map(row => row._id));
    assert.equal(filter.completed, undefined);
    assert.deepEqual(filter.$or[0].dayKey, { $gte: "2026-10-01", $lte: clock.today });
    assert.deepEqual(filter.$or[1].dayKey.$in, [null, ""]);
    return query(logs);
  });
}

test("strict period parameters reject malformed years, partial months, arrays and objects before reads", async t => {
  t.mock.method(Habit, "find", () => assert.fail("Unexpected habit read"));
  t.mock.method(User, "findById", () => assert.fail("Unexpected account read"));
  for (const [year, month] of [["2026x", 10], [2026, "10x"], [26, 1], [1899, 1], [2026, 0], [2026, 13], [[2026], 10], [2026, [10]], [{}, 1], [undefined, 1]]) {
    assert.equal((await call({ year, month })).status, 400);
  }
});
test("future months fail before database reads with authoritative timezone and app-day metadata", async t => {
  t.mock.timers.enable({ apis: ["Date"], now: Date.parse("2026-10-10T06:00:00Z") });
  t.mock.method(User, "findById", () => assert.fail("Unexpected account read"));
  const result = await call({ year: "2026", month: "11" });
  assert.equal(result.status, 400); assert.equal(result.body.today, clock.today);
  assert.equal(result.body.timezone, "Asia/Kolkata");
});
test("empty periods have unknown rates and scores without inventing scheduled or missed check-ins", () => {
  const data = calculate([]); reconcile(data);
  assert.equal(data.totals.total, 0); assert.equal(data.totals.completionRate, null);
  assert.equal(data.totals.score, null); assert.equal(data.averageBlockScore, null);
  assert.equal(data.highestWeekday, null); assert.equal(data.days.at(-1).fullStreak, null);
});
test("habit reminders are not deadlines: unfinished today remains pending even before the current clock", () => {
  const habits = ["00:00", "08:00", "20:00", "", "bad"].map((time, index) => habit({ _id: String(index), startDate: clock.today, time }));
  const data = calculate(habits); reconcile(data);
  assert.equal(data.totals.total, 5); assert.equal(data.totals.pending, 5); assert.equal(data.totals.missed, 0);
});
test("future logs and unscheduled check-ins do not create completed or missed occurrences", () => {
  const data = calculate([habit({ days: ["Thu"] })], [log("2026-10-02"), log("2026-10-15")]);
  reconcile(data); assert.equal(data.totals.total, 2); assert.equal(data.totals.completed, 0);
  assert.equal(data.days[14].total, 0); assert.equal(data.days[14].status, "future");
});
test("last duplicate false log undoes a true log with deterministic timestamp and ID ties", () => {
  const logs = [log("2026-10-01", { _id: "a", date: "2026-10-01T06:00:00Z" }),
    log("2026-10-01", { _id: "b", date: "2026-10-01T06:00:00Z", completed: false })];
  assert.equal(calculate([habit()], logs).totals.completed, 0);
  assert.equal(calculate([habit()], [...logs].reverse()).totals.completed, 0);
  logs.push(log("2026-10-01", { _id: "c", updatedAt: "2026-10-01T07:00:00Z" }));
  assert.equal(calculate([habit()], logs).totals.completed, 1);
});
test("canonical day keys override timestamps while legacy null/empty keys use app timezone", () => {
  const data = calculate([habit()], [
    { habitId: "habit", date: "2026-09-30T19:00:00Z", completed: true },
    log("2026-10-02", { date: "2026-09-01", completed: true }),
    log("", { date: "2026-10-02T19:00:00Z" }),
    log("2026-02-31", { date: "2026-10-04", completed: true }),
  ]); reconcile(data); assert.equal(data.totals.completed, 3);
  assert.equal(data.days[3].completed, 0);
});
test("logs belonging to another habit ID cannot contribute completions", () => {
  assert.equal(calculate([habit()], [log("2026-10-01", { habitId: "foreign" })]).totals.completed, 0);
});
test("deleted habits retain completed deletion-day evidence but not cancelled or later occurrences", () => {
  const data = calculate([habit({ deletedAt: "2026-10-03" })], [log("2026-10-03"), log("2026-10-04")]);
  reconcile(data); assert.equal(data.totals.total, 3); assert.equal(data.totals.completed, 1);
  assert.equal(calculate([habit({ deletedAt: "2026-10-01" })]).totals.total, 0);
  assert.equal(data.habits[0].currentRun, 0);
});
test("legacy deleted archives without a deletion date keep evidence, not fabricated missed history", () => {
  const data = calculate([habit({ archivedReason: "deleted" })], [log("2026-10-02")]);
  assert.equal(data.totals.total, 1); assert.equal(data.totals.missed, 0); assert.equal(data.habits[0].currentRun, 0);
});
test("inclusive end dates and creation dates bound expected occurrences", () => {
  assert.equal(calculate([habit({ endDate: "2026-10-03" })]).totals.total, 3);
  const data = calculate([habit({ createdAt: "2026-10-03" })], [log("2026-10-01")]);
  assert.equal(data.totals.total, 8); assert.equal(data.totals.completed, 0);
});
test("weekly, weekend and selected weekdays follow the shared weekly schedule rules", () => {
  const habits = [habit({ _id: "weekly", frequency: "weekly" }), habit({ _id: "weekend", repeatType: "weekend" }),
    habit({ _id: "selected", days: ["Mon", "Wednesday", "fri"] })];
  const data = calculate(habits); reconcile(data);
  assert.equal(data.habits.find(row => row.id === "weekly").total, 2);
  assert.equal(data.habits.find(row => row.id === "weekend").total, 3);
  assert.equal(data.habits.find(row => row.id === "selected").total, 4);
});
test("deferred weekday edits apply on their app-calendar effective date", () => {
  const data = calculate([habit({ days: ["Thu"], pendingDays: ["Fri", "Mon"], daysChangeEffectiveFrom: "2026-10-02" })]);
  assert.equal(data.totals.total, 4); assert.equal(data.days[0].total, 1); assert.equal(data.days[7].total, 0);
});
test("same-title habits remain separate IDs and numbered labels, without merged rates", () => {
  const data = calculate([habit({ _id: "a" }), habit({ _id: "b" })], [log("2026-10-01", { habitId: "a" })]);
  reconcile(data); assert.equal(data.habits.length, 2); assert.equal(data.totals.total, 20);
  assert.equal(data.habits[0].label, "Read · 1"); assert.equal(data.habits[1].label, "Read · 2");
  assert.equal(data.habits[0].completed, 1); assert.equal(data.habits[1].completed, 0);
});
test("duplicate habit documents use the latest data and hostile categories/priorities are safe", () => {
  const data = calculate([habit({ updatedAt: "2026-10-01", category: "Old" }),
    habit({ updatedAt: "2026-10-02", category: "__proto__", priority: "constructor", timeOfDay: "__proto__" })]);
  reconcile(data); assert.equal(data.habits.length, 1); assert.equal(data.categories[0].name, "__proto__");
  assert.equal(data.priorities.find(row=>row.name==="Medium").total, 10);
  assert.equal(data.times.find(row=>row.name==="Unspecified").total, 10);
});
test("all five time-of-day buckets reconcile and reminder hours do not infer an assignment", () => {
  const habits = ["Morning", "Afternoon", "Evening", "Night", null].map((timeOfDay,index) => habit({ _id:String(index),timeOfDay,time:"06:00" }));
  const data = calculate(habits); reconcile(data); assert.equal(data.times.length, 5);
  assert.equal(data.times.at(-1).total, 10); assert.equal(data.times[0].total, 10);
});
test("habit occurrence streaks skip unscheduled days while full-calendar runs do not", () => {
  const data = calculate([habit({ days: ["Mon", "Thu"] })], [log("2026-10-01"), log("2026-10-05"), log("2026-10-08")]);
  assert.equal(data.longestHabitStreak, 3); assert.equal(data.habits[0].currentRun, 3);
  assert.equal(data.habitStreakBreaks, 0); assert.equal(data.longestFullCompletionStreak, 1);
});
test("streak breaks count run-ending transitions rather than every missed scheduled day", () => {
  const data = calculate([habit()], ["01", "02", "03", "05"].map(day => log("2026-10-" + day)));
  assert.equal(data.longestHabitStreak, 3); assert.equal(data.habitStreakBreaks, 2);
  assert.deepEqual(data.habits[0].breakLengths, [3, 1]);
  assert.deepEqual(data.commonBreak, { length: 1, count: 1 });
});
test("pending today preserves yesterday's month-local run without inventing a future completion", () => {
  const data = calculate([habit()], ["07", "08", "09"].map(day => log("2026-10-" + day)));
  assert.equal(data.habits[0].currentRun, 3); assert.equal(data.currentFullCompletionRun, 3);
  assert.equal(data.days[9].fullStreak, null); assert.equal(data.days[10].fullStreak, null);
  assert.equal(data.habitStreakBreaks, 0);
});
test("ended and old-month individual runs are not current or lifetime streak claims", () => {
  const ended = calculate([habit({ endDate: "2026-10-08" })], [log("2026-10-07"), log("2026-10-08")]);
  assert.equal(ended.habits[0].longestStreak, 2); assert.equal(ended.habits[0].currentRun, 0);
  const old = calculate([habit({ startDate: "2026-09-29" })], [log("2026-09-29"), log("2026-09-30")], {month:9});
  assert.equal(old.habits[0].endingRun, 2); assert.equal(old.habits[0].currentRun, 0);
  assert.equal(old.currentFullCompletionRun, 0);
});
test("full-completion days require nonempty schedules and all expected habits, not merely some activity", () => {
  const data = calculate([habit({_id:"a"}),habit({_id:"b"})], [log("2026-10-01",{habitId:"a"}),log("2026-10-02",{habitId:"a"}),log("2026-10-02",{habitId:"b"})]);
  assert.equal(data.fullCompletionDays, 1); assert.equal(data.totals.activeDays, 2);
  assert.equal(data.longestFullCompletionStreak, 1);
});
test("leap calendars and final partial blocks include every day without scoring future-only blocks", () => {
  const data = calculate([habit({startDate:"2026-04-29",endDate:"2026-04-30"})], [log("2026-04-29")], {month:4});
  reconcile(data); assert.equal(data.days.length,30);assert.equal(data.weeks.length,5);
  assert.equal(data.weeks[4].total,2);assert.equal(data.weeks[4].score,50);assert.equal(data.averageBlockScore,50);
  assert.equal(calculate([]).weeks[4].score,null);
  assert.equal(calculate([],[],{year:2028,month:2,today:"2028-03-01"}).days.length,29);
});
test("weekday rates are occurrence-weighted and zero-completion weekdays remain eligible", () => {
  const habits = Array.from({length:9},(_,index)=>habit({_id:String(index),startDate:"2026-09-08",endDate:"2026-09-08"}));
  habits.push(habit({_id:"first",startDate:"2026-09-01",endDate:"2026-09-01"}));
  const data=calculate(habits,[log("2026-09-01",{habitId:"first"})],{month:9});
  assert.equal(data.weekdays.find(row=>row.label==="Tue").completionRate,10);
  assert.equal(calculate([habit()],[]).lowestWeekday.completionRate,0);
});
test("activity score and rounding match Habit Weekly Report across varied denominators", () => {
  for(let count=1;count<=20;count++){
    const habits=Array.from({length:count},(_,index)=>habit({_id:String(index),endDate:"2026-10-0"+(index%7+1)}));
    const logs=habits.flatMap((row,index)=>["01","02","04","06"].filter((day,offset)=>(index+offset)%3===0).map(day=>log("2026-10-"+day,{habitId:row._id})));
    const data=calculate(habits,logs), report=computeHabitWeeklyReport(habits,logs,journalMonthDays(2026,10),clock);
    reconcile(data);assert.equal(data.totals.score,report.weeklyScore);assert.equal(data.weeks[0].score,report.weeklyScore);
    assert.equal(data.longestHabitStreak,report.longestStreak);
  }
});
test("one shared demo dataset reconciles all three tabs and unsupported months stay empty", () => {
  for(const month of [2,3,4,5]){
    const data=demoHabitAnalysis(2026,month);reconcile(data.analysis);
    assert.equal(data.month,month);assert.equal(data.analysis.days.length,journalMonthDays(2026,month).length);
    if(month===5)assert.equal(data.analysis.totals.total,0);
  }
  assert.equal(demoHabitAnalysis(2025,4).analysis.totals.total,0);
});
test("endpoint scopes habits and log IDs, projects no notes/activity logs and publishes app metadata", async t => {
  fixture(t,[habit()],[log("2026-10-01")]);
  const result=await call();assert.equal(result.status,200);reconcile(result.body.analysis);
  assert.equal(result.body.today,clock.today);assert.equal(result.body.joinedDay,"2026-10-01");
  assert.equal(validHabitAnalysisResponse(result.body,{year:"2026",month:"10"}),true);
  assert.ok(!JSON.stringify(result.body).includes("activityLogs"));assert.ok(!JSON.stringify(result.body).includes("userId"));
});
test("accounts with no habits do not query unscoped logs", async t => {
  fixture(t,[]);t.mock.method(HabitLog,"find",()=>assert.fail("Unexpected log read"));
  const result=await call();assert.equal(result.status,200);assert.equal(result.body.analysis.totals.total,0);
});
test("missing accounts fail closed before habit or log reads", async t => {
  t.mock.method(User,"findById",()=>query(null));t.mock.method(Habit,"find",()=>assert.fail("Unexpected habit read"));
  assert.equal((await call()).status,404);
});
test("database failures return safe retry messages without raw connection details", async t => {
  t.mock.method(User,"findById",()=>({select(){return this;},lean:async()=>{throw new Error("private credential");}}));
  const result=await call();assert.equal(result.status,500);assert.match(result.body.message,/retry/i);
  assert.ok(!result.body.message.includes("credential"));
});
test("malformed nested rows, duplicate IDs and invalid clock metadata are rejected before chart rendering", () => {
  const data={...demoHabitAnalysis(2026,4),serverNow:"2026-10-10T06:00:00Z"},period={year:"2026",month:"04"};
  assert.equal(validHabitAnalysisResponse(data,period),true);
  for(const corrupt of [
    row=>row.analysis.days[0]=null,row=>row.analysis.days[0].total=-1,row=>row.analysis.habits[0]=null,
    row=>row.analysis.habits[1].id=row.analysis.habits[0].id,row=>row.analysis.times[0]=null,
    row=>row.analysis.categories[0]=null,row=>row.analysis.weeks[0].from="bad",row=>row.analysis.totals={},
    row=>row.analysis.commonBreak={},row=>row.timezone="Mars/Invalid",row=>row.serverNow="bad",
  ]){
    const malformed=structuredClone(data);corrupt(malformed);assert.equal(validHabitAnalysisResponse(malformed,period),false);
  }
  assert.equal(habitAnalysisClockValid({today:"2026-10-10",timezone:"invalid",serverNow:"2026-10-10T06:00:00Z"}),false);
});
test("monthly habit analysis is a protected read-only GET without generation or write handlers", () => {
  assert.equal(routes.stack[0].handle.name,"protect");
  const route=routes.stack.find(layer=>layer.route?.path==="/analysis").route;
  assert.deepEqual(route.methods,{get:true});assert.equal(route.stack.length,1);
});
