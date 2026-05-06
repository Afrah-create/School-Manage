"use client";

import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { classSchema } from "@uganda-cbc-sms/shared";
import type { AcademicYear, SchoolClass, UserPublic } from "@uganda-cbc-sms/shared";
import type { z } from "zod";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Table, type Column } from "@/components/ui/Table";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";

type Form = z.infer<typeof classSchema>;
type UsersListResponse =
  | UserPublic[]
  | {
      items: UserPublic[];
    };

type Row = SchoolClass & Record<string, unknown>;
const ACTION_BTN =
  "inline-flex items-center rounded-md border border-border bg-card px-2 py-1 text-xs font-medium text-foreground transition-ui hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50";
const ACTION_DANGER_BTN =
  "inline-flex items-center rounded-md border border-red-500/40 bg-red-500/10 px-2 py-1 text-xs font-medium text-red-700 transition-ui hover:bg-red-500/20 dark:text-red-300 disabled:cursor-not-allowed disabled:opacity-50";

export default function AdminAcademicClassesPage() {
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [users, setUsers] = useState<UserPublic[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editing, setEditing] = useState<SchoolClass | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<SchoolClass | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const form = useForm<Form>({
    resolver: zodResolver(classSchema),
    defaultValues: {
      name: "",
      stream: "",
      level: "O_LEVEL",
      academicYearId: "",
      classTeacherId: null,
    },
  });
  const editForm = useForm<Form>({
    resolver: zodResolver(classSchema),
    defaultValues: {
      name: "",
      stream: "",
      level: "O_LEVEL",
      academicYearId: "",
      classTeacherId: null,
    },
  });

  const load = async () => {
    try {
      const [c, y, usersResponse] = await Promise.all([
        apiGet<SchoolClass[]>("/academic/classes"),
        apiGet<AcademicYear[]>("/academic/years"),
        apiGet<UsersListResponse>("/users"),
      ]);
      const u = Array.isArray(usersResponse) ? usersResponse : (usersResponse.items ?? []);
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
    setOk(null);
    try {
      await apiPost("/academic/classes", v);
      await load();
      setOk("Class created.");
      setCreateOpen(false);
      form.reset({
        name: "",
        stream: "",
        level: "O_LEVEL",
        academicYearId: years[0]?.id ?? "",
        classTeacherId: null,
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to create");
    }
  };

  const startEdit = (row: SchoolClass) => {
    setEditing(row);
    editForm.reset({
      name: row.name,
      stream: row.stream,
      level: row.level,
      academicYearId: row.academicYearId,
      classTeacherId: row.classTeacherId,
    });
  };

  const onEdit = async (v: Form) => {
    if (!editing) return;
    setErr(null);
    setOk(null);
    setBusyId(editing.id);
    try {
      await apiPatch(`/academic/classes/${encodeURIComponent(editing.id)}`, v);
      await load();
      setEditing(null);
      setOk("Class updated.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to update");
    } finally {
      setBusyId(null);
    }
  };

  const remove = async () => {
    if (!confirmDelete) return;
    setErr(null);
    setOk(null);
    setBusyId(confirmDelete.id);
    try {
      await apiDelete(`/academic/classes/${encodeURIComponent(confirmDelete.id)}`);
      await load();
      setConfirmDelete(null);
      setOk("Class deleted.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to delete");
    } finally {
      setBusyId(null);
    }
  };

  const teacherOpts = [
    { value: "", label: "— None —" },
    ...users
      .filter((x) => ["class_teacher", "subject_teacher", "headteacher"].includes(x.role))
      .map((x) => ({ value: x.id, label: `${x.fullName} (${x.role})` })),
  ];

  const columns: Column<Row>[] = [
    { key: "name", header: "Class" },
    { key: "stream", header: "Stream" },
    { key: "level", header: "Level" },
    {
      key: "academicYearId",
      header: "Year",
      render: (r) => years.find((y) => y.id === r.academicYearId)?.name ?? "—",
    },
    {
      key: "classTeacherId",
      header: "Teacher",
      render: (r) => users.find((u) => u.id === r.classTeacherId)?.fullName ?? "—",
    },
    {
      key: "actions",
      header: "",
      render: (r) => (
        <div className="flex gap-3">
          <button
            type="button"
            className={ACTION_BTN}
            disabled={busyId === r.id}
            onClick={() => startEdit(r)}
          >
            Edit
          </button>
          <button
            type="button"
            className={ACTION_DANGER_BTN}
            disabled={busyId === r.id}
            onClick={() => setConfirmDelete(r)}
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <PageWrapper title="Classes" description="Create classes for an academic year">
      <div className="mb-3">
        <Link href="/admin/academic" className="text-sm font-medium text-brand hover:underline">
          ← Back to Academic
        </Link>
      </div>
      <div className="mb-4 space-y-2">
        {ok ? <Alert tone="success">{ok}</Alert> : null}
        {err ? <Alert tone="error">{err}</Alert> : null}
      </div>
      <Card title={`Classes (${classes.length})`}>
        <div className="mb-3 flex justify-end">
          <Button type="button" onClick={() => setCreateOpen(true)}>
            Add new record
          </Button>
        </div>
        <Table columns={columns} rows={classes as Row[]} loading={loading} searchKeys={["name", "stream"]} />
      </Card>
      <Modal open={Boolean(editing)} title={`Edit class${editing ? `: ${editing.name} ${editing.stream}` : ""}`} onClose={() => setEditing(null)}>
          <form className="mt-1 space-y-3" onSubmit={editForm.handleSubmit(onEdit)}>
            <Input label="Name" {...editForm.register("name")} error={editForm.formState.errors.name?.message} />
            <Input label="Stream" {...editForm.register("stream")} error={editForm.formState.errors.stream?.message} />
            <Select
              label="Level"
              options={[
                { value: "O_LEVEL", label: "O-Level / CBC" },
                { value: "A_LEVEL", label: "A-Level" },
              ]}
              {...editForm.register("level")}
            />
            <Select
              label="Academic year"
              options={years.map((y) => ({ value: y.id, label: y.name }))}
              {...editForm.register("academicYearId")}
            />
            <Select
              label="Class teacher (optional)"
              options={teacherOpts}
              {...editForm.register("classTeacherId", {
                setValueAs: (v: string) => (v === "" ? null : v),
              })}
            />
            <div className="flex gap-2">
              <Button type="submit" loading={Boolean(editing && busyId === editing.id)}>
                Save changes
              </Button>
              <Button type="button" variant="secondary" onClick={() => setEditing(null)}>
                Cancel
              </Button>
            </div>
          </form>
      </Modal>
      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title="Delete class?"
        description="This cannot be undone. If linked students/records exist, deletion will be blocked."
        confirmLabel="Delete"
        danger
        loading={Boolean(confirmDelete && busyId === confirmDelete.id)}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => void remove()}
      />
      <Modal open={createOpen} title="New class" onClose={() => setCreateOpen(false)}>
        <form className="space-y-3" onSubmit={form.handleSubmit(onSubmit)}>
          <Input label="Name" {...form.register("name")} error={form.formState.errors.name?.message} />
          <Input label="Stream" {...form.register("stream")} error={form.formState.errors.stream?.message} />
          <Select
            label="Level"
            options={[
              { value: "O_LEVEL", label: "O-Level / CBC" },
              { value: "A_LEVEL", label: "A-Level" },
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
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Create class</Button>
          </div>
        </form>
      </Modal>
    </PageWrapper>
  );
}
