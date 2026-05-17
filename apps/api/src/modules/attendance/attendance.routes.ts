import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { requireRoles } from "../../middleware/rbac";
import { asyncHandler } from "../../utils/asyncHandler";
import * as c from "./attendance.controller";

export const attendanceRouter = Router();

attendanceRouter.use(requireAuth);
attendanceRouter.post(
  "/",
  requireRoles("class_teacher", "subject_teacher", "admin", "headteacher"),
  asyncHandler(c.postAttendance),
);
attendanceRouter.get("/", asyncHandler(c.getAttendance));
