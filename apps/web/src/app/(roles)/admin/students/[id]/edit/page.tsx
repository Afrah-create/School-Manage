"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Student } from "@uganda-cbc-sms/shared";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { StudentEditForm } from "@/components/students/StudentEditForm";
import { Alert } from "@/components/ui/Alert";
import { Card } from "@/components/ui/Card";
import { apiGet } from "@/lib/api";

export default function AdminStudentEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params["id"]);
  const [st, setSt] = useState<Student | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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

  return (
    <PageWrapper title="Edit enrollment" description="Update student record and placement">
      <div className="mx-auto max-w-6xl space-y-6">
        <Link
          href={`/admin/students/${encodeURIComponent(id)}`}
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-ui hover:text-foreground"
        >
          <span aria-hidden>←</span>
          Back to profile
        </Link>

        {loading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-48 rounded bg-muted" />
            <div className="h-80 rounded-xl bg-muted" />
          </div>
        ) : null}

        {err ? <Alert tone="error">{err}</Alert> : null}

        {st ? (
          <>
            <Card>
              <div className="flex flex-col gap-1">
                <h2 className="font-heading text-xl font-semibold text-foreground sm:text-2xl">Edit {st.fullName}</h2>
                <p className="text-sm text-muted-foreground">
                  Student no: <span className="font-mono">{st.studentNumber}</span>
                </p>
              </div>
            </Card>
            <StudentEditForm
              key={id}
              studentId={id}
              initial={st}
              onCancel={() => router.push(`/admin/students/${encodeURIComponent(id)}`)}
            />
          </>
        ) : null}
      </div>
    </PageWrapper>
  );
}
