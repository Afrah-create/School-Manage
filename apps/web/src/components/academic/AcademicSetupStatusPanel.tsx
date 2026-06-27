"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { AcademicYear, AssessmentConfig, StructureStatus } from "@uganda-cbc-sms/shared";
import { CheckCircle2, Circle } from "lucide-react";
import { AsyncContent } from "@/components/feedback/AsyncContent";
import { ErrorState } from "@/components/feedback/ErrorState";
import { FormSkeleton } from "@/components/feedback/FormSkeleton";
import { Alert } from "@/components/ui/Alert";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { pickDefaultAcademicYear } from "@/lib/academicLevel";
import { apiGet } from "@/lib/api";
import { queryKeys, STRUCTURAL_STALE_MS } from "@/lib/queryKeys";
import { getApiTenantSlug } from "@/lib/tenantHost";

type AcademicSummary = {
  years: number;
  terms: number;
  classes: number;
  subjects: number;
  classSubjects: number;
  combinations: number;
  cbcStrands: number;
  gradingScales: number;
};

type ClassSubjectRow = { id: string };

type WorkloadSummary = {
  totalSlots: number;
  assignedSlots: number;
  unassignedSlots: number;
};

type SetupStepStatus = "done" | "pending" | "manual";

type SetupStep = {
  id: string;
  label: string;
  description: string;
  href: string;
  status: SetupStepStatus;
};

function stepHref(path: string, academicYearId: string) {
  const join = path.includes("?") ? "&" : "?";
  return `${path}${join}academicYearId=${encodeURIComponent(academicYearId)}`;
}

function SetupStepRow({ step }: { step: SetupStep }) {
  const StatusIcon = step.status === "done" ? CheckCircle2 : Circle;
  const iconClass =
    step.status === "done"
      ? "text-emerald-600 dark:text-emerald-400"
      : step.status === "manual"
        ? "text-amber-600 dark:text-amber-400"
        : "text-muted-foreground";

  return (
    <li className="flex flex-col gap-3 border-b border-border py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-1 gap-3">
        <StatusIcon className={`mt-0.5 h-5 w-5 shrink-0 ${iconClass}`} aria-hidden />
        <div className="min-w-0">
          <p className="font-medium text-foreground">{step.label}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">{step.description}</p>
        </div>
      </div>
      <Link
        href={step.href}
        className="inline-flex h-9 shrink-0 items-center justify-center self-start rounded-lg border border-border bg-card px-3 text-sm font-medium text-foreground transition-ui hover:bg-accent hover:text-accent-foreground sm:self-center"
      >
        {step.status === "manual" ? "Review manually" : "Open setup"}
      </Link>
    </li>
  );
}

export function AcademicSetupStatusPanel({ initialYearId = "" }: { initialYearId?: string }) {
  const tenantSlug = getApiTenantSlug();
  const [academicYearId, setAcademicYearId] = useState(initialYearId);

  const yearsQ = useQuery({
    queryKey: ["academic-years", tenantSlug],
    queryFn: () => apiGet<AcademicYear[]>("/academic/years"),
    staleTime: STRUCTURAL_STALE_MS,
  });

  const years = yearsQ.data ?? [];

  useEffect(() => {
    if (initialYearId) {
      setAcademicYearId(initialYearId);
      return;
    }
    if (!academicYearId && years.length) {
      setAcademicYearId(pickDefaultAcademicYear(years));
    }
  }, [years, academicYearId, initialYearId]);

  const yearReady = Boolean(academicYearId);

  const structureQ = useQuery({
    queryKey: queryKeys.structureStatus(tenantSlug, academicYearId || "none"),
    queryFn: () =>
      apiGet<StructureStatus>(
        `/academic/structure/status?academicYearId=${encodeURIComponent(academicYearId)}`,
      ),
    enabled: yearReady,
    staleTime: 30_000,
  });

  const classSubjectsQ = useQuery({
    queryKey: queryKeys.academicSetupStatus(tenantSlug, `${academicYearId}-class-subjects`),
    queryFn: () =>
      apiGet<ClassSubjectRow[]>(
        `/academic/class-subjects?academicYearId=${encodeURIComponent(academicYearId)}`,
      ),
    enabled: yearReady,
    staleTime: 30_000,
  });

  const workloadQ = useQuery({
    queryKey: queryKeys.academicSetupStatus(tenantSlug, `${academicYearId}-workload`),
    queryFn: () =>
      apiGet<WorkloadSummary>(
        `/academic/workload-summary?academicYearId=${encodeURIComponent(academicYearId)}`,
      ),
    enabled: yearReady,
    staleTime: 30_000,
  });

  const summaryQ = useQuery({
    queryKey: queryKeys.academicSummary(tenantSlug),
    queryFn: () => apiGet<AcademicSummary>("/academic/summary"),
    staleTime: STRUCTURAL_STALE_MS,
  });

  const assessmentConfigQ = useQuery({
    queryKey: ["assessment-config", tenantSlug],
    queryFn: () => apiGet<AssessmentConfig>("/settings/assessment-config"),
    staleTime: STRUCTURAL_STALE_MS,
  });

  const selectedYear = years.find((y) => y.id === academicYearId);

  const steps = useMemo((): SetupStep[] => {
    const structure = structureQ.data;
    const classSubjectCount = classSubjectsQ.data?.length ?? 0;
    const workload = workloadQ.data;
    const summary = summaryQ.data;
    const assessmentConfig = assessmentConfigQ.data;

    const classCount = (structure?.oLevelClasses ?? 0) + (structure?.aLevelClasses ?? 0);
    const termsCount = structure?.terms ?? 0;
    const structureDone = termsCount > 0 && classCount > 0;

    const classSubjectsDone = classSubjectCount > 0;

    let teacherStep: SetupStep;
    if (workloadQ.isError) {
      teacherStep = {
        id: "teachers",
        label: "Teacher assignments made",
        description: "Could not load assignment coverage automatically — review subject teachers on Teaching assignments.",
        href: stepHref("/admin/academic/teacher-assignments", academicYearId),
        status: "manual",
      };
    } else if (!workload || workload.totalSlots === 0) {
      teacherStep = {
        id: "teachers",
        label: "Teacher assignments made",
        description: "Assign a subject teacher to each class–subject slot after class subjects are configured.",
        href: stepHref("/admin/academic/teacher-assignments", academicYearId),
        status: "pending",
      };
    } else if (workload.unassignedSlots > 0) {
      teacherStep = {
        id: "teachers",
        label: "Teacher assignments made",
        description: `${workload.assignedSlots} of ${workload.totalSlots} class–subject slots have a teacher assigned (${workload.unassignedSlots} still open).`,
        href: stepHref("/admin/academic/teacher-assignments", academicYearId),
        status: "pending",
      };
    } else {
      teacherStep = {
        id: "teachers",
        label: "Teacher assignments made",
        description: `All ${workload.totalSlots} class–subject slots have a subject teacher assigned for this year.`,
        href: stepHref("/admin/academic/teacher-assignments", academicYearId),
        status: "done",
      };
    }

    const strandsCount = summary?.cbcStrands ?? 0;
    const gradingCount = summary?.gradingScales ?? 0;
    const caPolicyLoaded = assessmentConfigQ.isSuccess && assessmentConfig != null;
    const gradingPolicyDone = gradingCount > 0 && caPolicyLoaded;

    return [
      {
        id: "structure",
        label: "Academic year, terms & classes",
        description: structureDone
          ? `${termsCount} term(s) and ${classCount} class(es) provisioned for ${selectedYear?.name ?? "this year"}.`
          : `Create terms and classes for ${selectedYear?.name ?? "the selected year"} before curriculum setup.`,
        href: stepHref("/admin/academic/structure", academicYearId),
        status: structureDone ? "done" : "pending",
      },
      {
        id: "class-subjects",
        label: "Subjects assigned to classes",
        description: classSubjectsDone
          ? `${classSubjectCount} class–subject slot(s) configured for this academic year.`
          : "Map subjects onto each class timetable for this year.",
        href: stepHref("/admin/academic/class-subjects", academicYearId),
        status: classSubjectsDone ? "done" : "pending",
      },
      teacherStep,
      {
        id: "strands",
        label: "CBC strands & competencies",
        description:
          strandsCount > 0
            ? `${strandsCount} CBC strand(s) defined across subjects (school-wide catalog).`
            : "Define NCDC strands per O-Level subject before teachers record competency ratings.",
        href: "/admin/academic/cbc-strands",
        status: strandsCount > 0 ? "done" : "pending",
      },
      {
        id: "grading",
        label: "Grading & CA policy",
        description: gradingPolicyDone
          ? `${gradingCount} grade band row(s) saved and CA policy loaded from settings.`
          : gradingCount > 0
            ? "O-Level grade bands exist — review CA weights and project-work policy on Grading scales."
            : "Configure O-Level A–E grade bands and CA / project-work policy.",
        href: "/admin/academic/grading-scales#ca-policy",
        status: gradingPolicyDone ? "done" : "pending",
      },
    ];
  }, [
    academicYearId,
    assessmentConfigQ.data,
    assessmentConfigQ.isSuccess,
    classSubjectsQ.data,
    selectedYear?.name,
    structureQ.data,
    summaryQ.data,
    workloadQ.data,
    workloadQ.isError,
  ]);

  const status = useMemo(() => {
    if (yearsQ.isPending) return "loading" as const;
    if (yearsQ.isError) return "error" as const;
    if (yearsQ.isSuccess && years.length === 0) return "empty" as const;
    if (!yearReady) return "loading" as const;
    if (
      structureQ.isPending ||
      classSubjectsQ.isPending ||
      summaryQ.isPending ||
      assessmentConfigQ.isPending ||
      workloadQ.isPending
    ) {
      return "loading" as const;
    }
    if (structureQ.isError || classSubjectsQ.isError || summaryQ.isError || assessmentConfigQ.isError) {
      return "error" as const;
    }
    return "success" as const;
  }, [
    academicYearId,
    assessmentConfigQ.isError,
    assessmentConfigQ.isPending,
    classSubjectsQ.isError,
    classSubjectsQ.isPending,
    structureQ.isError,
    structureQ.isPending,
    summaryQ.isError,
    summaryQ.isPending,
    workloadQ.isPending,
    yearReady,
    years.length,
    yearsQ.isError,
    yearsQ.isPending,
    yearsQ.isSuccess,
  ]);

  const refetchAll = () => {
    void yearsQ.refetch();
    void structureQ.refetch();
    void classSubjectsQ.refetch();
    void workloadQ.refetch();
    void summaryQ.refetch();
    void assessmentConfigQ.refetch();
  };

  return (
    <div className="space-y-6">
      <Card title="Academic year">
        <Select
          label="Checklist scope"
          value={academicYearId}
          onChange={(e) => setAcademicYearId(e.target.value)}
          options={years.map((y) => ({
            value: y.id,
            label: y.isActive ? `${y.name} (active)` : y.name,
          }))}
        />
        <p className="mt-2 text-sm text-muted-foreground">
          Steps A–C use counts for <strong className="font-medium text-foreground">{selectedYear?.name ?? "…"}</strong>.
          Strands and grading scales are school-wide (not year-specific).
        </p>
      </Card>

      <AsyncContent
        status={status}
        loading={<FormSkeleton fields={5} />}
        error={
          <ErrorState
            message="Could not load academic setup status. Check your connection and try again."
            onRetry={refetchAll}
          />
        }
        empty={
          yearsQ.isSuccess && years.length === 0 ? (
            <Alert tone="info">
              No academic years yet.{" "}
              <Link href="/admin/academic/structure" className="font-medium text-brand hover:underline">
                Create a year
              </Link>{" "}
              to begin setup.
            </Alert>
          ) : undefined
        }
      >
        <Card title="Setup checklist">
          <ol className="divide-y divide-border">
            {steps.map((step) => (
              <SetupStepRow key={step.id} step={step} />
            ))}
          </ol>
        </Card>

        <div className="mt-4">
          <Alert tone="info">
            Teachers can begin entering competency ratings once steps A–D are complete.
          </Alert>
        </div>
      </AsyncContent>
    </div>
  );
}
