import type { Request, Response } from "express";
import * as sharedSchemas from "@uganda-cbc-sms/shared";
import * as svc from "./timetable.service";

const {
  cloneTimetableTemplateSchema,
  createTimetableTemplateSchema,
  timetableClassSubjectsQuerySchema,
  timetableDaysBulkSchema,
  timetableEntriesBulkSaveSchema,
  timetableGridQuerySchema,
  timetableMyWeekQuerySchema,
  timetablePeriodsBulkSchema,
  timetablePublishSchema,
  timetableAutoGenerateSchema,
  timetableBrowseQuerySchema,
  timetableSlotOccupancyQuerySchema,
  timetableTemplateQuerySchema,
} = sharedSchemas;

export async function browsePublished(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }
  const q = timetableBrowseQuerySchema.parse(req.query);
  const data = await svc.browsePublishedTimetables(q);
  res.json({ success: true, data });
}

export async function getTemplateOverview(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }
  const id = String(req.params["id"] ?? "");
  const data = await svc.getTemplateOverview(id);
  res.json({ success: true, data });
}

export async function listTemplates(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }
  const q = timetableTemplateQuerySchema.parse(req.query);
  const data = await svc.listTemplates(q);
  res.json({ success: true, data });
}

export async function getOrCreateDraft(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }
  const q = timetableTemplateQuerySchema.parse(req.query);
  const data = await svc.getOrCreateDraft(q);
  res.json({ success: true, data });
}

export async function createTemplate(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }
  const body = createTimetableTemplateSchema.parse(req.body);
  const data = await svc.createTemplate(body);
  res.status(201).json({ success: true, data });
}

export async function getTemplate(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }
  const id = String(req.params["id"] ?? "");
  const data = await svc.getTemplate(id);
  res.json({ success: true, data });
}

export async function cloneTemplate(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }
  const sourceTemplateId = String(req.params["id"] ?? "");
  const body = cloneTimetableTemplateSchema.parse({ ...req.body, sourceTemplateId });
  const data = await svc.cloneTemplate(body);
  res.json({ success: true, data, message: "Timetable cloned." });
}

export async function getPeriods(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }
  const id = String(req.params["id"] ?? "");
  const data = await svc.getPeriods(id);
  res.json({ success: true, data });
}

export async function replacePeriods(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }
  const id = String(req.params["id"] ?? "");
  const body = timetablePeriodsBulkSchema.parse(req.body);
  const data = await svc.replacePeriods(id, body);
  res.json({ success: true, data, message: "Periods saved." });
}

export async function getDays(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }
  const id = String(req.params["id"] ?? "");
  const data = await svc.getDays(id);
  res.json({ success: true, data });
}

export async function replaceDays(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }
  const id = String(req.params["id"] ?? "");
  const body = timetableDaysBulkSchema.parse(req.body);
  const data = await svc.replaceDays(id, body);
  res.json({ success: true, data, message: "School days saved." });
}

export async function getClassSubjects(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }
  const id = String(req.params["id"] ?? "");
  const q = timetableClassSubjectsQuerySchema.parse(req.query);
  const data = await svc.listClassSubjectsForTemplate(id, q.classId);
  res.json({ success: true, data });
}

export async function getSlotOccupancy(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }
  const id = String(req.params["id"] ?? "");
  const q = timetableSlotOccupancyQuerySchema.parse(req.query);
  const data = await svc.getSlotOccupancy(id, q.excludeClassId);
  res.json({ success: true, data });
}

export async function getGrid(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }
  const id = String(req.params["id"] ?? "");
  const q = timetableGridQuerySchema.parse(req.query);
  if (q.view === "class") {
    if (!q.classId) {
      res.status(400).json({ success: false, error: "classId is required for class view" });
      return;
    }
    const data = await svc.getClassGrid(id, q.classId);
    res.json({ success: true, data });
    return;
  }
  if (!q.teacherId) {
    res.status(400).json({ success: false, error: "teacherId is required for teacher view" });
    return;
  }
  const data = await svc.getTeacherGrid(id, q.teacherId);
  res.json({ success: true, data });
}

export async function saveClassGrid(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }
  const id = String(req.params["id"] ?? "");
  const classId = String(req.params["classId"] ?? "");
  const body = timetableEntriesBulkSaveSchema.parse(req.body);
  const data = await svc.saveClassGrid(id, classId, body);
  res.json({ success: true, data, message: "Class timetable saved." });
}

export async function validateTemplate(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }
  const id = String(req.params["id"] ?? "");
  const data = await svc.validateTemplate(id);
  res.json({ success: true, data });
}

export async function publishTemplate(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }
  const id = String(req.params["id"] ?? "");
  const body = timetablePublishSchema.parse(req.body ?? {});
  const data = await svc.publishTemplate(id, req.user.id, body);
  res.json({ success: true, data, message: "Timetable published." });
}

export async function autoGenerateTemplate(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }
  const id = String(req.params["id"] ?? "");
  const body = timetableAutoGenerateSchema.parse(req.body ?? {});
  const data = await svc.autoGenerateDraft(id, body);
  res.json({
    success: true,
    data,
    message: `Generated ${data.entriesCreated} timetable slot(s) across ${data.classesProcessed} class(es).`,
  });
}

export async function getPublicationLog(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }
  const id = String(req.params["id"] ?? "");
  const data = await svc.getPublicationLog(id);
  res.json({ success: true, data });
}

export async function getMyWeek(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }
  const q = timetableMyWeekQuerySchema.parse(req.query);
  const data = await svc.getTeacherWeek(req.user.id, q.weekStart);
  res.json({ success: true, data });
}

export async function getToday(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }
  const data = await svc.getTeacherToday(req.user.id);
  res.json({ success: true, data });
}
