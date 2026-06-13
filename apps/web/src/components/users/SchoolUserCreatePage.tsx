"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { createUserSchema } from "@uganda-cbc-sms/shared";
import type { z } from "zod";
import type { UsersModuleConfig } from "@/components/users/usersModuleConfig";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { apiPost } from "@/lib/api";

type Form = z.infer<typeof createUserSchema> & { forcePasswordChange?: boolean; notes?: string };

function roleLabel(role: string) {
  return role.replace(/_/g, " ");
}

export function SchoolUserCreatePage({ config }: { config: UsersModuleConfig }) {
  const router = useRouter();
  const { usersBasePath, assignableRoles, notesLabel = "Notes" } = config;
  const [error, setError] = useState<string | null>(null);
  const form = useForm<Form>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { role: assignableRoles[0], forcePasswordChange: true },
  });

  const onSubmit = async (v: Form) => {
    setError(null);
    try {
      await apiPost("/users", {
        ...v,
        forcePasswordChange: v.forcePasswordChange !== false,
      });
      router.push(usersBasePath);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create user");
    }
  };

  return (
    <PageWrapper title="Users" description="Staff accounts">
      <Modal open title="Create user account" onClose={() => router.push(usersBasePath)}>
        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          {error ? <Alert tone="error">{error}</Alert> : null}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Input label="Full name" {...form.register("fullName")} error={form.formState.errors.fullName?.message} />
            <Input label="Email" {...form.register("email")} error={form.formState.errors.email?.message} />
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Input
              label="Temporary password"
              type="password"
              {...form.register("password")}
              error={form.formState.errors.password?.message}
            />
            <Select
              label="Role"
              options={assignableRoles.map((r) => ({
                value: r,
                label: roleLabel(r),
              }))}
              {...form.register("role")}
            />
          </div>
          <Controller
            name="forcePasswordChange"
            control={form.control}
            render={({ field }) => (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={field.value !== false}
                  onChange={(e) => field.onChange(e.target.checked)}
                />
                Force password change on first login
              </label>
            )}
          />
          <div>
            <label className="mb-1 block text-sm font-medium">{notesLabel}</label>
            <textarea
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              rows={3}
              {...form.register("notes")}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => router.push(usersBasePath)}>
              Cancel
            </Button>
            <Button type="submit" loading={form.formState.isSubmitting}>
              Create user
            </Button>
          </div>
        </form>
      </Modal>
    </PageWrapper>
  );
}
