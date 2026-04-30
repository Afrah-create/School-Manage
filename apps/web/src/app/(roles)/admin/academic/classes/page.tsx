"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { classSchema } from "@uganda-cbc-sms/shared";
import type { z } from "zod";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { apiGet, apiPost } from "@/lib/api";

type Form = z.infer<typeof classSchema>;

type YearRow = { id: string; name: string };
type UserRow = { id: string; fullName: string; email: string; role: string };

export default function AdminAcademicClassesPage() {
  const [classes, setClasses] = useState<unknown[]>([]);
  const [years, setYears] = useState<YearRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const form = useForm<Form>({
    resolver: zodResolver(classSchema),
    defaultValues: {
      name: "",
      stream: "",
      level: "o_level",
      academicYearId: "",
      classTeacherId: null,
    },
  });

  const load = async () => {
    try {
      const [c, y, u] = await Promise.all([
        apiGet<unknown[]>("/academic/classes"),
        apiGet<YearRow[]>("/academic/years"),
        apiGet<UserRow[]>("/users"),
      ]);
      setClasses(c);
      setYears(y);
      setUsers(u);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = async (v: Form) => {
    setErr(null);
    try {
      await apiPost("/academic/classes", v);
      await load();
      form.reset({
        name: "",
        stream: "",
        level: "o_level",
        academicYearId: years[0]?.id ?? "",
        classTeacherId: null,
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to create");
    }
  };

  const teacherOpts = [
    { value: "", label: "— None —" },
    ...users
      .filter((x) => ["class_teacher", "subject_teacher", "headteacher"].includes(x.role))
      .map((x) => ({ value: x.id, label: `${x.fullName} (${x.role})` })),
  ];

  return (
    <PageWrapper title="Classes" description="Create classes for an academic year">
      <div className="grid gap-8 lg:grid-cols-2">
        <Card title="New class">
          <form className="space-y-3" onSubmit={form.handleSubmit(onSubmit)}>
            <Input label="Name" {...form.register("name")} error={form.formState.errors.name?.message} />
            <Input label="Stream" {...form.register("stream")} error={form.formState.errors.stream?.message} />
            <Select
              label="Level"
              options={[
                { value: "o_level", label: "O-Level / CBC" },
                { value: "a_level", label: "A-Level" },
              ]}
              {...form.register("level")}
            />
            <Select
              label="Academic year"
              options={years.map((y) => ({ value: y.id, label: y.name }))}
              {...form.register("academicYearId")}
            />
            <Select
              label="Class teacher (optional)"
              options={teacherOpts}
              {...form.register("classTeacherId", {
                setValueAs: (v: string) => (v === "" ? null : v),
              })}
            />
            <Button type="submit">Create class</Button>
          </form>
        </Card>
        <Card title={`Classes (${classes.length})`}>
          {err ? <p className="text-red-600">{err}</p> : null}
          {loading ? <p>Loading…</p> : null}
          <pre className="max-h-[480px] overflow-auto text-xs">{JSON.stringify(classes, null, 2)}</pre>
        </Card>
      </div>
    </PageWrapper>
  );
}
