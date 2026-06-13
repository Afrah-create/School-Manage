"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { AcademicYear, FeeScheduleStatus, SchoolClass, Term } from "@uganda-cbc-sms/shared";
import { useQuery } from "@tanstack/react-query";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Select } from "@/components/ui/Select";
import { Table, type Column } from "@/components/ui/Table";
import { useClassEnrollmentSummary } from "@/hooks/useStudentsBrowse";
import { useFeeActions, useFeeScheduleReleases, useFeeStructures } from "@/hooks/useFees";
import { apiGet, getApiErrorMessage } from "@/lib/api";
import { feeScheduleStatusLabel, feeScheduleStatusTone } from "@/lib/feeSchedule";
import { formatUgx } from "@/lib/formatMoney";
import { toast } from "@/lib/toast";
import { FeeScheduleBillingPanel } from "./FeeScheduleBillingPanel";

type ClassRow = {
  classId: string;
  className: string;
  classStream: string | null;
  studentCount: number;
  categoryCount: number;
  totalPerStudent: number;
  status: FeeScheduleStatus | "not_set";
  termId: string;
};

export function FeeSchedulePublishBoard({
  initialYearId,
  initialTermId,
  initialClassId,
}: {
  initialYearId?: string;
  initialTermId?: string;
  initialClassId?: string;
}) {
  const actions = useFeeActions();
  const [yearId, setYearId] = useState(initialYearId ?? "");
  const [termId, setTermId] = useState(initialTermId ?? "");
  const [selectedClassId, setSelectedClassId] = useState(initialClassId ?? "");
  const [bulkPublishConfirm, setBulkPublishConfirm] = useState(false);

  const yearsQ = useQuery({
    queryKey: ["academic-years"],
    queryFn: () => apiGet<AcademicYear[]>("/academic/years"),
  });
  const termsQ = useQuery({
    queryKey: ["terms", yearId],
    queryFn: () => apiGet<Term[]>(`/academic/terms?academicYearId=${encodeURIComponent(yearId)}`),
    enabled: Boolean(yearId),
  });
  const classesQ = useQuery({
    queryKey: ["academic-classes"],
    queryFn: () => apiGet<SchoolClass[]>("/academic/classes"),
  });

  const structuresQ = useFeeStructures(termId ? { termId } : undefined);
  const schedulesQ = useFeeScheduleReleases(termId ? { termId } : undefined);
  const enrollmentQ = useClassEnrollmentSummary();

  const refetch = () => {
    void structuresQ.refetch();
    void schedulesQ.refetch();
  };

  const classRows = useMemo((): ClassRow[] => {
    if (!termId) return [];
    const classes = classesQ.data ?? [];
    const structures = structuresQ.data ?? [];
    const releases = schedulesQ.data ?? [];
    const enrollment = enrollmentQ.data ?? [];

    return classes.map((c) => {
      const items = structures.filter((s) => s.classId === c.id && s.termId === termId);
      const total = items.reduce((sum, i) => sum + Number(i.amount), 0);
      const release = releases.find((r) => r.classId === c.id && r.termId === termId);
      let status: ClassRow["status"] = "not_set";
      if (items.length > 0) {
        status = release?.status ?? "draft";
      }
      const enrolled = enrollment.find((e) => e.classId === c.id);
      return {
        classId: c.id,
        className: c.name,
        classStream: c.stream,
        studentCount: enrolled?.activeCount ?? 0,
        categoryCount: items.length,
        totalPerStudent: total,
        status,
        termId,
      };
    });
  }, [termId, classesQ.data, structuresQ.data, schedulesQ.data, enrollmentQ.data]);

  const counts = useMemo(() => {
    let draft = 0;
    let published = 0;
    let billed = 0;
    let notSet = 0;
    for (const r of classRows) {
      if (r.status === "draft") draft += 1;
      else if (r.status === "published") published += 1;
      else if (r.status === "billed") billed += 1;
      else notSet += 1;
    }
    return { draft, published, billed, notSet };
  }, [classRows]);

  const yearOptions = useMemo(
    () => [
      { value: "", label: "Select academic year" },
      ...(yearsQ.data ?? []).map((y) => ({ value: y.id, label: y.name })),
    ],
    [yearsQ.data],
  );

  const termOptions = useMemo(
    () => [
      { value: "", label: yearId ? "Select term" : "Select year first" },
      ...(termsQ.data ?? []).map((t) => ({ value: t.id, label: `Term ${t.termNumber}` })),
    ],
    [termsQ.data, yearId],
  );

  const publishClass = (row: ClassRow) => {
    const label = row.classStream ? `${row.className} · ${row.classStream}` : row.className;
    toast.confirm({
      title: "Publish fee schedule?",
      description: `Publish fees for ${label}? Bursars will be able to bill ${row.studentCount} active student${row.studentCount === 1 ? "" : "s"} at ${formatUgx(row.totalPerStudent)} UGX each.`,
      confirmLabel: "Publish now",
      onConfirm: async () => {
        try {
          await actions.publishSchedule.mutateAsync({ classId: row.classId, termId: row.termId });
          toast.success(`${label} is published. Bursars can bill this class.`, "Published");
          refetch();
        } catch (e) {
          toast.error(getApiErrorMessage(e), "Could not publish");
        }
      },
    });
  };

  const columns: Column<ClassRow>[] = [
    {
      key: "class",
      header: "Class",
      render: (r) => (
        <button
          type="button"
          className="text-left font-medium text-brand hover:underline"
          onClick={() => setSelectedClassId(r.classId)}
        >
          {r.classStream ? `${r.className} · ${r.classStream}` : r.className}
        </button>
      ),
    },
    {
      key: "students",
      header: "Students",
      render: (r) => <span className="tabular-nums">{r.studentCount}</span>,
    },
    {
      key: "fees",
      header: "Fee schedule",
      render: (r) =>
        r.categoryCount === 0 ? (
          <span className="text-muted-foreground">Not configured</span>
        ) : (
          <span>
            {r.categoryCount} categor{r.categoryCount === 1 ? "y" : "ies"} ·{" "}
            <span className="tabular-nums font-medium">{formatUgx(r.totalPerStudent)} UGX</span>
          </span>
        ),
    },
    {
      key: "status",
      header: "Status",
      render: (r) =>
        r.status === "not_set" ? (
          <Badge tone="neutral">No fees</Badge>
        ) : (
          <Badge tone={feeScheduleStatusTone(r.status)}>{feeScheduleStatusLabel(r.status)}</Badge>
        ),
    },
    {
      key: "action",
      header: "",
      render: (r) => {
        if (r.status === "not_set") {
          return (
            <Link
              href={`/admin/fees/structure?${new URLSearchParams({ yearId, termId, classId: r.classId }).toString()}`}
              className="text-sm font-medium text-brand hover:underline"
            >
              Set fees
            </Link>
          );
        }
        if (r.status === "draft") {
          return (
            <Button
              className="!px-3 !py-1.5 text-sm"
              loading={actions.publishSchedule.isPending}
              onClick={() => publishClass(r)}
            >
              Publish
            </Button>
          );
        }
        if (r.status === "published") {
          return (
            <Button
              variant="secondary"
              className="!px-3 !py-1.5 text-sm"
              onClick={() => setSelectedClassId(r.classId)}
            >
              Bill class
            </Button>
          );
        }
        return (
          <Button
            variant="secondary"
            className="!px-3 !py-1.5 text-sm"
            onClick={() => setSelectedClassId(r.classId)}
          >
            Manage
          </Button>
        );
      },
    },
  ];

  const selectedRow = classRows.find((r) => r.classId === selectedClassId);

  return (
    <div className="space-y-6">
      <Card title="Select term">
        <p className="mb-4 text-sm text-muted-foreground">
          Choose the term to see every class, publish fee schedules for bursars, and bill students.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Select
            label="Academic year"
            options={yearOptions}
            value={yearId}
            onChange={(e) => {
              setYearId(e.target.value);
              setTermId("");
              setSelectedClassId("");
            }}
          />
          <Select
            label="Term"
            options={termOptions}
            value={termId}
            disabled={!yearId}
            onChange={(e) => {
              setTermId(e.target.value);
              setSelectedClassId("");
            }}
          />
        </div>
      </Card>

      {!termId ? (
        <Alert tone="info">Select an academic year and term to publish fee schedules.</Alert>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-4">
            <Card title="Ready to publish">
              <p className="text-2xl font-semibold tabular-nums text-amber-700 dark:text-amber-400">
                {counts.draft}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Classes with fees in draft</p>
            </Card>
            <Card title="Published">
              <p className="text-2xl font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                {counts.published}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Bursars can bill these</p>
            </Card>
            <Card title="Billed">
              <p className="text-2xl font-semibold tabular-nums">{counts.billed}</p>
              <p className="mt-1 text-xs text-muted-foreground">Invoices created</p>
            </Card>
            <Card title="No fees set">
              <p className="text-2xl font-semibold tabular-nums">{counts.notSet}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                <Link className="text-brand hover:underline" href="/admin/fees/structure">
                  Configure in fee structure
                </Link>
              </p>
            </Card>
          </div>

          {counts.draft > 0 ? (
            <Alert tone="info">
              <strong>{counts.draft}</strong> class{counts.draft === 1 ? "" : "es"} still in{" "}
              <strong>Draft</strong>. Click <strong>Publish</strong> on each row or publish all drafts at once.
            </Alert>
          ) : null}

          {counts.draft > 0 ? (
            <div className="flex justify-end">
              <Button
                loading={actions.bulkPublishSchedules.isPending}
                onClick={() => setBulkPublishConfirm(true)}
              >
                Publish all drafts for term
              </Button>
            </div>
          ) : null}

          <Card title="All classes this term">
            {structuresQ.isLoading || classesQ.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading classes…</p>
            ) : (
              <Table
                columns={columns as unknown as Column<Record<string, unknown>>[]}
                rows={classRows as unknown as Record<string, unknown>[]}
                emptyState={<p className="text-sm text-muted-foreground">No classes found.</p>}
              />
            )}
          </Card>

          {selectedClassId && selectedRow ? (
            <FeeScheduleBillingPanel
              classId={selectedClassId}
              termId={termId}
              classLabel={
                selectedRow.classStream
                  ? `${selectedRow.className} · ${selectedRow.classStream}`
                  : selectedRow.className
              }
              termLabel={termOptions.find((o) => o.value === termId)?.label}
              onClose={() => setSelectedClassId("")}
              onUpdated={refetch}
            />
          ) : null}
        </>
      )}

      <ConfirmDialog
        open={bulkPublishConfirm}
        title="Publish all draft fee schedules?"
        description={`Publish ${counts.draft} draft class schedule(s) for this term so bursars can bill students.`}
        confirmLabel="Publish all"
        loading={actions.bulkPublishSchedules.isPending}
        onConfirm={() => {
          setBulkPublishConfirm(false);
          if (!termId) return;
          void actions.bulkPublishSchedules
            .mutateAsync({ termId, allDrafts: true })
            .then((result) => {
              toast.success(`Published ${result.publishedCount} class schedule(s).`, "Bulk publish complete");
              if (result.errors.length) {
                toast.error(`${result.errors.length} class(es) failed to publish.`, "Partial failure");
              }
              refetch();
            })
            .catch((e) => toast.error(getApiErrorMessage(e), "Bulk publish failed"));
        }}
        onCancel={() => setBulkPublishConfirm(false)}
      />
    </div>
  );
}
