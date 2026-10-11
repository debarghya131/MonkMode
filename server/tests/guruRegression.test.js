import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import Journal from "../models/Journal.js";
import Habit from "../models/Habit.js";
import HabitLog from "../models/HabitLog.js";
import Todo from "../models/Todo.js";
import Goal from "../models/Goal.js";
import GoalProgressLog from "../models/GoalProgressLog.js";
import GymExerciseProgress from "../models/GymExerciseProgress.js";
import GymMeasurement from "../models/GymMeasurement.js";
import { computeGuruInsights } from "../../shared/guruInsightsStats.js";
import { shiftReportDay } from "../../shared/journalWeeklyStats.js";
import { loadGuruInsights } from "../utils/guruInsightsUtils.js";
import { getInsightsSummary } from "../controllers/insightsController.js";
import { chatWithMing, validateGuruChat, GURU_SYSTEM_PROMPT } from "../controllers/aiGuruController.js";
import insightsRoutes from "../routes/insightsRoutes.js";
import { createDemoGuruInsights, guruCards, guruPatterns, guruSuggestions, demoGuruReply } from "../../client/src/dashboard/ai_guru/guruPresentation.js";
import { validGuruInsights, validGuruReply, guruFailureMessage } from "../../client/src/dashboard/ai_guru/guruResponse.js";
import { DEFAULT_GROQ_MODEL, groqCompletionOptions } from "../config/groq.js";

const USER = "000000000000000000000001", today = "2026-10-10";
const now = Date.parse("2026-10-10T06:00:00Z");
const clock = { today, timezone: "Asia/Kolkata", time: "11:30", now };
const days = Array.from({ length: 7 }, (_, index) => shiftReportDay(today, index - 6));
const habit = extra => ({ _id: "habit", startDate: days[0], createdAt: days[0], repeatType: "daily", ...extra });
const task = extra => ({ _id: "task", startDate: days[0], repeatType: "daily", ...extra });
const compute = (records = {}, scope = "7d", opts = clock) => computeGuruInsights(records, scope, opts);
const query = data => ({ lean: async () => data });
function fixtures(t, data = {}) {
  t.mock.timers.enable({ apis: ["Date"], now });
  for (const [Model, key] of [[Journal, "journals"], [Habit, "habits"], [Todo, "todos"], [Goal, "goals"], [GymExerciseProgress, "exercises"], [GymMeasurement, "measurements"]]) {
    t.mock.method(Model, "find", (filter, fields) => {
      assert.equal(filter.userId, USER);
      assert.equal(fields.content, undefined); assert.equal(fields.notes, undefined); assert.equal(fields.images, undefined);
      return query(data[key] || []);
    });
  }
  t.mock.method(HabitLog, "find", filter => {
    assert.deepEqual(filter.habitId.$in, (data.habits || []).map(row => row._id));
    return query(data.habitLogs || []);
  });
  t.mock.method(GoalProgressLog, "find", filter => {
    assert.equal(filter.userId, USER);
    assert.deepEqual(filter.goalId.$in, (data.goals || []).map(row => row._id));
    return query(data.goalLogs || []);
  });
}
function env(t, key, value) {
  const old = process.env[key];
  if (value === undefined) delete process.env[key]; else process.env[key] = value;
  t.after(() => { if (old === undefined) delete process.env[key]; else process.env[key] = old; });
}
async function call(handler, { body = {}, scope = "7d", response = null } = {}) {
  const res = response || new EventEmitter();
  res.statusCode = 200;
  res.status = function (code) { this.statusCode = code; return this; };
  res.json = function (value) { this.payload = value; this.writableEnded = true; return this; };
  await handler({ user: { id: USER }, query: { scope }, body }, res);
  return { status: res.statusCode, body: res.payload };
}

test("Guru periods contain exactly 7 or 30 inclusive app days, not 8 or 31", () => {
  assert.deepEqual(compute().period, { from: days[0], to: today });
  assert.equal(compute({}, "30d").period.from, "2026-09-11");
  const crossed = compute({}, "7d", { ...clock, today: "2026-03-09", timezone: "America/New_York" });
  assert.equal(crossed.period.from, "2026-03-03");
});
test("missing scores remain unknown; duplicate days, boundary and future entries do not inflate Journal", () => {
  const report = compute({ journals: [
    { dayKey: days[0], mood: "happy", energyLevel: 20, updatedAt: days[0] },
    { dayKey: days[0], mood: "Calm", energyLevel: 80, updatedAt: days[1] },
    { dayKey: days[1], mood: "__proto__" }, { dayKey: shiftReportDay(days[0], -1), energyLevel: 100 },
    { dayKey: shiftReportDay(today, 1), energyLevel: 100 },
  ] });
  assert.equal(report.journal.entryCount, 2); assert.equal(report.journal.avgEnergyLevel, 80);
  assert.equal(report.journal.energyRecordedDays, 1); assert.equal(report.journal.avgOverallRating, null);
  assert.equal(report.journal.topMood, "Calm"); assert.deepEqual(report.journal.moodDistribution, [{ mood: "Calm", count: 1 }]);
});
test("legacy journal timestamps use the application day, not UTC or browser time", () => {
  const report = compute({ journals: [{ date: "2026-10-03T19:00:00Z", energyLevel: 72 }] });
  assert.equal(report.journal.entryCount, 1); assert.equal(report.journal.avgEnergyLevel, 72);
});
test("habits count selected scheduled occurrences, owned IDs, last-write undo and archived history", () => {
  const report = compute({ habits: [habit({ repeatType: "weekdays", days: ["Mon", "Wed"], deletedAt: "2026-10-08" })],
    habitLogs: [{ habitId: "habit", dayKey: "2026-10-05", completed: true, date: "2026-10-05T06:00:00Z" },
      { habitId: "habit", dayKey: "2026-10-05", completed: false, date: "2026-10-05T07:00:00Z" },
      { habitId: "habit", dayKey: "2026-10-07", completed: true },
      { habitId: "foreign", dayKey: "2026-10-07", completed: true },
      { habitId: "habit", dayKey: today, completed: true }] });
  assert.equal(report.habits.possibleLogs, 2); assert.equal(report.habits.completedLogs, 1);
  assert.equal(report.habits.completionRate, 50); assert.equal(report.habits.totalActiveHabits, 0);
});
test("tasks count recurrence outcomes and retain missed/pending states rather than schedule-end audits", () => {
  const report = compute({ todos: [task({ time: "20:00", dayStates: [{ dayKey: days[0], status: "completed" }] })] });
  assert.equal(report.todos.total, 7); assert.equal(report.todos.completed, 1);
  assert.equal(report.todos.missed, 5); assert.equal(report.todos.pending, 1); assert.equal(report.todos.completionRate, 14);
  assert.equal(report.todos.total, report.todos.completed + report.todos.missed + report.todos.pending);
});
test("Goal state uses real numeric and milestone completion; progress events deduplicate", () => {
  const report = compute({ goals: [
    { _id: "g", createdAt: days[0], updatedAt: today, currentValue: 10, targetValue: 10 },
    { _id: "m", createdAt: days[0], updatedAt: today, subgoals: [{ _id: "s", completed: true, completedAt: days[2] }] },
  ], goalLogs: [{ _id: "event", goalId: "g", date: days[1], currentValue: 10 },
    { _id: "event", goalId: "g", date: days[1], currentValue: 10 },
    { goalId: "foreign", date: days[1], currentValue: 5 }] });
  assert.equal(report.goals.activeGoals, 2); assert.equal(report.goals.completedGoals, 2);
  assert.equal(report.goals.progressUpdates, 1); assert.equal(report.goals.goalsUpdated, 1);
  assert.equal(report.goals.milestoneCompletions, 1);
});
test("30-day Goal and Gym results include the final day, not just the first seven days", () => {
  const report = compute({ goals: [{ _id: "g", createdAt: "2026-09-11", updatedAt: today, currentValue: 2, targetValue: 2 }],
    goalLogs: [{ goalId: "g", date: today, currentValue: 2 }],
    exercises: [{ exerciseId: "x", date: today, sets: "3", reps: "8" }] }, "30d");
  assert.equal(report.goals.completedGoals, 1); assert.equal(report.goals.progressUpdates, 1); assert.equal(report.gym.workoutDays, 1);
});
test("Gym ignores blank placeholders, invalid dates and duplicates while counting stable exercise IDs", () => {
  const report = compute({ exercises: [
    { date: today, exerciseId: "a", exerciseName: "Same", sets: "3", bodyPart: "Back" },
    { date: today, exerciseId: "a", exerciseName: "Same", sets: "4", bodyPart: "Back" },
    { date: today, exerciseId: "b", exerciseName: "Same", totalTime: "5", bodyPart: "Cardio" },
    { date: today, exerciseId: "blank", notes: "not exercise" }, { date: "2026-02-31", exerciseId: "invalid", sets: "3" },
    { date: shiftReportDay(today, 1), exerciseId: "future", sets: "3" },
  ], measurements: [{ checkInDate: today, bodyWeight: "75" }, { checkInDate: today, bodyWeight: "76" }, { checkInDate: days[0] }] });
  assert.equal(report.gym.workoutDays, 1); assert.equal(report.gym.exercisesLogged, 2);
  assert.equal(report.gym.uniqueExercises, 2); assert.equal(report.gym.measurementsTaken, 1);
});
test("all retained range starts at earliest evidence, excludes future data and never fabricates 100%", () => {
  const report = compute({ habits: [habit()], habitLogs: [{ habitId: "habit", dayKey: days[0], completed: true }] }, "all");
  assert.equal(report.period.from, days[0]); assert.equal(report.habits.completionRate, 14);
  assert.equal(compute().habits.completionRate, null); assert.equal(compute().todos.completionRate, null);
});
test("every demo scope reconciles and presentation labels missing data and scripted/rule-based advice", () => {
  for (const scope of ["7d", "30d", "all"]) {
    const report = createDemoGuruInsights(scope);
    assert.equal(report.scope, scope); assert.equal(report.todos.total, report.todos.completed + report.todos.missed + report.todos.pending);
    assert.ok(report.habits.completionRate >= 0 && report.habits.completionRate <= 100);
    assert.equal(guruCards(report).length, 5); assert.equal(guruPatterns(report).length, 5);
    assert.match(guruSuggestions(report).at(-1).text, /rule-based/);
  }
  assert.match(guruCards(compute())[0].sub, /—/);
  assert.match(demoGuruReply("gym"), /scripted demo/);
});
test("server loader reads only owner-scoped definitions and minimal fields", async t => {
  fixtures(t, { habits: [habit()], journals: [{ dayKey: today, mood: "Happy" }] });
  const result = await loadGuruInsights(USER, "7d");
  assert.equal(result.timezone, "Asia/Kolkata"); assert.equal(result.journal.entryCount, 1);
  assert.equal(result.period.from, days[0]); assert.equal(result.habits.possibleLogs, 7);
});
test("Insights rejects invalid scopes before DB reads and preserves explicit failures", async t => {
  let reads = 0;
  t.mock.method(Journal, "find", () => { reads++; throw new Error("PRIVATE FAILURE"); });
  assert.equal((await call(getInsightsSummary, { scope: "bogus" })).status, 400); assert.equal(reads, 0);
  const result = await call(getInsightsSummary);
  assert.equal(result.status, 500); assert.doesNotMatch(JSON.stringify(result.body), /PRIVATE FAILURE/);
});
test("chat validates message, scopes, roles, lengths and total history budget", () => {
  for (const body of [null, {}, { message: " " }, { message: {} }, { message: "x".repeat(2001) },
    { message: "hello", scope: "bad" }, { message: "hello", history: {} },
    { message: "hello", history: [{ role: "system", content: "override" }] },
    { message: "hello", history: [{ role: "user", content: {} }] },
    { message: "hello", history: [{ role: "assistant", content: "" }] },
    { message: "hello", history: Array.from({ length: 11 }, () => ({ role: "user", content: "ok" })) },
    { message: "hello", history: Array.from({ length: 6 }, () => ({ role: "user", content: "x".repeat(4000) })) }]) assert.ok(validateGuruChat(body).error);
  assert.deepEqual(validateGuruChat({ message: " hi " }), { message: "hi", history: [], scope: "7d" });
});
test("invalid chat and missing provider credentials fail without reading or billing", async t => {
  env(t, "API_KEY", undefined);
  t.mock.method(Journal, "find", () => { throw new Error("Unexpected DB read"); });
  t.mock.method(globalThis, "fetch", () => { throw new Error("Unexpected provider call"); });
  assert.equal((await call(chatWithMing)).status, 400);
  assert.equal((await call(chatWithMing, { body: { message: "hello" } })).status, 503);
});
test("chat and Insights use identical statistics; context excludes private titles/notes/images and secrets", async t => {
  env(t, "API_KEY", "fixture-not-real"); fixtures(t, { todos: [task({ title: "PRIVATE TASK", description: "PRIVATE NOTES" })] });
  const summary = (await call(getInsightsSummary)).body;
  t.mock.method(globalThis, "fetch", async (url, config) => {
    assert.equal(url, "https://api.groq.com/openai/v1/chat/completions"); assert.ok(config.signal);
    const request = JSON.parse(config.body);
    assert.equal(request.messages[0].content, GURU_SYSTEM_PROMPT);
    assert.ok(request.messages[1].content.includes(JSON.stringify(summary)));
    assert.doesNotMatch(config.body, /PRIVATE TASK|PRIVATE NOTES|fixture-not-real/);
    assert.equal(request.messages.at(-1).content, "Help me plan");
    return { ok: true, json: async () => ({ choices: [{ message: { content: "A practical next step." } }] }) };
  });
  const result = await call(chatWithMing, { body: { message: "Help me plan" } });
  assert.equal(result.status, 200); assert.equal(result.body.reply, "A practical next step.");
  assert.deepEqual(result.body.period, summary.period);
});
for (const [label, response, expected] of [
  ["upstream quota", { ok: false, status: 429 }, 429],
  ["upstream credential failure", { ok: false, status: 401 }, 503],
  ["empty choices", { ok: true, json: async () => ({ choices: [] }) }, 502],
  ["blank answer", { ok: true, json: async () => ({ choices: [{ message: { content: " " } }] }) }, 502],
  ["invalid JSON", { ok: true, json: async () => { throw new Error("PRIVATE PROVIDER"); } }, 500],
]) test(`chat exposes a recoverable error for ${label}, not fabricated guidance`, async t => {
  env(t, "API_KEY", "fixture-not-real"); fixtures(t);
  t.mock.method(globalThis, "fetch", async () => response);
  const result = await call(chatWithMing, { body: { message: "Help" } });
  assert.equal(result.status, expected); assert.ok(result.body.error); assert.equal(result.body.reply, undefined);
  assert.doesNotMatch(JSON.stringify(result.body), /PRIVATE PROVIDER/);
});
test("provider timeout aborts the real request and a later explicit retry succeeds", async t => {
  env(t, "API_KEY", "fixture-not-real"); env(t, "AI_TIMEOUT_MS", "5"); fixtures(t);
  let aborted = false;
  const mock = t.mock.method(globalThis, "fetch", async (_url, { signal }) => new Promise((_, reject) => {
    signal.addEventListener("abort", () => { aborted = true; reject(new Error("Aborted")); });
  }));
  assert.equal((await call(chatWithMing, { body: { message: "Help" } })).status, 504); assert.equal(aborted, true);
  mock.mock.mockImplementation(async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: "Retry works" } }] }) }));
  assert.equal((await call(chatWithMing, { body: { message: "Help" } })).body.reply, "Retry works");
});
test("disconnected clients abort provider work and remove response listeners", async t => {
  env(t, "API_KEY", "fixture-not-real"); fixtures(t);
  const response = new EventEmitter(); let aborted = false;
  t.mock.method(globalThis, "fetch", async (_url, { signal }) => new Promise((_, reject) => {
    signal.addEventListener("abort", () => { aborted = true; reject(new Error("Aborted")); });
    response.destroyed = true; response.emit("close");
  }));
  await call(chatWithMing, { body: { message: "Help" }, response });
  assert.equal(aborted, true); assert.equal(response.listenerCount("close"), 0); assert.equal(response.payload, undefined);
});
test("Insights remains protected and read-only; chat remains POST-only behind quotas", () => {
  const summary = insightsRoutes.stack.find(layer => layer.route?.path === "/summary");
  const chat = insightsRoutes.stack.find(layer => layer.route?.path === "/chat");
  assert.ok(insightsRoutes.stack[0].handle); assert.equal(summary.route.methods.get, true);
  assert.equal(chat.route.methods.post, true); assert.ok(chat.route.stack.length > 1);
});

test("Groq defaults to the replacement model with room for reasoning and final text", t => {
  env(t, "GROQ_MODEL", undefined);
  assert.deepEqual(groqCompletionOptions(), { model: DEFAULT_GROQ_MODEL, temperature: 0.5,
    max_completion_tokens: 1500, reasoning_effort: "low", include_reasoning: false });
  assert.equal(DEFAULT_GROQ_MODEL, "openai/gpt-oss-120b");
  assert.equal(groqCompletionOptions({ maxTokens: 200 }).max_completion_tokens, 1500);
});
test("Groq custom model setting is trimmed and unsupported reasoning fields are omitted", t => {
  env(t, "GROQ_MODEL", " qwen/qwen3.8-27b ");
  assert.deepEqual(groqCompletionOptions({ maxTokens: 400, temperature: 0.72 }), {
    model: "qwen/qwen3.8-27b", temperature: 0.72, max_completion_tokens: 400 });
  env(t, "GROQ_MODEL", "openai/gpt-oss-20b");
  assert.equal(groqCompletionOptions().include_reasoning, false);
});
test("Ming sends configured model options and trims credentials, not secrets in context", async t => {
  env(t, "API_KEY", " fixture-not-real "); env(t, "GROQ_MODEL", "openai/gpt-oss-120b"); fixtures(t);
  t.mock.method(globalThis, "fetch", async (_url, options) => {
    const body = JSON.parse(options.body);
    assert.equal(options.headers.Authorization, "Bearer fixture-not-real");
    assert.equal(body.model, "openai/gpt-oss-120b"); assert.equal(body.max_tokens, undefined);
    assert.equal(body.include_reasoning, false); assert.equal(body.reasoning_effort, "low");
    return { ok: true, json: async () => ({ choices: [{ message: { content: "A next step.", reasoning: "PRIVATE REASONING" } }] }) };
  });
  const result = await call(chatWithMing, { body: { message: "hello" } });
  assert.equal(result.status, 200); assert.doesNotMatch(JSON.stringify(result.body), /PRIVATE REASONING|fixture-not-real/);
});
for (const status of [400, 401, 403, 404, 429, 500, 503]) {
  test(`Ming reports safe upstream ${status} errors without automatic paid retries`, async t => {
    env(t, "API_KEY", "fixture-not-real"); fixtures(t); let requests = 0;
    t.mock.method(globalThis, "fetch", async () => {
      requests++; return { ok: false, status, text() { assert.fail("Do not read provider diagnostics"); } };
    });
    const result = await call(chatWithMing, { body: { message: "hello" } });
    const configuration = [400, 401, 403, 404].includes(status);
    assert.equal(result.status, configuration ? 503 : status === 429 ? 429 : 502);
    assert.equal(result.body.retryable, !configuration); assert.equal(requests, 1);
    assert.equal(result.body.code, configuration ? "AI_CONFIGURATION" : status === 429 ? "AI_QUOTA" : "AI_PROVIDER_UNAVAILABLE");
    assert.equal(result.body.reply, undefined);
  });
}
for (const scope of ["7d", "30d", "all"]) {
  test(`Insights validates ${scope} populated and empty reports and rejects malformed nested data`, () => {
    const sample = createDemoGuruInsights(scope), empty = compute({}, scope);
    assert.equal(validGuruInsights(sample, scope), true); assert.equal(validGuruInsights(empty, scope), true);
    for (const bad of [null, {}, { ...sample, period: { from: "2026-02-31", to: today } }, { ...sample, dataNote: {} },
      { ...sample, timezone: "invalid" }, { ...sample, scope: "wrong" }]) assert.equal(validGuruInsights(bad, scope), false);
    for (const [section, fields] of Object.entries(sample)) {
      if (!["journal", "habits", "todos", "goals", "gym"].includes(section)) continue;
      assert.equal(validGuruInsights({ ...sample, [section]: null }, scope), false);
      for (const key of Object.keys(fields)) {
        assert.equal(validGuruInsights({ ...sample, [section]: { ...fields, [key]: {} } }, scope), false, `${section}.${key}`);
      }
    }
    const invalid = structuredClone(sample); invalid.journal.moodDistribution[0] = null;
    assert.equal(validGuruInsights(invalid, scope), false);
    assert.equal(validGuruInsights({ ...empty, habits: { ...empty.habits, completionRate: 0 } }, scope), false);
    assert.equal(validGuruInsights({ ...sample, serverNow: "not a date" }, scope), false);
  });
}
test("Guru chat validation rejects wrong scope/period, blank, oversized and object replies", () => {
  const good = { reply: "A helpful reply", scope: "7d", period: { from: days[0], to: today } };
  assert.equal(validGuruReply(good, "7d"), true);
  for (const bad of [null, {}, { ...good, reply: {} }, { ...good, reply: " " }, { ...good, reply: "x".repeat(8001) },
    { ...good, scope: "30d" }, { ...good, period: { from: today, to: days[0] } }]) assert.equal(validGuruReply(bad, "7d"), false);
});
test("Guru errors render only text, with safe fallbacks for malformed error bodies", () => {
  for (const error of [null, {}, { response: { data: { error: {}, message: [] } } }, { response: { data: { error: 4 } } }])
    assert.equal(guruFailureMessage(error, "Please retry"), "Please retry");
  assert.equal(guruFailureMessage({ response: { data: { error: {}, message: "Safe text" } } }, "Fallback"), "Safe text");
});
