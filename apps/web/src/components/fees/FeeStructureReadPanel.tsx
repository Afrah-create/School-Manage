"use client";

import { useMemo, useState } from "react";
import type { FeeStructure } from "@uganda-cbc-sms/shared";
import {
  FeeStructureFilters,
  type FeeStructureFilterValues,
} from "@/components/fees/admin/FeeStructureFilters";
import { AsyncContent } from "@/components/feedback/AsyncContent";
import { ErrorState } from "@/components/feedback/ErrorState";
import { FormSkeleton } from "@/components/feedback/FormSkeleton";
import { Alert } from "@/components/ui/Alert";
import { Card } from "@/components/ui/Card";
import { Table, type Column } from "@/components/ui/Table";
import { useClassEnrollmentSummary } from "@/hooks/useStudentsBrowse";
import { useFeeStructures } from "@/hooks/useFees";
import { formatUgx } from "@/lib/formatMoney";
import { queryStatus } from "@/lib/queryStatus";

function classLabel(row: FeeStructure) {
  const name = row.className ?? "Class";
  return row.classStream ? `${name} · ${row.classStream}` : name;
}

export function FeeStructureReadPanel() {
  const [filters, setFilters] = useState<FeeStructureFilterValues>({
    yearId: "",
    termId: "",
    classId: "",
  });

  const apiFilters = useMemo(
    () => ({
      classId: filters.classId || undefined,
      termId: filters.termId || undefined,
    }),
    [filters.classId, filters.termId],
  );

  const structuresQ = useFeeStructures(apiFilters);
  const enrollmentQ = useClassEnrollmentSummary();
  const status = queryStatus(structuresQ);

  const enrollmentByClass = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of enrollmentQ.data ?? []) m.set(c.classId, c.activeCount);
    return m;
  }, [enrollmentQ.data]);

  const groups = useMemo(() => {
    const map = new Map<string, FeeStructure[]>();
    for (const r of structuresQ.data ?? []) {
      const key = `${r.classId}:${r.termId}`;
      const list = map.get(key) ?? [];
      list.push(r);
      map.set(key, list);
    }
    return [...map.entries()].map(([key, items]) => {
      const total = items.reduce((s, i) => s + Number(i.amount), 0);
      const first = items[0]!;
      return {
        key,
        items,
        total,
        label: `${classLabel(first)} · ${first.termLabel ?? "Term"}${first.yearName ? ` (${first.yearName})` : ""}`,
        studentCount: enrollmentByClass.get(first.classId) ?? 0,
      };
    });
  }, [structuresQ.data, enrollmentByClass]);

  const columns: Column<FeeStructure>[] = [
    { key: "category", header: "Category", render: (r) => r.category },
    {
      key: "amount",
      header: "Amount (UGX)",
      render: (r) => <span className="tabular-nums font-medium">{formatUgx(r.amount)}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <Alert tone="info">
        Fee amounts are set by the administrator. Use these schedules when billing classes or explaining
        balances to guardians.
      </Alert>
      <Card title="Filters">
        <FeeStructureFilters values={filters} onChange={setFilters} />
      </Card>
      <AsyncContent
        status={status}
        loading={<FormSkeleton fields={4} />}
        error={
          <ErrorState
            message={
              structuresQ.error instanceof Error
                ? structuresQ.error.message
                : "Could not load fee schedules."
            }
            onRetry={() => void structuresQ.refetch()}
          />
        }
      >
        {groups.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No fee schedules match your filters. Ask an administrator to configure fee structure for this class
            and term.
          </p>
        ) : (
          <div className="space-y-4">
            {groups.map((g) => (
              <Card key={g.key} title={g.label}>
                <p className="mb-3 text-sm text-muted-foreground">
                  {g.studentCount} active student{g.studentCount === 1 ? "" : "s"} · Expected per student:{" "}
                  <span className="font-semibold tabular-nums text-foreground">
                    {formatUgx(g.total)} UGX
                  </span>
                </p>
                <Table
                  columns={columns as unknown as Column<Record<string, unknown>>[]}
                  rows={g.items as unknown as Record<string, unknown>[]}
                  emptyState={null}
                />
              </Card>
            ))}
          </div>
        )}
      </AsyncContent>
    </div>
  );
}
