import { redisSetEx } from "../config/redis.js";

const memoryBlacklist = new Map<string, number>();

function purgeMemory(): void {
  const now = Date.now();
  for (const [jti, exp] of memoryBlacklist) {
    if (exp <= now) memoryBlacklist.delete(jti);
  }
}

export async function blacklistToken(jti: string, ttlSeconds: number): Promise<void> {
  await redisSetEx(`blacklist:${jti}`, ttlSeconds, "1");
  memoryBlacklist.set(jti, Date.now() + ttlSeconds * 1000);
}

export async function isTokenBlacklisted(jti: string): Promise<boolean> {
  purgeMemory();
  const mem = memoryBlacklist.get(jti);
  if (mem && mem > Date.now()) return true;

  const { redisGet } = await import("../config/redis.js");
  const hit = await redisGet(`blacklist:${jti}`);
  return hit === "1";
}
