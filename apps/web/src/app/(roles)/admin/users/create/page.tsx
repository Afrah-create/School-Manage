"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { createUserSchema, ROLES } from "@uganda-cbc-sms/shared";
import type { z } from "zod";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { apiPost } from "@/lib/api";

type Form = z.infer<typeof createUserSchema>;

export default function AdminUsersCreatePage() {
  const router = useRouter();
  const form = useForm<Form>({ resolver: zodResolver(createUserSchema) });

  const onSubmit = async (v: Form) => {
    await apiPost("/users", v);
    router.push("/admin/users");
  };

  return (
    <PageWrapper title="Create user" description="New staff account">
      <Card title="Account details">
        <form className="max-w-lg space-y-3" onSubmit={form.handleSubmit(onSubmit)}>
          <Input label="Full name" {...form.register("fullName")} error={form.formState.errors.fullName?.message} />
          <Input label="Email" {...form.register("email")} error={form.formState.errors.email?.message} />
          <Input
            label="Temporary password"
            type="password"
            {...form.register("password")}
            error={form.formState.errors.password?.message}
          />
          <Select
            label="Role"
            options={ROLES.map((r) => ({
              value: r,
              label: r.replace(/_/g, " "),
            }))}
            {...form.register("role")}
          />
          <Button type="submit">Create</Button>
        </form>
      </Card>
    </PageWrapper>
  );
}
