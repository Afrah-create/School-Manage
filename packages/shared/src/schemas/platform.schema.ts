import { z } from "zod";

const slugRegex = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

export const platformLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const createTenantSchema = z.object({
  slug: z
    .string()
    .min(2)
    .max(63)
    .regex(slugRegex, "Slug must be lowercase alphanumeric with optional hyphens"),
  displayName: z.string().min(2).max(140),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(8).max(128),
  adminFullName: z.string().min(2).max(255).optional(),
});

export const updateTenantSchema = z.object({
  displayName: z.string().min(2).max(140).optional(),
  status: z.enum(["active", "suspended", "provisioning"]).optional(),
  featureFlags: z.record(z.boolean()).optional(),
});

export type PlatformLoginInput = z.infer<typeof platformLoginSchema>;
export type CreateTenantInput = z.infer<typeof createTenantSchema>;
export type UpdateTenantInput = z.infer<typeof updateTenantSchema>;
