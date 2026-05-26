"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import type { AcademicYear, ExamSummary, SchoolClass, Term } from "@uganda-cbc-sms/shared";
import { AdminExamFormModal } from "@/components/exams/AdminExamFormModal";
import { AdminExamRowActions } from "@/components/exams/AdminExamRowActions";
import { ExamStatusBadge } from "@/components/exams/ExamStatusBadge";
import { AsyncContent } from "@/components/feedback/AsyncContent";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { TableSkeleton } from "@/components/feedback/TableSkeleton";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Select } from "@/components/ui/Select";
import { Table, type Column } from "@/components/ui/Table";
import { useExam, useExamAdminActions, useExamsList } from "@/hooks/useExams";
import { apiGet, getApiErrorMessage } from "@/lib/api";
import { examDeleteDialogCopy, examDeleteSuccessMessage } from "@/lib/examDeleteCopy";
import { combineQueryStatus, queryStatus } from "@/lib/queryStatus";

export default function AdminExamsPage() {
  const [yearId, setYearId] = useState("");
  const [termId, setTermId] = useState("");
  const [classId, setClassId] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [formMode, setFormMode] = useState<"create" | "edit" | null>(null);
  const [editExamId, setEditExamId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ExamSummary | null>(null);
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
    status: statusFilter || undefined,
  });

  const editExamQ = useExam(editExamId ?? undefined);
  const actions = useExamAdminActions();
  const years = yearsQ.data ?? [];
  const terms = termsQ.data ?? [];
  const classes = classesQ.data ?? [];

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

  const listStatus = queryStatus(examsQ);
  const metaStatus = combineQueryStatus([yearsQ, classesQ]);
  const tableStatus = metaStatus === "loading" ? "loading" : listStatus;
  const tableError =
    examsQ.error instanceof Error
      ? examsQ.error.message
      : yearsQ.error instanceof Error
        ? yearsQ.error.message
        : "We couldn't load exams. Please try again.";

  const runAction = async (label: string, fn: () => Promise<unknown>) => {
    setFeedback({});
    try {
      await fn();
      setFeedback({ ok: label });
    } catch (e) {
      setFeedback({ err: getApiErrorMessage(e) });
    }
  };

  const columns: Column<ExamSummary>[] = [
    {
      key: "name",
      header: "Exam",
      render: (r) => (
        <Link className="font-medium text-brand underline" href={`/admin/exams/${r.id}`}>
          {r.name}
        </Link>
      ),
    },
    {
      key: "class",
      header: "Class",
      render: (r) => (
        <span>
          {r.className}
          {r.classStream ? ` · ${r.classStream}` : ""}
        </span>
      ),
    },
    { key: "date", header: "Date", render: (r) => r.examDate ?? "—" },
    { key: "max", header: "Max", render: (r) => String(r.maxScore) },
    { key: "subjects", header: "Subjects", render: (r) => String(r.subjectCount ?? "—") },
    { key: "status", header: "Status", render: (r) => <ExamStatusBadge status={r.status} /> },
    {
      key: "actions",
      header: "",
      render: (r) => (
        <AdminExamRowActions
          exam={r}
          busy={actions.open.isPending || actions.close.isPending || actions.reopen.isPending || actions.remove.isPending}
          onEdit={(exam) => {
            setEditExamId(exam.id);
            setFormMode("edit");
          }}
          onDelete={setDeleteTarget}
          onOpen={(exam) =>
            void runAction(`"${exam.name}" is now open for marking.`, () => actions.open.mutateAsync(exam.id))
          }
          onClose={(exam) =>
            void runAction(`"${exam.name}" was closed.`, () => actions.close.mutateAsync(exam.id))
          }
          onReopen={(exam) =>
            void runAction(`"${exam.name}" was reopened.`, () => actions.reopen.mutateAsync(exam.id))
          }
        />
      ),
    },
  ];

  const formOpen = formMode !== null;
  const editExam = formMode === "edit" ? editExamQ.data : undefined;
  const editReady = formMode !== "edit" || Boolean(editExam);

  return (
    <PageWrapper
      title="Exams"
      description="Create, edit, and manage formal exams. Open exams when teachers should enter marks, then close when complete."
    >
      {feedback.ok ? <Alert tone="success">{feedback.ok}</Alert> : null}
      {feedback.err ? <Alert tone="error">{feedback.err}</Alert> : null}

      <div className="mb-6">
        <Card title="Filters">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Select
              label="Academic year"
              options={years.map((y) => ({ value: y.id, label: y.name }))}
              value={yearId}
              onChange={(e) => {
                setYearId(e.target.value);
                setTermId("");
              }}
            />
            <Select
              label="Term"
              options={
                terms.length
                  ? terms.map((t) => ({ value: t.id, label: `Term ${t.termNumber}` }))
                  : [{ value: "", label: "Select a year first" }]
              }
              value={termId}
              onChange={(e) => setTermId(e.target.value)}
            />
            <Select
              label="Class"
              options={[
                { value: "", label: "All classes" },
                ...filteredClasses.map((c) => ({
                  value: c.id,
                  label: `${c.name}${c.stream ? ` · ${c.stream}` : ""}`,
                })),
              ]}
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
            />
            <Select
              label="Status"
              options={[
                { value: "", label: "All statuses" },
                { value: "draft", label: "Draft" },
                { value: "open", label: "Open" },
                { value: "closed", label: "Closed" },
              ]}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            />
          </div>
        </Card>
      </div>

      <div className="mb-4 flex justify-end">
        <Button onClick={() => setFormMode("create")}>Create exam</Button>
      </div>

      <AsyncContent
        status={tableStatus}
        loading={<TableSkeleton rows={6} cols={6} />}
        error={<ErrorState message={tableError} onRetry={() => void examsQ.refetch()} />}
      >
        <Table
          columns={columns as unknown as Column<Record<string, unknown>>[]}
          rows={(examsQ.data ?? []) as unknown as Record<string, unknown>[]}
          emptyState={
            <EmptyState
              title="No exams yet"
              description="Create an exam for a class and term, then open it when teachers should enter marks."
            />
          }
        />
      </AsyncContent>

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
        />
      ) : formMode === "edit" && editExamQ.isError ? (
        <Alert tone="error">
          {editExamQ.error instanceof Error ? editExamQ.error.message : "Could not load exam to edit."}
        </Alert>
      ) : null}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={deleteTarget ? examDeleteDialogCopy(deleteTarget).title : "Delete this exam?"}
        description={deleteTarget ? examDeleteDialogCopy(deleteTarget).description : ""}
        confirmLabel="Delete"
        onConfirm={() => {
          if (!deleteTarget) return;
          const target = deleteTarget;
          void runAction(examDeleteSuccessMessage(target), async () => {
            await actions.remove.mutateAsync(target.id);
          });
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </PageWrapper>
  );
}
