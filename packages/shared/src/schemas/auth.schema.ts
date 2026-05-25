import { z } from "zod";
import { ROLES } from "../constants/roles";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

export const requestOtpSchema = z.object({
  email: z.string().email(),
});

export const verifyOtpSchema = z.object({
  email: z.string().email(),
  code: z.string().regex(/^\d{6}$/, "Code must be 6 digits"),
});

export const resetPasswordWithOtpSchema = z.object({
  email: z.string().email(),
  code: z.string().regex(/^\d{6}$/, "Code must be 6 digits"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

export const createUserSchema = z.object({
  fullName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(ROLES),
});

export const updateUserSchema = z
  .object({
    fullName: z.string().min(1).optional(),
    email: z.string().email().optional(),
    role: z.enum(ROLES).optional(),
    isActive: z.boolean().optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, {
    message: "At least one field is required",
  });

/** Self-service profile update (no role or status changes). */
export const updateProfileSchema = z
  .object({
    fullName: z.string().min(1).max(255).optional(),
    email: z.string().email().optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, {
    message: "At least one field is required",
  });

export const resetPasswordSchema = z.object({
  newPassword: z.string().min(8),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type RequestOtpInput = z.infer<typeof requestOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type ResetPasswordWithOtpInput = z.infer<typeof resetPasswordWithOtpSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
