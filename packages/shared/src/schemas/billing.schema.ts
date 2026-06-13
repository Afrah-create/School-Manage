import { z } from "zod";

export const billingPeriodStatusSchema = z.enum(["pending", "paid", "overdue", "waived"]);
export const billingAccessStatusSchema = z.enum(["current", "grace", "past_due", "none"]);
export const subscriptionPaymentStatusSchema = z.enum([
  "pending",
  "processing",
  "succeeded",
  "failed",
  "cancelled",
]);

export const tenantBillingStatusSchema = z.object({
  accessStatus: billingAccessStatusSchema,
  canUseApp: z.boolean(),
  canPay: z.boolean(),
  graceDays: z.number().int().min(0),
  currentPeriod: z
    .object({
      id: z.string().uuid(),
      label: z.string(),
      amountUgx: z.number().int().positive(),
      currency: z.string(),
      dueAt: z.string(),
      periodStart: z.string(),
      periodEnd: z.string(),
      status: billingPeriodStatusSchema,
    })
    .nullable(),
  message: z.string().nullable(),
});

export const createBillingPeriodSchema = z.object({
  tenantId: z.string().uuid(),
  label: z.string().min(2).max(120),
  periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dueAt: z.string().datetime({ offset: true }).or(z.string().min(10)),
  amountUgx: z.number().int().positive().optional(),
  notes: z.string().max(500).optional(),
});

export const updateBillingPeriodSchema = z.object({
  status: z.enum(["paid", "waived", "pending", "overdue"]).optional(),
  notes: z.string().max(500).optional(),
  dueAt: z.string().datetime({ offset: true }).optional(),
});

export const billingCheckoutSchema = z.object({
  billingPeriodId: z.string().uuid(),
});

export const platformBillingSettingsSchema = z.object({
  defaultAmountUgx: z.number().int().positive(),
  currency: z.string().length(3),
  graceDays: z.number().int().min(0).max(90),
});

export type TenantBillingStatus = z.infer<typeof tenantBillingStatusSchema>;
export type CreateBillingPeriodInput = z.infer<typeof createBillingPeriodSchema>;
export type UpdateBillingPeriodInput = z.infer<typeof updateBillingPeriodSchema>;
