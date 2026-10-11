import test from "node:test";
import assert from "node:assert/strict";
import Habit from "../models/Habit.js";
import HabitLog from "../models/HabitLog.js";
import { completeHabit, undoCompleteHabit, toggleImportant, getHabitConsistency, getHabitTracking, updateHabit, restoreHabit, deleteHabit } from "../controllers/habitController.js";
import { buildDemoHabits, demoHabitTracking, habitClock, habitDayKey, shiftHabitDay, formatHabitDay, formatHabitTime, habitCategoryStorageKey, isHabitArchived, isHabitOnDay, habitDaysOnDay, habitTimeOnDay } from "../../client/src/dashboard/habits/habitUtils.js";

const USER = "000000000000000000000001";
const ID = "000000000000000000000002";
const req = extra => ({ user: { id: USER }, body: {}, query: {}, params: { id: ID }, ...extra });
const freeze = t => t.mock.timers.enable({ apis: ["Date"], now: Date.parse("2026-10-10T06:00:00Z") });
const item = extra => ({ _id: ID, title: "Meditate", time: "06:30", repeatType: "daily", createdAt: new Date("2026-10-01T00:00:00+05:30"), startDate: new Date("2026-10-01T00:00:00+05:30"), targetStreak: 10, activityLogs: [], save: async () => {}, ...extra });
async function call(handler, request = req()) {
  let status = 200, body;
  await handler(request, { status(value) { status = value; return this; }, json(value) { body = value; return this; } });
  return { status, body };
}
function find(t, habit) { t.mock.method(Habit, "findOne", async filter => { assert.equal(filter.userId, USER); return habit; }); }

test("Habit dates retain app-calendar midnight rather than slicing UTC", () => {
  assert.equal(habitDayKey("2026-10-09T18:30:00.000Z"), "2026-10-10");
  assert.equal(habitDayKey("2026-10-10"), "2026-10-10");
  assert.equal(habitDayKey("bad date"), null);
  assert.deepEqual(habitClock(new Date("2026-10-09T18:45:00Z")), { date: "2026-10-10", time: "00:15" });
  assert.equal(habitClock(new Date("2026-10-09T18:45:00Z"), "America/Los_Angeles").date, "2026-10-09");
  assert.equal(formatHabitDay("2026-10-10", { weekday: "long" }), "Saturday");
});

test("Habit calendar arithmetic crosses leap days, year boundaries and daylight saving safely", () => {
  assert.equal(shiftHabitDay("2028-02-28", 1), "2028-02-29");
  assert.equal(shiftHabitDay("2026-12-31", 1), "2027-01-01");
  assert.equal(shiftHabitDay("2026-03-08", 1), "2026-03-09");
  assert.equal(formatHabitTime("02:30"), "2:30 AM");
  assert.equal(formatHabitTime("23:59"), "11:59 PM");
  assert.equal(formatHabitTime("25:00"), "--");
});

test("Habit final day remains active, scheduled and included in Ending Soon", () => {
  const habit = { startDate: "2026-10-01", endDate: "2026-10-09T18:30:00Z", repeatType: "daily" };
  assert.equal(isHabitArchived(habit, "2026-10-10"), false);
  assert.equal(isHabitOnDay(habit, "2026-10-10"), true);
  assert.equal(isHabitArchived(habit, "2026-10-11"), true);
  assert.equal(isHabitOnDay(habit, "2026-10-11"), false);
  assert.equal(isHabitOnDay({ ...habit, deletedAt: "2026-10-10" }, "2026-10-10"), false);
});

test("Calendar previews apply deferred weekday and time edits only on the effective app day", () => {
  const habit = { repeatType: "weekdays", startDate: "2026-10-01", days: ["Sat"], pendingDays: ["Sun"], daysChangeEffectiveFrom: "2026-10-10T18:30:00Z", time: "08:00", pendingTime: "10:00", timeChangeEffectiveFrom: "2026-10-10T18:30:00Z" };
  assert.equal(isHabitOnDay(habit, "2026-10-10"), true);
  assert.equal(isHabitOnDay(habit, "2026-10-11"), true);
  assert.equal(isHabitOnDay(habit, "2026-10-17"), false);
  assert.equal(habitTimeOnDay(habit, "2026-10-10"), "08:00");
  assert.equal(habitTimeOnDay(habit, "2026-10-11"), "10:00");
  assert.deepEqual(habitDaysOnDay(habit, "2026-10-10"), ["Sat"]);
  assert.deepEqual(habitDaysOnDay(habit, "2026-10-11"), ["Sun"]);
  assert.deepEqual(habit.days, ["Sat"], "Reading the effective schedule must not rewrite history");
});

test("One demo snapshot drives all three tabs without future completions", () => {
  const habits = buildDemoHabits("2026-10-10");
  assert.equal(habits.length, 6);
  assert.equal(habits.filter(h => h.completedToday).length, 2);
  const tracked = demoHabitTracking(habits, 2026, 10);
  assert.deepEqual(tracked.map(h => h.id), habits.map(h => h.id));
  for (const habit of tracked) {
    assert.ok(habit.completedDays.every(day => day <= 10));
    assert.equal(habit.completedDays.includes(10), habit.completedToday);
    assert.ok(habit.completedDayKeys.every(day => day <= "2026-10-10"));
  }
  assert.ok(demoHabitTracking(habits, 2026, 11).every(h => h.completedDays.length === 0));
});

test("Demo and separate accounts never share a custom-category storage key", () => {
  assert.notEqual(habitCategoryStorageKey("a"), habitCategoryStorageKey("b"));
  assert.notEqual(habitCategoryStorageKey("a"), habitCategoryStorageKey("a", true));
  assert.notEqual(habitCategoryStorageKey("a"), "monkmode.habit.custom_categories.v1");
});

for (const handler of [completeHabit, undoCompleteHabit]) {
  test(`${handler.name} refuses a stale browser day without writing completions`, async t => {
    freeze(t); find(t, item({ save: async () => assert.fail("No deferred save on invalid day") }));
    t.mock.method(HabitLog, "updateOne", async () => assert.fail("No completion write"));
    t.mock.method(HabitLog, "deleteMany", async () => assert.fail("No completion delete"));
    for (const date of ["2026-10-09", "2026-10-11", "invalid"]) {
      const result = await call(handler, req({ body: { date } }));
      assert.equal(result.status, 400);
      assert.match(result.body.message, /app day has changed/);
    }
  });
}

test("Completing the inclusive final day is idempotent and account-scoped", async t => {
  freeze(t); find(t, item({ endDate: new Date("2026-10-10T00:00:00+05:30") }));
  let writes = 0;
  t.mock.method(HabitLog, "updateOne", async (filter, update, options) => {
    assert.equal(filter.habitId, ID); assert.equal(filter.dayKey, "2026-10-10");
    assert.equal(options.upsert, true); assert.equal(update.$set.completed, true);
    return { upsertedCount: ++writes === 1 ? 1 : 0 };
  });
  t.mock.method(HabitLog, "findOne", async () => ({ habitId: ID, dayKey: "2026-10-10", completed: true }));
  assert.equal((await call(completeHabit, req({ body: { date: "2026-10-10" } }))).status, 201);
  assert.match((await call(completeHabit, req({ body: { date: "2026-10-10" } }))).body.message, /Already completed/);
});

test("Explicit Important retries do not flip the flag back, and invalid input does not save", async t => {
  let saves = 0; const habit = item({ isImportant: false, save: async () => { saves++; } }); find(t, habit);
  assert.equal((await call(toggleImportant, req({ body: { isImportant: true } }))).body.isImportant, true);
  assert.equal((await call(toggleImportant, req({ body: { isImportant: true } }))).body.isImportant, true);
  assert.equal((await call(toggleImportant, req({ body: { isImportant: "true" } }))).status, 400);
  assert.equal(saves, 2);
});

test("Empty accounts still receive authoritative Habit date, timezone and server clock", async t => {
  freeze(t);
  t.mock.method(Habit, "find", filter => { assert.equal(filter.userId, USER); return { select: async () => [] }; });
  const result = await call(getHabitConsistency);
  assert.equal(result.status, 200);
  assert.equal(result.body.timezone, "Asia/Kolkata");
  assert.equal(result.body.date, "2026-10-10");
  assert.equal(result.body.serverNow, "2026-10-10T06:00:00.000Z");
  assert.equal(result.body.expectedToday, 0);
});

test("Tracking preserves authoritative streaks and deduplicates monthly completion days", async t => {
  freeze(t); const habit = item();
  t.mock.method(Habit, "find", async filter => { assert.equal(filter.userId, USER); return [habit]; });
  const log = { habitId: ID, dayKey: "2026-10-10", date: new Date(), completed: true };
  t.mock.method(HabitLog, "find", () => ({ select: async () => [log, log] }));
  const result = await call(getHabitTracking, req({ query: { month: "10", year: "2026" } }));
  assert.equal(result.status, 200);
  assert.deepEqual(result.body[0].completedDays, [10]);
  assert.equal(result.body[0].currentStreak, 1);
});

test("Habit edits preserve today's time and defer the new time until tomorrow", async t => {
  freeze(t); const habit = item(); find(t, habit);
  t.mock.method(Habit, "findOneAndUpdate", async (filter, update) => {
    assert.equal(filter.userId, USER); assert.equal(update.$set.time, undefined);
    assert.equal(update.$set.pendingTime, "09:00");
    assert.equal(habitDayKey(update.$set.timeChangeEffectiveFrom), "2026-10-11");
    return { toObject: () => ({ ...habit, ...update.$set }) };
  });
  const result = await call(updateHabit, req({ body: { time: "09:00" } }));
  assert.equal(result.status, 200);
  assert.equal(result.body.time, "06:30");
  assert.equal(result.body.reflectFromNextDay, true);
});

test("Expired Habit restore is blocked without modifying the record", async t => {
  freeze(t); find(t, item({ deletedAt: new Date("2026-10-08T05:59:00Z"), archivedReason: "deleted", save: async () => assert.fail("No expired restore write") }));
  assert.equal((await call(restoreHabit)).status, 410);
});

test("Concurrent completion upserts return idempotent success after a unique-index race", async t => {
  freeze(t); find(t, item());
  t.mock.method(HabitLog, "updateOne", async () => { throw Object.assign(new Error("duplicate key"), { code: 11000 }); });
  const result = await call(completeHabit, req({ body: { date: "2026-10-10" } }));
  assert.equal(result.status, 200);
  assert.match(result.body.message, /Already completed/);
});

test("A repeated deletion does not reset its 48-hour restore deadline", async t => {
  freeze(t);
  const habit = item({ deletedAt: new Date("2026-10-09T06:00:00Z"), archivedReason: "deleted" });
  find(t, habit);
  t.mock.method(Habit, "findOneAndUpdate", async () => assert.fail("Already-deleted habits must not be deleted again"));
  const result = await call(deleteHabit);
  assert.equal(result.status, 200);
  assert.equal(result.body.deleteUndoExpiresAt, "2026-10-11T06:00:00.000Z");
});
