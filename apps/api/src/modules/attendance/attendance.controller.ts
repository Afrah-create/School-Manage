import type { Request, Response } from "express";
import * as sharedSchemas from "@uganda-cbc-sms/shared";
import * as svc from "./attendance.service";

const { attendanceSchema } = sharedSchemas;

export async function postAttendance(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }
  const body = attendanceSchema.parse(req.body);
  await svc.recordAttendance(body, req.user.id);
  res.status(201).json({ success: true, data: { saved: true } });
}

export async function getAttendance(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }
  const classId = String(req.query["classId"] ?? "");
  const date = String(req.query["date"] ?? "");
  if (!classId || !date) {
    res.status(400).json({ success: false, error: "classId and date are required" });
    return;
  }
  const rows = await svc.listAttendance(classId, date, req.user.role, req.user.id);
  res.json({ success: true, data: rows });
}
