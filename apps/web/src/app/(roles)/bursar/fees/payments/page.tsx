"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { PaymentForm } from "@/components/fees/PaymentForm";
import { StudentSearchPicker, type PickedStudent } from "@/components/fees/StudentSearchPicker";
import { Alert } from "@/components/ui/Alert";
import { Card } from "@/components/ui/Card";
import { apiGet } from "@/lib/api";
import type { FeeInvoice } from "@uganda-cbc-sms/shared";

export default function BursarRecordPaymentPage() {
  const searchParams = useSearchParams();
  const presetStudentId = searchParams.get("studentId");
  const presetInvoiceId = searchParams.get("invoiceId");

  const [student, setStudent] = useState<PickedStudent | null>(null);
  const [loadingPreset, setLoadingPreset] = useState(Boolean(presetStudentId));

  useEffect(() => {
    if (!presetStudentId) {
      setLoadingPreset(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const inv = await apiGet<FeeInvoice[]>(`/fees/invoices?studentId=${encodeURIComponent(presetStudentId)}`);
        const first = inv[0];
        if (!cancelled) {
          setStudent({
            id: presetStudentId,
            fullName: first?.studentName ?? "Student",
            studentNumber: first?.studentNumber ?? "",
          });
        }
      } catch {
        if (!cancelled) {
          setStudent({
            id: presetStudentId,
            fullName: "Student",
            studentNumber: "",
          });
        }
      } finally {
        if (!cancelled) setLoadingPreset(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [presetStudentId]);

  return (
    <div className="space-y-6">
      {presetStudentId && !loadingPreset ? (
        <Alert tone="info">
          Collecting payment for <strong>{student?.fullName ?? "selected student"}</strong>.{" "}
          <Link className="font-medium text-brand underline" href="/bursar/fees/payments">
            Choose a different student
          </Link>
        </Alert>
      ) : null}

      <Card title="Find student">
        <p className="mb-3 text-sm text-muted-foreground">
          Search by name or student number, then record cash or mobile money against an open invoice.
        </p>
        <StudentSearchPicker selected={student} onSelect={setStudent} />
      </Card>

      {loadingPreset ? (
        <p className="text-sm text-muted-foreground">Loading student…</p>
      ) : student ? (
        <Card title={`Record payment — ${student.fullName}`}>
          <PaymentForm
            studentId={student.id}
            studentName={student.fullName}
            defaultInvoiceId={presetInvoiceId ?? undefined}
          />
        </Card>
      ) : (
        <Alert tone="info">Select a student above to see their open invoices and record a payment.</Alert>
      )}
    </div>
  );
}
