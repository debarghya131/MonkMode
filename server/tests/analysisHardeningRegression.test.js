import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import cors from "cors";
import Habit from "../models/Habit.js";
import { createCorsOptions, corsErrorHandler } from "../config/cors.js";
import { ensureHabitAnalysisIndex, HABIT_ANALYSIS_INDEX, HABIT_ANALYSIS_INDEX_NAME } from "../utils/habitAnalysisIndex.js";

const origin = "https://monkmode.debarghya.org";
const production = { NODE_ENV: "production", CORS_ORIGINS: ` ${origin},https://other.example ` };
async function server(t) {
  const app = express(); app.use(cors(createCorsOptions(production))); app.use(corsErrorHandler);
  let requests = 0;
  app.use((_req, res) => { requests++; res.json({ status: "ok" }); });
  const listener = await new Promise(resolve => { const running = app.listen(0, "127.0.0.1", () => resolve(running)); });
  t.after(() => new Promise(resolve => { listener.close(resolve); listener.closeIdleConnections(); }));
  return { url: `http://127.0.0.1:${listener.address().port}`, requests: () => requests };
}

test("production CORS preserves allowed origins and authorization preflight", async t => {
  const s = await server(t);
  const response = await fetch(s.url, { headers: { Origin: origin } });
  assert.equal(response.status, 200); assert.equal(response.headers.get("access-control-allow-origin"), origin);
  const preflight = await fetch(s.url, { method: "OPTIONS", headers: { Origin: origin,
    "Access-Control-Request-Method": "GET", "Access-Control-Request-Headers": "authorization" } });
  assert.equal(preflight.status, 204); assert.equal(preflight.headers.get("access-control-allow-origin"), origin);
  assert.match(preflight.headers.get("access-control-allow-headers"), /Authorization/);
  assert.equal(s.requests(), 1);
});
test("denied origins return safe 403 JSON, never HTML or private details, before any route", async t => {
  const s = await server(t);
  for (const method of ["GET", "POST", "OPTIONS"]) for (const bad of ["https://untrusted.example", "http://localhost:5173", `${origin}.evil.example`, "null"]) {
    const response = await fetch(s.url, { method, headers: { Origin: bad } });
    assert.equal(response.status, 403); assert.match(response.headers.get("content-type"), /application\/json/);
    assert.equal(response.headers.get("access-control-allow-origin"), null);
    assert.deepEqual(await response.json(), { message: "CORS origin not allowed" });
  }
  assert.equal(s.requests(), 0);
});
test("originless backend clients work and development localhost remains supported", async t => {
  const s = await server(t); assert.equal((await fetch(s.url)).status, 200);
  const options = createCorsOptions({ NODE_ENV: "development", CORS_ORIGINS: origin });
  for (const allowed of [undefined, origin, "http://localhost:5173", "http://127.0.0.1:9181"]) {
    options.origin(allowed, (error, result) => { assert.equal(error, null); assert.equal(result, true); });
  }
  for (const denied of ["http://localhost.evil.example:5173", "https://untrusted.example", "invalid-url"]) {
    options.origin(denied, error => assert.equal(error.code, "CORS_ORIGIN_DENIED"));
  }
});
test("CORS handler passes unrelated and already-sent errors onward unchanged", () => {
  for (const [error, headersSent] of [[new Error("other"), false], [{ code: "CORS_ORIGIN_DENIED" }, true]]) {
    corsErrorHandler(error, {}, { headersSent, status: () => assert.fail("Unexpected response") }, forwarded => assert.equal(forwarded, error));
  }
});
test("Habit schema declares the owner/date analysis index without TTL or uniqueness", () => {
  const index = Habit.schema.indexes().find(([key]) => JSON.stringify(key) === JSON.stringify(HABIT_ANALYSIS_INDEX));
  assert.ok(index); assert.equal(index[1].unique, undefined); assert.equal(index[1].expireAfterSeconds, undefined);
});
const collection = (indexes = []) => ({ calls: [], listIndexes() { return { toArray: async () => indexes }; },
  async createIndex(key, options) { this.calls.push({ key, options }); } });
test("Habit index dry runs never create indexes or change records", async () => {
  const c = collection([{ name: "_id_", key: { _id: 1 } }]);
  assert.equal(await ensureHabitAnalysisIndex(c), "would-create"); assert.deepEqual(c.calls, []);
});
test("Habit index apply is additive and existing index detection is idempotent", async () => {
  const c = collection(); assert.equal(await ensureHabitAnalysisIndex(c, { apply: true }), "created");
  assert.deepEqual(c.calls, [{ key: HABIT_ANALYSIS_INDEX, options: { name: HABIT_ANALYSIS_INDEX_NAME } }]);
  const indexed = collection([{ name: "custom_name", key: HABIT_ANALYSIS_INDEX }]);
  assert.equal(await ensureHabitAnalysisIndex(indexed, { apply: true }), "already-present"); assert.deepEqual(indexed.calls, []);
});
test("Habit index migration fails safely on name conflicts instead of dropping any index", async () => {
  for (const extra of [{ key: { userId: 1 } }, { sparse: true }, { hidden: true }, { partialFilterExpression: { deletedAt: null } }]) {
    const c = collection([{ name: HABIT_ANALYSIS_INDEX_NAME, key: HABIT_ANALYSIS_INDEX, ...extra }]);
    await assert.rejects(() => ensureHabitAnalysisIndex(c, { apply: true }), /conflicts/); assert.deepEqual(c.calls, []);
  }
});
test("missing habit collection is a safe dry run; other index read failures remain errors", async () => {
  const missing = collection(); missing.listIndexes = () => ({ toArray: async () => { throw { code: 26 }; } });
  assert.equal(await ensureHabitAnalysisIndex(missing), "would-create"); assert.deepEqual(missing.calls, []);
  missing.listIndexes = () => ({ toArray: async () => { throw new Error("Read failed"); } });
  await assert.rejects(() => ensureHabitAnalysisIndex(missing), /Read failed/);
});
