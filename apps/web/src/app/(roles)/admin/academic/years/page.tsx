"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { academicYearSchema } from "@uganda-cbc-sms/shared";
import type { z } from "zod";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { apiGet, apiPost } from "@/lib/api";

type Form = z.infer<typeof academicYearSchema>;

export default function AdminAcademicYearsPage() {
  const [rows, setRows] = useState<unknown[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const form = useForm<Form>({
    resolver: zodResolver(academicYearSchema),
    defaultValues: { name: "", startDate: "", endDate: "", isActive: true },
  });

  const load = async () => {
    try {
      const r = await apiGet<unknown[]>("/academic/years");
      setRows(r);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const onSubmit = async (v: Form) => {
    setErr(null);
    try {
      await apiPost("/academic/years", v);
      await load();
      form.reset({ name: "", startDate: "", endDate: "", isActive: true });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to create");
    }
  };

  return (
    <PageWrapper title="Academic years" description="Create school years">
      <div className="grid gap-8 lg:grid-cols-2">
        <Card title="New year">
          <form className="space-y-3" onSubmit={form.handleSubmit(onSubmit)}>
            <Input label="Name" {...form.register("name")} error={form.formState.errors.name?.message} />
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
            <Button type="submit">Create year</Button>
          </form>
        </Card>
        <Card title={`Years (${rows.length})`}>
          {err ? <p className="text-red-600">{err}</p> : null}
          {loading ? <p>Loading…</p> : null}
          <pre className="max-h-[480px] overflow-auto text-xs">{JSON.stringify(rows, null, 2)}</pre>
        </Card>
      </div>
    </PageWrapper>
  );
}
