import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { requireFeature } from "../../middleware/requireFeature.js";
import { requireRoles } from "../../middleware/rbac";
import { asyncHandler } from "../../utils/asyncHandler";
import * as c from "./attendance.controller";

export const attendanceRouter = Router();

attendanceRouter.use(requireAuth);
attendanceRouter.use(requireFeature("attendance"));
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
attendanceRouter.get("/lesson-register", asyncHandler(c.getAttendanceLessonRegister));
attendanceRouter.put(
  "/lesson-register",
  requireRoles("class_teacher", "subject_teacher", "admin", "headteacher"),
  asyncHandler(c.putAttendanceLessonRegister),
);
attendanceRouter.post(
  "/lesson-register/submit",
  requireRoles("class_teacher", "subject_teacher", "admin", "headteacher"),
  asyncHandler(c.postAttendanceLessonRegisterSubmit),
);
attendanceRouter.get("/range", asyncHandler(c.getAttendanceRange));
attendanceRouter.get(
  "/admin/overview",
  requireRoles("admin", "headteacher"),
  asyncHandler(c.getAttendanceAdminOverview),
);
