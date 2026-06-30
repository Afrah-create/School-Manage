import { query } from "../../config/db.js";
import {
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_CATEGORY_LABELS,
  type NotificationCategory,
  isNotificationCategory,
} from "../../services/notifications/categories.js";
import { resolveNotificationDeliveryPrefs } from "../../services/notifications/notificationService.js";
import { HttpError } from "../../utils/httpError.js";

export type NotificationRow = {
  id: string;
  userId: string;
  tenantId: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  metadata: Record<string, unknown> | null;
  readAt: string | null;
  archivedAt: string | null;
  createdAt: string;
};

export type NotificationPreferenceRow = {
  category: NotificationCategory;
  label: string;
  emailEnabled: boolean;
  inAppEnabled: boolean;
};

export type NotificationListView = "active" | "archived" | "all";

function mapNotification(row: Record<string, unknown>): NotificationRow {
  return {
    id: String(row["id"]),
    userId: String(row["user_id"]),
    tenantId: String(row["tenant_id"]),
    type: String(row["type"]),
    title: String(row["title"]),
    body: String(row["body"]),
    link: row["link"] != null ? String(row["link"]) : null,
    metadata: (row["metadata"] as Record<string, unknown> | null) ?? null,
    readAt: row["read_at"] != null ? new Date(String(row["read_at"])).toISOString() : null,
    archivedAt: row["archived_at"] != null ? new Date(String(row["archived_at"])).toISOString() : null,
    createdAt: new Date(String(row["created_at"])).toISOString(),
  };
}

const NOTIFICATION_COLUMNS =
  "id, user_id, tenant_id, type, title, body, link, metadata, read_at, archived_at, created_at";

function buildListWhere(
  userId: string,
  params: { unreadOnly?: boolean; view?: NotificationListView },
): { whereSql: string; values: unknown[] } {
  const where = ["user_id = $1"];
  const values: unknown[] = [userId];

  const view = params.view ?? "active";
  if (view === "active") {
    where.push("archived_at IS NULL");
  } else if (view === "archived") {
    where.push("archived_at IS NOT NULL");
  }

  if (params.unreadOnly) {
    where.push("read_at IS NULL");
  }

  return { whereSql: where.join(" AND "), values };
}

export async function listNotifications(
  userId: string,
  params: { page: number; limit: number; unreadOnly?: boolean; view?: NotificationListView },
): Promise<{ items: NotificationRow[]; total: number; unreadCount: number }> {
  const offset = (params.page - 1) * params.limit;
  const { whereSql, values } = buildListWhere(userId, params);

  const { rows } = await query(
    `SELECT ${NOTIFICATION_COLUMNS}
     FROM notifications
     WHERE ${whereSql}
     ORDER BY created_at DESC
     LIMIT $${values.length + 1}
     OFFSET $${values.length + 2}`,
    [...values, params.limit, offset],
  );

  const countResult = await query<{ total: string }>(
    `SELECT COUNT(*)::text AS total FROM notifications WHERE ${whereSql}`,
    values,
  );

  const unreadResult = await query<{ total: string }>(
    `SELECT COUNT(*)::text AS total
     FROM notifications
     WHERE user_id = $1 AND read_at IS NULL AND archived_at IS NULL`,
    [userId],
  );

  return {
    items: rows.map((r) => mapNotification(r as Record<string, unknown>)),
    total: Number(countResult.rows[0]?.total ?? "0"),
    unreadCount: Number(unreadResult.rows[0]?.total ?? "0"),
  };
}

export async function markNotificationRead(userId: string, notificationId: string): Promise<NotificationRow> {
  const { rows } = await query(
    `UPDATE notifications
     SET read_at = COALESCE(read_at, NOW())
     WHERE id = $1 AND user_id = $2 AND archived_at IS NULL
     RETURNING ${NOTIFICATION_COLUMNS}`,
    [notificationId, userId],
  );
  if (!rows[0]) {
    throw new HttpError(404, "Notification not found.");
  }
  return mapNotification(rows[0] as Record<string, unknown>);
}

export async function markAllNotificationsRead(userId: string): Promise<{ updated: number }> {
  const { rowCount } = await query(
    `UPDATE notifications
     SET read_at = NOW()
     WHERE user_id = $1 AND read_at IS NULL AND archived_at IS NULL`,
    [userId],
  );
  return { updated: rowCount ?? 0 };
}

export async function archiveNotification(userId: string, notificationId: string): Promise<NotificationRow> {
  const { rows } = await query(
    `UPDATE notifications
     SET archived_at = COALESCE(archived_at, NOW()), read_at = COALESCE(read_at, NOW())
     WHERE id = $1 AND user_id = $2
     RETURNING ${NOTIFICATION_COLUMNS}`,
    [notificationId, userId],
  );
  if (!rows[0]) {
    throw new HttpError(404, "Notification not found.");
  }
  return mapNotification(rows[0] as Record<string, unknown>);
}

export async function unarchiveNotification(userId: string, notificationId: string): Promise<NotificationRow> {
  const { rows } = await query(
    `UPDATE notifications
     SET archived_at = NULL
     WHERE id = $1 AND user_id = $2 AND archived_at IS NOT NULL
     RETURNING ${NOTIFICATION_COLUMNS}`,
    [notificationId, userId],
  );
  if (!rows[0]) {
    throw new HttpError(404, "Archived notification not found.");
  }
  return mapNotification(rows[0] as Record<string, unknown>);
}

export async function archiveNotifications(userId: string, ids: string[]): Promise<{ archived: number }> {
  if (ids.length === 0) {
    return { archived: 0 };
  }
  const { rowCount } = await query(
    `UPDATE notifications
     SET archived_at = COALESCE(archived_at, NOW()), read_at = COALESCE(read_at, NOW())
     WHERE user_id = $1 AND id = ANY($2::uuid[]) AND archived_at IS NULL`,
    [userId, ids],
  );
  return { archived: rowCount ?? 0 };
}

export async function deleteNotification(userId: string, notificationId: string): Promise<{ deleted: boolean }> {
  const { rowCount } = await query(
    `DELETE FROM notifications WHERE id = $1 AND user_id = $2`,
    [notificationId, userId],
  );
  if (!rowCount) {
    throw new HttpError(404, "Notification not found.");
  }
  return { deleted: true };
}

export async function deleteNotifications(userId: string, ids: string[]): Promise<{ deleted: number }> {
  if (ids.length === 0) {
    return { deleted: 0 };
  }
  const { rowCount } = await query(
    `DELETE FROM notifications WHERE user_id = $1 AND id = ANY($2::uuid[])`,
    [userId, ids],
  );
  return { deleted: rowCount ?? 0 };
}

export async function getNotificationPreferences(userId: string): Promise<NotificationPreferenceRow[]> {
  const { rows } = await query<{ category: string; email_enabled: boolean; in_app_enabled: boolean }>(
    `SELECT category, email_enabled, in_app_enabled
     FROM notification_preferences
     WHERE user_id = $1`,
    [userId],
  );

  const stored = new Map(rows.map((r) => [r.category, r]));

  return NOTIFICATION_CATEGORIES.map((category) => {
    const pref = stored.get(category);
    const resolved = resolveNotificationDeliveryPrefs(pref);
    return {
      category,
      label: NOTIFICATION_CATEGORY_LABELS[category],
      emailEnabled: resolved.emailEnabled,
      inAppEnabled: resolved.inAppEnabled,
    };
  });
}

export async function updateNotificationPreferences(
  userId: string,
  tenantId: string,
  updates: Array<{
    category: NotificationCategory;
    emailEnabled?: boolean;
    inAppEnabled?: boolean;
  }>,
): Promise<NotificationPreferenceRow[]> {
  for (const item of updates) {
    if (!isNotificationCategory(item.category)) {
      throw new HttpError(400, `Unknown notification category: ${item.category}`);
    }

    const { rows: existing } = await query<{ email_enabled: boolean; in_app_enabled: boolean }>(
      `SELECT email_enabled, in_app_enabled FROM notification_preferences WHERE user_id = $1 AND category = $2`,
      [userId, item.category],
    );

    const current = resolveNotificationDeliveryPrefs(existing[0]);
    const emailEnabled = item.emailEnabled ?? current.emailEnabled;
    const inAppEnabled = item.inAppEnabled ?? current.inAppEnabled;

    await query(
      `INSERT INTO notification_preferences (user_id, tenant_id, category, email_enabled, in_app_enabled)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, category) DO UPDATE SET
         email_enabled = EXCLUDED.email_enabled,
         in_app_enabled = EXCLUDED.in_app_enabled`,
      [userId, tenantId, item.category, emailEnabled, inAppEnabled],
    );
  }

  return getNotificationPreferences(userId);
}
