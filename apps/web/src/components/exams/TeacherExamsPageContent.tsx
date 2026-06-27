"use client";

import Link from "next/link";
import { TeacherExamMarkingList } from "@/components/exams/TeacherExamMarkingList";
import { Card } from "@/components/ui/Card";
import { useExamMarkingSlots } from "@/hooks/useExams";
import { parseAcademicLevel } from "@/lib/academicLevel";

export function TeacherExamsPageContent({
  roleBase,
}: {
  roleBase: "/subject-teacher" | "/class-teacher";
}) {
  const slotsQ = useExamMarkingSlots();
  const slots = slotsQ.data ?? [];
  const openCount = slots.filter((s) => s.canEdit).length;
  const oOpen = slots.filter((s) => s.canEdit && parseAcademicLevel(s.classLevel) === "O_LEVEL").length;
  const aOpen = slots.filter((s) => s.canEdit && parseAcademicLevel(s.classLevel) === "A_LEVEL").length;

  return (
    <div className="space-y-4">
      <Card>
        <p className="text-sm text-muted-foreground">
          Each row is one <strong className="text-foreground">open formal exam</strong> paper for a class–subject
          you teach. Enter scores, then submit to lock your paper. Grades use the{" "}
          <strong className="text-foreground">O-Level</strong> or <strong className="text-foreground">A-Level</strong>{" "}
          scale that matches the class — shown in the Level column.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Term work is separate:{" "}
          <Link href={`${roleBase}/assessment/cbc`} className="font-medium text-brand hover:underline">
            Competency assessment
          </Link>{" "}
          for O-Level competencies,{" "}
          <Link href={`${roleBase}/assessment/alevel`} className="font-medium text-brand hover:underline">
            A-Level Assessment
          </Link>{" "}
          for term UNEB scores.
        </p>
        {slotsQ.isSuccess && openCount > 0 ? (
          <p className="mt-2 text-sm font-medium text-foreground">
            {openCount} paper{openCount === 1 ? "" : "s"} ready for marking
            {oOpen > 0 && aOpen > 0
              ? ` (${oOpen} O-Level, ${aOpen} A-Level)`
              : oOpen > 0
                ? " (O-Level)"
                : aOpen > 0
                  ? " (A-Level)"
                  : ""}
            .
          </p>
        ) : null}
      </Card>

      <TeacherExamMarkingList basePath={`${roleBase}/exams`} />
    </div>
  );
}
