import test from "node:test";
import assert from "node:assert/strict";
import Journal from "../models/Journal.js";
import JournalMissedReason from "../models/JournalMissedReason.js";
import JournalWeeklySummary from "../models/JournalWeeklySummary.js";
import User from "../models/User.js";
import weeklyRoutes from "../routes/weeklyReportRoutes.js";
import { getJournalWeeklyReport, getJournalSummaries, generateJournalAiSummary } from "../controllers/weeklyReportController.js";
import { computeJournalWeeklyStats, averageReportTime, shiftReportDay } from "../../shared/journalWeeklyStats.js";
import { buildJournalWeeklyReport, journalReportFingerprint, completedJournalWeeks } from "../utils/journalWeeklyReportUtils.js";
import { DEMO_JOURNAL_REPORTS } from "../../client/src/dashboard/weeklyreport/journalDemoReports.js";

const USER_ID = "000000000000000000000001";
const WEEK = "2026-09-28";
const days = Array.from({ length: 7 }, (_, index) => shiftReportDay(WEEK, index));
const account = { createdAt: new Date("2026-01-01T00:00:00+05:30") };
const entry = (offset, extra = {}) => ({ dayKey: days[offset], mood: "Focused", energyLevel: 80, overallRating: 80, wins: ["A"], mistakes: [], achievement: ["B"], ...extra });
const query = value => ({ select() { return this; }, lean: async () => value });
const request = (extra = {}) => ({ user: { id: USER_ID }, query: { week: WEEK }, body: {}, method: "GET", ...extra });
async function call(handler, req = request()) {
  let status = 200, body;
  await handler(req, { status(code) { status = code; return this; }, json(value) { body = value; return this; } });
  return { status, body };
}
function fixture(t, entries = [entry(0)], reasons = [], joined = account) {
  t.mock.timers.enable({ apis: ["Date"], now: Date.parse("2026-10-09T18:45:00Z") });
  t.mock.method(Journal, "find", (filter, projection) => {
    assert.equal(filter.userId, USER_ID);
    assert.equal(projection.summary, undefined);
    assert.equal(projection.content, undefined);
    return query(entries.filter(entry => entry.dayKey >= filter.dayKey.$gte && entry.dayKey <= filter.dayKey.$lte));
  });
  t.mock.method(JournalMissedReason, "find", filter => { assert.equal(filter.userId, USER_ID); return query(reasons); });
  t.mock.method(User, "findById", id => { assert.equal(id, USER_ID); return query(joined); });
  return buildJournalWeeklyReport(entries, reasons, joined, days);
}
function apiKey(t) {
  const previous = process.env.API_KEY;
  process.env.API_KEY = "fixture-key-not-real";
  t.after(() => { if (previous === undefined) delete process.env.API_KEY; else process.env.API_KEY = previous; });
}
function noAiSideEffects(t) {
  t.mock.method(globalThis, "fetch", () => assert.fail("Reading reports must not call an AI provider"));
  t.mock.method(JournalWeeklySummary, "findOneAndUpdate", () => assert.fail("Reading reports must not write cache"));
}

test("six logged days mean 86% consistency independently of a five-day streak", () => {
  const stats = computeJournalWeeklyStats([0, 1, 2, 3, 4, 6].map(offset => entry(offset)), days);
  assert.equal(stats.loggedDays, 6);
  assert.equal(stats.longestStreak, 5);
  assert.equal(stats.consistency, 86);
});

test("duplicate journal days choose the latest timestamp without inflating totals", () => {
  const stats = computeJournalWeeklyStats([
    entry(0, { updatedAt: new Date("2026-09-30T12:00:00Z"), wins: ["new", "two"] }),
    entry(0, { updatedAt: new Date("2026-09-29T12:00:00Z"), wins: ["old"] }),
    { dayKey: "2026-10-12", wins: ["future"] },
  ], days);
  assert.equal(stats.loggedDays, 1);
  assert.equal(stats.stats.wins.total, 2);
});

test("missing or invalid ratings stay unrecorded instead of becoming a fabricated 50", () => {
  const stats = computeJournalWeeklyStats([entry(0, { energyLevel: null, overallRating: "" }), entry(1, { energyLevel: 0, overallRating: true })], days);
  assert.equal(stats.stats.energy.avg, null);
  assert.equal(stats.stats.rating.avg, null);
  assert.equal(stats.stats.rating.highest.value, null);
  assert.equal(stats.weeklyScore, null);
  const mixed = computeJournalWeeklyStats([entry(0, { energyLevel: null }), entry(1, { energyLevel: "88" })], days);
  assert.equal(mixed.stats.energy.avg, 88);
  assert.equal(mixed.stats.energy.recordedDays, 1);
});

test("blank list fields are not wins and legacy mood casing is normalized", () => {
  const stats = computeJournalWeeklyStats([entry(0, { mood: "happy", wins: ["", " ", "Actual win", null], mistakes: [], achievement: [" "] })], days);
  assert.equal(stats.stats.wins.total, 1);
  assert.equal(stats.stats.wins.activeDays, 1);
  assert.equal(stats.stats.achievements.total, 0);
  assert.equal(stats.stats.mistakes.lowest.value, 0);
  assert.equal(stats.topMood.label, "Happy");
});

test("midnight-spanning bedtime averages and sleep duration are mathematically valid", () => {
  assert.equal(averageReportTime(["23:30", "00:30"]), "00:00");
  assert.equal(averageReportTime(["06:00", "18:00"]), "");
  assert.equal(averageReportTime(["25:00", "garbage", null]), "");
  const stats = computeJournalWeeklyStats([entry(0, { sleepTime: "23:30", wakeUpTime: "07:00" }), entry(1, { sleepTime: "00:30", wakeUpTime: "07:00" })], days);
  assert.equal(stats.stats.sleep.avgDuration, "7h 00m");
});

test("Journal demo metrics, missed dates, and streaks come from the same sample entries", () => {
  const first = DEMO_JOURNAL_REPORTS["2026-04-27"];
  assert.equal(first.loggedDays, 6);
  assert.equal(first.longestStreak, 6);
  assert.equal(first.consistency, 86);
  assert.equal(first.stats.wins.total, 14);
  assert.equal(first.stats.energy.avg, 76);
  for (const report of Object.values(DEMO_JOURNAL_REPORTS)) {
    assert.equal(report.loggedDays + report.missedDays.length, 7);
    assert.equal(report.consistency, Math.round(report.loggedDays / 7 * 100));
  }
  assert.equal(DEMO_JOURNAL_REPORTS["2026-04-20"].longestStreak, 2);
});

test("partial report excludes pre-account, unfinished today, and future dates", async t => {
  fixture(t, []);
  const weekDays = ["2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-09", "2026-10-10", "2026-10-11"];
  const joined = { createdAt: new Date("2026-10-07T00:00:00+05:30") };
  const report = buildJournalWeeklyReport([{ dayKey: weekDays[3], wins: [] }, { dayKey: weekDays[6] }], [{ dayKey: weekDays[4], reason: "Travel" }], joined, weekDays);
  assert.equal(report.expectedDays, 3);
  assert.equal(report.loggedDays, 1);
  assert.equal(report.consistency, 33);
  assert.deepEqual(report.missedDays.map(day => day.date), [weekDays[2], weekDays[4]]);
  assert.equal(report.missedDays[1].reason, "Travel");
  assert.equal(report.status, "Draft");
  const withToday = buildJournalWeeklyReport([{ dayKey: weekDays[5] }], [], joined, weekDays);
  assert.equal(withToday.expectedDays, 4);
});

test("report for a new account is empty without marking pre-account days missed", async t => {
  fixture(t, []);
  const report = buildJournalWeeklyReport([], [], { createdAt: new Date() }, days);
  assert.equal(report.expectedDays, 0);
  assert.equal(report.consistency, 0);
  assert.deepEqual(report.missedDays, []);
});

test("imported owned journals remain visible without inventing pre-account missed days", async t => {
  fixture(t);
  const migrated = { createdAt: new Date("2026-10-08T00:00:00+05:30") };
  const report = buildJournalWeeklyReport([entry(0), entry(2)], [], migrated, days);
  assert.equal(report.loggedDays, 2);
  assert.equal(report.expectedDays, 2);
  assert.equal(report.stats.wins.total, 2);
  assert.deepEqual(report.missedDays, []);
});

test("fingerprints change with metrics and missed-day reasons, not response clock", async t => {
  const report = fixture(t);
  assert.equal(journalReportFingerprint(report), journalReportFingerprint({ ...report, serverNow: "new" }));
  assert.notEqual(journalReportFingerprint(report), journalReportFingerprint({ ...report, stats: { ...report.stats, wins: { ...report.stats.wins, total: 9 } } }));
  assert.notEqual(journalReportFingerprint(report), journalReportFingerprint({ ...report, missedDays: [{ date: days[1], reason: "Travel" }] }));
});

test("completed-week list includes all 12 weeks at app Monday before UTC Monday", async t => {
  t.mock.timers.enable({ apis: ["Date"], now: Date.parse("2026-10-11T18:45:00Z") });
  const weeks = completedJournalWeeks();
  assert.equal(weeks.length, 12);
  assert.equal(weeks[0][0], "2026-10-05");
  assert.equal(weeks.at(-1)[0], "2026-07-20");
});

test("invalid and future report weeks are rejected before querying or billing", async t => {
  t.mock.timers.enable({ apis: ["Date"], now: Date.parse("2026-10-09T18:45:00Z") });
  t.mock.method(Journal, "find", () => assert.fail("Invalid week must not query"));
  for (const week of ["2026-02-31", "2026-02-29", ["2026-10-05"], "", "2026-10-12"]) {
    for (const handler of [getJournalWeeklyReport, generateJournalAiSummary]) {
      assert.equal((await call(handler, request({ query: { week } }))).status, 400);
    }
  }
});

test("detail and picker metrics agree, query only the authenticated user's range", async t => {
  fixture(t, [0, 1, 2, 3, 4, 6].map(offset => entry(offset)));
  const detail = (await call(getJournalWeeklyReport)).body;
  const list = (await call(getJournalSummaries)).body;
  assert.equal(list.length, 1);
  assert.equal(list[0].id, detail.id);
  for (const field of ["loggedDays", "expectedDays", "consistency", "weeklyScore", "longestStreak"]) assert.equal(list[0][field], detail[field]);
  assert.deepEqual(detail.missedDays.map(day => day.date), [days[5]]);
});

test("database read failures remain errors, never empty successful history", async t => {
  fixture(t);
  t.mock.method(Journal, "find", () => ({ lean: async () => { throw new Error("Database unavailable"); } }));
  assert.equal((await call(getJournalWeeklyReport)).status, 500);
  assert.equal((await call(getJournalSummaries)).status, 500);
});

test("GET returns a fresh AI cache without credentials, quota writes or upstream calls", async t => {
  const report = fixture(t); noAiSideEffects(t);
  const previous = process.env.API_KEY; delete process.env.API_KEY;
  t.after(() => { if (previous !== undefined) process.env.API_KEY = previous; });
  t.mock.method(JournalWeeklySummary, "findOne", filter => {
    assert.equal(filter.userId, USER_ID);
    assert.deepEqual(filter.$or, [{ weekStart: WEEK }, { weekId: WEEK }]);
    return query({ aiSummary: "Saved analysis", sourceHash: journalReportFingerprint(report) });
  });
  const result = await call(generateJournalAiSummary);
  assert.equal(result.status, 200);
  assert.equal(result.body.aiSummary, "Saved analysis");
  assert.equal(result.body.needsGeneration, false);
});

test("legacy stale and missing caches are readable without auto-generation", async t => {
  fixture(t); noAiSideEffects(t);
  t.mock.method(JournalWeeklySummary, "findOne", () => query({ aiSummary: "Old analysis" }));
  const stale = await call(generateJournalAiSummary);
  assert.equal(stale.body.stale, true);
  assert.equal(stale.body.needsGeneration, true);
  t.mock.method(JournalWeeklySummary, "findOne", () => query(null));
  const missing = await call(generateJournalAiSummary);
  assert.equal(missing.status, 200);
  assert.equal(missing.body.aiSummary, null);
  assert.equal(missing.body.needsGeneration, true);
});

test("explicit generation refuses empty weeks or missing credentials without calling a provider", async t => {
  fixture(t, []);
  t.mock.method(JournalWeeklySummary, "findOne", () => query(null));
  noAiSideEffects(t);
  assert.equal((await call(generateJournalAiSummary, request({ method: "POST" }))).status, 400);
  t.mock.method(Journal, "find", () => query([entry(0)]));
  const previous = process.env.API_KEY; delete process.env.API_KEY;
  t.after(() => { if (previous !== undefined) process.env.API_KEY = previous; });
  assert.equal((await call(generateJournalAiSummary, request({ method: "POST" }))).status, 503);
});

test("non-forced POST reuses fresh cache and legacy explicit regeneration still works", async t => {
  const report = fixture(t); apiKey(t);
  t.mock.method(JournalWeeklySummary, "findOne", () => query({ aiSummary: "Fresh", sourceHash: journalReportFingerprint(report) }));
  let requests = 0;
  t.mock.method(globalThis, "fetch", async () => {
    requests++;
    return { ok: true, json: async () => ({ choices: [{ message: { content: "Regenerated" } }] }) };
  });
  t.mock.method(JournalWeeklySummary, "findOneAndUpdate", async () => ({}));
  assert.equal((await call(generateJournalAiSummary, request({ method: "POST" }))).body.aiSummary, "Fresh");
  assert.equal(requests, 0);
  assert.equal((await call(generateJournalAiSummary, request({ query: { week: WEEK, regenerate: "true" } }))).body.aiSummary, "Regenerated");
  assert.equal(requests, 1);
});

test("POST coalesces concurrent same-week requests and persists validated, mirrored cache", async t => {
  fixture(t); apiKey(t);
  t.mock.method(JournalWeeklySummary, "findOne", () => query(null));
  let requests = 0, writes = 0;
  t.mock.method(globalThis, "fetch", async (url, options) => {
    requests++;
    const prompt = JSON.parse(options.body);
    assert.match(prompt.messages[0].content, /never invent causes/);
    assert.doesNotMatch(prompt.messages[1].content, /raw narrative/);
    await new Promise(resolve => setTimeout(resolve, 10));
    return { ok: true, json: async () => ({ choices: [{ message: { content: "Generated analysis" } }] }) };
  });
  t.mock.method(JournalWeeklySummary, "findOneAndUpdate", async (filter, update, options) => {
    writes++;
    assert.equal(filter.userId, USER_ID);
    assert.equal(update.$set.weekStart, WEEK);
    assert.equal(update.$set.weekId, WEEK);
    assert.match(update.$set.sourceHash, /^[a-f0-9]{64}$/);
    assert.equal(options.runValidators, true);
    return update.$set;
  });
  const results = await Promise.all([call(generateJournalAiSummary, request({ method: "POST" })), call(generateJournalAiSummary, request({ method: "POST" }))]);
  assert.equal(requests, 1);
  assert.equal(writes, 1);
  assert.equal(results[0].body.aiSummary, "Generated analysis");
  assert.equal(results[1].body.aiSummary, "Generated analysis");
});

test("upstream failures and empty content do not overwrite good cache, retry works", async t => {
  fixture(t); apiKey(t);
  t.mock.method(JournalWeeklySummary, "findOne", () => query({ aiSummary: "Previous" }));
  let writes = 0;
  t.mock.method(JournalWeeklySummary, "findOneAndUpdate", async () => { writes++; return {}; });
  const req = request({ method: "POST", body: { regenerate: true } });
  t.mock.method(globalThis, "fetch", async () => { throw new Error("Provider unavailable"); });
  assert.equal((await call(generateJournalAiSummary, req)).status, 502);
  t.mock.method(globalThis, "fetch", async () => ({ ok: true, json: async () => ({ choices: [] }) }));
  assert.equal((await call(generateJournalAiSummary, req)).status, 502);
  assert.equal(writes, 0);
  t.mock.method(globalThis, "fetch", async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: "Retry success" } }] }) }));
  assert.equal((await call(generateJournalAiSummary, req)).body.aiSummary, "Retry success");
  assert.equal(writes, 1);
});

test("generation returns valid analysis with a warning when cache persistence fails", async t => {
  fixture(t); apiKey(t);
  t.mock.method(JournalWeeklySummary, "findOne", () => query(null));
  t.mock.method(globalThis, "fetch", async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: "Valid analysis" } }] }) }));
  t.mock.method(JournalWeeklySummary, "findOneAndUpdate", async () => { throw new Error("Storage unavailable"); });
  const result = await call(generateJournalAiSummary, request({ method: "POST" }));
  assert.equal(result.status, 200);
  assert.equal(result.body.aiSummary, "Valid analysis");
  assert.equal(result.body.persisted, false);
  assert.match(result.body.warning, /could not be saved/);
});

test("cross-instance cache insert conflicts retry an owner-scoped validated update", async t => {
  fixture(t); apiKey(t);
  t.mock.method(JournalWeeklySummary, "findOne", () => query(null));
  t.mock.method(globalThis, "fetch", async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: "Valid analysis" } }] }) }));
  let calls = 0;
  t.mock.method(JournalWeeklySummary, "findOneAndUpdate", async (filter, update, options) => {
    assert.equal(filter.userId, USER_ID); assert.equal(options.runValidators, true);
    if (++calls === 1) throw Object.assign(new Error("Duplicate key"), { code: 11000 });
    assert.equal(options.upsert, undefined); return update.$set;
  });
  assert.equal((await call(generateJournalAiSummary, request({ method: "POST" }))).body.persisted, true);
  assert.equal(calls, 2);
});

test("schema validates optional source fingerprint and mirrors legacy weekId with Mongoose 9", async () => {
  const doc = new JournalWeeklySummary({ userId: USER_ID, weekStart: WEEK, aiSummary: "Analysis" });
  await doc.validate();
  assert.equal(doc.weekId, WEEK);
  doc.sourceHash = "invalid";
  await assert.rejects(doc.validate(), /sourceHash/);
});

test("cache GETs bypass AI quota while POST and legacy explicit regeneration are limited", async t => {
  const previous = process.env.ARCJET_KEY; delete process.env.ARCJET_KEY;
  t.after(() => { if (previous !== undefined) process.env.ARCJET_KEY = previous; });
  const route = weeklyRoutes.stack.find(layer => layer.route?.path === "/journal/ai-summary" && layer.route.methods.get).route;
  const limiter = route.stack[0].handle;
  const post = weeklyRoutes.stack.find(layer => layer.route?.path === "/journal/ai-summary" && layer.route.methods.post).route;
  assert.equal(post.stack.length, 2);
  let passes = 0, status = 200;
  const res = { setHeader() {}, status(code) { status = code; return this; }, json() {} };
  const req = request({ user: { id: "weekly-quota-fixture" }, query: { week: WEEK } });
  for (let i = 0; i < 20; i++) await limiter(req, res, () => passes++);
  assert.equal(passes, 20); assert.equal(status, 200);
  req.query.regenerate = "true";
  // Use the route's configured quota; no external Arcjet or provider calls.
  for (let i = 0; i < Number(process.env.JOURNAL_WEEKLY_AI_RATE_LIMIT_DAILY_MAX || 2) + 1; i++) await limiter(req, res, () => {});
  assert.equal(status, 429);
});
