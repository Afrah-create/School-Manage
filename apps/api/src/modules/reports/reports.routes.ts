import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { requireRoles } from "../../middleware/rbac";
import { reportLimiter } from "../../middleware/rateLimiter";
import { asyncHandler } from "../../utils/asyncHandler";
import * as c from "./reports.controller";

const reportApprovers = requireRoles("headteacher", "admin");
const reporters = requireRoles("headteacher", "admin", "class_teacher");
const reportReaders = requireRoles("headteacher", "admin", "class_teacher", "subject_teacher", "bursar");

export const reportsRouter = Router();

reportsRouter.use(requireAuth);

reportsRouter.use((req, res, next) => {
  if (req.method === "POST") return reportLimiter(req, res, next);
  next();
});

reportsRouter.get("/readiness", reporters, asyncHandler(c.getReadiness));
reportsRouter.get("/exam-options", reporters, asyncHandler(c.getExamOptions));
reportsRouter.get("/term-default", reporters, asyncHandler(c.getTermReportDefault));
reportsRouter.put("/term-default", requireRoles("admin", "headteacher"), asyncHandler(c.putTermReportDefault));
reportsRouter.get("/list", reporters, asyncHandler(c.listReports));
reportsRouter.get("/class-rankings", reporters, asyncHandler(c.getClassRankings));
reportsRouter.post("/generate", reporters, asyncHandler(c.generate));
reportsRouter.post("/regenerate", reporters, asyncHandler(c.regenerate));
reportsRouter.post("/cbc/generate", reporters, asyncHandler(c.generateCbc));
reportsRouter.post("/alevel/generate", reporters, asyncHandler(c.generateAlevel));
reportsRouter.patch("/:id/approve", reportApprovers, asyncHandler(c.approve));
reportsRouter.get("/:id/pdf", reportReaders, asyncHandler(c.getPdf));
