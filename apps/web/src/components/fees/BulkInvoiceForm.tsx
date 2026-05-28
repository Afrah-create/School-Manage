"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { feeBulkInvoiceSchema } from "@uganda-cbc-sms/shared";
import type { AcademicYear, Term } from "@uganda-cbc-sms/shared";
import type { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { useClassEnrollmentSummary } from "@/hooks/useStudentsBrowse";
import { useFeeActions, useFeeStructures } from "@/hooks/useFees";
import { apiGet } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api";
import { formatUgx } from "@/lib/formatMoney";
import { toast } from "@/lib/toast";

type Form = z.infer<typeof feeBulkInvoiceSchema>;

export function BulkInvoiceForm({ onDone }: { onDone?: () => void }) {
  const summaryQ = useClassEnrollmentSummary();
  const actions = useFeeActions();
  const [yearId, setYearId] = useState("");

  const yearsQ = useQuery({
    queryKey: ["academic-years"],
    queryFn: () => apiGet<AcademicYear[]>("/academic/years"),
  });
  const termsQ = useQuery({
    queryKey: ["terms", yearId],
    queryFn: () => apiGet<Term[]>(`/academic/terms?academicYearId=${encodeURIComponent(yearId)}`),
    enabled: Boolean(yearId),
  });

  const form = useForm<Form>({
    resolver: zodResolver(feeBulkInvoiceSchema),
  });

  const classId = form.watch("classId");
  const termId = form.watch("termId");

  const structureQ = useFeeStructures(
    classId && termId ? { classId, termId } : undefined,
  );

  const structureTotal = useMemo(
    () => (structureQ.data ?? []).reduce((s, r) => s + Number(r.amount), 0),
    [structureQ.data],
  );

  const classOptions = useMemo(
    () =>
      (summaryQ.data ?? []).map((c) => ({
        value: c.classId,
        label: c.classStream
          ? `${c.className} · ${c.classStream} (${c.activeCount} students)`
          : `${c.className} (${c.activeCount})`,
      })),
    [summaryQ.data],
  );

  const yearOptions = useMemo(
    () => [
      { value: "", label: "Select year" },
      ...(yearsQ.data ?? []).map((y) => ({ value: y.id, label: y.name })),
    ],
    [yearsQ.data],
  );

  const termOptions = useMemo(
    () => [
      { value: "", label: yearId ? "Select term" : "Select year first" },
      ...(termsQ.data ?? []).map((t) => ({ value: t.id, label: `Term ${t.termNumber}` })),
    ],
    [termsQ.data, yearId],
  );

  const classLabel = classOptions.find((o) => o.value === classId)?.label ?? "this class";
  const termLabel = termOptions.find((o) => o.value === termId)?.label ?? "this term";

  const onSubmit = async (values: Form) => {
    if (structureTotal <= 0) {
      toast.error(
        "No fee schedule exists for this class and term. Ask an administrator to configure it first.",
        "Cannot bill class",
      );
      return;
    }

    toast.confirm({
      title: "Bill entire class?",
      description: `Create invoices for all active students in ${classLabel} (${termLabel}) at ${formatUgx(structureTotal)} UGX each? Students who already have an invoice will be skipped.`,
      confirmLabel: "Generate invoices",
      onConfirm: async () => {
        try {
          const result = await actions.bulkInvoices.mutateAsync(values);
          toast.success(
            result.created === 0
              ? `No new invoices (${result.skipped} already billed).`
              : `Created ${result.created} invoice${result.created === 1 ? "" : "s"} at ${formatUgx(result.totalAmount)} UGX each${result.skipped ? `; ${result.skipped} skipped.` : "."}`,
            "Billing complete",
          );
          form.reset();
          setYearId("");
          onDone?.();
        } catch (e) {
          toast.error(getApiErrorMessage(e), "Could not bill class");
        }
      },
    });
  };

  return (
    <form className="max-w-lg space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
      <p className="text-sm text-muted-foreground">
        Bill every active student using the administrator&apos;s fee schedule (sum of all categories).{" "}
        <Link className="text-brand underline" href="/bursar/fees/schedules">
          View fee schedules
        </Link>
        .
      </p>
      <Select
        label="Academic year"
        options={yearOptions}
        value={yearId}
        onChange={(e) => {
          setYearId(e.target.value);
          form.setValue("termId", "");
        }}
      />
      <Select
        label="Term"
        options={termOptions}
        {...form.register("termId")}
        error={form.formState.errors.termId?.message}
      />
      <Select
        label="Class"
        options={[{ value: "", label: "Select class" }, ...classOptions]}
        {...form.register("classId")}
        error={form.formState.errors.classId?.message}
      />
      {classId && termId ? (
        structureQ.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading fee schedule…</p>
        ) : structureTotal > 0 ? (
          <Alert tone="info">
            Schedule total: <strong className="tabular-nums">{formatUgx(structureTotal)} UGX</strong> per
            student ({structureQ.data?.length ?? 0} categories).
          </Alert>
        ) : (
          <Alert tone="info">
            No fee schedule for this class and term.{" "}
            <Link className="font-medium text-brand underline" href="/bursar/fees/schedules">
              Check schedules
            </Link>{" "}
            or contact an administrator.
          </Alert>
        )
      ) : null}
      <Button
        type="submit"
        loading={actions.bulkInvoices.isPending}
        disabled={!classId || !termId || structureTotal <= 0}
      >
        Generate class invoices
      </Button>
    </form>
  );
}
