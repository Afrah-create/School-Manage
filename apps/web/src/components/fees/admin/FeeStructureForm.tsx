"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { FEE_CATEGORIES, feeStructureSchema } from "@uganda-cbc-sms/shared";
import type { AcademicYear, SchoolClass, Term } from "@uganda-cbc-sms/shared";
import type { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useFeeActions } from "@/hooks/useFees";
import { apiGet } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api";
import { toast } from "@/lib/toast";

type Form = z.infer<typeof feeStructureSchema>;

const CATEGORY_OTHER = "__other__";

export function FeeStructureForm({
  defaultClassId,
  defaultTermId,
  onCreated,
}: {
  defaultClassId?: string;
  defaultTermId?: string;
  onCreated?: () => void;
}) {
  const actions = useFeeActions();
  const [categoryMode, setCategoryMode] = useState<string>(FEE_CATEGORIES[0] ?? "Tuition");
  const [customCategory, setCustomCategory] = useState("");

  const yearsQ = useQuery({
    queryKey: ["academic-years"],
    queryFn: () => apiGet<AcademicYear[]>("/academic/years"),
  });
  const [yearId, setYearId] = useState("");

  const termsQ = useQuery({
    queryKey: ["terms", yearId],
    queryFn: () => apiGet<Term[]>(`/academic/terms?academicYearId=${encodeURIComponent(yearId)}`),
    enabled: Boolean(yearId),
  });
  const classesQ = useQuery({
    queryKey: ["academic-classes"],
    queryFn: () => apiGet<SchoolClass[]>("/academic/classes"),
  });

  const form = useForm<Form>({
    resolver: zodResolver(feeStructureSchema),
    defaultValues: {
      classId: defaultClassId ?? "",
      termId: defaultTermId ?? "",
      category: FEE_CATEGORIES[0] ?? "Tuition",
      amount: "",
    },
  });

  const yearOptions = useMemo(
    () => [
      { value: "", label: "Select year" },
      ...(yearsQ.data ?? []).map((y) => ({ value: y.id, label: y.name })),
    ],
    [yearsQ.data],
  );
  const termOptions = useMemo(
    () => [
      { value: "", label: yearId ? "Select term" : "Select year first" },
      ...(termsQ.data ?? []).map((t) => ({ value: t.id, label: `Term ${t.termNumber}` })),
    ],
    [termsQ.data, yearId],
  );
  const classOptions = useMemo(
    () => [
      { value: "", label: "Select class" },
      ...(classesQ.data ?? []).map((c) => ({
        value: c.id,
        label: c.stream ? `${c.name} · ${c.stream}` : c.name,
      })),
    ],
    [classesQ.data],
  );

  const categoryOptions = useMemo(
    () => [
      ...FEE_CATEGORIES.map((c) => ({ value: c, label: c })),
      { value: CATEGORY_OTHER, label: "Other (custom)" },
    ],
    [],
  );

  const onSubmit = async (values: Form) => {
    const category =
      categoryMode === CATEGORY_OTHER ? customCategory.trim() : categoryMode;
    if (!category) {
      toast.error("Enter a category name.", "Missing category");
      return;
    }
    try {
      await actions.createStructure.mutateAsync({
        classId: values.classId,
        termId: values.termId,
        category,
        amount: String(values.amount),
      });
      const cls = classOptions.find((o) => o.value === values.classId)?.label ?? "class";
      const term = termOptions.find((o) => o.value === values.termId)?.label ?? "term";
      toast.success(`${category} added for ${cls}, ${term}.`, "Fee structure saved");
      form.reset({
        classId: values.classId,
        termId: values.termId,
        category: FEE_CATEGORIES[0] ?? "Tuition",
        amount: "",
      });
      setCategoryMode(FEE_CATEGORIES[0] ?? "Tuition");
      setCustomCategory("");
      onCreated?.();
    } catch (e) {
      toast.error(getApiErrorMessage(e), "Could not save");
    }
  };

  return (
    <form className="space-y-3" onSubmit={form.handleSubmit(onSubmit)}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Select
          label="Academic year"
          options={yearOptions}
          value={yearId}
          onChange={(e) => {
            setYearId(e.target.value);
            form.setValue("termId", "");
          }}
        />
        <Select
          label="Term"
          options={termOptions}
          {...form.register("termId")}
          error={form.formState.errors.termId?.message}
        />
      </div>
      <Select
        label="Class"
        options={classOptions}
        {...form.register("classId")}
        error={form.formState.errors.classId?.message}
      />
      <Select
        label="Fee category"
        options={categoryOptions}
        value={categoryMode}
        onChange={(e) => setCategoryMode(e.target.value)}
      />
      {categoryMode === CATEGORY_OTHER ? (
        <Input
          label="Custom category"
          value={customCategory}
          onChange={(e) => setCustomCategory(e.target.value)}
          placeholder="e.g. Boarding"
        />
      ) : null}
      <Input
        label="Amount (UGX)"
        type="number"
        min={1}
        step={1}
        {...form.register("amount")}
        error={form.formState.errors.amount?.message}
      />
      <Button type="submit" loading={actions.createStructure.isPending}>
        Add fee category
      </Button>
    </form>
  );
}
