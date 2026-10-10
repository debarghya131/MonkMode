import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import Journal from "../models/Journal.js";
import Habit from "../models/Habit.js";
import HabitLog from "../models/HabitLog.js";
import GoalProgressLog from "../models/GoalProgressLog.js";
import TodoLog from "../models/TodoLog.js";
import WorkoutPlanLog from "../models/WorkoutPlanLog.js";
import Todo from "../models/Todo.js";
import GymMeasurement from "../models/GymMeasurement.js";
import GymExerciseProgress from "../models/GymExerciseProgress.js";
import GymGalleryEntry from "../models/GymGalleryEntry.js";
import WorkoutPlan from "../models/WorkoutPlan.js";
import { getNavbarConsistency } from "../controllers/insightsController.js";
import { getGymSummary } from "../controllers/gymController.js";
import { getHabitConsistency } from "../controllers/habitController.js";
import { calculateMonkStreak } from "../utils/monkStreakUtils.js";
import { calculateStreak } from "../utils/streakUtils.js";
import { retainGoalActivityLogs } from "../utils/goalActivityUtils.js";
import { getWorkoutChecklistSummary, stableExerciseKey } from "../utils/workoutChecklistUtils.js";
import { findHabitCompletionTtlIndexes, findActivityTtlIndexes } from "../utils/activityRetentionUtils.js";

const USER_ID = "000000000000000000000001";
const HABIT_ID = "000000000000000000000002";
const DAYS = ["2026-10-07", "2026-10-08", "2026-10-09"];
const query = (value) => ({ select: async () => value, sort() { return this; } });
const request = (extra = {}) => ({ user: { id: USER_ID, _id: USER_ID }, query: {}, ...extra });
async function call(handler, req = request()) {
  let status = 200;
  let payload;
  await handler(req, { status(code) { status = code; return this; }, json(value) { payload = value; return this; } });
  assert.equal(status, 200, JSON.stringify(payload));
  return payload;
}

function stubHistory(t, { todayComplete = false, lateDay = null } = {}) {
  t.mock.timers.enable({ apis: ["Date"], now: Date.parse("2026-10-09T18:45:00Z") });
  const days = todayComplete ? [...DAYS, "2026-10-10"] : DAYS;
  const createdAt = new Date("2026-10-07T00:00:00+05:30");
  const habit = { _id: HABIT_ID, createdAt, startDate: createdAt, frequency: "daily", repeatType: "daily", days: [] };
  const todo = { _id: "000000000000000000000003", createdAt, startDate: createdAt, repeatType: "daily", dayStates: days.map(dayKey => ({ dayKey, status: "completed", lateCompleted: dayKey === lateDay })) };
  const assertUser = (filter) => assert.equal(String(filter.userId), USER_ID);
  t.mock.method(Journal, "findOne", filter => { assertUser(filter); assert.equal(filter.dayKey, "2026-10-10"); return query(todayComplete ? {} : null); });
  t.mock.method(Journal, "find", filter => { assertUser(filter); return query([]); });
  t.mock.method(Journal, "countDocuments", async filter => { assertUser(filter); return days.length; });
  t.mock.method(Journal, "aggregate", async pipeline => {
    assertUser(pipeline[0].$match);
    return pipeline.some(stage => stage.$group?._id === "$mood") ? [] : days.map(_id => ({ _id }));
  });
  t.mock.method(Habit, "find", filter => { assertUser(filter); return query([habit]); });
  t.mock.method(HabitLog, "aggregate", async pipeline => {
    assert.deepEqual(pipeline[0].$match.habitId.$in.map(String), [HABIT_ID]);
    return pipeline.at(-1).$count ? [{ count: days.length }] : days.map(_id => ({ _id, completedHabits: 1, habitIds: [HABIT_ID] }));
  });
  t.mock.method(Todo, "find", async filter => { assertUser(filter); return [todo]; });
}

test("header uses the same Kolkata day at midnight and retains yesterday's Monk Streak", async t => {
  stubHistory(t);
  const data = await call(getNavbarConsistency);
  assert.equal(data.date, "2026-10-10");
  assert.equal(data.timezone, "Asia/Kolkata");
  assert.equal(data.monkStreakDays, 3);
  assert.equal(data.allSectionsComplete, false);
  assert.equal(data.sections.journal.currentStreakDays, 3);
  assert.equal(data.sections.habit.fullCompletionStreakDays, 3);
  assert.equal(data.sections.todo.fullCompletionStreakDays, 3);
});

test("complete day increments once from database history, independently of browser visits", async t => {
  stubHistory(t, { todayComplete: true });
  const first = await call(getNavbarConsistency);
  const second = await call(getNavbarConsistency);
  assert.equal(first.monkStreakDays, 4);
  assert.equal(second.monkStreakDays, 4);
  assert.equal(first.consistencyScore, 100);
});

test("late task completion cannot repair a Monk Streak", async t => {
  stubHistory(t, { lateDay: "2026-10-09" });
  assert.equal((await call(getNavbarConsistency)).monkStreakDays, 0);
});

test("late completion today does not count as an all-sections-complete day", async t => {
  stubHistory(t, { todayComplete: true, lateDay: "2026-10-10" });
  const data = await call(getNavbarConsistency);
  assert.equal(data.monkStreakDays, 3);
  assert.equal(data.allSectionsComplete, false);
});

test("another account cannot inherit a previous user's header history", async t => {
  stubHistory(t, { todayComplete: true });
  assert.equal((await call(getNavbarConsistency)).monkStreakDays, 4);
  const otherUser = "000000000000000000000099";
  const assertUser = filter => assert.equal(String(filter.userId), otherUser);
  t.mock.method(Journal, "findOne", filter => { assertUser(filter); return query(null); });
  t.mock.method(Journal, "find", filter => { assertUser(filter); return query([]); });
  t.mock.method(Journal, "countDocuments", async filter => { assertUser(filter); return 0; });
  t.mock.method(Journal, "aggregate", async pipeline => { assertUser(pipeline[0].$match); return []; });
  t.mock.method(Habit, "find", filter => { assertUser(filter); return query([]); });
  t.mock.method(Todo, "find", async filter => { assertUser(filter); return []; });
  const data = await call(getNavbarConsistency, request({ user: { id: otherUser, _id: otherUser } }));
  assert.equal(data.monkStreakDays, 0);
  assert.equal(data.consistencyScore, 0);
});

test("archived habits retain their historical contribution to Monk Streak", async t => {
  stubHistory(t);
  const archived = { _id: HABIT_ID, createdAt: new Date("2026-10-07T00:00:00+05:30"), endDate: new Date("2026-10-09T00:00:00+05:30"), repeatType: "daily" };
  t.mock.method(Habit, "find", filter => query(filter.$and ? [] : [archived]));
  assert.equal((await call(getNavbarConsistency)).monkStreakDays, 3);
});

test("Monk Streak requires all three sections, breaks on gaps and handles leap days", () => {
  const todayKey = "2024-03-01";
  const days = ["2024-02-28", "2024-02-29", todayKey];
  assert.equal(calculateMonkStreak({ todayKey, journalDays: days, todoDays: days, habitDays: days }), 3);
  assert.equal(calculateMonkStreak({ todayKey, journalDays: days, todoDays: [], habitDays: days }), 0);
  assert.equal(calculateMonkStreak({ todayKey, journalDays: days, todoDays: [todayKey], habitDays: days }), 1);
  assert.equal(calculateMonkStreak({ todayKey }), 0);
});

test("individual habit streak also gives unfinished today a grace period", t => {
  t.mock.timers.enable({ apis: ["Date"], now: Date.parse("2026-10-10T09:00:00+05:30") });
  const habit = { startDate: new Date("2026-10-07T00:00:00+05:30"), repeatType: "daily" };
  const logs = DAYS.map(dayKey => ({ dayKey, completed: true }));
  assert.deepEqual(calculateStreak(logs, habit), { currentStreak: 3, maxStreak: 3, streakBreaks: 0 });
});

test("unscheduled habit completions do not inflate today's score", async t => {
  stubHistory(t, { todayComplete: true });
  const scheduled = { _id: HABIT_ID, createdAt: new Date("2026-10-07T00:00:00+05:30"), days: ["sun"] };
  t.mock.method(Habit, "find", () => query([scheduled]));
  const data = await call(getHabitConsistency, request({ includeCompletionDays: true }));
  assert.equal(data.completedToday, 0);
  assert.equal(data.expectedToday, 0);
  assert.deepEqual(data.completedDayKeys, []);
});

test("Gym counts only scheduled exercise IDs, not unrelated progress updates", async t => {
  t.mock.timers.enable({ apis: ["Date"], now: Date.parse("2026-10-09T18:45:00Z") });
  t.mock.method(GymMeasurement, "findOne", () => query(null));
  t.mock.method(GymExerciseProgress, "find", filter => {
    assert.equal(filter.date, "2026-10-10");
    return query([{ exerciseId: "C" }, { exerciseId: "D" }]);
  });
  t.mock.method(GymGalleryEntry, "aggregate", async () => []);
  t.mock.method(WorkoutPlan, "find", filter => {
    assert.equal(filter.days, "Sat");
    return query([{ exercises: [{ id: "A" }, { id: "B" }] }]);
  });
  const data = await call(getGymSummary);
  assert.equal(data.progressUpdatesToday, 2);
  assert.equal(data.completedProgress, 0);
  assert.equal(data.totalProgress, 2);
  assert.equal(data.pendingUpdates, 2);
});

test("Gym matches custom name keys and deduplicates exercises shared by plans", () => {
  const custom = { id: "custom-123", name: "  My Bench Press  " };
  assert.equal(stableExerciseKey(custom), "my-bench-press");
  assert.equal(stableExerciseKey({ id: "ex-123", name: "My Bench Press" }), "my-bench-press");
  assert.deepEqual(getWorkoutChecklistSummary(
    [{ exercises: [custom, { id: "A" }] }, { exercises: [custom] }],
    [{ exerciseId: "my-bench-press" }, { exerciseId: "my-bench-press" }, { exerciseId: "unrelated" }]
  ), { progressUpdatesToday: 2, completedProgress: 1, totalProgress: 2, pendingUpdates: 1 });
  assert.equal(getWorkoutChecklistSummary([], [{ exerciseId: "A" }]).totalProgress, 0);
});

test("retention preserves completion events while bounding the recent activity feed", () => {
  const completion = { action: "subgoal_completed", at: new Date("2025-01-01") };
  const edits = Array.from({ length: 300 }, () => ({ action: "edited" }));
  const retained = retainGoalActivityLogs([completion, ...edits]);
  assert.equal(retained.length, 201);
  assert.equal(retained[0], completion);
  assert.ok(HabitLog.schema.indexes().every(([, options]) => options.expireAfterSeconds == null));
  for (const model of [GoalProgressLog, TodoLog, WorkoutPlanLog]) {
    assert.ok(model.schema.indexes().every(([, options]) => options.expireAfterSeconds == null));
  }
  const progress = { action: "progress_updated" };
  assert.equal(retainGoalActivityLogs([progress, ...edits])[0], progress);
});

test("retention migration targets only single-field date TTL indexes", () => {
  const ttl = { name: "date_1", key: { date: 1 }, expireAfterSeconds: 2592000 };
  assert.deepEqual(findHabitCompletionTtlIndexes([
    ttl, { name: "_id_", key: { _id: 1 } }, { key: { date: 1 } },
    { key: { date: 1, habitId: 1 }, expireAfterSeconds: 60 },
    { key: { createdAt: 1 }, expireAfterSeconds: 60 }
  ]), [ttl]);
  assert.deepEqual(findActivityTtlIndexes([{ name: "cleanup", key: { deletedAt: 1 }, expireAfterSeconds: 172800 }], "date"), []);
});

test(".env is loaded before route limits and explicit app timezone overrides host TZ", () => {
  const fixture = fileURLToPath(new URL("./fixtures/runtime.env", import.meta.url));
  const code = `
    const {default:routes}=await import('./routes/habitRoutes.js');
    const middleware=routes.stack.find(layer=>layer.route?.path==='/:id/complete').route.stack[0].handle;
    let limit;
    await middleware({user:{id:'fixture-user'}},{setHeader(key,value){if(key==='X-RateLimit-Limit')limit=value;}},()=>{});
    console.log(JSON.stringify({limit,timezone:process.env.TZ,hour:new Date('2026-10-09T18:45:00Z').getHours()}));
  `;
  const env = { ...process.env, TZ: "UTC", DOTENV_CONFIG_PATH: fixture, ARCJET_KEY: "" };
  delete env.APP_TIMEZONE;
  delete env.HABIT_WRITE_RATE_LIMIT_DAILY_MAX;
  const output = execFileSync(process.execPath, ["--input-type=module", "-e", code], {
    cwd: fileURLToPath(new URL("..", import.meta.url)), env, encoding: "utf8"
  });
  assert.deepEqual(JSON.parse(output), { limit: "123", timezone: "Asia/Kolkata", hour: 0 });
});

test("calendar arithmetic crosses daylight-saving changes without repeating or skipping a day", () => {
  const code = `
    const {addCalendarDays,calendarDaysBetween}=await import('./utils/calendarUtils.js');
    const start=new Date(2026,10,1); const end=addCalendarDays(start,1);
    console.log(JSON.stringify({day:end.getDate(),hour:end.getHours(),days:calendarDaysBetween(start,end),hours:(end-start)/3600000}));
  `;
  const output = execFileSync(process.execPath, ["--input-type=module", "-e", code], {
    cwd: fileURLToPath(new URL("..", import.meta.url)), env: { ...process.env, APP_TIMEZONE: "America/New_York", TZ: "UTC" }, encoding: "utf8"
  });
  assert.deepEqual(JSON.parse(output), { day: 2, hour: 0, days: 1, hours: 25 });
});
