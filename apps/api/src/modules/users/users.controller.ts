import type { Request, Response } from "express";
import path from "path";
import * as sharedSchemas from "@uganda-cbc-sms/shared";
import type { CreateUserInput, ResetPasswordInput, UpdateProfileInput, UpdateUserInput } from "@uganda-cbc-sms/shared";
import { z } from "zod";
import * as svc from "./users.service";

const sharedRuntime =
  ((sharedSchemas as Record<string, unknown>).default as Record<string, unknown> | undefined) ??
  ((sharedSchemas as Record<string, unknown>)["module.exports"] as Record<string, unknown> | undefined) ??
  (sharedSchemas as Record<string, unknown>);

const { createUserSchema, resetPasswordSchema, updateUserSchema, updateProfileSchema } = sharedRuntime as {
  createUserSchema: { parse: (value: unknown) => unknown; extend: (shape: unknown) => unknown };
  resetPasswordSchema: { parse: (value: unknown) => unknown; extend: (shape: unknown) => unknown };
  updateUserSchema: { parse: (value: unknown) => unknown };
  updateProfileSchema: { parse: (value: unknown) => unknown };
};
const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  role: z.string().optional(),
  status: z.enum(["active", "inactive", "locked"]).optional(),
});
const idListSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
});
const notesSchema = z.object({
  notes: z.string().max(5000),
});
const resetPasswordAdminSchema = (resetPasswordSchema as z.ZodObject<any>).extend({
  forcePasswordChange: z.boolean().optional(),
});
const createUserExtendedSchema = (createUserSchema as z.ZodObject<any>).extend({
  notes: z.string().max(5000).optional(),
  forcePasswordChange: z.boolean().optional(),
});

export async function create(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }
  const body = createUserExtendedSchema.parse(req.body) as CreateUserInput & {
    notes?: string;
    forcePasswordChange?: boolean;
  };
  const user = await svc.createUser(body, {
    actorId: req.user.id,
    ipAddress: req.ip ?? null,
    userAgent: req.headers["user-agent"] ?? null,
  });
  res.status(201).json({ success: true, data: user, message: "User created" });
}

export async function list(req: Request, res: Response): Promise<void> {
  const query = listUsersQuerySchema.parse(req.query);
  const users = await svc.listUsers(query);
  res.json({ success: true, data: users });
}

export async function deactivate(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }
  await svc.deactivateUser(req.params.id!, req.user.id, {
    ipAddress: req.ip ?? null,
    userAgent: req.headers["user-agent"] ?? null,
  });
  res.json({ success: true, data: { id: req.params.id }, message: "User deactivated" });
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }
  const body = resetPasswordAdminSchema.parse(req.body) as ResetPasswordInput & {
    forcePasswordChange?: boolean;
  };
  await svc.resetUserPassword(req.params.id!, body, req.user.id, {
    ipAddress: req.ip ?? null,
    userAgent: req.headers["user-agent"] ?? null,
  });
  res.json({ success: true, data: { id: req.params.id }, message: "Password reset" });
}

export async function me(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }
  const user = await svc.getUserById(req.user.id);
  res.json({ success: true, data: user });
}

export async function updateMe(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }
  const body = updateProfileSchema.parse(req.body) as UpdateProfileInput;
  const user = await svc.updateMyProfile(req.user.id, body);
  res.json({ success: true, data: user, message: "Profile updated" });
}

export async function uploadMyPhoto(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }
  if (!req.file) {
    res.status(400).json({ success: false, error: "No file uploaded" });
    return;
  }
  const rel = `/uploads/users/${path.basename(req.file.path)}`;
  const user = await svc.updateUserPhoto(req.user.id, rel);
  res.json({ success: true, data: user, message: "Profile photo updated" });
}

export async function getOne(req: Request, res: Response): Promise<void> {
  const user = await svc.getUserById(req.params.id!);
  res.json({ success: true, data: user });
}

export async function update(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }
  const body = updateUserSchema.parse(req.body) as UpdateUserInput;
  const user = await svc.updateUser(req.params.id!, body, req.user.id);
  res.json({ success: true, data: user, message: "User updated" });
}

export async function destroy(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }
  await svc.deleteUser(req.params.id!, req.user.id);
  res.json({ success: true, data: { deleted: true }, message: "User deleted" });
}

export async function activate(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }
  await svc.activateUser(req.params.id!, req.user.id, {
    ipAddress: req.ip ?? null,
    userAgent: req.headers["user-agent"] ?? null,
  });
  res.json({ success: true, data: { id: req.params.id }, message: "User activated" });
}

export async function unlock(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }
  await svc.unlockUser(req.params.id!, req.user.id, {
    ipAddress: req.ip ?? null,
    userAgent: req.headers["user-agent"] ?? null,
  });
  res.json({ success: true, data: { id: req.params.id }, message: "User unlocked" });
}

export async function updateNotes(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }
  const body = notesSchema.parse(req.body);
  await svc.updateUserNotes(req.params.id!, body.notes, req.user.id, {
    ipAddress: req.ip ?? null,
    userAgent: req.headers["user-agent"] ?? null,
  });
  res.json({ success: true, data: { id: req.params.id, notes: body.notes }, message: "Notes updated" });
}

export async function auditLogs(req: Request, res: Response): Promise<void> {
  const limit = z.coerce.number().int().min(1).max(200).default(50).parse(req.query.limit ?? "50");
  const logs = await svc.getUserAuditLogs(req.params.id!, limit);
  res.json({ success: true, data: logs });
}

export async function bulkActivate(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }
  const body = idListSchema.parse(req.body);
  const result = await svc.bulkActivateUsers(body.ids, req.user.id);
  res.json({ success: true, data: result, message: "Bulk activate complete" });
}

export async function bulkDeactivate(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }
  const body = idListSchema.parse(req.body);
  const result = await svc.bulkDeactivateUsers(body.ids, req.user.id);
  res.json({ success: true, data: result, message: "Bulk deactivate complete" });
}

export async function bulkDelete(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }
  const body = idListSchema.parse(req.body);
  const result = await svc.bulkDeleteUsers(body.ids, req.user.id);
  res.json({ success: true, data: result, message: "Bulk delete complete" });
}
