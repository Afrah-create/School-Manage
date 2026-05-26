import type { Request, Response } from "express";
import {
  createExamSchema,
  examEntriesPresetSchema,
  examMarksBulkSchema,
  examMarksSubmitSchema,
  permanentDeleteExamSchema,
  saveExamEntriesSchema,
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
    includeArchived: req.query.includeArchived === "true",
    archivedOnly: req.query.archivedOnly === "true",
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
  const includeArchived = req.query.includeArchived === "true";
  const data = await svc.getExamForTeacher(req.params.id!, req.user.id, req.user.role, {
    includeArchived,
  });
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

export async function archiveExam(req: Request, res: Response) {
  await svc.archiveExam(req.params.id!, req.user?.id);
  res.json({ success: true, data: { archived: true }, message: "Exam archived." });
}

export async function restoreExam(req: Request, res: Response) {
  await svc.restoreExam(req.params.id!);
  const data = await svc.getExamById(req.params.id!);
  res.json({ success: true, data, message: "Exam restored to active lists." });
}

export async function getExamDeletionImpact(req: Request, res: Response) {
  const data = await svc.getExamDeletionImpact(req.params.id!);
  res.json({ success: true, data });
}

export async function permanentDeleteExam(req: Request, res: Response) {
  const { confirmName } = permanentDeleteExamSchema.parse(req.body);
  const data = await svc.permanentDeleteExam(req.params.id!, confirmName);
  res.json({
    success: true,
    data,
    message: "Exam and all related marks were permanently removed.",
  });
}

export async function openExam(req: Request, res: Response) {
  const data = await svc.openExam(req.params.id!);
  res.json({ success: true, data });
}

export async function closeExam(req: Request, res: Response) {
  const force = req.query.force === "true";
  const data = await svc.closeExam(req.params.id!, { force });
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

export async function getExamEntries(req: Request, res: Response) {
  const data = await svc.getExamEntries(req.params.id!);
  res.json({ success: true, data });
}

export async function saveExamEntries(req: Request, res: Response) {
  const input = saveExamEntriesSchema.parse(req.body);
  const data = await svc.saveExamEntries(req.params.id!, input);
  res.json({ success: true, data });
}

export async function applyExamEntriesPreset(req: Request, res: Response) {
  const { preset } = examEntriesPresetSchema.parse(req.body);
  const data = await svc.applyExamEntriesPreset(req.params.id!, preset);
  res.json({ success: true, data });
}
