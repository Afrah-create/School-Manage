"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { AcademicYear, Term } from "@uganda-cbc-sms/shared";
import { AdminExamFormModal } from "@/components/exams/AdminExamFormModal";
import { ExamStatusBadge } from "@/components/exams/ExamStatusBadge";
import { AsyncContent } from "@/components/feedback/AsyncContent";
import { ErrorState } from "@/components/feedback/ErrorState";
import { FormSkeleton } from "@/components/feedback/FormSkeleton";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useExam, useExamAdminActions } from "@/hooks/useExams";
import { apiGet, getApiErrorMessage } from "@/lib/api";
import { examDeleteDialogCopy, examDeleteSuccessMessage } from "@/lib/examDeleteCopy";
import { queryStatus } from "@/lib/queryStatus";

export default function AdminExamDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = typeof params.id === "string" ? params.id : "";
  const examQ = useExam(id);
  const actions = useExamAdminActions();
  const [feedback, setFeedback] = useState<{ ok?: string; err?: string }>({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editOpen, setEditOpen] = useState(searchParams.get("edit") === "1");

  const yearsQ = useQuery({
    queryKey: ["academic-years"],
    queryFn: () => apiGet<AcademicYear[]>("/academic/years"),
  });
  const termsQ = useQuery({
    queryKey: ["academic-terms", examQ.data?.academicYearId],
    queryFn: () =>
      apiGet<Term[]>(`/academic/terms?academicYearId=${encodeURIComponent(examQ.data!.academicYearId)}`),
    enabled: Boolean(examQ.data?.academicYearId),
  });

  const status = queryStatus(examQ);
  const exam = examQ.data;

  const yearLabel = useMemo(() => {
    if (!exam) return "—";
    return yearsQ.data?.find((y) => y.id === exam.academicYearId)?.name ?? "—";
  }, [exam, yearsQ.data]);

  const termLabel = useMemo(() => {
    if (!exam) return "—";
    const term = termsQ.data?.find((t) => t.id === exam.termId);
    return term ? `Term ${term.termNumber}` : "—";
  }, [exam, termsQ.data]);

  useEffect(() => {
    if (searchParams.get("edit") === "1" && exam?.status === "draft") setEditOpen(true);
  }, [searchParams, exam?.status]);

  const run = async (label: string, fn: () => Promise<unknown>) => {
    setFeedback({});
    try {
      await fn();
      setFeedback({ ok: label });
      await examQ.refetch();
    } catch (e) {
      setFeedback({ err: getApiErrorMessage(e) });
    }
  };

  return (
    <PageWrapper title={exam?.name ?? "Exam"} description="View and manage this exam">
      <Link href="/admin/exams" className="mb-4 inline-block text-sm font-medium text-brand hover:underline">
        ← All exams
      </Link>

      {feedback.ok ? (
        <div className="mb-4">
          <Alert tone="success">{feedback.ok}</Alert>
        </div>
      ) : null}
      {feedback.err ? (
        <div className="mb-4">
          <Alert tone="error">{feedback.err}</Alert>
        </div>
      ) : null}

      <AsyncContent
        status={status}
        loading={<FormSkeleton fields={5} />}
        error={
          <ErrorState
            message={examQ.error instanceof Error ? examQ.error.message : "We couldn't load this exam."}
            onRetry={() => void examQ.refetch()}
          />
        }
      >
        {exam ? (
          <div className="space-y-6">
            <Card title="Overview">
              <dl className="grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">Academic year</dt>
                  <dd className="font-medium">{yearLabel}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Term</dt>
                  <dd className="font-medium">{termLabel}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Class</dt>
                  <dd className="font-medium">
                    {exam.className}
                    {exam.classStream ? ` · ${exam.classStream}` : ""}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Status</dt>
                  <dd>
                    <ExamStatusBadge status={exam.status} />
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Exam date</dt>
                  <dd>{exam.examDate ?? "Not set"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Maximum score</dt>
                  <dd>{exam.maxScore}</dd>
                </div>
              </dl>
              <div className="mt-4 flex flex-wrap gap-2">
                {exam.status === "draft" ? (
                  <>
                    <Button variant="secondary" onClick={() => setEditOpen(true)}>
                      Edit draft
                    </Button>
                    <Button
                      loading={actions.open.isPending}
                      onClick={() =>
                        void run("Exam is now open. Teachers assigned to these subjects can enter marks.", () =>
                          actions.open.mutateAsync(id),
                        )
                      }
                    >
                      Open for marking
                    </Button>
                  </>
                ) : null}
                {exam.status === "open" ? (
                  <Button
                    variant="secondary"
                    loading={actions.close.isPending}
                    onClick={() =>
                      void run("Exam closed. Teachers can no longer change marks.", () => actions.close.mutateAsync(id))
                    }
                  >
                    Close exam
                  </Button>
                ) : null}
                {exam.status === "closed" ? (
                  <Button
                    loading={actions.reopen.isPending}
                    onClick={() =>
                      void run("Exam reopened for marking.", () => actions.reopen.mutateAsync(id))
                    }
                  >
                    Reopen for marking
                  </Button>
                ) : null}
                <Button
                  variant="secondary"
                  className="text-red-700 dark:text-red-400"
                  onClick={() => setConfirmDelete(true)}
                >
                  Delete exam
                </Button>
              </div>
            </Card>

            <Card title="Subjects">
              <ul className="divide-y divide-border text-sm">
                {exam.subjects.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                    <span>
                      <span className="font-medium">{s.subjectCode}</span> — {s.subjectName}
                    </span>
                    <span className="flex items-center gap-2">
                      {s.isSubmitted ? (
                        <span className="text-xs text-emerald-700 dark:text-emerald-300">Submitted</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Pending</span>
                      )}
                      {s.isSubmitted ? (
                        <Button
                          variant="secondary"
                          className="!px-2 !py-1 text-xs"
                          loading={actions.unlock.isPending}
                          onClick={() =>
                            void run(`Marks for ${s.subjectCode} unlocked for editing.`, () =>
                              actions.unlock.mutateAsync({ examId: id, subjectId: s.subjectId }),
                            )
                          }
                        >
                          Unlock
                        </Button>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        ) : null}
      </AsyncContent>

      {exam ? (
        <AdminExamFormModal
          mode="edit"
          open={editOpen}
          exam={exam}
          onClose={() => setEditOpen(false)}
          onSuccess={(msg) => {
            setFeedback({ ok: msg });
            void examQ.refetch();
          }}
          onError={(msg) => setFeedback({ err: msg })}
        />
      ) : null}

      <ConfirmDialog
        open={confirmDelete}
        title={exam ? examDeleteDialogCopy(exam).title : "Delete this exam?"}
        description={exam ? examDeleteDialogCopy(exam).description : ""}
        confirmLabel="Delete"
        onConfirm={() => {
          if (!exam) return;
          void run(examDeleteSuccessMessage(exam), async () => {
            await actions.remove.mutateAsync(id);
            window.location.href = "/admin/exams";
          });
          setConfirmDelete(false);
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </PageWrapper>
  );
}
