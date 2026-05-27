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
attendanceRouter.get("/register", asyncHandler(c.getAttendanceRegister));
attendanceRouter.put(
  "/register",
  requireRoles("class_teacher", "subject_teacher", "admin", "headteacher"),
  asyncHandler(c.putAttendanceRegister),
);
attendanceRouter.post(
  "/register/submit",
  requireRoles("class_teacher", "subject_teacher", "admin", "headteacher"),
  asyncHandler(c.postAttendanceRegisterSubmit),
);
attendanceRouter.get("/range", asyncHandler(c.getAttendanceRange));
attendanceRouter.get(
  "/admin/overview",
  requireRoles("admin", "headteacher"),
  asyncHandler(c.getAttendanceAdminOverview),
);
