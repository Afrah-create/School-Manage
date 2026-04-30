"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { feeStructureSchema } from "@uganda-cbc-sms/shared";
import type { z } from "zod";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { apiGet, apiPost } from "@/lib/api";

type Form = z.infer<typeof feeStructureSchema>;

export default function AdminFeesStructurePage() {
  const [rows, setRows] = useState<unknown[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const form = useForm<Form>({
    resolver: zodResolver(feeStructureSchema),
    defaultValues: {
      classId: "",
      termId: "",
      category: "",
      amount: "",
    },
  });

  const load = async () => {
    try {
      const r = await apiGet<unknown[]>("/fees/structure");
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
      await apiPost("/fees/structure", v);
      await load();
      form.reset({ classId: "", termId: "", category: "", amount: "" });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to save");
    }
  };

  return (
    <PageWrapper title="Fee structure" description="Per class / term fee categories">
      <div className="grid gap-8 lg:grid-cols-2">
        <Card title="Add structure row">
          <form className="space-y-3" onSubmit={form.handleSubmit(onSubmit)}>
            <Input label="Class ID (UUID)" {...form.register("classId")} error={form.formState.errors.classId?.message} />
            <Input label="Term ID (UUID)" {...form.register("termId")} error={form.formState.errors.termId?.message} />
            <Input
              label="Category"
              {...form.register("category")}
              error={form.formState.errors.category?.message}
            />
            <Input label="Amount (UGX)" {...form.register("amount")} error={form.formState.errors.amount?.message} />
            <Button type="submit">Save</Button>
          </form>
        </Card>
        <Card title={`Structure rows (${rows.length})`}>
          {err ? <p className="text-red-600">{err}</p> : null}
          {loading ? <p>Loading…</p> : null}
          <pre className="max-h-[480px] overflow-auto text-xs">{JSON.stringify(rows, null, 2)}</pre>
        </Card>
      </div>
    </PageWrapper>
  );
}
