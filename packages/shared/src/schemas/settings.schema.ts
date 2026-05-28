import { z } from "zod";

const HEX_COLOR = /^#([0-9A-Fa-f]{6})$/;

const optionalTrimmed = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null));

const optionalUrl = z
  .string()
  .trim()
  .url("Enter a valid URL")
  .max(500)
  .optional()
  .transform((value) => (value && value.length > 0 ? value : null));

const optionalEmail = z
  .string()
  .trim()
  .email("Enter a valid email")
  .max(160)
  .optional()
  .transform((value) => (value && value.length > 0 ? value : null));

const optionalHexColor = z
  .string()
  .trim()
  .regex(HEX_COLOR, "Use a valid hex color like #1E40AF")
  .optional()
  .transform((value) => (value && value.length > 0 ? value.toUpperCase() : null));

export const updateSchoolSettingsSchema = z.object({
  schoolName: z.string().trim().min(2).max(140),
  motto: optionalTrimmed(180),
  vision: optionalTrimmed(600),
  mission: optionalTrimmed(1200),
  logoUrl: optionalUrl,
  contactEmail: optionalEmail,
  contactPhone: optionalTrimmed(40),
  websiteUrl: optionalUrl,
  postalAddress: optionalTrimmed(300),
  physicalAddress: optionalTrimmed(300),
  primaryColor: optionalHexColor,
  secondaryColor: optionalHexColor,
  reportFooterText: optionalTrimmed(280),
});

export type UpdateSchoolSettingsInput = z.infer<typeof updateSchoolSettingsSchema>;

export type SchoolSettings = UpdateSchoolSettingsInput & {
  updatedAt: string;
};
