import type { NextFunction, Request, Response } from "express";
import xss from "xss";
import {
  isValidAlevelScore,
  isValidEmail,
  isValidStudentNumber,
  isValidUgxAmount,
} from "../utils/securityValidators.js";

const SKIP_KEYS = new Set([
  "password",
  "currentPassword",
  "newPassword",
  "confirmPassword",
  "token",
  "code",
]);

function sanitiseValue(value: unknown): unknown {
  if (typeof value === "string") return xss(value.trim());
  if (Array.isArray(value)) return value.map(sanitiseValue);
  if (value && typeof value === "object") return sanitiseObject(value as Record<string, unknown>);
  return value;
}

function sanitiseObject(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (SKIP_KEYS.has(key)) {
      out[key] = val;
    } else {
      out[key] = sanitiseValue(val);
    }
  }
  return out;
}

export function globalInputSanitiser(req: Request, _res: Response, next: NextFunction): void {
  if (req.body && typeof req.body === "object" && !Array.isArray(req.body)) {
    req.body = sanitiseObject(req.body as Record<string, unknown>);
  }
  next();
}

type FieldType = "string" | "email" | "integer:0-100" | "ugx" | "studentNumber";

export function validateBody(schema: Record<string, FieldType>) {
  const allowed = new Set(Object.keys(schema));
  return (req: Request, res: Response, next: NextFunction): void => {
    const body = req.body as Record<string, unknown>;
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      res.status(400).json({ success: false, error: "Invalid request body", code: "VALIDATION_ERROR" });
      return;
    }
    const extra = Object.keys(body).filter((k) => !allowed.has(k));
    if (extra.length) {
      res.status(400).json({
        success: false,
        error: `Unexpected fields: ${extra.join(", ")}`,
        code: "VALIDATION_ERROR",
      });
      return;
    }
    for (const [key, type] of Object.entries(schema)) {
      if (!(key in body)) continue;
      const val = body[key];
      if (type === "string" && typeof val !== "string") {
        res.status(400).json({ success: false, error: `${key} must be a string`, code: "VALIDATION_ERROR" });
        return;
      }
      if (type === "email" && (typeof val !== "string" || !isValidEmail(val))) {
        res.status(400).json({ success: false, error: `${key} must be a valid email`, code: "VALIDATION_ERROR" });
        return;
      }
      if (type === "integer:0-100" && !isValidAlevelScore(val)) {
        res.status(400).json({ success: false, error: `${key} must be an integer 0–100`, code: "VALIDATION_ERROR" });
        return;
      }
      if (type === "ugx" && !isValidUgxAmount(val)) {
        res.status(400).json({ success: false, error: `${key} must be a valid UGX amount`, code: "VALIDATION_ERROR" });
        return;
      }
      if (type === "studentNumber" && (typeof val !== "string" || !isValidStudentNumber(val))) {
        res.status(400).json({ success: false, error: `${key} must match SMS-YYYY-NNNNN`, code: "VALIDATION_ERROR" });
        return;
      }
    }
    next();
  };
}
