import test from "node:test";
import assert from "node:assert/strict";
import Journal from "../models/Journal.js";
import { createJournalEntry, getJournalSummary, getJournalHeatmap, getJournalEntryById, updateJournalEntry, deleteJournalEntry } from "../controllers/journalController.js";
import { validJournalSummary, validJournalEntry, validJournalEntries, validJournalTemplates, validJournalMissedDays, journalFailureMessage } from "../../client/src/dashboard/journal/journalResponse.js";
import { overviewValidators, validOverviewHeatmap, toCalendarHeatmapValues } from "../../client/src/dashboard/overview/overviewResponse.js";
import { execFileSync } from "node:child_process";

const USER = "000000000000000000000001", ID = "000000000000000000000002";
const NOW = "2026-10-11T06:00:00.000Z", DAY = "2026-10-11";
const req = extra => ({ user: { id: USER }, query: {}, body: {}, params: { id: ID }, ...extra });
const query = value => ({ select: async () => value });
async function call(handler, request = req()) { let status = 200, body; await handler(request, { status(value) { status = value; return this; }, json(value) { body = value; return this; } }); return { status, body }; }
const entry = (extra = {}) => ({ _id: ID, dayKey: DAY, date: NOW, updatedAt: NOW, mood: "Calm", summary: "Reflection", energyLevel: 50, overallRating: 50, wins: [], customFields: [], ...extra });
const summary = () => ({ date: DAY, timezone: "Asia/Kolkata", serverNow: NOW, todayLogged: true,
  daysThisWeek: 1, achievementsThisWeek: 0, winsThisWeek: 0, lifetimeLoggedDays: 1, lifetimeExpectedDays: 1, lifetimeConsistency: 100, currentStreakDays: 1 });
const now = t => t.mock.timers.enable({ apis: ["Date"], now: Date.parse(NOW) });

test("stale draft day is rejected before any journal lookup/write", async t => {
  now(t); t.mock.method(Journal, "findOne", () => assert.fail("stale draft must not query"));
  assert.equal((await call(createJournalEntry, req({ body: { expectedDayKey: "2026-10-10", summary: "Old draft" } }))).status, 409);
  for (const value of [null, {}, [DAY], "2026-02-30"]) assert.equal((await call(createJournalEntry, req({ body: { expectedDayKey: value, summary: "Draft" } }))).status, 400);
});
test("guarded create cannot overwrite an entry saved in another tab", async t => {
  now(t); t.mock.method(Journal, "findOne", async filter => { assert.equal(filter.userId, USER); return entry({ save() { assert.fail("must not overwrite"); } }); });
  assert.equal((await call(createJournalEntry, req({ body: { expectedDayKey: DAY, expectedUpdatedAt: null, summary: "Draft" } }))).status, 409);
});
test("guarded same-day create stays owner scoped and does not persist guard fields", async t => {
  now(t); t.mock.method(Journal, "findOne", async () => null);
  t.mock.method(Journal, "create", async doc => { assert.equal(doc.userId, USER); assert.equal(doc.dayKey, DAY); assert.equal(Object.hasOwn(doc, "expectedDayKey"), false); assert.equal(Object.hasOwn(doc, "expectedUpdatedAt"), false); return doc; });
  assert.equal((await call(createJournalEntry, req({ body: { expectedDayKey: DAY, expectedUpdatedAt: null, summary: "Draft" } }))).status, 201);
});
test("duplicate-key race never updates the winner for a guarded create", async t => {
  now(t); let reads = 0; t.mock.method(Journal, "findOne", async () => { reads++; return null; });
  t.mock.method(Journal, "create", async () => { throw Object.assign(new Error("duplicate"), { code: 11000 }); });
  assert.equal((await call(createJournalEntry, req({ body: { expectedUpdatedAt: null, summary: "Draft" } }))).status, 409);
  assert.equal(reads, 2);
});
test("guarded edit adopts a legacy date-only record without creating a duplicate", async t => {
  now(t); let reads = 0;
  t.mock.method(Journal, "findOne", async filter => {
    reads++;
    if (reads === 1) return null;
    assert.equal(filter.userId, USER); assert.deepEqual(filter.dayKey, { $exists: false });
    assert.equal(filter.date.$gte.getDate(), 11);
    return entry({ dayKey: undefined });
  });
  t.mock.method(Journal, "create", () => assert.fail("legacy entry must not be duplicated"));
  t.mock.method(Journal, "findOneAndUpdate", async (filter, update) => {
    assert.deepEqual(filter.dayKey, { $exists: false }); assert.equal(filter.userId, USER);
    assert.equal(filter.updatedAt.toISOString(), NOW); assert.equal(update.$set.dayKey, DAY); return entry();
  });
  assert.equal((await call(createJournalEntry, req({ body: { expectedUpdatedAt: NOW, summary: "Reflection" } }))).status, 200);
});
test("guarded edit atomically checks the previous timestamp and advances the revision", async t => {
  now(t); t.mock.method(Journal, "findOne", async () => entry());
  t.mock.method(Journal, "findOneAndUpdate", async (filter, update, options) => {
    assert.equal(filter.userId, USER); assert.equal(filter._id, ID); assert.equal(filter.updatedAt.toISOString(), NOW);
    assert.equal(update.$set.summary, "New reflection"); assert.ok(update.$set.updatedAt.getTime() > Date.parse(NOW));
    assert.equal(options.runValidators, true); assert.equal(options.timestamps, false); return entry({ summary: update.$set.summary });
  });
  assert.equal((await call(createJournalEntry, req({ body: { expectedUpdatedAt: NOW, summary: "New reflection" } }))).status, 200);
});
test("stale edit or deleted document fails safely instead of replacing newer work", async t => {
  now(t); t.mock.method(Journal, "findOne", async () => entry()); t.mock.method(Journal, "findOneAndUpdate", async () => null);
  assert.equal((await call(createJournalEntry, req({ body: { expectedUpdatedAt: NOW, summary: "Draft" } }))).status, 409);
  t.mock.method(Journal, "findOne", async () => null);
  assert.equal((await call(createJournalEntry, req({ body: { expectedUpdatedAt: NOW, summary: "Draft" } }))).status, 409);
});
test("invalid revision and supplied mood values fail before persistence", async t => {
  now(t); t.mock.method(Journal, "findOne", () => assert.fail("invalid payload must not query"));
  for (const body of [{ expectedUpdatedAt: {} }, { expectedUpdatedAt: "invalid" }, { mood: "invented" }, { mood: {} }, { wins: [{}] },
    { energyLevel: true }, { overallRating: [50] }, { wakeUpTime: "25:10" }, { customFields: [null] }]) {
    assert.equal((await call(createJournalEntry, req({ body: { summary: "Draft", ...body } }))).status, 400);
  }
});
test("journal database failures and revision races expose no internal diagnostics", async t => {
  now(t); t.mock.method(Journal, "findOne", async () => { throw new Error("Private database diagnostic"); });
  const unavailable = await call(createJournalEntry, req({ body: { summary: "Reflection" } }));
  assert.equal(unavailable.status, 503); assert.doesNotMatch(unavailable.body.message, /Private/);
  t.mock.method(Journal, "findOne", async () => entry());
  t.mock.method(Journal, "findOneAndUpdate", async () => { throw Object.assign(new Error("Private duplicate key"), { code: 11000 }); });
  const conflict = await call(createJournalEntry, req({ body: { summary: "Reflection", expectedUpdatedAt: NOW } }));
  assert.equal(conflict.status, 409); assert.doesNotMatch(conflict.body.message, /Private/);
});
test("journal reads/edits/deletes cannot reach another account's entry", async t => {
  now(t); t.mock.method(Journal, "findOne", async filter => { assert.equal(filter.userId, USER); assert.equal(filter._id, ID); return null; });
  for (const handler of [getJournalEntryById, updateJournalEntry, deleteJournalEntry]) assert.equal((await call(handler)).status, 404);
});
test("past journals remain locked for editing and deletion", async t => {
  now(t); t.mock.method(Journal, "findOne", async () => entry({ dayKey: "2026-10-10", save() { assert.fail("past write"); } }));
  for (const handler of [updateJournalEntry, deleteJournalEntry]) assert.equal((await call(handler)).status, 403);
});
test("journal summary deduplicates legacy days and excludes invalid/future lifetime dates", async t => {
  now(t); t.mock.method(Journal, "findOne", filter => { assert.equal(filter.userId, USER); assert.equal(filter.$or[0].dayKey, DAY); return query({ _id: ID }); });
  t.mock.method(Journal, "find", () => query([entry({ updatedAt: "2026-10-11T01:00:00Z", wins: ["old"] }), entry({ wins: ["new", "newer"] })]));
  t.mock.method(Journal, "countDocuments", async () => 2);
  t.mock.method(Journal, "aggregate", async pipeline => pipeline.some(stage => stage.$group?._id === "$mood") ? []
    : [{ _id: DAY }, { _id: DAY }, { _id: "2026-10-12" }, { _id: "2026-02-30" }, { _id: null }]);
  const { body } = await call(getJournalSummary);
  assert.equal(body.daysThisWeek, 1); assert.equal(body.winsThisWeek, 2); assert.equal(body.lifetimeLoggedDays, 1); assert.equal(body.lifetimeConsistency, 100);
  assert.equal(validJournalSummary(body), true); assert.equal(overviewValidators.journal(body), true);
});
test("journal heatmap rejects partial, object and impossible year filters", async t => {
  t.mock.method(Journal, "aggregate", () => assert.fail("invalid year must not query"));
  for (const year of ["2026junk", "2026.5", "", {}, ["2026"], "1969", "3001"]) assert.equal((await call(getJournalHeatmap, req({ query: { year } }))).status, 400);
});
test("journal validators accept typed empty/populated records and preserve zero scores", () => {
  assert.equal(validJournalEntry(entry({ energyLevel: 0, overallRating: 0 })), true);
  assert.equal(validJournalEntries([]), true); assert.equal(validJournalEntries({ page: 1, limit: 14, total: 0, totalPages: 1, entries: [] }, 1), true);
  assert.equal(validJournalTemplates({ templates: [] }), true); assert.equal(validJournalMissedDays([]), true); assert.equal(validJournalSummary(summary()), true);
  assert.equal(validJournalEntries([entry()]), true);
});
test("journal validators reject malformed entries, paging, templates and missed reasons", () => {
  for (const extra of [{ summary: {} }, { wins: [{}] }, { customFields: [null] }, { customFields: [{ title: "Title" }] }, { date: {} }, { energyLevel: "50" }, { mood: {} }, { updatedAt: {} }]) assert.equal(validJournalEntry(entry(extra)), false);
  for (const data of [{}, { entries: [null] }, { entries: "not-an-array" }]) assert.equal(validJournalEntries(data), false);
  assert.equal(validJournalEntries({ page: 2, limit: 14, total: 1, totalPages: 9, entries: [entry()] }, 1), false);
  assert.equal(validJournalTemplates({ templates: [null] }), false);
  assert.equal(validJournalTemplates({ templates: [{ title: " " }] }), false);
  assert.equal(validJournalMissedDays([{ date: DAY, label: {}, reason: "reason" }]), false);
  assert.equal(validJournalMissedDays([{ date: DAY, label: "Sunday", reason: {} }]), false);
  assert.equal(validJournalSummary({ ...summary(), timezone: "Invalid/Zone" }), false);
  assert.equal(validJournalSummary({ ...summary(), daysThisWeek: 8 }), false);
});
test("overview summaries distinguish valid zero activity from malformed nested data", () => {
  assert.equal(overviewValidators.tasks({ today: { total: 0, completed: 0, pending: 0, missed: 0, important: 0 } }), true);
  assert.equal(overviewValidators.habits({ completedToday: 0, expectedToday: 0 }), true);
  assert.equal(overviewValidators.goals({ totalGoals: 0, completedGoals: 0, totalSubgoals: 0, completedSubgoals: 0 }), true);
  assert.equal(overviewValidators.gym({ completedProgress: 0, totalProgress: 0, pendingUpdates: 0, progressUpdatesToday: 0, lastMeasurementCheckInDate: null, lastPicUploadedDate: null }), true);
  for (const validate of Object.values(overviewValidators)) for (const invalid of [null, {}, [], { today: null }]) assert.equal(validate(invalid), false);
  assert.equal(overviewValidators.habits({ completedToday: 2, expectedToday: 1 }), false);
  assert.equal(overviewValidators.goals({ totalGoals: 1, completedGoals: 2, totalSubgoals: 0, completedSubgoals: 0 }), false);
});
test("all heatmaps accept empty activity and typed January 1 contributions", () => {
  const rows = { journal: { count: 1, entries: 1 }, todo: { count: 4, total: 1, completed: 1, missed: 0, pending: 0 },
    habit: { count: 4, total: 1, completed: 1, missed: 0, pending: 0 }, goal: { count: 1, completedSubgoals: 1 },
    gym: { count: 1, updates: 1, completedProgress: 1, exercises: 1, measurement: 0, gallery: 0 } };
  for (const [kind, row] of Object.entries(rows)) {
    assert.equal(validOverviewHeatmap({ values: [], years: [] }, kind), true);
    const value = { date: "2026-01-01", ...row };
    assert.equal(validOverviewHeatmap({ values: [value], years: [2026] }, kind), true);
    assert.equal(validOverviewHeatmap({ values: [value, value], years: [2026] }, kind), false);
    assert.equal(validOverviewHeatmap({ values: [{ ...value, date: "2026-02-30" }], years: [2026] }, kind), false);
    assert.equal(validOverviewHeatmap({ values: [null], years: [2026] }, kind), false);
    assert.equal(validOverviewHeatmap({ values: [value], years: [{}] }, kind), false);
  }
});
test("object-valued journal errors never become React children", () => {
  assert.equal(journalFailureMessage({ response: { data: { message: {}, error: {} } } }, "Safe fallback"), "Safe fallback");
  assert.equal(journalFailureMessage({ response: { data: { message: "Conflict" } } }, "Safe fallback"), "Conflict");
});
test("heatmap dates stay on their calendar day in positive, negative and DST timezones", () => {
  const dates = ["2026-01-01", "2026-03-08", "2026-03-09", "2026-11-01", "2026-11-02", "2026-12-31"];
  const source = dates.map(date => ({ date, count: 1 }));
  assert.deepEqual(toCalendarHeatmapValues(source).map(value => value.dayKey), dates);
  assert.equal(source[0].date, "2026-01-01");
  assert.equal(toCalendarHeatmapValues(source)[0].date.getHours(), 12);
  const moduleUrl = new URL("../../client/src/dashboard/overview/overviewResponse.js", import.meta.url).href;
  for (const timezone of ["UTC", "Asia/Kolkata", "America/Los_Angeles", "Europe/Berlin"]) {
    execFileSync(process.execPath, ["--input-type=module", "-e", `import assert from 'node:assert/strict';import {toCalendarHeatmapValues} from '${moduleUrl}';const days=${JSON.stringify(dates)};for(const row of toCalendarHeatmapValues(days.map(date=>({date,count:1}))))assert.equal([row.date.getFullYear(),String(row.date.getMonth()+1).padStart(2,'0'),String(row.date.getDate()).padStart(2,'0')].join('-'),row.dayKey);`], { env: { ...process.env, TZ: timezone } });
  }
});
