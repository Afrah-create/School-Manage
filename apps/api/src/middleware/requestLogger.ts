import type { NextFunction, Request, Response } from "express";
import { loadEnv } from "../config/env.js";
import { query } from "../config/db.js";

function shouldSample(statusCode: number, rate: number): boolean {
  if (rate >= 1) return true;
  if (statusCode >= 400) return true;
  return Math.random() < rate;
}

export function requestLoggerMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  const env = loadEnv();

  res.on("finish", () => {
    if (!shouldSample(res.statusCode, env.REQUEST_LOG_SAMPLE_RATE)) return;
    const ms = Date.now() - start;
    const reqSize = Number(req.headers["content-length"] ?? 0) || null;
    const cacheHit = res.getHeader("X-Cache") === "HIT";

    void query(
      `INSERT INTO api_request_log (
        method, path, user_id, ip_address, status_code, response_time_ms,
        request_size_bytes, response_size_bytes, cache_hit
      ) VALUES ($1, $2, $3, $4::inet, $5, $6, $7, $8, $9)`,
      [
        req.method,
        req.path.slice(0, 255),
        req.user?.id ?? null,
        req.ip ?? null,
        res.statusCode,
        ms,
        reqSize,
        null,
        cacheHit,
      ],
    ).catch((err) => {
      console.error("[api_request_log]", err instanceof Error ? err.message : err);
    });
  });

  next();
}
