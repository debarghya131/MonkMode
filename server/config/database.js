import "./runtime.js";

// Select explicitly: URI paths (or MongoDB's default database) must never mix
// localhost activity with the deployed application's records.
export function getDatabaseConfig(env = process.env) {
  const environment = env.NODE_ENV || "development";
  if (!["development", "test", "production"].includes(environment)) {
    throw new Error("NODE_ENV must be development, test, or production");
  }
  const dbName = environment === "production" ? "MonkMode" : "test";
  if (env.MONGO_DB_NAME && env.MONGO_DB_NAME !== dbName) {
    throw new Error(`MONGO_DB_NAME must be ${dbName} for NODE_ENV=${environment}`);
  }
  if (!env.MONGO_URI) throw new Error("MONGO_URI is required");
  return { uri: env.MONGO_URI, dbName, environment };
}

export function getDatabaseOptions(env = process.env) {
  return { dbName: getDatabaseConfig(env).dbName };
}

export function requireDevelopmentDatabase(env = process.env) {
  const config = getDatabaseConfig(env);
  if (config.environment === "production") {
    throw new Error("Development seed/test scripts cannot run against MonkMode production data");
  }
  return config;
}
