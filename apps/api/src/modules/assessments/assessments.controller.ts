import { z } from "zod";
import type { Request, Response } from "express";
import { HttpError } from "../../utils/httpError";
import { assertTeacherOwnsClassSubject, assertTeacherOwnsStudentSubject } from "./assessmentAccess";
import * as svc from "./assessments.service";

const cbcItemSchema = z.object({
  studentId: z.string().uuid(),
  subjectId: z.string().uuid(),
  strand: z.string().min(1),
  competency: z.string().min(1),
  rating: z.enum(["A", "B", "C", "D"]),
});

const cbcSingleSchema = z.object({
  studentId: z.string().uuid(),
  subjectId: z.string().uuid(),
  strand: z.string().min(1),
  competency: z.string().min(1),
  rating: z.enum(["A", "B", "C", "D"]),
  termId: z.string().uuid(),
  yearId: z.string().uuid(),
});

const cbcBulkSchema = z.object({
  assessments: z.array(cbcItemSchema).min(1),
  termId: z.string().uuid(),
  yearId: z.string().uuid(),
});

const submitSchema = z.object({
  subjectId: z.string().uuid(),
  classId: z.string().uuid(),
  termId: z.string().uuid(),
  yearId: z.string().uuid(),
});

const cbcProjectSchema = z.object({
  studentId: z.string().uuid(),
  subjectId: z.string().uuid(),
  assessmentTitle: z.string().min(1),
  score: z.number().nullable().optional(),
  maxScore: z.number().nullable().optional(),
  termId: z.string().uuid(),
  yearId: z.string().uuid(),
});

const cbcCommentSchema = z.object({
  termId: z.string().uuid(),
  yearId: z.string().uuid(),
  classTeacherComment: z.string().optional(),
  headteacherComment: z.string().optional(),
});

const alevelSingleSchema = z.object({
  studentId: z.string().uuid(),
  subjectId: z.string().uuid(),
  score: z.number().min(0).max(100),
  termId: z.string().uuid(),
  yearId: z.string().uuid(),
});

const alevelBulkSchema = z.object({
  assessments: z
    .array(
      z.object({
        studentId: z.string().uuid(),
        subjectId: z.string().uuid(),
        score: z.number().min(0).max(100),
      }),
    )
    .min(1),
  termId: z.string().uuid(),
  yearId: z.string().uuid(),
});

const alevelCommentSchema = z.object({
  termId: z.string().uuid(),
  yearId: z.string().uuid(),
  classTeacherComment: z.string().optional(),
  headteacherRemark: z.string().optional(),
});

function isTeachingRole(role: string) {
  return role === "subject_teacher" || role === "class_teacher";
}

export async function getCbc(req: Request, res: Response) {
  const role = req.user?.role ?? "";
  const classId = req.query["classId"] as string | undefined;
  const subjectId = req.query["subjectId"] as string | undefined;
  const yearId = req.query["yearId"] as string | undefined;
  const termId = req.query["termId"] as string | undefined;
  if (isTeachingRole(role)) {
    if (classId && subjectId && yearId) {
      await assertTeacherOwnsClassSubject(req.user!.id, classId, subjectId, yearId);
    } else if (!yearId || !termId) {
      throw new HttpError(
        400,
        "Select academic year and term for an overview, or class, subject, and academic year for a specific mark sheet.",
      );
    }
  }
  const rows = await svc.listCbc({
    classId,
    subjectId,
    strandId: req.query["strandId"] as string | undefined,
    termId,
    yearId,
    teacherId: isTeachingRole(role) ? req.user!.id : undefined,
  });
  res.json({ success: true, data: rows });
}

export async function postCbc(req: Request, res: Response) {
  const body = cbcSingleSchema.parse(req.body);
  await assertTeacherOwnsStudentSubject(req.user!.id, body.studentId, body.subjectId, body.yearId);
  await svc.upsertCbc(body, body.termId, body.yearId, req.user!.id);
  res.status(201).json({ success: true, data: { saved: true } });
}

export async function postCbcBulk(req: Request, res: Response) {
  const body = cbcBulkSchema.parse(req.body);
  for (const item of body.assessments) {
    await assertTeacherOwnsStudentSubject(req.user!.id, item.studentId, item.subjectId, body.yearId);
  }
  const out = await svc.upsertCbcBulk(body.assessments, body.termId, body.yearId, req.user!.id);
  res.status(201).json({ success: true, data: out });
}

export async function submitCbc(req: Request, res: Response) {
  const body = submitSchema.parse(req.body);
  const role = req.user!.role;
  if (isTeachingRole(role)) {
    await assertTeacherOwnsClassSubject(req.user!.id, body.classId, body.subjectId, body.yearId);
  }
  await svc.submitCbc(body.subjectId, body.classId, body.termId, body.yearId, req.user!.id);
  res.json({ success: true, data: { submitted: true } });
}

export async function unlockCbc(req: Request, res: Response) {
  const body = submitSchema.parse(req.body);
  await svc.unlockCbc(body.subjectId, body.classId, body.termId, body.yearId, req.user!.id);
  res.json({ success: true, data: { unlocked: true } });
}

export async function getCbcProject(req: Request, res: Response) {
  const rows = await svc.listCbcProject({
    classId: req.query["classId"] as string | undefined,
    subjectId: req.query["subjectId"] as string | undefined,
    termId: req.query["termId"] as string | undefined,
    yearId: req.query["yearId"] as string | undefined,
  });
  res.json({ success: true, data: rows });
}

export async function postCbcProject(req: Request, res: Response) {
  const body = cbcProjectSchema.parse(req.body);
  await assertTeacherOwnsStudentSubject(req.user!.id, body.studentId, body.subjectId, body.yearId);
  const out = await svc.createCbcProject(
    {
      ...body,
      score: body.score ?? null,
      maxScore: body.maxScore ?? null,
    },
    req.user!.id,
  );
  res.status(201).json({ success: true, data: out });
}

export async function putCbcProject(req: Request, res: Response) {
  const body = cbcProjectSchema.partial().parse(req.body);
  const out = await svc.updateCbcProject(req.params["id"]!, body, req.user!.id);
  res.json({ success: true, data: out });
}

export async function getCbcComments(req: Request, res: Response) {
  const classId = req.query["classId"] as string | undefined;
  const termId = req.query["termId"] as string | undefined;
  const yearId = req.query["yearId"] as string | undefined;
  if (!classId || !termId || !yearId) throw new HttpError(400, "classId, termId and yearId are required");
  const rows = await svc.listCbcComments(classId, termId, yearId);
  res.json({ success: true, data: rows });
}

export async function putCbcComment(req: Request, res: Response) {
  const body = cbcCommentSchema.parse(req.body);
  const role = req.user!.role;
  if (role === "class_teacher" && body.headteacherComment !== undefined) {
    throw new HttpError(403, "Class teacher cannot update headteacher comment");
  }
  if (role === "headteacher" && body.classTeacherComment !== undefined) {
    throw new HttpError(403, "Headteacher cannot update class teacher comment");
  }
  const out = await svc.upsertCbcComment(req.params["studentId"]!, body.termId, body.yearId, role, req.user!.id, body);
  res.json({ success: true, data: out });
}

export async function getCbcStatus(req: Request, res: Response) {
  const classId = req.query["classId"] as string | undefined;
  const termId = req.query["termId"] as string | undefined;
  const yearId = req.query["yearId"] as string | undefined;
  if (!classId || !termId || !yearId) throw new HttpError(400, "classId, termId and yearId are required");
  const rows = await svc.cbcStatus(classId, termId, yearId);
  res.json({ success: true, data: rows });
}

export async function getAlevel(req: Request, res: Response) {
  const role = req.user?.role ?? "";
  const classId = req.query["classId"] as string | undefined;
  const subjectId = req.query["subjectId"] as string | undefined;
  const yearId = req.query["yearId"] as string | undefined;
  const termId = req.query["termId"] as string | undefined;
  if (isTeachingRole(role)) {
    if (classId && subjectId && yearId) {
      await assertTeacherOwnsClassSubject(req.user!.id, classId, subjectId, yearId);
    } else if (!yearId || !termId) {
      throw new HttpError(
        400,
        "Select academic year and term for an overview, or class, subject, and academic year for a specific mark sheet.",
      );
    }
  }
  const rows = await svc.listAlevel({
    classId,
    subjectId,
    combinationId: req.query["combinationId"] as string | undefined,
    termId,
    yearId,
    teacherId: isTeachingRole(role) ? req.user!.id : undefined,
  });
  res.json({ success: true, data: rows });
}

export async function postAlevel(req: Request, res: Response) {
  const body = alevelSingleSchema.parse(req.body);
  await assertTeacherOwnsStudentSubject(req.user!.id, body.studentId, body.subjectId, body.yearId);
  const out = await svc.upsertAlevel(body, body.termId, body.yearId, req.user!.id);
  res.status(201).json({ success: true, data: out });
}

export async function postAlevelBulk(req: Request, res: Response) {
  const body = alevelBulkSchema.parse(req.body);
  for (const item of body.assessments) {
    await assertTeacherOwnsStudentSubject(req.user!.id, item.studentId, item.subjectId, body.yearId);
  }
  const out = await svc.upsertAlevelBulk(body.assessments, body.termId, body.yearId, req.user!.id);
  res.status(201).json({ success: true, data: out });
}

export async function submitAlevel(req: Request, res: Response) {
  const body = submitSchema.parse(req.body);
  const role = req.user!.role;
  if (isTeachingRole(role)) {
    await assertTeacherOwnsClassSubject(req.user!.id, body.classId, body.subjectId, body.yearId);
  }
  await svc.submitAlevel(body.subjectId, body.classId, body.termId, body.yearId, req.user!.id);
  res.json({ success: true, data: { submitted: true } });
}

export async function getAlevelDivision(req: Request, res: Response) {
  const classId = req.query["classId"] as string | undefined;
  const termId = req.query["termId"] as string | undefined;
  const yearId = req.query["yearId"] as string | undefined;
  if (!classId || !termId || !yearId) throw new HttpError(400, "classId, termId and yearId are required");
  const rows = await svc.alevelDivision(
    classId,
    req.query["combinationId"] as string | undefined,
    termId,
    yearId,
  );
  res.json({ success: true, data: rows });
}

export async function getAlevelComments(req: Request, res: Response) {
  const classId = req.query["classId"] as string | undefined;
  const termId = req.query["termId"] as string | undefined;
  const yearId = req.query["yearId"] as string | undefined;
  if (!classId || !termId || !yearId) throw new HttpError(400, "classId, termId and yearId are required");
  const rows = await svc.listAlevelComments(classId, termId, yearId);
  res.json({ success: true, data: rows });
}

export async function putAlevelComment(req: Request, res: Response) {
  const body = alevelCommentSchema.parse(req.body);
  const role = req.user!.role;
  if (role === "class_teacher" && body.headteacherRemark !== undefined) {
    throw new HttpError(403, "Class teacher cannot update headteacher remark");
  }
  if (role === "headteacher" && body.classTeacherComment !== undefined) {
    throw new HttpError(403, "Headteacher cannot update class teacher comment");
  }
  const out = await svc.upsertAlevelComment(
    req.params["studentId"]!,
    body.termId,
    body.yearId,
    role,
    req.user!.id,
    body,
  );
  res.json({ success: true, data: out });
}

export async function getAlevelStatus(req: Request, res: Response) {
  const classId = req.query["classId"] as string | undefined;
  const termId = req.query["termId"] as string | undefined;
  const yearId = req.query["yearId"] as string | undefined;
  if (!classId || !termId || !yearId) throw new HttpError(400, "classId, termId and yearId are required");
  const rows = await svc.alevelStatus(classId, termId, yearId);
  res.json({ success: true, data: rows });
}

export async function getSubjectsAssigned(req: Request, res: Response) {
  const rows = await svc.subjectsAssigned(
    req.user!.id,
    req.query["classId"] as string | undefined,
    req.query["termId"] as string | undefined,
    req.query["yearId"] as string | undefined,
  );
  res.json({ success: true, data: rows });
}

export async function getStrands(req: Request, res: Response) {
  const rows = await svc.strands(req.query["subjectId"] as string | undefined);
  res.json({ success: true, data: rows });
}

export async function getCombinations(_req: Request, res: Response) {
  const rows = await svc.combinations();
  res.json({ success: true, data: rows });
}
