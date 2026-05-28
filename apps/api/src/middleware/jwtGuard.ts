import type { NextFunction, Request, Response } from "express";
import { createHash } from "crypto";
import { query } from "../config/db.js";
import type { Role } from "@uganda-cbc-sms/shared";
import { verifyToken, type JwtPayload } from "../utils/jwt.js";
import { isTokenBlacklisted } from "../utils/tokenBlacklist.js";

const ROLE_RECHECK_SECONDS = 30 * 60;

async function resolveRole(payload: JwtPayload): Promise<Role> {
  const age = Math.floor(Date.now() / 1000) - payload.iat;
  if (age < ROLE_RECHECK_SECONDS) return payload.role;

  const { rows } = await query<{ role: Role }>(
    `SELECT role FROM users WHERE id = $1 AND deleted_at IS NULL`,
    [payload.sub],
  );
  if (!rows[0]) throw new Error("User not found");
  return rows[0].role;
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({
      success: false,
      error: "Please sign in to continue. Your session token is missing or invalid.",
      code: "UNAUTHORIZED",
    });
    return;
  }
  const token = header.slice(7);
  try {
    const payload = verifyToken(token);
    if (await isTokenBlacklisted(payload.jti)) {
      res.status(401).json({
        success: false,
        error: "Your session has ended. Please sign in again.",
        code: "UNAUTHORIZED",
      });
      return;
    }

    const tokenHash = createHash("sha256").update(token).digest("hex");
    const session = await query<{ id: string }>(
      `SELECT id FROM auth_sessions
       WHERE id = $1 AND user_id = $2 AND token_hash = $3
         AND revoked_at IS NULL AND expires_at > NOW()`,
      [payload.sid, payload.sub, tokenHash],
    );
    if (session.rowCount === 0) {
      res.status(401).json({
        success: false,
        error: "Your session has expired or you signed out elsewhere. Please sign in again.",
        code: "UNAUTHORIZED",
      });
      return;
    }

    const role = await resolveRole(payload);
    req.user = { id: payload.sub, role, sessionId: payload.sid };
    next();
  } catch {
    res.status(401).json({
      success: false,
      error: "Your login session is no longer valid. Please sign in again.",
      code: "UNAUTHORIZED",
    });
  }
}
