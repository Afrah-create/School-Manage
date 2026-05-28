"use client";

import { useState } from "react";
import { PaymentForm } from "@/components/fees/PaymentForm";
import { StudentSearchPicker, type PickedStudent } from "@/components/fees/StudentSearchPicker";
import { Card } from "@/components/ui/Card";

export default function BursarRecordPaymentPage() {
  const [student, setStudent] = useState<PickedStudent | null>(null);

  return (
    <div className="space-y-6">
      <Card title="Find student">
        <StudentSearchPicker selected={student} onSelect={setStudent} />
      </Card>
      {student ? (
        <Card title={`Record payment — ${student.fullName}`}>
          <PaymentForm studentId={student.id} studentName={student.fullName} />
        </Card>
      ) : null}
    </div>
  );
}
