import type { Request, Response } from "express";
import * as sharedSchemas from "@uganda-cbc-sms/shared";
import path from "path";
import * as svc from "./students.service";
import { getUploadRoot } from "./students.upload";

const schemaExports = (
  "default" in sharedSchemas && typeof sharedSchemas.default === "object"
    ? sharedSchemas.default
    : sharedSchemas
) as typeof sharedSchemas;

const {
  createStudentSchema,
  promoteStudentsSchema,
  updateStudentSchema,
  withdrawStudentSchema,
} = schemaExports;

export async function create(req: Request, res: Response): Promise<void> {
  const body = createStudentSchema.parse(req.body);
  const row = await svc.createStudent(body);
  res.status(201).json({ success: true, data: row });
}

export async function list(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }
  const classId = typeof req.query["classId"] === "string" ? req.query["classId"] : undefined;
  const rows = await svc.listStudents(req.user.role, req.user.id, classId);
  res.json({ success: true, data: rows });
}

export async function getOne(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }
  const row = await svc.getStudent(req.params["id"]!, req.user.role, req.user.id);
  res.json({ success: true, data: row });
}

export async function search(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }
  const q = String(req.query["q"] ?? "");
  const rows = await svc.searchStudents(q, req.user.role, req.user.id);
  res.json({ success: true, data: rows });
}

export async function uploadPhoto(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }
  if (!req.file) {
    res.status(400).json({ success: false, error: "No file uploaded" });
    return;
  }
  const id = req.params["id"]!;
  const rel = `/uploads/students/${path.basename(req.file.path)}`;
  await svc.updatePhoto(id, rel);
  res.json({ success: true, data: { photoUrl: rel } });
}

export async function promote(req: Request, res: Response): Promise<void> {
  const body = promoteStudentsSchema.parse(req.body);
  const r = await svc.promoteStudents(body);
  res.json({ success: true, data: r });
}

export async function withdraw(req: Request, res: Response): Promise<void> {
  const body = withdrawStudentSchema.parse(req.body);
  await svc.withdrawStudent(req.params["id"]!, body);
  res.json({ success: true, data: { message: "Student withdrawn" } });
}

export async function update(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }
  const body = updateStudentSchema.parse(req.body);
  const row = await svc.updateStudent(req.params["id"]!, req.user.role, req.user.id, body);
  res.json({ success: true, data: row });
}

export async function destroy(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }
  await svc.deleteStudent(req.params["id"]!, req.user.role, req.user.id);
  res.json({ success: true, data: { deleted: true } });
}

export function publicUploadsPath(): string {
  return path.join(getUploadRoot(), "students");
}
