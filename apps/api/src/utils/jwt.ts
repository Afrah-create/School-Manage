import crypto from "crypto";
import jwt from "jsonwebtoken";
import type { Role } from "@uganda-cbc-sms/shared";
import { loadEnv } from "../config/env.js";

export interface JwtPayload {
  sub: string;
  role: Role;
  sid: string;
  jti: string;
  exp: number;
  iat: number;
}

export function signToken(userId: string, role: Role, sessionId: string): string {
  const env = loadEnv();
  const jti = crypto.randomUUID();
  return jwt.sign({ role, sid: sessionId, jti }, env.JWT_PRIVATE_KEY, {
    subject: userId,
    algorithm: "RS256",
    expiresIn: env.JWT_EXPIRY as jwt.SignOptions["expiresIn"],
  });
}

export function verifyToken(token: string): JwtPayload {
  const env = loadEnv();
  const decoded = jwt.verify(token, env.JWT_PUBLIC_KEY, {
    algorithms: ["RS256"],
  }) as jwt.JwtPayload & { role: Role; sid?: string; jti?: string };

  const sub = decoded.sub;
  if (!sub || !decoded.role || !decoded.sid || !decoded.jti || !decoded.exp || !decoded.iat) {
    throw new Error("Invalid token payload");
  }
  return {
    sub,
    role: decoded.role,
    sid: decoded.sid,
    jti: decoded.jti,
    exp: decoded.exp,
    iat: decoded.iat,
  };
}

export function tokenRemainingSeconds(exp: number): number {
  return Math.max(1, exp - Math.floor(Date.now() / 1000));
}
