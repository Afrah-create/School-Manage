import jwt from "jsonwebtoken";
import type { Role } from "@uganda-cbc-sms/shared";

export interface JwtPayload {
  sub: string;
  role: Role;
  sid: string;
  exp: number;
}

export function signToken(userId: string, role: Role, sessionId: string): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not configured");
  const expiresIn = process.env.JWT_EXPIRES_IN ?? "8h";
  return jwt.sign({ role, sid: sessionId }, secret, {
    subject: userId,
    expiresIn: expiresIn as jwt.SignOptions["expiresIn"],
  });
}

export function verifyToken(token: string): JwtPayload {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not configured");
  const decoded = jwt.verify(token, secret) as jwt.JwtPayload & { role: Role; sid?: string };
  const sub = decoded.sub;
  if (!sub || !decoded.role || !decoded.sid || !decoded.exp) throw new Error("Invalid token payload");
  return { sub, role: decoded.role, sid: decoded.sid, exp: decoded.exp };
}
