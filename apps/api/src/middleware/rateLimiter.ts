import rateLimit, { type Options, type Store } from "express-rate-limit";
import slowDown from "express-slow-down";
import { RedisStore, type RedisReply } from "rate-limit-redis";
import { getRedis } from "../config/redis.js";

const rateLimitMessage = (error: string) => ({
  success: false,
  error,
  code: "RATE_LIMITED",
});

function createStore(prefix: string): Store | undefined {
  const redis = getRedis();
  if (!redis) {
    console.warn(`[rate-limit] Redis unavailable — in-memory store for ${prefix}`);
    return undefined;
  }
  return new RedisStore({
    prefix: `rl:${prefix}:`,
    sendCommand: (...args: string[]) =>
      redis.call(...(args as [string, ...string[]])) as Promise<RedisReply>,
  });
}

type LimiterConfig = {
  windowMs: number;
  limit: number;
  message: Options["message"];
  storeName: string;
  skipSuccessfulRequests?: boolean;
};

function baseOptions(cfg: LimiterConfig): Options {
  const store = createStore(cfg.storeName);
  const opts = {
    standardHeaders: true,
    legacyHeaders: false,
    windowMs: cfg.windowMs,
    limit: cfg.limit,
    message: cfg.message,
    ...(cfg.skipSuccessfulRequests ? { skipSuccessfulRequests: true } : {}),
    ...(store ? { store } : {}),
  } as Options;
  return opts;
}

export const globalRateLimiter = rateLimit(
  baseOptions({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    message: rateLimitMessage("Too many requests. Please wait before retrying."),
    storeName: "global",
  }),
);

export const authRateLimiter = rateLimit(
  baseOptions({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    skipSuccessfulRequests: true,
    message: rateLimitMessage("Too many login attempts. Account may be locked."),
    storeName: "auth",
  }),
);

export const assessmentSubmitLimiter = rateLimit(
  baseOptions({
    windowMs: 60 * 1000,
    limit: 60,
    message: rateLimitMessage("Too many assessment submissions. Please slow down."),
    storeName: "assessment",
  }),
);

export const reportLimiter = rateLimit(
  baseOptions({
    windowMs: 5 * 60 * 1000,
    limit: 10,
    message: rateLimitMessage("Too many report requests. Please wait before generating more."),
    storeName: "reports",
  }),
);

export const feePaymentLimiter = rateLimit(
  baseOptions({
    windowMs: 60 * 1000,
    limit: 20,
    message: rateLimitMessage("Too many payment requests. Please wait before retrying."),
    storeName: "fees",
  }),
);

export const speedLimiter = slowDown({
  windowMs: 10 * 60 * 1000,
  delayAfter: 50,
  delayMs: (hits) => hits * 100,
  validate: { delayMs: false },
});
