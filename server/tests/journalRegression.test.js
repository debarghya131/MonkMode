import test from "node:test";
import assert from "node:assert/strict";
import Journal from "../models/Journal.js";
import JournalMissedReason from "../models/JournalMissedReason.js";
import User from "../models/User.js";
import { createJournalEntry, getJournalEntries } from "../controllers/journalController.js";
import { getMissedJournalDays, saveJournalMissedReason } from "../controllers/weeklyReportController.js";
import { journalWeekDays, parseJournalDayKey } from "../utils/journalCalendarUtils.js";
import { journalDayKey, formatJournalDay, demoJournalConsistency } from "../../client/src/dashboard/journal/journalUtils.js";

const USER_ID = "000000000000000000000001";
const request = (extra = {}) => ({ user: { id: USER_ID }, query: {}, body: {}, ...extra });
const query = value => ({ select() { return this; }, lean: async () => value });
async function call(handler, req = request()) {
  let status = 200;
  let body;
  await handler(req, { status(code) { status = code; return this; }, json(value) { body = value; return this; } });
  return { status, body };
}
function stubAccount(t, joined = "2026-10-07T00:00:00+05:30", entry = null) {
  t.mock.timers.enable({ apis: ["Date"], now: Date.parse("2026-10-09T18:45:00Z") });
  t.mock.method(User, "findById", id => { assert.equal(id, USER_ID); return query({ createdAt: new Date(joined) }); });
  t.mock.method(Journal, "findOne", filter => { assert.equal(filter.userId, USER_ID); return query(entry); });
}

test("missed days use Kolkata midnight, exclude today, pre-account days and submitted days", async t => {
  stubAccount(t);
  t.mock.method(Journal, "find", filter => {
    assert.equal(filter.userId, USER_ID);
    assert.deepEqual(filter.dayKey, { $gte: "2026-10-05", $lte: "2026-10-11" });
    return query([{ dayKey: "2026-10-08" }]);
  });
  t.mock.method(JournalMissedReason, "find", filter => {
    assert.equal(filter.userId, USER_ID);
    return query([{ dayKey: "2026-10-09", reason: "Travel" }]);
  });
  const result = await call(getMissedJournalDays);
  assert.equal(result.status, 200);
  assert.deepEqual(result.body.map(day => day.date), ["2026-10-07", "2026-10-09"]);
  assert.equal(result.body[1].reason, "Travel");
});

test("a newly registered account has no missed journal days", async t => {
  stubAccount(t, "2026-10-10T00:05:00+05:30");
  t.mock.method(Journal, "find", () => query([]));
  t.mock.method(JournalMissedReason, "find", () => query([]));
  assert.deepEqual((await call(getMissedJournalDays)).body, []);
});

test("Monday just after Kolkata midnight uses the new week, not Sunday's UTC week", async t => {
  t.mock.timers.enable({ apis: ["Date"], now: Date.parse("2026-10-11T18:45:00Z") });
  assert.deepEqual(journalWeekDays(), ["2026-10-12", "2026-10-13", "2026-10-14", "2026-10-15", "2026-10-16", "2026-10-17", "2026-10-18"]);
});

test("journal calendar validation rejects impossible dates and supports leap days", () => {
  for (const day of ["2026-02-31", "2026-02-29", "2026-13-01", "2026-00-10", ["2026-10-09"], null]) {
    assert.equal(parseJournalDayKey(day), null);
  }
  assert.ok(parseJournalDayKey("2028-02-29"));
});

test("invalid missed-day week is rejected before querying records", async t => {
  t.mock.method(Journal, "find", () => assert.fail("Invalid week must not query"));
  assert.equal((await call(getMissedJournalDays, request({ query: { week: "2026-02-31" } }))).status, 400);
});

test("invalid and oversized missed reasons are rejected before database writes", async t => {
  t.mock.method(JournalMissedReason, "findOneAndUpdate", () => assert.fail("Invalid reason must not write"));
  for (const body of [
    { dayKey: "2026-02-31", reason: "Travel" },
    { dayKey: "2026-10-09", reason: "x".repeat(1001) },
    { dayKey: "2026-10-09", reason: "   " },
    { dayKey: ["2026-10-09"], reason: "Travel" }
  ]) assert.equal((await call(saveJournalMissedReason, request({ body }))).status, 400);
});

test("today, future days, pre-account days and submitted days cannot receive missed reasons", async t => {
  stubAccount(t);
  t.mock.method(JournalMissedReason, "findOneAndUpdate", () => assert.fail("Not a missed day"));
  for (const dayKey of ["2026-10-10", "2026-10-11", "2026-10-06"]) {
    assert.equal((await call(saveJournalMissedReason, request({ body: { dayKey, reason: "Travel" } }))).status, 400);
  }
  t.mock.method(Journal, "findOne", () => query({ _id: "entry" }));
  assert.equal((await call(saveJournalMissedReason, request({ body: { dayKey: "2026-10-09", reason: "Travel" } }))).status, 400);
});

test("valid missed reason is trimmed, user scoped and saved with schema validators enabled", async t => {
  stubAccount(t);
  t.mock.method(JournalMissedReason, "findOneAndUpdate", async (filter, update, options) => {
    assert.deepEqual(filter, { userId: USER_ID, dayKey: "2026-10-09" });
    assert.equal(update.reason, "Travel");
    assert.equal(options.runValidators, true);
    assert.equal(options.upsert, true);
    return { dayKey: filter.dayKey, reason: update.reason };
  });
  const result = await call(saveJournalMissedReason, request({ body: { dayKey: "2026-10-09", reason: " Travel " } }));
  assert.equal(result.status, 200);
  assert.equal(result.body.reason, "Travel");
});

test("invalid journal dates cannot silently overwrite today's entry", async t => {
  t.mock.method(Journal, "create", () => assert.fail("Invalid date must not create"));
  for (const date of ["invalid", "2026-02-31", "", null]) {
    assert.equal((await call(createJournalEntry, request({ body: { date, summary: "Test" } }))).status, 400);
  }
});

test("omitting browser date saves to the backend's current Kolkata day", async t => {
  t.mock.timers.enable({ apis: ["Date"], now: Date.parse("2026-10-09T18:45:00Z") });
  t.mock.method(Journal, "findOne", async filter => { assert.equal(filter.userId, USER_ID); return null; });
  t.mock.method(Journal, "create", async doc => { assert.equal(doc.dayKey, "2026-10-10"); return doc; });
  assert.equal((await call(createJournalEntry, request({ body: { summary: "Test", mood: "Calm" } }))).status, 201);
});

test("today lookup uses authoritative dayKey with a legacy date fallback", async t => {
  t.mock.timers.enable({ apis: ["Date"], now: Date.parse("2026-10-09T18:45:00Z") });
  t.mock.method(Journal, "find", filter => {
    assert.equal(filter.userId, USER_ID);
    assert.equal(filter.$or[0].dayKey, "2026-10-10");
    return { sort: async () => [] };
  });
  assert.equal((await call(getJournalEntries, request({ query: { today: "true" } }))).status, 200);
});

test("journal ranges reject invalid or reversed dates", async () => {
  for (const query of [{ from: "2026-02-31" }, { from: "2026-10-10", to: "2026-10-09" }]) {
    assert.equal((await call(getJournalEntries, request({ query }))).status, 400);
  }
});

test("client dates follow the provided backend timezone and display calendar dates without shifting", () => {
  assert.equal(journalDayKey(new Date("2026-10-09T18:45:00Z"), "Asia/Kolkata"), "2026-10-10");
  assert.equal(journalDayKey(new Date("2026-10-09T18:45:00Z"), "America/Los_Angeles"), "2026-10-09");
  assert.equal(formatJournalDay("2026-10-10", { weekday: "short", month: "short", day: "numeric" }), "Sat, Oct 10");
});

test("demo consistency is derived from distinct sample days instead of an empty lifetime", () => {
  assert.deepEqual(demoJournalConsistency([{ date: "2026-04-11" }, { date: "2026-04-15" }, { date: "2026-04-15" }]), {
    lifetimeLoggedDays: 2, lifetimeExpectedDays: 5, lifetimeConsistency: 40
  });
});
