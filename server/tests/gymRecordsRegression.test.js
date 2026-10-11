import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import User from "../models/User.js";
import GymMeasurement from "../models/GymMeasurement.js";
import GymGalleryEntry from "../models/GymGalleryEntry.js";
import GymCustomExercise from "../models/GymCustomExercise.js";
import { createMeasurement, updateMeasurement, deleteMeasurement, undoDeleteMeasurement, uploadGymGalleryImages, deleteGymGalleryImage, createGymCustomExercise, deleteGymCustomExercise } from "../controllers/gymController.js";
import { measurementFields, validGalleryImage, MAX_GALLERY_IMAGE_BYTES } from "../utils/gymRecordUtils.js";
import { createDemoEntries } from "../../client/src/dashboard/gym/measurementDemoData.js";

const OWNER = "000000000000000000000001", ID = "000000000000000000000002", OTHER = "000000000000000000000003";
const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jQXcAAAAASUVORK5CYII=";
const request = body => ({ user: { id: OWNER }, params: { id: ID }, body: body || {} });
const freeze = t => t.mock.timers.enable({ apis: ["Date"], now: Date.parse("2026-10-10T06:00:00Z") });
async function call(handler, req = request()) {
  let status = 200, body;
  await handler(req, { status(value) { status = value; return this; }, json(value) { body = value; return this; } });
  return { status, body };
}

// Isolated transaction fixture; never connects to MongoDB. Every query and write
// verifies the account fence and session, with rollback on errors.
function fixture(t, Model, records = []) {
  let committed = structuredClone(records), pending, writes = 0;
  const session = { isolated: true };
  const query = value => ({ session(s) { assert.equal(s, session); return this; }, then(resolve, reject) { return Promise.resolve(value).then(resolve, reject); } });
  t.mock.method(mongoose.connection, "transaction", async task => {
    pending = structuredClone(committed);
    const result = await task(session);
    committed = structuredClone(pending.map(doc => Object.fromEntries(Object.entries(doc).filter(([, value]) => typeof value !== "function"))));
    return result;
  });
  t.mock.method(User, "updateOne", async (filter, update, options) => {
    assert.equal(filter._id, OWNER); assert.equal(update.$inc.gymMutationVersion, 1); assert.equal(options.session, session);
    return { matchedCount: 1 };
  });
  t.mock.method(Model, "findOne", filter => {
    assert.equal(filter.userId, OWNER);
    const doc = pending.find(item => Object.entries(filter).every(([key, value]) => {
      if (key === "$expr") return value.$and.every(condition => {
        const [expression, expected] = condition.$eq;
        return item[expression.$toLower.slice(1)].toLowerCase() === expected;
      });
      return value instanceof Date ? item[key]?.getTime() === value.getTime() : item[key] === value;
    }));
    if (doc) doc.save = async options => { assert.equal(options.session, session); writes++; };
    return query(doc || null);
  });
  t.mock.method(Model, "create", async (payloads, options) => {
    assert.equal(options.session, session);
    return payloads.map(payload => { assert.equal(payload.userId, OWNER); const doc = { _id: ID, ...payload }; pending.push(doc); writes++; return doc; });
  });
  return { records: () => committed, writes: () => writes, session };
}

test("Measurements accept a partial check-in but reject empty, nonnumeric and out-of-range values", () => {
  assert.equal(measurementFields({ bodyWeight: "80.5" }).bodyWeight, "80.5");
  assert.equal(measurementFields({ waist: "90" }, { bodyWeight: "80" }).bodyWeight, "80");
  for (const value of ["-2", "0", "1001", "abc", "Infinity", "1e2", {}, []]) assert.throws(() => measurementFields({ bodyWeight: value }), /must be/);
  assert.throws(() => measurementFields({}), /at least one/);
});

test("Measurement demo history is deterministic and independent of browser caches", () => {
  const entries = createDemoEntries("2026-10-10");
  assert.deepEqual(entries.map(entry => entry.checkInDate), ["2026-08-15", "2026-09-12", "2026-10-03"]);
  assert.deepEqual(createDemoEntries("2026-10-10"), entries);
});

test("Measurement create rejects impossible and future days before writing", async t => {
  freeze(t);
  for (const checkInDate of ["2026-02-30", "2026-10-11", "bad"]) assert.equal((await call(createMeasurement, request({ checkInDate, bodyWeight: "80" }))).status, 400);
});

test("Measurement captured-day guard rejects a stale form", async t => {
  freeze(t);
  assert.equal((await call(createMeasurement, request({ checkInDate: "2026-10-09", expectedToday: "2026-10-09", bodyWeight: "80" }))).status, 409);
});

test("Measurement create is owner-scoped and retrying the same payload does not duplicate it", async t => {
  freeze(t);
  const f = fixture(t, GymMeasurement, [{ _id: OTHER, userId: OTHER, checkInDate: "2026-10-10", bodyWeight: "75" }]);
  const req = request({ checkInDate: "2026-10-10", expectedToday: "2026-10-10", bodyWeight: "80" });
  assert.equal((await call(createMeasurement, req)).status, 201);
  assert.equal((await call(createMeasurement, req)).status, 200);
  assert.equal(f.records().length, 2); assert.equal(f.writes(), 1);
  assert.equal(f.records()[0].bodyWeight, "75");
});

test("Measurement create cannot resurrect or overwrite a deleted check-in", async t => {
  freeze(t);
  const f = fixture(t, GymMeasurement, [{ _id: ID, userId: OWNER, checkInDate: "2026-10-10", bodyWeight: "80", deletedAt: new Date() }]);
  assert.equal((await call(createMeasurement, request({ checkInDate: "2026-10-10", bodyWeight: "99" }))).status, 409);
  assert.equal(f.records()[0].bodyWeight, "80"); assert.equal(f.writes(), 0);
});

test("Measurement update preserves omitted fields and its original date", async t => {
  freeze(t);
  const f = fixture(t, GymMeasurement, [{ _id: ID, userId: OWNER, checkInDate: "2026-10-10", bodyWeight: "80", waist: "90" }]);
  const result = await call(updateMeasurement, request({ bodyWeight: "79.5", expectedToday: "2026-10-10" }));
  assert.equal(result.status, 200); assert.equal(result.body.waist, "90");
  assert.equal((await call(updateMeasurement, request({ checkInDate: "2026-10-09", bodyWeight: "1" }))).status, 400);
  assert.equal(f.records()[0].bodyWeight, "79.5");
});

test("Measurement update cannot write another account's record or silently cross midnight", async t => {
  freeze(t);
  fixture(t, GymMeasurement, [{ _id: ID, userId: OTHER, checkInDate: "2026-10-10", bodyWeight: "80" }]);
  assert.equal((await call(updateMeasurement, request({ bodyWeight: "79" }))).status, 404);
});

test("Repeated measurement deletion retains the original 48-hour deadline", async t => {
  freeze(t);
  const deletedAt = new Date("2026-10-09T06:00:00Z");
  const f = fixture(t, GymMeasurement, [{ _id: ID, userId: OWNER, checkInDate: "2026-10-09", bodyWeight: "80", deletedAt }]);
  const result = await call(deleteMeasurement);
  assert.equal(result.status, 200); assert.equal(result.body.entry.deleteUndoExpiresAt, "2026-10-11T06:00:00.000Z");
  assert.equal(f.writes(), 0); assert.equal(f.records()[0].deletedAt.getTime(), deletedAt.getTime());
});

test("Measurement restore is idempotent while expired restores remain rejected", async t => {
  freeze(t);
  const f = fixture(t, GymMeasurement, [{ _id: ID, userId: OWNER, checkInDate: "2026-10-09", bodyWeight: "80", deletedAt: new Date("2026-10-09T06:00:00Z") }]);
  assert.equal((await call(undoDeleteMeasurement)).status, 200);
  assert.equal((await call(undoDeleteMeasurement)).status, 200);
  assert.equal(f.writes(), 1);
});

test("Measurement restore rejects the exact 48-hour expiry boundary", async t => {
  freeze(t);
  const f = fixture(t, GymMeasurement, [{ _id: ID, userId: OWNER, checkInDate: "2026-10-08", bodyWeight: "80", deletedAt: new Date("2026-10-08T06:00:00Z") }]);
  assert.equal((await call(undoDeleteMeasurement)).status, 409); assert.equal(f.writes(), 0);
});

test("Gallery validates base64, MIME signatures and decoded size", () => {
  assert.equal(validGalleryImage(PNG), true);
  for (const src of ["data:image/png;base64,YWJj", PNG.replace("image/png", "image/jpeg"), "data:image/svg+xml;base64,YWJj", "data:image/png;base64,%%==", PNG.slice(0, -1)]) assert.equal(validGalleryImage(src), false);
  assert.equal(validGalleryImage(`data:image/png;base64,${Buffer.alloc(MAX_GALLERY_IMAGE_BYTES + 1).toString("base64")}`), false);
});

test("Gallery rejects invalid, future and stale upload dates without writes", async t => {
  freeze(t);
  assert.equal((await call(uploadGymGalleryImages, request({ date: "2026-02-30", images: [PNG] }))).status, 400);
  assert.equal((await call(uploadGymGalleryImages, request({ date: "2026-10-11", images: [PNG] }))).status, 400);
  assert.equal((await call(uploadGymGalleryImages, request({ date: "2026-10-09", expectedToday: "2026-10-09", images: [PNG] }))).status, 409);
});

test("Gallery upload is fenced, owner-scoped and deduplicates retries and repeated files", async t => {
  freeze(t);
  const f = fixture(t, GymGalleryEntry);
  const req = request({ date: "2026-10-10", images: [PNG, PNG] });
  assert.equal((await call(uploadGymGalleryImages, req)).status, 201);
  assert.equal((await call(uploadGymGalleryImages, req)).status, 201);
  assert.equal(f.records().length, 1); assert.equal(f.records()[0].images.length, 1); assert.equal(f.writes(), 1);
});

test("Gallery rejects unsupported files and too many images before writing", async t => {
  freeze(t);
  assert.equal((await call(uploadGymGalleryImages, request({ images: ["data:image/png;base64,YWJj"] }))).status, 400);
  assert.equal((await call(uploadGymGalleryImages, request({ images: Array(7).fill(PNG) }))).status, 400);
});

test("Gallery delete is idempotent and cannot remove another owner's image", async t => {
  const f = fixture(t, GymGalleryEntry, [{ _id: ID, userId: OTHER, images: [{ _id: OTHER, src: PNG }] }]);
  const req = { ...request(), params: { entryId: ID, imageId: OTHER } };
  assert.equal((await call(deleteGymGalleryImage, req)).status, 200);
  assert.equal(f.records()[0].images.length, 1);
  assert.equal(f.writes(), 0);
});

test("Measurement update rejects a stale captured day without modifying a record", async t => {
  freeze(t);
  const f = fixture(t, GymMeasurement, [{ _id: ID, userId: OWNER, checkInDate: "2026-10-09", bodyWeight: "80" }]);
  assert.equal((await call(updateMeasurement, request({ bodyWeight: "79", expectedToday: "2026-10-09" }))).status, 409);
  assert.equal(f.records()[0].bodyWeight, "80"); assert.equal(f.writes(), 0);
});

test("Gallery per-check-in byte budget rejects oversized existing history without a write", async t => {
  freeze(t);
  const f = fixture(t, GymGalleryEntry, [{ _id: ID, userId: OWNER, checkInDate: new Date("2026-10-10T00:00:00+05:30"), images: [{ src: "a".repeat(14 * 1024 * 1024) }] }]);
  assert.equal((await call(uploadGymGalleryImages, request({ date: "2026-10-10", images: [PNG] }))).status, 400);
  assert.equal(f.writes(), 0); assert.equal(f.records()[0].images.length, 1);
});

test("Custom library create is owner-fenced and retry-safe without duplicating names", async t => {
  const f = fixture(t, GymCustomExercise);
  const req = request({ name: "Cable Crossover", bodyGroup: "Chest", bodySection: "Upper", bodyPart: "Chest - Upper" });
  assert.equal((await call(createGymCustomExercise, req)).status, 201);
  req.body.name = "cable crossover";
  assert.equal((await call(createGymCustomExercise, req)).status, 200);
  assert.equal(f.records().length, 1); assert.equal(f.writes(), 1);
});

test("Custom library rejects oversized user input as validation, not a server failure", async () => {
  assert.equal((await call(createGymCustomExercise, request({ name: "a".repeat(181), bodyGroup: "Chest", bodyPart: "Chest" }))).status, 400);
});

test("Custom library deletion uses the same account fence and is retry-safe", async t => {
  const f = fixture(t, GymCustomExercise);
  let deletes = 0;
  t.mock.method(GymCustomExercise, "findOneAndDelete", filter => {
    assert.deepEqual(filter, { _id: ID, userId: OWNER });
    return { session(s) { assert.equal(s, f.session); deletes++; return Promise.resolve(null); } };
  });
  assert.equal((await call(deleteGymCustomExercise)).status, 200);
  assert.equal((await call(deleteGymCustomExercise)).status, 200);
  assert.equal(deletes, 2);
});

for (const imageCount of [1, 2]) test(`Gallery deletion of ${imageCount} image(s) returns the committed canonical outcome`, async t => {
  const session = { fixture: true };
  const entry = new GymGalleryEntry({ _id: ID, userId: OWNER, checkInDate: new Date(), images: [{ _id: OTHER, src: PNG }, ...(imageCount === 2 ? [{ src: PNG }] : [])] });
  t.mock.method(mongoose.connection, "transaction", task => task(session));
  t.mock.method(User, "updateOne", async (filter, update, options) => { assert.equal(filter._id, OWNER); assert.equal(options.session, session); return { matchedCount: 1 }; });
  t.mock.method(GymGalleryEntry, "findOne", filter => { assert.deepEqual(filter, { _id: ID, userId: OWNER }); return { session(s) { assert.equal(s, session); return Promise.resolve(entry); } }; });
  let saved = 0, removed = 0;
  t.mock.method(entry, "save", async options => { assert.equal(options.session, session); saved++; });
  t.mock.method(entry, "deleteOne", async options => { assert.equal(options.session, session); removed++; });
  const result = await call(deleteGymGalleryImage, { ...request(), params: { entryId: ID, imageId: OTHER } });
  assert.equal(result.status, 200); assert.equal(entry.images.length, imageCount - 1);
  if (imageCount === 1) { assert.equal(result.body.deletedEntryId, ID); assert.equal(removed, 1); assert.equal(saved, 0); }
  else { assert.equal(result.body.entry.images.length, 1); assert.equal(saved, 1); assert.equal(removed, 0); }
});
