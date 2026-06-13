"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AcademicYear, StructureSetupResult, StructureStatus } from "@uganda-cbc-sms/shared";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { apiGet, apiPost, getApiErrorMessage } from "@/lib/api";
import { queryKeys, STRUCTURAL_STALE_MS } from "@/lib/queryKeys";
import { getApiTenantSlug } from "@/lib/tenantHost";
import { toast } from "@/lib/toast";

type ClassTemplate = "BOTH" | "O_LEVEL_S1_S4" | "A_LEVEL_S5_S6" | "NONE";

export function StructureSetupPanel({ initialYearId = "" }: { initialYearId?: string }) {
  const queryClient = useQueryClient();
  const tenantSlug = getApiTenantSlug();
  const [academicYearId, setAcademicYearId] = useState(initialYearId);
  const [createNewYear, setCreateNewYear] = useState(false);
  const [yearName, setYearName] = useState(`${new Date().getFullYear()} Academic Year`);
  const [yearStart, setYearStart] = useState(`${new Date().getFullYear()}-02-01`);
  const [yearEnd, setYearEnd] = useState(`${new Date().getFullYear() + 1}-12-15`);
  const [classTemplate, setClassTemplate] = useState<ClassTemplate>("BOTH");
  const [confirmSetup, setConfirmSetup] = useState(false);

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
    if (!academicYearId && years[0]?.id) setAcademicYearId(years[0].id);
  }, [years, academicYearId, initialYearId]);

  const statusQ = useQuery({
    queryKey: queryKeys.structureStatus(tenantSlug, academicYearId || "none"),
    queryFn: () =>
      apiGet<StructureStatus>(
        `/academic/structure/status?academicYearId=${encodeURIComponent(academicYearId)}`,
      ),
    enabled: Boolean(academicYearId) && !createNewYear,
    staleTime: 30_000,
  });

  const setupMutation = useMutation({
    mutationFn: () =>
      apiPost<StructureSetupResult>("/academic/structure/setup", {
        ...(createNewYear
          ? {
              createYear: {
                name: yearName,
                startDate: yearStart,
                endDate: yearEnd,
                isActive: true,
              },
              activateYear: true,
            }
          : { academicYearId }),
        installTerms: true,
        classTemplate,
      }),
    onSuccess: (data) => {
      toast.success(
        `Created ${data.termsCreated} term(s) and ${data.classesCreated} class(es).`,
        "Structure provisioned",
      );
      setAcademicYearId(data.academicYearId);
      setCreateNewYear(false);
      void statusQ.refetch();
      void yearsQ.refetch();
      void queryClient.invalidateQueries({ queryKey: queryKeys.academicSummary(tenantSlug) });
    },
    onError: (error) => toast.error(getApiErrorMessage(error), "Could not provision structure"),
  });

  const status = statusQ.data;

  return (
    <div className="space-y-6">
      <Card title="School structure automation">
        <p className="text-sm text-muted-foreground">
          Install Uganda 3-term calendar and default O-Level (S1–S4) / A-Level (S5–S6) classes in one
          request.
        </p>
      </Card>

      <Card title="Academic year">
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={createNewYear}
              onChange={(e) => setCreateNewYear(e.target.checked)}
            />
            Create a new academic year
          </label>
          {createNewYear ? (
            <div className="grid gap-3 md:grid-cols-3">
              <Input label="Year name" value={yearName} onChange={(e) => setYearName(e.target.value)} />
              <Input label="Start date" type="date" value={yearStart} onChange={(e) => setYearStart(e.target.value)} />
              <Input label="End date" type="date" value={yearEnd} onChange={(e) => setYearEnd(e.target.value)} />
            </div>
          ) : (
            <Select
              label="Existing year"
              value={academicYearId}
              onChange={(e) => setAcademicYearId(e.target.value)}
              options={years.map((y) => ({ value: y.id, label: y.name }))}
            />
          )}
        </div>
      </Card>

      {status && !createNewYear ? (
        <Card title="Status">
          <p className="text-sm text-muted-foreground">
            {status.terms} terms · {status.oLevelClasses} O-Level classes · {status.aLevelClasses} A-Level
            classes
          </p>
          {!status.termsComplete || !status.classesComplete ? (
            <div className="mt-3">
              <Alert tone="info">
                Run setup to add missing terms (3) and/or default classes for the selected year.
              </Alert>
            </div>
          ) : null}
        </Card>
      ) : null}

      <Card title="Class template">
        <Select
          label="Classes to create"
          value={classTemplate}
          onChange={(e) => setClassTemplate(e.target.value as ClassTemplate)}
          options={[
            { value: "BOTH", label: "O-Level S1–S4 + A-Level S5/S6 (Sciences & Arts)" },
            { value: "O_LEVEL_S1_S4", label: "O-Level S1–S4 only" },
            { value: "A_LEVEL_S5_S6", label: "A-Level S5/S6 only" },
            { value: "NONE", label: "Terms only (no classes)" },
          ]}
        />
        <p className="mt-3 text-sm text-muted-foreground">
          Next:{" "}
          <Link href="/admin/academic/curriculum" className="font-medium text-brand hover:underline">
            Curriculum setup
          </Link>{" "}
          to install subjects and class–subject slots.
        </p>
        <Button type="button" className="mt-4" disabled={setupMutation.isPending} onClick={() => setConfirmSetup(true)}>
          {setupMutation.isPending ? "Provisioning…" : "Install structure"}
        </Button>
      </Card>

      <ConfirmDialog
        open={confirmSetup}
        title="Install school structure?"
        description="Creates Term 1–3 (if missing) and default classes for the selected template. Existing classes are not duplicated."
        confirmLabel="Install"
        loading={setupMutation.isPending}
        onConfirm={() => {
          setConfirmSetup(false);
          setupMutation.mutate();
        }}
        onCancel={() => setConfirmSetup(false)}
      />
    </div>
  );
}
