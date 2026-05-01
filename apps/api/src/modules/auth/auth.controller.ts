import type { Response } from "express";
import * as sharedSchemas from "@uganda-cbc-sms/shared";
import type { Request } from "express";
import type {
  ChangePasswordInput,
  LoginInput,
  RequestOtpInput,
  ResetPasswordWithOtpInput,
  VerifyOtpInput,
} from "@uganda-cbc-sms/shared";
import * as authService from "./auth.service";

const sharedRuntime =
  ((sharedSchemas as Record<string, unknown>).default as Record<string, unknown> | undefined) ??
  ((sharedSchemas as Record<string, unknown>)["module.exports"] as Record<string, unknown> | undefined) ??
  (sharedSchemas as Record<string, unknown>);

const {
  changePasswordSchema,
  loginSchema,
  requestOtpSchema,
  resetPasswordWithOtpSchema,
  verifyOtpSchema,
} = sharedRuntime as {
  changePasswordSchema: { parse: (value: unknown) => unknown };
  loginSchema: { parse: (value: unknown) => unknown };
  requestOtpSchema: { parse: (value: unknown) => unknown };
  resetPasswordWithOtpSchema: { parse: (value: unknown) => unknown };
  verifyOtpSchema: { parse: (value: unknown) => unknown };
};

export async function login(req: Request, res: Response): Promise<void> {
  const body = loginSchema.parse(req.body) as LoginInput;
  const result = await authService.login(body, {
    ipAddress: req.ip ?? null,
    userAgent: req.headers["user-agent"] ?? null,
    deviceInfo: req.headers["sec-ch-ua-platform"]?.toString() ?? null,
  });
  res.json({ success: true, data: result });
}

export async function logout(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }
  await authService.logout(req.user.sessionId);
  res.json({ success: true, data: { message: "Logged out" } });
}

export async function changePassword(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }
  const body = changePasswordSchema.parse(req.body) as ChangePasswordInput;
  await authService.changePassword(req.user.id, body);
  res.json({ success: true, data: { message: "Password updated" } });
}

export async function requestPasswordResetCode(req: Request, res: Response): Promise<void> {
  const body = requestOtpSchema.parse(req.body) as RequestOtpInput;
  const result = await authService.requestPasswordResetCode(body);
  res.json({ success: true, data: result });
}

export async function verifyPasswordResetCode(req: Request, res: Response): Promise<void> {
  const body = verifyOtpSchema.parse(req.body) as VerifyOtpInput;
  await authService.verifyPasswordResetCode(body);
  res.json({ success: true, data: { message: "Reset code verified" } });
}

export async function resetPasswordWithCode(req: Request, res: Response): Promise<void> {
  const body = resetPasswordWithOtpSchema.parse(req.body) as ResetPasswordWithOtpInput;
  await authService.resetPasswordWithCode(body);
  res.json({ success: true, data: { message: "Password reset successful" } });
}

export async function requestEmailVerificationCode(req: Request, res: Response): Promise<void> {
  const body = requestOtpSchema.parse(req.body) as RequestOtpInput;
  const result = await authService.requestEmailVerificationCode(body);
  res.json({ success: true, data: result });
}

export async function verifyEmailCode(req: Request, res: Response): Promise<void> {
  const body = verifyOtpSchema.parse(req.body) as VerifyOtpInput;
  await authService.verifyEmailCode(body);
  res.json({ success: true, data: { message: "Email verified successfully" } });
}
