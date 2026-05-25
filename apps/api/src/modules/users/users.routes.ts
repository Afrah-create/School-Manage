import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { requireRoles } from "../../middleware/rbac";
import { asyncHandler } from "../../utils/asyncHandler";
import * as c from "./users.controller";
import { userPhotoUpload } from "./users.upload";

const admin = requireRoles("admin");

export const usersRouter = Router();

usersRouter.get("/me", requireAuth, asyncHandler(c.me));
usersRouter.patch("/me", requireAuth, asyncHandler(c.updateMe));
usersRouter.post(
  "/me/photo",
  requireAuth,
  userPhotoUpload.single("photo"),
  asyncHandler(c.uploadMyPhoto),
);
usersRouter.post("/", requireAuth, admin, asyncHandler(c.create));
usersRouter.get("/", requireAuth, admin, asyncHandler(c.list));
usersRouter.post("/bulk/activate", requireAuth, admin, asyncHandler(c.bulkActivate));
usersRouter.post("/bulk/deactivate", requireAuth, admin, asyncHandler(c.bulkDeactivate));
usersRouter.post("/bulk/delete", requireAuth, admin, asyncHandler(c.bulkDelete));
usersRouter.get("/:id", requireAuth, admin, asyncHandler(c.getOne));
usersRouter.get("/:id/audit-logs", requireAuth, admin, asyncHandler(c.auditLogs));
usersRouter.patch("/:id", requireAuth, admin, asyncHandler(c.update));
usersRouter.delete("/:id", requireAuth, admin, asyncHandler(c.destroy));
usersRouter.patch("/:id/activate", requireAuth, admin, asyncHandler(c.activate));
usersRouter.patch("/:id/deactivate", requireAuth, admin, asyncHandler(c.deactivate));
usersRouter.patch("/:id/unlock", requireAuth, admin, asyncHandler(c.unlock));
usersRouter.patch("/:id/notes", requireAuth, admin, asyncHandler(c.updateNotes));
usersRouter.patch("/:id/reset-password", requireAuth, admin, asyncHandler(c.resetPassword));
