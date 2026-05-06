import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { HttpError } from "../utils/httpError";

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

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ZodError) {
    const msg = friendlyZodMessage(err);
    res.status(400).json({ success: false, error: msg });
    return;
  }
  if (err instanceof HttpError) {
    res.status(err.status).json({ success: false, error: err.message });
    return;
  }
  const message = err instanceof Error ? err.message : "Internal server error";
  const status =
    err instanceof Error && "status" in err && typeof (err as { status?: number }).status === "number"
      ? (err as { status: number }).status
      : 500;
  console.error(err);
  res.status(status >= 400 && status < 600 ? status : 500).json({
    success: false,
    error: message,
  });
}
