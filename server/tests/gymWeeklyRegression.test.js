import test from "node:test";
import assert from "node:assert/strict";
import GymExerciseProgress from "../models/GymExerciseProgress.js";
import GymMeasurement from "../models/GymMeasurement.js";
import GymGalleryEntry from "../models/GymGalleryEntry.js";
import GymDietPlan from "../models/GymDietPlan.js";
import GymWeeklySummary from "../models/GymWeeklySummary.js";
import weeklyRoutes from "../routes/weeklyReportRoutes.js";
import { getGymWeeklyReport, getGymWeeklyPhotos, getGymSummaries, generateGymAiSummary } from "../controllers/weeklyReportController.js";
import { validWeeklyReport, validWeeklyGymPhotos } from "../../client/src/dashboard/weeklyreport/weeklyReportResponse.js";
import { computeGymWeeklyReport, gymReportDays, gymReportNumber, gymNutritionReference, gymReportBodyGroup } from "../../shared/gymWeeklyStats.js";
import { buildGymWeeklyReport, completedGymWeeks, gymReportFingerprint, gymAiContext } from "../utils/gymWeeklyReportUtils.js";
import { createDemoGymReports } from "../../client/src/dashboard/weeklyreport/gymDemoReports.js";
const USER = "000000000000000000000001", WEEK = "2026-09-28", days = gymReportDays(WEEK);
const clock = { today: "2026-10-10", timezone: "Asia/Kolkata" };
const exercise = extra => ({ exerciseId: "bench", exerciseName: "PRIVATE EXERCISE", notes: "PRIVATE NOTES", bodyPart: "Chest - Upper", date: days[0], sets: "3", reps: "8", weight: "50", totalTime: "12.5", ...extra });
const measurement = extra => ({ checkInDate: days[2], bodyWeight: "75", ...extra });
const photo = extra => ({ _id: "gallery", checkInDate: `${days[6]}T00:00:00+05:30`, images: [{ _id: "img", src: "https://example.invalid/PRIVATE-PHOTO.png" }], ...extra });
const compute = (records = {}, opts = clock) => computeGymWeeklyReport(records, days, opts);
const query = value => ({ lean: async () => value });
const request = extra => ({ user: { id: USER }, method: "GET", query: { week: WEEK }, body: {}, ...extra });
async function call(handler, req = request()) {
  let status = 200, body;
  await handler(req, { status(code) { status = code; return this; }, json(value) { body = value; return this; } });
  return { status, body };
}
function fixture(t, records = { exercises: [exercise()] }) {
  t.mock.timers.enable({ apis: ["Date"], now: Date.parse("2026-10-10T06:00:00Z") });
  t.mock.method(GymExerciseProgress, "find", (filter, fields) => { assert.equal(filter.userId, USER); assert.equal(fields.notes, undefined); return query(records.exercises || []); });
  t.mock.method(GymExerciseProgress, "aggregate", async pipeline => { assert.equal(String(pipeline[0].$match.userId), USER); assert.equal(pipeline[2].$group.entry.$first, "$$ROOT"); return records.previous || []; });
  t.mock.method(GymMeasurement, "find", filter => { assert.equal(filter.userId, USER); assert.equal(filter.deletedAt, null); return query(records.measurements || []); });
  t.mock.method(GymGalleryEntry, "find", filter => { assert.equal(filter.userId, USER); return query(records.gallery || []); });
  t.mock.method(GymGalleryEntry, "aggregate", async pipeline => {
    assert.equal(String(pipeline[0].$match.userId), USER); assert.ok(pipeline[1].$project.images.$map.in.hasSource);
    return (records.gallery || []).map(entry => ({ ...entry, images: entry.images.map(image => ({ _id: image._id, hasSource: true })) }));
  });
  t.mock.method(GymDietPlan, "find", filter => { assert.equal(filter.userId, USER); assert.equal(filter.planType, "macros"); return query(records.macroPlans || []); });
  return buildGymWeeklyReport({ ...records, exercises: [...(records.previous || []), ...(records.exercises || [])] }, days);
}
function apiKey(t) {
  const previous = process.env.API_KEY; process.env.API_KEY = "fixture-not-real";
  t.after(() => { if (previous === undefined) delete process.env.API_KEY; else process.env.API_KEY = previous; });
}
function reconciles(report) {
  assert.equal(report.stats.exerciseLogs, Object.values(report.stats.bodyGroupCounts).reduce((a,b)=>a+b,0));
  assert.equal(report.stats.uniqueExercises, report.strengthProgress.length);
  assert.equal(report.stats.photoCount, report.photoEntries.length);
  assert.equal(report.progressPhotos.length, 7);
  assert.ok(report.consistencyScore >= 0 && report.consistencyScore <= 100);
}
test("Sunday belongs to a seven-day report and coverage never exceeds 100", () => {
  const report = compute({ exercises: days.map(date => exercise({ date })) });
  assert.equal(report.workoutDays, 7); assert.equal(report.totalDays, 7); assert.equal(report.consistencyScore, 100); reconciles(report);
});
test("draft coverage uses elapsed app days and excludes future-dated activity", () => {
  const report = compute({ exercises: days.map(date => exercise({ date })) }, { ...clock, today: days[2] });
  assert.equal(report.workoutDays, 3); assert.equal(report.totalDays, 3); assert.equal(report.status, "Draft"); reconciles(report);
});
test("average recorded time sums exercise minutes over days with time, not six or seven arbitrary days", () => {
  const report = compute({ exercises: [exercise({ totalTime: "12.5" }), exercise({ exerciseId: "row", totalTime: "7.5" }), exercise({ date: days[1], totalTime: "30" }), exercise({ date: days[2], totalTime: "" })] });
  assert.equal(report.workoutDays, 3); assert.equal(report.stats.timedDays, 2); assert.equal(report.stats.totalTimeMin, 50); assert.equal(report.stats.avgTimeMin, 25); reconciles(report);
});
test("missing time and volume are unknown, not fabricated zeros or automatic score bonuses", () => {
  const report = compute({ exercises: [exercise({ sets: "", reps: "", weight: "", totalTime: "5" })] });
  assert.equal(report.stats.avgTimeMin, 5); assert.equal(report.stats.totalVolumeKg, null); assert.equal(report.weeklyScore, 14);
  const empty = compute(); assert.equal(empty.weeklyScore, 0); assert.equal(empty.stats.avgTimeMin, null);
});
test("duplicate exercise/day entries keep the latest without merging equal names or leaking prototype keys", () => {
  const report = compute({ exercises: [exercise({updatedAt:days[0],totalTime:"1"}),exercise({updatedAt:days[1],totalTime:"10"}),exercise({exerciseId:"custom",totalTime:"5"}),exercise({exerciseId:"__proto__",bodyPart:"__proto__",totalTime:"5"})] });
  assert.equal(report.stats.exerciseLogs, 3); assert.equal(report.stats.totalTimeMin, 20); assert.equal(report.strengthProgress.length, 3); assert.equal(report.stats.bodyGroupCounts.Other, 1); reconciles(report);
});
test("strict numbers preserve decimals and units while rejecting negatives, junk and impossible values", () => {
  assert.equal(gymReportNumber("3.7 L", "L"), 3.7); assert.equal(gymReportNumber("2,350 kcal", "kcal"), 2350);
  for (const value of ["-5", "12xyz", "Infinity", {}, true, "NaN", ""]) assert.equal(gymReportNumber(value), null);
  assert.equal(gymReportNumber("50 lb", "kg"), null); assert.equal(gymReportNumber("2000", "kg", 1000), null);
});
test("blank notes-only exercise placeholders do not create workout days", () => {
  const report = compute({ exercises: [exercise({sets:"",reps:"",weight:"",totalTime:""}),exercise({date:"2026-02-31"}),exercise({exerciseId:"",date:days[1]})] });
  assert.equal(report.workoutDays, 0); assert.equal(report.stats.exerciseLogs, 0);
});
test("volume honors per-set rep breakdowns, drop-set totals and last-set load", () => {
  const report = compute({ exercises: [exercise({sets:"3",reps:"10",weight:"50",repsBreakdown:["10","8+2","6"],lastSetWeight:"40"})] });
  assert.equal(report.stats.totalVolumeKg, 1240);
  assert.equal(compute({ exercises: [exercise({lastSetReps:"6",lastSetWeight:"40"})] }).stats.totalVolumeKg, 1040);
});
test("zero external load is valid, but missing reps do not make calculable volume", () => {
  assert.equal(compute({ exercises: [exercise({weight:"0"})] }).stats.totalVolumeKg, 0);
  assert.equal(compute({ exercises: [exercise({reps:""})] }).stats.totalVolumeKg, null);
});
test("strength comparisons match IDs, survive renamed exercises and keep cardio/zero-load entries", () => {
  const report = compute({ exercises: [exercise({date:"2026-09-20",exerciseName:"Old name",weight:"40"}),exercise(),exercise({exerciseId:"run",bodyPart:"Cardio",weight:"0"})] });
  const bench = report.strengthProgress.find(row=>row.id==="bench");
  assert.equal(bench.improvement,"+25%"); assert.equal(bench.previousDate,"2026-09-20"); assert.equal(report.strengthProgress.length,2);
  assert.equal(report.strengthProgress.find(row=>row.id==="run").isFirstEntry,true);
});
test("decreases, unchanged weights and missing load remain visible without claiming strength improvement", () => {
  const report = compute({ exercises: [exercise({date:"2026-09-20"}),exercise({weight:"45"}),exercise({exerciseId:"bodyweight",weight:"0"}),exercise({exerciseId:"missing",weight:""})] });
  assert.equal(report.strengthProgress.find(row=>row.id==="bench").improvement,"-10%");
  assert.equal(report.strengthProgress.find(row=>row.id==="missing").current.startsWith("—"),true);
});
test("a blank retained prior entry is unknown baseline data, not a first-ever entry or zero load", () => {
  const report = compute({ exercises: [exercise({ date: "2026-09-20", sets: "", reps: "", weight: "", totalTime: "" }), exercise()] });
  assert.equal(report.strengthProgress[0].isFirstEntry, false);
  assert.equal(report.strengthProgress[0].improvement, null);
  assert.equal(report.strengthProgress[0].repsChange, null);
  assert.equal(report.strengthProgress[0].previousDate, "2026-09-20");
  assert.equal(report.stats.exerciseLogs, 1);
});
test("body groups normalize library labels and do not send arbitrary category text to the provider", () => {
  assert.equal(gymReportBodyGroup("Chest - Upper"),"Chest"); assert.equal(gymReportBodyGroup("Biceps"),"Arms"); assert.equal(gymReportBodyGroup("Private custom category"),"Other");
});
test("first measurement check-ins are displayed with unknown baselines", () => {
  const report=compute({measurements:[measurement({leftArm:"34",calves:"38"})]});
  assert.equal(report.bodyProgress.length,3); assert.ok(report.bodyProgress.every(row=>row.delta===null&&row.change==="First reading"));
});
test("body comparisons use each field's latest known prior reading and include all retained fields", () => {
  const report=compute({measurements:[measurement({checkInDate:"2026-09-20",bodyWeight:"74",waist:"82",leftArm:"33"}),measurement({checkInDate:days[0],bodyWeight:"74.5",waist:"",leftArm:""}),measurement({waist:"81.8",leftArm:"34"})]});
  assert.equal(report.bodyProgress.find(row=>row.id==="bodyWeight").previous,"74.5 kg");
  assert.equal(report.bodyProgress.find(row=>row.id==="waist").previousDate,"2026-09-20");
  assert.equal(report.bodyProgress.find(row=>row.id==="leftArm").delta,1);
});
test("deleted, invalid and future measurements cannot become baselines or activity", () => {
  const report=compute({measurements:[measurement({deletedAt:clock.today}),measurement({checkInDate:"2026-10-12"}),measurement({bodyWeight:"-20"})]});
  assert.equal(report.bodyProgress.length,0); assert.equal(report.stats.measurementDays,0);
});
test("gallery uses exact app-calendar days, includes Sunday and retains multiple images per day", () => {
  const report=compute({gallery:[photo({images:[{_id:"one",src:"https://example.invalid/one.png"},{_id:"two",src:"https://example.invalid/two.png"}]}),photo({checkInDate:"2026-10-04T18:30:00Z"})]});
  assert.equal(report.stats.photoCount,2); assert.equal(report.progressPhotos[6].count,2); assert.equal(report.stats.photoDays,1); reconciles(report);
});
test("photo metadata reconciles without loading images into picker or AI context", () => {
  const report=compute({gallery:[photo({images:[{_id:"one",hasSource:true}]})]});
  assert.equal(report.stats.photoCount,1); assert.equal(report.photoEntries[0].photo,undefined); assert.equal(JSON.stringify(gymAiContext(report)).includes("PRIVATE"),false);
});
test("photo duplicates, future uploads and unsafe sources are excluded", () => {
  const report=compute({gallery:[photo(),photo(),photo({images:[{_id:"bad",src:"javascript:alert(1)"},{_id:"future",src:"https://example.invalid/future.png",uploadedAt:"2026-10-12"}]})]}, {...clock,now:Date.parse("2026-10-10T06:00Z")});
  assert.equal(report.stats.photoCount,1); reconciles(report);
});
test("nutrition is explicitly a current plan reference, deduplicated by weekday with per-metric coverage", () => {
  const base={planType:"macros",isActive:true,day:"Mon"};
  const nutrition=gymNutritionReference([{...base,updatedAt:"2026-01-01",values:{water:"2 L"}},{...base,updatedAt:clock.today,values:{water:"3.7 L",protein:"150 g"}},{...base,day:"Sun",values:{water:"3.3 L",protein:""}}]);
  assert.equal(nutrition.avgWater,"3.5 L"); assert.equal(nutrition.avgProtein,"150 g"); assert.equal(nutrition.dayCount,2); assert.equal(nutrition.counts.protein,1); assert.match(nutrition.note,/not recorded intake/);
});
test("nutrition changes never rewrite historical workout facts or invalidate the statistics-only AI cache", () => {
  const a=compute({exercises:[exercise()]}),b=compute({exercises:[exercise()],macroPlans:[{planType:"macros",isActive:true,day:"Mon",values:{water:"3.7"}}]});
  assert.equal(gymReportFingerprint(a),gymReportFingerprint(b)); assert.equal(gymNutritionReference([{planType:"macros",isActive:false,day:"Mon",values:{protein:"100"}}]),null);
});
test("demo reports derive consistent seven-day totals, photos and decimals from raw sample records", () => {
  for(const report of Object.values(createDemoGymReports())) {
    assert.equal(report.workoutDays,4); assert.equal(report.stats.exerciseLogs,4); assert.equal(report.stats.avgTimeMin,16.5); assert.equal(report.stats.photoCount,5); assert.equal(report.nutrition.avgWater,"3.7 L"); reconciles(report);
  }
});
test("bundled demo asset paths work in development and production without accepting unsafe photo protocols", () => {
  for (const source of ["/src/assets/photo.webp", "/assets/photo-hash.webp"]) {
    for (const report of Object.values(createDemoGymReports([source]))) assert.equal(report.stats.photoCount, 5);
  }
  assert.equal(compute({ gallery: [photo({ images: [{ src: "javascript:alert(1)" }, { src: "data:image/svg+xml,<svg/>" }] })] }).stats.photoCount, 0);
});
test("picker includes workout, measurement-only and photo-only weeks and matches detail totals", async t => {
  const records={exercises:[exercise()],measurements:[measurement({checkInDate:"2026-09-23"})],gallery:[photo({checkInDate:"2026-09-20T00:00:00+05:30"})]}; fixture(t,records);
  const picker=await call(getGymSummaries),detail=await call(getGymWeeklyReport);
  assert.equal(picker.status,200); assert.equal(picker.body.length,3); assert.equal(picker.body[0].exerciseLogs,detail.body.stats.exerciseLogs);
  assert.equal(picker.body[1].measurementDays,1); assert.equal(picker.body[2].photoCount,1);
});

test("gym summary omits photo sources until the owner opens the photo view", async t => {
  fixture(t, { exercises: [exercise()], gallery: [photo()], macroPlans: [{ planType: "macros", isActive: true,
    day: "Mon", values: { protein: "150 g" } }] });
  const lean = await call(getGymWeeklyReport, request({ query: { week: WEEK, photos: "omit" } }));
  assert.equal(lean.status, 200);
  assert.equal(lean.body.photosOmitted, true);
  assert.equal(lean.body.stats.photoCount, 1);
  assert.equal(lean.body.photoEntries[0].photo, undefined);
  assert.equal(lean.body.nutrition.avgProtein, "150 g");
  assert.equal(validWeeklyReport(lean.body, "gym", WEEK), true);
  assert.equal(JSON.stringify(lean.body).includes("PRIVATE-PHOTO"), false);
  const photos = await call(getGymWeeklyPhotos);
  assert.equal(photos.status, 200);
  assert.equal(photos.body.photoEntries[0].photo, "https://example.invalid/PRIVATE-PHOTO.png");
  assert.equal(validWeeklyGymPhotos(photos.body, WEEK), true);
});
test("gym picker bundles its latest metadata-only report", async t => {
  fixture(t, { exercises: [exercise()], gallery: [photo()] });
  t.mock.method(GymWeeklySummary, "findOne", filter => {
    assert.deepEqual(filter, { userId: USER, weekStart: WEEK });
    return query(null);
  });
  const result = await call(getGymSummaries, request({ query: { includeLatest: "1" } }));
  assert.equal(result.status, 200);
  assert.equal(result.body.summaries[0].id, WEEK);
  assert.equal(result.body.latestReport.id, WEEK);
  assert.equal(result.body.latestReport.photosOmitted, true);
  assert.equal(result.body.latestReport.stats.photoCount, 1);
  assert.equal(JSON.stringify(result.body).includes("PRIVATE-PHOTO"), false);
  assert.equal(validWeeklyReport(result.body.latestReport, "gym", WEEK), true);
});
test("last 12 completed weeks use app Monday even while UTC is still Sunday", t => {
  t.mock.timers.enable({apis:["Date"],now:Date.parse("2026-10-11T18:45:00Z")});
  assert.equal(completedGymWeeks()[0][0],"2026-10-05"); assert.equal(completedGymWeeks().length,12);
});
test("invalid or future weeks fail before any protected record reads", async t => {
  t.mock.method(GymExerciseProgress,"find",()=>assert.fail("No read"));
  for(const week of ["2026-02-31","bad","2099-01-01"]) assert.equal((await call(getGymWeeklyReport,request({query:{week}}))).status,400);
});
test("failed reads are recoverable errors, not successful empty reports", async t => {
  fixture(t); t.mock.method(GymExerciseProgress,"find",()=>{throw new Error("Unavailable")});
  assert.equal((await call(getGymWeeklyReport)).status,500); assert.equal((await call(getGymSummaries)).status,500);
});
test("fresh, stale and missing AI caches can be read without credentials or generation", async t => {
  const report = fixture(t);
  t.mock.method(globalThis, "fetch", () => assert.fail("Cache GET cannot generate"));
  t.mock.method(GymWeeklySummary, "findOneAndUpdate", () => assert.fail("Cache GET cannot write"));
  t.mock.method(GymWeeklySummary, "findOne", filter => { assert.deepEqual(filter, { userId: USER, weekStart: WEEK }); return query({ aiSummary: "Saved", sourceHash: gymReportFingerprint(report) }); });
  assert.equal((await call(generateGymAiSummary)).body.needsGeneration, false);
  t.mock.method(GymWeeklySummary, "findOne", () => query({ aiSummary: "Legacy" }));
  assert.equal((await call(generateGymAiSummary)).body.stale, true);
  t.mock.method(GymWeeklySummary, "findOne", () => query(null));
  assert.equal((await call(generateGymAiSummary)).body.aiSummary, null);
});

test("explicit generation refuses empty weeks and unconfigured credentials without billing", async t => {
  fixture(t, {});
  t.mock.method(GymWeeklySummary, "findOne", () => query(null));
  t.mock.method(globalThis, "fetch", () => assert.fail("Unavailable generation cannot bill"));
  assert.equal((await call(generateGymAiSummary, request({ method: "POST" }))).status, 400);
  t.mock.method(GymExerciseProgress, "find", () => query([exercise()]));
  const previous = process.env.API_KEY; delete process.env.API_KEY;
  t.after(() => { if (previous !== undefined) process.env.API_KEY = previous; });
  assert.equal((await call(generateGymAiSummary, request({ method: "POST" }))).status, 503);
});

test("concurrent explicit AI requests coalesce and use only canonical statistics", async t => {
  fixture(t); apiKey(t);
  t.mock.method(GymWeeklySummary, "findOne", () => query(null));
  let requests = 0, writes = 0;
  t.mock.method(globalThis, "fetch", async (_, options) => {
    requests++;
    const prompt = JSON.parse(options.body); assert.match(prompt.messages[0].content, /not proof of completed sessions/);
    const context = JSON.parse(prompt.messages[1].content);
    assert.equal(context.stats.exerciseLogs, 1); assert.equal(context.stats.avgTimeMin, 12.5); assert.equal(context.exercises, undefined);
    await new Promise(resolve => setTimeout(resolve, 10));
    return { ok: true, json: async () => ({ choices: [{ message: { content: "Generated" } }] }) };
  });
  t.mock.method(GymWeeklySummary, "findOneAndUpdate", async (filter, update, options) => {
    writes++; assert.equal(filter.userId, USER); assert.equal(options.runValidators, true); assert.match(update.$set.sourceHash, /^[a-f0-9]{64}$/); return update.$set;
  });
  const results = await Promise.all([call(generateGymAiSummary, request({ method: "POST" })), call(generateGymAiSummary, request({ method: "POST" }))]);
  assert.equal(requests, 1); assert.equal(writes, 1); assert.equal(results[0].body.aiSummary, "Generated"); assert.equal(results[1].body.aiSummary, "Generated");
});

test("failed and empty AI responses do not overwrite cache and permit a later retry", async t => {
  fixture(t); apiKey(t);
  t.mock.method(GymWeeklySummary, "findOne", () => query({ aiSummary: "Previous" }));
  let writes = 0;
  t.mock.method(GymWeeklySummary, "findOneAndUpdate", async () => { writes++; return {}; });
  t.mock.method(globalThis, "fetch", async () => { throw new Error("Unavailable"); });
  assert.equal((await call(generateGymAiSummary, request({ method: "POST" }))).status, 502);
  t.mock.method(globalThis, "fetch", async () => ({ ok: true, json: async () => ({ choices: [] }) }));
  assert.equal((await call(generateGymAiSummary, request({ method: "POST" }))).status, 502); assert.equal(writes, 0);
  t.mock.method(globalThis, "fetch", async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: "Retry" } }] }) }));
  assert.equal((await call(generateGymAiSummary, request({ method: "POST" }))).body.aiSummary, "Retry"); assert.equal(writes, 1);
});

test("cache storage failure returns generated text with a warning, unique-key conflict retries safely", async t => {
  fixture(t); apiKey(t);
  t.mock.method(GymWeeklySummary, "findOne", () => query(null));
  t.mock.method(globalThis, "fetch", async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: "Generated" } }] }) }));
  t.mock.method(GymWeeklySummary, "findOneAndUpdate", async () => { throw new Error("Unavailable"); });
  const failure = await call(generateGymAiSummary, request({ method: "POST" }));
  assert.equal(failure.status, 200); assert.equal(failure.body.persisted, false); assert.match(failure.body.warning, /could not be saved/);
  let attempts = 0;
  t.mock.method(GymWeeklySummary, "findOneAndUpdate", async (filter, update, options) => {
    assert.equal(filter.userId, USER);
    if (++attempts === 1) throw Object.assign(new Error("Conflict"), { code: 11000 });
    assert.equal(options.upsert, undefined); assert.equal(options.runValidators, true); return update.$set;
  });
  assert.equal((await call(generateGymAiSummary, request({ method: "POST" }))).body.persisted, true); assert.equal(attempts, 2);
});

test("generation reuses fresh cache unless force is explicit; schema accepts old cache documents", async t => {
  const report = fixture(t); apiKey(t);
  t.mock.method(GymWeeklySummary, "findOne", () => query({ aiSummary: "Fresh", sourceHash: gymReportFingerprint(report) }));
  let requests = 0;
  t.mock.method(globalThis, "fetch", async () => { requests++; return { ok: true, json: async () => ({ choices: [{ message: { content: "Forced" } }] }) }; });
  t.mock.method(GymWeeklySummary, "findOneAndUpdate", async () => ({}));
  assert.equal((await call(generateGymAiSummary, request({ method: "POST" }))).body.aiSummary, "Fresh"); assert.equal(requests, 0);
  assert.equal((await call(generateGymAiSummary, request({ query: { week: WEEK, regenerate: "true" } }))).body.aiSummary, "Forced");
  const doc = new GymWeeklySummary({ userId: USER, weekStart: WEEK, aiSummary: "Old" }); await doc.validate();
  doc.sourceHash = "invalid"; await assert.rejects(doc.validate(), /sourceHash/);
});

test("AI cache GETs bypass generation quotas; POST and legacy regeneration remain protected", async t => {
  const previous = process.env.ARCJET_KEY; delete process.env.ARCJET_KEY;
  t.after(() => { if (previous !== undefined) process.env.ARCJET_KEY = previous; });
  const get = weeklyRoutes.stack.find(layer => layer.route?.path === "/gym/ai-summary" && layer.route.methods.get).route;
  const post = weeklyRoutes.stack.find(layer => layer.route?.path === "/gym/ai-summary" && layer.route.methods.post).route;
  assert.equal(post.stack.length, 2);
  let passes = 0, status = 200;
  const res = { setHeader() {}, status(code) { status = code; return this; }, json() {} };
  const req = request({ user: { id: "gym-weekly-quota-fixture" } });
  for (let i = 0; i < 20; i++) await get.stack[0].handle(req, res, () => passes++);
  assert.equal(passes, 20); req.query.regenerate = "true";
  for (let i = 0; i < Number(process.env.GYM_WEEKLY_AI_RATE_LIMIT_DAILY_MAX || 2) + 1; i++) await get.stack[0].handle(req, res, () => {});
  assert.equal(status, 429);
});



test("AI context is aggregate-only and hashes change with facts, not private notes, names or clock", () => {
  const a=compute({exercises:[exercise()],measurements:[measurement()],gallery:[photo()]}),b=compute({exercises:[exercise({exerciseName:"Different",notes:"Another secret"})],measurements:[measurement()],gallery:[photo()]});
  assert.equal(gymReportFingerprint(a),gymReportFingerprint({...b,serverNow:"tomorrow"})); assert.equal(JSON.stringify(gymAiContext(a)).includes("PRIVATE"),false);
  assert.notEqual(gymReportFingerprint(a),gymReportFingerprint(compute({exercises:[exercise({totalTime:"20"})]})));
});
