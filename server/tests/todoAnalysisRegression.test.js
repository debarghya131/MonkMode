import test from "node:test";
import assert from "node:assert/strict";
import Todo from "../models/Todo.js";
import User from "../models/User.js";
import routes from "../routes/todoRoutes.js";
import { getTodoAnalysis } from "../controllers/todoController.js";
import { computeTodoAnalysis } from "../../shared/todoAnalysisStats.js";
import { computeTodoWeeklyReport } from "../../shared/todoWeeklyStats.js";
import { journalMonthDays } from "../../shared/journalAnalysisStats.js";
import { demoTodoAnalysis } from "../../client/src/dashboard/analysis/todoanalysis/todoAnalysisData.js";
import { validTodoAnalysisResponse, todoAnalysisClockValid } from "../../client/src/dashboard/analysis/todoanalysis/todoAnalysisResponse.js";

const USER = "000000000000000000000001";
const clock = { year: 2026, month: 10, today: "2026-10-10", time: "11:30", timezone: "Asia/Kolkata" };
const once = (date, extra = {}) => ({ id: date, repeatType: "once", date, category: "Study", priority: "High", time: "08:00", ...extra });
const recurring = (extra = {}) => ({ id: "daily", repeatType: "daily", startDate: "2026-10-01", time: "08:00", ...extra });
const calculate = (tasks = [], extra = {}) => computeTodoAnalysis(tasks, { ...clock, ...extra });
const sum = (rows, key) => rows.reduce((total, row) => total + row[key], 0);
function reconcile(analysis) {
  const totals = analysis.totals;
  assert.equal(totals.total, totals.completed + totals.pending + totals.missed);
  for (const rows of [analysis.days, analysis.weekdays, analysis.weeks, analysis.categories, analysis.priorities, analysis.timeSlots]) {
    for (const key of ["total", "completed", "pending", "missed", "lateCompleted", "timingKnown"]) assert.equal(sum(rows, key), totals[key]);
  }
  assert.ok(totals.lateCompleted <= totals.timingKnown);
  assert.ok(totals.timingKnown <= totals.completed);
}
const query = value => ({ select() { return this; }, lean: async () => value });
async function call(params = { year: "2026", month: "10" }) {
  let status = 200, body;
  await getTodoAnalysis({ user: { id: USER }, query: params }, { status(code) { status = code; return this; }, json(value) { body = value; return this; } });
  return { status, body };
}
function fixture(t, tasks = [], account = { createdAt: "2026-10-01", todoPreferences: { importantCategories: ["Study"] } }) {
  t.mock.timers.enable({ apis: ["Date"], now: Date.parse("2026-10-10T06:00:00Z") });
  t.mock.method(User, "findById", id => { assert.equal(id, USER); return query(account); });
  t.mock.method(Todo, "find", (filter, fields) => {
    assert.equal(filter.userId, USER); assert.equal(filter.deletedAt, undefined);
    assert.equal(fields.title, undefined); assert.equal(fields.description, undefined);
    assert.equal(fields.pendingTime, 1); assert.equal(fields.updatedAt, 1);
    assert.deepEqual(filter.$or[2].dayStates.$elemMatch.dayKey, { $gte: "2026-10-01", $lte: clock.today });
    return query(tasks);
  });
}

test("strict month parameters reject arrays, objects, partial values and invalid years before database reads", async t => {
  t.mock.method(Todo, "find", () => assert.fail("Unexpected task read"));
  t.mock.method(User, "findById", () => assert.fail("Unexpected account read"));
  for (const [year, month] of [["2026x", 10], [2026, "10x"], [26, 1], [1899, 1], [2026, 0], [2026, 13], [[2026], 10], [2026, [10]], [{}, 1], [undefined, 1]]) {
    assert.equal((await call({ year, month })).status, 400);
  }
});
test("future periods are rejected before reads with authoritative clock metadata", async t => {
  t.mock.timers.enable({ apis: ["Date"], now: Date.parse("2026-10-10T06:00:00Z") });
  t.mock.method(Todo, "find", () => assert.fail("Unexpected task read"));
  t.mock.method(User, "findById", () => assert.fail("Unexpected account read"));
  const result = await call({ year: "2026", month: "11" });
  assert.equal(result.status, 400); assert.equal(result.body.today, clock.today); assert.equal(result.body.time, "11:30");
  assert.equal(result.body.timezone, "Asia/Kolkata");
});
test("empty periods have unknown rates and scores, not a fabricated zero completion score", () => {
  const data = calculate(); reconcile(data);
  assert.equal(data.totals.completionRate, null); assert.equal(data.totals.score, null);
  assert.equal(data.averageBlockScore, null); assert.equal(data.highestWeekday, null);
  assert.equal(data.days[0].completionRate, null); assert.equal(data.days.at(-1).streak, null);
});
test("unfinished today stays pending unless its time passed; future saved states are excluded", () => {
  const tasks = ["09:00", "11:30", "20:00", ""].map((time, index) => once(clock.today, { id: index + 1, time }));
  tasks.push(once("2026-10-11", { completed: true }));
  const data = calculate(tasks); reconcile(data);
  assert.equal(data.totals.total, 4); assert.equal(data.totals.missed, 1); assert.equal(data.totals.pending, 3);
  assert.equal(data.days[10].total, 0); assert.equal(data.days[10].status, "future");
});
test("leap months and final partial month blocks include every calendar day", () => {
  const data = calculate([once("2026-04-29", { completed: true }), once("2026-04-30")], { month: 4 });
  assert.equal(data.days.length, 30); assert.equal(data.weeks.length, 5);
  assert.equal(data.weeks[4].total, 2); assert.equal(data.weeks[4].score, 50);
  assert.equal(data.averageBlockScore, 50);
  assert.equal(calculate([], { year: 2028, month: 2, today: "2028-03-01" }).days.length, 29);
  assert.equal(calculate().weeks[4].score, null);
});
test("all scheduled-time buckets reconcile including midnight, pre-6AM and unspecified times", () => {
  const times = ["00:00", "05:59", "06:00", "09:00", "12:00", "15:00", "18:00", "23:59", "", "bad"];
  const data = calculate(times.map((time, index) => once("2026-10-01", { id: index + 1, time, completed: index % 2 === 0 })));
  reconcile(data); assert.equal(data.timeSlots.length, 7);
  assert.equal(data.timeSlots[0].total, 2); assert.equal(data.timeSlots.at(-1).total, 2);
});
test("effective time and weekday edits use the same occurrence decisions as weekly reports", () => {
  const tasks = [recurring({ repeatType: "weekdays", days: ["Thu"], pendingDays: ["Fri", "Mon"], daysChangeEffectiveFrom: "2026-10-02",
    time: "05:30", pendingTime: "20:00", timeChangeEffectiveFrom: "2026-10-02" })];
  const data = calculate(tasks); reconcile(data);
  assert.equal(data.totals.total, 4); assert.equal(data.timeSlots[0].total, 1); assert.equal(data.timeSlots[5].total, 3);
});
test("saved past outcomes survive later weekday edits without inventing future occurrences", () => {
  const data = calculate([recurring({ repeatType: "weekdays", days: ["Fri"], dayStates: [
    { dayKey: "2026-10-01", status: "completed" }, { dayKey: "2026-10-12", status: "completed" },
  ] })]); reconcile(data);
  assert.equal(data.totals.total, 3); assert.equal(data.totals.completed, 1);
});
test("deleted tasks retain completed deletion-day evidence, not cancelled or post-deletion occurrences", () => {
  const data = calculate([recurring({ deletedAt: "2026-10-03", dayStates: [
    { dayKey: "2026-10-03", status: "completed" }, { dayKey: "2026-10-04", status: "completed" },
  ] })]); reconcile(data);
  assert.equal(data.totals.total, 3); assert.equal(data.totals.completed, 1);
  assert.equal(calculate([recurring({ deletedAt: "2026-10-01" })]).totals.total, 0);
});
test("once legacy anchors and latest duplicate documents do not double-count occurrences", () => {
  const data = calculate([
    once("2026-10-01", { id: "same", updatedAt: "2026-10-02", completed: false }),
    once("2026-10-01", { id: "same", updatedAt: "2026-10-03", completed: true }),
    { id: "legacy", repeatType: "once", dayStates: [{ dayKey: "2026-10-02", status: "completed" }, { dayKey: "2026-02-31", status: "completed" }] },
  ]); reconcile(data); assert.equal(data.totals.total, 2); assert.equal(data.totals.completed, 2);
});
test("custom important categories and hostile category or priority strings are safe", () => {
  const data = calculate([once("2026-10-01", { category: "__proto__", priority: "__proto__" }), once("2026-10-02", { category: "work" })],
    { importantCategories: ["Work"] });
  reconcile(data); assert.equal(data.categories.find(row => row.name === "__proto__").total, 1);
  assert.equal(data.categories.find(row => row.name === "work").important, true);
  assert.equal(data.priorities.find(row => row.name === "Medium").total, 1);
});
test("late completions stay completed; missing timing evidence is not inferred on-time", () => {
  const data = calculate([
    once("2026-10-01", { dayStates: [{ dayKey: "2026-10-01", status: "completed", lateCompleted: true }] }),
    once("2026-10-02", { dayStates: [{ dayKey: "2026-10-02", status: "completed", lateCompleted: false, completedAt: "07:00" }] }),
    once("2026-10-03", { completed: true }),
    once("2026-10-04", { dayStates: [{ dayKey: "2026-10-04", status: "completed", lateCompleted: false }] }),
    once("2026-10-05", { dayStates: [{ dayKey: "2026-10-05", status: "pending", lateCompleted: true }] }),
  ]); reconcile(data);
  assert.equal(data.totals.completed, 4); assert.equal(data.totals.lateCompleted, 1);
  assert.equal(data.totals.timingKnown, 2); assert.equal(data.totals.lateRate, 50); assert.equal(data.totals.missed, 1);
});
test("weekday completion rates are task-weighted rather than averages of daily percentages", () => {
  const tasks = [once("2026-09-01", { completed: true }), ...Array.from({ length: 9 }, (_, index) => once("2026-09-08", { id: index + 1 }))];
  const row = calculate(tasks, { month: 9 }).weekdays.find(row => row.label === "Tue");
  assert.equal(row.completionRate, 10); assert.equal(row.consistency, 50);
});
test("zero-completion weekdays participate in lowest rate; unscheduled weekdays do not", () => {
  const data = calculate([once("2026-10-01", { completed: true }), once("2026-10-02")]);
  assert.equal(data.highestWeekday.label, "Thu"); assert.equal(data.lowestWeekday.label, "Fri");
  assert.equal(data.lowestWeekday.completionRate, 0);
});
test("activity requires completion; scheduled tasks alone do not create a streak", () => {
  const data = calculate([recurring()]);
  assert.equal(data.longestStreak, 0); assert.equal(data.streakBreaks, 0); assert.equal(data.totals.consistency, 0);
});
test("calendar gaps break runs once, unfinished today and future dates do not", () => {
  const data = calculate([once("2026-10-01", { completed: true }), once("2026-10-02", { completed: true }),
    once("2026-10-08", { completed: true }), once("2026-10-09", { completed: true })]);
  assert.equal(data.longestStreak, 2); assert.equal(data.streakBreaks, 1); assert.equal(data.currentStreak, 2);
  assert.equal(data.days[2].breakDay, true); assert.equal(data.days[3].breakDay, false);
  assert.equal(data.days[9].streak, null); assert.equal(data.days[10].streak, null);
});
test("old-month activity is not labeled a current streak or a cross-module Monk Streak", () => {
  const data = calculate([once("2026-09-29", { completed: true }), once("2026-09-30", { completed: true })], { month: 9 });
  assert.equal(data.longestStreak, 2); assert.equal(data.currentStreak, 0);
});
test("month score uses exactly the weekly product formula and nullable unscheduled blocks", () => {
  const tasks = [once("2026-10-01", { completed: true }), once("2026-10-02")];
  const data = calculate(tasks);
  const weekly = computeTodoWeeklyReport(tasks, journalMonthDays(2026, 10).slice(0, 7), clock);
  assert.equal(data.weeks[0].score, weekly.weeklyScore); assert.equal(data.totals.score, 50);
  assert.equal(data.weeks[1].score, null); assert.equal(data.averageBlockScore, 50);
});
test("activity scores preserve weekly rounding for varied task and active-day denominators", () => {
  for (let count = 1; count <= 50; count++) {
    const tasks = Array.from({ length: count }, (_, index) => once("2026-10-" + String(index % 7 + 1).padStart(2, "0"),
      { id: index + 1, completed: index % 4 === 0 }));
    const data = calculate(tasks);
    const report = computeTodoWeeklyReport(tasks, journalMonthDays(2026, 10), clock);
    assert.equal(data.totals.score, report.weeklyScore);
    assert.equal(data.weeks[0].score, report.weeklyScore);
  }
});
test("one shared demo dataset reconciles all charts and never substitutes another month", () => {
  for (const month of [2, 3, 4, 5]) {
    const data = demoTodoAnalysis(2026, month); reconcile(data.analysis);
    assert.equal(data.month, month); assert.equal(data.analysis.days.length, journalMonthDays(2026, month).length);
    if (month === 5) assert.equal(data.analysis.totals.total, 0);
  }
  assert.equal(demoTodoAnalysis(2025, 4).analysis.totals.total, 0);
});
test("read-only endpoint scopes owner, projects no private text and respects custom important categories", async t => {
  fixture(t, [once("2026-10-01", { completed: true })]);
  const result = await call(); assert.equal(result.status, 200); reconcile(result.body.analysis);
  assert.equal(result.body.analysis.categories[0].important, true);
  assert.equal(result.body.today, clock.today); assert.equal(result.body.time, clock.time);
  assert.equal(result.body.joinedDay, "2026-10-01");
  assert.equal(validTodoAnalysisResponse(result.body, { year: "2026", month: "10" }), true);
  assert.ok(!JSON.stringify(result.body).includes("dayStates")); assert.ok(!JSON.stringify(result.body).includes("userId"));
});
test("missing accounts fail closed before reading task data", async t => {
  t.mock.method(User, "findById", () => query(null));
  t.mock.method(Todo, "find", () => assert.fail("Unexpected task read"));
  assert.equal((await call()).status, 404);
});
test("database failures return a safe retry message without raw connection details", async t => {
  t.mock.method(User, "findById", () => ({ select() { return this; }, lean: async () => { throw new Error("private connection credential"); } }));
  const result = await call(); assert.equal(result.status, 500);
  assert.match(result.body.message, /retry/i); assert.ok(!result.body.message.includes("credential"));
});
test("malformed nested analysis rows, totals and clock metadata cannot crash client charts", () => {
  const data = { ...demoTodoAnalysis(2026, 4), serverNow: "2026-10-10T06:00:00Z" }, period = { year: "2026", month: "04" };
  assert.equal(validTodoAnalysisResponse(data, period), true);
  for (const corrupt of [
    row => row.analysis.days[0] = null,
    row => row.analysis.days[0].total = -1,
    row => row.analysis.categories[0] = null,
    row => row.analysis.priorities[0].name = {},
    row => row.analysis.weekdays[0] = null,
    row => row.analysis.weeks[0].from = "bad",
    row => row.analysis.totals = {},
    row => row.analysis.highestWeekday = undefined,
    row => row.timezone = "Mars/Invalid",
    row => row.serverNow = "invalid",
  ]) {
    const malformed = structuredClone(data); corrupt(malformed);
    assert.equal(validTodoAnalysisResponse(malformed, period), false);
  }
  assert.equal(todoAnalysisClockValid({ today: "2026-10-10", timezone: "invalid", serverNow: "2026-10-10T06:00:00Z" }), false);
});
test("analysis is a protected GET without write or provider-generation routes", () => {
  assert.equal(routes.stack[0].handle.name, "protect");
  const route = routes.stack.find(layer => layer.route?.path === "/analysis").route;
  assert.deepEqual(route.methods, { get: true }); assert.equal(route.stack.length, 1);
});
