"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { AcademicYear, SchoolClass, Subject, UserPublic } from "@uganda-cbc-sms/shared";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Table, type Column } from "@/components/ui/Table";
import { apiDelete, apiGet, apiPost } from "@/lib/api";

type Assignment = {
  id: string;
  classId: string;
  subjectId: string;
  teacherId: string | null;
  subjectName: string;
  subjectCode: string;
  teacherName: string | null;
};
type UsersListResponse =
  | UserPublic[]
  | {
      items: UserPublic[];
    };

type Row = Assignment & Record<string, unknown>;

const CHECK =
  "h-4 w-4 rounded border-border text-foreground accent-brand disabled:cursor-not-allowed disabled:opacity-50";

const ACTION_DANGER_BTN =
  "inline-flex items-center rounded-md border border-red-500/40 bg-red-500/10 px-2 py-1 text-xs font-medium text-red-700 transition-ui hover:bg-red-500/20 dark:text-red-300 disabled:cursor-not-allowed disabled:opacity-50";

export default function AdminAcademicClassSubjectsPage() {
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<UserPublic[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [academicYearId, setAcademicYearId] = useState("");
  const [classId, setClassId] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [busyBulk, setBusyBulk] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkTeacherId, setBulkTeacherId] = useState("");
  const [bulkTeacherCount, setBulkTeacherCount] = useState<number | null>(null);
  const [bulkTeacherCountLoading, setBulkTeacherCountLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Assignment | null>(null);

  const selectedClass = useMemo(() => classes.find((c) => c.id === classId) ?? null, [classes, classId]);
  const filteredSubjects = useMemo(
    () => subjects.filter((s) => !selectedClass || s.level === selectedClass.level),
    [subjects, selectedClass],
  );
  const teacherOptions = useMemo(
    () => [
      { value: "", label: "— Unassigned —" },
      ...teachers
        .filter((u) => ["subject_teacher", "headteacher", "admin"].includes(u.role))
        .map((u) => ({ value: u.id, label: `${u.fullName} (${u.role})` })),
    ],
    [teachers],
  );

  const assignmentIdSet = useMemo(() => new Set(assignments.map((a) => a.id)), [assignments]);

  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => assignmentIdSet.has(id)));
  }, [assignmentIdSet]);

  const loadLookups = async () => {
    const [y, c, s, usersResponse] = await Promise.all([
      apiGet<AcademicYear[]>("/academic/years"),
      apiGet<SchoolClass[]>("/academic/classes"),
      apiGet<Subject[]>("/academic/subjects"),
      apiGet<UsersListResponse>("/users"),
    ]);
    const u = Array.isArray(usersResponse) ? usersResponse : (usersResponse.items ?? []);
    setYears(y);
    setClasses(c);
    setSubjects(s);
    setTeachers(u);
    if (!academicYearId && y[0]) setAcademicYearId(y[0].id);
    if (!classId && c[0]) setClassId(c[0].id);
  };

  const loadAssignments = async (nextYearId: string, nextClassId: string) => {
    if (!nextYearId || !nextClassId) {
      setAssignments([]);
      return;
    }
    const q = `classId=${encodeURIComponent(nextClassId)}&academicYearId=${encodeURIComponent(nextYearId)}`;
    const rows = await apiGet<Assignment[]>(`/academic/class-subjects?${q}`);
    setAssignments(rows);
  };

  const load = async () => {
    setErr(null);
    try {
      await loadLookups();
      await loadAssignments(academicYearId, classId);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!academicYearId || !classId) return;
    void loadAssignments(academicYearId, classId).catch((e) => {
      setErr(e instanceof Error ? e.message : "Failed to load assignments");
    });
  }, [academicYearId, classId]);

  useEffect(() => {
    if (!bulkModalOpen || !academicYearId || !bulkTeacherId) {
      setBulkTeacherCount(null);
      return;
    }
    setBulkTeacherCountLoading(true);
    void (async () => {
      try {
        const data = await apiGet<{ assignments: unknown[]; totalCount: number }>(
          `/academic/teachers/${encodeURIComponent(bulkTeacherId)}/assignments?academicYearId=${encodeURIComponent(academicYearId)}`,
        );
        setBulkTeacherCount(data.totalCount);
      } catch {
        setBulkTeacherCount(null);
      } finally {
        setBulkTeacherCountLoading(false);
      }
    })();
  }, [bulkModalOpen, academicYearId, bulkTeacherId]);

  const onBulkAssign = async () => {
    if (!academicYearId || !classId || selectedSubjects.length === 0) return;
    setErr(null);
    setOk(null);
    try {
      await apiPost("/academic/class-subjects/bulk", {
        classId,
        academicYearId,
        subjectIds: selectedSubjects,
      });
      await loadAssignments(academicYearId, classId);
      setAssignOpen(false);
      setSelectedSubjects([]);
      setOk("Subjects assigned to class.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Bulk assignment failed");
    }
  };

  const onBulkTeacherSave = async () => {
    if (selectedIds.length === 0) return;
    setErr(null);
    setOk(null);
    setBusyBulk(true);
    try {
      await apiPost("/academic/class-subjects/bulk-assign-teacher", {
        teacherId: bulkTeacherId ? bulkTeacherId : null,
        classSubjectIds: selectedIds,
      });
      await loadAssignments(academicYearId, classId);
      setBulkModalOpen(false);
      setBulkTeacherId("");
      setSelectedIds([]);
      setOk("Teacher assignment updated for selected subjects.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to update teacher assignments");
    } finally {
      setBusyBulk(false);
    }
  };

  const onDelete = async () => {
    if (!confirmDelete) return;
    setErr(null);
    setOk(null);
    setBusyId(confirmDelete.id);
    try {
      await apiDelete(`/academic/class-subjects/${encodeURIComponent(confirmDelete.id)}`);
      await loadAssignments(academicYearId, classId);
      setConfirmDelete(null);
      setSelectedIds((prev) => prev.filter((id) => id !== confirmDelete.id));
      setOk("Assignment removed.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to remove assignment");
    } finally {
      setBusyId(null);
    }
  };

  const allSelected =
    assignments.length > 0 && selectedIds.length === assignments.length && assignments.every((a) => selectedIds.includes(a.id));

  const columns: Column<Row>[] = [
    {
      key: "select",
      header: "",
      render: (r) => (
        <input
          type="checkbox"
          className={CHECK}
          checked={selectedIds.includes(r.id)}
          disabled={busyBulk}
          onChange={(e) =>
            setSelectedIds((prev) =>
              e.target.checked ? [...prev, r.id] : prev.filter((id) => id !== r.id),
            )
          }
        />
      ),
    },
    { key: "subjectName", header: "Subject" },
    { key: "subjectCode", header: "Code" },
    { key: "teacherName", header: "Teacher", render: (r) => r.teacherName ?? "— Unassigned —" },
    {
      key: "actions",
      header: "",
      render: (r) => (
        <button
          type="button"
          className={ACTION_DANGER_BTN}
          disabled={busyId === r.id || busyBulk}
          onClick={() => setConfirmDelete(r)}
        >
          Remove
        </button>
      ),
    },
  ];

  return (
    <PageWrapper title="Class-subject assignments" description="Assign subjects to classes by academic year">
      <div className="mb-3">
        <Link href="/admin/academic" className="text-sm font-medium text-brand hover:underline">
          ← Back to Academic
        </Link>
      </div>
      <div className="mb-4 space-y-2">
        {ok ? <Alert tone="success">{ok}</Alert> : null}
        {err ? <Alert tone="error">{err}</Alert> : null}
      </div>

      <Card title="Filters">
        <div className="grid gap-3 md:grid-cols-2">
          <Select
            label="Academic year"
            options={years.map((y) => ({ value: y.id, label: y.name }))}
            value={academicYearId}
            onChange={(e) => setAcademicYearId(e.target.value)}
          />
          <Select
            label="Class"
            options={classes.map((c) => ({ value: c.id, label: `${c.name} ${c.stream}` }))}
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
          />
        </div>
      </Card>

      <Card title={`Assigned subjects (${assignments.length})`}>
        <div className="mb-3 flex flex-wrap items-center justify-end gap-2">
          {selectedIds.length > 0 ? (
            <Button
              type="button"
              disabled={!academicYearId || busyBulk}
              onClick={() => {
                setBulkTeacherId("");
                setBulkModalOpen(true);
              }}
            >
              Assign teacher to {selectedIds.length} subject(s)
            </Button>
          ) : null}
          <Button
            type="button"
            disabled={!academicYearId || !classId}
            onClick={() => {
              setSelectedSubjects([]);
              setAssignOpen(true);
            }}
          >
            Assign subjects
          </Button>
        </div>
        {!loading && assignments.length === 0 ? (
          <p className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
            No subjects assigned for this class and year yet.
          </p>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                className={CHECK}
                checked={allSelected}
                disabled={busyBulk || assignments.length === 0}
                onChange={(e) =>
                  setSelectedIds(e.target.checked ? assignments.map((a) => a.id) : [])
                }
              />
              <span>Select all ({assignments.length})</span>
            </div>
            <Table
              columns={columns}
              rows={assignments as Row[]}
              loading={loading}
              searchKeys={["subjectName", "subjectCode"]}
              pageSize={500}
            />
          </div>
        )}
      </Card>

      <Modal open={assignOpen} title="Assign subjects" onClose={() => setAssignOpen(false)}>
        <p className="mb-3 text-sm text-muted-foreground">
          Select subjects for {selectedClass ? `${selectedClass.name} ${selectedClass.stream}` : "class"}.
        </p>
        <div className="max-h-80 space-y-2 overflow-auto rounded-md border border-border p-3">
          {filteredSubjects.map((s) => (
            <label key={s.id} className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-border"
                checked={selectedSubjects.includes(s.id)}
                onChange={(e) =>
                  setSelectedSubjects((prev) =>
                    e.target.checked ? [...prev, s.id] : prev.filter((id) => id !== s.id),
                  )
                }
              />
              {s.code} - {s.name}
            </label>
          ))}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => setAssignOpen(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={selectedSubjects.length === 0} onClick={() => void onBulkAssign()}>
            Assign selected
          </Button>
        </div>
      </Modal>

      <Modal
        open={bulkModalOpen}
        title="Assign teacher to selected subjects"
        onClose={() => {
          if (!busyBulk) {
            setBulkModalOpen(false);
            setBulkTeacherId("");
          }
        }}
      >
        <p className="mb-3 text-sm text-muted-foreground">
          Applies to {selectedIds.length} row(s) for the current class and academic year.
        </p>
        <Select
          label="Teacher"
          options={teacherOptions}
          value={bulkTeacherId}
          onChange={(e) => setBulkTeacherId(e.target.value)}
        />
        {bulkTeacherId ? (
          <p className="mt-2 text-sm text-muted-foreground">
            {bulkTeacherCountLoading
              ? "Loading assignment count…"
              : bulkTeacherCount !== null
                ? `This teacher is currently handling ${bulkTeacherCount} subject slot(s) this academic year (all classes).`
                : null}
          </p>
        ) : null}
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="secondary" disabled={busyBulk} onClick={() => setBulkModalOpen(false)}>
            Cancel
          </Button>
          <Button type="button" loading={busyBulk} onClick={() => void onBulkTeacherSave()}>
            Save
          </Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title="Remove subject assignment?"
        description="This removes the subject from the selected class for this academic year."
        confirmLabel="Remove"
        danger
        loading={Boolean(confirmDelete && busyId === confirmDelete.id)}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => void onDelete()}
      />
    </PageWrapper>
  );
}
