import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { asyncHandler } from "../../utils/asyncHandler.js";
import * as c from "./notifications.controller.js";

export const notificationsRouter = Router();

notificationsRouter.use(requireAuth);

notificationsRouter.get("/", asyncHandler(c.list));
notificationsRouter.get("/preferences", asyncHandler(c.getPreferences));
notificationsRouter.patch("/preferences", asyncHandler(c.patchPreferences));
notificationsRouter.patch("/read-all", asyncHandler(c.markAllRead));
notificationsRouter.patch("/archive", asyncHandler(c.archiveBulk));
notificationsRouter.delete("/bulk", asyncHandler(c.removeBulk));
notificationsRouter.patch("/:id/read", asyncHandler(c.markRead));
notificationsRouter.patch("/:id/archive", asyncHandler(c.archive));
notificationsRouter.patch("/:id/unarchive", asyncHandler(c.unarchive));
notificationsRouter.delete("/:id", asyncHandler(c.remove));
