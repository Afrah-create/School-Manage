"use client";

import type { AcademicYear, SchoolClass, Term } from "@uganda-cbc-sms/shared";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Select } from "@/components/ui/Select";
import { apiGet } from "@/lib/api";

export type FeeStructureFilterValues = {
  yearId: string;
  termId: string;
  classId: string;
};

export function FeeStructureFilters({
  values,
  onChange,
}: {
  values: FeeStructureFilterValues;
  onChange: (next: FeeStructureFilterValues) => void;
}) {
  const yearsQ = useQuery({
    queryKey: ["academic-years"],
    queryFn: () => apiGet<AcademicYear[]>("/academic/years"),
  });
  const termsQ = useQuery({
    queryKey: ["terms", values.yearId],
    queryFn: () =>
      apiGet<Term[]>(`/academic/terms?academicYearId=${encodeURIComponent(values.yearId)}`),
    enabled: Boolean(values.yearId),
  });
  const classesQ = useQuery({
    queryKey: ["academic-classes"],
    queryFn: () => apiGet<SchoolClass[]>("/academic/classes"),
  });

  const yearOptions = useMemo(
    () => [
      { value: "", label: "All years" },
      ...(yearsQ.data ?? []).map((y) => ({ value: y.id, label: y.name })),
    ],
    [yearsQ.data],
  );

  const termOptions = useMemo(
    () => [
      { value: "", label: values.yearId ? "All terms" : "Select year first" },
      ...(termsQ.data ?? []).map((t) => ({ value: t.id, label: `Term ${t.termNumber}` })),
    ],
    [termsQ.data, values.yearId],
  );

  const classOptions = useMemo(
    () => [
      { value: "", label: "All classes" },
      ...(classesQ.data ?? []).map((c) => ({
        value: c.id,
        label: c.stream ? `${c.name} · ${c.stream}` : c.name,
      })),
    ],
    [classesQ.data],
  );

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Select
        label="Academic year"
        options={yearOptions}
        value={values.yearId}
        onChange={(e) =>
          onChange({ yearId: e.target.value, termId: "", classId: values.classId })
        }
      />
      <Select
        label="Term"
        options={termOptions}
        value={values.termId}
        disabled={!values.yearId && termOptions.length <= 1}
        onChange={(e) => onChange({ ...values, termId: e.target.value })}
      />
      <Select
        label="Class"
        options={classOptions}
        value={values.classId}
        onChange={(e) => onChange({ ...values, classId: e.target.value })}
      />
    </div>
  );
}
