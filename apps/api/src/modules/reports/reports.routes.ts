import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { requireRoles } from "../../middleware/rbac";
import { asyncHandler } from "../../utils/asyncHandler";
import * as c from "./reports.controller";

const headteacher = requireRoles("headteacher");
const reporters = requireRoles("headteacher", "admin", "class_teacher");
const reportReaders = requireRoles("headteacher", "admin", "class_teacher", "subject_teacher", "bursar");

export const reportsRouter = Router();

reportsRouter.use(requireAuth);

reportsRouter.get("/readiness", reporters, asyncHandler(c.getReadiness));
reportsRouter.get("/exam-options", reporters, asyncHandler(c.getExamOptions));
reportsRouter.get("/list", reporters, asyncHandler(c.listReports));
reportsRouter.post("/generate", reporters, asyncHandler(c.generate));
reportsRouter.post("/cbc/generate", reporters, asyncHandler(c.generateCbc));
reportsRouter.post("/alevel/generate", reporters, asyncHandler(c.generateAlevel));
reportsRouter.patch("/:id/approve", headteacher, asyncHandler(c.approve));
reportsRouter.get("/:id/pdf", reportReaders, asyncHandler(c.getPdf));
