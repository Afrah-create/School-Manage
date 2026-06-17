"use client";

import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar } from "lucide-react";
import { EmptyState } from "@/components/feedback/EmptyState";
import { useForm } from "react-hook-form";
import { academicYearSchema } from "@uganda-cbc-sms/shared";
import type { AcademicYear } from "@uganda-cbc-sms/shared";
import type { z } from "zod";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Table, type Column } from "@/components/ui/Table";
import { useAcademicMutation } from "@/hooks/useAcademicMutation";
import { apiDelete, apiGet, apiPatch, apiPost, getApiErrorMessage } from "@/lib/api";
import { getApiTenantSlug } from "@/lib/tenantHost";
import { toast } from "@/lib/toast";

type Form = z.infer<typeof academicYearSchema>;
type Row = AcademicYear & Record<string, unknown>;
const ACTION_BTN =
  "inline-flex items-center rounded-md border border-border bg-card px-2 py-1 text-xs font-medium text-foreground transition-ui hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50";
const ACTION_DANGER_BTN =
  "inline-flex items-center rounded-md border border-red-500/40 bg-red-500/10 px-2 py-1 text-xs font-medium text-red-700 transition-ui hover:bg-red-500/20 dark:text-red-300 disabled:cursor-not-allowed disabled:opacity-50";

export default function AdminAcademicYearsPage() {
  const { creating, saving, deleting, runCreate, runSave, runDelete } = useAcademicMutation();
  const yearsQ = useQuery({
    queryKey: ["academic-years", getApiTenantSlug()],
    queryFn: () => apiGet<AcademicYear[]>("/academic/years"),
  });
  const rows = yearsQ.data ?? [];
  const loading = yearsQ.isPending;
  const [editing, setEditing] = useState<AcademicYear | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<AcademicYear | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const form = useForm<Form>({
    resolver: zodResolver(academicYearSchema),
    defaultValues: { name: "", startDate: "", endDate: "", isActive: true },
  });

  const editForm = useForm<Form>({
    resolver: zodResolver(academicYearSchema),
    defaultValues: { name: "", startDate: "", endDate: "", isActive: false },
  });

  useEffect(() => {
    if (yearsQ.error) {
      toast.error(getApiErrorMessage(yearsQ.error), "Could not load academic years");
    }
  }, [yearsQ.error]);

  const reload = () => void yearsQ.refetch();

  const onSubmit = async (v: Form) => {
    const created = await runCreate(
      () =>
        apiPost<AcademicYear>("/academic/years", {
          ...v,
          curriculumForm: v.curriculumForm || null,
        }),
      {
        title: "Academic year created",
        message: `${v.name} is ready. You can add terms and classes next.`,
      },
    );
    if (!created) return;
    reload();
    setCreateOpen(false);
    form.reset({ name: "", startDate: "", endDate: "", isActive: true });
  };

  const startEdit = (row: AcademicYear) => {
    setEditing(row);
    editForm.reset({
      name: row.name,
      startDate: row.startDate.slice(0, 10),
      endDate: row.endDate.slice(0, 10),
      isActive: row.isActive,
      curriculumForm: row.curriculumForm ?? null,
    });
  };

  const onEdit = async (v: Form) => {
    if (!editing) return;
    const updated = await runSave(
      () =>
        apiPatch<AcademicYear>(`/academic/years/${encodeURIComponent(editing.id)}`, {
          ...v,
          curriculumForm: v.curriculumForm || null,
        }),
      {
        title: "Academic year updated",
        message: `Changes to ${v.name} have been saved.`,
      },
    );
    if (!updated) return;
    reload();
    setEditing(null);
  };

  const remove = async () => {
    if (!confirmDelete) return;
    const ok = await runDelete(
      () => apiDelete(`/academic/years/${encodeURIComponent(confirmDelete.id)}`),
      {
        title: "Academic year deleted",
        message: `${confirmDelete.name} was removed.`,
      },
    );
    if (!ok) return;
    reload();
    setConfirmDelete(null);
  };

  const columns: Column<Row>[] = [
    { key: "name", header: "Name" },
    { key: "startDate", header: "Start", render: (r) => String(r.startDate).slice(0, 10) },
    { key: "endDate", header: "End", render: (r) => String(r.endDate).slice(0, 10) },
    { key: "curriculumForm", header: "Form (S1–S4)", render: (r) => r.curriculumForm ?? "—" },
    { key: "isActive", header: "Active", render: (r) => (r.isActive ? "Yes" : "No") },
    {
      key: "actions",
      header: "",
      render: (r) => (
        <div className="flex gap-3">
          <button
            type="button"
            className={ACTION_BTN}
            disabled={saving || deleting}
            onClick={() => startEdit(r)}
          >
            Edit
          </button>
          <button
            type="button"
            className={ACTION_DANGER_BTN}
            disabled={saving || deleting}
            onClick={() => setConfirmDelete(r)}
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <PageWrapper title="Academic years" description="Create school years">
      <div className="mb-3">
        <Link href="/admin/academic" className="text-sm font-medium text-brand hover:underline">
          ← Back to Academic
        </Link>
      </div>
      <Card title={`Years (${rows.length})`}>
        <div className="mb-3 flex justify-end">
          <Button type="button" onClick={() => setCreateOpen(true)}>
            Add new record
          </Button>
        </div>
        <Table
          columns={columns}
          rows={rows as Row[]}
          loading={loading}
          searchKeys={["name"]}
          emptyState={
            <EmptyState
              title="No academic years configured"
              description="Create a school year before adding terms, classes, and assessments."
              icon={Calendar}
              action={{ label: "Add academic year", onClick: () => setCreateOpen(true) }}
            />
          }
        />
      </Card>
      <Modal
        open={Boolean(editing)}
        title={`Edit year${editing ? `: ${editing.name}` : ""}`}
        busy={saving}
        onClose={() => setEditing(null)}
      >
        <form className="mt-1 space-y-3" onSubmit={editForm.handleSubmit(onEdit)}>
          <fieldset className="space-y-3" disabled={saving}>
            <Input label="Name" {...editForm.register("name")} error={editForm.formState.errors.name?.message} />
            <Input
              label="Start date"
              type="date"
              {...editForm.register("startDate")}
              error={editForm.formState.errors.startDate?.message}
            />
            <Input
              label="End date"
              type="date"
              {...editForm.register("endDate")}
              error={editForm.formState.errors.endDate?.message}
            />
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input className="h-4 w-4 rounded border-border bg-background" type="checkbox" {...editForm.register("isActive")} />
              Active
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-muted-foreground">Curriculum form (S1–S4, for cumulative CA)</span>
              <select
                className="w-full rounded border border-border bg-background px-2 py-2"
                {...editForm.register("curriculumForm")}
              >
                <option value="">Not set</option>
                <option value="S1">S1</option>
                <option value="S2">S2</option>
                <option value="S3">S3</option>
                <option value="S4">S4</option>
              </select>
            </label>
          </fieldset>
          <div className="flex gap-2">
            <Button type="submit" loading={saving}>
              Save changes
            </Button>
            <Button type="button" variant="secondary" disabled={saving} onClick={() => setEditing(null)}>
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title="Delete academic year?"
        description="This cannot be undone. If linked terms/classes exist, deletion will be blocked."
        confirmLabel="Delete"
        danger
        loading={deleting}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => void remove()}
      />
      <Modal open={createOpen} title="New year" busy={creating} onClose={() => setCreateOpen(false)}>
        <form className="space-y-3" onSubmit={form.handleSubmit(onSubmit)}>
          <fieldset className="space-y-3" disabled={creating}>
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
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input className="h-4 w-4 rounded border-border bg-background" type="checkbox" {...form.register("isActive")} />
              Active
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-muted-foreground">Curriculum form (S1–S4)</span>
              <select
                className="w-full rounded border border-border bg-background px-2 py-2"
                {...form.register("curriculumForm")}
              >
                <option value="">Not set</option>
                <option value="S1">S1</option>
                <option value="S2">S2</option>
                <option value="S3">S3</option>
                <option value="S4">S4</option>
              </select>
            </label>
          </fieldset>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" disabled={creating} onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={creating}>
              Create year
            </Button>
          </div>
        </form>
      </Modal>
    </PageWrapper>
  );
}

