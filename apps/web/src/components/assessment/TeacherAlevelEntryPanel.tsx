"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { SchoolClass, Student } from "@uganda-cbc-sms/shared";
import { ALevelScoreGrid } from "@/components/assessment/ALevelScoreGrid";
import { SubmitLockBanner } from "@/components/assessment/SubmitLockBanner";
import { AsyncContent } from "@/components/feedback/AsyncContent";
import { ErrorState } from "@/components/feedback/ErrorState";
import { FormSkeleton } from "@/components/feedback/FormSkeleton";
import { Alert } from "@/components/ui/Alert";
import { Card } from "@/components/ui/Card";
import { useAlevelActions, useAlevelAssessments } from "@/hooks/useALevelAssessment";
import { useGradingScales } from "@/hooks/useGradingScales";
import { apiGet, getApiErrorMessage } from "@/lib/api";
import { parseAlevelAssessmentRows } from "@/lib/alevelAssessment";
import { combineQueryStatus, manualStatus } from "@/lib/queryStatus";

function alevelListHref(pathname: string) {
  return pathname.includes("/class-teacher/")
    ? "/class-teacher/assessment/alevel"
    : "/subject-teacher/assessment/alevel";
}

export function TeacherAlevelEntryPanel() {
  const pathname = usePathname();
  const listHref = alevelListHref(pathname);
  const searchParams = useSearchParams();
  const classId = searchParams.get("classId") ?? "";
  const subjectId = searchParams.get("subjectId") ?? "";
  const termId = searchParams.get("termId") ?? "";
  const yearId = searchParams.get("yearId") ?? "";

  const [feedback, setFeedback] = useState<{ ok?: string; err?: string }>({});
  const contextReady = Boolean(classId && subjectId && termId && yearId);

  const classesQ = useQuery({
    queryKey: ["academic-classes"],
    queryFn: () => apiGet<SchoolClass[]>("/academic/classes"),
    enabled: contextReady,
  });

  const studentsQ = useQuery({
    queryKey: ["students", "class", classId],
    queryFn: () => apiGet<Student[]>(`/students?classId=${encodeURIComponent(classId)}`),
    enabled: contextReady,
  });

  const alevelQ = useAlevelAssessments({ classId, subjectId, termId, yearId });
  const alevelActions = useAlevelActions();
  const gradingQ = useGradingScales("A_LEVEL");

  const classMeta = useMemo(
    () => (classesQ.data ?? []).find((c) => c.id === classId),
    [classesQ.data, classId],
  );

  const { scoresByStudent, submitted } = useMemo(
    () => parseAlevelAssessmentRows(alevelQ.data as unknown[] | undefined),
    [alevelQ.data],
  );

  const students = useMemo(
    () =>
      (studentsQ.data ?? []).map((s) => ({
        id: s.id,
        fullName: s.fullName,
        studentNumber: s.studentNumber,
      })),
    [studentsQ.data],
  );

  const sheetStatus = combineQueryStatus([studentsQ, alevelQ, gradingQ]);
  const metaStatus = manualStatus({
    loading: sheetStatus === "loading",
    error: studentsQ.error ?? alevelQ.error ?? gradingQ.error,
    data: students,
  });

  if (!contextReady) {
    return (
      <Alert tone="info">
        Choose a class and subject from{" "}
        <Link href={listHref} className="font-medium text-brand hover:underline">
          your A-Level assignments
        </Link>{" "}
        to enter UNEB scores.
      </Alert>
    );
  }

  if (classMeta && classMeta.level !== "A_LEVEL") {
    return (
      <Alert tone="error">
        This class is not an A-Level class. Use{" "}
        <Link
          href={
            pathname.includes("/class-teacher/")
              ? "/class-teacher/assessment/cbc"
              : "/subject-teacher/assessment/cbc"
          }
          className="font-medium text-brand hover:underline"
        >
          CBC assessment
        </Link>{" "}
        for O-Level learners.
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <Link href={listHref} className="inline-block text-sm font-medium text-brand hover:underline">
        ← A-Level assignments
      </Link>

      <Card>
        <p className="text-sm text-muted-foreground">
          Enter scores from 0–100. Grades and points are calculated from the school&apos;s A-Level grading scale.
          Save as you go, then submit to lock marks for this subject.
        </p>
      </Card>

      {feedback.ok ? <Alert tone="success">{feedback.ok}</Alert> : null}
      {feedback.err ? <Alert tone="error">{feedback.err}</Alert> : null}

      <AsyncContent
        status={metaStatus}
        loading={<FormSkeleton fields={4} />}
        error={
          <ErrorState
            message={
              studentsQ.error instanceof Error
                ? studentsQ.error.message
                : alevelQ.error instanceof Error
                  ? alevelQ.error.message
                  : "We couldn't load the mark sheet."
            }
            onRetry={() => {
              void studentsQ.refetch();
              void alevelQ.refetch();
            }}
          />
        }
      >
        {students.length === 0 ? (
          <Alert tone="info">No active students are enrolled in this class.</Alert>
        ) : (
          <>
            <SubmitLockBanner state={submitted ? "locked" : "draft"} />
            <ALevelScoreGrid
              students={students}
              gradingScaleRows={gradingQ.data}
              initialScores={scoresByStudent}
              disabled={submitted}
              onSave={async (items) => {
                if (!items.length) {
                  setFeedback({ err: "Enter at least one valid score (0–100) before saving." });
                  return;
                }
                setFeedback({});
                try {
                  await alevelActions.saveBulk.mutateAsync({
                    assessments: items.map((i) => ({
                      studentId: i.studentId,
                      subjectId,
                      score: i.score,
                    })),
                    termId,
                    yearId,
                  });
                  setFeedback({ ok: "A-Level scores saved." });
                } catch (e) {
                  setFeedback({ err: getApiErrorMessage(e) });
                }
              }}
              onSubmit={async () => {
                const yes = window.confirm(
                  "Submit and lock all A-Level entries for this subject? You will not be able to edit them unless a headteacher unlocks.",
                );
                if (!yes) return;
                setFeedback({});
                try {
                  await alevelActions.submit.mutateAsync({
                    subjectId,
                    classId,
                    termId,
                    yearId,
                  });
                  setFeedback({ ok: "A-Level marks submitted and locked." });
                } catch (e) {
                  setFeedback({ err: getApiErrorMessage(e) });
                }
              }}
            />
          </>
        )}
      </AsyncContent>
    </div>
  );
}
