"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { BursarStudentFinancePanel } from "@/components/fees/BursarStudentFinancePanel";
import { AsyncContent } from "@/components/feedback/AsyncContent";
import { ErrorState } from "@/components/feedback/ErrorState";
import { FormSkeleton } from "@/components/feedback/FormSkeleton";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { StudentAvatar } from "@/components/students/StudentAvatar";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { useEntityDetail } from "@/hooks/useEntityDetail";

type StudentView = {
  id: string;
  studentNumber: string;
  fullName: string;
  guardianName: string;
  guardianContact: string;
  photoUrl: string | null;
  status: string;
  className?: string | null;
  classStream?: string | null;
};

export default function BursarStudentProfilePage() {
  const params = useParams();
  const id = String(params["id"]);
  const studentQ = useEntityDetail<StudentView>("students", id);

  return (
    <PageWrapper title="Student account" description="Fees, invoices, and payment history">
      <div className="mb-4">
        <Link className="text-sm text-brand hover:underline" href="/bursar/students">
          ← Back to students
        </Link>
      </div>
      <AsyncContent
        status={studentQ.status}
        loading={<FormSkeleton fields={6} />}
        error={
          studentQ.notFound ? (
            <ErrorState message="We could not find this student." />
          ) : (
            <ErrorState
              message={studentQ.error instanceof Error ? studentQ.error.message : "Failed to load student."}
              onRetry={() => void studentQ.refetch()}
            />
          )
        }
      >
        {studentQ.data ? (
          <div className="space-y-6">
            <Card title="Student profile">
              <div className="flex flex-wrap items-start gap-4">
                <StudentAvatar fullName={studentQ.data.fullName} photoUrl={studentQ.data.photoUrl} size="lg" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-semibold text-foreground">{studentQ.data.fullName}</h2>
                    <Badge tone={studentQ.data.status === "active" ? "success" : "neutral"}>
                      {studentQ.data.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">#{studentQ.data.studentNumber}</p>
                  {studentQ.data.className ? (
                    <p className="text-sm text-foreground">
                      Class: {studentQ.data.className}
                      {studentQ.data.classStream ? ` · ${studentQ.data.classStream}` : ""}
                    </p>
                  ) : null}
                  <p className="text-sm text-muted-foreground">
                    Guardian: {studentQ.data.guardianName} · {studentQ.data.guardianContact}
                  </p>
                </div>
              </div>
            </Card>
            <BursarStudentFinancePanel
              studentId={studentQ.data.id}
              studentName={studentQ.data.fullName}
            />
          </div>
        ) : null}
      </AsyncContent>
    </PageWrapper>
  );
}
