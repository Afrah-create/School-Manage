import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { requireFeature } from "../../middleware/requireFeature.js";
import { requireRoles } from "../../middleware/rbac";
import { asyncHandler } from "../../utils/asyncHandler";
import * as c from "./timetable.controller";

export const timetableRouter = Router();

const leads = requireRoles("admin", "headteacher");
const teachers = requireRoles("admin", "headteacher", "class_teacher", "subject_teacher");

timetableRouter.use(requireAuth);
timetableRouter.use(requireFeature("timetable"));

timetableRouter.get("/my-week", teachers, asyncHandler(c.getMyWeek));
timetableRouter.get("/today", teachers, asyncHandler(c.getToday));

timetableRouter.get("/browse", leads, asyncHandler(c.browsePublished));
timetableRouter.get("/templates", leads, asyncHandler(c.listTemplates));
timetableRouter.get("/templates/:id/overview", leads, asyncHandler(c.getTemplateOverview));
timetableRouter.get("/templates/draft", leads, asyncHandler(c.getOrCreateDraft));
timetableRouter.post("/templates", leads, asyncHandler(c.createTemplate));
timetableRouter.get("/templates/:id", leads, asyncHandler(c.getTemplate));
timetableRouter.post("/templates/:id/clone", leads, asyncHandler(c.cloneTemplate));
timetableRouter.get("/templates/:id/periods", leads, asyncHandler(c.getPeriods));
timetableRouter.put("/templates/:id/periods", leads, asyncHandler(c.replacePeriods));
timetableRouter.get("/templates/:id/days", leads, asyncHandler(c.getDays));
timetableRouter.put("/templates/:id/days", leads, asyncHandler(c.replaceDays));
timetableRouter.get("/templates/:id/class-subjects", leads, asyncHandler(c.getClassSubjects));
timetableRouter.get("/templates/:id/slot-occupancy", leads, asyncHandler(c.getSlotOccupancy));
timetableRouter.get("/templates/:id/grid", leads, asyncHandler(c.getGrid));
timetableRouter.put("/templates/:id/grid/class/:classId", leads, asyncHandler(c.saveClassGrid));
timetableRouter.post("/templates/:id/validate", leads, asyncHandler(c.validateTemplate));
timetableRouter.post("/templates/:id/auto-generate", leads, asyncHandler(c.autoGenerateTemplate));
timetableRouter.post("/templates/:id/publish", leads, asyncHandler(c.publishTemplate));
timetableRouter.get("/templates/:id/publication-log", leads, asyncHandler(c.getPublicationLog));
