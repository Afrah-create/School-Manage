"use client";

import { useEffect, useMemo, useState } from "react";
import type { SchoolClass } from "@uganda-cbc-sms/shared";
import { AsyncContent } from "@/components/feedback/AsyncContent";
import { ErrorState } from "@/components/feedback/ErrorState";
import { FormSkeleton } from "@/components/feedback/FormSkeleton";
import { MarksSubmissionTracker } from "@/components/reports/MarksSubmissionTracker";
import { ReportCardPreview } from "@/components/reports/ReportCardPreview";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { Table, type Column } from "@/components/ui/Table";
import {
  useClassReports,
  useReportActions,
  useReportExamOptions,
  useReportReadiness,
  type ClassReportRow,
  type ExamSubjectTrack,
  type SubjectSubmissionTrack,
} from "@/hooks/useReports";
import { getApiErrorMessage } from "@/lib/api";
import { queryStatus } from "@/lib/queryStatus";

type MarksSource = "term" | "exam";

function examTrackingAsSubjectRows(
  rows: ExamSubjectTrack[],
  activeStudents: number,
): SubjectSubmissionTrack[] {
  return rows.map((t) => ({
    subjectId: t.subjectId,
    subjectName: t.subjectName,
    subjectCode: t.subjectCode,
    teacherId: null,
    teacherName: null,
    teacherEmail: null,
    activeStudents,
    studentsWithMarks: t.studentsWithMarks,
    studentsSubmitted: t.isSubmitted ? activeStudents : 0,
    status: t.status,
    lastSubmittedAt: null,
  }));
}

export function ReportGeneratePanel({
  classId,
  termId,
  classes,
}: {
  classId: string;
  termId: string;
  classes: SchoolClass[];
}) {
  const selectedClass = classes.find((c) => c.id === classId);
  const [marksSource, setMarksSource] = useState<MarksSource>("term");
  const [examId, setExamId] = useState("");

  const examsQ = useReportExamOptions(classId, termId);
  const exams = useMemo(() => examsQ.data ?? [], [examsQ.data]);

  useEffect(() => {
    if (marksSource !== "exam") return;
    if (examId && exams.some((e) => e.id === examId)) return;
    const pick = exams.find((e) => e.allSubjectsSubmitted) ?? exams[0];
    setExamId(pick?.id ?? "");
  }, [marksSource, exams, examId]);

  useEffect(() => {
    if (marksSource !== "exam" || examsQ.isLoading) return;
    if (exams.length === 0) {
      setMarksSource("term");
      setExamId("");
    }
  }, [marksSource, exams.length, examsQ.isLoading]);

  const selectedExamValid = Boolean(examId && exams.some((e) => e.id === examId));
  const staleExamSelection = marksSource === "exam" && Boolean(examId) && !selectedExamValid;
  const linkedExamId = marksSource === "exam" && selectedExamValid ? examId : undefined;
  const readinessQ = useReportReadiness(classId, termId, linkedExamId);
  const listQ = useClassReports(classId, termId);
  const actions = useReportActions();

  const readinessStatus = queryStatus(readinessQ);
  const listStatus = queryStatus(listQ);

  const trackLabel = useMemo(() => {
    if (readinessQ.data?.track === "alevel") return "A-Level (UNEB)";
    if (readinessQ.data?.track === "cbc") return "O-Level (CBC)";
    if (selectedClass?.level === "A_LEVEL") return "A-Level (UNEB)";
    return "O-Level (CBC)";
  }, [readinessQ.data?.track, selectedClass?.level]);

  const isAlevel = listQ.data?.track === "alevel" || readinessQ.data?.track === "alevel";
  const isCbc = !isAlevel;
  const termReady = readinessQ.data?.termReady ?? readinessQ.data?.ready;
  const reportsLinkedToDeletedExam = (listQ.data?.reports ?? []).some(
    (r) => r.examLinkStatus === "deleted",
  );

  const examTrackingDisplay = useMemo(() => {
    if (!readinessQ.data?.examTracking?.length) return null;
    return {
      ...readinessQ.data,
      subjectTracking: examTrackingAsSubjectRows(
        readinessQ.data.examTracking,
        readinessQ.data.activeStudents,
      ),
    };
  }, [readinessQ.data]);

  const columns: Column<ClassReportRow>[] = [
    { key: "studentName", header: "Student", render: (r) => r.studentName },
    { key: "studentNumber", header: "Number", render: (r) => r.studentNumber },
    {
      key: "status",
      header: "Status",
      render: (r) => (
        <Badge tone={r.isApproved ? "success" : r.computedAt ? "warning" : "neutral"}>
          {r.isApproved ? "Approved" : r.computedAt ? "Draft" : "Not generated"}
        </Badge>
      ),
    },
    {
      key: "examLink",
      header: "Marks source",
      render: (r) => {
        if (r.examLinkStatus === "deleted") {
          return (
            <span title="Regenerate using term assessments or another exam">
              <Badge tone="warning">Linked exam deleted</Badge>
            </span>
          );
        }
        if (r.examLinkStatus === "active") {
          return <span className="text-xs text-muted-foreground">Formal exam</span>;
        }
        return <span className="text-xs text-muted-foreground">Term assessments</span>;
      },
    },
    ...(isAlevel
      ? [
          {
            key: "division",
            header: "Division / points",
            render: (r: ClassReportRow) =>
              r.division != null
                ? `${r.division}${r.totalPoints != null ? ` (${r.totalPoints} pts)` : ""}`
                : "—",
          } as Column<ClassReportRow>,
        ]
      : []),
    {
      key: "actions",
      header: "",
      render: (r) =>
        r.computedAt ? (
          <div className="flex flex-wrap gap-2">
            <ReportCardPreview reportId={r.id} label="PDF" />
            {!r.isApproved ? (
              <Button
                variant="secondary"
                className="!px-2 !py-1 text-xs"
                loading={actions.approve.isPending}
                onClick={() => void actions.approve.mutateAsync(r.id)}
              >
                Approve
              </Button>
            ) : null}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
  ];

  const onGenerate = async () => {
    await actions.generate.mutateAsync({
      classId,
      termId,
      examId: marksSource === "exam" && selectedExamValid ? examId : undefined,
    });
  };

  const generateError =
    actions.generate.error != null ? getApiErrorMessage(actions.generate.error) : null;
  const generateOk = actions.generate.data;

  const examOptions = [
    { value: "", label: exams.length ? "Select an exam" : "No exams for this class and term" },
    ...exams.map((e) => ({
      value: e.id,
      label: `${e.name} (${e.status}${e.allSubjectsSubmitted ? ", ready" : ""})`,
    })),
  ];

  const canGenerate =
    marksSource === "term"
      ? Boolean(termReady)
      : selectedExamValid &&
        Boolean(readinessQ.data?.examReady) &&
        (isAlevel || Boolean(termReady));

  return (
    <div className="space-y-6">
      <Card title="Report data source">
        <p className="mb-3 text-sm text-muted-foreground">
          Template: <strong>{trackLabel}</strong>. Choose term assessment marks or a formal exam linked to
          this class and term.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Select
            label="Marks source"
            options={[
              { value: "term", label: "Term assessments (default)" },
              { value: "exam", label: "Formal exam" },
            ]}
            value={marksSource}
            onChange={(e) => setMarksSource(e.target.value as MarksSource)}
          />
          {marksSource === "exam" ? (
            <Select
              label="Exam"
              options={examOptions}
              value={selectedExamValid ? examId : ""}
              onChange={(e) => setExamId(e.target.value)}
            />
          ) : (
            <div className="flex items-end">
              <p className="text-sm text-muted-foreground">
                Uses submitted CBC / A-Level term marks from the assessment module.
              </p>
            </div>
          )}
        </div>
        {marksSource === "exam" && isCbc ? (
          <div className="mt-3">
            <Alert tone="info">
              O-Level reports include <strong>competency ratings</strong> from term assessments plus a{" "}
              <strong>formal exam results</strong> section from the exam you select. Both must be ready
              before generating.
            </Alert>
          </div>
        ) : null}
        {marksSource === "exam" && isAlevel ? (
          <div className="mt-3">
            <Alert tone="info">
              A-Level report scores, grades, division, and points come entirely from the selected exam.
              Comments still come from term assessment records.
            </Alert>
          </div>
        ) : null}
        {staleExamSelection ? (
          <div className="mt-3">
            <Alert tone="info">
              The previously selected exam was deleted or is no longer available for this class and term.
              Choose another exam below, or switch to term assessments to generate report cards.
            </Alert>
          </div>
        ) : null}
        {marksSource === "exam" && !examsQ.isLoading && exams.length === 0 ? (
          <div className="mt-3">
            <Alert tone="info">
              No active exams for this class and term. Use term assessments, or create a new exam first.
            </Alert>
          </div>
        ) : null}
      </Card>

      <Card title="Term assessment submission">
        <p className="mb-3 text-sm text-muted-foreground">
          {marksSource === "exam" && isCbc
            ? "Required for CBC competencies on the report card."
            : marksSource === "exam" && isAlevel
              ? "Not used for scores when generating from an exam (comments only)."
              : "Track which teachers have submitted term marks before you generate report cards."}
        </p>
        <AsyncContent
          status={readinessStatus}
          loading={<FormSkeleton fields={6} />}
          error={
            <ErrorState
              message={
                readinessQ.error instanceof Error
                  ? readinessQ.error.message
                  : "Could not load submission tracking."
              }
              onRetry={() => void readinessQ.refetch()}
            />
          }
        >
          {readinessQ.data && marksSource === "term" ? (
            <div className="space-y-4">
              {!readinessQ.data.ready ? (
                <Alert tone="info">
                  {readinessQ.data.pendingCount} subject
                  {readinessQ.data.pendingCount === 1 ? "" : "s"} still need submitted term marks.
                </Alert>
              ) : (
                <Alert tone="success">All term subjects submitted — ready to generate.</Alert>
              )}
              <MarksSubmissionTracker data={readinessQ.data} />
            </div>
          ) : readinessQ.data && marksSource === "exam" && isCbc ? (
            <div className="space-y-4">
              {readinessQ.data.pendingCount > 0 ? (
                <Alert tone="info">
                  {readinessQ.data.pendingCount} term subject
                  {readinessQ.data.pendingCount === 1 ? "" : "s"} still need submission.
                </Alert>
              ) : (
                <Alert tone="success">All term assessment subjects submitted.</Alert>
              )}
              <MarksSubmissionTracker data={readinessQ.data} />
            </div>
          ) : readinessQ.data && marksSource === "exam" && isAlevel ? (
            <p className="text-sm text-muted-foreground">
              Term subject submission is not required when using exam scores for A-Level reports.
            </p>
          ) : null}
        </AsyncContent>
      </Card>

      {marksSource === "exam" && selectedExamValid ? (
        <Card title="Formal exam submission">
          <AsyncContent
            status={readinessStatus}
            loading={<FormSkeleton fields={4} />}
            error={null}
          >
            {examTrackingDisplay ? (
              <div className="space-y-4">
                {!readinessQ.data?.examReady ? (
                  <Alert tone="info">
                    All subjects on the selected exam must be submitted before generating reports.
                  </Alert>
                ) : (
                  <Alert tone="success">Exam marks are submitted — ready for report generation.</Alert>
                )}
                <MarksSubmissionTracker data={examTrackingDisplay} />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Select an exam to view submission status.</p>
            )}
          </AsyncContent>
        </Card>
      ) : null}

      <Card title="Generate report cards">
        {generateError ? <Alert tone="error">{generateError}</Alert> : null}
        {generateOk ? (
          <Alert tone="success">
            Generated {generateOk.count} {generateOk.track === "alevel" ? "A-Level" : "CBC"} report
            {generateOk.count === 1 ? "" : "s"}
            {generateOk.usedTermAssessmentsFallback
              ? " using term assessment marks (selected exam was unavailable)."
              : generateOk.sourceExamName
                ? ` from exam "${generateOk.sourceExamName}"`
                : ""}
            .
            {generateOk.warnings.length > 0
              ? ` Notes: ${generateOk.warnings.slice(0, 3).join(" ")}${generateOk.warnings.length > 3 ? "…" : ""}`
              : null}
          </Alert>
        ) : null}
        <div className="mt-3">
          <Button loading={actions.generate.isPending} disabled={!canGenerate} onClick={() => void onGenerate()}>
            Generate report cards
          </Button>
          {!canGenerate && readinessQ.data ? (
            <p className="mt-2 text-xs text-muted-foreground">
              {marksSource === "exam" && staleExamSelection
                ? "That exam was deleted — pick another exam or use term assessments."
                : marksSource === "exam" && !selectedExamValid
                  ? "Select an exam for this class and term."
                  : marksSource === "exam" && isCbc
                    ? "Submit all term assessments and all exam subjects, then try again."
                    : marksSource === "exam"
                      ? "Submit all subjects on the selected exam, then try again."
                      : "Submit all subject assessments for this class and term, then try again."}
            </p>
          ) : null}
        </div>
      </Card>

      <Card title="Generated reports">
        {reportsLinkedToDeletedExam ? (
          <div className="mb-3">
            <Alert tone="info">
              Some report cards still reference a deleted exam. Regenerate them using term assessments or
              another exam to refresh marks on the PDF.
            </Alert>
          </div>
        ) : null}
        <AsyncContent
          status={listStatus}
          loading={<FormSkeleton fields={4} />}
          error={
            <ErrorState
              message={listQ.error instanceof Error ? listQ.error.message : "Could not load reports."}
              onRetry={() => void listQ.refetch()}
            />
          }
        >
          <Table
            columns={columns as unknown as Column<Record<string, unknown>>[]}
            rows={(listQ.data?.reports ?? []) as unknown as Record<string, unknown>[]}
            emptyState={
              <p className="text-sm text-muted-foreground">
                No reports yet. Generate report cards when requirements above are met.
              </p>
            }
          />
        </AsyncContent>
      </Card>
    </div>
  );
}
