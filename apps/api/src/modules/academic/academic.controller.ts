import type { Request, Response } from "express";
import * as sharedSchemas from "@uganda-cbc-sms/shared";
import { HttpError } from "../../utils/httpError";
import { getUserById } from "../users/users.service";
import * as gradingMaintenance from "./gradingScaleMaintenance";
import * as svc from "./academic.service";

const schemas = (sharedSchemas as Record<string, unknown>).default
  ? ((sharedSchemas as Record<string, unknown>).default as Record<string, unknown>)
  : (sharedSchemas as Record<string, unknown>);

const {
  academicYearSchema,
  classSchema,
  classSubjectSchema,
  classSubjectBulkSchema,
  bulkAssignTeacherSchema,
  teacherAssignmentsQuerySchema,
  eligibleTeachersQuerySchema,
  teacherSpecializationsSchema,
  updateClassSubjectSchema,
  combinationSchema,
  updateCombinationSchema,
  combinationSubjectSchema,
  cbcStrandSchema,
  updateCbcStrandSchema,
  cbcSubStrandSchema,
  updateCbcSubStrandSchema,
  subjectSchema,
  termSchema,
  updateAcademicYearSchema,
  updateClassSchema,
  updateSubjectSchema,
  updateTermSchema,
  upsertGradingScaleSchema,
} = schemas as {
  academicYearSchema: { parse: (v: unknown) => unknown };
  classSchema: { parse: (v: unknown) => unknown };
  classSubjectSchema: { parse: (v: unknown) => unknown };
  classSubjectBulkSchema: { parse: (v: unknown) => unknown };
  bulkAssignTeacherSchema: { parse: (v: unknown) => unknown };
  teacherAssignmentsQuerySchema: { parse: (v: unknown) => unknown };
  eligibleTeachersQuerySchema: { parse: (v: unknown) => unknown };
  teacherSpecializationsSchema: { parse: (v: unknown) => unknown };
  updateClassSubjectSchema: { parse: (v: unknown) => unknown };
  combinationSchema: { parse: (v: unknown) => unknown };
  updateCombinationSchema: { parse: (v: unknown) => unknown };
  combinationSubjectSchema: { parse: (v: unknown) => unknown };
  cbcStrandSchema: { parse: (v: unknown) => unknown };
  updateCbcStrandSchema: { parse: (v: unknown) => unknown };
  cbcSubStrandSchema: { parse: (v: unknown) => unknown };
  updateCbcSubStrandSchema: { parse: (v: unknown) => unknown };
  subjectSchema: { parse: (v: unknown) => unknown };
  termSchema: { parse: (v: unknown) => unknown };
  updateAcademicYearSchema: { parse: (v: unknown) => unknown };
  updateClassSchema: { parse: (v: unknown) => unknown };
  updateSubjectSchema: { parse: (v: unknown) => unknown };
  updateTermSchema: { parse: (v: unknown) => unknown };
  upsertGradingScaleSchema: { parse: (v: unknown) => unknown };
};

export async function postYear(req: Request, res: Response): Promise<void> {
  const body = academicYearSchema.parse(req.body);
  const row = await svc.createAcademicYear(body);
  res.status(201).json({ success: true, data: row });
}

export async function getYears(_req: Request, res: Response): Promise<void> {
  const rows = await svc.listAcademicYears();
  res.json({ success: true, data: rows });
}

export async function patchYear(req: Request, res: Response): Promise<void> {
  const body = updateAcademicYearSchema.parse(req.body);
  const row = await svc.updateAcademicYear(req.params["id"]!, body);
  res.json({ success: true, data: row });
}

export async function deleteYear(req: Request, res: Response): Promise<void> {
  await svc.deleteAcademicYear(req.params["id"]!);
  res.json({ success: true, data: { deleted: true } });
}

export async function postTerm(req: Request, res: Response): Promise<void> {
  const body = termSchema.parse(req.body);
  const row = await svc.createTerm(body);
  res.status(201).json({ success: true, data: row });
}

export async function getTerms(_req: Request, res: Response): Promise<void> {
  const rows = await svc.listTerms();
  res.json({ success: true, data: rows });
}

export async function patchTerm(req: Request, res: Response): Promise<void> {
  const body = updateTermSchema.parse(req.body);
  const row = await svc.updateTerm(req.params["id"]!, body);
  res.json({ success: true, data: row });
}

export async function deleteTerm(req: Request, res: Response): Promise<void> {
  await svc.deleteTerm(req.params["id"]!);
  res.json({ success: true, data: { deleted: true } });
}

export async function postClass(req: Request, res: Response): Promise<void> {
  const body = classSchema.parse(req.body);
  const row = await svc.createClass(body);
  res.status(201).json({ success: true, data: row });
}

export async function getClasses(_req: Request, res: Response): Promise<void> {
  const rows = await svc.listClasses();
  res.json({ success: true, data: rows });
}

export async function patchClass(req: Request, res: Response): Promise<void> {
  const body = updateClassSchema.parse(req.body);
  const row = await svc.updateClass(req.params["id"]!, body);
  res.json({ success: true, data: row });
}

export async function deleteClass(req: Request, res: Response): Promise<void> {
  await svc.deleteClass(req.params["id"]!);
  res.json({ success: true, data: { deleted: true } });
}

export async function postSubject(req: Request, res: Response): Promise<void> {
  const body = subjectSchema.parse(req.body);
  const row = await svc.createSubject(body);
  res.status(201).json({ success: true, data: row });
}

export async function getSubjects(_req: Request, res: Response): Promise<void> {
  const rows = await svc.listSubjects();
  res.json({ success: true, data: rows });
}

export async function patchSubject(req: Request, res: Response): Promise<void> {
  const body = updateSubjectSchema.parse(req.body);
  const row = await svc.updateSubject(req.params["id"]!, body);
  res.json({ success: true, data: row });
}

export async function deleteSubject(req: Request, res: Response): Promise<void> {
  await svc.deleteSubject(req.params["id"]!);
  res.json({ success: true, data: { deleted: true } });
}

export async function postClassSubject(req: Request, res: Response): Promise<void> {
  const body = classSubjectSchema.parse(req.body);
  const row = await svc.createClassSubject(body);
  res.status(201).json({ success: true, data: row, message: "Class subject assigned." });
}

export async function getClassSubjects(req: Request, res: Response): Promise<void> {
  const rows = await svc.getClassSubjects({
    classId: req.query["classId"] as string | undefined,
    academicYearId: req.query["academicYearId"] as string | undefined,
    teacherId: req.query["teacherId"] as string | undefined,
  });
  res.json({ success: true, data: rows, message: "Class subject assignments loaded." });
}

export async function getClassSubjectById(req: Request, res: Response): Promise<void> {
  const row = await svc.getClassSubjectById(req.params["id"]!);
  res.json({ success: true, data: row, message: "Class subject assignment loaded." });
}

export async function putClassSubject(req: Request, res: Response): Promise<void> {
  const body = updateClassSubjectSchema.parse(req.body);
  const row = await svc.updateClassSubject(req.params["id"]!, body);
  res.json({ success: true, data: row, message: "Class subject assignment updated." });
}

export async function deleteClassSubject(req: Request, res: Response): Promise<void> {
  await svc.deleteClassSubject(req.params["id"]!);
  res.json({ success: true, data: { deleted: true }, message: "Class subject assignment deleted." });
}

export async function postClassSubjectsBulk(req: Request, res: Response): Promise<void> {
  const body = classSubjectBulkSchema.parse(req.body);
  const rows = await svc.bulkAssignSubjectsToClass(body);
  res.status(201).json({ success: true, data: rows, message: "Subjects assigned to class." });
}

const SUBJECT_TEACHER_ROLES = new Set(["subject_teacher", "headteacher", "admin"]);

export async function postBulkAssignTeacher(req: Request, res: Response): Promise<void> {
  const body = bulkAssignTeacherSchema.parse(req.body) as {
    teacherId: string | null;
    classSubjectIds: string[];
  };
  if (body.teacherId) {
    const teacher = await getUserById(body.teacherId);
    if (!SUBJECT_TEACHER_ROLES.has(teacher.role)) {
      throw new HttpError(
        400,
        `User role '${teacher.role}' cannot be assigned as a subject teacher`,
      );
    }
  }
  const updated = await svc.bulkAssignTeacher(body.teacherId, body.classSubjectIds);
  res.json({
    success: true,
    data: { updated, count: updated.length },
    message: "Teacher assignment updated for selected subjects.",
  });
}

export async function getTeacherWorkload(req: Request, res: Response): Promise<void> {
  const queryParams = teacherAssignmentsQuerySchema.parse(req.query) as { academicYearId: string };
  const teacherId = req.params["teacherId"]!;
  const assignments = await svc.getTeacherAssignments(teacherId, queryParams.academicYearId);
  const totalCount = await svc.getTeacherAssignmentCount(teacherId, queryParams.academicYearId);
  res.json({
    success: true,
    data: { assignments, totalCount },
    message: "Teacher assignments loaded.",
  });
}

export async function getUnassignedClassSubjects(req: Request, res: Response): Promise<void> {
  const queryParams = teacherAssignmentsQuerySchema.parse(req.query) as {
    academicYearId: string;
    classId?: string;
    teacherId?: string;
  };
  const unassigned = await svc.getUnassignedClassSubjects(queryParams.academicYearId, {
    classId: queryParams.classId,
    teacherId: queryParams.teacherId,
  });
  res.json({
    success: true,
    data: { unassigned, count: unassigned.length },
    message: "Unassigned class subjects loaded.",
  });
}

export async function getTeachingStaff(_req: Request, res: Response): Promise<void> {
  const staff = await svc.listTeachingStaff();
  res.json({ success: true, data: staff, message: "Teaching staff loaded." });
}

export async function getEligibleTeachers(req: Request, res: Response): Promise<void> {
  const queryParams = eligibleTeachersQuerySchema.parse(req.query) as {
    subjectIds: string[];
    classId?: string;
  };
  const teachers = await svc.getEligibleTeachers({
    subjectIds: queryParams.subjectIds,
    classId: queryParams.classId,
  });
  res.json({ success: true, data: teachers, message: "Eligible teachers loaded." });
}

export async function getTeacherSpecializations(req: Request, res: Response): Promise<void> {
  const rows = await svc.getTeacherSpecializations(req.params["teacherId"]!);
  res.json({ success: true, data: rows, message: "Teacher specializations loaded." });
}

export async function putTeacherSpecializations(req: Request, res: Response): Promise<void> {
  const body = teacherSpecializationsSchema.parse(req.body) as { subjectIds: string[] };
  const rows = await svc.setTeacherSpecializations(req.params["teacherId"]!, body.subjectIds);
  res.json({ success: true, data: rows, message: "Teacher specializations updated." });
}

export async function postCombination(req: Request, res: Response): Promise<void> {
  const body = combinationSchema.parse(req.body);
  const row = await svc.createCombination(body);
  res.status(201).json({ success: true, data: row, message: "Combination created." });
}

export async function getCombinations(req: Request, res: Response): Promise<void> {
  const rows = await svc.getCombinations({ level: req.query["level"] as string | undefined });
  res.json({ success: true, data: rows, message: "Combinations loaded." });
}

export async function getCombinationById(req: Request, res: Response): Promise<void> {
  const row = await svc.getCombinationById(req.params["id"]!);
  res.json({ success: true, data: row, message: "Combination loaded." });
}

export async function putCombination(req: Request, res: Response): Promise<void> {
  const body = updateCombinationSchema.parse(req.body);
  const row = await svc.updateCombination(req.params["id"]!, body);
  res.json({ success: true, data: row, message: "Combination updated." });
}

export async function deleteCombination(req: Request, res: Response): Promise<void> {
  await svc.deleteCombination(req.params["id"]!);
  res.json({ success: true, data: { deleted: true }, message: "Combination deleted." });
}

export async function postCombinationSubject(req: Request, res: Response): Promise<void> {
  const body = combinationSubjectSchema.parse(req.body);
  const row = await svc.addSubjectToCombination(req.params["id"]!, body);
  res.status(201).json({ success: true, data: row, message: "Subject added to combination." });
}

export async function deleteCombinationSubject(req: Request, res: Response): Promise<void> {
  const row = await svc.removeSubjectFromCombination(req.params["id"]!, req.params["subjectId"]!);
  res.json({ success: true, data: row, message: "Subject removed from combination." });
}

export async function postCbcStrand(req: Request, res: Response): Promise<void> {
  const body = cbcStrandSchema.parse(req.body);
  const row = await svc.createCbcStrand(body);
  res.status(201).json({ success: true, data: row, message: "CBC strand created." });
}

export async function getCbcStrands(req: Request, res: Response): Promise<void> {
  const subjectId = req.query.subjectId as string | undefined;
  const rows = await svc.getStrands({ subjectId });
  res.json({ success: true, data: rows, message: "CBC strands loaded." });
}

export async function getCbcStrandById(req: Request, res: Response): Promise<void> {
  const row = await svc.getStrandById(req.params["id"]!);
  res.json({ success: true, data: row, message: "CBC strand loaded." });
}

export async function putCbcStrand(req: Request, res: Response): Promise<void> {
  const body = updateCbcStrandSchema.parse(req.body);
  const row = await svc.updateStrand(req.params["id"]!, body);
  res.json({ success: true, data: row, message: "CBC strand updated." });
}

export async function deleteCbcStrand(req: Request, res: Response): Promise<void> {
  await svc.deleteStrand(req.params["id"]!);
  res.json({ success: true, data: { deleted: true }, message: "CBC strand deleted." });
}

export async function postCbcSubStrand(req: Request, res: Response): Promise<void> {
  const body = cbcSubStrandSchema.parse(req.body);
  const row = await svc.createSubStrand(req.params["id"]!, body);
  res.status(201).json({ success: true, data: row, message: "CBC sub-strand created." });
}

export async function putCbcSubStrand(req: Request, res: Response): Promise<void> {
  const body = updateCbcSubStrandSchema.parse(req.body);
  const row = await svc.updateSubStrand(req.params["subStrandId"]!, body);
  res.json({ success: true, data: row, message: "CBC sub-strand updated." });
}

export async function deleteCbcSubStrand(req: Request, res: Response): Promise<void> {
  await svc.deleteSubStrand(req.params["subStrandId"]!);
  res.json({ success: true, data: { deleted: true }, message: "CBC sub-strand deleted." });
}

export async function getGradingScales(req: Request, res: Response): Promise<void> {
  const levelRaw = req.query["level"];
  const level = levelRaw === "O_LEVEL" || levelRaw === "A_LEVEL" ? levelRaw : undefined;
  const rows = await svc.listGradingScales(level);
  res.json({ success: true, data: rows, message: "Grading scales loaded." });
}

export async function putGradingScales(req: Request, res: Response): Promise<void> {
  const body = upsertGradingScaleSchema.parse(req.body) as {
    level: "O_LEVEL" | "A_LEVEL";
    rows: Array<{
      grade: string;
      minScore: number;
      maxScore: number;
      points: number;
      descriptor?: string | null;
      sortOrder?: number;
      isActive?: boolean;
    }>;
  };
  const rows = await svc.replaceGradingScale(body);
  res.json({ success: true, data: rows, message: "Grading scale updated." });
}

export async function recalculateGradingScales(req: Request, res: Response): Promise<void> {
  const termId = typeof req.body?.termId === "string" ? req.body.termId : undefined;
  const yearId = typeof req.body?.yearId === "string" ? req.body.yearId : undefined;
  const studentId = typeof req.body?.studentId === "string" ? req.body.studentId : undefined;
  const data = await gradingMaintenance.recalculateAlevelGrades({ termId, yearId, studentId });
  res.json({
    success: true,
    data,
    message: "A-Level stored grades and division summaries were recalculated from the active scale.",
  });
}
