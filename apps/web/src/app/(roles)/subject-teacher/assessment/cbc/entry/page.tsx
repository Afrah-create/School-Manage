"use client";

import { PageWrapper } from "@/components/layout/PageWrapper";
import { TeacherCbcEntryPanel } from "@/components/assessment/TeacherCbcEntryPanel";

export default function SubjectTeacherCbcEntryPage() {
  return (
    <PageWrapper
      title="Competency entry"
      description="Create assessment activities, enter NCDC competency levels, and record learning outcomes."
    >
      <TeacherCbcEntryPanel />
    </PageWrapper>
  );
}
