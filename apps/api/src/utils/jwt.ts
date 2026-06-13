import crypto from "crypto";
import jwt from "jsonwebtoken";
import type { Role } from "@uganda-cbc-sms/shared";
import { loadEnv } from "../config/env.js";

export interface JwtPayload {
  sub: string;
  role: Role;
  sid: string;
  jti: string;
  tid: string;
  /** Tenant subdomain slug (for host routing). */
  tsl: string;
  /** Force password change before app access (login-time only). */
  fpc?: number;
  exp: number;
  iat: number;
}

export interface PlatformJwtPayload {
  sub: string;
  jti: string;
  aud: "platform";
  exp: number;
  iat: number;
}

export function signToken(
  userId: string,
  role: Role,
  sessionId: string,
  tenantId: string,
  tenantSlug: string,
  options?: { forcePasswordChange?: boolean },
): string {
  const env = loadEnv();
  const jti = crypto.randomUUID();
  const claims: Record<string, unknown> = {
    role,
    sid: sessionId,
    jti,
    tid: tenantId,
    tsl: tenantSlug,
  };
  if (options?.forcePasswordChange) {
    claims.fpc = 1;
  }
  return jwt.sign(claims, env.JWT_PRIVATE_KEY, {
    subject: userId,
    algorithm: "RS256",
    expiresIn: env.JWT_EXPIRY as jwt.SignOptions["expiresIn"],
  });
}

export function verifyToken(token: string): JwtPayload {
  const env = loadEnv();
  const decoded = jwt.verify(token, env.JWT_PUBLIC_KEY, {
    algorithms: ["RS256"],
  }) as jwt.JwtPayload & { role: Role; sid?: string; jti?: string; tid?: string; tsl?: string };

  const sub = decoded.sub;
  if (
    !sub ||
    !decoded.role ||
    !decoded.sid ||
    !decoded.jti ||
    !decoded.tid ||
    !decoded.tsl ||
    !decoded.exp ||
    !decoded.iat
  ) {
    throw new Error("Invalid token payload");
  }
  return {
    sub,
    role: decoded.role,
    sid: decoded.sid,
    jti: decoded.jti,
    tid: decoded.tid,
    tsl: decoded.tsl,
    fpc: typeof decoded.fpc === "number" ? decoded.fpc : undefined,
    exp: decoded.exp,
    iat: decoded.iat,
  };
}

export function signPlatformToken(adminId: string): string {
  const env = loadEnv();
  const jti = crypto.randomUUID();
  return jwt.sign({ aud: "platform", jti }, env.JWT_PRIVATE_KEY, {
    subject: adminId,
    algorithm: "RS256",
    expiresIn: env.JWT_EXPIRY as jwt.SignOptions["expiresIn"],
  });
}

export function verifyPlatformToken(token: string): PlatformJwtPayload {
  const env = loadEnv();
  const decoded = jwt.verify(token, env.JWT_PUBLIC_KEY, {
    algorithms: ["RS256"],
  }) as jwt.JwtPayload & { aud?: string; jti?: string };

  const sub = decoded.sub;
  if (!sub || decoded.aud !== "platform" || !decoded.jti || !decoded.exp || !decoded.iat) {
    throw new Error("Invalid platform token payload");
  }
  return {
    sub,
    jti: decoded.jti,
    aud: "platform",
    exp: decoded.exp,
    iat: decoded.iat,
  };
}

export function tokenRemainingSeconds(exp: number): number {
  return Math.max(1, exp - Math.floor(Date.now() / 1000));
}
