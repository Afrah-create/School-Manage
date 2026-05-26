"use client";

import { PageWrapper } from "@/components/layout/PageWrapper";
import { TeacherAlevelEntryPanel } from "@/components/assessment/TeacherAlevelEntryPanel";

export default function SubjectTeacherAlevelEntryPage() {
  return (
    <PageWrapper title="A-Level score entry" description="Enter UNEB scores (0–100), then submit to lock">
      <TeacherAlevelEntryPanel />
    </PageWrapper>
  );
}
