import Redis from "ioredis";
import { loadEnv } from "./env.js";

let client: Redis | null | undefined;
let warned = false;

export function getRedis(): Redis | null {
  if (client !== undefined) return client;

  const url = loadEnv().REDIS_URL ?? process.env.REDIS_URL;
  if (!url?.trim()) {
    if (!warned) {
      warned = true;
      console.warn("[redis] REDIS_URL not set — using in-memory fallbacks for rate limits and token blacklist.");
    }
    client = null;
    return null;
  }

  try {
    client = new Redis(url, {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      lazyConnect: true,
    });
    client.on("error", (err) => {
      console.warn("[redis] connection error:", err.message);
    });
    void client.connect().catch(() => {
      /* handled on use */
    });
  } catch (err) {
    console.warn("[redis] failed to create client:", err instanceof Error ? err.message : err);
    client = null;
  }
  return client;
}

export async function redisGet(key: string): Promise<string | null> {
  const r = getRedis();
  if (!r) return null;
  try {
    return await r.get(key);
  } catch {
    return null;
  }
}

export async function redisSetEx(key: string, ttlSeconds: number, value: string): Promise<void> {
  const r = getRedis();
  if (!r) return;
  try {
    await r.set(key, value, "EX", Math.max(1, Math.ceil(ttlSeconds)));
  } catch {
    /* ignore */
  }
}

export async function redisIncr(key: string): Promise<number> {
  const r = getRedis();
  if (!r) return 0;
  try {
    return await r.incr(key);
  } catch {
    return 0;
  }
}

export async function redisExpire(key: string, ttlSeconds: number): Promise<void> {
  const r = getRedis();
  if (!r) return;
  try {
    await r.expire(key, ttlSeconds);
  } catch {
    /* ignore */
  }
}
