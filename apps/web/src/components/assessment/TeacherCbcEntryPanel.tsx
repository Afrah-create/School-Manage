"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Student } from "@uganda-cbc-sms/shared";
import { CbcAssessmentGrid } from "@/components/assessment/CbcAssessmentGrid";
import { SubmitLockBanner } from "@/components/assessment/SubmitLockBanner";
import { AsyncContent } from "@/components/feedback/AsyncContent";
import { ErrorState } from "@/components/feedback/ErrorState";
import { FormSkeleton } from "@/components/feedback/FormSkeleton";
import { Alert } from "@/components/ui/Alert";
import { Select } from "@/components/ui/Select";
import { useCbcActions, useCbcAssessments } from "@/hooks/useCBCAssessment";
import { apiGet } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api";
import { manualStatus } from "@/lib/queryStatus";

type StrandRow = {
  id: string;
  name: string;
  subStrands: Array<{ name: string }>;
  competencies?: string[];
};

function cbcListHref(pathname: string) {
  return pathname.includes("/class-teacher/")
    ? "/class-teacher/assessment/cbc"
    : "/subject-teacher/assessment/cbc";
}

export function TeacherCbcEntryPanel() {
  const pathname = usePathname();
  const listHref = cbcListHref(pathname);
  const searchParams = useSearchParams();
  const classId = searchParams.get("classId") ?? "";
  const subjectId = searchParams.get("subjectId") ?? "";
  const termId = searchParams.get("termId") ?? "";
  const yearId = searchParams.get("yearId") ?? "";

  const [strandId, setStrandId] = useState("");
  const [feedback, setFeedback] = useState<{ ok?: string; err?: string }>({});

  const contextReady = Boolean(classId && subjectId && termId && yearId);

  const studentsQ = useQuery({
    queryKey: ["students", classId],
    queryFn: () => apiGet<Student[]>(`/students?classId=${encodeURIComponent(classId)}`),
    enabled: contextReady,
  });

  const strandsQ = useQuery({
    queryKey: ["assessment-strands", subjectId],
    queryFn: () =>
      apiGet<StrandRow[]>(`/assessments/strands?subjectId=${encodeURIComponent(subjectId)}`),
    enabled: Boolean(subjectId),
  });

  const cbcQ = useCbcAssessments({ classId, subjectId, termId, yearId });
  const cbcActions = useCbcActions();

  const strands = useMemo(
    () =>
      (strandsQ.data ?? []).map((s) => ({
        id: s.id,
        name: s.name,
        competencies: s.subStrands?.length ? s.subStrands.map((x) => x.name) : s.competencies ?? [],
      })),
    [strandsQ.data],
  );

  const activeStrands = useMemo(() => {
    if (!strandId) return strands;
    return strands.filter((s) => s.id === strandId);
  }, [strands, strandId]);

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
    loading: studentsQ.isPending || strandsQ.isPending,
    error: studentsQ.error ?? strandsQ.error,
    data: students,
  });

  const submitted = Boolean(
    (cbcQ.data as Array<{ submitted?: boolean }> | undefined)?.some((r) => r.submitted),
  );

  if (!contextReady) {
    return (
      <Alert tone="info">
        Choose a class and subject from{" "}
        <Link href={listHref} className="font-medium text-brand underline">
          your assignments
        </Link>{" "}
        to enter CBC ratings.
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

      {strands.length > 1 ? (
        <Select
          label="Strand (optional filter)"
          options={[
            { value: "", label: "All strands for this subject" },
            ...strands.map((s) => ({ value: s.id, label: s.name })),
          ]}
          value={strandId}
          onChange={(e) => setStrandId(e.target.value)}
        />
      ) : null}

      <AsyncContent
        status={metaStatus}
        loading={<FormSkeleton fields={4} />}
        error={
          <ErrorState
            message={
              studentsQ.error instanceof Error
                ? studentsQ.error.message
                : "We couldn't load students or strands."
            }
            onRetry={() => {
              void studentsQ.refetch();
              void strandsQ.refetch();
            }}
          />
        }
      >
        {activeStrands.length === 0 ? (
          <Alert tone="info">
            No CBC strands are configured for this subject. Ask an administrator to add strands under Academic → CBC
            strands.
          </Alert>
        ) : students.length === 0 ? (
          <Alert tone="info">No students are enrolled in this class.</Alert>
        ) : (
          <>
            <SubmitLockBanner state={submitted ? "locked" : "draft"} />
            <CbcAssessmentGrid
              students={students}
              strands={activeStrands}
              disabled={submitted}
              onSave={async (items) => {
                setFeedback({});
                try {
                  await cbcActions.saveBulk.mutateAsync({
                    assessments: items.map((i) => ({
                      studentId: i.studentId,
                      subjectId,
                      strand: i.strand,
                      competency: i.competency,
                      rating: i.rating,
                    })),
                    termId,
                    yearId,
                  });
                  setFeedback({ ok: "CBC ratings saved." });
                } catch (e) {
                  setFeedback({ err: getApiErrorMessage(e) });
                }
              }}
              onSubmit={async () => {
                const yes = window.confirm("Submit and lock all entries for this subject?");
                if (!yes) return;
                setFeedback({});
                try {
                  await cbcActions.submit.mutateAsync({
                    subjectId,
                    classId,
                    termId,
                    yearId,
                  });
                  setFeedback({ ok: "CBC marks submitted and locked." });
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
