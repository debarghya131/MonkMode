import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import User from "../models/User.js";
import WorkoutPlan from "../models/WorkoutPlan.js";
import GymDietPlan from "../models/GymDietPlan.js";
import GymExerciseProgress from "../models/GymExerciseProgress.js";
import { getGymClock, createWorkoutPlan, updateWorkoutPlan, toggleWorkoutPlanActive, createGymDietPlan, updateGymDietPlan, toggleGymDietPlanActive, copyGymDietPlanToDay, upsertExerciseProgress, getExerciseProgress } from "../controllers/gymController.js";
import { validGymDay, requestedGymActive } from "../utils/gymMutationUtils.js";
import { gymDay, gymWeekday, gymStorageKey, workoutOnDay } from "../../client/src/dashboard/gym/gymUtils.js";

const USER = "000000000000000000000001", ID = "000000000000000000000002", OTHER = "000000000000000000000003";
const req = extra => ({ user: { id: USER }, params: { id: ID }, query: {}, body: {}, ...extra });
async function call(handler, request = req()) {
  let status = 200, body;
  await handler(request, { status(value) { status = value; return this; }, json(value) { body = value; return this; } });
  return { status, body };
}
const freeze = t => t.mock.timers.enable({ apis: ["Date"], now: Date.parse("2026-10-10T06:00:00Z") });
const workout = extra => ({ _id: ID, userId: USER, title: "Strength", days: ["Sat"], startDate: "2026-10-01", neverEnds: true, endDate: "", exercises: [{ id: "bench", name: "Bench" }], isActive: false, ...extra });
const diet = extra => ({ _id: ID, userId: USER, planType: "macros", day: "Sat", values: { calories: "2000" }, isActive: false, ...extra });

// This fixture models commit/rollback in memory. No connection or database write
// is made; every query/write asserts the authenticated owner and session.
function transactionFixture(t, Model, records) {
  let committed = structuredClone(records), draft = null, fences = 0;
  const session = { fixture: true };
  const matches = (doc, filter) => Object.entries(filter).every(([key, value]) => {
    if (key === "$or") return value.some(branch => matches(doc, branch));
    if (key === "_id" && value?.$ne) return doc._id !== value.$ne;
    if (key === "days" && value?.$in) return doc.days.some(day => value.$in.includes(day));
    if (key === "days") return doc.days.includes(value);
    return doc[key] === value;
  });
  const own = filter => assert.equal(filter.userId, USER);
  const attach = doc => doc && Object.assign(doc, { save: async options => assert.equal(options.session, session) });
  const query = value => ({ session(valueSession) { assert.equal(valueSession, session); return this; }, sort() { return this; }, then(resolve, reject) { return Promise.resolve(value).then(resolve, reject); } });
  t.mock.method(mongoose.connection, "transaction", async task => {
    draft = structuredClone(committed);
    try {
      const result = await task(session);
      committed = JSON.parse(JSON.stringify(draft));
      return result;
    } finally { draft = null; }
  });
  t.mock.method(User, "updateOne", async (filter, update, options) => {
    assert.deepEqual(filter, { _id: USER }); assert.equal(options.session, session);
    assert.equal(update.$inc.gymMutationVersion, 1); fences++;
    return { matchedCount: 1 };
  });
  t.mock.method(Model, "findOne", filter => { own(filter); return query(attach(draft.find(doc => matches(doc, filter)) || null)); });
  t.mock.method(Model, "find", filter => { own(filter); return query(draft.filter(doc => matches(doc, filter))); });
  t.mock.method(Model, "updateMany", async (filter, update, options) => {
    own(filter); assert.equal(options.session, session);
    draft.filter(doc => matches(doc, filter)).forEach(doc => Object.assign(doc, update.$set));
  });
  t.mock.method(Model, "create", async (payloads, options) => {
    assert.equal(options.session, session);
    return payloads.map(payload => { assert.equal(payload.userId, USER); const doc = { _id: OTHER, ...payload }; draft.push(doc); return doc; });
  });
  return { records: () => committed, fences: () => fences, session };
}

test("Gym calendar dates are timezone-aware and invalid calendar dates are rejected", () => {
  assert.equal(gymDay("2026-10-09T18:45:00Z"), "2026-10-10");
  assert.equal(gymDay("2026-10-10T06:00:00Z", "America/Los_Angeles"), "2026-10-09");
  assert.equal(gymWeekday("2026-10-10"), "Sat");
  for (const value of ["2026-02-30", "2026-13-01", "2026-04-31", "nonsense"]) {
    assert.equal(validGymDay(value), false); assert.equal(gymDay(value.match(/^\d{4}-/) ? value : "2026-02-30"), "");
  }
  assert.equal(validGymDay("2028-02-29"), true);
});

test("Gym clock metadata is authoritative without depending on measurements or plan reads", async t => {
  freeze(t);
  const result = await call(getGymClock);
  assert.equal(result.status, 200);
  assert.deepEqual(result.body, { date: "2026-10-10", day: "Sat", timezone: "Asia/Kolkata", serverNow: "2026-10-10T06:00:00.000Z" });
});

test("Today excludes future starts and includes the final scheduled day", () => {
  assert.equal(workoutOnDay(workout({ isActive: true, startDate: "2026-10-17" }), "2026-10-10"), false);
  assert.equal(workoutOnDay(workout({ isActive: true, neverEnds: false, endDate: "2026-10-10" }), "2026-10-10"), true);
  assert.equal(workoutOnDay(workout({ isActive: true, neverEnds: false, endDate: "2026-10-09" }), "2026-10-10"), false);
  assert.notEqual(gymStorageKey("account-a", "diet-draft"), gymStorageKey("account-b", "diet-draft"));
  assert.notEqual(gymStorageKey("account-a", "diet-draft"), "monkmode_gym_diet_draft_cache_v1");
});

test("Explicit activation is idempotent while legacy toggles remain compatible", () => {
  assert.equal(requestedGymActive({ isActive: true }, true), true);
  assert.equal(requestedGymActive({}, true), false);
  assert.throws(() => requestedGymActive({ isActive: "false" }, true), /boolean/);
});

test("Invalid workout dates and boolean input are rejected before creating plans", async t => {
  t.mock.method(WorkoutPlan, "create", async () => assert.fail("No write for invalid input"));
  for (const body of [{ title: "Bad", days: ["Sat"], startDate: "2026-02-30" }, { title: "Bad", days: ["Sat"], neverEnds: "false" }]) {
    assert.equal((await call(createWorkoutPlan, req({ body }))).status, 400);
  }
});

test("Workout activation deactivates only overlapping owned plans and remains active on retry", async t => {
  const f = transactionFixture(t, WorkoutPlan, [workout(), workout({ _id: OTHER, isActive: true }), workout({ _id: "000000000000000000000004", days: ["Sun"], isActive: true })]);
  for (let retry = 0; retry < 2; retry++) {
    const result = await call(toggleWorkoutPlanActive, req({ body: { isActive: true } }));
    assert.equal(result.status, 200); assert.equal(result.body.find(plan => plan.id === ID).isActive, true);
  }
  assert.equal(f.records()[1].isActive, false); assert.equal(f.records()[2].isActive, true); assert.equal(f.fences(), 2);
});

for (const [Model, handler, record] of [[WorkoutPlan, toggleWorkoutPlanActive, workout], [GymDietPlan, toggleGymDietPlanActive, diet]]) {
  test(`${handler.name} rolls back activation when overlap updates fail`, async t => {
    const f = transactionFixture(t, Model, [record()]);
    t.mock.method(Model, "updateMany", async () => { throw new Error("Overlap update offline"); });
    assert.equal((await call(handler, req({ body: { isActive: true } }))).status, 500);
    assert.equal(f.records()[0].isActive, false);
  });
  test(`${handler.name} rolls back rather than returning a failure after a durable activation`, async t => {
    const f = transactionFixture(t, Model, [record()]);
    t.mock.method(Model, "find", () => { throw new Error("Snapshot read offline"); });
    assert.equal((await call(handler, req({ body: { isActive: true } }))).status, 500);
    assert.equal(f.records()[0].isActive, false);
  });
  test(`${handler.name} refuses string booleans before beginning a transaction`, async t => {
    t.mock.method(mongoose.connection, "transaction", async () => assert.fail("No transaction for invalid input"));
    assert.equal((await call(handler, req({ body: { isActive: "true" } }))).status, 400);
  });
}

test("Partial workout updates validate against the saved start date and lock an elapsed start", async t => {
  freeze(t); const f = transactionFixture(t, WorkoutPlan, [workout({ neverEnds: false, endDate: "2026-10-15" })]);
  assert.equal((await call(updateWorkoutPlan, req({ body: { endDate: "2026-09-30" } }))).status, 400);
  assert.equal((await call(updateWorkoutPlan, req({ body: { startDate: "2026-10-11" } }))).status, 400);
  assert.equal((await call(updateWorkoutPlan, req({ body: { endDate: "2026-10-10" } }))).status, 200);
  assert.equal(f.records()[0].endDate, "2026-10-10");
});

test("Editing an active workout reconciles overlaps on its new weekday in the same transaction", async t => {
  const f = transactionFixture(t, WorkoutPlan, [workout({ isActive: true }), workout({ _id: OTHER, isActive: true, days: ["Sun"] })]);
  assert.equal((await call(updateWorkoutPlan, req({ body: { days: ["Sun"] } }))).status, 200);
  assert.equal(f.records()[1].isActive, false);
});

test("Active diet creation and edits roll back when exclusivity cannot be maintained", async t => {
  const f = transactionFixture(t, GymDietPlan, [diet({ isActive: true })]);
  t.mock.method(GymDietPlan, "updateMany", async () => { throw new Error("Overlap update offline"); });
  assert.equal((await call(createGymDietPlan, req({ body: { planType: "macros", day: "Sat", isActive: true, values: { calories: "2500" } } }))).status, 500);
  assert.equal(f.records().length, 1);
  assert.equal((await call(updateGymDietPlan, req({ body: { values: { calories: "3000" } } }))).status, 500);
  assert.equal(f.records()[0].values.calories, "2000");
});

test("Diet copy retries return one canonical owned copy without duplicating records", async t => {
  const f = transactionFixture(t, GymDietPlan, [diet()]);
  const first = await call(copyGymDietPlanToDay, req({ body: { day: "Sun" } }));
  const retry = await call(copyGymDietPlanToDay, req({ body: { day: "Sun" } }));
  assert.equal(first.status, 201); assert.equal(retry.status, 200); assert.equal(first.body.id, retry.body.id);
  assert.equal(f.records().length, 2); assert.equal(f.records()[1].isActive, false);
});

test("Workout copy retries return one canonical plan and reject unowned sources", async t => {
  const f = transactionFixture(t, WorkoutPlan, [workout()]);
  const body = { ...workout(), copiedFromId: ID, days: ["Sun"] };
  assert.equal((await call(createWorkoutPlan, req({ body }))).status, 201);
  assert.equal((await call(createWorkoutPlan, req({ body }))).status, 200);
  assert.equal(f.records().length, 2);
  assert.equal((await call(createWorkoutPlan, req({ body: { ...body, copiedFromId: "000000000000000000000099" } }))).status, 404);
});

test("Progress rejects nonexistent dates, future days and a stale Today without writes", async t => {
  freeze(t);
  t.mock.method(GymExerciseProgress, "findOneAndUpdate", async () => assert.fail("No progress write"));
  for (const body of [{ date: "2026-02-30" }, { date: "2026-10-11" }, { date: "2026-10-09", expectedToday: "2026-10-09" }]) {
    assert.equal((await call(upsertExerciseProgress, req({ body: { ...body, exerciseId: "bench" } }))).status, 400);
  }
  assert.equal((await call(getExerciseProgress, req({ query: { date: "2026-02-30" } }))).status, 400);
});

test("Concurrent progress upserts retry the unique owned day/exercise record without inserting twice", async t => {
  freeze(t); let attempts = 0;
  t.mock.method(GymExerciseProgress, "findOneAndUpdate", async (filter, update, options) => {
    assert.deepEqual(filter, { userId: USER, date: "2026-10-10", exerciseId: "bench" });
    assert.equal(options.runValidators, true);
    if (++attempts === 1) { assert.equal(options.upsert, true); throw Object.assign(new Error("duplicate"), { code: 11000 }); }
    assert.equal(options.upsert, undefined);
    return { _id: ID, ...update.$set };
  });
  const result = await call(upsertExerciseProgress, req({ body: { date: "2026-10-10", expectedToday: "2026-10-10", exerciseId: "bench", sets: "3" } }));
  assert.equal(result.status, 200); assert.equal(attempts, 2); assert.equal(result.body.sets, "3");
});
