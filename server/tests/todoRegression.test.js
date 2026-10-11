import test from "node:test";
import assert from "node:assert/strict";
import Todo from "../models/Todo.js";
import TodoLog from "../models/TodoLog.js";
import User from "../models/User.js";
import { createTodo, getTodos, setTodoStatus, toggleTodo, deleteTodo, restoreTodo, getTodoPreferences, saveTodoPreferences, getTodoSummary } from "../controllers/todoController.js";
import { normalizeTodoPreferences } from "../utils/todoPreferencesUtils.js";
import { todoClock, shiftTodoDay, effectiveTodoDay, isTodoArchived, isTodoOnDay, todosOnDay, todoTimeOnDay, formatTodoTime } from "../../client/src/dashboard/todo/todoUtils.js";

const USER = "000000000000000000000001";
const ID = "000000000000000000000002";
test("scheduled wall-clock times format without the browser's daylight-saving shifts", () => {
  assert.equal(formatTodoTime("02:30"), "2:30 AM");
  assert.equal(formatTodoTime("00:00"), "12:00 AM");
  assert.equal(formatTodoTime("12:00"), "12:00 PM");
  assert.equal(formatTodoTime("23:59"), "11:59 PM");
  assert.equal(formatTodoTime("25:99"), "--");
});
const req = extra => ({ user: { id: USER }, query: {}, body: {}, params: { id: ID }, ...extra });
async function call(handler, request = req()) {
  let status = 200;
  let body;
  await handler(request, { status(code) { status = code; return this; }, json(data) { body = data; return this; } });
  return { status, body };
}
function clock(t) { t.mock.timers.enable({ apis: ["Date"], now: Date.parse("2026-10-10T06:00:00Z") }); }
function task(extra = {}) {
  return { _id: ID, id: ID, title: "Study", category: "Study", priority: "High", repeatType: "daily", startDate: new Date("2026-10-09T00:00:00+05:30"), time: "20:00", dayStates: [], save: async () => {}, ...extra };
}
function find(t, item) {
  t.mock.method(Todo, "findOne", async filter => { assert.equal(filter.userId, USER); return item; });
}

test("Todo calendar uses the backend timezone, including midnight and leap-day shifts", () => {
  assert.deepEqual(todoClock(new Date("2026-10-09T18:45:00Z")), { date: "2026-10-10", time: "00:15" });
  assert.equal(todoClock(new Date("2026-10-09T18:45:00Z"), "America/Los_Angeles").date, "2026-10-09");
  assert.equal(shiftTodoDay("2028-02-28", 1), "2028-02-29");
  assert.equal(shiftTodoDay("2026-12-31", 1), "2027-01-01");
});

test("deferred timestamp days are converted to app days instead of slicing UTC", () => {
  const item = { time: "08:00", pendingTime: "10:00", timeChangeEffectiveFrom: "2026-10-10T18:30:00.000Z" };
  assert.equal(effectiveTodoDay(item.timeChangeEffectiveFrom), "2026-10-11");
  assert.equal(todoTimeOnDay(item, "2026-10-10"), "08:00");
  assert.equal(todoTimeOnDay(item, "2026-10-11"), "10:00");
});

test("client recurrence handles pending weekdays, weekends, inclusive end dates and deleted tasks", () => {
  const item = { repeatType: "weekdays", startDate: "2026-10-09", endDate: "2026-10-11", days: ["Sat"], pendingDays: ["Sun"], daysChangeEffectiveFrom: "2026-10-10T18:30:00.000Z" };
  assert.equal(isTodoOnDay(item, "2026-10-10"), true);
  assert.equal(isTodoOnDay(item, "2026-10-11"), true);
  assert.equal(isTodoOnDay(item, "2026-10-12"), false);
  assert.equal(isTodoOnDay({ ...item, deletedAt: "2026-10-10" }, "2026-10-11"), false);
  assert.equal(isTodoOnDay({ ...item, repeatType: "weekend" }, "2026-10-11"), true);
  assert.equal(isTodoArchived(item, "2026-10-11"), false);
  assert.equal(isTodoArchived(item, "2026-10-12"), true);
  assert.equal(isTodoArchived({ repeatType: "once", date: "2026-10-09" }, "2026-10-10"), true);
});

test("today changes pending tasks to missed as time passes without losing saved completions", () => {
  const items = [
    { id: "a", title: "First", repeatType: "daily", startDate: "2026-10-09", time: "09:00", dayStates: [{ dayKey: "2026-10-10", status: "pending" }] },
    { id: "b", title: "Second", repeatType: "daily", startDate: "2026-10-09", time: "10:00", dayStates: [{ dayKey: "2026-10-10", status: "completed", completedAt: "09:30" }] },
  ];
  assert.equal(todosOnDay(items, "2026-10-10", { date: "2026-10-10", time: "08:59" })[0].status, "pending");
  const result = todosOnDay(items, "2026-10-10", { date: "2026-10-10", time: "11:30" });
  assert.equal(result[0].status, "missed");
  assert.equal(result[1].status, "completed");
});

test("backend upcoming projection uses the deferred future time and final day remains active", async t => {
  clock(t);
  const item = task({ endDate: new Date("2026-10-11T00:00:00+05:30"), pendingTime: "21:00", timeChangeEffectiveFrom: new Date("2026-10-11T00:00:00+05:30") });
  t.mock.method(Todo, "find", filter => { assert.equal(filter.userId, USER); return { sort: async () => [item] }; });
  const result = await call(getTodos, req({ query: { date: "2026-10-11", view: "active" } }));
  assert.equal(result.status, 200);
  assert.equal(result.body[0].time, "21:00");
  assert.equal(result.body[0].archived, false);
  assert.equal(item.time, "20:00");
});

for (const handler of [setTodoStatus, toggleTodo]) {
  test(`${handler.name} rejects future completion times and future days without saving`, async t => {
    clock(t);
    find(t, task({ save: async () => assert.fail("Invalid completion must not save") }));
    for (const body of [{ date: "2026-10-10", status: "completed", completedAt: "23:59" }, { date: "2026-10-11", status: "completed" }]) {
      assert.equal((await call(handler, req({ body }))).status, 400);
    }
  });
}

test("explicit completion is idempotent and stores app-clock completion time", async t => {
  clock(t);
  const item = task(); find(t, item);
  const request = req({ body: { date: "2026-10-10", status: "completed" } });
  await call(setTodoStatus, request);
  const result = await call(setTodoStatus, request);
  assert.equal(result.body.status, "completed");
  assert.equal(result.body.completedAt, "11:30");
  assert.equal(item.dayStates.length, 1);
});

test("undo after the scheduled time returns missed and clears late-completion metadata", async t => {
  clock(t);
  const item = task({ time: "08:00", dayStates: [{ dayKey: "2026-10-10", status: "completed", completedAt: "09:00", lateCompleted: true }] }); find(t, item);
  const result = await call(setTodoStatus, req({ body: { date: "2026-10-10", status: "pending" } }));
  assert.equal(result.body.status, "missed");
  assert.equal(result.body.completedAt, "");
  assert.equal(result.body.lateCompleted, false);
});

test("new tasks cannot be backdated or created at an elapsed time", async t => {
  clock(t);
  t.mock.method(Todo, "create", async () => assert.fail("Invalid schedule must not save"));
  for (const body of [{ date: "2026-10-09", time: "20:00" }, { date: "2026-10-10", time: "08:00" }]) {
    assert.equal((await call(createTodo, req({ body: { title: "Read", repeatType: "once", ...body } }))).status, 400);
  }
});

test("successful creation with an audit failure returns success with a warning", async t => {
  clock(t);
  t.mock.method(Todo, "create", async fields => { assert.equal(fields.userId, USER); return task(fields); });
  t.mock.method(TodoLog, "create", async () => { throw new Error("Fixture log unavailable"); });
  const result = await call(createTodo, req({ body: { title: "Read", repeatType: "once", date: "2026-10-11", time: "20:00" } }));
  assert.equal(result.status, 201);
  assert.match(result.body.auditWarning, /activity log/);
});

test("delete and restore still succeed if activity logging fails", async t => {
  clock(t);
  const item = task(); find(t, item);
  t.mock.method(TodoLog, "create", async () => { throw new Error("Fixture log unavailable"); });
  const removed = await call(deleteTodo);
  assert.equal(removed.status, 200);
  assert.equal(removed.body.canUndoDelete, true);
  assert.ok(removed.body.auditWarning);
  const restored = await call(restoreTodo);
  assert.equal(restored.status, 200);
  assert.equal(restored.body.deletedAt, null);
});

test("restore enforces the 48-hour deadline on the server", async t => {
  clock(t);
  find(t, task({ deletedAt: new Date("2026-10-08T05:59:59Z"), save: async () => assert.fail("Expired task must not restore") }));
  assert.equal((await call(restoreTodo)).status, 410);
});

test("preferences deduplicate case-insensitively, keep required categories and allow Work to be unstarred", () => {
  const value = normalizeTodoPreferences({ categories: ["Study", "study", " Custom "], importantCategories: ["health", "Custom"] });
  assert.equal(value.categories.filter(item => item.toLowerCase() === "study").length, 1);
  assert.deepEqual(value.importantCategories, ["Health", "Bill & Payment", "Custom"]);
  assert.equal(value.importantCategories.includes("Work"), false);
  for (const values of [null, [""], ["x".repeat(81)], [42], Array(101).fill("a")]) assert.throws(() => normalizeTodoPreferences({ categories: values, importantCategories: [] }));
});

test("preference reads and writes are account scoped and schema validated", async t => {
  t.mock.method(User, "findById", id => { assert.equal(id, USER); return { select() { return this; }, lean: async () => ({ todoPreferences: { categories: ["My category"], importantCategories: ["My category"] } }) }; });
  assert.ok((await call(getTodoPreferences)).body.importantCategories.includes("My category"));
  t.mock.method(User, "findByIdAndUpdate", async (id, update, options) => {
    assert.equal(id, USER);
    assert.equal(options.runValidators, true);
    assert.deepEqual(update.$set.todoPreferences.importantCategories, ["Health", "Bill & Payment", "Personal"]);
    return {};
  });
  assert.equal((await call(saveTodoPreferences, req({ body: { categories: [], importantCategories: ["Personal"] } }))).status, 200);
});

test("invalid preferences are rejected before any account write", async t => {
  t.mock.method(User, "findByIdAndUpdate", async () => assert.fail("Invalid preferences must not save"));
  assert.equal((await call(saveTodoPreferences, req({ body: { categories: [], importantCategories: ["x".repeat(81)] } }))).status, 400);
});

test("todo summary publishes the same authoritative timezone and day as the header", async t => {
  clock(t);
  t.mock.method(Todo, "find", async filter => { assert.equal(filter.userId, USER); return []; });
  const result = await call(getTodoSummary);
  assert.equal(result.body.date, "2026-10-10");
  assert.equal(result.body.timezone, "Asia/Kolkata");
  assert.equal(result.body.serverNow, "2026-10-10T06:00:00.000Z");
});

test("important summary uses authenticated account preferences instead of another browser's categories", async t => {
  clock(t);
  t.mock.method(Todo, "find", async () => [task({ category: "Study" })]);
  const result = await call(getTodoSummary, req({ user: { id: USER, todoImportantCategories: ["Study"] }, query: { importantCategories: "Other account category" } }));
  assert.equal(result.body.importantToday, 1);
});
