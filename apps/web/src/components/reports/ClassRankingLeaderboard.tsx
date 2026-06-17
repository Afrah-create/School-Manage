"use client";

import type { RankingMethod } from "@uganda-cbc-sms/shared";
import { AsyncContent } from "@/components/feedback/AsyncContent";
import { ErrorState } from "@/components/feedback/ErrorState";
import { FormSkeleton } from "@/components/feedback/FormSkeleton";
import { Alert } from "@/components/ui/Alert";
import { Card } from "@/components/ui/Card";
import { Table, type Column } from "@/components/ui/Table";
import { useClassRankings, type ClassReportRow } from "@/hooks/useReports";
import { queryStatus } from "@/lib/queryStatus";

const METHOD_DESCRIPTION: Record<RankingMethod, string> = {
  alevel_best3_points:
    "UNEB-style ranking: sum of points from the best 3 subjects (lower aggregate = better position).",
  olevel_best8_points:
    "Legacy UCE points ranking (deprecated for CBC track).",
  olevel_composite_average:
    "Mean composite score across subjects (CA 20% + EOC 80%; higher average = better position).",
  exam_average_percent:
    "Mean exam score as a percentage across papers (higher average = better position).",
  cbc_competency_average:
    "Mean CBC competency score (A=5 … E=1; higher average = better position).",
};

export function ClassRankingLeaderboard({
  classId,
  termId,
  hasGenerated,
}: {
  classId: string;
  termId: string;
  hasGenerated: boolean;
}) {
  const rankingsQ = useClassRankings(classId, termId);
  const status = queryStatus(rankingsQ);
  const data = rankingsQ.data;
  const leaderboard = data?.leaderboard ?? [];
  const method = data?.method;

  if (!hasGenerated) return null;

  const columns: Column<ClassReportRow>[] = [
    {
      key: "position",
      header: "Position",
      render: (r) => (
        <span className="font-medium tabular-nums">{r.rankingLabel ?? "—"}</span>
      ),
    },
    { key: "studentName", header: "Student", render: (r) => r.studentName },
    { key: "studentNumber", header: "Number", render: (r) => r.studentNumber },
    {
      key: "aggregate",
      header: "Ranking basis",
      render: (r) => (
        <span className="text-sm text-foreground">{r.aggregateLabel ?? "—"}</span>
      ),
    },
    ...(data?.track === "alevel"
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
    ...(data?.track === "cbc"
      ? [
          {
            key: "certification",
            header: "Certification",
            render: (r: ClassReportRow) => r.certificationLabel ?? "—",
          } as Column<ClassReportRow>,
        ]
      : []),
  ];

  return (
    <Card title="Class rankings">
      <p className="mb-3 text-sm text-muted-foreground">
        Positions use standard competition ranking (ties share the same place). Rankings are computed
        when report cards are generated or regenerated.
      </p>
      <AsyncContent
        status={status}
        loading={<FormSkeleton fields={4} />}
        error={
          <ErrorState
            message={
              rankingsQ.error instanceof Error
                ? rankingsQ.error.message
                : "Could not load class rankings."
            }
            onRetry={() => void rankingsQ.refetch()}
          />
        }
      >
        {leaderboard.length === 0 ? (
          <Alert tone="info">
            No ranking data yet. Regenerate report cards to compute class positions and aggregates.
          </Alert>
        ) : (
          <div className="space-y-3">
            {method ? (
              <p className="text-xs text-muted-foreground">{METHOD_DESCRIPTION[method]}</p>
            ) : null}
            <Table
              columns={columns as unknown as Column<Record<string, unknown>>[]}
              rows={leaderboard as unknown as Record<string, unknown>[]}
              emptyState={null}
            />
          </div>
        )}
      </AsyncContent>
    </Card>
  );
}
