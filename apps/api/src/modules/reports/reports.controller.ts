import type { Request, Response } from "express";
import * as sharedSchemas from "@uganda-cbc-sms/shared";
import * as svc from "./reports.service";

const { alevelReportGenerateSchema, cbcReportGenerateSchema } = sharedSchemas;

export async function generateCbc(req: Request, res: Response): Promise<void> {
  const body = cbcReportGenerateSchema.parse(req.body);
  const r = await svc.generateCbcReports(body.classId, body.termId);
  res.status(201).json({ success: true, data: r });
}

export async function generateAlevel(req: Request, res: Response): Promise<void> {
  const body = alevelReportGenerateSchema.parse(req.body);
  const r = await svc.generateAlevelReports(body.classId, body.termId);
  res.status(201).json({ success: true, data: r });
}

export async function approve(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }
  const r = await svc.approveReport(req.params["id"]!, req.user.id);
  res.json({ success: true, data: r });
}

export async function getPdf(req: Request, res: Response): Promise<void> {
  const stream = await svc.getReportPdfStream(req.params["id"]!);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", "inline; filename=report.pdf");
  stream.pipe(res);
}
