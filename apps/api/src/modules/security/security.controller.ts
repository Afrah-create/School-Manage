import type { Request, Response } from "express";
import * as svc from "./security.service.js";

export async function blockIp(req: Request, res: Response): Promise<void> {
  const body = svc.parseBlockIpBody(req.body);
  await svc.blockIp({
    ip: body.ip,
    reason: body.reason,
    blockedBy: req.user!.id,
    expiresAt: body.expiresAt,
  });
  res.json({ success: true, data: { ip: body.ip } });
}

export async function auditLog(req: Request, res: Response): Promise<void> {
  const severity = typeof req.query.severity === "string" ? req.query.severity : undefined;
  const from = typeof req.query.from === "string" ? req.query.from : undefined;
  const page = req.query.page ? Number(req.query.page) : 1;
  const limit = req.query.limit ? Number(req.query.limit) : 50;
  const data = await svc.listSecurityAuditLog({ severity, from, page, limit });
  res.json({ success: true, data });
}

export async function apiUsage(req: Request, res: Response): Promise<void> {
  const from = typeof req.query.from === "string" ? req.query.from : new Date(Date.now() - 7 * 86400000).toISOString();
  const to = typeof req.query.to === "string" ? req.query.to : new Date().toISOString();
  const data = await svc.apiUsageMetrics(from, to);
  res.json({ success: true, data });
}
