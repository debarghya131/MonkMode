import test from "node:test";
import assert from "node:assert/strict";
import Habit from "../models/Habit.js";
import HabitLog from "../models/HabitLog.js";
import HabitWeeklySummary from "../models/HabitWeeklySummary.js";
import weeklyRoutes from "../routes/weeklyReportRoutes.js";
import { getHabitWeeklyReport, getHabitSummaries, generateHabitAiSummary } from "../controllers/weeklyReportController.js";
import { computeHabitWeeklyReport } from "../../shared/habitWeeklyStats.js";
import { shiftReportDay } from "../../shared/journalWeeklyStats.js";
import { buildHabitWeeklyReport, habitReportFingerprint, habitAiContext, habitReportFilter, habitLogFilter, completedHabitWeeks } from "../utils/habitWeeklyReportUtils.js";
import { DEMO_HABIT_REPORTS } from "../../client/src/dashboard/weeklyreport/habitDemoReports.js";

const USER = "000000000000000000000001", WEEK = "2026-09-28";
const days = Array.from({ length: 7 }, (_, index) => shiftReportDay(WEEK, index));
const clock = { today: "2026-10-10", time: "11:30", timezone: "Asia/Kolkata" };
const habit = (extra = {}) => ({ _id: "habit", title: "PRIVATE HABIT TITLE", note: "PRIVATE NOTE", category: "Study", priority: "High", repeatType: "daily", startDate: WEEK, time: "08:00", ...extra });
const logsFor = (offsets, extra = {}) => offsets.map(index => ({ habitId: "habit", dayKey: days[index], completed: true, ...extra }));
const compute = (habits = [habit()], logs = [], opts = clock, week = days) => computeHabitWeeklyReport(habits, logs, week, opts);
const query = value => ({ lean: async () => value });
const request = (extra = {}) => ({ user: { id: USER }, method: "GET", query: { week: WEEK }, body: {}, ...extra });
async function call(handler, req = request()) {
  let status = 200, body;
  await handler(req, { status(code) { status = code; return this; }, json(value) { body = value; return this; } });
  return { status, body };
}
function fixture(t, habits = [habit({ days: ["Mon"] })], logs = []) {
  t.mock.timers.enable({ apis: ["Date"], now: Date.parse("2026-10-10T06:00:00Z") });
  t.mock.method(Habit, "find", (filter, fields) => {
    assert.equal(filter.userId, USER); assert.equal(filter.deletedAt, undefined);
    assert.equal(fields.note, undefined); assert.equal(fields.pendingTime, 1); return query(habits);
  });
  t.mock.method(HabitLog, "find", filter => { assert.deepEqual(filter.habitId.$in, habits.map(item => item._id)); return query(logs); });
  return buildHabitWeeklyReport(habits, logs, days);
}
function apiKey(t) {
  const previous = process.env.API_KEY; process.env.API_KEY = "fixture-not-real";
  t.after(() => { if (previous === undefined) delete process.env.API_KEY; else process.env.API_KEY = previous; });
}
const sum = (values, key) => values.reduce((total, value) => total + value[key], 0);
function reconciles(report) {
  assert.equal(report.completed + report.missed + report.pending, report.totalInstances);
  for (const rows of [report.categories, report.priorityStats, report.dailyStats, report.habits]) {
    assert.equal(sum(rows, "total"), report.totalInstances);
    for (const key of ["completed", "pending", "missed"]) assert.equal(sum(rows, key), report[key]);
  }
}

test("daily and ended habits retain inclusive app-date bounds", () => {
  const report = compute([habit({ startDate: new Date("2026-09-28T00:00:00+05:30"), endDate: new Date("2026-09-29T00:00:00+05:30"), archivedReason: "ended" })], logsFor([0]));
  assert.equal(report.totalInstances, 2); assert.equal(report.completed, 1); assert.equal(report.missed, 1); reconciles(report);
});
test("creation day excludes earlier schedules even with an imported earlier start", () => {
  const report = compute([habit({ createdAt: "2026-09-29T18:45:00Z" })]);
  assert.equal(report.totalInstances, 5); assert.equal(report.dailyStats[1].total, 0);
});
test("weekdays, weekend, custom normalized days and weekly anchor match app calendar", () => {
  assert.equal(compute([habit({ repeatType: "weekdays" })]).totalInstances, 5);
  assert.equal(compute([habit({ repeatType: "weekend" })]).totalInstances, 2);
  assert.equal(compute([habit({ days: ["Monday", " WED ", "invalid", null] })]).totalInstances, 2);
  assert.equal(compute([habit({ frequency: "weekly", startDate: "2026-09-30T00:00:00+05:30" })]).totalInstances, 1);
});
test("7-day and 21-day challenges use their saved inclusive end date", () => {
  for (const repeatType of ["7days", "21days"]) {
    const report = compute([habit({ repeatType, endDate: days[3] })]);
    assert.equal(report.totalInstances, 4);
  }
});
test("deferred days and time changes take effect on the app date", () => {
  const report = compute([habit({ repeatType: "weekdays", days: ["Mon"], pendingDays: ["Tue", "Fri"], daysChangeEffectiveFrom: "2026-09-28T18:30:00Z" })]);
  assert.equal(report.totalInstances, 3);
  const week = Array.from({ length: 7 }, (_, index) => shiftReportDay("2026-10-05", index));
  const today = compute([habit({ startDate: clock.today, pendingTime: "20:00", timeChangeEffectiveFrom: clock.today })], [], clock, week);
  assert.equal(today.pending, 1); assert.equal(today.missed, 0);
});
test("deleted habits preserve earlier checks and deletion-day completions, not later ones", () => {
  const report = compute([habit({ deletedAt: days[3], archivedReason: "deleted" })], logsFor([0, 3, 5]));
  assert.equal(report.totalInstances, 4); assert.equal(report.completed, 2); assert.equal(report.missed, 2);
  assert.equal(compute([habit({ deletedAt: days[0] })]).totalInstances, 0);
  const unknownDeletion = compute([habit({ archivedReason: "deleted" })], logsFor([0]));
  assert.equal(unknownDeletion.totalInstances, 1); reconciles(report);
});
test("unscheduled and future completion logs do not inflate the weekly totals", () => {
  const report = compute([habit({ days: ["Mon"] })], logsFor([0, 1, 6]));
  assert.equal(report.completed, 1); assert.equal(report.totalInstances, 1);
  const current = compute([habit()], logsFor([5, 6]), { ...clock, today: days[4] });
  assert.equal(current.completed, 0); assert.equal(current.dailyStats[6].future, true); reconciles(current);
});
test("unfinished habits today stay pending all app day and future days are never missed", () => {
  const opts = { ...clock, today: days[0] };
  const report = compute(["08:00", "11:30", "20:00", "", "25:00"].map((time, index) => habit({ _id: String(index), time })), [], opts);
  assert.equal(report.totalInstances, 5); assert.equal(report.missed, 0); assert.equal(report.pending, 5); reconciles(report);
});
test("legacy dates use app timezone and latest duplicate false log wins deterministically", () => {
  const logs = [{ habitId: "habit", date: "2026-09-27T18:45:00Z", completed: true },
    { habitId: "habit", dayKey: days[0], date: "2026-09-28T12:00:00Z", completed: false },
    { habitId: "habit", dayKey: "2026-02-31", date: "2026-09-29T12:00:00Z", completed: true }, null];
  assert.equal(compute([habit()], logs).completed, 0);
  assert.equal(compute([habit()], logs.slice(0, 1)).completed, 1);
  assert.equal(compute([habit()], [...logs].reverse()).completed, 0);
});
test("duplicate habit documents count once and hostile category names are safe", () => {
  const report = compute([habit({ category: "__proto__", priority: "Unknown" }), habit({ category: "__proto__", priority: "Unknown" })], logsFor([0]));
  assert.equal(report.totalInstances, 7); assert.equal(report.categories[0].name, "__proto__");
  assert.equal(report.priorityStats[1].completed, 1); assert.equal(report.habits[0].timeOfDay, "Unspecified"); reconciles(report);
});
test("longest within-week streak is a maximum, not the ending run or lifetime", () => {
  const report = compute([habit()], logsFor([0, 1, 2, 3, 5]));
  assert.equal(report.longestStreak, 4); assert.equal(report.habits[0].streak, 0);
  const selected = compute([habit({ days: ["Mon", "Wed", "Fri"] })], logsFor([0, 2, 4]));
  assert.equal(selected.longestStreak, 3); assert.equal(selected.consistency, 100);
});
test("pending today preserves the within-week ending run until the app day ends", () => {
  const opts = { ...clock, today: days[2] };
  assert.equal(compute([habit({ time: "20:00" })], logsFor([0, 1]), opts).habits[0].streak, 2);
  assert.equal(compute([habit({ time: "08:00" })], logsFor([0, 1]), opts).habits[0].streak, 2);
  assert.equal(compute([habit({ time: "08:00" })], logsFor([0, 1]), { ...opts, today: days[3] }).habits[0].streak, 0);
});
test("missed disclosure caps rows without truncating aggregate totals", () => {
  const report = compute(Array.from({ length: 4 }, (_, index) => habit({ _id: String(index) })));
  assert.equal(report.missed, 28); assert.equal(report.missedHabits.length, 20); assert.equal(report.missedHabitsTotal, 28); assert.equal(report.missedHabitsTruncated, true); reconciles(report);
});
test("demo check-ins, categories, priorities and per-habit outcomes reconcile", () => {
  for (const report of Object.values(DEMO_HABIT_REPORTS)) {
    reconciles(report); assert.equal(report.pending, 0);
    assert.equal(sum(report.habits, "completedDays"), report.completed);
  }
  const first = DEMO_HABIT_REPORTS["2026-04-13"];
  assert.equal(first.totalInstances, 44); assert.equal(first.completed, 28); assert.equal(first.missed, 16);
});
test("picker and detail agree, include all-missed weeks and enforce owned habit IDs", async t => {
  fixture(t, [habit()], logsFor([0, 1]));
  const detail = (await call(getHabitWeeklyReport)).body;
  const summary = (await call(getHabitSummaries)).body.find(week => week.id === WEEK);
  for (const key of ["totalInstances", "completed", "missed", "pending", "consistency", "longestStreak"]) assert.equal(summary[key], detail[key]);
  assert.equal(summary.habitCount, 1);
});
test("completed weeks and legacy query date bounds use the app calendar", t => {
  t.mock.timers.enable({ apis: ["Date"], now: Date.parse("2026-10-11T18:45:00Z") });
  assert.equal(completedHabitWeeks()[0][0], "2026-10-05"); assert.equal(completedHabitWeeks().length, 12);
  assert.equal(habitReportFilter(USER, days).$or[0].createdAt.$lte.toISOString(), "2026-10-04T18:29:59.999Z");
  assert.equal(habitLogFilter(["owned"], days).$or[1].date.$gte.toISOString(), "2026-09-27T18:30:00.000Z");
});
test("AI fingerprint tracks facts but does not include private habit titles or notes", t => {
  const report = fixture(t);
  assert.equal(habitReportFingerprint(report), habitReportFingerprint({ ...report, serverNow: "changed", habits: report.habits.map(row => ({ ...row, name: "OTHER PRIVATE TITLE" })) }));
  assert.notEqual(habitReportFingerprint(report), habitReportFingerprint({ ...report, completed: 1 }));
  assert.equal(JSON.stringify(habitAiContext(report)).includes("PRIVATE"), false);
});

test("invalid/future weeks fail before reading records or calling providers", async t => {
  t.mock.timers.enable({ apis: ["Date"], now: Date.parse("2026-10-10T06:00:00Z") });
  t.mock.method(Habit, "find", () => assert.fail("Invalid week cannot query"));
  for (const week of ["2026-02-31", "", ["2026-10-05"], "2026-10-12"])
    for (const handler of [getHabitWeeklyReport, generateHabitAiSummary]) assert.equal((await call(handler, request({ query: { week } }))).status, 400);
});

test("failed reads remain recoverable errors rather than empty successful reports", async t => {
  fixture(t);
  t.mock.method(Habit, "find", () => ({ lean: async () => { throw new Error("Unavailable"); } }));
  assert.equal((await call(getHabitWeeklyReport)).status, 500); assert.equal((await call(getHabitSummaries)).status, 500);
});

test("fresh, stale and missing AI caches can be read without credentials or generation", async t => {
  const report = fixture(t);
  t.mock.method(globalThis, "fetch", () => assert.fail("Cache GET cannot generate"));
  t.mock.method(HabitWeeklySummary, "findOneAndUpdate", () => assert.fail("Cache GET cannot write"));
  t.mock.method(HabitWeeklySummary, "findOne", filter => { assert.deepEqual(filter, { userId: USER, weekStart: WEEK }); return query({ aiSummary: "Saved", sourceHash: habitReportFingerprint(report) }); });
  assert.equal((await call(generateHabitAiSummary)).body.needsGeneration, false);
  t.mock.method(HabitWeeklySummary, "findOne", () => query({ aiSummary: "Legacy" }));
  assert.equal((await call(generateHabitAiSummary)).body.stale, true);
  t.mock.method(HabitWeeklySummary, "findOne", () => query(null));
  assert.equal((await call(generateHabitAiSummary)).body.aiSummary, null);
});

test("explicit generation refuses empty weeks and unconfigured credentials without billing", async t => {
  fixture(t, []);
  t.mock.method(HabitWeeklySummary, "findOne", () => query(null));
  t.mock.method(globalThis, "fetch", () => assert.fail("Unavailable generation cannot bill"));
  assert.equal((await call(generateHabitAiSummary, request({ method: "POST" }))).status, 400);
  t.mock.method(Habit, "find", () => query([habit({ days: ["Mon"] })]));
  t.mock.method(HabitLog, "find", () => query([]));
  const previous = process.env.API_KEY; delete process.env.API_KEY;
  t.after(() => { if (previous !== undefined) process.env.API_KEY = previous; });
  assert.equal((await call(generateHabitAiSummary, request({ method: "POST" }))).status, 503);
});

test("concurrent explicit AI requests coalesce and use only canonical statistics", async t => {
  fixture(t); apiKey(t);
  t.mock.method(HabitWeeklySummary, "findOne", () => query(null));
  let requests = 0, writes = 0;
  t.mock.method(globalThis, "fetch", async (_, options) => {
    requests++;
    const prompt = JSON.parse(options.body); assert.match(prompt.messages[0].content, /not a lifetime streak/);
    const context = JSON.parse(prompt.messages[1].content);
    assert.equal(context.totalInstances, 1); assert.equal(context.missed, 1); assert.equal(context.missedHabits, undefined);
    await new Promise(resolve => setTimeout(resolve, 10));
    return { ok: true, json: async () => ({ choices: [{ message: { content: "Generated" } }] }) };
  });
  t.mock.method(HabitWeeklySummary, "findOneAndUpdate", async (filter, update, options) => {
    writes++; assert.equal(filter.userId, USER); assert.equal(options.runValidators, true); assert.match(update.$set.sourceHash, /^[a-f0-9]{64}$/); return update.$set;
  });
  const results = await Promise.all([call(generateHabitAiSummary, request({ method: "POST" })), call(generateHabitAiSummary, request({ method: "POST" }))]);
  assert.equal(requests, 1); assert.equal(writes, 1); assert.equal(results[0].body.aiSummary, "Generated"); assert.equal(results[1].body.aiSummary, "Generated");
});

test("failed and empty AI responses do not overwrite cache and permit a later retry", async t => {
  fixture(t); apiKey(t);
  t.mock.method(HabitWeeklySummary, "findOne", () => query({ aiSummary: "Previous" }));
  let writes = 0;
  t.mock.method(HabitWeeklySummary, "findOneAndUpdate", async () => { writes++; return {}; });
  t.mock.method(globalThis, "fetch", async () => { throw new Error("Unavailable"); });
  assert.equal((await call(generateHabitAiSummary, request({ method: "POST" }))).status, 502);
  t.mock.method(globalThis, "fetch", async () => ({ ok: true, json: async () => ({ choices: [] }) }));
  assert.equal((await call(generateHabitAiSummary, request({ method: "POST" }))).status, 502); assert.equal(writes, 0);
  t.mock.method(globalThis, "fetch", async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: "Retry" } }] }) }));
  assert.equal((await call(generateHabitAiSummary, request({ method: "POST" }))).body.aiSummary, "Retry"); assert.equal(writes, 1);
});

test("cache storage failure returns generated text with a warning, unique-key conflict retries safely", async t => {
  fixture(t); apiKey(t);
  t.mock.method(HabitWeeklySummary, "findOne", () => query(null));
  t.mock.method(globalThis, "fetch", async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: "Generated" } }] }) }));
  t.mock.method(HabitWeeklySummary, "findOneAndUpdate", async () => { throw new Error("Unavailable"); });
  const failure = await call(generateHabitAiSummary, request({ method: "POST" }));
  assert.equal(failure.status, 200); assert.equal(failure.body.persisted, false); assert.match(failure.body.warning, /could not be saved/);
  let attempts = 0;
  t.mock.method(HabitWeeklySummary, "findOneAndUpdate", async (filter, update, options) => {
    assert.equal(filter.userId, USER);
    if (++attempts === 1) throw Object.assign(new Error("Conflict"), { code: 11000 });
    assert.equal(options.upsert, undefined); assert.equal(options.runValidators, true); return update.$set;
  });
  assert.equal((await call(generateHabitAiSummary, request({ method: "POST" }))).body.persisted, true); assert.equal(attempts, 2);
});

test("generation reuses fresh cache unless force is explicit; schema accepts old cache documents", async t => {
  const report = fixture(t); apiKey(t);
  t.mock.method(HabitWeeklySummary, "findOne", () => query({ aiSummary: "Fresh", sourceHash: habitReportFingerprint(report) }));
  let requests = 0;
  t.mock.method(globalThis, "fetch", async () => { requests++; return { ok: true, json: async () => ({ choices: [{ message: { content: "Forced" } }] }) }; });
  t.mock.method(HabitWeeklySummary, "findOneAndUpdate", async () => ({}));
  assert.equal((await call(generateHabitAiSummary, request({ method: "POST" }))).body.aiSummary, "Fresh"); assert.equal(requests, 0);
  assert.equal((await call(generateHabitAiSummary, request({ query: { week: WEEK, regenerate: "true" } }))).body.aiSummary, "Forced");
  const doc = new HabitWeeklySummary({ userId: USER, weekStart: WEEK, aiSummary: "Old" }); await doc.validate();
  doc.sourceHash = "invalid"; await assert.rejects(doc.validate(), /sourceHash/);
});

test("AI cache GETs bypass generation quotas; POST and legacy regeneration remain protected", async t => {
  const previous = process.env.ARCJET_KEY; delete process.env.ARCJET_KEY;
  t.after(() => { if (previous !== undefined) process.env.ARCJET_KEY = previous; });
  const get = weeklyRoutes.stack.find(layer => layer.route?.path === "/habits/ai-summary" && layer.route.methods.get).route;
  const post = weeklyRoutes.stack.find(layer => layer.route?.path === "/habits/ai-summary" && layer.route.methods.post).route;
  assert.equal(post.stack.length, 2);
  let passes = 0, status = 200;
  const res = { setHeader() {}, status(code) { status = code; return this; }, json() {} };
  const req = request({ user: { id: "habit-weekly-quota-fixture" } });
  for (let i = 0; i < 20; i++) await get.stack[0].handle(req, res, () => passes++);
  assert.equal(passes, 20); req.query.regenerate = "true";
  for (let i = 0; i < Number(process.env.HABIT_WEEKLY_AI_RATE_LIMIT_DAILY_MAX || 2) + 1; i++) await get.stack[0].handle(req, res, () => {});
  assert.equal(status, 429);
});

