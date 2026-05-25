import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { requireRoles } from "../../middleware/rbac";
import { asyncHandler } from "../../utils/asyncHandler";
import * as c from "./analytics.controller";

export const analyticsRouter = Router();
const analyticsReaders = requireRoles("admin", "headteacher", "bursar");

analyticsRouter.use(requireAuth);
analyticsRouter.get("/dashboard", analyticsReaders, asyncHandler(c.dashboard));
analyticsRouter.get("/class-performance", analyticsReaders, asyncHandler(c.classPerformance));
analyticsRouter.get("/report-pipeline", analyticsReaders, asyncHandler(c.reportPipeline));
analyticsRouter.get("/reports-overview", analyticsReaders, asyncHandler(c.reportsOverview));
