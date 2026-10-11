import test from "node:test";
import assert from "node:assert/strict";
import Goal from "../models/Goal.js";
import GoalProgressLog from "../models/GoalProgressLog.js";
import GoalWeeklySummary from "../models/GoalWeeklySummary.js";
import weeklyRoutes from "../routes/weeklyReportRoutes.js";
import { getGoalWeeklyReport, getGoalSummaries, generateGoalAiSummary } from "../controllers/weeklyReportController.js";
import { computeGoalWeeklyReport, goalReportRisk, goalReportDays } from "../../shared/goalWeeklyStats.js";
import { buildGoalWeeklyReport, goalReportFingerprint, goalAiContext, goalReportFilter, goalProgressFilter, completedGoalWeeks } from "../utils/goalWeeklyReportUtils.js";
import { DEMO_GOAL_REPORTS } from "../../client/src/dashboard/weeklyreport/goalDemoReports.js";
const USER = "000000000000000000000001", WEEK = "2026-09-28", days = goalReportDays(WEEK);
const clock = { today: "2026-10-10", timezone: "Asia/Kolkata" };
const goal = extra => ({ _id: "goal", title: "PRIVATE GOAL TITLE", description: "PRIVATE DESCRIPTION", priority: "High", createdAt: "2026-09-01", updatedAt: days[6], startDate: "2026-09-01", deadline: days[6], currentValue: 50, targetValue: 100, subgoals: [], ...extra });
const sub = extra => ({ _id: "sub", title: "PRIVATE MILESTONE", createdAt: "2026-09-01", updatedAt: days[6], completed: true, completedAt: days[1]+"T12:00:00+05:30", ...extra });
const progress = extra => ({ goalId: "goal", previousValue: 0, currentValue: 50, date: days[1]+"T12:00:00+05:30", ...extra });
const compute = (goals = [goal()], logs = [], opts = clock, week = days) => computeGoalWeeklyReport(goals, logs, week, opts);
const query = value => ({ lean: async () => value });
const request = extra => ({ user: { id: USER }, method: "GET", query: { week: WEEK }, body: {}, ...extra });
async function call(handler, req = request()) {
  let status = 200, body;
  await handler(req, { status(code) { status = code; return this; }, json(value) { body = value; return this; } });
  return { status, body };
}
function fixture(t, goals = [goal()], logs = []) {
  t.mock.timers.enable({ apis: ["Date"], now: Date.parse("2026-10-10T06:00:00Z") });
  t.mock.method(Goal, "find", (filter, fields) => {
    assert.equal(filter.userId, USER); assert.equal(filter.deletedAt, undefined);
    assert.equal(fields.description, undefined); assert.equal(fields.activityLogs, 1); return query(goals);
  });
  t.mock.method(GoalProgressLog, "find", filter => {
    assert.equal(filter.userId, USER); assert.deepEqual(filter.goalId.$in, goals.map(item => item._id)); return query(logs);
  });
  return buildGoalWeeklyReport(goals, logs, days);
}
function apiKey(t) {
  const previous = process.env.API_KEY; process.env.API_KEY = "fixture-not-real";
  t.after(() => { if (previous === undefined) delete process.env.API_KEY; else process.env.API_KEY = previous; });
}
const sum = (values, key) => values.reduce((total, value) => total + (value[key] || 0), 0);
function reconciles(report) {
  assert.equal(report.stats.goalCount, report.goals.length);
  assert.equal(report.stats.knownProgressGoals + report.stats.unknownProgressGoals, report.goals.length);
  assert.equal(Object.values(report.stats.riskCounts).reduce((a,b)=>a+b,0), report.goals.length);
  assert.equal(report.stats.completedMilestones + report.stats.pendingMilestones, report.stats.totalMilestones);
  assert.equal(sum(report.goals, "completedThisWeek"), report.stats.completedMilestonesThisWeek);
  assert.equal(sum(report.goals, "progressUpdatesThisWeek"), report.stats.progressUpdatesThisWeek);
}
test("stable milestone progress uses subgoal counts, not default numeric target", () => {
  const report = compute([goal({ currentValue: 2, targetValue: 100, subgoals: [sub(), sub({ _id: "other", completed: false, completedAt: null })] })]);
  assert.equal(report.goals[0].progress, 50); assert.equal(report.stats.completedGoals, 0); assert.equal(report.stats.completedMilestonesThisWeek, 1); reconciles(report);
});
test("numeric-only goals can be completed without milestones and percentage rounding does not complete a goal", () => {
  const report = compute([goal({ currentValue: 100 }), goal({ _id: "not-complete", currentValue: 99.9 })]);
  assert.equal(report.stats.completedGoals, 1); assert.equal(report.goals.filter(row=>row.risk==="Completed").length, 1); reconciles(report);
});
test("later-added milestones cannot turn an unknown older goal mode into zero progress", () => {
  const report = compute([goal({ updatedAt: clock.today, subgoals: [sub({ createdAt: "2026-10-07", updatedAt: clock.today, completed: false, completedAt: null })] })]);
  assert.equal(report.goals[0].progress, null);
  assert.equal(report.goals[0].total, null);
  assert.equal(report.goals[0].completed, null);
  assert.equal(report.stats.unknownMilestoneGoals, 1);
  assert.equal(report.stats.riskCounts["History unavailable"], 1);
  reconciles(report);
});
test("historical numeric progress comes from the last retained log, not current value", () => {
  const report = compute([goal({ updatedAt: clock.today, currentValue: 90 })], [progress({currentValue:30}), progress({date:"2026-10-07", previousValue:30, currentValue:90})]);
  assert.equal(report.goals[0].progress, 30); assert.equal(report.stats.progressUpdatesThisWeek, 1); assert.ok(report.historyNote);
});
test("legacy progress logs without previousValue still supply their recorded current snapshot", () => {
  const report = compute([goal({ updatedAt: clock.today, currentValue: 90 })], [progress({ previousValue: undefined, currentValue: 30 })]);
  assert.equal(report.goals[0].progress, 30);
});
test("an unlogged later update prevents a future previousValue from leaking into an older week", () => {
  const report = compute([goal({ updatedAt: clock.today, activityLogs: [{ action: "progress_updated", at: "2026-10-06" }] })], [progress({ date: "2026-10-08", previousValue: 80, currentValue: 90 })]);
  assert.equal(report.goals[0].progress, null);
});
test("a durable completedAt after an earlier reopen restores the missing completion transition", () => {
  const report = compute([goal({ updatedAt: clock.today, subgoals: [sub({ updatedAt: clock.today, completedAt: days[3] })], activityLogs: [{ action: "subgoal_reopened", subgoalId: "sub", at: days[1] }] })]);
  assert.equal(report.goals[0].progress, 100);
});
test("the next progress log previousValue can supply the earlier baseline without inventing activity", () => {
  const report = compute([goal({ updatedAt: clock.today, currentValue: 90 })], [progress({date:"2026-10-07", previousValue:20, currentValue:90})]);
  assert.equal(report.goals[0].progress, 20); assert.equal(report.stats.progressUpdatesThisWeek, 0);
});
test("unavailable history is null, not zero, and is excluded from averages and risk pace", () => {
  const report = compute([goal(), goal({ _id:"unknown", updatedAt:clock.today, currentValue:90 })]);
  assert.equal(report.stats.avgProgress, 50); assert.equal(report.stats.unknownProgressGoals, 1);
  assert.equal(report.stats.riskCounts["History unavailable"], 1); reconciles(report);
  const emptyHistory = compute([goal({ updatedAt:clock.today })]);
  assert.equal(emptyHistory.weeklyScore, null); assert.equal(emptyHistory.stats.avgProgress, null);
});
test("metadata edits after the cutoff make old targets and deadlines unknown", () => {
  const report = compute([goal({ updatedAt:clock.today, activityLogs:[{action:"edited",at:"2026-10-08"}] })], [progress()]);
  assert.equal(report.goals[0].progress, null); assert.equal(report.goals[0].expected, null); assert.ok(report.historyNote);
});
test("missing audit after a saved progress mutation does not fabricate an older numeric value", () => {
  const report = compute([goal({ updatedAt:clock.today, activityLogs:[{action:"progress_updated",at:days[3]}] })], [progress()]);
  assert.equal(report.goals[0].progress, null); assert.equal(report.stats.progressUpdatesThisWeek, 2);
});
test("goals created or started after the week are excluded, archived and deleted history is retained", () => {
  const report = compute([goal({ deletedAt:"2026-10-08" }), goal({_id:"new",createdAt:"2026-10-05"}), goal({_id:"future-start",startDate:"2026-10-05"}), goal({_id:"old-delete",deletedAt:"2026-09-27"})]);
  assert.equal(report.stats.goalCount, 1);
});
test("deletion during the week stops the as-of snapshot and later activity", () => {
  const report = compute([goal({deletedAt:days[3],updatedAt:days[3]})],[progress(),progress({date:days[5],currentValue:90})]);
  assert.equal(report.goals[0].asOf, days[3]); assert.equal(report.stats.progressUpdatesThisWeek,1);
});
test("milestones created later are excluded from historical denominators", () => {
  const report = compute([goal({subgoals:[sub(),sub({_id:"future",createdAt:"2026-10-05",completedAt:"2026-10-07"})]})]);
  assert.equal(report.goals[0].total,1); assert.equal(report.goals[0].progress,100); assert.equal(report.stats.completedMilestonesThisWeek,1);
});
test("a milestone deleted after the week makes its old denominator unknown, but retained completion is counted", () => {
  const report = compute([goal({updatedAt:clock.today,activityLogs:[{action:"subgoal_completed",subgoalId:"gone",at:days[2]},{action:"subgoal_deleted",subgoalId:"gone",at:"2026-10-08"}]})]);
  assert.equal(report.goals[0].progress,null); assert.equal(report.goals[0].total,null); assert.equal(report.stats.completedMilestonesThisWeek,1);
});
test("retained reopen history restores the earlier snapshot and keeps that week's completion event", () => {
  const report = compute([goal({updatedAt:clock.today,subgoals:[sub({updatedAt:clock.today,completed:false,completedAt:null})],activityLogs:[{action:"subgoal_completed",subgoalId:"sub",at:days[1]},{action:"subgoal_reopened",subgoalId:"sub",at:"2026-10-08"}]})]);
  assert.equal(report.goals[0].progress,100); assert.equal(report.stats.completedMilestonesThisWeek,1);
  const inside = compute([goal({subgoals:[sub({completed:false,completedAt:null})],activityLogs:[{action:"subgoal_completed",subgoalId:"sub",at:days[1]},{action:"subgoal_reopened",subgoalId:"sub",at:days[3]}]})]);
  assert.equal(inside.goals[0].progress,0); assert.equal(inside.stats.completedMilestonesThisWeek,1);
});
test("trimmed reopen history is unknown rather than fabricated completed history", () => {
  const report = compute([goal({updatedAt:clock.today,subgoals:[sub({updatedAt:clock.today,completed:false,completedAt:null})],activityLogs:[{action:"subgoal_completed",subgoalId:"sub",at:days[1]}]})]);
  assert.equal(report.goals[0].progress,null); assert.equal(report.stats.completedMilestonesThisWeek,1);
});
test("completion activity, current completedAt and re-completions count once per milestone per week", () => {
  const at=days[1]+"T12:00:00+05:30";
  const report=compute([goal({subgoals:[sub()],activityLogs:[{action:"subgoal_completed",subgoalId:"sub",at},{action:"subgoal_completed",subgoalId:"sub",at:days[3]},{action:"subgoal_completed",title:"PRIVATE MILESTONE (Sub-goal in PRIVATE GOAL TITLE)",at}]})]);
  assert.equal(report.stats.completedMilestonesThisWeek,1);
});
test("legacy completedAt without activity still counts, but missing historical dates do not invent completions", () => {
  assert.equal(compute([goal({subgoals:[sub()]})]).stats.completedMilestonesThisWeek,1);
  const unknown=compute([goal({subgoals:[sub({completedAt:null})]})]);
  assert.equal(unknown.stats.completedMilestonesThisWeek,0); assert.equal(unknown.goals[0].progress,null);
});
test("numeric audit and embedded progress activity deduplicate, decreases remain genuine updates", () => {
  const log=progress({previousValue:80,currentValue:50});
  const report=compute([goal({activityLogs:[{action:"progress_updated",at:log.date}]})],[log,log]);
  assert.equal(report.stats.progressUpdatesThisWeek,1); assert.equal(report.stats.activeDays,1);
});
test("app-calendar cutoff includes Sunday late events, excludes future days and future times today", () => {
  const report=compute([goal()], [progress({date:"2026-10-04T23:45:00+05:30"})]);
  assert.equal(report.stats.progressUpdatesThisWeek,1);
  const currentDays=goalReportDays("2026-10-05");
  const current=compute([goal({updatedAt:"2026-10-10T06:00:00Z"})],[progress({date:"2026-10-10T13:00:00+05:30"})],{...clock,now:Date.parse("2026-10-10T06:00:00Z")},currentDays);
  assert.equal(current.stats.progressUpdatesThisWeek,0); assert.equal(current.asOf,clock.today);
});
test("calendar pace uses inclusive dates and no deadline is not automatically on track", () => {
  const report=compute([goal({startDate:days[0],deadline:days[0],currentValue:0}),goal({_id:"no-schedule",deadline:null})]);
  assert.equal(report.goals.find(row=>row.id==="goal").expected,100);
  assert.equal(report.goals.find(row=>row.id==="no-schedule").risk,"No schedule");
  assert.equal(goalReportRisk({progress:null,expected:100}),"History unavailable");
});
test("bad numbers and priorities, hostile titles and duplicate documents do not corrupt statistics", () => {
  const report=compute([goal({_id:"duplicate",title:"__proto__",priority:"Unknown",currentValue:NaN}),goal({_id:"duplicate",title:"__proto__",priority:"Unknown",currentValue:NaN})],[progress({goalId:"outside",currentValue:100})]);
  assert.equal(report.stats.goalCount,1); assert.equal(report.goals[0].priority,"Medium"); assert.equal(report.goals[0].progress,null); reconciles(report);
});
test("all demo snapshots, milestone completions, progress updates and risk counts reconcile", () => {
  for(const report of Object.values(DEMO_GOAL_REPORTS)) reconciles(report);
  const first=DEMO_GOAL_REPORTS["2026-04-13"];
  assert.equal(first.stats.goalCount,6); assert.equal(first.stats.completedMilestonesThisWeek,6); assert.equal(first.stats.progressUpdatesThisWeek,1);
  assert.equal(first.stats.avgProgress,42); assert.equal(first.stats.unknownProgressGoals,1);
});
test("picker and detail share numeric-only and zero-activity weeks with owner-scoped logs", async t => {
  fixture(t,[goal()],[progress()]);
  const detail=(await call(getGoalWeeklyReport)).body;
  const summary=(await call(getGoalSummaries)).body.find(week=>week.id===WEEK);
  assert.equal(summary.goalCount,detail.stats.goalCount); assert.equal(summary.avgProgress,detail.stats.avgProgress);
  assert.equal(summary.progressUpdatesThisWeek,detail.stats.progressUpdatesThisWeek); assert.equal(summary.completedMilestonesThisWeek,0);
});
test("the last 12 completed weeks and database date bounds use the app calendar", t => {
  t.mock.timers.enable({apis:["Date"],now:Date.parse("2026-10-11T18:45:00Z")});
  assert.equal(completedGoalWeeks()[0][0],"2026-10-05"); assert.equal(completedGoalWeeks().length,12);
  assert.equal(goalReportFilter(USER,days).$or[0].createdAt.$lte.toISOString(),"2026-10-04T18:29:59.999Z");
  assert.deepEqual(goalProgressFilter(USER,["owned"]),{userId:USER,goalId:{$in:["owned"]}});
});
test("AI context excludes private titles and descriptions and fingerprint ignores title sorting and clock", t => {
  const report=fixture(t,[goal(),goal({_id:"other",title:"Another",currentValue:20})]);
  const renamed={...report,serverNow:"changed",goals:[...report.goals].reverse().map(row=>({...row,title:"REDACTED"}))};
  assert.equal(goalReportFingerprint(report),goalReportFingerprint(renamed));
  assert.equal(JSON.stringify(goalAiContext(report)).includes("PRIVATE"),false);
  assert.notEqual(goalReportFingerprint(report),goalReportFingerprint({...report,stats:{...report.stats,completedGoals:99}}));
});
test("invalid/future weeks fail before reading records or calling providers", async t => {
  t.mock.timers.enable({ apis: ["Date"], now: Date.parse("2026-10-10T06:00:00Z") });
  t.mock.method(Goal, "find", () => assert.fail("Invalid week cannot query"));
  for (const week of ["2026-02-31", "", ["2026-10-05"], "2026-10-12"])
    for (const handler of [getGoalWeeklyReport, generateGoalAiSummary]) assert.equal((await call(handler, request({ query: { week } }))).status, 400);
});

test("failed reads remain recoverable errors rather than empty successful reports", async t => {
  fixture(t);
  t.mock.method(Goal, "find", () => ({ lean: async () => { throw new Error("Unavailable"); } }));
  assert.equal((await call(getGoalWeeklyReport)).status, 500); assert.equal((await call(getGoalSummaries)).status, 500);
});

test("fresh, stale and missing AI caches can be read without credentials or generation", async t => {
  const report = fixture(t);
  t.mock.method(globalThis, "fetch", () => assert.fail("Cache GET cannot generate"));
  t.mock.method(GoalWeeklySummary, "findOneAndUpdate", () => assert.fail("Cache GET cannot write"));
  t.mock.method(GoalWeeklySummary, "findOne", filter => { assert.deepEqual(filter, { userId: USER, weekStart: WEEK }); return query({ aiSummary: "Saved", sourceHash: goalReportFingerprint(report) }); });
  assert.equal((await call(generateGoalAiSummary)).body.needsGeneration, false);
  t.mock.method(GoalWeeklySummary, "findOne", () => query({ aiSummary: "Legacy" }));
  assert.equal((await call(generateGoalAiSummary)).body.stale, true);
  t.mock.method(GoalWeeklySummary, "findOne", () => query(null));
  assert.equal((await call(generateGoalAiSummary)).body.aiSummary, null);
});

test("explicit generation refuses empty weeks and unconfigured credentials without billing", async t => {
  fixture(t, []);
  t.mock.method(GoalWeeklySummary, "findOne", () => query(null));
  t.mock.method(globalThis, "fetch", () => assert.fail("Unavailable generation cannot bill"));
  assert.equal((await call(generateGoalAiSummary, request({ method: "POST" }))).status, 400);
  t.mock.method(Goal, "find", () => query([goal()]));
  t.mock.method(GoalProgressLog, "find", () => query([]));
  const previous = process.env.API_KEY; delete process.env.API_KEY;
  t.after(() => { if (previous !== undefined) process.env.API_KEY = previous; });
  assert.equal((await call(generateGoalAiSummary, request({ method: "POST" }))).status, 503);
});

test("concurrent explicit AI requests coalesce and use only canonical statistics", async t => {
  fixture(t); apiKey(t);
  t.mock.method(GoalWeeklySummary, "findOne", () => query(null));
  let requests = 0, writes = 0;
  t.mock.method(globalThis, "fetch", async (_, options) => {
    requests++;
    const prompt = JSON.parse(options.body); assert.match(prompt.messages[0].content, /Unknown history is not zero progress/);
    const context = JSON.parse(prompt.messages[1].content);
    assert.equal(context.stats.goalCount, 1); assert.equal(context.stats.avgProgress, 50); assert.equal(context.goals, undefined);
    await new Promise(resolve => setTimeout(resolve, 10));
    return { ok: true, json: async () => ({ choices: [{ message: { content: "Generated" } }] }) };
  });
  t.mock.method(GoalWeeklySummary, "findOneAndUpdate", async (filter, update, options) => {
    writes++; assert.equal(filter.userId, USER); assert.equal(options.runValidators, true); assert.match(update.$set.sourceHash, /^[a-f0-9]{64}$/); return update.$set;
  });
  const results = await Promise.all([call(generateGoalAiSummary, request({ method: "POST" })), call(generateGoalAiSummary, request({ method: "POST" }))]);
  assert.equal(requests, 1); assert.equal(writes, 1); assert.equal(results[0].body.aiSummary, "Generated"); assert.equal(results[1].body.aiSummary, "Generated");
});

test("failed and empty AI responses do not overwrite cache and permit a later retry", async t => {
  fixture(t); apiKey(t);
  t.mock.method(GoalWeeklySummary, "findOne", () => query({ aiSummary: "Previous" }));
  let writes = 0;
  t.mock.method(GoalWeeklySummary, "findOneAndUpdate", async () => { writes++; return {}; });
  t.mock.method(globalThis, "fetch", async () => { throw new Error("Unavailable"); });
  assert.equal((await call(generateGoalAiSummary, request({ method: "POST" }))).status, 502);
  t.mock.method(globalThis, "fetch", async () => ({ ok: true, json: async () => ({ choices: [] }) }));
  assert.equal((await call(generateGoalAiSummary, request({ method: "POST" }))).status, 502); assert.equal(writes, 0);
  t.mock.method(globalThis, "fetch", async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: "Retry" } }] }) }));
  assert.equal((await call(generateGoalAiSummary, request({ method: "POST" }))).body.aiSummary, "Retry"); assert.equal(writes, 1);
});

test("cache storage failure returns generated text with a warning, unique-key conflict retries safely", async t => {
  fixture(t); apiKey(t);
  t.mock.method(GoalWeeklySummary, "findOne", () => query(null));
  t.mock.method(globalThis, "fetch", async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: "Generated" } }] }) }));
  t.mock.method(GoalWeeklySummary, "findOneAndUpdate", async () => { throw new Error("Unavailable"); });
  const failure = await call(generateGoalAiSummary, request({ method: "POST" }));
  assert.equal(failure.status, 200); assert.equal(failure.body.persisted, false); assert.match(failure.body.warning, /could not be saved/);
  let attempts = 0;
  t.mock.method(GoalWeeklySummary, "findOneAndUpdate", async (filter, update, options) => {
    assert.equal(filter.userId, USER);
    if (++attempts === 1) throw Object.assign(new Error("Conflict"), { code: 11000 });
    assert.equal(options.upsert, undefined); assert.equal(options.runValidators, true); return update.$set;
  });
  assert.equal((await call(generateGoalAiSummary, request({ method: "POST" }))).body.persisted, true); assert.equal(attempts, 2);
});

test("generation reuses fresh cache unless force is explicit; schema accepts old cache documents", async t => {
  const report = fixture(t); apiKey(t);
  t.mock.method(GoalWeeklySummary, "findOne", () => query({ aiSummary: "Fresh", sourceHash: goalReportFingerprint(report) }));
  let requests = 0;
  t.mock.method(globalThis, "fetch", async () => { requests++; return { ok: true, json: async () => ({ choices: [{ message: { content: "Forced" } }] }) }; });
  t.mock.method(GoalWeeklySummary, "findOneAndUpdate", async () => ({}));
  assert.equal((await call(generateGoalAiSummary, request({ method: "POST" }))).body.aiSummary, "Fresh"); assert.equal(requests, 0);
  assert.equal((await call(generateGoalAiSummary, request({ query: { week: WEEK, regenerate: "true" } }))).body.aiSummary, "Forced");
  const doc = new GoalWeeklySummary({ userId: USER, weekStart: WEEK, aiSummary: "Old" }); await doc.validate();
  doc.sourceHash = "invalid"; await assert.rejects(doc.validate(), /sourceHash/);
});

test("AI cache GETs bypass generation quotas; POST and legacy regeneration remain protected", async t => {
  const previous = process.env.ARCJET_KEY; delete process.env.ARCJET_KEY;
  t.after(() => { if (previous !== undefined) process.env.ARCJET_KEY = previous; });
  const get = weeklyRoutes.stack.find(layer => layer.route?.path === "/goals/ai-summary" && layer.route.methods.get).route;
  const post = weeklyRoutes.stack.find(layer => layer.route?.path === "/goals/ai-summary" && layer.route.methods.post).route;
  assert.equal(post.stack.length, 2);
  let passes = 0, status = 200;
  const res = { setHeader() {}, status(code) { status = code; return this; }, json() {} };
  const req = request({ user: { id: "goal-weekly-quota-fixture" } });
  for (let i = 0; i < 20; i++) await get.stack[0].handle(req, res, () => passes++);
  assert.equal(passes, 20); req.query.regenerate = "true";
  for (let i = 0; i < Number(process.env.GOAL_WEEKLY_AI_RATE_LIMIT_DAILY_MAX || 2) + 1; i++) await get.stack[0].handle(req, res, () => {});
  assert.equal(status, 429);
});


