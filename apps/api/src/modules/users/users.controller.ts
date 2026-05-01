import type { Request, Response } from "express";
import * as sharedSchemas from "@uganda-cbc-sms/shared";
import * as svc from "./users.service";

const { createUserSchema, resetPasswordSchema } = sharedSchemas;

export async function create(req: Request, res: Response): Promise<void> {
  const body = createUserSchema.parse(req.body);
  const user = await svc.createUser(body);
  res.status(201).json({ success: true, data: user });
}

export async function list(_req: Request, res: Response): Promise<void> {
  const users = await svc.listUsers();
  res.json({ success: true, data: users });
}

export async function deactivate(req: Request, res: Response): Promise<void> {
  await svc.deactivateUser(req.params.id!);
  res.json({ success: true, data: { message: "User deactivated" } });
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
  const body = resetPasswordSchema.parse(req.body);
  await svc.resetUserPassword(req.params.id!, body);
  res.json({ success: true, data: { message: "Password reset" } });
}

export async function me(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }
  const user = await svc.getUserById(req.user.id);
  res.json({ success: true, data: user });
}
