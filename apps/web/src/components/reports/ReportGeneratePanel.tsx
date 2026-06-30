"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { SchoolClass } from "@uganda-cbc-sms/shared";
import { AsyncContent } from "@/components/feedback/AsyncContent";
import { ErrorState } from "@/components/feedback/ErrorState";
import { FormSkeleton } from "@/components/feedback/FormSkeleton";
import { MarksSubmissionTracker } from "@/components/reports/MarksSubmissionTracker";
import { ProjectWorkSubmissionTracker } from "@/components/reports/ProjectWorkSubmissionTracker";
import { ReportCardPreview } from "@/components/reports/ReportCardPreview";
import { ClassRankingLeaderboard } from "@/components/reports/ClassRankingLeaderboard";
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
  type ReportExamOption,
  type ReportReadiness,
  type SubjectSubmissionTrack,
} from "@/hooks/useReports";
import { getApiErrorMessage } from "@/lib/api";
import { queryStatus } from "@/lib/queryStatus";

type MarksSource = "term" | "exam";

function pickDefaultExam(exams: ReportExamOption[]): ReportExamOption | undefined {
  return (
    exams.find((e) => e.isDefault && e.readyForReports) ??
    exams.find((e) => e.readyForReports) ??
    exams.find((e) => e.isDefault) ??
    exams[0]
  );
}

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

function examSubmissionTrackerPayload(data: ReportReadiness): ReportReadiness {
  const tracking = examTrackingAsSubjectRows(data.examTracking ?? []);
  const submitted = tracking.filter((r) => r.status === "submitted").length;
  const pending = tracking.filter((r) => r.status !== "submitted").length;
  return {
    ...data,
    subjectTracking: tracking,
    submittedCount: submitted,
    totalSubjects: tracking.length,
    pendingCount: pending,
    teachersPending: [],
    ready: Boolean(data.examReady),
  };
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
  const userPickedSource = useRef(false);
  const appliedInitialExam = useRef(false);
  const contextKey = useRef(`${classId}:${termId}`);

  const examsQ = useReportExamOptions(classId, termId);
  const exams = useMemo(() => examsQ.data ?? [], [examsQ.data]);
  const examsLoaded = !examsQ.isLoading && examsQ.isFetched;

  /** Reset when class/term context changes (not on every exam list refetch). */
  useEffect(() => {
    const nextKey = `${classId}:${termId}`;
    if (contextKey.current === nextKey) return;
    contextKey.current = nextKey;
    userPickedSource.current = false;
    appliedInitialExam.current = false;
    setMarksSource("term");
    setExamId("");
  }, [classId, termId]);

  /** Deep link from an exam detail page — apply once per class/term context. */
  useEffect(() => {
    if (!initialExamId || !examsLoaded || appliedInitialExam.current || userPickedSource.current) return;
    if (!exams.some((e) => e.id === initialExamId)) return;
    appliedInitialExam.current = true;
    setMarksSource("exam");
    setExamId(initialExamId);
  }, [initialExamId, examsLoaded, exams, classId, termId]);

  const examInList = Boolean(examId && exams.some((e) => e.id === examId));
  const selectedExamValid = Boolean(examsLoaded && examInList);
  const staleExamSelection = marksSource === "exam" && Boolean(examId) && examsLoaded && !examInList;

  const onMarksSourceChange = (next: MarksSource) => {
    userPickedSource.current = true;
    if (next === "term") {
      setMarksSource("term");
      setExamId("");
      return;
    }
    if (!exams.length) return;
    const pick = pickDefaultExam(exams);
    setMarksSource("exam");
    setExamId(pick?.id ?? "");
  };

  const onExamChange = (id: string) => {
    userPickedSource.current = true;
    setExamId(id);
    if (id) setMarksSource("exam");
    else if (exams.length) setExamId(pickDefaultExam(exams)?.id ?? "");
  };

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
    if (readinessQ.data?.track === "cbc") return "O-Level";
    if (selectedClass?.level === "A_LEVEL") return "A-Level (UNEB)";
    return "O-Level";
  }, [readinessQ.data?.track, selectedClass?.level]);

  const isAlevel = listQ.data?.track === "alevel" || readinessQ.data?.track === "alevel";
  const isCbc = !isAlevel;
  const termReady = readinessQ.data?.termReady ?? readinessQ.data?.ready;
  const selectedExam = examInList ? exams.find((e) => e.id === examId) : undefined;
  const examNotClosed = !useTermOnly && Boolean(readinessQ.data?.examNotClosed);
  const examReadyForRelease = Boolean(selectedExam?.readyForReports);
  const reports = useMemo(() => {
    const rows = listQ.data?.reports ?? [];
    const withRank = rows.some((r) => r.ranking != null);
    if (!withRank) return rows;
    return [...rows].sort((a, b) => {
      const pa = a.ranking?.position ?? 9999;
      const pb = b.ranking?.position ?? 9999;
      if (pa !== pb) return pa - pb;
      return a.studentName.localeCompare(b.studentName);
    });
  }, [listQ.data?.reports]);
  const hasGenerated = reports.some((r) => r.computedAt);
  const reportsMissingRanking =
    hasGenerated && reports.length > 0 && !reports.some((r) => r.ranking != null);
  const reportsLinkedToDeletedExam = reports.some((r) => r.examLinkStatus === "deleted");
  const staleDraftReports = reports.filter(
    (r) => r.computedAt && !r.isApproved && r.examLinkStatus === "deleted",
  );
  const hasActiveExams = examsLoaded && exams.length > 0;
  const termOnlyNoExam = useTermOnly && !hasActiveExams;

  const examTrackingDisplay = useMemo(() => {
    if (useTermOnly || !readinessQ.data?.examTracking?.length) return null;
    return examSubmissionTrackerPayload(readinessQ.data);
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
    {
      key: "position",
      header: "Position",
      render: (r) =>
        r.rankingLabel ? (
          <span className="font-medium tabular-nums">{r.rankingLabel}</span>
        ) : r.computedAt ? (
          <span className="text-xs text-muted-foreground" title="Regenerate report cards to compute ranking">
            —
          </span>
        ) : (
          "—"
        ),
    },
    {
      key: "aggregate",
      header: "Ranking basis",
      render: (r) => (
        <span className="text-xs text-foreground">{r.aggregateLabel ?? (r.computedAt ? "—" : "")}</span>
      ),
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
    ...(isCbc
      ? [
          {
            key: "certification",
            header: "Certification",
            render: (r: ClassReportRow) => r.certificationLabel ?? "—",
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
            onChange={(e) => onMarksSourceChange(e.target.value as MarksSource)}
          />
          {marksSource === "exam" ? (
            <div className="space-y-2">
              <Select
                label="Official formal exam"
                options={examOptions}
                value={examInList ? examId : ""}
                disabled={!exams.length || examsQ.isLoading}
                onChange={(e) => onExamChange(e.target.value)}
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
                Uses submitted O-Level exam marks and A-Level term scores.
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
              O-Level term reports use <strong>compulsory exam averages</strong> per subject, optionally blended with{" "}
              <strong>project work</strong>. Subjects on{" "}
              <strong>{readinessQ.data?.defaultExamName ?? selectedExam?.name ?? "the selected exam"}</strong> do
              not need a separate term submission.
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
              ? "Reportable class subjects not covered by compulsory papers on the linked exam still need submitted term exam marks."
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
              {(readinessQ.data.examPaperSubjectCount ?? 0) > 0 ? (
                <p className="text-sm text-muted-foreground">
                  <strong>{readinessQ.data.examPaperSubjectCount}</strong> compulsory exam paper
                  {readinessQ.data.examPaperSubjectCount === 1 ? "" : "s"} on the formal exam use marks from that exam
                  only
                  {readinessQ.data.totalSubjects > 0
                    ? `; ${readinessQ.data.totalSubjects} still need submitted exam marks below.`
                    : " — all required exam marks are submitted."}
                </p>
              ) : null}
              {readinessQ.data.pendingCount > 0 ? (
                <Alert tone="info">
                  {readinessQ.data.pendingCount} term subject
                  {readinessQ.data.pendingCount === 1 ? "" : "s"} still need submission.
                </Alert>
              ) : readinessQ.data.totalSubjects === 0 &&
                (readinessQ.data.examPaperSubjectCount ?? 0) > 0 ? (
                <Alert tone="success">
                  All class subjects are covered on the formal exam — separate term exam entry is not required for those subjects.
                </Alert>
              ) : (
                <Alert tone="success">All required term assessment subjects are submitted.</Alert>
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

      {isCbc && readinessQ.data?.projectWorkTracking ? (
        <Card title="Project work submission">
          <p className="mb-3 text-sm text-muted-foreground">
            Only subjects marked <strong>Project work required</strong> on Class subjects need CA scores before
            reports are released (when project work is enabled in Assessment → Rules).
          </p>
          <AsyncContent status={readinessStatus} loading={<FormSkeleton fields={4} />} error={null}>
            {readinessQ.data.projectWorkReady === false ? (
              <Alert tone="info">
                {readinessQ.data.projectWorkPendingCount ?? 0} subject
                {(readinessQ.data.projectWorkPendingCount ?? 0) === 1 ? "" : "s"} still need project work
                scores.
              </Alert>
            ) : (
              <Alert tone="success">Project work requirements are satisfied.</Alert>
            )}
            <div className="mt-4">
              <ProjectWorkSubmissionTracker rows={readinessQ.data.projectWorkTracking} />
            </div>
          </AsyncContent>
        </Card>
      ) : null}

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
                    Every <strong>compulsory</strong> exam paper with registered students must be submitted before
                    generating reports. Optional papers do not block release.
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
            Generated {generateOk.count} {generateOk.track === "alevel" ? "A-Level" : "O-Level"} report
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
                        ? "Enter exam marks for subjects not on the linked formal exam, and ensure term exams are closed and submitted."
                        : marksSource === "exam"
                          ? "Submit all subjects on the exam, close it, then try again."
                          : "Submit all subject assessments for this class and term, then try again."}
            </p>
          ) : null}
        </div>
      </Card>

      <ClassRankingLeaderboard classId={classId} termId={termId} hasGenerated={hasGenerated} />

      <Card title="Released reports">
        {reportsMissingRanking ? (
          <div className="mb-3">
            <Alert tone="info">
              These report cards were generated before class ranking was enabled. Use{" "}
              <strong>Release report cards</strong> again (or regenerate stale drafts) to compute positions
              and aggregates.
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
