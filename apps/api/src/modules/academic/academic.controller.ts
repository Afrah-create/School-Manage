import type { Request, Response } from "express";
import * as sharedSchemas from "@uganda-cbc-sms/shared";
import * as svc from "./academic.service";

const {
  academicYearSchema,
  classSchema,
  classSubjectSchema,
  combinationSchema,
  cbcStrandSchema,
  subjectSchema,
  termSchema,
} = sharedSchemas;

export async function postYear(req: Request, res: Response): Promise<void> {
  const body = academicYearSchema.parse(req.body);
  const row = await svc.createAcademicYear(body);
  res.status(201).json({ success: true, data: row });
}

export async function getYears(_req: Request, res: Response): Promise<void> {
  const rows = await svc.listAcademicYears();
  res.json({ success: true, data: rows });
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

export async function postClass(req: Request, res: Response): Promise<void> {
  const body = classSchema.parse(req.body);
  const row = await svc.createClass(body);
  res.status(201).json({ success: true, data: row });
}

export async function getClasses(_req: Request, res: Response): Promise<void> {
  const rows = await svc.listClasses();
  res.json({ success: true, data: rows });
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

export async function postClassSubject(req: Request, res: Response): Promise<void> {
  const body = classSubjectSchema.parse(req.body);
  const row = await svc.createClassSubject(body);
  res.status(201).json({ success: true, data: row });
}

export async function postCombination(req: Request, res: Response): Promise<void> {
  const body = combinationSchema.parse(req.body);
  const row = await svc.createCombination(body);
  res.status(201).json({ success: true, data: row });
}

export async function getCombinations(_req: Request, res: Response): Promise<void> {
  const rows = await svc.listCombinations();
  res.json({ success: true, data: rows });
}

export async function postCbcStrand(req: Request, res: Response): Promise<void> {
  const body = cbcStrandSchema.parse(req.body);
  const row = await svc.createCbcStrand(body);
  res.status(201).json({ success: true, data: row });
}

export async function getCbcStrands(req: Request, res: Response): Promise<void> {
  const subjectId = req.query.subjectId as string | undefined;
  const rows = await svc.listCbcStrands(subjectId);
  res.json({ success: true, data: rows });
}
