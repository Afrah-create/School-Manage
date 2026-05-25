import type {
  CreateUserInput,
  ResetPasswordInput,
  UpdateProfileInput,
  UpdateUserInput,
} from "@uganda-cbc-sms/shared";
import bcrypt from "bcrypt";
import { query } from "../../config/db";
import { HttpError } from "../../utils/httpError";
import { toUserPublic } from "../../utils/userMapper";
import { logUserAction } from "./audit.service";

type UserActorMeta = {
  actorId?: string;
  ipAddress?: string | null;
  userAgent?: string | null;
};

type ListUsersParams = {
  page: number;
  limit: number;
  search?: string;
  role?: string;
  status?: "active" | "inactive" | "locked";
};

type UserDetailsRow = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  last_login_at: Date | null;
  login_attempts: number | null;
  locked_at: Date | null;
  locked_until: Date | null;
  locked_reason: string | null;
  password_changed_at: Date | null;
  force_password_change: boolean | null;
  notes: string | null;
  system_account: boolean | null;
  photo_url: string | null;
};

function mapUserDetails(row: UserDetailsRow) {
  return {
    ...toUserPublic(row),
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
    lastLoginAt: row.last_login_at ? new Date(row.last_login_at).toISOString() : null,
    loginAttempts: row.login_attempts ?? 0,
    lockedAt: row.locked_at ? new Date(row.locked_at).toISOString() : null,
    lockedUntil: row.locked_until ? new Date(row.locked_until).toISOString() : null,
    lockedReason: row.locked_reason,
    passwordChangedAt: row.password_changed_at ? new Date(row.password_changed_at).toISOString() : null,
    forcePasswordChange: Boolean(row.force_password_change),
    notes: row.notes,
    systemAccount: Boolean(row.system_account),
    photoUrl: row.photo_url ?? null,
  };
}

async function getUserGuardInfo(id: string) {
  const { rows } = await query<{ id: string; system_account: boolean; is_active: boolean; deleted_at: Date | null }>(
    `SELECT id, system_account, is_active, deleted_at FROM users WHERE id = $1`,
    [id],
  );
  if (rows.length === 0 || rows[0]!.deleted_at) throw new HttpError(404, "User not found");
  return rows[0]!;
}

export async function createUser(
  input: CreateUserInput & { notes?: string; forcePasswordChange?: boolean },
  meta: UserActorMeta = {},
) {
  try {
    const rounds = Number(process.env.BCRYPT_ROUNDS ?? 10);
    const hash = await bcrypt.hash(input.password, rounds);
    const { rows } = await query(
      `INSERT INTO users (full_name, email, password_hash, role, notes, force_password_change, password_changed_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING id, full_name, email, role, is_active, created_at`,
      [
        input.fullName,
        input.email.toLowerCase().trim(),
        hash,
        input.role,
        input.notes ?? null,
        Boolean(input.forcePasswordChange),
      ],
    );
    const created = toUserPublic(rows[0]!);
    if (meta.actorId) {
      await logUserAction({
        userId: created.id,
        actorId: meta.actorId,
        action: "USER_CREATED",
        changedFields: ["fullName", "email", "role", "notes", "forcePasswordChange"],
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      });
    }
    return created;
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err.code === "23505") throw new HttpError(400, "Email already exists");
    throw new Error(e instanceof Error ? e.message : "Could not create user");
  }
}

export async function listUsers(params: ListUsersParams) {
  try {
    const offset = (params.page - 1) * params.limit;
    const values: unknown[] = [];
    const where: string[] = ["deleted_at IS NULL"];
    if (params.search?.trim()) {
      values.push(`%${params.search.trim()}%`);
      where.push(`(full_name ILIKE $${values.length} OR email ILIKE $${values.length})`);
    }
    if (params.role) {
      values.push(params.role);
      where.push(`role = $${values.length}`);
    }
    if (params.status === "active") where.push("is_active = true");
    if (params.status === "inactive") where.push("is_active = false");
    if (params.status === "locked") where.push("(locked_until IS NOT NULL AND locked_until > NOW())");

    const { rows } = await query(
      `SELECT id, full_name, email, role, is_active, created_at, locked_until, force_password_change, system_account
       FROM users
       WHERE ${where.join(" AND ")}
       ORDER BY created_at DESC
       LIMIT $${values.length + 1}
       OFFSET $${values.length + 2}`,
      [...values, params.limit, offset],
    );
    const countResult = await query<{ total: string }>(
      `SELECT COUNT(*)::text AS total
       FROM users
       WHERE ${where.join(" AND ")}`,
      values,
    );
    const total = Number(countResult.rows[0]?.total ?? "0");
    return {
      items: rows.map((r) => ({
        ...toUserPublic(r as Parameters<typeof toUserPublic>[0]),
        locked: Boolean(r.locked_until && new Date(r.locked_until as string).getTime() > Date.now()),
        forcePasswordChange: Boolean(r.force_password_change),
        systemAccount: Boolean(r.system_account),
      })),
      pagination: {
        page: params.page,
        limit: params.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / params.limit)),
      },
    };
  } catch (e) {
    throw new Error(e instanceof Error ? e.message : "Could not list users");
  }
}

export async function deactivateUser(id: string, actorId: string, meta: UserActorMeta = {}) {
  try {
    if (id === actorId) throw new HttpError(400, "You cannot deactivate your own account");
    const guard = await getUserGuardInfo(id);
    if (guard.system_account) throw new HttpError(400, "System accounts cannot be deactivated");
    const r = await query(
      `UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL`,
      [id],
    );
    if (r.rowCount === 0) throw new HttpError(404, "User not found");
    await logUserAction({
      userId: id,
      actorId,
      action: "USER_DEACTIVATED",
      changedFields: ["isActive"],
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
  } catch (e) {
    if (e instanceof HttpError) throw e;
    throw new Error(e instanceof Error ? e.message : "Could not deactivate user");
  }
}

export async function resetUserPassword(
  id: string,
  input: ResetPasswordInput & { forcePasswordChange?: boolean },
  actorId: string,
  meta: UserActorMeta = {},
) {
  try {
    const rounds = Number(process.env.BCRYPT_ROUNDS ?? 10);
    const hash = await bcrypt.hash(input.newPassword, rounds);
    const r = await query(
      `UPDATE users
       SET password_hash = $1,
           failed_login_attempts = 0,
           login_attempts = 0,
           locked_at = NULL,
           locked_until = NULL,
           locked_reason = NULL,
           last_password_reset_at = NOW(),
           password_changed_at = NOW(),
           force_password_change = $2,
           updated_at = NOW()
       WHERE id = $3 AND deleted_at IS NULL`,
      [hash, Boolean(input.forcePasswordChange), id],
    );
    if (r.rowCount === 0) throw new HttpError(404, "User not found");
    await query(`UPDATE auth_sessions SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL`, [id]);
    await logUserAction({
      userId: id,
      actorId,
      action: "PASSWORD_RESET",
      changedFields: ["passwordHash", "forcePasswordChange"],
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
  } catch (e) {
    if (e instanceof HttpError) throw e;
    throw new Error(e instanceof Error ? e.message : "Could not reset password");
  }
}

export async function getUserById(id: string) {
  try {
    const { rows } = await query<UserDetailsRow>(
      `SELECT id, full_name, email, role, is_active, created_at, updated_at,
              last_login_at, login_attempts, locked_at, locked_until, locked_reason,
              password_changed_at, force_password_change, notes, system_account, photo_url
       FROM users
       WHERE id = $1 AND deleted_at IS NULL`,
      [id],
    );
    if (rows.length === 0) throw new HttpError(404, "User not found");
    return mapUserDetails(rows[0]!);
  } catch (e) {
    if (e instanceof HttpError) throw e;
    throw new Error(e instanceof Error ? e.message : "User not found");
  }
}

export async function updateUser(id: string, input: UpdateUserInput, actorId?: string) {
  const map: Record<keyof UpdateUserInput, string> = {
    fullName: "full_name",
    email: "email",
    role: "role",
    isActive: "is_active",
  };
  const entries = Object.entries(input).filter(([, value]) => value !== undefined) as Array<
    [keyof UpdateUserInput, unknown]
  >;

  const sets: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  for (const [key, value] of entries) {
    sets.push(`${map[key]} = $${i}`);
    values.push(key === "email" ? String(value).toLowerCase().trim() : value);
    i += 1;
  }

  values.push(id);
  try {
    if (typeof input.isActive === "boolean" && input.isActive === false) {
      const guard = await getUserGuardInfo(id);
      if (guard.system_account) throw new HttpError(400, "System accounts cannot be deactivated");
    }
    const { rows } = await query(
      `UPDATE users
       SET ${sets.join(", ")}, updated_at = NOW()
       WHERE id = $${i} AND deleted_at IS NULL
       RETURNING id, full_name, email, role, is_active, created_at, photo_url`,
      values,
    );
    if (rows.length === 0) throw new HttpError(404, "User not found");
    const updated = toUserPublic(rows[0]!);
    if (actorId) {
      await logUserAction({
        userId: id,
        actorId,
        action: "USER_UPDATED",
        changedFields: Object.keys(input),
      });
    }
    return updated;
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err.code === "23505") throw new HttpError(400, "Email already exists");
    if (e instanceof HttpError) throw e;
    throw new Error(e instanceof Error ? e.message : "Could not update user");
  }
}

export async function updateMyProfile(userId: string, input: UpdateProfileInput) {
  return updateUser(userId, input, userId);
}

export async function updateUserPhoto(userId: string, relativeUrl: string) {
  try {
    const r = await query(
      `UPDATE users SET photo_url = $1, updated_at = NOW() WHERE id = $2 AND deleted_at IS NULL
       RETURNING id, full_name, email, role, is_active, created_at, photo_url`,
      [relativeUrl, userId],
    );
    if (r.rowCount === 0) throw new HttpError(404, "User not found");
    await logUserAction({
      userId,
      actorId: userId,
      action: "PROFILE_PHOTO_UPDATED",
      changedFields: ["photoUrl"],
    });
    return toUserPublic(r.rows[0]!);
  } catch (e) {
    if (e instanceof HttpError) throw e;
    throw new Error(e instanceof Error ? e.message : "Could not update profile photo");
  }
}

export async function deleteUser(id: string, actorId: string) {
  if (id === actorId) throw new HttpError(400, "You cannot delete your own account");
  try {
    const guard = await getUserGuardInfo(id);
    if (guard.system_account) throw new HttpError(400, "System accounts cannot be deleted");
    const r = await query(
      `UPDATE users
       SET is_active = false,
           deleted_at = NOW(),
           deleted_by = $2,
           updated_at = NOW()
       WHERE id = $1 AND deleted_at IS NULL`,
      [id, actorId],
    );
    if (r.rowCount === 0) throw new HttpError(404, "User not found");
    await logUserAction({
      userId: id,
      actorId,
      action: "USER_DELETED",
      changedFields: ["isActive", "deletedAt", "deletedBy"],
    });
  } catch (e) {
    if (e instanceof HttpError) throw e;
    throw new Error(e instanceof Error ? e.message : "Could not delete user");
  }
}

export async function activateUser(id: string, actorId: string, meta: UserActorMeta = {}) {
  const r = await query(`UPDATE users SET is_active = true, updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL`, [id]);
  if (r.rowCount === 0) throw new HttpError(404, "User not found");
  await logUserAction({
    userId: id,
    actorId,
    action: "USER_ACTIVATED",
    changedFields: ["isActive"],
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });
}

export async function unlockUser(id: string, actorId: string, meta: UserActorMeta = {}) {
  const r = await query(
    `UPDATE users
     SET locked_at = NULL, locked_until = NULL, locked_reason = NULL, failed_login_attempts = 0, login_attempts = 0, updated_at = NOW()
     WHERE id = $1 AND deleted_at IS NULL`,
    [id],
  );
  if (r.rowCount === 0) throw new HttpError(404, "User not found");
  await logUserAction({
    userId: id,
    actorId,
    action: "USER_UNLOCKED",
    changedFields: ["lockedAt", "lockedUntil", "lockedReason", "loginAttempts"],
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });
}

export async function updateUserNotes(id: string, notes: string, actorId: string, meta: UserActorMeta = {}) {
  const r = await query(`UPDATE users SET notes = $1, updated_at = NOW() WHERE id = $2 AND deleted_at IS NULL`, [notes, id]);
  if (r.rowCount === 0) throw new HttpError(404, "User not found");
  await logUserAction({
    userId: id,
    actorId,
    action: "USER_NOTES_UPDATED",
    changedFields: ["notes"],
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });
}

export async function getUserAuditLogs(userId: string, limit = 50) {
  const { rows } = await query(
    `SELECT l.id, l.user_id, l.actor_id, l.action, l.changed_fields, l.ip_address, l.user_agent, l.metadata, l.created_at,
            actor.full_name AS actor_name
     FROM user_audit_logs l
     LEFT JOIN users actor ON actor.id = l.actor_id
     WHERE l.user_id = $1
     ORDER BY l.created_at DESC
     LIMIT $2`,
    [userId, limit],
  );
  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    actorId: row.actor_id,
    actorName: row.actor_name,
    action: row.action,
    changedFields: row.changed_fields,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    metadata: row.metadata,
    createdAt: row.created_at ? new Date(row.created_at as string).toISOString() : undefined,
  }));
}

async function bulkAction(ids: string[], actorId: string, action: "activate" | "deactivate" | "delete") {
  const skipped: Array<{ id: string; reason: string }> = [];
  const processed: string[] = [];
  for (const id of ids) {
    try {
      if (action === "activate") await activateUser(id, actorId);
      if (action === "deactivate") await deactivateUser(id, actorId);
      if (action === "delete") await deleteUser(id, actorId);
      processed.push(id);
    } catch (error) {
      if (error instanceof HttpError) skipped.push({ id, reason: error.message });
      else throw error;
    }
  }
  return { processed, skipped };
}

export async function bulkActivateUsers(ids: string[], actorId: string) {
  return bulkAction(ids, actorId, "activate");
}

export async function bulkDeactivateUsers(ids: string[], actorId: string) {
  return bulkAction(ids, actorId, "deactivate");
}

export async function bulkDeleteUsers(ids: string[], actorId: string) {
  return bulkAction(ids, actorId, "delete");
}
