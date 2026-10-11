import test from "node:test";
import assert from "node:assert/strict";
import Todo from "../models/Todo.js";
import TodoWeeklySummary from "../models/TodoWeeklySummary.js";
import User from "../models/User.js";
import weeklyRoutes from "../routes/weeklyReportRoutes.js";
import { getTodoWeeklyReport, getTodoSummaries, generateTodoAiSummary } from "../controllers/weeklyReportController.js";
import { computeTodoWeeklyReport, todoReportDay } from "../../shared/todoWeeklyStats.js";
import { shiftReportDay } from "../../shared/journalWeeklyStats.js";
import { buildTodoWeeklyReport, todoReportFingerprint, todoAiContext, todoReportFilter, completedTodoWeeks } from "../utils/todoWeeklyReportUtils.js";
import { DEMO_TODO_REPORTS } from "../../client/src/dashboard/weeklyreport/todoDemoReports.js";

const USER = "000000000000000000000001", WEEK = "2026-09-28";
const days = Array.from({ length: 7 }, (_, index) => shiftReportDay(WEEK, index));
const clock = { today: "2026-10-10", time: "11:30", timezone: "Asia/Kolkata" };
const task = (extra = {}) => ({ id: "task", title: "Read", category: "Study", priority: "High", repeatType: "daily", startDate: WEEK, time: "08:00", dayStates: [], ...extra });
const once = (offset, extra = {}) => task({ id: "once-" + offset, repeatType: "once", date: days[offset], ...extra });
const query = value => ({ select() { return this; }, lean: async () => value });
const request = (extra = {}) => ({ user: { id: USER }, method: "GET", query: { week: WEEK }, body: {}, ...extra });
async function call(handler, req = request()) {
  let status = 200, body;
  await handler(req, { status(code) { status = code; return this; }, json(value) { body = value; return this; } });
  return { status, body };
}
function fixture(t, tasks = [once(0)], prefs = {}) {
  t.mock.timers.enable({ apis: ["Date"], now: Date.parse("2026-10-10T06:00:00Z") });
  t.mock.method(Todo, "find", (filter, fields) => {
    assert.equal(filter.userId, USER); assert.equal(filter.deletedAt, undefined);
    assert.equal(fields.description, undefined); assert.equal(fields.pendingTime, 1);
    return query(tasks);
  });
  t.mock.method(User, "findById", id => { assert.equal(id, USER); return query({ todoPreferences: prefs }); });
  return buildTodoWeeklyReport(tasks, { todoPreferences: prefs }, days);
}
function apiKey(t) {
  const previous = process.env.API_KEY; process.env.API_KEY = "fixture-not-real";
  t.after(() => { if (previous === undefined) delete process.env.API_KEY; else process.env.API_KEY = previous; });
}
const sum = (values, key) => values.reduce((total, value) => total + value[key], 0);
function reconciles(report) {
  assert.equal(report.completed + report.missed + report.pending, report.totalTasks);
  for (const rows of [report.categories, report.priorityStats, report.dailyStats]) {
    assert.equal(sum(rows, "total"), report.totalTasks);
    for (const key of ["completed", "pending", "missed"]) assert.equal(sum(rows, key), report[key]);
  }
  assert.equal(sum(report.completionTiming, "total"), report.totalTasks);
  assert.equal(sum(report.completionTiming, "count"), report.completed);
  assert.equal(sum(report.missedTiming, "count"), report.missed);
}

test("once tasks without dayStates still count, and legacy completed flags are retained", () => {
  const report = computeTodoWeeklyReport([once(0), once(1, { completed: true })], days, clock);
  assert.equal(report.totalTasks, 2); assert.equal(report.missed, 1); assert.equal(report.completed, 1);
  assert.equal(report.pending, 0); reconciles(report);
});

test("stored legacy occurrences without anchors are deduplicated by day", () => {
  const report = computeTodoWeeklyReport([task({ repeatType: "once", startDate: null, date: null, dayStates: [
    { dayKey: days[0], status: "pending" }, { dayKey: days[0], status: "completed" },
    { dayKey: "2026-02-31", status: "completed" }, null,
  ] })], days, clock);
  assert.equal(report.totalTasks, 1); assert.equal(report.completed, 1);
});

test("deleted recurring tasks preserve past history but stop after deletion", () => {
  const report = computeTodoWeeklyReport([task({ deletedAt: "2026-10-01T14:00:00+05:30", dayStates: [
    { dayKey: days[0], status: "completed" }, { dayKey: days[3], status: "completed" }, { dayKey: days[5], status: "completed" },
  ] })], days, clock);
  assert.equal(report.totalTasks, 4); assert.equal(report.completed, 2); assert.equal(report.missed, 2);
  assert.equal(report.dailyStats[5].total, 0); reconciles(report);
});

test("cancelled deletion-day occurrence is not invented as missed", () => {
  const report = computeTodoWeeklyReport([task({ deletedAt: days[0] })], days, clock);
  assert.equal(report.totalTasks, 0);
});

test("app-date conversion retains start and inclusive final day at Kolkata midnight", () => {
  const report = computeTodoWeeklyReport([task({ startDate: new Date("2026-09-28T00:00:00+05:30"), endDate: new Date("2026-09-29T00:00:00+05:30") })], days, clock);
  assert.equal(report.totalTasks, 2);
  assert.equal(todoReportDay("2026-09-27T18:30:00Z", clock.timezone), WEEK);
  assert.equal(todoReportDay("2026-02-31", clock.timezone), "");
});

test("deferred weekday and time changes apply on their app-calendar effective date", () => {
  const report = computeTodoWeeklyReport([task({ repeatType: "weekdays", days: ["Mon"], pendingDays: ["Tue", "Fri"],
    daysChangeEffectiveFrom: "2026-09-28T18:30:00Z", time: "05:30", pendingTime: "20:00", timeChangeEffectiveFrom: "2026-09-28T18:30:00Z" })], days, clock);
  assert.equal(report.totalTasks, 3);
  assert.equal(report.missedTiming[0].count, 1);
  assert.equal(report.missedTiming[5].count, 2);
  reconciles(report);
});

test("explicit past states survive later weekday changes without creating future completions", () => {
  const report = computeTodoWeeklyReport([task({ repeatType: "weekdays", days: ["Fri"], dayStates: [
    { dayKey: days[1], status: "completed" }, { dayKey: "2026-10-12", status: "completed" },
  ] })], days, clock);
  assert.equal(report.totalTasks, 2); assert.equal(report.completed, 1);
});

test("today's future times stay pending while elapsed times become missed", () => {
  const week = Array.from({ length: 7 }, (_, index) => shiftReportDay("2026-10-05", index));
  const tasks = ["09:00", "11:30", "20:00", ""].map((time, index) => task({ id: "today-" + index, repeatType: "once", date: "2026-10-10", time }));
  tasks.push(task({ id: "future", repeatType: "once", date: "2026-10-11", dayStates: [{ dayKey: "2026-10-11", status: "completed" }] }));
  const report = computeTodoWeeklyReport(tasks, week, clock);
  assert.equal(report.totalTasks, 4); assert.equal(report.missed, 1); assert.equal(report.pending, 3);
  assert.equal(report.dailyStats[6].future, true); assert.equal(report.dailyStats[6].total, 0);
  reconciles(report);
});

test("all timing buckets reconcile, including early morning and invalid/unspecified times", () => {
  const times = ["00:00", "05:59", "06:00", "09:00", "12:00", "15:00", "18:00", "23:59", "", "invalid"];
  const report = computeTodoWeeklyReport(times.map((time, index) => once(0, { id: "time-" + index, time, completed: index % 2 === 0 })), days, clock);
  assert.equal(report.completionTiming.length, 7); assert.equal(report.completionTiming[0].total, 2);
  assert.equal(report.completionTiming.at(-1).total, 2); reconciles(report);
});

test("custom important categories, hostile names and invalid priority do not break totals", () => {
  const report = computeTodoWeeklyReport([once(0, { category: "__proto__", priority: "Unexpected" }), once(1, { category: "Work" }), once(2, { category: "health" })], days,
    { ...clock, importantCategories: ["work", "Health"] });
  assert.equal(report.categories.find(category => category.name === "__proto__").total, 1);
  assert.equal(report.priorityStats.find(row => row.priority === "Medium").total, 1);
  assert.deepEqual(report.importantCategories.map(category => category.name).sort(), ["Work", "health"].sort());
  reconciles(report);
});

test("active-day consistency uses scheduled days; calendar gaps break activity streaks", () => {
  const report = computeTodoWeeklyReport([once(0, { completed: true }), once(2, { completed: true }), once(3, { completed: true })], days, clock);
  assert.equal(report.activeDays, 3); assert.equal(report.scheduledDays, 3); assert.equal(report.consistency, 100); assert.equal(report.longestStreak, 2);
});

test("late completions remain completed but are separately counted, not a Monk Streak claim", () => {
  const report = computeTodoWeeklyReport([once(0, { dayStates: [{ dayKey: days[0], status: "completed", lateCompleted: true }] })], days, clock);
  assert.equal(report.completed, 1); assert.equal(report.lateCompleted, 1); assert.equal(report.longestStreak, 1);
});

test("missed-task list limit does not truncate totals or hide the number omitted", () => {
  const report = computeTodoWeeklyReport(Array.from({ length: 25 }, (_, index) => once(0, { id: "miss-" + index })), days, clock);
  assert.equal(report.missed, 25); assert.equal(report.missedTasks.length, 20);
  assert.equal(report.missedTasksTotal, 25); assert.equal(report.missedTasksTruncated, true); reconciles(report);
});

test("duplicate documents use latest data without double-counting occurrences", () => {
  const report = computeTodoWeeklyReport([once(0, { id: "same", completed: false, updatedAt: "2026-09-28T12:00:00Z" }),
    once(0, { id: "same", completed: true, updatedAt: "2026-09-28T13:00:00Z" })], days, clock);
  assert.equal(report.totalTasks, 1); assert.equal(report.completed, 1);
});

test("all demo totals, groupings, dates and activity runs reconcile with sample tasks", () => {
  for (const report of Object.values(DEMO_TODO_REPORTS)) {
    reconciles(report); assert.equal(report.pending, 0); assert.equal(report.dailyStats.length, 7);
    report.missedTasks.forEach(task => assert.equal(task.day, new Date(task.dayKey + "T12:00:00Z").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" })));
  }
  const first = DEMO_TODO_REPORTS["2026-04-13"];
  assert.equal(first.totalTasks, 42); assert.equal(first.completed, 28); assert.equal(first.missed, 14);
  assert.equal(first.longestStreak, 6); assert.equal(first.consistency, 86);
});

test("report and picker use the same owner-scoped calculator and preferences", async t => {
  fixture(t, [once(0, { completed: true, category: "Work" }), once(1)], { importantCategories: ["Work"] });
  const detail = (await call(getTodoWeeklyReport)).body;
  const summaries = (await call(getTodoSummaries)).body;
  const summary = summaries.find(week => week.id === WEEK);
  for (const key of ["totalTasks", "completed", "missed", "pending", "consistency", "longestStreak"]) assert.equal(summary[key], detail[key]);
  assert.deepEqual(detail.importantCategories.map(category => category.name), ["Work"]);
});

test("last 12 completed weeks use app Monday even before UTC Monday", async t => {
  t.mock.timers.enable({ apis: ["Date"], now: Date.parse("2026-10-11T18:45:00Z") });
  assert.equal(completedTodoWeeks()[0][0], "2026-10-05"); assert.equal(completedTodoWeeks().length, 12);
  const filter = todoReportFilter(USER, days);
  assert.equal(filter.$or[0].startDate.$lte.toISOString(), "2026-10-04T18:29:59.999Z");
  assert.equal(filter.$or[1].date.$gte.toISOString(), "2026-09-27T18:30:00.000Z");
});

test("invalid/future weeks fail before reading records or calling providers", async t => {
  t.mock.timers.enable({ apis: ["Date"], now: Date.parse("2026-10-10T06:00:00Z") });
  t.mock.method(Todo, "find", () => assert.fail("Invalid week cannot query"));
  for (const week of ["2026-02-31", "", ["2026-10-05"], "2026-10-12"])
    for (const handler of [getTodoWeeklyReport, generateTodoAiSummary]) assert.equal((await call(handler, request({ query: { week } }))).status, 400);
});

test("failed reads remain recoverable errors rather than empty successful reports", async t => {
  fixture(t);
  t.mock.method(Todo, "find", () => ({ lean: async () => { throw new Error("Unavailable"); } }));
  assert.equal((await call(getTodoWeeklyReport)).status, 500); assert.equal((await call(getTodoSummaries)).status, 500);
});

test("AI fingerprint changes with outcomes and starred categories, not clock or private titles", async t => {
  const report = fixture(t, [once(0, { category: "Work" })]);
  assert.equal(todoReportFingerprint(report), todoReportFingerprint({ ...report, serverNow: "changed", missedTasks: [{ title: "PRIVATE NARRATIVE" }] }));
  assert.notEqual(todoReportFingerprint(report), todoReportFingerprint({ ...report, importantCategories: report.categories }));
  assert.notEqual(todoReportFingerprint(report), todoReportFingerprint({ ...report, completed: 1, missed: 0 }));
  assert.equal(todoAiContext(report).missedTasks, undefined);
});

test("fresh, stale and missing AI caches can be read without credentials or generation", async t => {
  const report = fixture(t);
  t.mock.method(globalThis, "fetch", () => assert.fail("Cache GET cannot generate"));
  t.mock.method(TodoWeeklySummary, "findOneAndUpdate", () => assert.fail("Cache GET cannot write"));
  t.mock.method(TodoWeeklySummary, "findOne", filter => { assert.deepEqual(filter, { userId: USER, weekStart: WEEK }); return query({ aiSummary: "Saved", sourceHash: todoReportFingerprint(report) }); });
  assert.equal((await call(generateTodoAiSummary)).body.needsGeneration, false);
  t.mock.method(TodoWeeklySummary, "findOne", () => query({ aiSummary: "Legacy" }));
  assert.equal((await call(generateTodoAiSummary)).body.stale, true);
  t.mock.method(TodoWeeklySummary, "findOne", () => query(null));
  assert.equal((await call(generateTodoAiSummary)).body.aiSummary, null);
});

test("explicit generation refuses empty weeks and unconfigured credentials without billing", async t => {
  fixture(t, []);
  t.mock.method(TodoWeeklySummary, "findOne", () => query(null));
  t.mock.method(globalThis, "fetch", () => assert.fail("Unavailable generation cannot bill"));
  assert.equal((await call(generateTodoAiSummary, request({ method: "POST" }))).status, 400);
  t.mock.method(Todo, "find", () => query([once(0)]));
  const previous = process.env.API_KEY; delete process.env.API_KEY;
  t.after(() => { if (previous !== undefined) process.env.API_KEY = previous; });
  assert.equal((await call(generateTodoAiSummary, request({ method: "POST" }))).status, 503);
});

test("concurrent explicit AI requests coalesce and use only canonical statistics", async t => {
  fixture(t); apiKey(t);
  t.mock.method(TodoWeeklySummary, "findOne", () => query(null));
  let requests = 0, writes = 0;
  t.mock.method(globalThis, "fetch", async (_, options) => {
    requests++;
    const prompt = JSON.parse(options.body); assert.match(prompt.messages[0].content, /not actual completion/);
    const context = JSON.parse(prompt.messages[1].content);
    assert.equal(context.totalTasks, 1); assert.equal(context.missed, 1); assert.equal(context.missedTasks, undefined);
    await new Promise(resolve => setTimeout(resolve, 10));
    return { ok: true, json: async () => ({ choices: [{ message: { content: "Generated" } }] }) };
  });
  t.mock.method(TodoWeeklySummary, "findOneAndUpdate", async (filter, update, options) => {
    writes++; assert.equal(filter.userId, USER); assert.equal(options.runValidators, true); assert.match(update.$set.sourceHash, /^[a-f0-9]{64}$/); return update.$set;
  });
  const results = await Promise.all([call(generateTodoAiSummary, request({ method: "POST" })), call(generateTodoAiSummary, request({ method: "POST" }))]);
  assert.equal(requests, 1); assert.equal(writes, 1); assert.equal(results[0].body.aiSummary, "Generated"); assert.equal(results[1].body.aiSummary, "Generated");
});

test("failed and empty AI responses do not overwrite cache and permit a later retry", async t => {
  fixture(t); apiKey(t);
  t.mock.method(TodoWeeklySummary, "findOne", () => query({ aiSummary: "Previous" }));
  let writes = 0;
  t.mock.method(TodoWeeklySummary, "findOneAndUpdate", async () => { writes++; return {}; });
  t.mock.method(globalThis, "fetch", async () => { throw new Error("Unavailable"); });
  assert.equal((await call(generateTodoAiSummary, request({ method: "POST" }))).status, 502);
  t.mock.method(globalThis, "fetch", async () => ({ ok: true, json: async () => ({ choices: [] }) }));
  assert.equal((await call(generateTodoAiSummary, request({ method: "POST" }))).status, 502); assert.equal(writes, 0);
  t.mock.method(globalThis, "fetch", async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: "Retry" } }] }) }));
  assert.equal((await call(generateTodoAiSummary, request({ method: "POST" }))).body.aiSummary, "Retry"); assert.equal(writes, 1);
});

test("cache storage failure returns generated text with a warning, unique-key conflict retries safely", async t => {
  fixture(t); apiKey(t);
  t.mock.method(TodoWeeklySummary, "findOne", () => query(null));
  t.mock.method(globalThis, "fetch", async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: "Generated" } }] }) }));
  t.mock.method(TodoWeeklySummary, "findOneAndUpdate", async () => { throw new Error("Unavailable"); });
  const failure = await call(generateTodoAiSummary, request({ method: "POST" }));
  assert.equal(failure.status, 200); assert.equal(failure.body.persisted, false); assert.match(failure.body.warning, /could not be saved/);
  let attempts = 0;
  t.mock.method(TodoWeeklySummary, "findOneAndUpdate", async (filter, update, options) => {
    assert.equal(filter.userId, USER);
    if (++attempts === 1) throw Object.assign(new Error("Conflict"), { code: 11000 });
    assert.equal(options.upsert, undefined); assert.equal(options.runValidators, true); return update.$set;
  });
  assert.equal((await call(generateTodoAiSummary, request({ method: "POST" }))).body.persisted, true); assert.equal(attempts, 2);
});

test("generation reuses fresh cache unless force is explicit; schema accepts old cache documents", async t => {
  const report = fixture(t); apiKey(t);
  t.mock.method(TodoWeeklySummary, "findOne", () => query({ aiSummary: "Fresh", sourceHash: todoReportFingerprint(report) }));
  let requests = 0;
  t.mock.method(globalThis, "fetch", async () => { requests++; return { ok: true, json: async () => ({ choices: [{ message: { content: "Forced" } }] }) }; });
  t.mock.method(TodoWeeklySummary, "findOneAndUpdate", async () => ({}));
  assert.equal((await call(generateTodoAiSummary, request({ method: "POST" }))).body.aiSummary, "Fresh"); assert.equal(requests, 0);
  assert.equal((await call(generateTodoAiSummary, request({ query: { week: WEEK, regenerate: "true" } }))).body.aiSummary, "Forced");
  const doc = new TodoWeeklySummary({ userId: USER, weekStart: WEEK, aiSummary: "Old" }); await doc.validate();
  doc.sourceHash = "invalid"; await assert.rejects(doc.validate(), /sourceHash/);
});

test("AI cache GETs bypass generation quotas; POST and legacy regeneration remain protected", async t => {
  const previous = process.env.ARCJET_KEY; delete process.env.ARCJET_KEY;
  t.after(() => { if (previous !== undefined) process.env.ARCJET_KEY = previous; });
  const get = weeklyRoutes.stack.find(layer => layer.route?.path === "/todos/ai-summary" && layer.route.methods.get).route;
  const post = weeklyRoutes.stack.find(layer => layer.route?.path === "/todos/ai-summary" && layer.route.methods.post).route;
  assert.equal(post.stack.length, 2);
  let passes = 0, status = 200;
  const res = { setHeader() {}, status(code) { status = code; return this; }, json() {} };
  const req = request({ user: { id: "todo-weekly-quota-fixture" } });
  for (let i = 0; i < 20; i++) await get.stack[0].handle(req, res, () => passes++);
  assert.equal(passes, 20); req.query.regenerate = "true";
  for (let i = 0; i < Number(process.env.TODO_WEEKLY_AI_RATE_LIMIT_DAILY_MAX || 2) + 1; i++) await get.stack[0].handle(req, res, () => {});
  assert.equal(status, 429);
});
