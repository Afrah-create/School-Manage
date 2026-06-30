"use client";

import type { AcademicYear, SchoolClass, Term } from "@uganda-cbc-sms/shared";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AsyncContent } from "@/components/feedback/AsyncContent";
import { ErrorState } from "@/components/feedback/ErrorState";
import { FormSkeleton } from "@/components/feedback/FormSkeleton";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { ProjectWorkSubmissionTracker } from "@/components/reports/ProjectWorkSubmissionTracker";
import { Alert } from "@/components/ui/Alert";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { useReportReadiness } from "@/hooks/useReports";
import { apiGet } from "@/lib/api";
import { pickDefaultAcademicYear } from "@/lib/academicLevel";
import { queryStatus } from "@/lib/queryStatus";

export default function AdminProjectWorkTrackerPage() {
  const [yearId, setYearId] = useState("");
  const [termId, setTermId] = useState("");
  const [classId, setClassId] = useState("");

  const yearsQ = useQuery({ queryKey: ["years"], queryFn: () => apiGet<AcademicYear[]>("/academic/years") });
  const termsQ = useQuery({ queryKey: ["terms"], queryFn: () => apiGet<Term[]>("/academic/terms") });
  const classesQ = useQuery({ queryKey: ["classes"], queryFn: () => apiGet<SchoolClass[]>("/academic/classes") });

  const years = yearsQ.data ?? [];
  const terms = useMemo(
    () => (termsQ.data ?? []).filter((t) => !yearId || t.academicYearId === yearId),
    [termsQ.data, yearId],
  );
  const classes = useMemo(
    () =>
      (classesQ.data ?? []).filter(
        (c) => (!yearId || c.academicYearId === yearId) && c.level === "O_LEVEL",
      ),
    [classesQ.data, yearId],
  );

  useEffect(() => {
    if (!yearId && years.length) setYearId(pickDefaultAcademicYear(years));
  }, [yearId, years]);

  useEffect(() => {
    if (!termId && terms.length) {
      const active = terms.find((t) => t.isActive) ?? terms[0];
      if (active) setTermId(active.id);
    }
  }, [termId, terms]);

  useEffect(() => {
    if (classId && !classes.some((c) => c.id === classId)) setClassId(classes[0]?.id ?? "");
    else if (!classId && classes[0]) setClassId(classes[0].id);
  }, [classId, classes]);

  const readinessQ = useReportReadiness(classId, termId);
  const status = queryStatus(readinessQ);

  return (
    <PageWrapper
      title="Project work tracker"
      description="Monitor continuous assessment (project work) entry per class and subject before report cards are released."
    >
      <p className="-mt-2 mb-4 text-sm text-muted-foreground">
        Mark subjects as <strong>Project work required</strong> on{" "}
        <Link href="/admin/academic/class-subjects" className="text-brand hover:underline">
          Class subjects
        </Link>
        . Teachers enter scores under Assessment → Project work. Weights and the global toggle are on{" "}
        <Link href="/admin/assessment/rules" className="text-brand hover:underline">
          Term grade policy
        </Link>
        .
      </p>

      <Card title="Class and term">
        <div className="grid gap-3 md:grid-cols-3">
          <Select
            label="Academic year"
            options={years.map((y) => ({ value: y.id, label: y.name }))}
            value={yearId}
            onChange={(e) => {
              setYearId(e.target.value);
              setTermId("");
              setClassId("");
            }}
          />
          <Select
            label="Term"
            options={terms.map((t) => ({ value: t.id, label: `Term ${t.termNumber}` }))}
            value={termId}
            onChange={(e) => setTermId(e.target.value)}
          />
          <Select
            label="Class"
            options={classes.map((c) => ({
              value: c.id,
              label: `${c.name} ${c.stream}`.trim(),
            }))}
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
          />
        </div>
      </Card>

      <div className="mt-4">
        <Card title="Submission status">
          <AsyncContent
            status={status}
            loading={<FormSkeleton fields={5} />}
            error={
              <ErrorState
                message={
                  readinessQ.error instanceof Error
                    ? readinessQ.error.message
                    : "Could not load project work status."
                }
                onRetry={() => void readinessQ.refetch()}
              />
            }
          >
            {readinessQ.data?.projectWorkTracking ? (
              <div className="space-y-4">
                {readinessQ.data.projectWorkReady === false ? (
                  <Alert tone="info">
                    {readinessQ.data.projectWorkPendingCount ?? 0} subject
                    {(readinessQ.data.projectWorkPendingCount ?? 0) === 1 ? "" : "s"} still need project
                    work scores.
                  </Alert>
                ) : (
                  <Alert tone="success">All required project work is complete for this class.</Alert>
                )}
                <ProjectWorkSubmissionTracker rows={readinessQ.data.projectWorkTracking} />
              </div>
            ) : null}
          </AsyncContent>
        </Card>
      </div>
    </PageWrapper>
  );
}
