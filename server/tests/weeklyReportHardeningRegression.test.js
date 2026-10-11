import test from "node:test";
import assert from "node:assert/strict";
import { validWeeklySummaries, validWeeklyReport, validWeeklyAiResponse, weeklyFailureMessage } from "../../client/src/dashboard/weeklyreport/weeklyReportResponse.js";
import { DEMO_JOURNAL_REPORTS, DEMO_JOURNAL_SUMMARIES } from "../../client/src/dashboard/weeklyreport/journalDemoReports.js";
import { DEMO_TODO_REPORTS, DEMO_TODO_SUMMARIES } from "../../client/src/dashboard/weeklyreport/todoDemoReports.js";
import { DEMO_HABIT_REPORTS, DEMO_HABIT_SUMMARIES } from "../../client/src/dashboard/weeklyreport/habitDemoReports.js";
import { DEMO_GOAL_REPORTS, DEMO_GOAL_SUMMARIES } from "../../client/src/dashboard/weeklyreport/goalDemoReports.js";
import { createDemoGymReports } from "../../client/src/dashboard/weeklyreport/gymDemoReports.js";
import { buildJournalWeeklyReport } from "../utils/journalWeeklyReportUtils.js";
import { buildTodoWeeklyReport } from "../utils/todoWeeklyReportUtils.js";
import { buildHabitWeeklyReport } from "../utils/habitWeeklyReportUtils.js";
import { buildGoalWeeklyReport } from "../utils/goalWeeklyReportUtils.js";
import { buildGymWeeklyReport } from "../utils/gymWeeklyReportUtils.js";
import { getWeeksList } from "../controllers/weeklyReportController.js";
import { journalWeekDays } from "../utils/journalCalendarUtils.js";
import { reportWeekLabel, shiftReportDay } from "../../shared/journalWeeklyStats.js";

const gymReports = createDemoGymReports();
const fixtures = {
  journal: [DEMO_JOURNAL_REPORTS, DEMO_JOURNAL_SUMMARIES, value => { value.stats.energy = null; }],
  todo: [DEMO_TODO_REPORTS, DEMO_TODO_SUMMARIES, value => { value.categories[0] = null; }],
  habit: [DEMO_HABIT_REPORTS, DEMO_HABIT_SUMMARIES, value => { value.habits[0] = null; }],
  goal: [DEMO_GOAL_REPORTS, DEMO_GOAL_SUMMARIES, value => { value.goals[0] = null; }],
  gym: [gymReports, Object.values(gymReports).map(({ id, date, workoutDays, stats }) => ({ id, date, workoutDays, photoCount: stats.photoCount })), value => { value.strengthProgress[0] = null; }],
};
function leaves(value, path = []) {
  if (!value || typeof value !== "object") return [path];
  return Object.entries(value).flatMap(([key, entry]) => leaves(entry, [...path, key]));
}
function change(source, path, value) {
  const clone = structuredClone(source);
  const parent = path.slice(0, -1).reduce((row, key) => row[key], clone);
  parent[path.at(-1)] = value;
  return clone;
}
for (const [module, [reports, summaries, corrupt]] of Object.entries(fixtures)) {
  const report = Object.values(reports)[0];
  test(`${module} weekly response accepts all populated fixtures and summary rows`, () => {
    for (const row of Object.values(reports)) assert.equal(validWeeklyReport(row, module, row.id), true);
    assert.equal(validWeeklySummaries(summaries), true);
  });
  test(`${module} weekly response rejects null nested metrics or rows and wrong week`, () => {
    const invalid = structuredClone(report); corrupt(invalid);
    assert.equal(validWeeklyReport(invalid, module, report.id), false);
    for (const invalid of [null, [], {}, report]) assert.equal(validWeeklyReport(invalid, module, "2099-01-05"), false);
    for (const [key, value] of Object.entries(report)) {
      if (Array.isArray(value)) {
        assert.equal(validWeeklyReport({ ...report, [key]: {} }, module, report.id), false, key);
        assert.equal(validWeeklyReport({ ...report, [key]: [null] }, module, report.id), false, key);
      }
    }
  });
  test(`${module} weekly response rejects object-valued renderable leaves before React state`, () => {
    // aiSummary is fetched separately; metadata is not rendered by report cards.
    for (const path of leaves(report).filter(path => !["aiSummary", "serverNow", "timezone"].includes(path[0]))) {
      assert.equal(validWeeklyReport(change(report, path, { unexpected: "object" }), module, report.id), false, path.join("."));
    }
  });
  test(`${module} summary response rejects invalid rows without partially accepting the list`, () => {
    for (const invalid of [null, {}, [null], [summaries[0], null], [summaries[0], summaries[0]],
      [{ ...summaries[0], id: "2026-02-31" }], [{ ...summaries[0], date: {} }], [{ ...summaries[0], signal: {} }],
      [{ ...summaries[0], weeklyScore: NaN }], [{ ...summaries[0], photoCount: {} }]]) {
      assert.equal(validWeeklySummaries(invalid), false);
    }
  });
}

test("weekly validation preserves empty reports, zero metrics and unknown historical values", () => {
  const days = journalWeekDays("2026-09-28");
  const empty = { journal: buildJournalWeeklyReport([], [], null, days), todo: buildTodoWeeklyReport([], null, days),
    habit: buildHabitWeeklyReport([], [], days), goal: buildGoalWeeklyReport([], [], days), gym: buildGymWeeklyReport({}, days) };
  for (const [module, report] of Object.entries(empty)) assert.equal(validWeeklyReport(report, module, days[0]), true, module);
  assert.equal(empty.journal.stats.energy.avg, null);
  assert.equal(empty.goal.stats.avgProgress, null);
  assert.equal(empty.gym.nutrition, null);
  assert.equal(validWeeklySummaries([]), true);
});
test("weekly validation rejects misaligned daily calendars", () => {
  for (const module of ["todo", "habit", "gym"]) {
    const report = Object.values(fixtures[module][0])[0], key = module === "gym" ? "progressPhotos" : "dailyStats";
    const invalid = structuredClone(report); invalid[key][0].dayKey = shiftReportDay(report.id, 1);
    assert.equal(validWeeklyReport(invalid, module, report.id), false);
    assert.equal(validWeeklyReport({ ...report, [key]: [] }, module, report.id), false);
  }
});
test("weekly AI cache allows null, generation requires nonblank text, invalid values are rejected", () => {
  assert.equal(validWeeklyAiResponse({ aiSummary: null, cached: false, stale: false }), true);
  assert.equal(validWeeklyAiResponse({ aiSummary: null }, true), false);
  assert.equal(validWeeklyAiResponse({ aiSummary: "Saved analysis", cached: true }), true);
  assert.equal(validWeeklyAiResponse({ aiSummary: "New analysis", warning: "Save failed", persisted: false }, true), true);
  for (const invalid of [null, [], {}, { aiSummary: {} }, { aiSummary: 5 }, { aiSummary: false },
    { aiSummary: "" }, { aiSummary: "  " }, { aiSummary: "Text", warning: {} }, { aiSummary: "Text", stale: "false" }]) {
    assert.equal(validWeeklyAiResponse(invalid), false);
    assert.equal(validWeeklyAiResponse(invalid, true), false);
  }
});
test("weekly HTTP errors never return non-text render values", () => {
  for (const error of [null, {}, { response: { data: null } }, { response: { data: { error: {}, message: [] } } },
    { response: { data: { error: 500, message: " " } } }]) assert.equal(weeklyFailureMessage(error, "Please retry."), "Please retry.");
  assert.equal(weeklyFailureMessage({ response: { data: { error: "Safe error" } } }, "Fallback"), "Safe error");
  assert.equal(weeklyFailureMessage({ response: { data: { error: {}, message: "Safe message" } } }, "Fallback"), "Safe message");
});

function weeks() {
  let result;
  getWeeksList({}, { json(value) { result = value; }, status() { assert.fail("Unexpected week error"); } });
  return result;
}
for (const [zone, instant, monday] of [
  ["Asia/Kolkata", "2026-10-11T18:29:59Z", "2026-10-05"],
  ["Asia/Kolkata", "2026-10-11T18:30:00Z", "2026-10-12"],
  ["Asia/Kolkata", "2027-01-03T18:30:00Z", "2027-01-04"],
  ["America/New_York", "2026-11-02T04:30:00Z", "2026-10-26"],
  ["America/New_York", "2026-11-02T05:00:00Z", "2026-11-02"],
]) {
  test(`week list follows ${zone} calendar at ${instant}, including year/DST boundaries`, t => {
    const oldZone = process.env.TZ; process.env.TZ = zone;
    t.after(() => { process.env.TZ = oldZone; });
    t.mock.timers.enable({ apis: ["Date"], now: Date.parse(instant) });
    const list = weeks(); assert.equal(list.length, 12); assert.equal(list[0].id, monday);
    assert.equal(list[0].id, journalWeekDays()[0]);
    for (const [index, week] of list.entries()) {
      assert.equal(week.id, shiftReportDay(monday, -index * 7));
      assert.equal(week.date, reportWeekLabel(journalWeekDays(week.id)));
    }
  });
}
