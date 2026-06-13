import type {
  CreateBillingPeriodInput,
  TenantBillingStatus,
  UpdateBillingPeriodInput,
} from "@uganda-cbc-sms/shared";
import crypto from "crypto";
import { platformQuery, query } from "../../config/db.js";
import { loadEnv } from "../../config/env.js";
import { HttpError } from "../../utils/httpError.js";
import { logPlatformAction } from "../platform/platformAudit.service.js";
import { initializeFlutterwavePayment, verifyFlutterwaveWebhook } from "./flutterwave.js";

type BillingSettings = {
  defaultAmountUgx: number;
  currency: string;
  graceDays: number;
};

type PeriodRow = {
  id: string;
  tenant_id: string;
  label: string;
  period_start: string;
  period_end: string;
  due_at: Date;
  amount_ugx: string;
  currency: string;
  status: string;
  paid_at: Date | null;
  notes: string | null;
};

export async function getBillingSettings(): Promise<BillingSettings> {
  const { rows } = await platformQuery<{
    default_amount_ugx: string;
    currency: string;
    grace_days: number;
  }>(`SELECT default_amount_ugx, currency, grace_days FROM platform_billing_settings WHERE id = 1`);
  const row = rows[0];
  if (!row) {
    return { defaultAmountUgx: 500_000, currency: "UGX", graceDays: 7 };
  }
  return {
    defaultAmountUgx: Number(row.default_amount_ugx),
    currency: row.currency,
    graceDays: row.grace_days,
  };
}

export async function updateBillingSettings(input: BillingSettings, actorId: string): Promise<BillingSettings> {
  await platformQuery(
    `UPDATE platform_billing_settings
     SET default_amount_ugx = $1, currency = $2, grace_days = $3, updated_at = NOW()
     WHERE id = 1`,
    [input.defaultAmountUgx, input.currency.toUpperCase(), input.graceDays],
  );
  await logPlatformAction({
    actorId,
    action: "BILLING_SETTINGS_UPDATED",
    metadata: input,
  });
  return input;
}

function mapPeriod(row: PeriodRow) {
  return {
    id: row.id,
    label: row.label,
    amountUgx: Number(row.amount_ugx),
    currency: row.currency,
    dueAt: new Date(row.due_at).toISOString(),
    periodStart: row.period_start,
    periodEnd: row.period_end,
    status: row.status as TenantBillingStatus["currentPeriod"] extends infer T
      ? T extends { status: infer S }
        ? S
        : never
      : never,
  };
}

async function loadBlockingPeriod(tenantId: string): Promise<PeriodRow | null> {
  const { rows } = await query<PeriodRow>(
    `SELECT id, tenant_id, label, period_start::text, period_end::text, due_at,
            amount_ugx, currency, status, paid_at, notes
     FROM tenant_billing_periods
     WHERE tenant_id = $1 AND status IN ('pending', 'overdue')
     ORDER BY due_at DESC
     LIMIT 1`,
    [tenantId],
  );
  return rows[0] ?? null;
}

export async function getTenantBillingStatus(tenantId: string): Promise<TenantBillingStatus> {
  const settings = await getBillingSettings();
  const period = await loadBlockingPeriod(tenantId);

  if (!period) {
    return {
      accessStatus: "none",
      canUseApp: true,
      canPay: false,
      graceDays: settings.graceDays,
      currentPeriod: null,
      message: null,
    };
  }

  const dueMs = new Date(period.due_at).getTime();
  const graceEndMs = dueMs + settings.graceDays * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const mapped = mapPeriod(period);

  if (period.status === "overdue" || now > graceEndMs) {
    return {
      accessStatus: "past_due",
      canUseApp: false,
      canPay: true,
      graceDays: settings.graceDays,
      currentPeriod: mapped,
      message: `Subscription for ${period.label} is unpaid. Pay to restore access for your school.`,
    };
  }

  if (now > dueMs) {
    return {
      accessStatus: "grace",
      canUseApp: true,
      canPay: true,
      graceDays: settings.graceDays,
      currentPeriod: mapped,
      message: `Payment for ${period.label} is overdue. Please pay within the grace period.`,
    };
  }

  return {
    accessStatus: "current",
    canUseApp: true,
    canPay: true,
    graceDays: settings.graceDays,
    currentPeriod: mapped,
    message: null,
  };
}

export async function markOverdueBillingPeriods(): Promise<number> {
  const settings = await getBillingSettings();
  const { rowCount } = await platformQuery(
    `UPDATE tenant_billing_periods
     SET status = 'overdue', updated_at = NOW()
     WHERE status = 'pending'
       AND due_at + ($1::int * interval '1 day') < NOW()`,
    [settings.graceDays],
  );
  return rowCount ?? 0;
}

export async function createBillingPeriod(
  input: CreateBillingPeriodInput,
  actorId: string,
): Promise<{ id: string }> {
  const settings = await getBillingSettings();
  const amount = input.amountUgx ?? settings.defaultAmountUgx;
  const { rows } = await platformQuery<{ id: string }>(
    `INSERT INTO tenant_billing_periods (
       tenant_id, label, period_start, period_end, due_at, amount_ugx, currency, notes
     ) VALUES ($1, $2, $3::date, $4::date, $5::timestamptz, $6, $7, $8)
     RETURNING id`,
    [
      input.tenantId,
      input.label.trim(),
      input.periodStart,
      input.periodEnd,
      input.dueAt,
      amount,
      settings.currency,
      input.notes ?? null,
    ],
  );
  await logPlatformAction({
    actorId,
    action: "BILLING_PERIOD_CREATED",
    tenantId: input.tenantId,
    metadata: { label: input.label, amountUgx: amount },
  });
  return { id: rows[0]!.id };
}

export async function updateBillingPeriod(
  periodId: string,
  input: UpdateBillingPeriodInput,
  actorId: string,
): Promise<void> {
  const { rows: existing } = await platformQuery<{ tenant_id: string; status: string }>(
    `SELECT tenant_id, status FROM tenant_billing_periods WHERE id = $1`,
    [periodId],
  );
  if (!existing[0]) throw new HttpError(404, "Billing period not found.");

  const sets: string[] = ["updated_at = NOW()"];
  const values: unknown[] = [periodId];
  let i = 2;

  if (input.status) {
    sets.push(`status = $${i++}`);
    values.push(input.status);
    if (input.status === "paid") {
      sets.push(`paid_at = NOW()`);
    }
    if (input.status === "waived") {
      sets.push(`waived_at = NOW()`, `waived_by = $${i++}`);
      values.push(actorId);
    }
  }
  if (input.notes !== undefined) {
    sets.push(`notes = $${i++}`);
    values.push(input.notes);
  }
  if (input.dueAt) {
    sets.push(`due_at = $${i++}::timestamptz`);
    values.push(input.dueAt);
  }

  await platformQuery(`UPDATE tenant_billing_periods SET ${sets.join(", ")} WHERE id = $1`, values);
  await logPlatformAction({
    actorId,
    action: "BILLING_PERIOD_UPDATED",
    tenantId: existing[0].tenant_id,
    metadata: { periodId, ...input },
  });
}

async function completePayment(paymentId: string, providerReference?: string): Promise<void> {
  const { platformPool } = await import("../../config/db.js");
  const client = await platformPool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query<{
      id: string;
      tenant_id: string;
      billing_period_id: string;
      status: string;
    }>(
      `SELECT id, tenant_id, billing_period_id, status
       FROM tenant_subscription_payments WHERE id = $1 FOR UPDATE`,
      [paymentId],
    );
    const payment = rows[0];
    if (!payment) throw new HttpError(404, "Payment not found.");
    if (payment.status === "succeeded") {
      await client.query("COMMIT");
      return;
    }

    await client.query(
      `UPDATE tenant_subscription_payments
       SET status = 'succeeded', paid_at = NOW(), provider_reference = COALESCE($2, provider_reference), updated_at = NOW()
       WHERE id = $1`,
      [paymentId, providerReference ?? null],
    );
    await client.query(
      `UPDATE tenant_billing_periods
       SET status = 'paid', paid_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [payment.billing_period_id],
    );
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

function buildTxRef(tenantId: string): string {
  return `sms-${tenantId.replace(/-/g, "").slice(0, 12)}-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
}

export async function startCheckout(
  tenantId: string,
  userId: string,
  billingPeriodId: string,
): Promise<{ paymentId: string; checkoutUrl: string; txRef: string }> {
  const status = await getTenantBillingStatus(tenantId);
  if (!status.canPay || !status.currentPeriod || status.currentPeriod.id !== billingPeriodId) {
    throw new HttpError(400, "This billing period is not payable right now.");
  }

  const { rows: userRows } = await query<{ email: string; full_name: string; role: string }>(
    `SELECT email, full_name, role FROM users WHERE id = $1`,
    [userId],
  );
  const user = userRows[0];
  if (!user) throw new HttpError(404, "User not found.");

  const billingPath = user.role === "headteacher" ? "/headteacher/billing" : "/admin/billing";

  const txRef = buildTxRef(tenantId);
  const { rows } = await query<{ id: string }>(
    `INSERT INTO tenant_subscription_payments (
       tenant_id, billing_period_id, amount_ugx, currency, status, provider, tx_ref, initiated_by, metadata
     ) VALUES ($1, $2, $3, $4, 'pending', 'flutterwave', $5, $6, $7::jsonb)
     RETURNING id`,
    [
      tenantId,
      billingPeriodId,
      status.currentPeriod.amountUgx,
      status.currentPeriod.currency,
      txRef,
      userId,
      JSON.stringify({ billingPeriodId }),
    ],
  );
  const paymentId = rows[0]!.id;

  const env = loadEnv();
  const webBase = env.WEB_APP_URL ?? "http://localhost:3000";

  if (env.BILLING_MOCK_PAYMENTS ?? env.NODE_ENV === "development") {
    const mockUrl = `${webBase}${billingPath}?mockPayment=${paymentId}`;
    await query(`UPDATE tenant_subscription_payments SET checkout_url = $2, status = 'processing' WHERE id = $1`, [
      paymentId,
      mockUrl,
    ]);
    return { paymentId, checkoutUrl: mockUrl, txRef };
  }

  const checkout = await initializeFlutterwavePayment({
    txRef,
    amount: status.currentPeriod.amountUgx,
    currency: status.currentPeriod.currency,
    redirectUrl: `${webBase}${billingPath}?status=return&tx_ref=${encodeURIComponent(txRef)}`,
    customer: { email: user.email, name: user.full_name },
    meta: { tenant_id: tenantId, billing_period_id: billingPeriodId, payment_id: paymentId },
  });

  await query(
    `UPDATE tenant_subscription_payments SET checkout_url = $2, status = 'processing' WHERE id = $1`,
    [paymentId, checkout.link],
  );

  return { paymentId, checkoutUrl: checkout.link, txRef };
}

export async function completeMockPayment(paymentId: string, tenantId: string): Promise<void> {
  const env = loadEnv();
  if (!(env.BILLING_MOCK_PAYMENTS ?? env.NODE_ENV === "development")) {
    throw new HttpError(403, "Mock payments are disabled.");
  }
  const { rows } = await query<{ tenant_id: string }>(
    `SELECT tenant_id FROM tenant_subscription_payments WHERE id = $1`,
    [paymentId],
  );
  if (!rows[0] || rows[0].tenant_id !== tenantId) {
    throw new HttpError(404, "Payment not found.");
  }
  await completePayment(paymentId, `mock-${paymentId}`);
}

export async function handleFlutterwaveWebhook(
  headers: Record<string, string | string[] | undefined>,
  body: unknown,
): Promise<void> {
  verifyFlutterwaveWebhook(headers, body);
  const payload = body as {
    event?: string;
    data?: { tx_ref?: string; flw_ref?: string; status?: string; id?: number };
  };
  const eventId = String(payload.data?.id ?? payload.data?.tx_ref ?? crypto.randomUUID());
  const txRef = payload.data?.tx_ref;

  const inserted = await platformQuery(
    `INSERT INTO tenant_payment_webhook_events (provider, event_id, tx_ref, payload)
     VALUES ('flutterwave', $1, $2, $3::jsonb)
     ON CONFLICT (provider, event_id) DO NOTHING
     RETURNING id`,
    [eventId, txRef ?? null, JSON.stringify(payload)],
  );
  if (!inserted.rowCount) return;

  if (payload.event !== "charge.completed" || payload.data?.status !== "successful" || !txRef) {
    return;
  }

  const { rows } = await platformQuery<{ id: string }>(
    `SELECT id FROM tenant_subscription_payments WHERE tx_ref = $1 LIMIT 1`,
    [txRef],
  );
  if (!rows[0]) return;

  await completePayment(rows[0].id, payload.data?.flw_ref ?? undefined);
  await platformQuery(
    `UPDATE tenant_payment_webhook_events SET processed_at = NOW() WHERE provider = 'flutterwave' AND event_id = $1`,
    [eventId],
  );
}

export async function verifyCheckoutReturn(txRef: string, tenantId: string): Promise<TenantBillingStatus> {
  if (!process.env.FLUTTERWAVE_SECRET_KEY?.trim()) {
    return getTenantBillingStatus(tenantId);
  }
  const { rows } = await query<{ id: string; status: string }>(
    `SELECT id, status FROM tenant_subscription_payments WHERE tx_ref = $1 AND tenant_id = $2`,
    [txRef, tenantId],
  );
  const payment = rows[0];
  if (payment && payment.status !== "succeeded") {
    try {
      const res = await fetch(
        `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(txRef)}`,
        { headers: { Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}` } },
      );
      const json = (await res.json()) as { data?: { status?: string } };
      if (json.data?.status === "successful") {
        await completePayment(payment.id);
      }
    } catch {
      /* webhook may arrive first */
    }
  }
  return getTenantBillingStatus(tenantId);
}

export async function listTenantBillingPeriods(tenantId: string) {
  const { rows } = await query<PeriodRow>(
    `SELECT id, tenant_id, label, period_start::text, period_end::text, due_at,
            amount_ugx, currency, status, paid_at, notes
     FROM tenant_billing_periods
     WHERE tenant_id = $1
     ORDER BY period_start DESC`,
    [tenantId],
  );
  return rows.map((r) => ({
    ...mapPeriod(r),
    paidAt: r.paid_at ? new Date(r.paid_at).toISOString() : null,
    notes: r.notes,
  }));
}

export async function listPlatformBillingOverview() {
  const { rows } = await platformQuery<{
    tenant_id: string;
    slug: string;
    display_name: string;
    tenant_status: string;
    period_id: string | null;
    label: string | null;
    due_at: Date | null;
    amount_ugx: string | null;
    period_status: string | null;
  }>(
    `SELECT t.id AS tenant_id, t.slug, t.display_name, t.status AS tenant_status,
            p.id AS period_id, p.label, p.due_at, p.amount_ugx, p.status AS period_status
     FROM tenants t
     LEFT JOIN LATERAL (
       SELECT id, label, due_at, amount_ugx, status
       FROM tenant_billing_periods
       WHERE tenant_id = t.id AND status IN ('pending', 'overdue')
       ORDER BY due_at DESC
       LIMIT 1
     ) p ON TRUE
     ORDER BY t.display_name`,
  );
  return rows.map((r) => ({
    tenantId: r.tenant_id,
    slug: r.slug,
    displayName: r.display_name,
    tenantStatus: r.tenant_status,
    billingPeriod: r.period_id
      ? {
          id: r.period_id,
          label: r.label!,
          dueAt: r.due_at ? new Date(r.due_at).toISOString() : null,
          amountUgx: Number(r.amount_ugx),
          status: r.period_status!,
        }
      : null,
  }));
}

export async function listPaymentHistory(tenantId: string) {
  const { rows } = await query<{
    id: string;
    amount_ugx: string;
    currency: string;
    status: string;
    tx_ref: string;
    paid_at: Date | null;
    created_at: Date;
    label: string;
  }>(
    `SELECT sp.id, sp.amount_ugx, sp.currency, sp.status, sp.tx_ref, sp.paid_at, sp.created_at, bp.label
     FROM tenant_subscription_payments sp
     JOIN tenant_billing_periods bp ON bp.id = sp.billing_period_id
     WHERE sp.tenant_id = $1
     ORDER BY sp.created_at DESC
     LIMIT 50`,
    [tenantId],
  );
  return rows.map((r) => ({
    id: r.id,
    amountUgx: Number(r.amount_ugx),
    currency: r.currency,
    status: r.status,
    txRef: r.tx_ref,
    paidAt: r.paid_at ? new Date(r.paid_at).toISOString() : null,
    createdAt: new Date(r.created_at).toISOString(),
    periodLabel: r.label,
  }));
}
