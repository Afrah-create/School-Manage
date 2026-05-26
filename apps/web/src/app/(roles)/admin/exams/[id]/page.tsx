"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { AcademicYear, Term } from "@uganda-cbc-sms/shared";
import { AdminExamFormModal } from "@/components/exams/AdminExamFormModal";
import { ExamLifecycleStepper } from "@/components/exams/ExamLifecycleStepper";
import { ExamMarkingProgressCard } from "@/components/exams/ExamMarkingProgressCard";
import { ExamStudentEntriesCard } from "@/components/exams/ExamStudentEntriesCard";
import { ExamStatusBadge } from "@/components/exams/ExamStatusBadge";
import { PermanentDeleteExamDialog } from "@/components/exams/PermanentDeleteExamDialog";
import { AsyncContent } from "@/components/feedback/AsyncContent";
import { ErrorState } from "@/components/feedback/ErrorState";
import { FormSkeleton } from "@/components/feedback/FormSkeleton";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  useExam,
  useExamAdminActions,
  useExamDeletionImpact,
} from "@/hooks/useExams";
import { apiGet, getApiErrorMessage } from "@/lib/api";
import {
  examArchiveDialogCopy,
  examArchiveSuccessMessage,
  examPermanentDeleteSuccessMessage,
} from "@/lib/examDeleteCopy";
import { queryStatus } from "@/lib/queryStatus";

export default function AdminExamDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = typeof params.id === "string" ? params.id : "";
  const viewArchived = searchParams.get("archived") === "1";

  const examQ = useExam(id, { includeArchived: viewArchived });
  const actions = useExamAdminActions();
  const [feedback, setFeedback] = useState<{ ok?: string; err?: string }>({});
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [confirmPermanent, setConfirmPermanent] = useState(false);
  const [confirmForceClose, setConfirmForceClose] = useState(false);
  const [editOpen, setEditOpen] = useState(searchParams.get("edit") === "1");

  const impactQ = useExamDeletionImpact(id, confirmPermanent);

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
  const isArchived = Boolean(exam?.isArchived);

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
    if (searchParams.get("edit") === "1" && exam?.status === "draft" && !isArchived) setEditOpen(true);
  }, [searchParams, exam?.status, isArchived]);

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

  const tryClose = async (force: boolean) => {
    setConfirmForceClose(false);
    await run(
      force
        ? "Exam closed with incomplete subject submissions."
        : "Exam closed. Teachers can no longer change marks.",
      () => actions.close.mutateAsync({ id, force }),
    );
  };

  return (
    <PageWrapper
      title={exam?.name ?? "Exam"}
      description="Plan, open for marking, close when complete, then use results on report cards"
    >
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
            <ExamLifecycleStepper status={exam.status} isArchived={isArchived} />

            {exam.status !== "draft" && exam.markingProgress ? (
              <ExamMarkingProgressCard progress={exam.markingProgress} status={exam.status} />
            ) : null}

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
                  <dd className="flex flex-wrap items-center gap-2">
                    <ExamStatusBadge status={exam.status} />
                    {isArchived ? (
                      <span className="text-xs font-medium text-amber-700 dark:text-amber-300">Archived</span>
                    ) : null}
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

              {!isArchived ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {exam.status === "draft" ? (
                    <>
                      <Button variant="secondary" onClick={() => setEditOpen(true)}>
                        Edit draft
                      </Button>
                      <Button
                        loading={actions.open.isPending}
                        onClick={() =>
                          void run(
                            "Exam is open. Teachers can enter marks for students registered on each paper.",
                            () => actions.open.mutateAsync(id),
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
                      onClick={() => {
                        if (exam.markingProgress.pendingSubjects > 0) {
                          setConfirmForceClose(true);
                          return;
                        }
                        void tryClose(false);
                      }}
                    >
                      Close exam
                    </Button>
                  ) : null}
                {exam.status === "closed" ? (
                  <>
                    <Link
                      href={`/admin/reports?tab=actions&classId=${encodeURIComponent(exam.classId)}&termId=${encodeURIComponent(exam.termId)}&yearId=${encodeURIComponent(exam.academicYearId)}&examId=${encodeURIComponent(id)}`}
                    >
                      <Button type="button">Release report cards</Button>
                    </Link>
                    <Button
                      variant="secondary"
                      loading={actions.reopen.isPending}
                      onClick={() =>
                        void run("Exam reopened for marking.", () => actions.reopen.mutateAsync(id))
                      }
                    >
                      Reopen for marking
                    </Button>
                  </>
                ) : null}
                </div>
              ) : (
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    loading={actions.restore.isPending}
                    onClick={() =>
                      void run("Exam restored to active lists.", async () => {
                        await actions.restore.mutateAsync(id);
                        router.replace(`/admin/exams/${id}`);
                      })
                    }
                  >
                    Restore exam
                  </Button>
                </div>
              )}
            </Card>

            {!isArchived ? (
              <ExamStudentEntriesCard examId={id} examStatus={exam.status} />
            ) : null}

            {!isArchived ? (
              <Card title="Papers & teacher submission">
                <p className="mb-3 text-sm text-muted-foreground">
                  Each subject teacher enters marks only for students registered on that paper, then submits. Unlock
                  only when corrections are approved.
                </p>
                <ul className="divide-y divide-border text-sm">
                  {exam.subjects.map((s) => (
                    <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                      <span>
                        <span className="font-medium">{s.subjectCode}</span> — {s.subjectName}
                        <span className="ml-2 text-xs text-muted-foreground">
                          {s.isCompulsory ? "Compulsory" : "Optional"} · {s.entrantsCount ?? 0} entered
                        </span>
                      </span>
                      <span className="flex items-center gap-2">
                        {s.isSubmitted ? (
                          <span className="text-xs text-emerald-700 dark:text-emerald-300">Submitted</span>
                        ) : (
                          <span className="text-xs text-amber-700 dark:text-amber-300">Awaiting submission</span>
                        )}
                        {s.isSubmitted && exam.status !== "draft" ? (
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
            ) : null}

            <Card title="Retention">
              <p className="mb-3 text-sm text-muted-foreground">
                <strong>Archive</strong> hides the exam from teachers and report pickers while keeping marks for audit.{" "}
                <strong>Permanent delete</strong> removes the exam and all marks from the database — only for archived
                exams or unused drafts.
              </p>
              <div className="flex flex-wrap gap-2">
                {!isArchived ? (
                  <Button
                    variant="secondary"
                    className="text-amber-800 dark:text-amber-300"
                    onClick={() => setConfirmArchive(true)}
                  >
                    Archive exam
                  </Button>
                ) : null}
                <Button
                  variant="secondary"
                  className="text-red-700 dark:text-red-400"
                  onClick={() => setConfirmPermanent(true)}
                >
                  Permanently delete…
                </Button>
              </div>
            </Card>
          </div>
        ) : null}
      </AsyncContent>

      {exam && !isArchived ? (
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
        open={confirmArchive}
        title={exam ? examArchiveDialogCopy(exam).title : "Archive this exam?"}
        description={exam ? examArchiveDialogCopy(exam).description : ""}
        confirmLabel="Archive"
        danger
        loading={actions.archive.isPending}
        onConfirm={() => {
          if (!exam) return;
          void run(examArchiveSuccessMessage(exam), async () => {
            await actions.archive.mutateAsync(id);
            router.push("/admin/exams?tab=archived");
          });
          setConfirmArchive(false);
        }}
        onCancel={() => setConfirmArchive(false)}
      />

      <ConfirmDialog
        open={confirmForceClose}
        title="Close with pending subjects?"
        description={
          exam
            ? `${exam.markingProgress.pendingSubjects} subject(s) have not been submitted yet. Close anyway only if leadership accepts incomplete results.`
            : ""
        }
        confirmLabel="Force close"
        danger
        loading={actions.close.isPending}
        onConfirm={() => void tryClose(true)}
        onCancel={() => setConfirmForceClose(false)}
      />

      <PermanentDeleteExamDialog
        open={confirmPermanent}
        impact={impactQ.data ?? null}
        loading={actions.permanentDelete.isPending || impactQ.isLoading}
        onCancel={() => setConfirmPermanent(false)}
        onConfirm={(confirmName) => {
          if (!impactQ.data) return;
          const impact = impactQ.data;
          void run(examPermanentDeleteSuccessMessage(impact), async () => {
            await actions.permanentDelete.mutateAsync({ id, confirmName });
            router.push("/admin/exams");
          });
          setConfirmPermanent(false);
        }}
      />
    </PageWrapper>
  );
}
