import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import type { AuditCategory } from "@uganda-cbc-sms/shared";
import { writeAuditLog } from "../modules/audit/audit.service.js";
import { writeSecurityAuditLog } from "../modules/security/securityAudit.service.js";
import { HttpError } from "../utils/httpError.js";

function friendlyZodMessage(err: ZodError): string {
  return err.errors
    .map((issue) => {
      const last = issue.path.length ? issue.path[issue.path.length - 1] : null;
      const key =
        typeof last === "string" ? last : typeof last === "number" ? String(last) : "";
      const spaced = key ? key.replace(/([A-Z])/g, " $1").replace(/_/g, " ").trim() : "";
      const label = spaced ? spaced.charAt(0).toUpperCase() + spaced.slice(1) : "";
      const prefix = label ? `${label}: ` : "";
      return `${prefix}${issue.message}`;
    })
    .join(" ");
}

function categoryFromPath(path: string): AuditCategory {
  if (path.startsWith("/api/auth")) return "auth";
  if (path.startsWith("/api/users")) return "users";
  if (path.startsWith("/api/students")) return "students";
  if (path.startsWith("/api/academic")) return "academic";
  if (path.startsWith("/api/assessments")) return "assessments";
  if (path.startsWith("/api/exams")) return "exams";
  if (path.startsWith("/api/attendance")) return "attendance";
  if (path.startsWith("/api/fees")) return "fees";
  if (path.startsWith("/api/reports")) return "reports";
  if (path.startsWith("/api/timetable")) return "timetable";
  return "system";
}

function shouldSkipAuditLog(req: Request): boolean {
  const path = req.path ?? "";
  if (path === "/api/health" || path.startsWith("/uploads")) return true;
  return false;
}

async function logHttpError(req: Request, status: number, message: string, action: string): Promise<void> {
  if (status < 400 || shouldSkipAuditLog(req)) return;
  const severity = status >= 500 ? "error" : status >= 400 ? "warning" : "info";
  void writeAuditLog({
    category: categoryFromPath(req.path ?? ""),
    severity,
    outcome: "failure",
    action,
    message,
    actorId: req.user?.id ?? null,
    ipAddress: req.ip ?? null,
    userAgent: req.get("user-agent") ?? null,
    httpMethod: req.method,
    httpPath: req.originalUrl ?? req.path,
    httpStatus: status,
    metadata: { error: message },
  });
}

function errorCode(status: number): string {
  if (status === 400) return "VALIDATION_ERROR";
  if (status === 401) return "UNAUTHORIZED";
  if (status === 403) return "FORBIDDEN";
  if (status === 404) return "NOT_FOUND";
  if (status === 423) return "ACCOUNT_LOCKED";
  if (status === 429) return "RATE_LIMITED";
  return "INTERNAL_ERROR";
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const isProd = process.env.NODE_ENV === "production";

  if (err instanceof ZodError) {
    const msg = friendlyZodMessage(err);
    void logHttpError(req, 400, msg, "VALIDATION_ERROR");
    res.status(400).json({ success: false, error: msg, code: "VALIDATION_ERROR" });
    return;
  }

  if (err instanceof HttpError) {
    void logHttpError(req, err.status, err.message, `HTTP_${err.status}`);
    res.status(err.status).json({
      success: false,
      error: err.message,
      code: errorCode(err.status),
    });
    return;
  }

  const rateLimitStatus =
    err instanceof Error && "status" in err && (err as { status?: number }).status === 429
      ? 429
      : null;
  if (rateLimitStatus === 429) {
    res.status(429).json({
      success: false,
      error: "Too many requests. Please wait before retrying.",
      code: "RATE_LIMITED",
    });
    return;
  }

  const message = err instanceof Error ? err.message : "Internal server error";
  const status =
    err instanceof Error && "status" in err && typeof (err as { status?: number }).status === "number"
      ? (err as { status: number }).status
      : 500;

  if (!isProd) {
    console.error(err);
  } else {
    console.error(message);
  }

  const httpStatus = status >= 400 && status < 600 ? status : 500;
  void logHttpError(req, httpStatus, message, "INTERNAL_ERROR");

  if (httpStatus >= 500) {
    writeSecurityAuditLog({
      eventType: "internal_error",
      ipAddress: req.ip ?? null,
      userId: req.user?.id ?? null,
      severity: "critical",
      details: {
        message,
        stack: err instanceof Error && !isProd ? err.stack : undefined,
        path: req.originalUrl,
      },
    });
  }

  res.status(httpStatus).json({
    success: false,
    error: isProd && httpStatus >= 500 ? "An internal error occurred." : message,
    code: errorCode(httpStatus),
  });
}
