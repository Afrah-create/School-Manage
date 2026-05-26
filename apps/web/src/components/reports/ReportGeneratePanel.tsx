"use client";

import { useEffect, useMemo, useState } from "react";
import type { SchoolClass } from "@uganda-cbc-sms/shared";
import { AsyncContent } from "@/components/feedback/AsyncContent";
import { ErrorState } from "@/components/feedback/ErrorState";
import { FormSkeleton } from "@/components/feedback/FormSkeleton";
import { MarksSubmissionTracker } from "@/components/reports/MarksSubmissionTracker";
import { ReportCardPreview } from "@/components/reports/ReportCardPreview";
import { ReportReleaseSteps } from "@/components/reports/ReportReleaseSteps";
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

function examTrackingAsSubjectRows(rows: ExamSubjectTrack[]): SubjectSubmissionTrack[] {
  return rows.map((t) => ({
    subjectId: t.subjectId,
    subjectName: t.subjectName,
    subjectCode: t.subjectCode,
    teacherId: null,
    teacherName: null,
    teacherEmail: null,
    activeStudents: t.activeStudents,
    studentsWithMarks: t.studentsWithMarks,
    studentsSubmitted:
      t.status === "not_applicable" ? 0 : t.isSubmitted ? t.activeStudents : 0,
    status: t.status === "not_applicable" ? "submitted" : t.status,
    lastSubmittedAt: null,
  }));
}

export function ReportGeneratePanel({
  classId,
  termId,
  classes,
  initialExamId,
  initialMarksSource,
}: {
  classId: string;
  termId: string;
  classes: SchoolClass[];
  initialExamId?: string;
  initialMarksSource?: MarksSource;
}) {
  const selectedClass = classes.find((c) => c.id === classId);
  const [marksSource, setMarksSource] = useState<MarksSource>(initialMarksSource ?? "term");
  const [examId, setExamId] = useState(initialExamId ?? "");
  const [setAsOfficial, setSetAsOfficial] = useState(true);

  const examsQ = useReportExamOptions(classId, termId);
  const exams = useMemo(() => examsQ.data ?? [], [examsQ.data]);

  useEffect(() => {
    if (!initialExamId || examsQ.isLoading) return;
    if (exams.some((e) => e.id === initialExamId)) {
      setMarksSource("exam");
      setExamId(initialExamId);
    } else {
      setMarksSource("term");
      setExamId("");
    }
  }, [initialExamId, exams, examsQ.isLoading]);

  const examsLoaded = !examsQ.isLoading && examsQ.isFetched;
  const selectedExamValid = Boolean(examsLoaded && examId && exams.some((e) => e.id === examId));
  const staleExamSelection = marksSource === "exam" && Boolean(examId) && examsLoaded && !selectedExamValid;

  useEffect(() => {
    if (!examsLoaded || marksSource !== "exam") return;
    if (selectedExamValid) return;
    if (exams.length === 0) {
      setMarksSource("term");
      setExamId("");
      return;
    }
    setMarksSource("term");
    setExamId("");
  }, [examsLoaded, marksSource, selectedExamValid, exams.length]);

  useEffect(() => {
    if (marksSource !== "exam" || !examsLoaded || examId) return;
    if (exams.length === 0) {
      setMarksSource("term");
      return;
    }
    const pick =
      exams.find((e) => e.isDefault && e.readyForReports) ??
      exams.find((e) => e.readyForReports) ??
      exams.find((e) => e.isDefault) ??
      exams[0];
    setExamId(pick?.id ?? "");
  }, [marksSource, examsLoaded, examId, exams]);

  const readinessExamId =
    marksSource === "exam" && examId ? examId : undefined;
  const readinessQ = useReportReadiness(classId, termId, readinessExamId);
  const examLinkInvalid = Boolean(readinessQ.data?.examLinkInvalid);
  const useTermOnly = marksSource === "term" || staleExamSelection || examLinkInvalid;
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
  const selectedExam = selectedExamValid ? exams.find((e) => e.id === examId) : undefined;
  const examNotClosed = !useTermOnly && Boolean(readinessQ.data?.examNotClosed);
  const examReadyForRelease = Boolean(selectedExam?.readyForReports);
  const reports = listQ.data?.reports ?? [];
  const reportsLinkedToDeletedExam = reports.some((r) => r.examLinkStatus === "deleted");
  const staleDraftReports = reports.filter(
    (r) => r.computedAt && !r.isApproved && r.examLinkStatus === "deleted",
  );
  const hasGenerated = reports.some((r) => r.computedAt);
  const hasActiveExams = examsLoaded && exams.length > 0;
  const termOnlyNoExam = useTermOnly && !hasActiveExams;

  const examTrackingDisplay = useMemo(() => {
    if (useTermOnly || !readinessQ.data?.examTracking?.length) return null;
    return {
      ...readinessQ.data,
      subjectTracking: examTrackingAsSubjectRows(readinessQ.data.examTracking),
    };
  }, [readinessQ.data, useTermOnly]);

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
      key: "source",
      header: "Generated from",
      render: (r) => {
        if (r.examLinkStatus === "deleted") {
          return (
            <span title="Regenerate to refresh this snapshot">
              <Badge tone="warning">Stale — exam removed</Badge>
            </span>
          );
        }
        return (
          <span className="text-xs text-foreground">
            {r.reportSourceLabel ?? (r.examLinkStatus === "active" ? "Formal exam" : "Term assessments")}
            {r.payloadGeneratedAt ? (
              <span className="mt-0.5 block text-muted-foreground">
                {new Date(r.payloadGeneratedAt).toLocaleDateString()}
              </span>
            ) : null}
          </span>
        );
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

  const releaseBody = () => ({
    classId,
    termId,
    examId:
      !useTermOnly && selectedExamValid && examReadyForRelease ? examId : undefined,
  });

  const onGenerate = async () => {
    await actions.generate.mutateAsync(releaseBody());
    if (
      setAsOfficial &&
      !useTermOnly &&
      selectedExamValid &&
      examId &&
      examReadyForRelease
    ) {
      await actions.setTermDefault.mutateAsync({ classId, termId, examId });
    }
  };

  const onRegenerateStale = async () => {
    await actions.regenerate.mutateAsync(releaseBody());
  };

  const generateError =
    actions.generate.error != null
      ? getApiErrorMessage(actions.generate.error)
      : actions.regenerate.error != null
        ? getApiErrorMessage(actions.regenerate.error)
        : null;
  const generateOk = actions.generate.data ?? actions.regenerate.data;

  const examOptions = [
    { value: "", label: exams.length ? "Select a closed exam" : "No exams for this class and term" },
    ...exams.map((e) => {
      const tags = [
        e.isDefault ? "official" : null,
        e.status,
        e.readyForReports ? "ready for reports" : e.status === "open" ? "close when done" : null,
      ]
        .filter(Boolean)
        .join(", ");
      return { value: e.id, label: `${e.name} (${tags})` };
    }),
  ];

  const canGenerate = useTermOnly
    ? Boolean(termReady)
    : selectedExamValid &&
      examReadyForRelease &&
      !examNotClosed &&
      Boolean(readinessQ.data?.examReady) &&
      (isAlevel || Boolean(termReady));

  return (
    <div className="space-y-6">
      <Card title="Report release workflow">
        <p className="mb-4 text-sm text-muted-foreground">
          {termOnlyNoExam ? (
            <>
              There is <strong>no active formal exam</strong> for this class and term (exams you deleted are
              separate). Report cards will use <strong>term assessment marks</strong> from the Assessment
              module only.
            </>
          ) : (
            <>
              Official report cards are <strong>snapshots</strong> at generation time. Close the formal exam
              before release; archive the exam after reports are issued.
            </>
          )}
        </p>
        <ReportReleaseSteps
          termReady={Boolean(termReady)}
          examReady={!useTermOnly && marksSource === "exam" ? examReadyForRelease : undefined}
          hasGenerated={hasGenerated}
          termOnlyNoExam={termOnlyNoExam}
        />
      </Card>

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
            <div className="space-y-2">
              <Select
                label="Official formal exam"
                options={examOptions}
                value={selectedExamValid ? examId : ""}
                onChange={(e) => setExamId(e.target.value)}
              />
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-border"
                  checked={setAsOfficial}
                  onChange={(e) => setSetAsOfficial(e.target.checked)}
                />
                Remember as official exam for this class and term
              </label>
            </div>
          ) : (
            <div className="flex items-end">
              <p className="text-sm text-muted-foreground">
                Uses submitted CBC / A-Level term marks from the assessment module.
              </p>
            </div>
          )}
        </div>
        {readinessQ.data?.clearedStaleDefault ? (
          <div className="mt-3">
            <Alert tone="info">
              The previously saved official exam was removed or archived. Report release will use term
              assessments unless you pick another closed exam.
            </Alert>
          </div>
        ) : null}
        {!useTermOnly && marksSource === "exam" && readinessQ.data?.defaultExamName ? (
          <div className="mt-3">
            <Alert tone="info">
              Official exam for this class/term: <strong>{readinessQ.data.defaultExamName}</strong>
            </Alert>
          </div>
        ) : null}
        {examLinkInvalid || staleExamSelection ? (
          <div className="mt-3">
            <Alert tone="info">
              The selected exam no longer exists for this class and term. Requirements below are for{" "}
              <strong>term assessments only</strong>. Switch marks source to &quot;Term assessments&quot; or
              choose another closed exam.
            </Alert>
          </div>
        ) : null}
        {marksSource === "exam" && examNotClosed && selectedExam ? (
          <div className="mt-3">
            <Alert tone="info">
              <strong>{selectedExam.name}</strong> is still {selectedExam.status}. Close it under Admin → Exams
              after all subjects are submitted, then return here to release report cards.
            </Alert>
          </div>
        ) : null}
        {marksSource === "exam" && selectedExam && !examReadyForRelease && !examNotClosed ? (
          <div className="mt-3">
            <Alert tone="info">
              This exam is not ready for official reports yet. Ensure every subject is submitted, then close the
              exam.
            </Alert>
          </div>
        ) : null}
        {marksSource === "exam" && isCbc ? (
          <div className="mt-3">
            <Alert tone="info">
              O-Level reports include <strong>competency ratings</strong> from term assessments plus a{" "}
              <strong>formal exam results</strong> section. Both must be ready before release.
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
        {marksSource === "exam" && examsLoaded && exams.length === 0 ? (
          <div className="mt-3">
            <Alert tone="info">
              No active exams for this class and term. Use term assessments, or create a new exam first.
            </Alert>
          </div>
        ) : null}
      </Card>

      <Card title="Term assessment submission (not formal exams)">
        <p className="mb-3 text-sm text-muted-foreground">
          {useTermOnly ? (
            <>
              These subjects come from <strong>class–subject assignments</strong> (Academic → Teacher workload),
              not from the Exams module. Deleting an exam does not remove this list. Teachers enter marks under{" "}
              <strong>Assessment</strong> for S1 B / Term 1.
            </>
          ) : marksSource === "exam" && isCbc
              ? "Required for CBC competencies on the report card."
              : marksSource === "exam" && isAlevel
                ? "Not used for scores when releasing from an exam (comments only)."
                : "Track which teachers have submitted term marks before you release report cards."}
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
          {readinessQ.data && useTermOnly ? (
            <div className="space-y-4">
              {!termReady ? (
                <Alert tone="info">
                  {readinessQ.data.pendingCount} subject
                  {readinessQ.data.pendingCount === 1 ? "" : "s"} still need submitted term marks.
                </Alert>
              ) : (
                <Alert tone="success">All term subjects submitted — ready to release report cards.</Alert>
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

      {marksSource === "exam" && selectedExamValid && !useTermOnly ? (
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
                    Every exam paper with registered students must be submitted before generating reports.
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

      <Card title="Release report cards">
        {reportsLinkedToDeletedExam ? (
          <div className="mb-3 space-y-2">
            <Alert tone="info">
              {staleDraftReports.length > 0
                ? `${staleDraftReports.length} draft report(s) reference a removed exam. Regenerate to refresh snapshots (approved reports are unchanged).`
                : "Some report snapshots reference a removed exam. Regenerate draft reports if needed."}
            </Alert>
            {staleDraftReports.length > 0 ? (
              <Button
                variant="secondary"
                loading={actions.regenerate.isPending}
                disabled={!termReady && !canGenerate}
                onClick={() => void onRegenerateStale()}
              >
                Regenerate stale draft reports
              </Button>
            ) : null}
          </div>
        ) : null}
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
            Release report cards
          </Button>
          {!canGenerate && readinessQ.data ? (
            <p className="mt-2 text-xs text-muted-foreground">
              {useTermOnly
                ? "Submit all subject assessments for this class and term, then try again."
                : marksSource === "exam" && examNotClosed
                  ? "Close the selected exam before releasing official report cards."
                  : marksSource === "exam" && !examReadyForRelease
                    ? "Choose a closed exam with all subjects submitted."
                    : marksSource === "exam" && !selectedExamValid
                      ? "Select the official exam for this class and term."
                      : marksSource === "exam" && isCbc
                        ? "Complete term assessments and the formal exam, then try again."
                        : marksSource === "exam"
                          ? "Submit all subjects on the exam, close it, then try again."
                          : "Submit all subject assessments for this class and term, then try again."}
            </p>
          ) : null}
        </div>
      </Card>

      <Card title="Released reports">
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
