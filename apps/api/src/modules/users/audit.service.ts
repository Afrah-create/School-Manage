import { query } from "../../config/db";

export type AuditAction =
  | "USER_CREATED"
  | "USER_UPDATED"
  | "USER_ACTIVATED"
  | "USER_DEACTIVATED"
  | "USER_DELETED"
  | "PASSWORD_RESET"
  | "USER_UNLOCKED"
  | "USER_NOTES_UPDATED"
  | "PROFILE_PHOTO_UPDATED"
  | "LOGIN_SUCCESS"
  | "LOGIN_FAILED"
  | "LOGOUT";

type LogUserActionInput = {
  userId: string;
  actorId?: string;
  action: AuditAction;
  changedFields?: string[] | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
};

export async function logUserAction(input: LogUserActionInput): Promise<void> {
  await query(
    `INSERT INTO user_audit_logs (user_id, actor_id, action, changed_fields, ip_address, user_agent, metadata)
     VALUES ($1, $2, $3, $4::jsonb, NULLIF($5, '')::inet, $6, $7::jsonb)`,
    [
      input.userId,
      input.actorId ?? null,
      input.action,
      JSON.stringify(input.changedFields ?? null),
      input.ipAddress ?? null,
      input.userAgent ?? null,
      JSON.stringify(input.metadata ?? null),
    ],
  );
}
