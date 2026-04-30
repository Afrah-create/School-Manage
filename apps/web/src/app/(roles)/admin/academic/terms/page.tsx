"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { termSchema } from "@uganda-cbc-sms/shared";
import type { z } from "zod";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { apiGet, apiPost } from "@/lib/api";

type Form = z.infer<typeof termSchema>;

type YearRow = { id: string; name: string };

export default function AdminAcademicTermsPage() {
  const [terms, setTerms] = useState<unknown[]>([]);
  const [years, setYears] = useState<YearRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const form = useForm<Form>({
    resolver: zodResolver(termSchema),
    defaultValues: {
      academicYearId: "",
      termNumber: 1,
      startDate: "",
      endDate: "",
      isActive: true,
    },
  });

  const load = async () => {
    try {
      const [t, y] = await Promise.all([
        apiGet<unknown[]>("/academic/terms"),
        apiGet<YearRow[]>("/academic/years"),
      ]);
      setTerms(t);
      setYears(y);
      if (y[0] && !form.getValues("academicYearId")) {
        form.setValue("academicYearId", y[0].id);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial load
  }, []);

  const onSubmit = async (v: Form) => {
    setErr(null);
    try {
      await apiPost("/academic/terms", v);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to create");
    }
  };

  return (
    <PageWrapper title="Terms" description="Terms within an academic year">
      <div className="grid gap-8 lg:grid-cols-2">
        <Card title="New term">
          <form className="space-y-3" onSubmit={form.handleSubmit(onSubmit)}>
            <Select
              label="Academic year"
              options={years.map((y) => ({ value: y.id, label: y.name }))}
              {...form.register("academicYearId")}
            />
            <Select
              label="Term number"
              options={[
                { value: "1", label: "1" },
                { value: "2", label: "2" },
                { value: "3", label: "3" },
              ]}
              value={String(form.watch("termNumber") ?? 1)}
              onChange={(e) => {
                const n = Number(e.target.value);
                form.setValue("termNumber", n as 1 | 2 | 3, { shouldValidate: true });
              }}
            />
            <Input
              label="Start date"
              type="date"
              {...form.register("startDate")}
              error={form.formState.errors.startDate?.message}
            />
            <Input
              label="End date"
              type="date"
              {...form.register("endDate")}
              error={form.formState.errors.endDate?.message}
            />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...form.register("isActive")} />
              Active
            </label>
            <Button type="submit">Create term</Button>
          </form>
        </Card>
        <Card title={`Terms (${terms.length})`}>
          {err ? <p className="text-red-600">{err}</p> : null}
          {loading ? <p>Loading…</p> : null}
          <pre className="max-h-[480px] overflow-auto text-xs">{JSON.stringify(terms, null, 2)}</pre>
        </Card>
      </div>
    </PageWrapper>
  );
}
