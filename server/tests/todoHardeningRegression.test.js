import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import Todo from "../models/Todo.js";
import TodoLog from "../models/TodoLog.js";
import User from "../models/User.js";
import { createTodo, updateTodo, setTodoStatus, deleteTodo, restoreTodo, getTodoSummary, getTodoHeatmap, getTodos, getTodoLogs, createTodoLog, saveTodoPreferences } from "../controllers/todoController.js";
import { normalizeTodoPreferences } from "../utils/todoPreferencesUtils.js";
import { validTodo, validTodos, validTodoSummary, validTodoPreferences, validTodoLogs, validTodoStatusResponse, validTodoDeletion, todoFailureMessage } from "../../client/src/dashboard/todo/todoResponse.js";

const USER = "000000000000000000000001", ID = "000000000000000000000002", NOW = "2026-10-11T06:00:00.000Z", DAY = "2026-10-11";
const req = extra => ({ user: { id: USER }, params: { id: ID }, body: {}, query: {}, ...extra });
const clock = t => t.mock.timers.enable({ apis: ["Date"], now: Date.parse(NOW) });
async function call(handler, request = req()) { let status = 200, body; await handler(request, { status(value) { status = value; return this; }, json(value) { body = JSON.parse(JSON.stringify(value)); return this; } }); return { status, body }; }
const dto = extra => ({ id: ID, title: "Task", description: "Description", priority: "High", category: "Study", repeatType: "daily", startDate: DAY,
  date: null, endDate: null, time: "20:00", days: [], dayStates: [], updatedAt: NOW, ...extra });
const doc = extra => {
  const result = { ...dto(), _id: ID, userId: USER, startDate: new Date("2026-10-11T00:00:00+05:30"), updatedAt: new Date(NOW), save: async () => {}, ...extra };
  result.toObject = () => { const { save, toObject, $where, ...data } = result; void save; void toObject; void $where; return data; };
  return result;
};
const zeroSummary = () => ({ date: DAY, timezone: "Asia/Kolkata", serverNow: NOW, today: { total: 0, completed: 0, pending: 0, missed: 0 },
  thisWeek: { total: 0, completed: 0, pending: 0, missed: 0 }, lifetime: { total: 0, completed: 0, pending: 0, missed: 0 }, importantToday: 0,
  totalCompletedLifetime: 0, totalExpectedLifetime: 0, lifetimeConsistency: 0, fullCompletionStreakDays: 0 });

test("ToDo responses accept genuine empty accounts and all typed recurrence variants", () => {
  assert.equal(validTodos([]), true); assert.equal(validTodoSummary(zeroSummary()), true);
  for (const repeatType of ["daily", "weekdays", "weekend", "once"]) assert.equal(validTodo(dto({ repeatType, ...(repeatType === "once" ? { date: DAY } : {}) })), true);
  assert.equal(validTodoPreferences(normalizeTodoPreferences({ categories: [], importantCategories: [] })), true);
  assert.equal(validTodoLogs([]), true);
});
test("ToDo responses reject object-valued fields, invalid dates, duplicate IDs and malformed settings", () => {
  for (const extra of [{ title: {} }, { note: {} }, { category: {} }, { time: "25:00" }, { startDate: "2026-02-30" }, { dayStates: [null] },
    { dayStates: [{ dayKey: DAY, status: "completed" }, { dayKey: DAY, status: "pending" }] }, { pendingDays: ["Wrong"] }, { auditWarning: {} }, { updatedAt: {} }]) assert.equal(validTodo(dto(extra)), false);
  assert.equal(validTodos([dto(), dto()]), false); assert.equal(validTodos([null]), false);
  for (const invalid of [null, {}, { categories: [{}], importantCategories: [] }, { categories: ["Work", "work"], importantCategories: [] }]) assert.equal(validTodoPreferences(invalid), false);
  assert.equal(validTodoLogs([{ id: ID, title: {}, date: DAY, time: "20:00" }]), false);
  assert.equal(validTodoSummary({ ...zeroSummary(), today: null }), false);
  assert.equal(validTodoSummary({ ...zeroSummary(), timezone: "Invalid/Zone" }), false);
  assert.equal(validTodoSummary({ ...zeroSummary(), serverNow: "2026-10-12T06:00:00Z" }), false);
});
test("status and delete acknowledgements must match the selected task/day and contain safe warnings", () => {
  const saved = dto({ scheduled: true, status: "completed", dayStates: [{ dayKey: DAY, status: "completed", completedAt: "11:30" }] });
  assert.equal(validTodoStatusResponse(saved, ID, DAY, "completed"), true);
  assert.equal(validTodoStatusResponse(saved, ID, "2026-10-10", "completed"), false);
  assert.equal(validTodoStatusResponse(dto({ scheduled: true, status: "pending" }), ID, DAY, "completed"), false);
  assert.equal(validTodoStatusResponse(dto({ scheduled: true, status: "missed" }), ID, DAY, "pending"), true);
  const deleted = { todo: dto({ deletedAt: NOW }) };
  assert.equal(validTodoDeletion(deleted, ID), true); assert.equal(validTodoDeletion({ ...deleted, auditWarning: {} }, ID), false);
  assert.equal(todoFailureMessage({ response: { data: { message: {} } } }, "Safe error"), "Safe error");
});
test("explicit completed status remains idempotent as the clock passes its deadline", async t => {
  clock(t); const item = doc({ time: "10:00", dayStates: [{ dayKey: DAY, status: "completed", completedAt: "09:30", lateCompleted: false }], save() { assert.fail("already-completed state must not be rewritten"); } });
  t.mock.method(Todo, "findOne", async () => item);
  for (const completedAt of ["", "11:00"]) {
    const result = await call(setTodoStatus, req({ body: { date: DAY, status: "completed", completedAt } }));
    assert.equal(result.status, 200); assert.equal(result.body.completedAt, "09:30"); assert.equal(result.body.lateCompleted, false);
  }
});
test("future pending and missed states are rejected as well as future completion", async t => {
  clock(t); t.mock.method(Todo, "findOne", async filter => { assert.equal(filter.deletedAt, null); return doc({ save() { assert.fail("future state write"); } }); });
  for (const status of ["pending", "missed", "completed"]) assert.equal((await call(setTodoStatus, req({ body: { date: "2026-10-12", status } }))).status, 400);
});
test("invalid weekdays, status types and boolean settings never reach persistence", async t => {
  clock(t); t.mock.method(Todo, "create", () => assert.fail("invalid task cannot persist"));
  for (const extra of [{ days: ["Invalid"] }, { days: [{}] }, { neverEnds: "false" }]) assert.equal((await call(createTodo, req({ body: { title: "Task", repeatType: "daily", startDate: "2026-10-12", time: "20:00", ...extra } }))).status, 400);
  t.mock.method(Todo, "findOne", async () => doc({ save() { assert.fail("invalid status cannot persist"); } }));
  assert.equal((await call(setTodoStatus, req({ body: { date: DAY, status: ["completed"] } }))).status, 400);
});
test("editing a future schedule cannot backdate it or move it to an elapsed time", async t => {
  clock(t); t.mock.method(TodoLog, "create", () => assert.fail("invalid edit cannot log"));
  for (const repeatType of ["once", "daily"]) {
    t.mock.method(Todo, "findOne", async () => doc({ repeatType, startDate: new Date("2026-10-12T00:00:00+05:30"), date: repeatType === "once" ? new Date("2026-10-12T00:00:00+05:30") : null, save() { assert.fail("invalid reschedule cannot persist"); } }));
    for (const [date, time] of [["2026-10-10", "20:00"], [DAY, "09:00"]]) {
      const result = await call(updateTodo, req({ body: { title: "Task", repeatType, time, [repeatType === "once" ? "date" : "startDate"]: date } }));
      assert.equal(result.status, 400); assert.match(result.body.message, /Rescheduled/);
    }
  }
});
for (const handler of [updateTodo, setTodoStatus, deleteTodo, restoreTodo]) {
  test(`${handler.name} rejects stale revisions and another account's record`, async t => {
    clock(t); t.mock.method(Todo, "findOne", async filter => { assert.equal(filter.userId, USER); return doc({ deletedAt: handler === restoreTodo ? new Date(NOW) : null, save() { assert.fail("stale write"); } }); });
    assert.equal((await call(handler, req({ body: { expectedUpdatedAt: "2026-10-11T05:00:00Z" } }))).status, 409);
    assert.equal((await call(handler, req({ body: { expectedUpdatedAt: {} } }))).status, 400);
    t.mock.method(Todo, "findOne", async () => null);
    assert.equal((await call(handler)).status, 404);
  });
}
test("real Mongoose save uses atomic owner/revision filters and a monotonically increasing timestamp", async t => {
  clock(t); const item = Todo.hydrate({ _id: ID, userId: USER, title: "Task", category: "Study", priority: "High", repeatType: "daily",
    startDate: new Date("2026-10-11T00:00:00+05:30"), time: "20:00", updatedAt: new Date(NOW), createdAt: new Date(NOW), dayStates: [], days: [], __v: 0 });
  t.mock.method(Todo, "findOne", async () => item);
  let writes = 0;
  t.mock.method(Todo.collection, "updateOne", async (filter, update) => {
    writes++; assert.ok(filter.userId instanceof mongoose.Types.ObjectId); assert.equal(String(filter.userId), USER);
    assert.equal(filter.updatedAt.toISOString(), NOW); assert.equal(String(filter._id), ID);
    assert.ok(update.$set.updatedAt.getTime() > Date.parse(NOW)); return { acknowledged: true, matchedCount: 1, modifiedCount: 1 };
  });
  const result = await call(setTodoStatus, req({ body: { date: DAY, status: "completed", expectedUpdatedAt: NOW } }));
  assert.equal(result.status, 200); assert.equal(writes, 1); assert.equal(validTodo(result.body), true);
});
test("atomic no-match and database failures return safe conflict/unconfirmed responses", async t => {
  clock(t); t.mock.method(Todo, "findOne", async () => doc({ save() { throw Object.assign(new Error("private DB details"), { name: "DocumentNotFoundError" }); } }));
  const conflict = await call(setTodoStatus, req({ body: { date: DAY, status: "completed", expectedUpdatedAt: NOW } }));
  assert.equal(conflict.status, 409); assert.doesNotMatch(conflict.body.message, /private/);
  t.mock.method(Todo, "findOne", async () => { throw new Error("private DB details"); });
  const unavailable = await call(setTodoStatus, req({ body: { date: DAY, status: "completed" } }));
  assert.equal(unavailable.status, 503); assert.doesNotMatch(unavailable.body.message, /private/);
});
test("preference limits include defaults and remain round-trip safe", () => {
  const prefs = normalizeTodoPreferences({ categories: Array.from({ length: 92 }, (_, index) => `Custom ${index}`), importantCategories: [] });
  assert.equal(prefs.categories.length, 100); assert.deepEqual(normalizeTodoPreferences(prefs), prefs);
  assert.throws(() => normalizeTodoPreferences({ categories: Array.from({ length: 93 }, (_, index) => `Custom ${index}`), importantCategories: [] }));
});
test("empty Todo summary and task responses satisfy the client contract", async t => {
  clock(t); t.mock.method(Todo, "find", () => ({ then: resolve => resolve([]), sort: async () => [] }));
  assert.equal(validTodoSummary((await call(getTodoSummary)).body), true); assert.equal(validTodos((await call(getTodos)).body), true);
});
test("log limits are bounded positive integers, before any database query", async t => {
  t.mock.method(TodoLog, "find", () => assert.fail("Invalid limits must not query"));
  for (const limit of ["0", "-1", "1.5", "bad", "", {}]) assert.equal((await call(getTodoLogs, req({ query: { limit } }))).status, 400);
});
test("manual log writes validate fields and cannot reference another account's task", async t => {
  const body = { title: "Task", date: DAY, time: "20:00", todoId: ID };
  t.mock.method(TodoLog, "create", () => assert.fail("Invalid logs must not persist"));
  for (const extra of [{ date: "2026-02-30" }, { date: [DAY] }, { time: "25:00" }, { action: {} }, { todoId: {} }]) assert.equal((await call(createTodoLog, req({ body: { ...body, ...extra } }))).status, 400);
  t.mock.method(Todo, "findOne", async filter => { assert.equal(filter.userId, USER); assert.equal(filter._id, ID); return null; });
  assert.equal((await call(createTodoLog, req({ body }))).status, 404);
});
test("preference persistence errors never disclose database details", async t => {
  t.mock.method(User, "findByIdAndUpdate", async () => { throw new Error("private DB details"); });
  const result = await call(saveTodoPreferences, req({ body: { categories: [], importantCategories: [] } }));
  assert.equal(result.status, 503); assert.doesNotMatch(result.body.message, /private/);
});
test("read endpoints project due schedule edits without any writes or changing stored revisions", async t => {
  clock(t);
  const item = doc({ time: "08:00", pendingTime: "20:00", timeChangeEffectiveFrom: new Date("2026-10-11T00:00:00+05:30"),
    save() { assert.fail("A GET must not persist deferred changes"); } });
  t.mock.method(Todo, "find", () => ({ then: resolve => resolve([item]), sort: async () => [item], select: async () => [item] }));
  const tasks = await call(getTodos, req({ query: { date: DAY } }));
  assert.equal(tasks.status, 200); assert.equal(tasks.body[0].time, "20:00"); assert.equal(tasks.body[0].status, "pending");
  const summary = await call(getTodoSummary); assert.equal(summary.status, 200); assert.equal(summary.body.today.pending, 1); assert.equal(summary.body.today.missed, 0);
  const heatmap = await call(getTodoHeatmap); assert.equal(heatmap.status, 200);
  assert.equal(item.time, "08:00"); assert.equal(item.pendingTime, "20:00"); assert.equal(item.updatedAt.toISOString(), NOW);
});
test("invalid writes cannot materialize due schedule edits in the database", async t => {
  clock(t);
  t.mock.method(Todo, "findOne", async () => doc({ pendingTime: "21:00", timeChangeEffectiveFrom: new Date("2026-10-11T00:00:00+05:30"),
    save() { assert.fail("A rejected mutation cannot persist deferred fields"); } }));
  assert.equal((await call(setTodoStatus, req({ body: { date: DAY, status: {} } }))).status, 400);
  assert.equal((await call(updateTodo, req({ body: { title: {} } }))).status, 400);
});
test("due weekday changes remain calendar-aware and read-only across past and future dates", async t => {
  clock(t);
  const item = doc({ repeatType: "weekdays", startDate: new Date("2026-10-01T00:00:00+05:30"), days: ["Sat", "Sun"], pendingDays: ["Mon", "Tue"],
    daysChangeEffectiveFrom: new Date("2026-10-11T00:00:00+05:30"), save() { assert.fail("A GET cannot save"); } });
  t.mock.method(Todo, "find", () => ({ sort: async () => [item] }));
  for (const [date, expected] of [["2026-10-10", 1], [DAY, 0], ["2026-10-12", 1]]) {
    const result = await call(getTodos, req({ query: { date } })); assert.equal(result.status, 200); assert.equal(result.body.length, expected);
  }
  assert.deepEqual(item.days, ["Sat", "Sun"]); assert.deepEqual(item.pendingDays, ["Mon", "Tue"]);
});
test("two competing Mongoose writes can only save one version of a task", async t => {
  clock(t);
  const stored = { _id: ID, userId: USER, title: "Task", category: "Study", priority: "High", repeatType: "daily",
    startDate: new Date("2026-10-11T00:00:00+05:30"), time: "20:00", updatedAt: new Date(NOW), createdAt: new Date(NOW), dayStates: [], days: [], __v: 0 };
  t.mock.method(Todo, "findOne", async () => Todo.hydrate(stored));
  let revision = Date.parse(NOW), accepted = 0;
  t.mock.method(Todo.collection, "updateOne", async (filter, update) => {
    if (filter.updatedAt.getTime() !== revision) return { acknowledged: true, matchedCount: 0, modifiedCount: 0 };
    revision = update.$set.updatedAt.getTime(); accepted++; return { acknowledged: true, matchedCount: 1, modifiedCount: 1 };
  });
  const results = await Promise.all([1, 2].map(() => call(setTodoStatus, req({ body: { date: DAY, status: "completed", expectedUpdatedAt: NOW } }))));
  assert.equal(accepted, 1); assert.deepEqual(results.map(result => result.status).sort(), [200, 409]);
});
