import { tenantQuery } from "../../config/db.js";
import { loadEnv } from "../../config/env.js";
import { sendEmail } from "../mail/resendClient.js";
import { buildNotificationEmail } from "../mail/templates/notificationEmail.js";
import type { NotificationCategory } from "./categories.js";

export type NotificationDeliveryPrefs = {
  emailEnabled: boolean;
  inAppEnabled: boolean;
};

export type CreateNotificationInput = {
  userId: string;
  tenantId: string;
  category: NotificationCategory;
  title: string;
  body: string;
  link?: string | null;
  metadata?: Record<string, unknown> | null;
  /** Defaults to category when omitted. */
  type?: string;
};

export type CreateNotificationResult = {
  notificationId: string | null;
  emailAttempted: boolean;
};

/** Opt-out defaults: both channels enabled when no preference row exists. */
export function resolveNotificationDeliveryPrefs(
  stored: { email_enabled: boolean; in_app_enabled: boolean } | null | undefined,
): NotificationDeliveryPrefs {
  if (!stored) {
    return { emailEnabled: true, inAppEnabled: true };
  }
  return {
    emailEnabled: stored.email_enabled,
    inAppEnabled: stored.in_app_enabled,
  };
}

export async function getNotificationDeliveryPrefs(
  tenantId: string,
  userId: string,
  category: NotificationCategory,
): Promise<NotificationDeliveryPrefs> {
  const { rows } = await tenantQuery<{ email_enabled: boolean; in_app_enabled: boolean }>(
    tenantId,
    `SELECT email_enabled, in_app_enabled
     FROM notification_preferences
     WHERE user_id = $1 AND category = $2`,
    [userId, category],
  );
  return resolveNotificationDeliveryPrefs(rows[0]);
}

export async function createNotification(
  input: CreateNotificationInput,
): Promise<CreateNotificationResult> {
  const prefs = await getNotificationDeliveryPrefs(input.tenantId, input.userId, input.category);
  const type = input.type?.trim() || input.category;

  let notificationId: string | null = null;

  if (prefs.inAppEnabled) {
    const { rows } = await tenantQuery<{ id: string }>(
      input.tenantId,
      `INSERT INTO notifications (user_id, tenant_id, type, title, body, link, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
       RETURNING id`,
      [
        input.userId,
        input.tenantId,
        type,
        input.title,
        input.body,
        input.link ?? null,
        input.metadata ? JSON.stringify(input.metadata) : null,
      ],
    );
    notificationId = rows[0]?.id ?? null;
  }

  let emailAttempted = false;
  if (prefs.emailEnabled) {
    emailAttempted = true;
    await queueNotificationEmail({
      tenantId: input.tenantId,
      userId: input.userId,
      notificationId,
      title: input.title,
      body: input.body,
      link: input.link ?? null,
    });
  }

  return { notificationId, emailAttempted };
}

async function queueNotificationEmail(input: {
  tenantId: string;
  userId: string;
  notificationId: string | null;
  title: string;
  body: string;
  link: string | null;
}): Promise<void> {
  const { rows: users } = await tenantQuery<{ email: string }>(
    input.tenantId,
    `SELECT email FROM users WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL AND is_active = true`,
    [input.userId, input.tenantId],
  );
  const recipientEmail = users[0]?.email?.trim();
  if (!recipientEmail) {
    console.warn("[notifications] skip email — no active user email for", input.userId);
    return;
  }

  const { subject, html, text } = buildNotificationEmail({
    title: input.title,
    body: input.body,
    actionUrl: resolveAbsoluteLink(input.link),
  });

  const { rows: outbox } = await tenantQuery<{ id: string }>(
    input.tenantId,
    `INSERT INTO email_outbox (tenant_id, notification_id, recipient_email, subject, status, attempts)
     VALUES ($1, $2, $3, $4, 'pending', 0)
     RETURNING id`,
    [input.tenantId, input.notificationId, recipientEmail, subject],
  );
  const outboxId = outbox[0]?.id;
  if (!outboxId) return;

  const result = await sendEmail({ to: recipientEmail, subject, html, text });

  if (result.sent) {
    await tenantQuery(
      input.tenantId,
      `UPDATE email_outbox
       SET status = 'sent', sent_at = NOW(), attempts = attempts + 1
       WHERE id = $1`,
      [outboxId],
    );
    return;
  }

  await tenantQuery(
    input.tenantId,
    `UPDATE email_outbox
     SET status = 'failed', error_message = $2, attempts = attempts + 1
     WHERE id = $1`,
    [outboxId, result.error ?? "Email send failed"],
  );
}

function resolveAbsoluteLink(link: string | null): string | null {
  if (!link?.trim()) return null;
  const trimmed = link.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const base = loadEnv().WEB_APP_URL?.trim() || process.env.WEB_APP_URL?.trim() || "http://localhost:3000";
  return `${base.replace(/\/$/, "")}${trimmed.startsWith("/") ? trimmed : `/${trimmed}`}`;
}

export async function listActiveHeadteacherIds(tenantId: string): Promise<string[]> {
  const { rows } = await tenantQuery<{ id: string }>(
    tenantId,
    `SELECT id FROM users
     WHERE tenant_id = $1
       AND role = 'headteacher'
       AND is_active = true
       AND deleted_at IS NULL`,
    [tenantId],
  );
  return rows.map((r) => r.id);
}

export async function listActiveExamManagerRecipients(
  tenantId: string,
): Promise<Array<{ userId: string; role: string }>> {
  const { rows } = await tenantQuery<{ id: string; role: string }>(
    tenantId,
    `SELECT id, role FROM users
     WHERE tenant_id = $1
       AND role IN ('admin', 'headteacher')
       AND is_active = true
       AND deleted_at IS NULL`,
    [tenantId],
  );
  return rows.map((r) => ({ userId: r.id, role: r.role }));
}

export async function listExamPaperTeachers(
  tenantId: string,
  examId: string,
  classId: string,
  academicYearId: string,
): Promise<Array<{ userId: string; role: string; subjectCodes: string[] }>> {
  const { rows } = await tenantQuery<{
    user_id: string;
    role: string;
    subject_codes: string[];
  }>(
    tenantId,
    `SELECT u.id AS user_id, u.role, ARRAY_AGG(DISTINCT s.code ORDER BY s.code) AS subject_codes
     FROM exam_subjects es
     JOIN subjects s ON s.id = es.subject_id
     JOIN class_subjects cs
       ON cs.subject_id = es.subject_id
      AND cs.class_id = $2
      AND cs.academic_year_id = $3
     JOIN users u ON u.id = cs.teacher_id
     WHERE es.exam_id = $1
       AND cs.teacher_id IS NOT NULL
       AND u.is_active = true
       AND u.deleted_at IS NULL
       AND u.role IN ('subject_teacher', 'class_teacher')
     GROUP BY u.id, u.role`,
    [examId, classId, academicYearId],
  );
  return rows.map((r) => ({
    userId: r.user_id,
    role: r.role,
    subjectCodes: r.subject_codes ?? [],
  }));
}

export async function countPendingExamPapersWithEntrants(
  tenantId: string,
  examId: string,
): Promise<number> {
  const { rows } = await tenantQuery<{ c: number }>(
    tenantId,
    `SELECT COUNT(*)::int AS c
     FROM exam_subjects es
     LEFT JOIN exam_subject_submissions ess
       ON ess.exam_id = es.exam_id AND ess.subject_id = es.subject_id
     WHERE es.exam_id = $1
       AND COALESCE(ess.is_submitted, false) = false
       AND EXISTS (
         SELECT 1 FROM exam_student_entries ese
         WHERE ese.exam_id = es.exam_id AND ese.subject_id = es.subject_id
       )`,
    [examId],
  );
  return rows[0]?.c ?? 0;
}

export async function notifyUsers(
  userIds: string[],
  tenantId: string,
  input: Omit<CreateNotificationInput, "userId" | "tenantId">,
): Promise<void> {
  const unique = [...new Set(userIds.filter(Boolean))];
  for (const userId of unique) {
    await createNotification({ ...input, userId, tenantId });
  }
}
