"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";

export function TeacherAssessmentScopeNote({
  track,
  roleBase,
  openExamCount,
}: {
  track: "cbc" | "alevel";
  roleBase: "/subject-teacher" | "/class-teacher";
  openExamCount?: number;
}) {
  if (track === "alevel") {
    return (
      <Card>
        <p className="text-sm text-muted-foreground">
          Enter <strong className="text-foreground">term UNEB scores</strong> (0–100) for A-Level subjects you
          teach. Formal exams use the same scores when linked to report cards — open exam marking is under{" "}
          <Link href={`${roleBase}/exams`} className="font-medium text-brand hover:underline">
            Exams
          </Link>
          .
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <div className="space-y-2 text-sm text-muted-foreground">
        <p>
          This page is for <strong className="text-foreground">term CBC competency ratings</strong> (A–D per
          strand). Only subjects with CBC strands configured by the school appear in the list below.
        </p>
        <p>
          <strong className="text-foreground">Formal exam marks</strong> (e.g. MT III) are entered under{" "}
          <Link href={`${roleBase}/exams`} className="font-medium text-brand hover:underline">
            Exams
          </Link>
          , not here.
          {openExamCount != null && openExamCount > 0 ? (
            <>
              {" "}
              You have <strong className="text-foreground">{openExamCount}</strong> open exam paper
              {openExamCount === 1 ? "" : "s"} waiting there.
            </>
          ) : null}
        </p>
      </div>
    </Card>
  );
}
