import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { requireRoles } from "../../middleware/rbac";
import { asyncHandler } from "../../utils/asyncHandler";
import * as c from "./settings.controller";

export const settingsRouter = Router();

settingsRouter.use(requireAuth);

const settingsReaders = requireRoles("admin", "headteacher", "class_teacher", "subject_teacher", "bursar");
const settingsEditors = requireRoles("admin");

settingsRouter.get("/", settingsReaders, asyncHandler(c.getSchoolSettings));
settingsRouter.put("/", settingsEditors, asyncHandler(c.putSchoolSettings));
