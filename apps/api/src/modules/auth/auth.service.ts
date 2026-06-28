import type {
  ChangePasswordInput,
  LoginInput,
  RequestOtpInput,
  ResetPasswordWithOtpInput,
  VerifyOtpInput,
} from "@uganda-cbc-sms/shared";
import bcrypt from "bcrypt";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { query, withTransaction } from "../../config/db";
import { HttpError } from "../../utils/httpError";
import {
  clearLoginAttemptsForEmail,
  logLoginAttempt,
  maxLoginAttempts,
} from "../../middleware/accountLockout.js";
import { signToken, verifyToken, tokenRemainingSeconds } from "../../utils/jwt";
import { blacklistToken } from "../../utils/tokenBlacklist.js";
import { toUserPublic } from "../../utils/userMapper";
import { logUserAction } from "../users/audit.service";
import { sendPasswordResetCodeEmail } from "../../services/mail/sendPasswordResetCode.js";
import {
  idleExpiresAtFrom,
  sessionInactivityMinutes,
} from "./session.service.js";

type LoginMeta = {
  ipAddress?: string | null;
  userAgent?: string | null;
  deviceInfo?: string | null;
};

function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

function hashSecret(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function generateOtpCode(): string {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

function computeExpiryDate(token: string): Date {
  const decoded = jwt.decode(token) as jwt.JwtPayload | null;
  if (!decoded?.exp) {
    return new Date(Date.now() + 8 * 60 * 60 * 1000);
  }
  return new Date(decoded.exp * 1000);
}

export async function login(
  input: LoginInput,
  meta: LoginMeta = {},
  tenantId?: string,
  tenantSlug?: string,
): Promise<{
  token: string;
  user: ReturnType<typeof toUserPublic>;
  session: { inactivityMinutes: number; idleExpiresAt: string };
}> {
  try {
    if (!tenantId) {
      throw new HttpError(400, "School context is required to sign in.");
    }

    const { rows } = await query<{
      id: string;
      tenant_id: string;
      full_name: string;
      email: string;
      role: string;
      is_active: boolean;
      created_at: Date;
      password_hash: string;
      failed_login_attempts: number;
      login_attempts: number | null;
      locked_at: Date | null;
      locked_until: Date | null;
      force_password_change: boolean | null;
    }>(
      `SELECT * FROM users WHERE tenant_id = $1 AND email = $2`,
      [tenantId, normalizeEmail(input.email)],
    );
    const generic = () =>
      new HttpError(
        401,
        "The email or password you entered isn't correct. Please try again.",
      );

    if (rows.length === 0) throw generic();
    const user = rows[0]!;

    if (!user.is_active) {
      throw new HttpError(403, "Account deactivated — contact administrator.");
    }
    if (user.locked_until && user.locked_until.getTime() > Date.now()) {
      logLoginAttempt(normalizeEmail(input.email), meta.ipAddress, false);
      throw new HttpError(
        423,
        "Account locked after 5 failed attempts. Contact your administrator.",
      );
    }
    if (user.locked_until && user.locked_until.getTime() <= Date.now()) {
      await query(
        `UPDATE users
         SET locked_at = NULL, locked_until = NULL, locked_reason = NULL, failed_login_attempts = 0, login_attempts = 0, updated_at = NOW()
         WHERE id = $1`,
        [user.id],
      );
    }

    const ok = await bcrypt.compare(input.password, user.password_hash);
    if (!ok) {
      logLoginAttempt(normalizeEmail(input.email), meta.ipAddress, false);
      const attempts = Math.max(user.failed_login_attempts ?? 0, user.login_attempts ?? 0) + 1;
      const lock = attempts >= maxLoginAttempts();
      await query(
        `UPDATE users
         SET failed_login_attempts = $1,
             login_attempts = $1,
             locked_at = CASE WHEN $2::boolean THEN NOW() ELSE locked_at END,
             locked_until = CASE WHEN $2::boolean THEN NOW() + interval '30 minutes' ELSE locked_until END,
             locked_reason = CASE WHEN $2::boolean THEN 'Too many failed login attempts' ELSE locked_reason END,
             updated_at = NOW()
         WHERE id = $3`,
        [attempts, lock, user.id],
      );
      await logUserAction({
        userId: user.id,
        action: "LOGIN_FAILED",
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        metadata: { failedAttempts: attempts, locked: lock },
      });
      if (lock) {
        throw new HttpError(
          423,
          "Account locked after 5 failed attempts. Contact your administrator.",
        );
      }
      throw generic();
    }

    logLoginAttempt(normalizeEmail(input.email), meta.ipAddress, true);

    await query(
      `UPDATE users
       SET failed_login_attempts = 0,
           login_attempts = 0,
           locked_at = NULL,
           locked_until = NULL,
           locked_reason = NULL,
           last_login_at = NOW(),
           updated_at = NOW()
       WHERE id = $1`,
      [user.id],
    );
    await logUserAction({
      userId: user.id,
      actorId: user.id,
      action: "LOGIN_SUCCESS",
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    const sessionId = crypto.randomUUID();
    const token = signToken(
      user.id,
      user.role as Parameters<typeof signToken>[1],
      sessionId,
      user.tenant_id,
      tenantSlug ?? "default",
      { forcePasswordChange: Boolean(user.force_password_change) },
    );
    const tokenHash = hashSecret(token);
    const expiresAt = computeExpiryDate(token);

    const now = new Date();
    await query(
      `INSERT INTO auth_sessions (
         id, tenant_id, user_id, token_hash, device_info, ip_address, user_agent,
         expires_at, last_activity_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        sessionId,
        user.tenant_id,
        user.id,
        tokenHash,
        meta.deviceInfo ?? null,
        meta.ipAddress ?? null,
        meta.userAgent ?? null,
        expiresAt,
        now,
      ],
    );

    const inactivityMinutes = sessionInactivityMinutes();
    const idleExpiresAt = idleExpiresAtFrom(now, inactivityMinutes);

    return {
      token,
      session: {
        inactivityMinutes,
        idleExpiresAt: idleExpiresAt.toISOString(),
      },
      user: {
        ...toUserPublic({
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          role: user.role,
          is_active: user.is_active,
          created_at: user.created_at,
          photo_url: (user as { photo_url?: string | null }).photo_url ?? null,
        }),
        forcePasswordChange: Boolean(user.force_password_change),
      },
    };
  } catch (e) {
    if (e instanceof HttpError) throw e;
    throw new Error(e instanceof Error ? e.message : "Login failed");
  }
}

export async function logout(sessionId: string, bearerToken?: string): Promise<void> {
  const { rows } = await query<{ user_id: string }>(
    `UPDATE auth_sessions
     SET revoked_at = NOW()
     WHERE id = $1 AND revoked_at IS NULL
     RETURNING user_id`,
    [sessionId],
  );
  const userId = rows[0]?.user_id;
  if (bearerToken) {
    try {
      const payload = verifyToken(bearerToken);
      await blacklistToken(payload.jti, tokenRemainingSeconds(payload.exp));
    } catch {
      /* token already invalid */
    }
  }
  if (userId) {
    await logUserAction({
      userId,
      actorId: userId,
      action: "LOGOUT",
    });
  }
}

export async function changePassword(
  userId: string,
  input: ChangePasswordInput,
  keepSessionId?: string,
  tenantSlug?: string,
): Promise<{ token: string }> {
  try {
    const { rows } = await query<{ password_hash: string; role: string; tenant_id: string }>(
      `SELECT password_hash, role, tenant_id FROM users WHERE id = $1`,
      [userId],
    );
    if (rows.length === 0) throw new HttpError(404, "User not found");
    const user = rows[0]!;
    const ok = await bcrypt.compare(input.currentPassword, user.password_hash);
    if (!ok) throw new HttpError(400, "That doesn't match your current password. Try again.");
    const rounds = Number(process.env.BCRYPT_ROUNDS ?? 10);
    const hash = await bcrypt.hash(input.newPassword, rounds);
    await query(
      `UPDATE users
       SET password_hash = $1,
           last_password_reset_at = NOW(),
           password_changed_at = NOW(),
           force_password_change = false,
           updated_at = NOW()
       WHERE id = $2`,
      [hash, userId],
    );
    if (keepSessionId) {
      await query(
        `UPDATE auth_sessions SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL AND id <> $2`,
        [userId, keepSessionId],
      );
    } else {
      await query(`UPDATE auth_sessions SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL`, [
        userId,
      ]);
    }

    const sessionId = keepSessionId ?? crypto.randomUUID();
    const token = signToken(
      userId,
      user.role as Parameters<typeof signToken>[1],
      sessionId,
      user.tenant_id,
      tenantSlug ?? "default",
    );
    const tokenHash = hashSecret(token);
    if (keepSessionId) {
      await query(`UPDATE auth_sessions SET token_hash = $2, last_activity_at = NOW() WHERE id = $1`, [
        keepSessionId,
        tokenHash,
      ]);
    }

    return { token };
  } catch (e) {
    if (e instanceof HttpError) throw e;
    throw new Error(e instanceof Error ? e.message : "Could not change password");
  }
}

export const PASSWORD_RESET_EXPIRES_SECONDS = 15 * 60;

export async function requestPasswordResetCode(
  input: RequestOtpInput,
  tenantId: string,
): Promise<{ expiresInSeconds: number }> {
  const email = normalizeEmail(input.email);
  const code = generateOtpCode();
  const codeHash = hashSecret(code);
  const expiresInSeconds = PASSWORD_RESET_EXPIRES_SECONDS;
  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

  const { rows } = await query<{ id: string }>(
    `SELECT id FROM users WHERE tenant_id = $1 AND email = $2 AND is_active = true`,
    [tenantId, email],
  );
  const userId = rows[0]?.id ?? null;

  await query(
    `DELETE FROM password_reset_codes WHERE tenant_id = $1 AND email = $2 AND used_at IS NULL`,
    [tenantId, email],
  );
  await query(
    `INSERT INTO password_reset_codes (tenant_id, user_id, email, code_hash, expires_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [tenantId, userId, email, codeHash, expiresAt],
  );

  if (userId) {
    void sendPasswordResetCodeEmail(email, code, expiresInSeconds / 60).catch((err) => {
      console.error(
        "[auth] password reset email dispatch failed:",
        err instanceof Error ? err.message : err,
      );
    });
  }

  return { expiresInSeconds };
}

export async function verifyPasswordResetCode(input: VerifyOtpInput, tenantId: string): Promise<void> {
  const email = normalizeEmail(input.email);
  const codeHash = hashSecret(input.code);

  await withTransaction(async (client) => {
    const { rows } = await client.query<{
      id: string;
      code_hash: string;
      expires_at: Date;
      attempt_count: number;
    }>(
      `SELECT id, code_hash, expires_at, attempt_count
       FROM password_reset_codes
       WHERE tenant_id = $1 AND email = $2 AND used_at IS NULL
       ORDER BY created_at DESC
       LIMIT 1
       FOR UPDATE`,
      [tenantId, email],
    );
    if (rows.length === 0)
      throw new HttpError(
        400,
        "We don't have an active reset code for this email. Request a new code from the Forgot password page.",
      );
    const row = rows[0]!;
    if (row.expires_at.getTime() < Date.now())
      throw new HttpError(400, "That reset code has expired. Request a new one and try again.");
    if (row.code_hash !== codeHash) {
      await client.query(`UPDATE password_reset_codes SET attempt_count = attempt_count + 1 WHERE id = $1`, [row.id]);
      throw new HttpError(
        400,
        "That reset code isn't valid. Double-check the numbers or request a fresh code.",
      );
    }
  });
}

export async function resetPasswordWithCode(input: ResetPasswordWithOtpInput, tenantId: string): Promise<void> {
  const email = normalizeEmail(input.email);
  const codeHash = hashSecret(input.code);
  const rounds = Number(process.env.BCRYPT_ROUNDS ?? 10);
  const passwordHash = await bcrypt.hash(input.newPassword, rounds);

  await withTransaction(async (client) => {
    const { rows } = await client.query<{ id: string; user_id: string | null; expires_at: Date; code_hash: string }>(
      `SELECT id, user_id, expires_at, code_hash
       FROM password_reset_codes
       WHERE tenant_id = $1 AND email = $2 AND used_at IS NULL
       ORDER BY created_at DESC
       LIMIT 1
       FOR UPDATE`,
      [tenantId, email],
    );
    if (rows.length === 0)
      throw new HttpError(
        400,
        "We don't have an active reset code for this email. Start the reset flow again.",
      );
    const codeRow = rows[0]!;
    if (codeRow.expires_at.getTime() < Date.now())
      throw new HttpError(400, "That reset code has expired. Request a new reset link.");
    if (codeRow.code_hash !== codeHash)
      throw new HttpError(
        400,
        "That reset code isn't valid. Check the email we sent you or request a new code.",
      );
    if (!codeRow.user_id) throw new HttpError(404, "No user account matched this reset request.");

    await client.query(`UPDATE password_reset_codes SET used_at = NOW() WHERE id = $1`, [codeRow.id]);
    await client.query(
      `UPDATE users
       SET password_hash = $1,
           failed_login_attempts = 0,
           login_attempts = 0,
           locked_at = NULL,
           locked_until = NULL,
           locked_reason = NULL,
           last_password_reset_at = NOW(),
           password_changed_at = NOW(),
           force_password_change = false,
           updated_at = NOW()
       WHERE id = $2`,
      [passwordHash, codeRow.user_id],
    );
    await client.query(`UPDATE auth_sessions SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL`, [
      codeRow.user_id,
    ]);
  });
}

export async function requestEmailVerificationCode(
  input: RequestOtpInput,
  tenantId: string,
): Promise<{ expiresInSeconds: number }> {
  const email = normalizeEmail(input.email);
  const code = generateOtpCode();
  const codeHash = hashSecret(code);
  const expiresInSeconds = 24 * 60 * 60;
  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

  const { rows } = await query<{ id: string }>(
    `SELECT id FROM users WHERE tenant_id = $1 AND email = $2 AND is_active = true`,
    [tenantId, email],
  );
  const userId = rows[0]?.id ?? null;

  await query(
    `DELETE FROM email_verification_codes WHERE tenant_id = $1 AND email = $2 AND used_at IS NULL`,
    [tenantId, email],
  );
  await query(
    `INSERT INTO email_verification_codes (tenant_id, user_id, email, code_hash, expires_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [tenantId, userId, email, codeHash, expiresAt],
  );

  return { expiresInSeconds };
}

export async function verifyEmailCode(input: VerifyOtpInput, tenantId: string): Promise<void> {
  const email = normalizeEmail(input.email);
  const codeHash = hashSecret(input.code);

  await withTransaction(async (client) => {
    const { rows } = await client.query<{ id: string; user_id: string | null; expires_at: Date; code_hash: string }>(
      `SELECT id, user_id, expires_at, code_hash
       FROM email_verification_codes
       WHERE tenant_id = $1 AND email = $2 AND used_at IS NULL
       ORDER BY created_at DESC
       LIMIT 1
       FOR UPDATE`,
      [tenantId, email],
    );
    if (rows.length === 0)
      throw new HttpError(
        400,
        "There is no active verification code for this email. Send a new code and try again.",
      );
    const row = rows[0]!;
    if (row.expires_at.getTime() < Date.now())
      throw new HttpError(
        400,
        "That verification code has expired. Request a new code from your email inbox flow.",
      );
    if (row.code_hash !== codeHash) {
      await client.query(`UPDATE email_verification_codes SET attempt_count = attempt_count + 1 WHERE id = $1`, [row.id]);
      throw new HttpError(
        400,
        "That verification code doesn't match. Re-enter it carefully or request a new one.",
      );
    }
    if (!row.user_id) throw new HttpError(404, "No user account matched this verification request.");

    await client.query(`UPDATE email_verification_codes SET used_at = NOW() WHERE id = $1`, [row.id]);
    await client.query(`UPDATE users SET email_verified_at = NOW(), updated_at = NOW() WHERE id = $1`, [row.user_id]);
  });
}

export async function cleanupExpiredAuthArtifacts(): Promise<void> {
  await query(`DELETE FROM password_reset_codes WHERE used_at IS NOT NULL OR expires_at < NOW()`);
  await query(`DELETE FROM email_verification_codes WHERE used_at IS NOT NULL OR expires_at < NOW()`);
  await query(`DELETE FROM auth_sessions WHERE revoked_at IS NOT NULL OR expires_at < NOW()`);
}
