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
import type { Subject } from "@uganda-cbc-sms/shared";
import { apiGet, apiPatch, apiPut } from "@/lib/api";

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
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [specializationIds, setSpecializationIds] = useState<string[]>([]);
  const [specLoading, setSpecLoading] = useState(false);

  const form = useForm<Form>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: {
      fullName: "",
      email: "",
      role: "subject_teacher",
      isActive: true,
    },
  });

  const watchedRole = form.watch("role");
  const showSpecializations = watchedRole === "subject_teacher" || watchedRole === "class_teacher";

  useEffect(() => {
    void (async () => {
      try {
        const [user, subjectCatalog] = await Promise.all([
          apiGet<UserDetail>(`/users/${encodeURIComponent(id)}`),
          apiGet<Subject[]>("/academic/subjects"),
        ]);
        form.reset({
          fullName: user.fullName,
          email: user.email,
          role: user.role as Role,
          isActive: user.isActive,
        });
        setSystemAccount(Boolean(user.systemAccount));
        setNotes(user.notes ?? "");
        setSubjects(subjectCatalog);
        if (user.role === "subject_teacher" || user.role === "class_teacher") {
          setSpecLoading(true);
          try {
            const specs = await apiGet<{ subjectId: string }[]>(
              `/academic/teachers/${encodeURIComponent(id)}/specializations`,
            );
            setSpecializationIds(specs.map((s) => s.subjectId));
          } catch {
            setSpecializationIds([]);
          } finally {
            setSpecLoading(false);
          }
        }
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
      if (v.role === "subject_teacher" || v.role === "class_teacher") {
        await apiPut(`/academic/teachers/${encodeURIComponent(id)}/specializations`, {
          subjectIds: specializationIds,
        });
      }
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
            {showSpecializations ? (
              <div className="rounded-md border border-border p-3">
                <p className="mb-2 text-sm font-medium text-foreground">Teachable subjects</p>
                <p className="mb-3 text-xs text-muted-foreground">
                  Subject teachers: subjects they may teach across classes. Class teachers: optional subjects
                  outside their homeroom class — they can always teach any subject offered to the class they head.
                  Leave empty to allow any subject at the matching level until specializations are set.
                </p>
                {specLoading ? (
                  <p className="text-sm text-muted-foreground">Loading specializations…</p>
                ) : (
                  <div className="max-h-48 space-y-2 overflow-auto">
                    {(["O_LEVEL", "A_LEVEL"] as const).map((level) => {
                      const levelSubjects = subjects.filter((s) => s.level === level);
                      if (levelSubjects.length === 0) return null;
                      return (
                        <div key={level}>
                          <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
                            {level === "O_LEVEL" ? "O-Level (CBC)" : "A-Level (UNEB)"}
                          </p>
                          {levelSubjects.map((s) => (
                            <label key={s.id} className="flex items-center gap-2 py-0.5 text-sm">
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-border"
                                checked={specializationIds.includes(s.id)}
                                onChange={(e) =>
                                  setSpecializationIds((prev) =>
                                    e.target.checked ? [...prev, s.id] : prev.filter((x) => x !== s.id),
                                  )
                                }
                              />
                              {s.code} — {s.name}
                            </label>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : null}
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
