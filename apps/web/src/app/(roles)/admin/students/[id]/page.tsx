"use client";

import Link from "next/link";
import { StudentAvatar } from "@/components/students/StudentAvatar";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import type { Student } from "@uganda-cbc-sms/shared";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { FeeBalanceCard } from "@/components/fees/FeeBalanceCard";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { StudentEditModal } from "@/components/students/StudentEditModal";
import { apiDelete, apiGet } from "@/lib/api";
import { formatDateForInput } from "@/lib/dates";

function statusTone(s: Student["status"]): "success" | "warning" | "neutral" {
  if (s === "active") return "success";
  if (s === "withdrawn" || s === "transferred") return "warning";
  return "neutral";
}

function DetailItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-border pb-4 last:border-0 last:pb-0 sm:border-0 sm:pb-0">
      <dt className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium text-foreground">{children}</dd>
    </div>
  );
}

export default function AdminStudentProfilePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = String(params["id"]);
  const [st, setSt] = useState<Student | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmDel, setConfirmDel] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    if (searchParams.get("created") === "1") {
      setOk("Student enrolled successfully.");
    }
  }, [searchParams]);

  useEffect(() => {
    void (async () => {
      try {
        const row = await apiGet<Student>(`/students/${encodeURIComponent(id)}`);
        setSt(row);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleDelete = async () => {
    setDeleting(true);
    setErr(null);
    setOk(null);
    try {
      await apiDelete<{ deleted: boolean }>(`/students/${encodeURIComponent(id)}`);
      setConfirmDel(false);
      router.push("/admin/students");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Delete failed");
      setConfirmDel(false);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <PageWrapper title="Student profile" description="Enrollment, guardian details, and fees">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/admin/students"
            className="inline-flex w-fit items-center gap-2 text-sm font-medium text-muted-foreground transition-ui hover:text-foreground"
          >
            <span aria-hidden>←</span>
            Back to students
          </Link>
          <div className="flex flex-wrap gap-2">
            <Button type="button" className="w-full sm:w-auto" onClick={() => setEditOpen(true)}>
              Edit enrollment
            </Button>
            <Button type="button" variant="secondary" className="w-full sm:w-auto" onClick={() => setConfirmDel(true)}>
              Delete record
            </Button>
          </div>
        </div>

        <ConfirmDialog
          open={confirmDel}
          title="Delete this enrollment?"
          description="This permanently removes this learner's enrollment and related attendance, assessments, and fee records. This cannot be undone."
          confirmLabel="Delete permanently"
          danger
          loading={deleting}
          onCancel={() => {
            if (!deleting) setConfirmDel(false);
          }}
          onConfirm={() => void handleDelete()}
        />

        {loading ? (
          <div className="animate-pulse space-y-6">
            <div className="h-36 rounded-xl bg-muted" />
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="h-64 rounded-xl bg-muted lg:col-span-2" />
              <div className="h-40 rounded-xl bg-muted" />
            </div>
          </div>
        ) : null}

        {!loading ? (
          <div className="space-y-4">
            {ok ? <Alert tone="success">{ok}</Alert> : null}
            {err ? <Alert tone="error">{err}</Alert> : null}
          </div>
        ) : null}

        {st ? (
          <>
            <Card>
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-8">
                <div className="mx-auto sm:mx-0">
                  <StudentAvatar
                    fullName={st.fullName}
                    photoUrl={st.photoUrl}
                    size="lg"
                    className="!h-28 !w-28 !rounded-2xl !text-2xl"
                  />
                </div>
                <div className="min-w-0 flex-1 text-center sm:text-left">
                  <div className="flex flex-col items-center gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                    <h2 className="font-heading text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                      {st.fullName}
                    </h2>
                    <Badge tone={statusTone(st.status)}>{st.status.replace(/_/g, " ")}</Badge>
                  </div>
                  <p className="mt-1 font-mono text-sm text-muted-foreground">{st.studentNumber}</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {formatDateForInput(st.dateOfBirth) || st.dateOfBirth}
                    <span className="mx-2 text-border">·</span>
                    <span className="capitalize">{st.gender}</span>
                  </p>
                </div>
              </div>
            </Card>

            <div className="grid gap-6 lg:grid-cols-3">
              <div className="space-y-6 lg:col-span-2">
                <Card title="Enrollment">
                  <dl className="grid gap-6 sm:grid-cols-2">
                    <DetailItem label="Class">
                      {st.className
                        ? `${st.className}${st.classStream ? ` · ${st.classStream}` : ""}`
                        : st.classId ?? "—"}
                    </DetailItem>
                    <DetailItem label="Combination ID">{st.combinationId ?? "—"}</DetailItem>
                    <DetailItem label="Enrolled">{new Date(st.enrolledAt).toLocaleString()}</DetailItem>
                    <DetailItem label="Notes">{st.transferReason ? <span className="whitespace-pre-wrap font-normal">{st.transferReason}</span> : "—"}</DetailItem>
                  </dl>
                </Card>

                <Card title="Guardian & contact">
                  <dl className="grid gap-6 sm:grid-cols-2">
                    <DetailItem label="Guardian">{st.guardianName}</DetailItem>
                    <DetailItem label="Contact">{st.guardianContact}</DetailItem>
                    <DetailItem label="Email">{st.guardianEmail ?? "—"}</DetailItem>
                    <DetailItem label="Previous school">{st.previousSchool ?? "—"}</DetailItem>
                    <div className="sm:col-span-2">
                      <DetailItem label="Address">{st.address ? <span className="whitespace-pre-wrap font-normal">{st.address}</span> : "—"}</DetailItem>
                    </div>
                  </dl>
                </Card>
              </div>

              <div className="lg:sticky lg:top-6 lg:self-start">
                <FeeBalanceCard studentId={st.id} />
              </div>
            </div>
          </>
        ) : null}

        <StudentEditModal
          open={editOpen}
          studentId={id}
          onClose={() => setEditOpen(false)}
          onSaved={async () => {
            try {
              const row = await apiGet<Student>(`/students/${encodeURIComponent(id)}`);
              setSt(row);
              setOk("Student record updated.");
            } catch {
              /* list refresh not critical */
            }
          }}
        />
      </div>
    </PageWrapper>
  );
}
