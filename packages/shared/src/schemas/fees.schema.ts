import { z } from "zod";
import { PAYMENT_METHODS } from "../constants/fees";

export const feeStructureSchema = z.object({
  classId: z.string().uuid(),
  termId: z.string().uuid(),
  category: z.string().min(1).max(100),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/).or(z.number().positive()),
});

export const feeInvoiceSchema = z.object({
  studentId: z.string().uuid(),
  termId: z.string().uuid(),
  totalAmount: z.string().regex(/^\d+(\.\d{1,2})?$/).or(z.number().positive()),
});

export const feePaymentSchema = z
  .object({
    studentId: z.string().uuid(),
    invoiceId: z.string().uuid(),
    amount: z.string().regex(/^\d+(\.\d{1,2})?$/).or(z.number().positive()),
    method: z.enum(PAYMENT_METHODS),
    transactionRef: z.string().max(100).optional().nullable(),
  })
  .strict();

export type FeeStructureInput = z.infer<typeof feeStructureSchema>;
export type FeeInvoiceInput = z.infer<typeof feeInvoiceSchema>;
export type FeePaymentInput = z.infer<typeof feePaymentSchema>;

export const feeBulkInvoiceSchema = z.object({
  classId: z.string().uuid(),
  termId: z.string().uuid(),
});

export type FeeBulkInvoiceInput = z.infer<typeof feeBulkInvoiceSchema>;

export const feeStructurePatchSchema = z.object({
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/).or(z.number().positive()),
  category: z.string().min(1).max(100).optional(),
});

export const feeStructureCopySchema = z.object({
  sourceClassId: z.string().uuid(),
  sourceTermId: z.string().uuid(),
  targetClassId: z.string().uuid(),
  targetTermId: z.string().uuid(),
});

export type FeeStructurePatchInput = z.infer<typeof feeStructurePatchSchema>;
export type FeeStructureCopyInput = z.infer<typeof feeStructureCopySchema>;

export const feeScheduleClassTermSchema = z.object({
  classId: z.string().uuid(),
  termId: z.string().uuid(),
});

export type FeeScheduleClassTermInput = z.infer<typeof feeScheduleClassTermSchema>;
