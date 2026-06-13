"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { SchoolClass, Student } from "@uganda-cbc-sms/shared";
import { ALevelScoreGrid } from "@/components/assessment/ALevelScoreGrid";
import { SubmitLockBanner } from "@/components/assessment/SubmitLockBanner";
import { AsyncContent } from "@/components/feedback/AsyncContent";
import { ErrorState } from "@/components/feedback/ErrorState";
import { FormSkeleton } from "@/components/feedback/FormSkeleton";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { Alert } from "@/components/ui/Alert";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { useAlevelActions, useAlevelAssessments } from "@/hooks/useALevelAssessment";
import { useGradingScales } from "@/hooks/useGradingScales";
import { apiGet, getApiErrorMessage } from "@/lib/api";
import { parseAlevelAssessmentRows } from "@/lib/alevelAssessment";
import { filterClassesByLevel } from "@/lib/academicLevel";
import { combineQueryStatus, manualStatus } from "@/lib/queryStatus";

type Combination = {
  id: string;
  name: string;
  code: string;
  subjects: { id: string; name: string; code: string }[];
};

export default function AdminAlevelAssessmentPage() {
  const [academicYearId, setAcademicYearId] = useState("");
  const [classId, setClassId] = useState("");
  const [termId, setTermId] = useState("");
  const [combinationId, setCombinationId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [feedback, setFeedback] = useState<{ ok?: string; err?: string }>({});

  const yearsQ = useQuery({
    queryKey: ["academic-years"],
    queryFn: () => apiGet<{ id: string; name: string }[]>("/academic/years"),
  });
  const termsQ = useQuery({
    queryKey: ["academic-terms", academicYearId],
    queryFn: () =>
      apiGet<{ id: string; academicYearId: string; termNumber: number }[]>(
        `/academic/terms?academicYearId=${encodeURIComponent(academicYearId)}`,
      ),
    enabled: Boolean(academicYearId),
  });
  const classesQ = useQuery({
    queryKey: ["academic-classes"],
    queryFn: () => apiGet<SchoolClass[]>("/academic/classes"),
  });
  const combinationsQ = useQuery({
    queryKey: ["academic-combinations", "A_LEVEL"],
    queryFn: () => apiGet<Combination[]>("/academic/combinations?level=A_LEVEL"),
  });

  const years = useMemo(() => yearsQ.data ?? [], [yearsQ.data]);
  const terms = useMemo(() => termsQ.data ?? [], [termsQ.data]);
  const classes = useMemo(() => classesQ.data ?? [], [classesQ.data]);
  const combinations = useMemo(() => combinationsQ.data ?? [], [combinationsQ.data]);

  useEffect(() => {
    if (years[0] && !academicYearId) setAcademicYearId(years[0].id);
  }, [years, academicYearId]);

  const aLevelClasses = useMemo(
    () => filterClassesByLevel(classes, "A_LEVEL", academicYearId),
    [classes, academicYearId],
  );

  useEffect(() => {
    if (aLevelClasses[0] && !classId) setClassId(aLevelClasses[0].id);
    else if (classId && !aLevelClasses.some((c) => c.id === classId)) {
      setClassId(aLevelClasses[0]?.id ?? "");
    }
  }, [aLevelClasses, classId]);

  const yearTerms = useMemo(
    () => terms.filter((t) => t.academicYearId === academicYearId),
    [terms, academicYearId],
  );

  useEffect(() => {
    if (yearTerms[0] && !termId) setTermId(yearTerms[0].id);
    else if (termId && !yearTerms.some((t) => t.id === termId)) setTermId(yearTerms[0]?.id ?? "");
  }, [yearTerms, termId]);

  useEffect(() => {
    if (combinations[0] && !combinationId) setCombinationId(combinations[0].id);
  }, [combinations, combinationId]);

  const comboSubjects = useMemo(
    () => combinations.find((c) => c.id === combinationId)?.subjects ?? [],
    [combinations, combinationId],
  );

  useEffect(() => {
    if (comboSubjects[0] && !subjectId) setSubjectId(comboSubjects[0].id);
    else if (subjectId && !comboSubjects.some((s) => s.id === subjectId)) {
      setSubjectId(comboSubjects[0]?.id ?? "");
    }
  }, [comboSubjects, subjectId]);

  const contextReady = Boolean(classId && subjectId && termId && academicYearId);

  const studentsQ = useQuery({
    queryKey: ["students", "class", classId],
    queryFn: () => apiGet<Student[]>(`/students?classId=${encodeURIComponent(classId)}`),
    enabled: contextReady,
  });

  const alevelQ = useAlevelAssessments({
    classId,
    subjectId,
    termId,
    yearId: academicYearId,
  });
  const alevelActions = useAlevelActions();
  const gradingQ = useGradingScales("A_LEVEL");

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

  const filtersLoading = yearsQ.isLoading || classesQ.isLoading || combinationsQ.isLoading;

  return (
    <PageWrapper
      title="A-Level assessment"
      description="Term subject scores (0–100) with live grade preview from the A-Level grading scale"
    >
      <Link href="/admin/assessment" className="mb-4 inline-block text-sm font-medium text-brand hover:underline">
        ← Assessment hub
      </Link>

      <Card>
        <p className="text-sm text-muted-foreground">
          Enter UNEB-style scores for A-Level classes. Grades and points follow the school&apos;s A-Level scale.
          Formal exam papers are managed separately under Exams.
        </p>
      </Card>

      <div className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-5">
        <Select
          label="Academic year"
          options={years.map((y) => ({ value: y.id, label: y.name }))}
          value={academicYearId}
          onChange={(e) => setAcademicYearId(e.target.value)}
          disabled={filtersLoading}
        />
        <Select
          label="Class"
          options={aLevelClasses.map((x) => ({
            value: x.id,
            label: x.stream ? `${x.name} · ${x.stream}` : x.name,
          }))}
          value={classId}
          onChange={(e) => setClassId(e.target.value)}
          disabled={filtersLoading || aLevelClasses.length === 0}
        />
        <Select
          label="Term"
          options={yearTerms.map((x) => ({ value: x.id, label: `Term ${x.termNumber}` }))}
          value={termId}
          onChange={(e) => setTermId(e.target.value)}
          disabled={!academicYearId || yearTerms.length === 0}
        />
        <Select
          label="Subject combination"
          options={combinations.map((x) => ({ value: x.id, label: `${x.code} — ${x.name}` }))}
          value={combinationId}
          onChange={(e) => setCombinationId(e.target.value)}
          disabled={combinations.length === 0}
        />
        <Select
          label="Subject"
          options={comboSubjects.map((s) => ({ value: s.id, label: `${s.code} — ${s.name}` }))}
          value={subjectId}
          onChange={(e) => setSubjectId(e.target.value)}
          disabled={comboSubjects.length === 0}
        />
      </div>

      {feedback.ok ? (
        <div className="mt-4">
          <Alert tone="success">{feedback.ok}</Alert>
        </div>
      ) : null}
      {feedback.err ? (
        <div className="mt-4">
          <Alert tone="error">{feedback.err}</Alert>
        </div>
      ) : null}

      {!contextReady ? (
        <p className="mt-6 text-sm text-muted-foreground">
          Select year, class, term, combination, and subject to enable entry.
        </p>
      ) : (
        <div className="mt-8">
          <AsyncContent
            status={metaStatus}
            loading={<FormSkeleton fields={6} />}
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
                        yearId: academicYearId,
                      });
                      setFeedback({ ok: "A-Level scores saved." });
                    } catch (e) {
                      setFeedback({ err: getApiErrorMessage(e) });
                    }
                  }}
                  onSubmit={async () => {
                    const yes = window.confirm(
                      "Submit and lock all A-Level entries for this subject? Teachers will not be able to edit unless a headteacher unlocks.",
                    );
                    if (!yes) return;
                    setFeedback({});
                    try {
                      await alevelActions.submit.mutateAsync({
                        subjectId,
                        classId,
                        termId,
                        yearId: academicYearId,
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
      )}
    </PageWrapper>
  );
}
