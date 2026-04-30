"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { subjectSchema } from "@uganda-cbc-sms/shared";
import type { z } from "zod";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { apiGet, apiPost } from "@/lib/api";

type Form = z.infer<typeof subjectSchema>;

export default function AdminAcademicSubjectsPage() {
  const [subjects, setSubjects] = useState<unknown[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const form = useForm<Form>({
    resolver: zodResolver(subjectSchema),
    defaultValues: { name: "", code: "", level: "o_level" },
  });

  const load = async () => {
    try {
      const s = await apiGet<unknown[]>("/academic/subjects");
      setSubjects(s);
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
      await apiPost("/academic/subjects", v);
      await load();
      form.reset({ name: "", code: "", level: "o_level" });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to create");
    }
  };

  return (
    <PageWrapper title="Subjects" description="Subject catalogue">
      <div className="grid gap-8 lg:grid-cols-2">
        <Card title="New subject">
          <form className="space-y-3" onSubmit={form.handleSubmit(onSubmit)}>
            <Input label="Name" {...form.register("name")} error={form.formState.errors.name?.message} />
            <Input label="Code" {...form.register("code")} error={form.formState.errors.code?.message} />
            <Select
              label="Level"
              options={[
                { value: "o_level", label: "O-Level / CBC" },
                { value: "a_level", label: "A-Level" },
              ]}
              {...form.register("level")}
            />
            <Button type="submit">Create subject</Button>
          </form>
        </Card>
        <Card title={`Subjects (${subjects.length})`}>
          {err ? <p className="text-red-600">{err}</p> : null}
          {loading ? <p>Loading…</p> : null}
          <pre className="max-h-[480px] overflow-auto text-xs">{JSON.stringify(subjects, null, 2)}</pre>
        </Card>
      </div>
    </PageWrapper>
  );
}
