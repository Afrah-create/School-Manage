import type { Request, Response } from "express";
import {
  createExamSchema,
  examMarksBulkSchema,
  examMarksSubmitSchema,
  updateExamSchema,
} from "@uganda-cbc-sms/shared";
import { HttpError } from "../../utils/httpError";
import * as svc from "./exams.service";

export async function listExams(req: Request, res: Response) {
  const data = await svc.listExams({
    academicYearId: req.query.academicYearId as string | undefined,
    termId: req.query.termId as string | undefined,
    classId: req.query.classId as string | undefined,
    status: req.query.status as string | undefined,
  });
  res.json({ success: true, data });
}

export async function listOpenExams(req: Request, res: Response) {
  if (!req.user) throw new HttpError(401, "Please sign in to continue.");
  const data = await svc.listOpenExamsForTeacher(req.user.id, req.user.role);
  res.json({ success: true, data });
}

export async function listMarkingSlots(req: Request, res: Response) {
  if (!req.user) throw new HttpError(401, "Please sign in to continue.");
  const data = await svc.listTeacherMarkingSlots(req.user.id, req.user.role);
  res.json({ success: true, data });
}

export async function getExam(req: Request, res: Response) {
  if (!req.user) throw new HttpError(401, "Please sign in to continue.");
  const data = await svc.getExamForTeacher(req.params.id!, req.user.id, req.user.role);
  res.json({ success: true, data });
}

export async function createExam(req: Request, res: Response) {
  if (!req.user) throw new HttpError(401, "Please sign in to continue.");
  const input = createExamSchema.parse(req.body);
  const data = await svc.createExam(input, req.user.id);
  res.status(201).json({ success: true, data });
}

export async function updateExam(req: Request, res: Response) {
  const input = updateExamSchema.parse(req.body);
  const data = await svc.updateExam(req.params.id!, input);
  res.json({ success: true, data });
}

export async function deleteExam(req: Request, res: Response) {
  await svc.deleteExam(req.params.id!, req.user?.id);
  res.json({ success: true, data: { deleted: true } });
}

export async function openExam(req: Request, res: Response) {
  const data = await svc.openExam(req.params.id!);
  res.json({ success: true, data });
}

export async function closeExam(req: Request, res: Response) {
  const data = await svc.closeExam(req.params.id!);
  res.json({ success: true, data });
}

export async function reopenExam(req: Request, res: Response) {
  const data = await svc.reopenExam(req.params.id!);
  res.json({ success: true, data });
}

export async function listExamSubjects(req: Request, res: Response) {
  if (!req.user) throw new HttpError(401, "Please sign in to continue.");
  const data = await svc.listTeacherSubjectsForExam(req.params.id!, req.user.id, req.user.role);
  res.json({ success: true, data });
}

export async function getExamMarks(req: Request, res: Response) {
  if (!req.user) throw new HttpError(401, "Please sign in to continue.");
  const subjectId = req.query.subjectId as string | undefined;
  if (!subjectId) {
    throw new HttpError(400, "Please select a subject to view marks.");
  }
  const data = await svc.listExamMarks(
    req.params.id!,
    subjectId,
    req.user.id,
    req.user.role,
  );
  res.json({ success: true, data });
}

export async function saveExamMarks(req: Request, res: Response) {
  if (!req.user) throw new HttpError(401, "Please sign in to continue.");
  const input = examMarksBulkSchema.parse(req.body);
  const data = await svc.upsertExamMarks(req.params.id!, input, req.user.id, req.user.role);
  res.json({ success: true, data });
}

export async function submitExamMarks(req: Request, res: Response) {
  if (!req.user) throw new HttpError(401, "Please sign in to continue.");
  const { subjectId } = examMarksSubmitSchema.parse(req.body);
  const data = await svc.submitExamMarks(req.params.id!, subjectId, req.user.id, req.user.role);
  res.json({ success: true, data });
}

export async function unlockExamMarks(req: Request, res: Response) {
  const { subjectId } = examMarksSubmitSchema.parse(req.body);
  const data = await svc.unlockExamMarks(req.params.id!, subjectId);
  res.json({ success: true, data });
}
