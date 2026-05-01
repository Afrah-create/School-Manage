import type { Request, Response } from "express";
import * as assessmentSchemas from "@uganda-cbc-sms/shared/schemas/assessment.schema";
import * as svc from "./cbc.service";

const { cbcScoresBulkSchema } = assessmentSchemas;

export async function postCbc(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }
  const body = cbcScoresBulkSchema.parse(req.body);
  const r = await svc.upsertCbcScores(body, req.user.id);
  res.status(201).json({ success: true, data: r });
}

export async function getCbc(req: Request, res: Response): Promise<void> {
  const classId = req.query["classId"] as string | undefined;
  const subjectId = req.query["subjectId"] as string | undefined;
  const termId = req.query["termId"] as string | undefined;
  const rows = await svc.listCbcScores({ classId, subjectId, termId });
  res.json({ success: true, data: rows });
}

export async function submit(req: Request, res: Response): Promise<void> {
  await svc.submitScore(req.params["id"]!);
  res.json({ success: true, data: { submitted: true } });
}

export async function unlock(req: Request, res: Response): Promise<void> {
  await svc.unlockScore(req.params["id"]!);
  res.json({ success: true, data: { unlocked: true } });
}
