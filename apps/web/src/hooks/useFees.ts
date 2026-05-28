"use client";

import type {
  BulkInvoiceResult,
  FeeBalance,
  FeeInvoice,
  FeePayment,
  FeePaymentResult,
  FeeStructure,
  FeeStructureCopyResult,
  FeeTermReport,
} from "@uganda-cbc-sms/shared";
import {
  feeBulkInvoiceSchema,
  feeInvoiceSchema,
  feePaymentSchema,
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

export const feesKeys = {
  all: ["fees"] as const,
  invoices: (studentId?: string) => ["fees", "invoices", studentId ?? "all"] as const,
  invoice: (id: string) => ["fees", "invoice", id] as const,
  payments: (studentId?: string) => ["fees", "payments", studentId ?? "all"] as const,
  balance: (studentId: string) => ["fees", "balance", studentId] as const,
  report: (termId: string) => ["fees", "report", termId] as const,
  structures: (filters?: FeeStructureFilters) =>
    ["fees", "structures", filters?.classId ?? "", filters?.termId ?? ""] as const,
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
  };

  const createInvoice = useMutation({
    mutationFn: (body: z.infer<typeof feeInvoiceSchema>) =>
      apiPost<FeeInvoice>("/fees/invoices", body),
    onSuccess: (_d, vars) => void invalidateFinance(vars.studentId),
  });

  const bulkInvoices = useMutation({
    mutationFn: (body: z.infer<typeof feeBulkInvoiceSchema>) =>
      apiPost<BulkInvoiceResult>("/fees/invoices/bulk", body),
    onSuccess: () => void invalidateFinance(),
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

  return {
    createInvoice,
    bulkInvoices,
    recordPayment,
    createStructure,
    updateStructure,
    deleteStructure,
    copyStructure,
    invalidateFinance,
    invalidateStructures,
  };
}
