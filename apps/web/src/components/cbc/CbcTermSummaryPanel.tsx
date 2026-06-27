"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, User } from "lucide-react";
import type { CompetencyLevel, Student } from "@uganda-cbc-sms/shared";
import { CbcCompetencyLegend, CbcCompetencyLegendNote } from "@/components/cbc/CbcCompetencyLegend";
import { CompetencyLevelBadge } from "@/components/cbc/CompetencyLevelBadge";
import { CompetencyLevelSelector } from "@/components/cbc/CompetencyLevelSelector";
import { AsyncContent } from "@/components/feedback/AsyncContent";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { FormSkeleton } from "@/components/feedback/FormSkeleton";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { pickCompetencyLevel } from "@/lib/cbcCompetency";
import { getApiErrorMessage } from "@/lib/api";
import { useCbcAssessments } from "@/hooks/useCBCAssessment";
import { useCbcCompetencyMutations, useCbcTermSummary } from "@/hooks/useCbcCompetencyApi";
import {
  filterClassesByLevel,
  pickDefaultAcademicYear,
  pickDefaultTerm,
} from "@/lib/academicLevel";
import { apiGet } from "@/lib/api";
import { manualStatus } from "@/lib/queryStatus";
import type { SchoolClass } from "@uganda-cbc-sms/shared";

type SubjectAssignment = { subjectId: string; subjectName: string; subjectCode: string };

export type CbcTermSummaryVariant = "admin" | "headteacher";

const COPY: Record<
  CbcTermSummaryVariant,
  {
    scopeTitle: string;
    scopeHint: string;
    summaryTitle: string;
    emptyTitle: string;
    emptyDescription: string;
    showLegacyDetail: boolean;
  }
> = {
  admin: {
    scopeTitle: "Find a learner’s term summary",
    scopeHint:
      "Choose the academic year, class, term, subject, and learner. Summaries are computed automatically after teachers save competency ratings on assessment activities.",
    summaryTitle: "Term competency summary",
    emptyTitle: "No competency summary for this learner yet",
    emptyDescription:
      "Teachers record ratings per assessment activity (assignment, test, practical, etc.). Once ratings exist for this learner, subject, and term, the system aggregates them here using the most frequent level.",
    showLegacyDetail: false,
  },
  headteacher: {
    scopeTitle: "Review scope",
    scopeHint:
      "Select a learner and subject to review aggregated term levels. You can override a competency when the aggregated level does not reflect professional judgement — a written justification is required.",
    summaryTitle: "Term competency summary",
    emptyTitle: "No term summary yet",
    emptyDescription:
      "Summaries appear after subject or class teachers save competency ratings for this learner, subject, and term.",
    showLegacyDetail: true,
  },
};

export function CbcTermSummaryPanel({ variant = "headteacher" }: { variant?: CbcTermSummaryVariant }) {
  const allowOverride = variant === "headteacher";
  const copy = COPY[variant];

  const [yearId, setYearId] = useState("");
  const [classId, setClassId] = useState("");
  const [termId, setTermId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [overrideId, setOverrideId] = useState<string | null>(null);
  const [overrideLevel, setOverrideLevel] = useState<CompetencyLevel | "">("");
  const [justification, setJustification] = useState("");
  const [feedback, setFeedback] = useState<{ ok?: string; err?: string }>({});

  const yearsQ = useQuery({
    queryKey: ["academic-years"],
    queryFn: () => apiGet<{ id: string; name: string; isActive?: boolean }[]>("/academic/years"),
  });
  const termsQ = useQuery({
    queryKey: ["academic-terms", yearId],
    queryFn: () =>
      apiGet<{ id: string; academicYearId: string; termNumber: number; isActive?: boolean }[]>(
        `/academic/terms?academicYearId=${encodeURIComponent(yearId)}`,
      ),
    enabled: Boolean(yearId),
  });
  const classesQ = useQuery({
    queryKey: ["academic-classes"],
    queryFn: () => apiGet<SchoolClass[]>("/academic/classes"),
  });

  const years = yearsQ.data ?? [];
  const terms = termsQ.data ?? [];
  const classes = classesQ.data ?? [];

  useEffect(() => {
    if (years.length && !yearId) setYearId(pickDefaultAcademicYear(years));
  }, [years, yearId]);

  const oLevelClasses = useMemo(
    () => filterClassesByLevel(classes, "O_LEVEL", yearId),
    [classes, yearId],
  );

  useEffect(() => {
    if (oLevelClasses.length && (!classId || !oLevelClasses.some((c) => c.id === classId))) {
      setClassId(oLevelClasses[0]!.id);
    }
  }, [oLevelClasses, classId]);

  const yearTerms = useMemo(() => terms.filter((t) => t.academicYearId === yearId), [terms, yearId]);

  useEffect(() => {
    if (yearTerms.length && (!termId || !yearTerms.some((t) => t.id === termId))) {
      setTermId(pickDefaultTerm(yearTerms)?.id ?? "");
    }
  }, [yearTerms, termId]);

  const subjectsQ = useQuery({
    queryKey: ["cbc-oversight-subjects", classId, yearId],
    queryFn: async () => {
      const rows = await apiGet<SubjectAssignment[]>(
        `/academic/class-subjects?classId=${encodeURIComponent(classId)}&academicYearId=${encodeURIComponent(yearId)}`,
      );
      return rows.filter((x, i, arr) => arr.findIndex((k) => k.subjectId === x.subjectId) === i);
    },
    enabled: Boolean(classId && yearId),
  });

  const subjects = subjectsQ.data ?? [];

  useEffect(() => {
    if (subjects.length && (!subjectId || !subjects.some((s) => s.subjectId === subjectId))) {
      setSubjectId(subjects[0]!.subjectId);
    }
  }, [subjects, subjectId]);

  const studentsQ = useQuery({
    queryKey: ["students", classId],
    queryFn: () => apiGet<Student[]>(`/students?classId=${encodeURIComponent(classId)}`),
    enabled: Boolean(classId),
  });

  const students = studentsQ.data ?? [];

  useEffect(() => {
    if (students.length && (!studentId || !students.some((s) => s.id === studentId))) {
      setStudentId(students[0]!.id);
    }
  }, [students, studentId]);

  const selectedYear = years.find((y) => y.id === yearId);
  const selectedClass = oLevelClasses.find((c) => c.id === classId);
  const selectedTerm = yearTerms.find((t) => t.id === termId);
  const selectedSubject = subjects.find((s) => s.subjectId === subjectId);
  const selectedStudent = students.find((s) => s.id === studentId);

  const studentIndex = students.findIndex((s) => s.id === studentId);
  const goStudent = (delta: number) => {
    if (!students.length) return;
    const next = (studentIndex + delta + students.length) % students.length;
    setStudentId(students[next]!.id);
  };

  const scopeReady = Boolean(yearId && classId && termId && subjectId && studentId);
  const filtersLoading = yearsQ.isLoading || classesQ.isLoading;

  const summaryQ = useCbcTermSummary({ studentId, subjectId, termId });
  const legacyQ = useCbcAssessments({
    classId,
    subjectId,
    termId,
    yearId,
  });
  const { overrideSummary } = useCbcCompetencyMutations();

  const summaryRows = summaryQ.data ?? [];
  const overrideCount = summaryRows.filter((r) => r.is_teacher_override).length;

  const legacyRows = (legacyQ.data as Record<string, unknown>[] | undefined) ?? [];
  const legacyForStudent = useMemo(
    () =>
      legacyRows.filter((row) => {
        const sid = row["student_id"] ?? row["studentId"];
        return !studentId || String(sid) === studentId;
      }),
    [legacyRows, studentId],
  );

  const status = manualStatus({
    loading: summaryQ.isLoading && scopeReady,
    error: summaryQ.error,
    data: scopeReady ? summaryRows : undefined,
    isEmpty: (d) => Array.isArray(d) && d.length === 0,
  });

  const openOverride = (id: string, current: CompetencyLevel) => {
    setOverrideId(id);
    setOverrideLevel(current);
    setJustification("");
    setFeedback({});
  };

  const submitOverride = async () => {
    if (!overrideId || !overrideLevel || !justification.trim()) return;
    setFeedback({});
    try {
      await overrideSummary.mutateAsync({
        id: overrideId,
        payload: { overriddenLevel: overrideLevel, overrideJustification: justification.trim() },
      });
      setOverrideId(null);
      setFeedback({ ok: "Term summary updated with headteacher override." });
    } catch (e) {
      setFeedback({ err: getApiErrorMessage(e) });
    }
  };

  const classLabel = selectedClass
    ? selectedClass.stream
      ? `${selectedClass.name} · ${selectedClass.stream}`
      : selectedClass.name
    : "—";

  return (
    <div className="space-y-5">
      <Card title={copy.scopeTitle}>
        <p className="mb-4 text-sm text-muted-foreground">{copy.scopeHint}</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Select
            label="Academic year"
            options={years.map((y) => ({ value: y.id, label: y.name }))}
            value={yearId}
            onChange={(e) => setYearId(e.target.value)}
            disabled={filtersLoading}
          />
          <Select
            label="Class"
            options={oLevelClasses.map((c) => ({
              value: c.id,
              label: c.stream ? `${c.name} · ${c.stream}` : c.name,
            }))}
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            disabled={filtersLoading || oLevelClasses.length === 0}
          />
          <Select
            label="Term"
            options={yearTerms.map((t) => ({ value: t.id, label: `Term ${t.termNumber}` }))}
            value={termId}
            onChange={(e) => setTermId(e.target.value)}
            disabled={!yearId || yearTerms.length === 0}
          />
          <Select
            label="Subject"
            options={subjects.map((s) => ({
              value: s.subjectId,
              label: `${s.subjectCode} — ${s.subjectName}`,
            }))}
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            disabled={subjects.length === 0}
          />
          <Select
            label="Learner"
            options={students.map((s) => ({
              value: s.id,
              label: `${s.fullName} (${s.studentNumber})`,
            }))}
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            disabled={students.length === 0}
          />
        </div>

        {oLevelClasses.length === 0 && !filtersLoading ? (
          <div className="mt-4">
            <Alert tone="info">
              No O-Level classes are set up for the selected year. Add classes under Academic → Classes.
            </Alert>
          </div>
        ) : null}
        {subjects.length === 0 && classId && yearId && !subjectsQ.isLoading ? (
          <div className="mt-4">
            <Alert tone="info">
              This class has no subjects assigned. Add them under Academic → Class subjects.
            </Alert>
          </div>
        ) : null}
        {students.length === 0 && classId && !studentsQ.isLoading ? (
          <div className="mt-4">
            <Alert tone="info">No learners are enrolled in this class. Enrol students under Students.</Alert>
          </div>
        ) : null}
      </Card>

      {scopeReady && selectedStudent && selectedSubject ? (
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand">
              <User className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="truncate font-semibold text-foreground">{selectedStudent.fullName}</p>
              <p className="text-sm text-muted-foreground">
                {selectedSubject.subjectCode} — {selectedSubject.subjectName}
                {" · "}
                {selectedTerm ? `Term ${selectedTerm.termNumber}` : "—"}
                {" · "}
                {classLabel}
                {selectedYear ? ` · ${selectedYear.name}` : ""}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Learner no. {selectedStudent.studentNumber}
              </p>
            </div>
          </div>
          {students.length > 1 ? (
            <div className="flex shrink-0 items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                aria-label="Previous learner"
                onClick={() => goStudent(-1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs tabular-nums text-muted-foreground">
                {studentIndex + 1} / {students.length}
              </span>
              <Button
                type="button"
                variant="secondary"
                aria-label="Next learner"
                onClick={() => goStudent(1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      {feedback.ok ? <Alert tone="success">{feedback.ok}</Alert> : null}
      {feedback.err ? <Alert tone="error">{feedback.err}</Alert> : null}

      <Card title={copy.summaryTitle}>
        <div className="mb-4 space-y-3">
          <CbcCompetencyLegend />
          <CbcCompetencyLegendNote />
        </div>

        {!scopeReady ? (
          <EmptyState
            title="Complete the filters above"
            description="Select a class, term, subject, and learner to load competency summaries."
          />
        ) : (
          <AsyncContent
            status={status}
            loading={<FormSkeleton fields={4} />}
            error={
              <ErrorState
                message="Could not load term competency summary."
                onRetry={() => void summaryQ.refetch()}
              />
            }
            empty={
              <EmptyState title={copy.emptyTitle} description={copy.emptyDescription}>
                {variant === "admin" ? (
                  <p className="mt-3 max-w-md text-left text-xs text-muted-foreground">
                    <strong className="text-foreground">What teachers do:</strong> Assessment → CBC → open
                    the class/subject → create an activity → enter levels per competency → lock the activity.
                    Project work and formal exams are separate steps.
                  </p>
                ) : null}
              </EmptyState>
            }
          >
            {summaryRows.length > 0 ? (
              <>
                <div className="mb-3 flex flex-wrap gap-3 text-sm text-muted-foreground">
                  <span>
                    <strong className="font-medium text-foreground">{summaryRows.length}</strong>{" "}
                    {summaryRows.length === 1 ? "competency" : "competencies"}
                  </span>
                  {overrideCount > 0 ? (
                    <span>
                      <strong className="font-medium text-foreground">{overrideCount}</strong> headteacher{" "}
                      {overrideCount === 1 ? "override" : "overrides"}
                    </span>
                  ) : null}
                  <span>Aggregation: most frequent level (higher rank wins ties)</span>
                </div>

                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <th className="px-3 py-2.5 font-medium">Competency</th>
                        <th className="px-3 py-2.5 font-medium">
                          <span title="The level used on reports — honours headteacher override when set">
                            Report level
                          </span>
                        </th>
                        {!allowOverride ? (
                          <th className="px-3 py-2.5 font-medium">
                            <span title="Computed from all activity ratings this term">From activities</span>
                          </th>
                        ) : null}
                        <th className="px-3 py-2.5 font-medium">Notes</th>
                        {allowOverride ? <th className="px-3 py-2.5 text-right font-medium">Action</th> : null}
                      </tr>
                    </thead>
                    <tbody>
                      {summaryRows.map((row) => (
                        <tr key={row.id} className="border-t border-border align-top">
                          <td className="px-3 py-3 font-medium text-foreground">
                            {row.competency_name ?? row.competency_id}
                          </td>
                          <td className="px-3 py-3">
                            <CompetencyLevelBadge
                              level={row.effective_level}
                              overridden={row.is_teacher_override}
                            />
                          </td>
                          {!allowOverride ? (
                            <td className="px-3 py-3">
                              <CompetencyLevelBadge level={row.aggregated_level} size="sm" />
                            </td>
                          ) : null}
                          <td className="px-3 py-3 text-xs text-muted-foreground">
                            {row.is_teacher_override ? (
                              <div className="space-y-1">
                                <p className="font-medium text-foreground">Headteacher override</p>
                                {row.overridden_level ? (
                                  <p>
                                    Set to{" "}
                                    <CompetencyLevelBadge level={row.overridden_level} size="sm" overridden />
                                  </p>
                                ) : null}
                                {row.override_justification ? (
                                  <p className="italic">&ldquo;{row.override_justification}&rdquo;</p>
                                ) : null}
                                {row.overridden_at ? (
                                  <p>{new Date(row.overridden_at).toLocaleString()}</p>
                                ) : null}
                              </div>
                            ) : (
                              <span>Auto-aggregated from teacher activity ratings</span>
                            )}
                          </td>
                          {allowOverride ? (
                            <td className="px-3 py-3 text-right">
                              <Button
                                type="button"
                                variant="secondary"
                                onClick={() => openOverride(row.id, row.effective_level)}
                              >
                                Override
                              </Button>
                            </td>
                          ) : null}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : null}
          </AsyncContent>
        )}
      </Card>

      {copy.showLegacyDetail && scopeReady && legacyForStudent.length > 0 ? (
        <Card title="Imported strand ratings (reference)">
          <p className="mb-3 text-sm text-muted-foreground">
            Older term-level strand rows, if any were imported or entered before activity-based assessment.
            These are not linked to individual assessment events.
          </p>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2">Strand</th>
                  <th className="px-3 py-2">Competency</th>
                  <th className="px-3 py-2">Level</th>
                </tr>
              </thead>
              <tbody>
                {legacyForStudent.map((row, i) => {
                  const level = pickCompetencyLevel(row);
                  return (
                    <tr key={i} className="border-t border-border">
                      <td className="px-3 py-2">{String(row.strand ?? "—")}</td>
                      <td className="px-3 py-2">{String(row.competency ?? "—")}</td>
                      <td className="px-3 py-2">
                        {level ? (
                          <CompetencyLevelBadge level={level} size="sm" />
                        ) : (
                          <span className="text-muted-foreground">{String(row.rating ?? "—")}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}

      <Modal
        open={allowOverride && overrideId !== null}
        title="Override term summary"
        onClose={() => setOverrideId(null)}
      >
        <p className="mb-3 text-sm text-muted-foreground">
          Choose the level that should appear on reports for this competency. You must provide a written
          justification — the button stays disabled until it is filled in.
        </p>
        <div className="space-y-3">
          <div>
            <p className="mb-1 text-sm font-medium">Report level</p>
            <CompetencyLevelSelector value={overrideLevel} onChange={setOverrideLevel} />
          </div>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Justification</span>
            <textarea
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              rows={4}
              placeholder="Explain why the aggregated level does not reflect the learner's achievement…"
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
            />
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOverrideId(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!justification.trim() || !overrideLevel}
              loading={overrideSummary.isPending}
              onClick={() => void submitOverride()}
            >
              Apply override
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/** @deprecated Use CbcTermSummaryPanel with variant="headteacher" */
export function HeadteacherTermSummaryPanel({
  allowOverride = true,
}: {
  allowOverride?: boolean;
}) {
  return <CbcTermSummaryPanel variant={allowOverride ? "headteacher" : "admin"} />;
}
