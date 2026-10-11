import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import Goal from "../models/Goal.js";
import GoalProgressLog from "../models/GoalProgressLog.js";
import { createGoal, getGoals, getGoalLogs, getGoalSummary, getGoalHeatmap, updateGoal, updateGoalProgress, addGoalSubgoal, updateGoalSubgoalProgress, deleteGoalSubgoal, toggleGoalImportant, deleteGoal, restoreGoal } from "../controllers/goalController.js";
import { validGoal, validGoals, validGoalSummary, validGoalLogs, validGoalConfirmation, goalFailureMessage } from "../../client/src/dashboard/goal/goalResponse.js";
import { normalizeGoal } from "../../client/src/dashboard/goal/goalUtils.js";

const USER = "000000000000000000000001", ID = "000000000000000000000002", SUB = "000000000000000000000003";
const NOW = "2026-10-11T06:00:00.000Z", DAY = "2026-10-11";
const request = extra => ({ user: { id: USER }, body: {}, query: {}, params: { id: ID, subgoalId: SUB }, ...extra });
const freeze = t => t.mock.timers.enable({ apis: ["Date"], now: Date.parse(NOW) });
const dto = extra => ({ _id: ID, title: "Goal", description: "Purpose", goalType: "short-term", priority: "High", targetValue: 100, currentValue: 0, isImportant: false,
  startDate: DAY, deadline: "2026-11-11", status: "Active", archiveReason: null, deletedAt: null, createdAt: NOW, updatedAt: NOW,
  milestones: [], subgoals: [], activityLogs: [], subgoalProgress: { total: 0, completed: 0, pending: 0, completionPercentage: 0 }, ...extra });
const doc = extra => Goal.hydrate({ ...dto(), userId: USER, __v: 0, startDate: new Date("2026-10-11T00:00:00+05:30"), ...extra });
async function call(handler, req = request()) {
  let status = 200, body;
  await handler(req, { status(n) { status = n; return this; }, json(value) { body = JSON.parse(JSON.stringify(value)); return this; } });
  return { status, body };
}

test("goal response contracts reject malformed render values and accept real empty snapshots", () => {
  assert.equal(validGoal(dto()), true); assert.equal(validGoals([]), true); assert.equal(validGoalLogs([]), true);
  for (const extra of [{ title: {} }, { description: {} }, { deadline: "2026-02-30" }, { priority: {} }, { isImportant: "false" }, { currentValue: true }, { warning: {} }, { milestones: [{}] }, { activityLogs: [{ action: "created", title: {}, at: NOW }] }, { subgoalProgress: { total: 1, completed: 0, pending: 1, completionPercentage: 0 } }]) assert.equal(validGoal(dto(extra)), false);
  assert.equal(validGoals([dto(), dto()]), false);
  assert.equal(validGoalLogs([{ id: SUB, goalId: ID, title: {}, action: "created", at: NOW, date: DAY, time: "11:30" }]), false);
  assert.equal(goalFailureMessage({ response: { data: { message: {} } } }, "Safe"), "Safe");
});
test("save confirmations match the goal, deletion state, important value and changed milestone", () => {
  assert.equal(validGoalConfirmation(dto(), "patch", `/goals/${ID}`, { title: "Goal" }), true);
  assert.equal(validGoalConfirmation(dto(), "patch", `/goals/${USER}`, {}), false);
  assert.equal(validGoalConfirmation(dto(), "patch", `/goals/${ID}/important`, { isImportant: true }), false);
  assert.equal(validGoalConfirmation({ goal: dto({ deletedAt: NOW }) }, "delete", `/goals/${ID}`), true);
  assert.equal(validGoalConfirmation(dto(), "delete", `/goals/${ID}`), false);
  assert.equal(validGoalConfirmation(dto(), "post", "/goals", {}, [dto()]), false);
  assert.equal(validGoalConfirmation(dto(), "post", `/goals/${ID}/subgoals`, { title: "Milestone", deadline: DAY }, [dto()]), false);
  assert.equal(validGoalConfirmation(dto(), "patch", `/goals/${ID}/subgoals/${SUB}/progress`, { completed: true }), false);
});
test("legacy goal editors use the retained creation day when startDate is absent", () => {
  assert.equal(normalizeGoal(dto({ startDate: null }), "Asia/Kolkata", DAY).startDate, DAY);
});
test("adding a milestone retains numeric progress changes without false save failures", async t => {
  freeze(t); const goal = doc({ currentValue: 100 });
  t.mock.method(Goal, "findOne", async () => goal); t.mock.method(goal, "save", async () => goal);
  let audit; t.mock.method(GoalProgressLog, "create", async value => { audit = value; throw new Error("private"); });
  const result = await call(addGoalSubgoal, request({ body: { title: "Next milestone", deadline: "2026-10-20" } }));
  assert.equal(result.status, 201); assert.equal(audit.delta, -100); assert.equal(audit.completedGoal, false);
  assert.equal(result.body.currentValue, 0); assert.match(result.body.warning, /saved/);
});
test("creation validates text, numbers and calendar windows before persisting", async t => {
  freeze(t); t.mock.method(Goal, "create", () => assert.fail("Invalid creation must not persist"));
  for (const extra of [{ title: "x".repeat(181) }, { description: "x".repeat(2501) }, { targetValue: true }, { currentValue: [1] }, { targetValue: " " }, { targetValue: Number.MAX_SAFE_INTEGER + 1 }, { startDate: "2026-10-10" }, { startDate: "2026-02-30" }, { startDate: "2026-02-30T06:00:00Z" }, { startDate: null, deadline: "2026-10-12" }]) {
    assert.equal((await call(createGoal, request({ body: { title: "Goal", deadline: "2026-11-11", ...extra } }))).status, 400);
  }
});
test("null creation start dates cannot bypass minimum duration validation", async t => {
  freeze(t); t.mock.method(Goal, "create", async value => doc(value));
  const result = await call(createGoal, request({ body: { title: "Goal", startDate: null, deadline: "2026-10-18" } }));
  assert.equal(result.status, 201); assert.equal(validGoal(result.body), true);
  assert.equal(result.body.startDate, "2026-10-10T18:30:00.000Z");
});
const writes = [
  [updateGoal, { title: "Edited" }], [updateGoalProgress, { currentValue: 40 }], [addGoalSubgoal, { title: "Milestone", deadline: "2026-10-20" }],
  [updateGoalSubgoalProgress, { completed: true }], [deleteGoalSubgoal, {}], [toggleGoalImportant, { isImportant: true }], [deleteGoal, {}], [restoreGoal, {}],
];
for (const [handler, body] of writes) test(`${handler.name} rejects stale or malformed revisions and other accounts`, async t => {
  freeze(t); const goal = doc({ deletedAt: handler === restoreGoal ? new Date(NOW) : null, archivedReason: handler === restoreGoal ? "deleted" : null,
    subgoals: [{ _id: SUB, title: "Milestone", deadline: new Date("2026-10-20") }] });
  t.mock.method(goal, "save", () => assert.fail("A conflict must not save"));
  t.mock.method(Goal, "findOne", async filter => { assert.equal(String(filter.userId), USER); return goal; });
  assert.equal((await call(handler, request({ body: { ...body, expectedUpdatedAt: "2026-10-11T05:00:00Z" } }))).status, 409);
  assert.equal((await call(handler, request({ body: { ...body, expectedUpdatedAt: {} } }))).status, 400);
  t.mock.method(Goal, "findOne", async () => null); assert.equal((await call(handler, request({ body }))).status, 404);
});
test("real Mongoose saves atomically include owner and revision and detect concurrent writes", async t => {
  freeze(t); t.mock.method(Goal, "findOne", async () => doc());
  t.mock.method(Goal.collection, "updateOne", async (filter, update) => {
    assert.ok(filter.userId instanceof mongoose.Types.ObjectId); assert.equal(String(filter.userId), USER); assert.equal(filter.updatedAt.toISOString(), NOW);
    assert.ok(update.$set.updatedAt.getTime() > Date.parse(NOW)); return { acknowledged: true, matchedCount: 1, modifiedCount: 1 };
  });
  const result = await call(updateGoal, request({ body: { title: "Edited", expectedUpdatedAt: NOW } })); assert.equal(result.status, 200); assert.equal(validGoal(result.body), true);
  t.mock.method(Goal.collection, "updateOne", async () => ({ acknowledged: true, matchedCount: 0, modifiedCount: 0 }));
  assert.equal((await call(updateGoal, request({ body: { title: "Edited", expectedUpdatedAt: NOW } }))).status, 409);
});
test("goal GETs never save ended logs or otherwise mutate retained records", async t => {
  freeze(t); const goal = doc({ deadline: new Date("2026-10-10"), activityLogs: [] });
  t.mock.method(goal, "save", () => assert.fail("A read must not save"));
  t.mock.method(Goal, "find", () => ({ sort: async () => [goal], then: resolve => resolve([goal]) }));
  t.mock.method(Goal, "aggregate", async () => []);
  const list = await call(getGoals); assert.equal(list.status, 200); assert.equal(list.body[0].status, "Archived"); assert.equal(validGoals(list.body), true);
  assert.equal((await call(getGoalLogs)).status, 200); assert.equal((await call(getGoalHeatmap)).status, 200);
  const summary = await call(getGoalSummary); assert.equal(summary.status, 200); assert.equal(validGoalSummary(summary.body), true); assert.equal(goal.activityLogs.length, 0);
});
test("goal updates cannot clear started dates or strand existing milestone deadlines", async t => {
  freeze(t); const goal = doc({ subgoals: [{ _id: SUB, title: "Milestone", deadline: new Date("2026-11-10") }] });
  t.mock.method(Goal, "findOne", async () => goal); t.mock.method(goal, "save", () => assert.fail("Invalid edit must not save"));
  for (const body of [{ startDate: null }, { deadline: null }, { deadline: "2026-10-20" }, { currentValue: 50 }, { targetValue: 2 }]) assert.equal((await call(updateGoal, request({ body }))).status, 400);
});
test("numeric progress validates dates and cannot overwrite milestone-derived progress", async t => {
  freeze(t); const goal = doc({ subgoals: [{ _id: SUB, title: "Milestone", deadline: new Date("2026-10-20") }] });
  t.mock.method(Goal, "findOne", async () => goal); t.mock.method(goal, "save", () => assert.fail("Invalid progress must not save"));
  for (const body of [{ currentValue: 20 }, { currentValue: true }, { currentValue: [20] }, { currentValue: 20, date: "2026-10-12" }, { currentValue: 20, date: "2026-02-30" }]) assert.equal((await call(updateGoalProgress, request({ body }))).status, 400);
});
test("numeric edits retain progress audit events without falsely failing a successful save", async t => {
  freeze(t); const goal = doc(); t.mock.method(goal, "save", async () => goal); t.mock.method(Goal, "findOne", async () => goal);
  let audit; t.mock.method(GoalProgressLog, "create", async value => { audit = value; throw new Error("private details"); });
  const result = await call(updateGoal, request({ body: { currentValue: 100, expectedUpdatedAt: NOW } }));
  assert.equal(result.status, 200); assert.equal(audit.completedGoal, true); assert.equal(audit.delta, 100); assert.match(result.body.warning, /saved/);
});
test("repeated soft deletion preserves its original restore deadline", async t => {
  freeze(t); const goal = doc({ deletedAt: new Date("2026-10-10T06:00:00Z"), archivedReason: "deleted" });
  t.mock.method(Goal, "findOne", async () => goal); t.mock.method(goal, "save", () => assert.fail("Already deleted"));
  const result = await call(deleteGoal); assert.equal(result.status, 200); assert.equal(result.body.deleteUndoExpiresAt, "2026-10-12T06:00:00.000Z");
});
test("malformed year filters and private database errors fail safely", async t => {
  for (const year of ["2026x", "2026.5", ["2026"], "1e3", "3001"]) assert.equal((await call(getGoalHeatmap, request({ query: { year } }))).status, 400);
  t.mock.method(Goal, "findOne", async () => { throw new Error("private connection details"); });
  const result = await call(updateGoal); assert.equal(result.status, 503); assert.doesNotMatch(result.body.message, /private/);
});
