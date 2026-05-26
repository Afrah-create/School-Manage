"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import type { AcademicYear, ExamSummary, SchoolClass, Term } from "@uganda-cbc-sms/shared";
import { AdminExamFormModal } from "@/components/exams/AdminExamFormModal";
import { AdminExamsFilters } from "@/components/exams/AdminExamsFilters";
import { AdminExamsTable } from "@/components/exams/AdminExamsTable";
import { ExamWorkflowGuide } from "@/components/exams/ExamWorkflowGuide";
import { AsyncContent } from "@/components/feedback/AsyncContent";
import { ErrorState } from "@/components/feedback/ErrorState";
import { TableSkeleton } from "@/components/feedback/TableSkeleton";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { Alert } from "@/components/ui/Alert";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useExam, useExamAdminActions, useExamsList } from "@/hooks/useExams";
import { apiGet, getApiErrorMessage } from "@/lib/api";
import { examArchiveDialogCopy, examArchiveSuccessMessage } from "@/lib/examDeleteCopy";
import { combineQueryStatus, queryStatus } from "@/lib/queryStatus";

function countByStatus(exams: ExamSummary[]) {
  return {
    draft: exams.filter((e) => e.status === "draft").length,
    open: exams.filter((e) => e.status === "open").length,
    closed: exams.filter((e) => e.status === "closed").length,
  };
}

export default function AdminExamsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") === "archived" ? "archived" : "active";

  const [yearId, setYearId] = useState("");
  const [termId, setTermId] = useState("");
  const [classId, setClassId] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [formMode, setFormMode] = useState<"create" | "edit" | null>(null);
  const [editExamId, setEditExamId] = useState<string | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<ExamSummary | null>(null);
  const [feedback, setFeedback] = useState<{ ok?: string; err?: string }>({});

  const [yearsQ, termsQ, classesQ] = useQueries({
    queries: [
      { queryKey: ["academic-years"], queryFn: () => apiGet<AcademicYear[]>("/academic/years") },
      {
        queryKey: ["academic-terms", yearId],
        queryFn: () => apiGet<Term[]>(`/academic/terms?academicYearId=${encodeURIComponent(yearId)}`),
        enabled: Boolean(yearId),
      },
      { queryKey: ["academic-classes"], queryFn: () => apiGet<SchoolClass[]>("/academic/classes") },
    ],
  });

  const examsQ = useExamsList({
    academicYearId: yearId || undefined,
    termId: termId || undefined,
    classId: classId || undefined,
    status: tab === "active" ? statusFilter || undefined : undefined,
    archivedOnly: tab === "archived",
  });

  const editExamQ = useExam(editExamId ?? undefined);
  const actions = useExamAdminActions();
  const years = yearsQ.data ?? [];
  const terms = termsQ.data ?? [];
  const classes = classesQ.data ?? [];
  const exams = examsQ.data ?? [];

  useEffect(() => {
    if (years[0] && !yearId) setYearId(years[0].id);
  }, [years, yearId]);

  useEffect(() => {
    if (termId && terms.length && !terms.some((t) => t.id === termId)) setTermId("");
  }, [terms, termId]);

  const filteredClasses = useMemo(
    () => (yearId ? classes.filter((c) => c.academicYearId === yearId) : classes),
    [classes, yearId],
  );

  const statusCounts = useMemo(() => countByStatus(exams), [exams]);

  const listStatus = queryStatus(examsQ);
  const metaStatus = combineQueryStatus([yearsQ, classesQ]);
  const tableStatus = metaStatus === "loading" ? "loading" : listStatus;
  const tableError =
    examsQ.error instanceof Error
      ? examsQ.error.message
      : yearsQ.error instanceof Error
        ? yearsQ.error.message
        : "We couldn't load exams. Please try again.";

  const setTab = (next: "active" | "archived") => {
    const qp = new URLSearchParams(searchParams.toString());
    if (next === "archived") qp.set("tab", "archived");
    else qp.delete("tab");
    router.replace(`/admin/exams${qp.toString() ? `?${qp}` : ""}`);
  };

  const runAction = async (label: string, fn: () => Promise<unknown>) => {
    setFeedback({});
    try {
      await fn();
      setFeedback({ ok: label });
    } catch (e) {
      setFeedback({ err: getApiErrorMessage(e) });
    }
  };

  const actionsBusy =
    actions.open.isPending ||
    actions.close.isPending ||
    actions.reopen.isPending ||
    actions.archive.isPending;

  const formOpen = formMode !== null;
  const editExam = formMode === "edit" ? editExamQ.data : undefined;
  const editReady = formMode !== "edit" || Boolean(editExam);

  const listTitle = tab === "archived" ? `Archived exams (${exams.length})` : `Exams (${exams.length})`;

  return (
    <PageWrapper
      title="Exams"
      description="Formal assessments: plan, open for teacher marking, close when complete, then link to report cards"
    >
      <div className="space-y-6">
        {feedback.ok ? <Alert tone="success">{feedback.ok}</Alert> : null}
        {feedback.err ? <Alert tone="error">{feedback.err}</Alert> : null}

        <ExamWorkflowGuide />

        <Card>
          <AdminExamsFilters
            tab={tab}
            onTabChange={setTab}
            years={years}
            yearId={yearId}
            onYearChange={(id) => {
              setYearId(id);
              setTermId("");
            }}
            terms={terms}
            termId={termId}
            onTermChange={setTermId}
            classes={filteredClasses}
            classId={classId}
            onClassChange={setClassId}
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            showCreate={tab === "active"}
            onCreate={() => setFormMode("create")}
          />
        </Card>

        {tab === "active" && exams.length > 0 && !statusFilter ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Draft</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{statusCounts.draft}</p>
            </div>
            <div className="rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Open</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{statusCounts.open}</p>
            </div>
            <div className="rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Closed</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{statusCounts.closed}</p>
            </div>
          </div>
        ) : null}

        <Card title={listTitle}>
          <AsyncContent
            status={tableStatus}
            loading={<TableSkeleton rows={6} cols={6} />}
            error={<ErrorState message={tableError} onRetry={() => void examsQ.refetch()} />}
          >
            <AdminExamsTable
              exams={exams}
              archivedView={tab === "archived"}
              busy={actionsBusy}
              onEdit={(exam) => {
                setEditExamId(exam.id);
                setFormMode("edit");
              }}
              onArchive={setArchiveTarget}
              onOpen={(exam) =>
                void runAction(`"${exam.name}" is open for marking.`, () => actions.open.mutateAsync(exam.id))
              }
              onClose={(exam) =>
                void runAction(`"${exam.name}" was closed.`, () => actions.close.mutateAsync({ id: exam.id }))
              }
              onReopen={(exam) =>
                void runAction(`"${exam.name}" was reopened.`, () => actions.reopen.mutateAsync(exam.id))
              }
              emptyTitle={tab === "archived" ? "No archived exams" : "No exams yet"}
              emptyDescription={
                tab === "archived"
                  ? "Archived exams appear here when you retire an exam from active use."
                  : "Create an exam for a class and term, configure papers, then open it when teachers should enter marks."
              }
            />
          </AsyncContent>
        </Card>
      </div>

      {formOpen && editReady ? (
        <AdminExamFormModal
          mode={formMode === "edit" ? "edit" : "create"}
          open={formOpen}
          onClose={() => {
            setFormMode(null);
            setEditExamId(null);
          }}
          exam={editExam}
          defaultYearId={yearId}
          defaultTermId={termId}
          defaultClassId={classId}
          onSuccess={(msg) => setFeedback({ ok: msg })}
          onError={(msg) => setFeedback({ err: msg })}
          onCreated={(created) => {
            router.push(`/admin/exams/${created.id}?edit=0`);
          }}
        />
      ) : formMode === "edit" && editExamQ.isError ? (
        <Alert tone="error">
          {editExamQ.error instanceof Error ? editExamQ.error.message : "Could not load exam to edit."}
        </Alert>
      ) : null}

      <ConfirmDialog
        open={Boolean(archiveTarget)}
        title={archiveTarget ? examArchiveDialogCopy(archiveTarget).title : "Archive this exam?"}
        description={archiveTarget ? examArchiveDialogCopy(archiveTarget).description : ""}
        confirmLabel="Archive"
        danger
        loading={actions.archive.isPending}
        onConfirm={() => {
          if (!archiveTarget) return;
          const target = archiveTarget;
          void runAction(examArchiveSuccessMessage(target), async () => {
            await actions.archive.mutateAsync(target.id);
          });
          setArchiveTarget(null);
        }}
        onCancel={() => setArchiveTarget(null)}
      />
    </PageWrapper>
  );
}
