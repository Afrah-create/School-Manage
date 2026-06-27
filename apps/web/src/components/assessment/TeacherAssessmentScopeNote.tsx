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
          Enter <strong className="text-foreground">term UNEB scores</strong> (0–100) only for subjects explicitly
          assigned to you on Subject teachers. Homeroom alone does not appear here. Formal exams use the same scores
          when linked to report cards — open exam marking is under{" "}
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
          This page is for <strong className="text-foreground">term CBC competency ratings</strong> (NCDC 4-level
          descriptors per strand). Only subjects explicitly assigned to you on Subject teachers appear below, and only
          when CBC strands are configured. Open an assignment to enter ratings; the same screen also has{" "}
          <strong className="text-foreground">project work (official CA)</strong> for composite A–E grades.
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
