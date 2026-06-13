import { z } from "zod";
import { academicYearSchema } from "./assessment.schema";

export const structureClassTemplateSchema = z.enum([
  "O_LEVEL_S1_S4",
  "A_LEVEL_S5_S6",
  "BOTH",
  "NONE",
]);

export const structureSetupSchema = z.object({
  /** Existing year or inline create. */
  academicYearId: z.string().uuid().optional(),
  createYear: academicYearSchema.optional(),
  activateYear: z.boolean().optional().default(true),
  installTerms: z.boolean().optional().default(true),
  classTemplate: structureClassTemplateSchema.optional().default("BOTH"),
  oLevelStreams: z.array(z.string().min(1).max(20)).min(1).max(6).optional().default(["Main"]),
  aLevelStreams: z.array(z.string().min(1).max(20)).min(1).max(6).optional().default(["Main"]),
}).refine((v) => Boolean(v.academicYearId || v.createYear), {
  message: "Provide academicYearId or createYear",
});

export type StructureSetupInput = z.infer<typeof structureSetupSchema>;

export type StructureStatus = {
  academicYearId: string | null;
  terms: number;
  oLevelClasses: number;
  aLevelClasses: number;
  termsComplete: boolean;
  classesComplete: boolean;
};

export type StructureSetupResult = {
  academicYearId: string;
  termsCreated: number;
  classesCreated: number;
  activatedYear: boolean;
};
