import test from "node:test";
import assert from "node:assert/strict";
import Goal from "../models/Goal.js";
import GoalProgressLog from "../models/GoalProgressLog.js";
import { updateGoalSubgoalProgress, deleteGoalSubgoal, updateGoalProgress, toggleGoalImportant, getGoalSummary, restoreGoal } from "../controllers/goalController.js";
import { APP_TIMEZONE } from "../config/runtime.js";
import { readFileSync } from "node:fs";
import { goalDayKey, goalDaysLeft, normalizeGoal, shiftGoalDay, addGoalMonths, buildDemoGoals, formatGoalTime } from "../../client/src/dashboard/goal/goalUtils.js";

// This existing .jsx file contains only data; Node does not load that extension.
const sampleSource = readFileSync(new URL("../../client/data/GoalDummyData.jsx", import.meta.url), "utf8");
const { GOALS } = await import(`data:text/javascript;base64,${Buffer.from(sampleSource).toString("base64")}`);

const USER = "000000000000000000000001", ID = "000000000000000000000002", SUB = "000000000000000000000003";
const req = extra => ({ user: { id: USER }, body: {}, query: {}, params: { id: ID, subgoalId: SUB }, ...extra });
const freeze = t => t.mock.timers.enable({ apis: ["Date"], now: Date.parse("2026-10-10T06:00:00Z") });
async function call(handler, request = req()) {
  let status = 200, body;
  await handler(request, { status(value) { status = value; return this; }, json(value) { body = value; return this; } });
  return { status, body };
}
function fixture(t, extra = {}) {
  const goal = new Goal({ _id: ID, userId: USER, title: "My goal", startDate: "2026-10-01", deadline: "2027-01-01", subgoals: [{ _id: SUB, title: "Only milestone", deadline: "2026-12-01" }], ...extra });
  let saves = 0;
  t.mock.method(goal, "save", async () => { saves += 1; return goal; });
  t.mock.method(Goal, "findOne", async filter => { assert.equal(String(filter.userId), USER); return goal; });
  return { goal, saves: () => saves };
}

test("Goal day keys preserve date-only values and convert app-midnight timestamps", () => {
  assert.equal(goalDayKey("2026-10-09T18:30:00Z"), "2026-10-10");
  assert.equal(goalDayKey("2026-10-10", "America/Los_Angeles"), "2026-10-10");
  assert.equal(goalDayKey("2026-10-09T18:30:00Z", "America/Los_Angeles"), "2026-10-09");
  assert.equal(goalDayKey("2026-02-30"), "");
  assert.equal(goalDayKey("invalid"), "");
});

test("Goal calendar arithmetic is DST safe and handles leap days and missing deadlines", () => {
  assert.equal(goalDaysLeft("2026-03-09", "2026-03-08"), 1);
  assert.equal(goalDaysLeft("2026-11-02", "2026-11-01"), 1);
  assert.equal(goalDaysLeft("", "2026-10-10"), null);
  assert.equal(shiftGoalDay("2028-02-28", 1), "2028-02-29");
  assert.equal(addGoalMonths("2026-10-10", 3), "2027-01-10");
  assert.equal(formatGoalTime("02:30"), "2:30 AM");
});

test("Goal deadlines remain active on the final app day and recalculate after rollover", () => {
  const item = { _id: ID, title: "Final day", status: "Active", deadline: "2026-10-09T18:30:00Z" };
  assert.equal(normalizeGoal(item, APP_TIMEZONE, "2026-10-10").status, "Active");
  assert.equal(normalizeGoal(item, APP_TIMEZONE, "2026-10-11").status, "Archived");
  assert.equal(normalizeGoal({ ...item, deadline: null }, APP_TIMEZONE, "2026-10-11").status, "Active");
  assert.equal(normalizeGoal({ ...item, deletedAt: new Date() }, APP_TIMEZONE, "2026-10-10").archiveReason, "deleted");
});

test("All Goal demo tabs share the same records, milestones and deadline-derived statuses", () => {
  const goals = buildDemoGoals(GOALS, "2026-10-10");
  assert.equal(goals.length, GOALS.length);
  assert.equal(new Set(goals.map(goal => goal.id)).size, goals.length);
  assert.ok(goals.every(goal => goal.startDate <= goal.deadline));
  assert.ok(goals.every(goal => goal.milestones.every(milestone => milestone.deadline >= goal.startDate && milestone.deadline <= goal.deadline)));
  assert.equal(goals.find(goal => goal.id === "web-dev").status, "Archived");
  assert.equal(goals.find(goal => goal.id === "gate-2027").isImportant, true);
  assert.ok(goals.every(goal => goal.milestones.length === GOALS.find(source => source.id === goal.id).milestones.length));
});

test("Subgoal completion reports success with a warning when secondary audit logging fails", async t => {
  freeze(t);
  const { goal, saves } = fixture(t);
  t.mock.method(GoalProgressLog, "create", async () => { throw new Error("Unavailable audit collection"); });
  const result = await call(updateGoalSubgoalProgress, req({ body: { completed: true } }));
  assert.equal(result.status, 200);
  assert.equal(saves(), 1);
  assert.equal(goal.subgoals[0].completed, true);
  assert.match(result.body.warning, /saved/);
  assert.equal(result.body.subgoalProgress.completionPercentage, 100);
});

test("All milestones completed agree with the summary and completion log despite default target 100", async t => {
  freeze(t);
  const { goal } = fixture(t);
  const logs = [];
  t.mock.method(GoalProgressLog, "create", async payload => { logs.push(payload); return payload; });
  await call(updateGoalSubgoalProgress, req({ body: { completed: true } }));
  assert.equal(goal.targetValue, 100);
  assert.equal(logs[0].completedGoal, true);
  t.mock.method(Goal, "find", async filter => { assert.equal(filter.userId, USER); return [goal]; });
  const summary = await call(getGoalSummary);
  assert.equal(summary.body.completedGoals, 1);
  assert.equal(summary.body.timezone, APP_TIMEZONE);
  assert.equal(summary.body.date, "2026-10-10");
  assert.equal(summary.body.serverNow, "2026-10-10T06:00:00.000Z");
});

test("Explicit milestone completion is idempotent and rejects invalid boolean input", async t => {
  const { saves } = fixture(t);
  const logs = [];
  t.mock.method(GoalProgressLog, "create", async payload => logs.push(payload));
  await call(updateGoalSubgoalProgress, req({ body: { completed: true } }));
  await call(updateGoalSubgoalProgress, req({ body: { completed: true } }));
  assert.equal(saves(), 1);
  assert.equal(logs.length, 1);
  assert.equal((await call(updateGoalSubgoalProgress, req({ body: { completed: "true" } }))).status, 400);
  assert.equal(saves(), 1);
});

test("Undo and re-complete log only genuine completion transitions", async t => {
  fixture(t);
  const logs = [];
  t.mock.method(GoalProgressLog, "create", async payload => logs.push(payload));
  for (const completed of [true, false, true]) await call(updateGoalSubgoalProgress, req({ body: { completed } }));
  assert.deepEqual(logs.map(log => log.completedGoal), [true, false, true]);
});

test("Deleting a subgoal still returns its saved canonical record when audit logging fails", async t => {
  const { saves } = fixture(t, { currentValue: 1, subgoals: [{ _id: SUB, title: "Completed", deadline: "2026-12-01", completed: true }] });
  t.mock.method(GoalProgressLog, "create", async () => { throw new Error("Audit failed"); });
  const result = await call(deleteGoalSubgoal);
  assert.equal(result.status, 200);
  assert.equal(saves(), 1);
  assert.equal(result.body.milestones.length, 0);
  assert.match(result.body.warning, /saved/);
});

test("Numeric goal progress also survives a secondary audit failure", async t => {
  fixture(t, { subgoals: [] });
  t.mock.method(GoalProgressLog, "create", async () => { throw new Error("Audit failed"); });
  const result = await call(updateGoalProgress, req({ body: { currentValue: 100 } }));
  assert.equal(result.status, 200);
  assert.equal(result.body.currentValue, 100);
  assert.match(result.body.warning, /saved/);
});

test("Explicit important updates are idempotent, validated and account scoped", async t => {
  const { saves } = fixture(t);
  await call(toggleGoalImportant, req({ body: { isImportant: true } }));
  await call(toggleGoalImportant, req({ body: { isImportant: true } }));
  assert.equal(saves(), 1);
  assert.equal((await call(toggleGoalImportant, req({ body: { isImportant: "yes" } }))).status, 400);
  assert.equal(saves(), 1);
});

test("Goal restore enforces the 48-hour window even if the browser clock is stale", async t => {
  freeze(t);
  const { saves } = fixture(t, { deletedAt: new Date("2026-10-08T05:59:59Z"), archivedReason: "deleted" });
  assert.equal((await call(restoreGoal)).status, 410);
  assert.equal(saves(), 0);
});
