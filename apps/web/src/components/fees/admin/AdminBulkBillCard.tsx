"use client";

import { useMemo, useState } from "react";
import type { AcademicYear, SchoolClass, Term } from "@uganda-cbc-sms/shared";
import { useQuery } from "@tanstack/react-query";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { useFeeActions, useFeeStructures } from "@/hooks/useFees";
import { apiGet } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api";
import { formatUgx } from "@/lib/formatMoney";
import { toast } from "@/lib/toast";

export function AdminBulkBillCard() {
  const actions = useFeeActions();
  const [yearId, setYearId] = useState("");
  const [termId, setTermId] = useState("");
  const [classId, setClassId] = useState("");

  const yearsQ = useQuery({
    queryKey: ["academic-years"],
    queryFn: () => apiGet<AcademicYear[]>("/academic/years"),
  });
  const termsQ = useQuery({
    queryKey: ["terms", yearId],
    queryFn: () => apiGet<Term[]>(`/academic/terms?academicYearId=${encodeURIComponent(yearId)}`),
    enabled: Boolean(yearId),
  });
  const classesQ = useQuery({
    queryKey: ["academic-classes"],
    queryFn: () => apiGet<SchoolClass[]>("/academic/classes"),
  });

  const structureQ = useFeeStructures(
    classId && termId ? { classId, termId } : undefined,
  );

  const structureTotal = useMemo(
    () => (structureQ.data ?? []).reduce((s, r) => s + Number(r.amount), 0),
    [structureQ.data],
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
  const classOptions = useMemo(
    () => [
      { value: "", label: "Select class" },
      ...(classesQ.data ?? []).map((c) => ({
        value: c.id,
        label: c.stream ? `${c.name} · ${c.stream}` : c.name,
      })),
    ],
    [classesQ.data],
  );

  const classLabel = classOptions.find((o) => o.value === classId)?.label ?? "this class";
  const termLabel = termOptions.find((o) => o.value === termId)?.label ?? "this term";
  const canBill = Boolean(classId && termId && structureTotal > 0);

  const runBill = () => {
    if (!canBill) return;
    toast.confirm({
      title: "Bill entire class?",
      description: `Create term invoices for all active students in ${classLabel} (${termLabel}) at ${formatUgx(structureTotal)} UGX each? Students who already have an invoice will be skipped.`,
      confirmLabel: "Generate invoices",
      onConfirm: async () => {
        try {
          const result = await actions.bulkInvoices.mutateAsync({ classId, termId });
          toast.success(
            result.created === 0
              ? `No new invoices (${result.skipped} already billed).`
              : `Created ${result.created} invoice${result.created === 1 ? "" : "s"} at ${formatUgx(result.totalAmount)} UGX each.`,
            "Billing complete",
          );
          await actions.invalidateFinance();
        } catch (e) {
          toast.error(getApiErrorMessage(e), "Could not bill class");
        }
      },
    });
  };

  return (
    <Card title="Generate class invoices">
      <p className="mb-3 text-sm text-muted-foreground">
        After fee structure is set, bill all active students in a class for a term. Bursars can also do this from
        their invoices page.
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        <Select label="Year" options={yearOptions} value={yearId} onChange={(e) => {
          setYearId(e.target.value);
          setTermId("");
        }} />
        <Select label="Term" options={termOptions} value={termId} onChange={(e) => setTermId(e.target.value)} />
        <Select label="Class" options={classOptions} value={classId} onChange={(e) => setClassId(e.target.value)} />
      </div>
      {classId && termId ? (
        structureQ.isLoading ? (
          <p className="mt-3 text-sm text-muted-foreground">Checking fee structure…</p>
        ) : structureTotal <= 0 ? (
          <div className="mt-3">
            <Alert tone="info">Add at least one fee category for this class and term before billing.</Alert>
          </div>
        ) : (
          <p className="mt-3 text-sm text-foreground">
            Structure total: <strong className="tabular-nums">{formatUgx(structureTotal)} UGX</strong> per student
            ({structureQ.data?.length ?? 0} categories).
          </p>
        )
      ) : null}
      <div className="mt-4">
        <Button disabled={!canBill} loading={actions.bulkInvoices.isPending} onClick={runBill}>
          Bill class
        </Button>
      </div>
    </Card>
  );
}
