import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { requireFeature } from "../../middleware/requireFeature.js";
import { requireRoles } from "../../middleware/rbac";
import { asyncHandler } from "../../utils/asyncHandler";
import * as c from "./alevel.controller";

const teachers = requireRoles("subject_teacher", "class_teacher", "admin");

export const alevelRouter = Router();

alevelRouter.use(requireAuth);
alevelRouter.use(requireFeature("alevel"));
alevelRouter.post("/", teachers, asyncHandler(c.postAlevel));
alevelRouter.get("/", asyncHandler(c.getAlevel));
