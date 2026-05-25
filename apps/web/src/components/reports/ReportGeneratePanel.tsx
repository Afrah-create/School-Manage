"use client";

import { useMemo } from "react";
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
import { Table, type Column } from "@/components/ui/Table";
import {
  useClassReports,
  useReportActions,
  useReportReadiness,
  type ClassReportRow,
} from "@/hooks/useReports";
import { getApiErrorMessage } from "@/lib/api";
import { queryStatus } from "@/lib/queryStatus";

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
  const readinessQ = useReportReadiness(classId, termId);
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
    await actions.generate.mutateAsync({ classId, termId });
  };

  const generateError =
    actions.generate.error != null ? getApiErrorMessage(actions.generate.error) : null;
  const generateOk = actions.generate.data;

  return (
    <div className="space-y-6">
      <Card title="Marks submission tracking">
        <p className="mb-3 text-sm text-muted-foreground">
          Template: <strong>{trackLabel}</strong>. Track which teachers have submitted marks before you
          generate report cards.
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
          {readinessQ.data ? (
            <div className="space-y-4">
              {!readinessQ.data.ready ? (
                <Alert tone="info">
                  {readinessQ.data.pendingCount} subject
                  {readinessQ.data.pendingCount === 1 ? "" : "s"} still need submitted marks.
                </Alert>
              ) : (
                <Alert tone="success">All subjects submitted — ready to generate report cards.</Alert>
              )}
              <MarksSubmissionTracker data={readinessQ.data} />
            </div>
          ) : null}
        </AsyncContent>
      </Card>

      <Card title="Generate report cards">
        {generateError ? <Alert tone="error">{generateError}</Alert> : null}
        {generateOk ? (
          <Alert tone="success">
            Generated {generateOk.count} {generateOk.track === "alevel" ? "A-Level" : "CBC"} report
            {generateOk.count === 1 ? "" : "s"}.
            {generateOk.warnings.length > 0
              ? ` Notes: ${generateOk.warnings.slice(0, 3).join(" ")}${generateOk.warnings.length > 3 ? "…" : ""}`
              : null}
          </Alert>
        ) : null}
        <div className="mt-3">
          <Button
            loading={actions.generate.isPending}
            disabled={!readinessQ.data?.ready}
            onClick={() => void onGenerate()}
          >
            Generate report cards
          </Button>
          {!readinessQ.data?.ready && readinessQ.data ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Submit all subject assessments for this class and term, then try again.
            </p>
          ) : null}
        </div>
      </Card>

      <Card title="Generated reports">
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
                No reports yet. Generate report cards when all subjects are submitted.
              </p>
            }
          />
        </AsyncContent>
      </Card>
    </div>
  );
}
