"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { EnrolmentForm } from "@/components/students/EnrolmentForm";
import { Card } from "@/components/ui/Card";

export default function AdminEnrolPage() {
  const router = useRouter();
  const qc = useQueryClient();

  return (
    <PageWrapper
      title="Enrol student"
      description="Register a new learner for the active academic year"
    >
      <div className="mx-auto max-w-3xl space-y-6">
        <Link
          href="/admin/students"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-ui hover:text-foreground"
        >
          <span aria-hidden>←</span>
          Back to students
        </Link>

        <Card>
          <p className="text-sm text-muted-foreground">
            After enrolment you can configure exam paper entries, assessments, and report cards from the
            student profile and class tools.
          </p>
        </Card>

        <EnrolmentForm
          onCancel={() => router.push("/admin/students")}
          onCreated={(id) => {
            void qc.invalidateQueries({ queryKey: ["students"] });
            router.push(`/admin/students/${id}?created=1`);
          }}
        />
      </div>
    </PageWrapper>
  );
}
