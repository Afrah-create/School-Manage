"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { ROLES, updateUserSchema } from "@uganda-cbc-sms/shared";
import type { Role } from "@uganda-cbc-sms/shared";
import type { z } from "zod";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { apiGet, apiPatch } from "@/lib/api";

type Form = z.infer<typeof updateUserSchema>;
type UserDetail = {
  id: string;
  fullName: string;
  email: string;
  role: string;
  isActive: boolean;
  systemAccount: boolean;
  notes: string | null;
};

export default function AdminUsersEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params["id"]);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [systemAccount, setSystemAccount] = useState(false);
  const [notes, setNotes] = useState("");

  const form = useForm<Form>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: {
      fullName: "",
      email: "",
      role: "subject_teacher",
      isActive: true,
    },
  });

  useEffect(() => {
    void (async () => {
      try {
        const user = await apiGet<UserDetail>(`/users/${encodeURIComponent(id)}`);
        form.reset({
          fullName: user.fullName,
          email: user.email,
          role: user.role as Role,
          isActive: user.isActive,
        });
        setSystemAccount(Boolean(user.systemAccount));
        setNotes(user.notes ?? "");
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Failed to load user");
      } finally {
        setLoading(false);
      }
    })();
  }, [form, id]);

  const onSubmit = async (v: Form) => {
    setErr(null);
    setOk(null);
    try {
      await apiPatch(`/users/${encodeURIComponent(id)}`, {
        fullName: v.fullName?.trim(),
        email: v.email?.toLowerCase().trim(),
        role: v.role,
        isActive: v.isActive,
      });
      await apiPatch(`/users/${encodeURIComponent(id)}/notes`, { notes });
      setOk("User updated successfully.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to update user");
    }
  };

  return (
    <PageWrapper title="Users" description="Staff accounts">
      {loading ? <p className="text-muted-foreground">Loading…</p> : null}
      {err ? <Alert tone="error">{err}</Alert> : null}
      {ok ? <Alert tone="success">{ok}</Alert> : null}
      {!loading ? (
        <Modal open title="Edit user account" onClose={() => router.push(`/admin/users/${id}`)}>
          {systemAccount ? <div className="mb-3"><Badge tone="warning">System account: destructive actions are restricted.</Badge></div> : null}
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Input
                label="Full name"
                {...form.register("fullName")}
                error={form.formState.errors.fullName?.message}
              />
              <Input
                label="Email"
                type="email"
                {...form.register("email")}
                error={form.formState.errors.email?.message}
              />
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Select
                label="Role"
                options={ROLES.map((r) => ({
                  value: r,
                  label: r.replace(/_/g, " "),
                }))}
                {...form.register("role")}
                error={form.formState.errors.role?.message}
              />
              <Select
                label="Status"
                options={[
                  { value: "active", label: "Active" },
                  { value: "inactive", label: "Inactive" },
                ]}
                value={form.watch("isActive") ? "active" : "inactive"}
                onChange={(e) => form.setValue("isActive", e.target.value === "active")}
                disabled={systemAccount}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Admin notes</label>
              <textarea
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => router.push(`/admin/users/${id}`)}>
                Cancel
              </Button>
              <Button type="submit" loading={form.formState.isSubmitting}>
                Save changes
              </Button>
            </div>
          </form>
        </Modal>
      ) : null}
    </PageWrapper>
  );
}
