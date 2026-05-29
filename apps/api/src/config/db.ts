import { AsyncLocalStorage } from "async_hooks";
import pg from "pg";
import dotenv from "dotenv";
import path from "path";
import { setTenantLocal } from "./tenant.js";

/** Active tenant for the current request (set by middleware). */
export const tenantContext = new AsyncLocalStorage<string>();

const cwdEnvPath = path.resolve(process.cwd(), ".env");
const rootEnvPath = path.resolve(process.cwd(), "../../.env");
dotenv.config({ path: cwdEnvPath });
dotenv.config({ path: rootEnvPath });

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.warn("DATABASE_URL is not set");
}

const poolConnectionString = process.env.DATABASE_URL;
const platformConnectionString =
  process.env.PLATFORM_DATABASE_URL?.trim() || poolConnectionString;

export const pool = new Pool({
  connectionString: poolConnectionString,
  max: 20,
  idleTimeoutMillis: 30000,
});

/** Platform operations (tenant provisioning). Uses BYPASSRLS role in production when configured. */
export const platformPool = new Pool({
  connectionString: platformConnectionString,
  max: 5,
  idleTimeoutMillis: 30000,
});

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<pg.QueryResult<T>> {
  const tid = tenantContext.getStore();
  if (!tid) {
    return pool.query<T>(text, params);
  }
  return tenantQuery<T>(tid, text, params);
}

export async function platformQuery<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<pg.QueryResult<T>> {
  return platformPool.query<T>(text, params);
}

export async function withTransaction<T>(
  fn: (client: pg.PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  const tid = tenantContext.getStore();
  try {
    await client.query("BEGIN");
    if (tid) {
      await setTenantLocal(client, tid);
    }
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

/** Run queries with PostgreSQL session tenant context (RLS). */
export async function withTenant<T>(
  tenantId: string,
  fn: (client: pg.PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await setTenantLocal(client, tenantId);
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export async function tenantQuery<T extends pg.QueryResultRow = pg.QueryResultRow>(
  tenantId: string,
  text: string,
  params?: unknown[],
): Promise<pg.QueryResult<T>> {
  return withTenant(tenantId, (client) => client.query<T>(text, params));
}
