import type { Request, Response } from "express";
import * as sharedSchemas from "@uganda-cbc-sms/shared";
import * as svc from "./attendance.service";

const {
  attendanceSchema,
  attendanceAdminOverviewQuerySchema,
  attendanceRangeQuerySchema,
  attendanceRegisterQuerySchema,
  attendanceRegisterSaveSchema,
  attendanceRegisterSubmitSchema,
} = sharedSchemas;

export async function postAttendance(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }
  const body = attendanceSchema.parse(req.body);
  await svc.recordAttendance(body, req.user.id, req.user.role);
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

export async function getAttendanceRegister(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }
  const q = attendanceRegisterQuerySchema.parse(req.query);
  const data = await svc.getAttendanceRegister(q.classId, q.date, req.user.role, req.user.id);
  res.json({ success: true, data });
}

export async function putAttendanceRegister(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }
  const body = attendanceRegisterSaveSchema.parse(req.body);
  const data = await svc.saveAttendanceRegister(body, req.user.id, req.user.role);
  res.json({ success: true, data, message: "Attendance draft saved." });
}

export async function postAttendanceRegisterSubmit(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }
  const body = attendanceRegisterSubmitSchema.parse(req.body);
  const data = await svc.submitAttendanceRegister(body.classId, body.date, req.user.id, req.user.role);
  res.json({ success: true, data, message: "Attendance register submitted." });
}

export async function getAttendanceRange(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }
  const q = attendanceRangeQuerySchema.parse(req.query);
  const data = await svc.getAttendanceRange(q, req.user.role, req.user.id);
  res.json({ success: true, data });
}

export async function getAttendanceAdminOverview(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }
  const q = attendanceAdminOverviewQuerySchema.parse(req.query);
  const data = await svc.getAttendanceAdminOverview(q);
  res.json({ success: true, data });
}
