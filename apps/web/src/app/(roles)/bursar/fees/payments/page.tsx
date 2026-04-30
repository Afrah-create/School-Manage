"use client";

import { useState } from "react";
import { PaymentForm } from "@/components/fees/PaymentForm";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function BursarRecordPaymentPage() {
  const [studentId, setStudentId] = useState("");

  return (
    <PageWrapper title="Record payment" description="Enter student UUID then apply payment">
      <Card title="Student">
        <div className="mb-4 flex max-w-md flex-wrap items-end gap-2">
          <Input label="Student ID (UUID)" value={studentId} onChange={(e) => setStudentId(e.target.value)} />
          <Button type="button" variant="secondary" onClick={() => setStudentId("")}>
            Clear
          </Button>
        </div>
        {studentId ? <PaymentForm studentId={studentId} /> : <p className="text-sm text-slate-600">Enter a student ID.</p>}
      </Card>
    </PageWrapper>
  );
}
