import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { getDatabaseConfig, getDatabaseOptions, requireDevelopmentDatabase } from "../config/database.js";

const MONGO_URI = "mongodb://127.0.0.1:27017/MonkMode";

test("localhost defaults to test even when the URI names the live database", () => {
  assert.equal(getDatabaseConfig({ MONGO_URI }).dbName, "test");
  assert.deepEqual(getDatabaseOptions({ MONGO_URI, NODE_ENV: "development" }), { dbName: "test" });
});

test("production uses the exact case-sensitive MonkMode database, not the URI path", () => {
  const production = getDatabaseConfig({ MONGO_URI: "mongodb://127.0.0.1:27017/test", NODE_ENV: "production" });
  assert.equal(production.dbName, "MonkMode");
  assert.equal(production.environment, "production");
});

test("test execution stays on test, with no production fallback", () => {
  assert.equal(getDatabaseConfig({ MONGO_URI, NODE_ENV: "test" }).dbName, "test");
});

test("misconfigured database overrides and environments fail closed", () => {
  assert.throws(() => getDatabaseConfig({ MONGO_URI, NODE_ENV: "development", MONGO_DB_NAME: "MonkMode" }), /must be test/);
  assert.throws(() => getDatabaseConfig({ MONGO_URI, NODE_ENV: "production", MONGO_DB_NAME: "test" }), /must be MonkMode/);
  assert.throws(() => getDatabaseConfig({ MONGO_URI, NODE_ENV: "staging" }), /NODE_ENV must be/);
  assert.throws(() => getDatabaseConfig({}), /MONGO_URI is required/);
});

test("local seed and diagnostic scripts cannot target production", () => {
  assert.throws(() => requireDevelopmentDatabase({ MONGO_URI, NODE_ENV: "production" }), /cannot run/);
  assert.equal(requireDevelopmentDatabase({ MONGO_URI }).dbName, "test");
});

test("Mongoose receives the selected dbName without connecting or writing", async t => {
  const env = { MONGO_URI, NODE_ENV: "production" };
  t.mock.method(mongoose, "connect", async (uri, options) => {
    assert.equal(uri, MONGO_URI);
    assert.equal(options.dbName, "MonkMode");
  });
  await mongoose.connect(getDatabaseConfig(env).uri, getDatabaseOptions(env));
  assert.equal(mongoose.connect.mock.callCount(), 1);
});
