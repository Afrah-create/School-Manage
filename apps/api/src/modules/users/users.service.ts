import type { CreateUserInput, ResetPasswordInput } from "@uganda-cbc-sms/shared";
import bcrypt from "bcrypt";
import { query } from "../../config/db";
import { HttpError } from "../../utils/httpError";
import { toUserPublic } from "../../utils/userMapper";

export async function createUser(input: CreateUserInput) {
  try {
    const rounds = Number(process.env.BCRYPT_ROUNDS ?? 10);
    const hash = await bcrypt.hash(input.password, rounds);
    const { rows } = await query(
      `INSERT INTO users (full_name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, full_name, email, role, is_active, created_at`,
      [input.fullName, input.email.toLowerCase().trim(), hash, input.role],
    );
    return toUserPublic(rows[0]!);
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err.code === "23505") throw new HttpError(400, "Email already exists");
    throw new Error(e instanceof Error ? e.message : "Could not create user");
  }
}

export async function listUsers() {
  try {
    const { rows } = await query(
      `SELECT id, full_name, email, role, is_active, created_at FROM users ORDER BY created_at DESC`,
    );
    return rows.map((r) => toUserPublic(r as Parameters<typeof toUserPublic>[0]));
  } catch (e) {
    throw new Error(e instanceof Error ? e.message : "Could not list users");
  }
}

export async function deactivateUser(id: string) {
  try {
    const r = await query(`UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1`, [id]);
    if (r.rowCount === 0) throw new HttpError(404, "User not found");
  } catch (e) {
    if (e instanceof HttpError) throw e;
    throw new Error(e instanceof Error ? e.message : "Could not deactivate user");
  }
}

export async function resetUserPassword(id: string, input: ResetPasswordInput) {
  try {
    const rounds = Number(process.env.BCRYPT_ROUNDS ?? 10);
    const hash = await bcrypt.hash(input.newPassword, rounds);
    const r = await query(
      `UPDATE users
       SET password_hash = $1,
           failed_login_attempts = 0,
           locked_at = NULL,
           last_password_reset_at = NOW(),
           updated_at = NOW()
       WHERE id = $2`,
      [hash, id],
    );
    if (r.rowCount === 0) throw new HttpError(404, "User not found");
    await query(`UPDATE auth_sessions SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL`, [id]);
  } catch (e) {
    if (e instanceof HttpError) throw e;
    throw new Error(e instanceof Error ? e.message : "Could not reset password");
  }
}

export async function getUserById(id: string) {
  try {
    const { rows } = await query(
      `SELECT id, full_name, email, role, is_active, created_at FROM users WHERE id = $1`,
      [id],
    );
    if (rows.length === 0) throw new HttpError(404, "User not found");
    return toUserPublic(rows[0]!);
  } catch (e) {
    if (e instanceof HttpError) throw e;
    throw new Error(e instanceof Error ? e.message : "User not found");
  }
}
