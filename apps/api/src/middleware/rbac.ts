import type { Role } from "@uganda-cbc-sms/shared";
import type { NextFunction, Request, Response } from "express";

export function requireRoles(...allowed: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "Please sign in again. Your identity could not be confirmed.",
      });
      return;
    }
    if (!allowed.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: "Your role does not include access to this area. Ask an administrator if you need permission.",
      });
      return;
    }
    next();
  };
}
