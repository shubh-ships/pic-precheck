import "server-only";
import sql from "mssql";

const required = ["DB_SERVER", "DB_USER", "DB_PASSWORD"];
const databaseName = /^[A-Za-z_][A-Za-z0-9_]*$/;

function assertDatabaseName(name) {
  if (!databaseName.test(name)) throw new Error("Database names must contain only letters, numbers, and underscores.");
  return name;
}

function connectionConfig(database) {
  const missing = required.filter((name) => !process.env[name] || process.env[name].startsWith("REPLACE_WITH_"));
  if (missing.length) throw new Error(`Missing database configuration: ${missing.join(", ")}`);
  return {
    server: process.env.DB_SERVER, port: Number(process.env.DB_PORT ?? 1433), user: process.env.DB_USER,
    password: process.env.DB_PASSWORD, database: assertDatabaseName(database),
    options: { encrypt: process.env.DB_ENCRYPT !== "false", trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === "true" },
    pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
    // Azure SQL serverless auto-pauses when idle; resuming can take well past the mssql
    // default of 15s, so give cold starts room instead of failing the first request.
    connectionTimeout: 60000,
    requestTimeout: 60000,
  };
}

export const databases = Object.freeze({ pic: assertDatabaseName(process.env.PIC_DB ?? "pic"), chemical: assertDatabaseName(process.env.CHEMICAL_DB ?? "chemical_db") });
const globalForDb = globalThis;

export function getPool(database) {
  const pools = globalForDb.picPrecheckPools ?? new Map();
  globalForDb.picPrecheckPools = pools;
  if (!pools.has(database)) {
    // If the initial connect fails (e.g. timing out while an auto-paused Azure SQL
    // database resumes), drop the rejected promise so the next call retries instead
    // of being stuck with a cached failure for the lifetime of this server instance.
    const pending = new sql.ConnectionPool(connectionConfig(database)).connect().catch((error) => {
      pools.delete(database);
      throw error;
    });
    pools.set(database, pending);
  }
  return pools.get(database);
}

export { sql };
