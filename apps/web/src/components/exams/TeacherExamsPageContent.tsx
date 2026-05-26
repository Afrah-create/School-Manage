"use client";

import Link from "next/link";
import { TeacherExamMarkingList } from "@/components/exams/TeacherExamMarkingList";
import { Card } from "@/components/ui/Card";
import { useExamMarkingSlots } from "@/hooks/useExams";

export function TeacherExamsPageContent({
  roleBase,
}: {
  roleBase: "/subject-teacher" | "/class-teacher";
}) {
  const slotsQ = useExamMarkingSlots();
  const openCount = slotsQ.data?.filter((s) => s.canEdit).length ?? 0;

  return (
    <div className="space-y-4">
      <Card>
        <p className="text-sm text-muted-foreground">
          Each row is one <strong className="text-foreground">open formal exam</strong> paper for a class–subject
          you teach on the timetable. Enter scores, then submit to lock your paper. Term CBC competencies are
          entered separately under{" "}
          <Link href={`${roleBase}/assessment/cbc`} className="font-medium text-brand hover:underline">
            CBC Assessment
          </Link>
          ; A-Level term scores under{" "}
          <Link href={`${roleBase}/assessment/alevel`} className="font-medium text-brand hover:underline">
            A-Level Assessment
          </Link>
          .
        </p>
        {slotsQ.isSuccess && openCount > 0 ? (
          <p className="mt-2 text-sm font-medium text-foreground">
            {openCount} paper{openCount === 1 ? "" : "s"} ready for marking.
          </p>
        ) : null}
      </Card>

      <TeacherExamMarkingList basePath={`${roleBase}/exams`} />
    </div>
  );
}
