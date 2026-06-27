"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AcademicSetupStatusPanel } from "@/components/academic/AcademicSetupStatusPanel";
import { PageWrapper } from "@/components/layout/PageWrapper";

export default function AdminAcademicSetupPage() {
  const searchParams = useSearchParams();
  const initialYearId = searchParams.get("academicYearId") ?? "";

  return (
    <PageWrapper
      title="Setup status"
      description="Track academic-year readiness for competency assessment and CA grading — guidance only, nothing is locked."
    >
      <Link href="/admin/academic" className="mb-4 inline-block text-sm font-medium text-brand hover:underline">
        ← Academic overview
      </Link>
      <AcademicSetupStatusPanel initialYearId={initialYearId} />
    </PageWrapper>
  );
}
