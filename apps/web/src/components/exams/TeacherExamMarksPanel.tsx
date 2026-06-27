"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SubmitLockBanner } from "@/components/assessment/SubmitLockBanner";
import { ExamScoreGrid } from "@/components/exams/ExamScoreGrid";
import { AsyncContent } from "@/components/feedback/AsyncContent";
import { ErrorState } from "@/components/feedback/ErrorState";
import { FormSkeleton } from "@/components/feedback/FormSkeleton";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { useGradingScales } from "@/hooks/useGradingScales";
import {
  useExam,
  useExamMarkActions,
  useExamMarks,
  useExamSubjects,
  type ExamTeacherSubject,
} from "@/hooks/useExams";
import { levelLabel, levelShortLabel, parseAcademicLevel } from "@/lib/academicLevel";
import { getApiErrorMessage } from "@/lib/api";
import { formatDisplayDate } from "@/lib/dates";
import { toast } from "@/lib/toast";
import { combineQueryStatus } from "@/lib/queryStatus";

export function TeacherExamMarksPanel({
  examId,
  roleBase,
}: {
  examId: string;
  roleBase: "/subject-teacher" | "/class-teacher";
}) {
  const searchParams = useSearchParams();
  const subjectFromUrl = searchParams.get("subjectId") ?? "";
  const examQ = useExam(examId);
  const subjectsQ = useExamSubjects(examId);
  const [subjectId, setSubjectId] = useState(subjectFromUrl);
  const marksQ = useExamMarks(examId, subjectId || undefined);
  const actions = useExamMarkActions(examId);

  const level = parseAcademicLevel(
    examQ.data?.classLevel ?? marksQ.data?.exam.classLevel,
  );
  const gradingQ = useGradingScales(level);

  const subjects = useMemo(() => subjectsQ.data ?? [], [subjectsQ.data]);
  const editable = useMemo(() => subjects.filter((s) => s.canEdit), [subjects]);
  const singleSubject = subjects.length === 1;

  useEffect(() => {
    if (subjectFromUrl && subjects.some((s) => s.subjectId === subjectFromUrl)) {
      setSubjectId(subjectFromUrl);
      return;
    }
    if (!subjectId && editable[0]) setSubjectId(editable[0].subjectId);
    else if (!subjectId && subjects[0]) setSubjectId(subjects[0].subjectId);
  }, [editable, subjects, subjectId, subjectFromUrl]);

  const subjectLabel = useMemo(() => {
    const s = subjects.find((x) => x.subjectId === subjectId);
    return s ? `${s.subjectCode} — ${s.subjectName}` : "";
  }, [subjects, subjectId]);

  const marksStatus = combineQueryStatus([marksQ, gradingQ]);
  const metaStatus = combineQueryStatus([examQ, subjectsQ]);

  const activeSubject: ExamTeacherSubject | undefined = subjects.find((s) => s.subjectId === subjectId);
  const examOpen = marksQ.data?.exam.status === "open";
  const subjectSubmitted = Boolean(marksQ.data?.subjectSubmitted);
  const readOnly =
    subjectSubmitted || !activeSubject?.canEdit || !examOpen;

  const termAssessmentHref =
    level === "A_LEVEL" ? `${roleBase}/assessment/alevel` : `${roleBase}/assessment/cbc`;

  const save = async (items: Array<{ studentId: string; score: number }>) => {
    if (!subjectId) return;
    if (items.length === 0) {
      toast.error("Enter at least one valid score before saving.");
      return;
    }
    try {
      const res = await actions.saveBulk.mutateAsync({ subjectId, marks: items });
      toast.success(
        `Saved ${res.saved} mark${res.saved === 1 ? "" : "s"} for ${subjectLabel || "this subject"}.`,
        "Progress saved",
      );
    } catch (e) {
      toast.error(getApiErrorMessage(e), "Could not save marks");
    }
  };

  const requestSubmit = (): void => {
    if (!subjectId) return;
    toast.confirm({
      title: "Submit and lock marks?",
      description: `Your marks for ${subjectLabel || "this subject"} will be locked. You will not be able to edit them unless an administrator reopens the exam.`,
      confirmLabel: "Submit & lock",
      cancelLabel: "Keep editing",
      onConfirm: async () => {
        try {
          await actions.submit.mutateAsync(subjectId);
          toast.success(
            "Your paper is locked. Contact the headteacher or administrator if you need changes.",
            "Marks submitted",
          );
        } catch (e) {
          toast.error(getApiErrorMessage(e), "Could not submit marks");
          throw e;
        }
      },
    });
  };

  return (
    <div className="space-y-4">
      <AsyncContent
        status={metaStatus}
        loading={<FormSkeleton fields={3} />}
        error={
          <ErrorState
            message={
              examQ.error instanceof Error
                ? examQ.error.message
                : "We couldn't load exam details."
            }
            onRetry={() => {
              void examQ.refetch();
              void subjectsQ.refetch();
            }}
          />
        }
      >
        {examQ.data ? (
          <Card>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={level === "A_LEVEL" ? "warning" : "neutral"}>
                {levelShortLabel(level)}
              </Badge>
              {examQ.data.className ? (
                <span className="text-sm text-muted-foreground">
                  {examQ.data.className}
                  {examQ.data.classStream ? ` · ${examQ.data.classStream}` : ""}
                </span>
              ) : null}
              {examQ.data.examDate ? (
                <span className="text-sm text-muted-foreground">
                  · {formatDisplayDate(examQ.data.examDate)}
                </span>
              ) : null}
              <span className="text-sm text-muted-foreground">· Max {examQ.data.maxScore}</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {level === "A_LEVEL" ? (
                <>
                  Enter numeric scores (0–max). Grades and points use the{" "}
                  <strong className="text-foreground">A-Level</strong> grading scale. Term UNEB scores are
                  also entered under{" "}
                  <Link href={termAssessmentHref} className="font-medium text-brand hover:underline">
                    A-Level Assessment
                  </Link>
                  .
                </>
              ) : (
                <>
                  Enter numeric <strong className="text-foreground">exam scores</strong> (0–max). Grades use
                  the <strong className="text-foreground">O-Level</strong> composite grading scale — not NCDC
                  competency descriptors. Term competencies are entered separately under{" "}
                  <Link href={termAssessmentHref} className="font-medium text-brand hover:underline">
                    Competency assessment
                  </Link>
                  .
                </>
              )}
            </p>
          </Card>
        ) : null}

        {subjects.length === 0 ? (
          <div className="mt-4">
            <Alert tone="info">
              You have no subjects on this exam. Only subjects assigned to you on the class timetable can be
              marked here.
            </Alert>
          </div>
        ) : singleSubject ? (
          <p className="mt-4 text-sm">
            <span className="text-muted-foreground">Your subject: </span>
            <strong>{subjectLabel}</strong>
            {subjects[0]?.isSubmitted ? (
              <span className="ml-2 text-xs text-emerald-700 dark:text-emerald-400">(submitted)</span>
            ) : null}
          </p>
        ) : (
          <div className="mt-4">
            <Select
              label="Your subject"
              options={subjects.map((s) => ({
                value: s.subjectId,
                label: `${s.subjectCode} — ${s.subjectName}${s.isSubmitted ? " (submitted)" : ""}`,
              }))}
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
            />
          </div>
        )}
      </AsyncContent>

      {subjectId ? (
        <AsyncContent
          status={marksStatus}
          loading={<FormSkeleton fields={6} />}
          error={
            <ErrorState
              message={
                marksQ.error instanceof Error
                  ? marksQ.error.message
                  : gradingQ.error instanceof Error
                    ? gradingQ.error.message
                    : "We couldn't load marks."
              }
              onRetry={() => {
                void marksQ.refetch();
                void gradingQ.refetch();
              }}
            />
          }
        >
          {!examOpen && marksQ.data ? (
            <Alert tone="info">
              This exam is not open for marking. Contact an administrator if you need to make changes.
            </Alert>
          ) : null}

          {marksQ.data && marksQ.data.entrantsCount === 0 ? (
            <Alert tone="info">
              No students are registered for this exam paper yet. Ask an administrator to configure student
              entries on the exam before you can enter marks.
            </Alert>
          ) : null}

          {marksQ.data && marksQ.data.entrantsCount > 0 ? (
            <>
              <SubmitLockBanner state={subjectSubmitted ? "locked" : "draft"} />
              <ExamScoreGrid
                students={marksQ.data.students}
                maxScore={marksQ.data.maxScore}
                level={level}
                gradingScaleRows={gradingQ.data}
                readOnly={readOnly}
                onSave={save}
                onSubmit={requestSubmit}
                saving={actions.saveBulk.isPending}
                submitting={actions.submit.isPending}
              />
            </>
          ) : null}
        </AsyncContent>
      ) : null}
    </div>
  );
}
