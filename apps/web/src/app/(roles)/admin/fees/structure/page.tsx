"use client";

import { useMemo, useState } from "react";
import { AdminBulkBillCard } from "@/components/fees/admin/AdminBulkBillCard";
import { FeeStructureCopyPanel } from "@/components/fees/admin/FeeStructureCopyPanel";
import { FeeStructureFilters, type FeeStructureFilterValues } from "@/components/fees/admin/FeeStructureFilters";
import { FeeStructureForm } from "@/components/fees/admin/FeeStructureForm";
import { FeeStructureTable } from "@/components/fees/admin/FeeStructureTable";
import { AsyncContent } from "@/components/feedback/AsyncContent";
import { ErrorState } from "@/components/feedback/ErrorState";
import { FormSkeleton } from "@/components/feedback/FormSkeleton";
import { Card } from "@/components/ui/Card";
import { useClassEnrollmentSummary } from "@/hooks/useStudentsBrowse";
import { useFeeInvoices, useFeeStructures } from "@/hooks/useFees";
import { queryStatus } from "@/lib/queryStatus";

export default function AdminFeesStructurePage() {
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
  const invoicesQ = useFeeInvoices();
  const enrollmentQ = useClassEnrollmentSummary();

  const status = queryStatus(structuresQ);

  const lockedClassTerms = useMemo(() => {
    const set = new Set<string>();
    for (const inv of invoicesQ.data ?? []) {
      if (inv.classId && inv.termId) {
        set.add(`${inv.classId}:${inv.termId}`);
      }
    }
    return set;
  }, [invoicesQ.data]);

  const refetchStructures = () => void structuresQ.refetch();

  return (
    <div className="space-y-6">
      <Card title="Filters">
        <FeeStructureFilters values={filters} onChange={setFilters} />
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Add fee category">
          <FeeStructureForm
            defaultClassId={filters.classId}
            defaultTermId={filters.termId}
            onCreated={refetchStructures}
          />
        </Card>
        <Card title="Copy structure to another class">
          <FeeStructureCopyPanel onCopied={refetchStructures} />
        </Card>
      </div>

      <Card title="Fee structure by class">
        <AsyncContent
          status={status}
          loading={<FormSkeleton fields={5} />}
          error={
            <ErrorState
              message={
                structuresQ.error instanceof Error
                  ? structuresQ.error.message
                  : "Could not load fee structure."
              }
              onRetry={refetchStructures}
            />
          }
        >
          <FeeStructureTable
            rows={structuresQ.data ?? []}
            enrollment={enrollmentQ.data ?? []}
            lockedClassTerms={lockedClassTerms}
          />
        </AsyncContent>
      </Card>

      <AdminBulkBillCard />
    </div>
  );
}
