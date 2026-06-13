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
  if (!req.tenant?.id) {
    res.status(400).json({
      success: false,
      error: "Open your school's sign-in URL (e.g. default.localhost) to continue.",
      code: "TENANT_REQUIRED",
    });
    return;
  }
  const headerSlug = req.headers["x-tenant-slug"];
  const slugFromHeader =
    typeof headerSlug === "string" && headerSlug.trim()
      ? headerSlug.trim().toLowerCase()
      : null;
  const routingSlug = slugFromHeader ?? req.tenant.slug;

  const result = await authService.login(
    body,
    {
      ipAddress: req.ip ?? null,
      userAgent: req.headers["user-agent"] ?? null,
      deviceInfo: req.headers["sec-ch-ua-platform"]?.toString() ?? null,
    },
    req.tenant.id,
    routingSlug,
  );
  res.json({
    success: true,
    data: { ...result, tenant: { slug: req.tenant.slug, id: req.tenant.id } },
  });
}

export async function logout(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: "We couldn't sign you out because you're not signed in.",
    });
    return;
  }
  const bearer = req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.slice(7)
    : undefined;
  await authService.logout(req.user.sessionId, bearer);
  res.json({ success: true, data: { message: "Logged out" } });
}

export async function changePassword(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: "Please sign in again to change your password.",
    });
    return;
  }
  const body = changePasswordSchema.parse(req.body) as ChangePasswordInput;
  const { token } = await authService.changePassword(
    req.user.id,
    body,
    req.user.sessionId,
    req.user.tenantSlug,
  );
  res.json({ success: true, data: { message: "Password updated", token } });
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
