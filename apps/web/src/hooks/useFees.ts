"use client";

import type {
  BulkInvoicePreview,
  BulkInvoiceResult,
  FeeBalance,
  FeeInvoice,
  FeePayment,
  FeePaymentResult,
  FeeScheduleRelease,
  FeeStructure,
  FeeStructureCopyResult,
  FeeTermReport,
} from "@uganda-cbc-sms/shared";
import {
  feeBulkInvoiceSchema,
  feeInvoiceSchema,
  feePaymentSchema,
  feeScheduleClassTermSchema,
  feeScheduleBulkPublishSchema,
  feeStructureBulkCopySchema,
  feeStructureCopySchema,
  feeStructurePatchSchema,
  feeStructureSchema,
} from "@uganda-cbc-sms/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";
import type { z } from "zod";

export type FeeStructureFilters = {
  classId?: string;
  termId?: string;
};

export type FeeScheduleFilters = FeeStructureFilters;

export const feesKeys = {
  all: ["fees"] as const,
  invoices: (studentId?: string) => ["fees", "invoices", studentId ?? "all"] as const,
  invoice: (id: string) => ["fees", "invoice", id] as const,
  payments: (studentId?: string) => ["fees", "payments", studentId ?? "all"] as const,
  balance: (studentId: string) => ["fees", "balance", studentId] as const,
  report: (termId: string) => ["fees", "report", termId] as const,
  structures: (filters?: FeeStructureFilters) =>
    ["fees", "structures", filters?.classId ?? "", filters?.termId ?? ""] as const,
  schedules: (filters?: FeeScheduleFilters) =>
    ["fees", "schedules", filters?.classId ?? "", filters?.termId ?? ""] as const,
  scheduleSummary: (classId: string, termId: string) =>
    ["fees", "scheduleSummary", classId, termId] as const,
  bulkPreview: (classId: string, termId: string) =>
    ["fees", "bulkPreview", classId, termId] as const,
};

function structureQuery(filters?: FeeStructureFilters): string {
  const p = new URLSearchParams();
  if (filters?.classId) p.set("classId", filters.classId);
  if (filters?.termId) p.set("termId", filters.termId);
  const qs = p.toString();
  return `/fees/structure${qs ? `?${qs}` : ""}`;
}

export function useFeeInvoices(studentId?: string) {
  const qp = studentId ? `?studentId=${encodeURIComponent(studentId)}` : "";
  return useQuery({
    queryKey: feesKeys.invoices(studentId),
    queryFn: () => apiGet<FeeInvoice[]>(`/fees/invoices${qp}`),
    staleTime: 30_000,
  });
}

export function useFeeInvoice(invoiceId: string | undefined) {
  return useQuery({
    queryKey: feesKeys.invoice(invoiceId ?? ""),
    queryFn: () => apiGet<FeeInvoice>(`/fees/invoices/${encodeURIComponent(invoiceId!)}`),
    enabled: Boolean(invoiceId),
  });
}

export function useFeePayments(studentId?: string) {
  const qp = studentId ? `?studentId=${encodeURIComponent(studentId)}` : "";
  return useQuery({
    queryKey: feesKeys.payments(studentId),
    queryFn: () => apiGet<FeePayment[]>(`/fees/payments${qp}`),
    staleTime: 30_000,
  });
}

export function useFeeBalance(studentId: string | undefined) {
  return useQuery({
    queryKey: feesKeys.balance(studentId ?? ""),
    queryFn: () => apiGet<FeeBalance>(`/fees/balance/${encodeURIComponent(studentId!)}`),
    enabled: Boolean(studentId),
  });
}

export function useFeeStructures(filters?: FeeStructureFilters) {
  return useQuery({
    queryKey: feesKeys.structures(filters),
    queryFn: () => apiGet<FeeStructure[]>(structureQuery(filters)),
    staleTime: 60_000,
  });
}

function scheduleQuery(filters?: FeeScheduleFilters): string {
  const p = new URLSearchParams();
  if (filters?.classId) p.set("classId", filters.classId);
  if (filters?.termId) p.set("termId", filters.termId);
  const qs = p.toString();
  return `/fees/schedules${qs ? `?${qs}` : ""}`;
}

export function useFeeScheduleReleases(filters?: FeeScheduleFilters) {
  return useQuery({
    queryKey: feesKeys.schedules(filters),
    queryFn: () => apiGet<FeeScheduleRelease[]>(scheduleQuery(filters)),
    staleTime: 30_000,
  });
}

export function useFeeScheduleSummary(classId: string | undefined, termId: string | undefined) {
  return useQuery({
    queryKey: feesKeys.scheduleSummary(classId ?? "", termId ?? ""),
    queryFn: () =>
      apiGet<FeeScheduleRelease>(
        `/fees/schedules/summary?classId=${encodeURIComponent(classId!)}&termId=${encodeURIComponent(termId!)}`,
      ),
    enabled: Boolean(classId && termId),
    staleTime: 15_000,
  });
}

export function useFeeTermReport(termId: string | undefined) {
  return useQuery({
    queryKey: feesKeys.report(termId ?? ""),
    queryFn: () => apiGet<FeeTermReport>(`/fees/reports?termId=${encodeURIComponent(termId!)}`),
    enabled: Boolean(termId),
  });
}

export function useFeeActions() {
  const qc = useQueryClient();

  const invalidateFinance = async (studentId?: string) => {
    await qc.invalidateQueries({ queryKey: feesKeys.all });
    await qc.invalidateQueries({ queryKey: ["dashboard-kpis"] });
    if (studentId) {
      await qc.invalidateQueries({ queryKey: feesKeys.balance(studentId) });
      await qc.invalidateQueries({ queryKey: feesKeys.invoices(studentId) });
      await qc.invalidateQueries({ queryKey: feesKeys.payments(studentId) });
    }
  };

  const invalidateStructures = async () => {
    await qc.invalidateQueries({ queryKey: ["fees", "structures"] });
    await qc.invalidateQueries({ queryKey: ["fees", "schedules"] });
    await qc.invalidateQueries({ queryKey: ["fees", "scheduleSummary"] });
    await qc.invalidateQueries({ queryKey: ["fees", "bulkPreview"] });
  };

  const createInvoice = useMutation({
    mutationFn: (body: z.infer<typeof feeInvoiceSchema>) =>
      apiPost<FeeInvoice>("/fees/invoices", body),
    onSuccess: (_d, vars) => void invalidateFinance(vars.studentId),
  });

  const bulkInvoices = useMutation({
    mutationFn: (body: z.infer<typeof feeBulkInvoiceSchema>) =>
      apiPost<BulkInvoiceResult>("/fees/invoices/bulk", body),
    onSuccess: async () => {
      await invalidateFinance();
      await invalidateStructures();
    },
  });

  const recordPayment = useMutation({
    mutationFn: (body: z.infer<typeof feePaymentSchema>) =>
      apiPost<FeePaymentResult>("/fees/payments", body),
    onSuccess: (_d, vars) => void invalidateFinance(vars.studentId),
  });

  const createStructure = useMutation({
    mutationFn: (body: z.infer<typeof feeStructureSchema>) =>
      apiPost<FeeStructure>("/fees/structure", body),
    onSuccess: () => void invalidateStructures(),
  });

  const updateStructure = useMutation({
    mutationFn: ({
      structureId,
      body,
    }: {
      structureId: string;
      body: z.infer<typeof feeStructurePatchSchema>;
    }) => apiPatch<FeeStructure>(`/fees/structure/${encodeURIComponent(structureId)}`, body),
    onSuccess: () => void invalidateStructures(),
  });

  const deleteStructure = useMutation({
    mutationFn: (structureId: string) =>
      apiDelete<null>(`/fees/structure/${encodeURIComponent(structureId)}`),
    onSuccess: () => void invalidateStructures(),
  });

  const copyStructure = useMutation({
    mutationFn: (body: z.infer<typeof feeStructureCopySchema>) =>
      apiPost<FeeStructureCopyResult>("/fees/structure/copy", body),
    onSuccess: () => void invalidateStructures(),
  });

  const bulkCopyStructure = useMutation({
    mutationFn: (body: z.infer<typeof feeStructureBulkCopySchema>) =>
      apiPost<{
        totalCreated: number;
        totalSkipped: number;
        targets: Array<{ classId: string; created: number; skipped: number }>;
        targetTermId: string;
      }>("/fees/structure/copy/bulk", body),
    onSuccess: () => void invalidateStructures(),
  });

  const publishSchedule = useMutation({
    mutationFn: (body: z.infer<typeof feeScheduleClassTermSchema>) =>
      apiPost<FeeScheduleRelease>("/fees/schedules/publish", body),
    onSuccess: () => void invalidateStructures(),
  });

  const bulkPublishSchedules = useMutation({
    mutationFn: (body: z.infer<typeof feeScheduleBulkPublishSchema>) =>
      apiPost<{
        publishedCount: number;
        published: string[];
        errors: Array<{ classId: string; message: string }>;
      }>("/fees/schedules/publish/bulk", body),
    onSuccess: () => void invalidateStructures(),
  });

  const unpublishSchedule = useMutation({
    mutationFn: (body: z.infer<typeof feeScheduleClassTermSchema>) =>
      apiPost<FeeScheduleRelease>("/fees/schedules/unpublish", body),
    onSuccess: () => void invalidateStructures(),
  });

  const previewBulkInvoices = useMutation({
    mutationFn: (body: z.infer<typeof feeScheduleClassTermSchema>) =>
      apiPost<BulkInvoicePreview>("/fees/invoices/bulk/preview", body),
  });

  return {
    createInvoice,
    bulkInvoices,
    recordPayment,
    createStructure,
    updateStructure,
    deleteStructure,
    copyStructure,
    bulkCopyStructure,
    publishSchedule,
    bulkPublishSchedules,
    unpublishSchedule,
    previewBulkInvoices,
    invalidateFinance,
    invalidateStructures,
  };
}
