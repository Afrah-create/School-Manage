"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Student } from "@uganda-cbc-sms/shared";
import { ALevelScoreGrid } from "@/components/assessment/ALevelScoreGrid";
import { SubmitLockBanner } from "@/components/assessment/SubmitLockBanner";
import { AsyncContent } from "@/components/feedback/AsyncContent";
import { ErrorState } from "@/components/feedback/ErrorState";
import { FormSkeleton } from "@/components/feedback/FormSkeleton";
import { Alert } from "@/components/ui/Alert";
import { useAlevelActions, useAlevelAssessments } from "@/hooks/useALevelAssessment";
import { useGradingScales } from "@/hooks/useGradingScales";
import { apiGet } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api";
import { manualStatus } from "@/lib/queryStatus";

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

  const studentsQ = useQuery({
    queryKey: ["students", classId],
    queryFn: () => apiGet<Student[]>(`/students?classId=${encodeURIComponent(classId)}`),
    enabled: contextReady,
  });

  const alevelQ = useAlevelAssessments({ classId, subjectId, termId, yearId });
  const alevelActions = useAlevelActions();
  const gradingQ = useGradingScales("A_LEVEL");

  const students = useMemo(
    () =>
      (studentsQ.data ?? []).map((s) => ({
        id: s.id,
        fullName: s.fullName,
        studentNumber: s.studentNumber,
      })),
    [studentsQ.data],
  );

  const metaStatus = manualStatus({
    loading: studentsQ.isPending,
    error: studentsQ.error,
    data: students,
  });

  const submitted = Boolean(
    (alevelQ.data as Array<{ submitted?: boolean }> | undefined)?.some((r) => r.submitted),
  );

  if (!contextReady) {
    return (
      <Alert tone="info">
        Choose a class and subject from{" "}
        <Link href={listHref} className="font-medium text-brand underline">
          your assignments
        </Link>{" "}
        to enter A-Level scores.
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <Link href={listHref} className="inline-block text-sm font-medium text-brand hover:underline">
        ← My assignments
      </Link>

      {feedback.ok ? <Alert tone="success">{feedback.ok}</Alert> : null}
      {feedback.err ? <Alert tone="error">{feedback.err}</Alert> : null}

      <AsyncContent
        status={metaStatus}
        loading={<FormSkeleton fields={4} />}
        error={
          <ErrorState
            message={
              studentsQ.error instanceof Error ? studentsQ.error.message : "We couldn't load students."
            }
            onRetry={() => void studentsQ.refetch()}
          />
        }
      >
        {students.length === 0 ? (
          <Alert tone="info">No students are enrolled in this class.</Alert>
        ) : (
          <>
            <SubmitLockBanner state={submitted ? "locked" : "draft"} />
            <ALevelScoreGrid
              students={students}
              gradingScaleRows={gradingQ.data}
              onSave={async (items) => {
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
                const yes = window.confirm("Submit and lock all A-Level entries for this subject?");
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
