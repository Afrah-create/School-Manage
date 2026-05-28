"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { feeInvoiceSchema } from "@uganda-cbc-sms/shared";
import type { Term } from "@uganda-cbc-sms/shared";
import type { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { StudentSearchPicker, type PickedStudent } from "@/components/fees/StudentSearchPicker";
import { useFeeActions, useFeeStructures } from "@/hooks/useFees";
import { apiGet } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api";
import { formatUgx } from "@/lib/formatMoney";
import { toast } from "@/lib/toast";

type Form = z.infer<typeof feeInvoiceSchema>;

type StudentDetail = {
  id: string;
  classId?: string | null;
};

function termLabel(t: Term) {
  return `Term ${t.termNumber}`;
}

export function InvoiceCreateForm({ onCreated }: { onCreated?: () => void }) {
  const [student, setStudent] = useState<PickedStudent | null>(null);
  const [studentClassId, setStudentClassId] = useState<string | null>(null);

  const termsQ = useQuery({
    queryKey: ["terms"],
    queryFn: () => apiGet<Term[]>("/academic/terms"),
  });
  const actions = useFeeActions();

  const form = useForm<Form>({
    resolver: zodResolver(feeInvoiceSchema),
    defaultValues: { totalAmount: "" },
  });

  const termId = form.watch("termId");

  const structureQ = useFeeStructures(
    studentClassId && termId ? { classId: studentClassId, termId } : undefined,
  );

  const structureTotal = useMemo(
    () => (structureQ.data ?? []).reduce((s, r) => s + Number(r.amount), 0),
    [structureQ.data],
  );

  const termOptions = useMemo(
    () =>
      (termsQ.data ?? []).map((t) => ({
        value: t.id,
        label: termLabel(t),
      })),
    [termsQ.data],
  );

  useEffect(() => {
    if (!student) {
      setStudentClassId(null);
      return;
    }
    void (async () => {
      try {
        const detail = await apiGet<StudentDetail>(`/students/${encodeURIComponent(student.id)}`);
        setStudentClassId(detail.classId ?? null);
      } catch {
        setStudentClassId(null);
      }
    })();
  }, [student]);

  const applyStructureTotal = () => {
    if (structureTotal > 0) {
      form.setValue("totalAmount", String(Math.round(structureTotal)));
    }
  };

  const onSubmit = async (values: Form) => {
    if (!student) {
      toast.error("Select a student first.", "Missing student");
      return;
    }
    try {
      await actions.createInvoice.mutateAsync({
        studentId: student.id,
        termId: values.termId,
        totalAmount: String(values.totalAmount),
      });
      toast.success(`Invoice created for ${student.fullName}.`, "Invoice saved");
      form.reset({ totalAmount: "", termId: values.termId });
      setStudent(null);
      onCreated?.();
    } catch (e) {
      toast.error(getApiErrorMessage(e), "Could not create invoice");
    }
  };

  return (
    <form className="max-w-lg space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
      <StudentSearchPicker selected={student} onSelect={setStudent} />
      <Select
        label="Term"
        options={[{ value: "", label: termsQ.isLoading ? "Loading terms…" : "Select term" }, ...termOptions]}
        {...form.register("termId")}
        error={form.formState.errors.termId?.message}
      />
      {student && termId && structureTotal > 0 ? (
        <Alert tone="info">
          Official fee schedule total for this class/term:{" "}
          <strong className="tabular-nums">{formatUgx(structureTotal)} UGX</strong> (
          {structureQ.data?.length ?? 0} categories).{" "}
          <button type="button" className="font-medium text-brand underline" onClick={applyStructureTotal}>
            Use this amount
          </button>
          {" · "}
          <Link className="text-brand underline" href="/bursar/fees/schedules">
            View schedules
          </Link>
        </Alert>
      ) : student && termId && !structureQ.isLoading && structureTotal <= 0 ? (
        <Alert tone="info">
          No fee schedule is configured for this student&apos;s class and term. Enter an amount manually or ask
          an administrator to set up{" "}
          <Link className="text-brand underline" href="/bursar/fees/schedules">
            fee schedules
          </Link>
          .
        </Alert>
      ) : null}
      <Input
        label="Total amount (UGX)"
        type="number"
        min={1}
        step={1}
        {...form.register("totalAmount")}
        error={form.formState.errors.totalAmount?.message}
      />
      <Button type="submit" loading={actions.createInvoice.isPending} disabled={!student}>
        Create invoice
      </Button>
    </form>
  );
}
