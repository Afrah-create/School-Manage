"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { AcademicYear, SchoolClass, Subject } from "@uganda-cbc-sms/shared";
import { AcademicLevelScope } from "@/components/academic/AcademicLevelScope";
import { useAcademicLevelScope } from "@/hooks/useAcademicLevelScope";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Table, type Column } from "@/components/ui/Table";
import {
  classDisplayName,
  filterClassesByLevel,
  filterSubjectsByLevel,
  levelShortLabel,
} from "@/lib/academicLevel";
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
type Row = Assignment & Record<string, unknown>;

const CHECK =
  "h-4 w-4 rounded border-border text-foreground accent-brand disabled:cursor-not-allowed disabled:opacity-50";

const ACTION_DANGER_BTN =
  "inline-flex items-center rounded-md border border-red-500/40 bg-red-500/10 px-2 py-1 text-xs font-medium text-red-700 transition-ui hover:bg-red-500/20 dark:text-red-300 disabled:cursor-not-allowed disabled:opacity-50";

export default function AdminAcademicClassSubjectsPage() {
  const searchParams = useSearchParams();
  const initialClassId = searchParams.get("classId") ?? "";
  const initialYearId = searchParams.get("academicYearId") ?? "";
  const { level, setLevel, hrefWithLevel } = useAcademicLevelScope("O_LEVEL");
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [academicYearId, setAcademicYearId] = useState("");
  const [classId, setClassId] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<Assignment | null>(null);

  const classOptions = useMemo(() => {
    const filtered = filterClassesByLevel(
      academicYearId ? classes.filter((c) => c.academicYearId === academicYearId) : classes,
      level,
    );
    return filtered.map((c) => ({ value: c.id, label: classDisplayName(c) }));
  }, [classes, academicYearId, level]);

  const selectedClass = useMemo(() => classes.find((c) => c.id === classId) ?? null, [classes, classId]);
  const filteredSubjects = useMemo(() => filterSubjectsByLevel(subjects, level), [subjects, level]);

  useEffect(() => {
    if (classId && !classOptions.some((o) => o.value === classId)) {
      setClassId(classOptions[0]?.value ?? "");
    }
  }, [classId, classOptions]);

  const loadLookups = async () => {
    const [y, c, s] = await Promise.all([
      apiGet<AcademicYear[]>("/academic/years"),
      apiGet<SchoolClass[]>("/academic/classes"),
      apiGet<Subject[]>("/academic/subjects"),
    ]);
    setYears(y);
    setClasses(c);
    setSubjects(s);
    const yearId = academicYearId || initialYearId || y[0]?.id || "";
    if (yearId && yearId !== academicYearId) setAcademicYearId(yearId);
    const yearClasses = filterClassesByLevel(
      yearId ? c.filter((x) => x.academicYearId === yearId) : c,
      level,
    );
    const pickClass =
      (initialClassId && yearClasses.find((x) => x.id === initialClassId)) ||
      yearClasses[0];
    if (pickClass && !classId) setClassId(pickClass.id);
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

  const onDelete = async () => {
    if (!confirmDelete) return;
    setErr(null);
    setOk(null);
    setBusyId(confirmDelete.id);
    try {
      await apiDelete(`/academic/class-subjects/${encodeURIComponent(confirmDelete.id)}`);
      await loadAssignments(academicYearId, classId);
      setConfirmDelete(null);
      setOk("Assignment removed.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to remove assignment");
    } finally {
      setBusyId(null);
    }
  };

  const columns: Column<Row>[] = [
    { key: "subjectName", header: "Subject" },
    { key: "subjectCode", header: "Code" },
    {
      key: "teacherName",
      header: "Teacher",
      render: (r) =>
        r.teacherName ? (
          r.teacherName
        ) : (
          <span className="text-amber-700 dark:text-amber-300">Unassigned</span>
        ),
    },
    {
      key: "actions",
      header: "",
      render: (r) => (
        <button
          type="button"
          className={ACTION_DANGER_BTN}
          disabled={busyId === r.id}
          onClick={() => setConfirmDelete(r)}
        >
          Remove
        </button>
      ),
    },
  ];

  return (
    <PageWrapper
      title="Class subjects"
      description={`Step 2 — add ${levelShortLabel(level)} subjects to each class timetable`}
    >
      <div className="mb-3 flex flex-wrap items-center gap-4">
        <Link
          href={hrefWithLevel("/admin/academic/assignments", { academicYearId })}
          className="text-sm font-medium text-brand hover:underline"
        >
          ← Teaching assignments
        </Link>
        <Link href="/admin/academic" className="text-sm text-muted-foreground hover:text-foreground">
          Academic hub
        </Link>
      </div>
      <div className="mb-4 space-y-2">
        {ok ? <Alert tone="success">{ok}</Alert> : null}
        {err ? <Alert tone="error">{err}</Alert> : null}
      </div>

      <div className="mb-4">
        <Card title="School level">
          <AcademicLevelScope
            level={level}
            onLevelChange={setLevel}
            description={`Only ${levelShortLabel(level)} classes and subjects appear below. Teacher assignment is done on the Subject teachers page.`}
          />
        </Card>
      </div>

      <Card title="Filters">
        <div className="grid gap-3 md:grid-cols-2">
          <Select
            label="Academic year"
            options={years.map((y) => ({ value: y.id, label: y.name }))}
            value={academicYearId}
            onChange={(e) => {
              setAcademicYearId(e.target.value);
              setClassId("");
            }}
          />
          <Select
            label="Class"
            options={classOptions}
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
          />
        </div>
        {classOptions.length === 0 && academicYearId ? (
          <p className="mt-3 text-sm text-amber-700 dark:text-amber-300">
            No {levelShortLabel(level)} classes for this year. Create them under{" "}
            <Link href={hrefWithLevel("/admin/academic/classes")} className="font-medium text-brand hover:underline">
              Classes
            </Link>
            .
          </p>
        ) : null}
      </Card>

      <div className="mt-4">
        <Card title={`Assigned subjects (${assignments.length})`}>
          <p className="mb-3 text-sm text-muted-foreground">
            Add or remove subjects on the class timetable here. To assign or change teachers, use{" "}
            <Link
              href={hrefWithLevel("/admin/academic/teacher-assignments", {
                academicYearId,
                classId,
              })}
              className="font-medium text-brand hover:underline"
            >
              Subject teachers
            </Link>{" "}
            — the single place for teacher–subject assignment.
          </p>
          <div className="mb-3 flex flex-wrap items-center justify-end gap-2">
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
            <Table
              columns={columns}
              rows={assignments as Row[]}
              loading={loading}
              searchKeys={["subjectName", "subjectCode", "teacherName"]}
              pageSize={500}
            />
          )}
        </Card>
      </div>

      <Modal open={assignOpen} title="Assign subjects" onClose={() => setAssignOpen(false)}>
        <p className="mb-3 text-sm text-muted-foreground">
          Select {levelShortLabel(level)} subjects for{" "}
          {selectedClass ? classDisplayName(selectedClass) : "class"}.
        </p>
        <div className="max-h-80 space-y-2 overflow-auto rounded-md border border-border p-3">
          {filteredSubjects.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No {levelShortLabel(level)} subjects in the catalogue. Add them under{" "}
              <Link href={`/admin/academic/subjects?level=${level}`} className="font-medium text-brand hover:underline">
                Subjects
              </Link>
              .
            </p>
          ) : (
            filteredSubjects.map((s) => (
              <label key={s.id} className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  className={CHECK}
                  checked={selectedSubjects.includes(s.id)}
                  onChange={(e) =>
                    setSelectedSubjects((prev) =>
                      e.target.checked ? [...prev, s.id] : prev.filter((id) => id !== s.id),
                    )
                  }
                />
                {s.code} - {s.name}
              </label>
            ))
          )}
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
