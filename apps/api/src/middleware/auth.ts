import type { NextFunction, Request, Response } from "express";
import { createHash } from "crypto";
import { query } from "../config/db";
import { verifyToken } from "../utils/jwt";

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({
      success: false,
      error: "Please sign in to continue. Your session token is missing or invalid.",
    });
    return;
  }
  const token = header.slice(7);
  try {
    const payload = verifyToken(token);
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const session = await query<{ id: string }>(
      `SELECT id
       FROM auth_sessions
       WHERE id = $1
         AND user_id = $2
         AND token_hash = $3
         AND revoked_at IS NULL
         AND expires_at > NOW()`,
      [payload.sid, payload.sub, tokenHash],
    );
    if (session.rowCount === 0) {
      res.status(401).json({
        success: false,
        error: "Your session has expired or you signed out elsewhere. Please sign in again.",
      });
      return;
    }
    req.user = { id: payload.sub, role: payload.role, sessionId: payload.sid };
    next();
  } catch {
    res.status(401).json({
      success: false,
      error: "Your login session is no longer valid. Please sign in again.",
    });
  }
}
