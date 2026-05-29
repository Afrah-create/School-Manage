import type { Request, Response } from "express";
import * as sharedSchemas from "@uganda-cbc-sms/shared";
import { activeTenantId } from "../../utils/activeTenant.js";
import { HttpError } from "../../utils/httpError";
import * as svc from "./reports.service";

const {
  cbcReportGenerateSchema,
  alevelReportGenerateSchema,
  reportGenerateSchema,
  termReportDefaultSchema,
} = sharedSchemas;

export async function getReadiness(req: Request, res: Response): Promise<void> {
  const classId = req.query.classId as string | undefined;
  const termId = req.query.termId as string | undefined;
  const examId = req.query.examId as string | undefined;
  if (!classId || !termId) {
    throw new HttpError(400, "Please select a class and term to check report readiness.");
  }
  const data = await svc.getReportReadiness(classId, termId, examId);
  res.json({ success: true, data });
}

export async function getExamOptions(req: Request, res: Response): Promise<void> {
  const classId = req.query.classId as string | undefined;
  const termId = req.query.termId as string | undefined;
  if (!classId || !termId) {
    throw new HttpError(400, "Please select a class and term to list exams.");
  }
  const data = await svc.listReportExamOptions(classId, termId);
  res.json({ success: true, data });
}

export async function listReports(req: Request, res: Response): Promise<void> {
  const classId = req.query.classId as string | undefined;
  const termId = req.query.termId as string | undefined;
  if (!classId || !termId) {
    throw new HttpError(400, "Please select a class and term to list reports.");
  }
  const data = await svc.listClassReports(classId, termId);
  res.json({ success: true, data });
}

export async function getClassRankings(req: Request, res: Response): Promise<void> {
  const classId = req.query.classId as string | undefined;
  const termId = req.query.termId as string | undefined;
  if (!classId || !termId) {
    throw new HttpError(400, "Please select a class and term to view rankings.");
  }
  const data = await svc.getClassRankingLeaderboard(classId, termId);
  res.json({ success: true, data });
}

export async function getTermReportDefault(req: Request, res: Response): Promise<void> {
  const classId = req.query.classId as string | undefined;
  const termId = req.query.termId as string | undefined;
  if (!classId || !termId) {
    throw new HttpError(400, "Please select a class and term.");
  }
  const data = await svc.getTermReportDefault(classId, termId);
  res.json({ success: true, data });
}

export async function putTermReportDefault(req: Request, res: Response): Promise<void> {
  if (!req.user) throw new HttpError(401, "Please sign in to continue.");
  const body = termReportDefaultSchema.parse(req.body);
  const data = await svc.setTermReportDefault(
    body.classId,
    body.termId,
    body.examId,
    req.user.id,
  );
  res.json({ success: true, data, message: "Official exam for report cards updated." });
}

export async function generate(req: Request, res: Response): Promise<void> {
  const body = reportGenerateSchema.parse(req.body);
  const data = await svc.generateReportsForClass(body.classId, body.termId, body.examId);
  res.status(201).json({ success: true, data });
}

export async function regenerate(req: Request, res: Response): Promise<void> {
  const body = reportGenerateSchema.parse(req.body);
  const data = await svc.regenerateReportsForClass(body.classId, body.termId, body.examId);
  res.status(201).json({ success: true, data, message: "Report cards regenerated." });
}

export async function generateCbc(req: Request, res: Response): Promise<void> {
  const body = cbcReportGenerateSchema.parse(req.body);
  const data = await svc.generateCbcReports(body.classId, body.termId);
  res.status(201).json({ success: true, data });
}

export async function generateAlevel(req: Request, res: Response): Promise<void> {
  const body = alevelReportGenerateSchema.parse(req.body);
  const data = await svc.generateAlevelReports(body.classId, body.termId);
  res.status(201).json({ success: true, data });
}

export async function approve(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw new HttpError(401, "Please sign in to continue.");
  }
  const data = await svc.approveReport(req.params["id"]!, req.user.id);
  res.json({ success: true, data, message: "Report card approved." });
}

export async function getPdf(req: Request, res: Response): Promise<void> {
  const stream = await svc.getReportPdfStream(req.params["id"]!, activeTenantId(req));
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", "inline; filename=report.pdf");
  stream.pipe(res);
}
