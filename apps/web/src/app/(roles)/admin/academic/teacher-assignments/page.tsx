"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { AcademicYear, UserPublic } from "@uganda-cbc-sms/shared";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { Table, type Column } from "@/components/ui/Table";
import { apiGet, apiPost } from "@/lib/api";

type UsersListResponse =
  | UserPublic[]
  | {
      items: UserPublic[];
    };

type TeacherAssignment = {
  classSubjectId: string;
  className: string;
  classStream: string;
  subjectName: string;
  termName: string | null;
  academicYear: string;
};

type UnassignedRow = {
  id: string;
  className: string;
  classStream: string;
  subjectName: string;
  termName: string | null;
};

type AssignmentRow = TeacherAssignment & Record<string, unknown>;
type UnassignedTableRow = UnassignedRow & Record<string, unknown>;

const CHECK =
  "h-4 w-4 rounded border-border text-foreground accent-brand disabled:cursor-not-allowed disabled:opacity-50";

const REMOVE_BTN =
  "inline-flex items-center rounded-md border border-border bg-card px-2 py-1 text-xs font-medium text-foreground transition-ui hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50";

export default function AdminTeacherAssignmentsPage() {
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [teachers, setTeachers] = useState<UserPublic[]>([]);
  const [academicYearId, setAcademicYearId] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
  const [unassigned, setUnassigned] = useState<UnassignedRow[]>([]);
  const [selectedUnassigned, setSelectedUnassigned] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [sectionBusy, setSectionBusy] = useState(false);
  const [busyRemoveId, setBusyRemoveId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const teacherOptions = useMemo(
    () =>
      teachers
        .filter((u) => ["subject_teacher", "headteacher", "admin"].includes(u.role))
        .map((u) => ({ value: u.id, label: `${u.fullName} (${u.role})` })),
    [teachers],
  );

  const loadLookups = async (): Promise<{ yearId: string; teacherIdResolved: string }> => {
    const [y, usersResponse] = await Promise.all([apiGet<AcademicYear[]>("/academic/years"), apiGet<UsersListResponse>("/users")]);
    const u = Array.isArray(usersResponse) ? usersResponse : (usersResponse.items ?? []);
    setYears(y);
    setTeachers(u);
    const yearId = academicYearId || y[0]?.id || "";
    if (yearId && yearId !== academicYearId) setAcademicYearId(yearId);
    const firstTeacher = u.find((x) => ["subject_teacher", "headteacher", "admin"].includes(x.role));
    const teacherIdResolved = teacherId || firstTeacher?.id || "";
    if (teacherIdResolved && teacherIdResolved !== teacherId) setTeacherId(teacherIdResolved);
    return { yearId, teacherIdResolved };
  };

  const loadTeacherDataWith = async (yId: string, tId: string) => {
    if (!yId || !tId) {
      setAssignments([]);
      return;
    }
    const data = await apiGet<{ assignments: TeacherAssignment[]; totalCount: number }>(
      `/academic/teachers/${encodeURIComponent(tId)}/assignments?academicYearId=${encodeURIComponent(yId)}`,
    );
    setAssignments(data.assignments);
  };

  const loadUnassignedWith = async (yId: string) => {
    if (!yId) {
      setUnassigned([]);
      return;
    }
    const data = await apiGet<{ unassigned: UnassignedRow[]; count: number }>(
      `/academic/class-subjects/unassigned?academicYearId=${encodeURIComponent(yId)}`,
    );
    setUnassigned(data.unassigned);
    setSelectedUnassigned((prev) => prev.filter((id) => data.unassigned.some((r) => r.id === id)));
  };

  const load = async () => {
    setErr(null);
    try {
      const { yearId, teacherIdResolved } = await loadLookups();
      await Promise.all([loadTeacherDataWith(yearId, teacherIdResolved), loadUnassignedWith(yearId)]);
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

  const refreshForYearChange = async (yearId: string) => {
    setSectionBusy(true);
    setErr(null);
    try {
      await loadUnassignedWith(yearId);
      await loadTeacherDataWith(yearId, teacherId);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to refresh data");
    } finally {
      setSectionBusy(false);
    }
  };

  const refreshForTeacherChange = async (tId: string) => {
    if (!academicYearId) return;
    setSectionBusy(true);
    setErr(null);
    try {
      await loadTeacherDataWith(academicYearId, tId);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load assignments");
    } finally {
      setSectionBusy(false);
    }
  };

  const refetchAll = async () => {
    await Promise.all([loadTeacherDataWith(academicYearId, teacherId), loadUnassignedWith(academicYearId)]);
  };

  const onRemoveAssignment = async (classSubjectId: string) => {
    if (!teacherId) return;
    setErr(null);
    setOk(null);
    setBusyRemoveId(classSubjectId);
    try {
      await apiPost("/academic/class-subjects/bulk-assign-teacher", {
        teacherId: null,
        classSubjectIds: [classSubjectId],
      });
      setOk("Assignment removed from teacher.");
      await refetchAll();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to remove assignment");
    } finally {
      setBusyRemoveId(null);
    }
  };

  const onAssignUnselected = async () => {
    if (!teacherId || selectedUnassigned.length === 0) return;
    setErr(null);
    setOk(null);
    setSectionBusy(true);
    try {
      await apiPost("/academic/class-subjects/bulk-assign-teacher", {
        teacherId,
        classSubjectIds: selectedUnassigned,
      });
      setOk(`Assigned ${selectedUnassigned.length} slot(s) to this teacher.`);
      setSelectedUnassigned([]);
      await refetchAll();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to assign");
    } finally {
      setSectionBusy(false);
    }
  };

  const unassignedIdSet = useMemo(() => new Set(unassigned.map((r) => r.id)), [unassigned]);
  useEffect(() => {
    setSelectedUnassigned((prev) => prev.filter((id) => unassignedIdSet.has(id)));
  }, [unassignedIdSet]);

  const allUnassignedSelected =
    unassigned.length > 0 &&
    selectedUnassigned.length === unassigned.length &&
    unassigned.every((r) => selectedUnassigned.includes(r.id));

  const assignmentColumns: Column<AssignmentRow>[] = [
    {
      key: "className",
      header: "Class",
      render: (r) => `${r.className} ${r.classStream}`,
    },
    { key: "subjectName", header: "Subject" },
    {
      key: "termName",
      header: "Term",
      render: (r) => r.termName ?? "—",
    },
    {
      key: "actions",
      header: "",
      render: (r) => (
        <button
          type="button"
          className={REMOVE_BTN}
          disabled={busyRemoveId === r.classSubjectId || sectionBusy}
          onClick={() => void onRemoveAssignment(r.classSubjectId)}
        >
          Remove
        </button>
      ),
    },
  ];

  const unassignedColumns: Column<UnassignedTableRow>[] = [
    {
      key: "select",
      header: "",
      render: (r) => (
        <input
          type="checkbox"
          className={CHECK}
          checked={selectedUnassigned.includes(r.id)}
          disabled={sectionBusy || !teacherId}
          onChange={(e) =>
            setSelectedUnassigned((prev) =>
              e.target.checked ? [...prev, r.id] : prev.filter((id) => id !== r.id),
            )
          }
        />
      ),
    },
    {
      key: "className",
      header: "Class",
      render: (r) => `${r.className} ${r.classStream}`,
    },
    { key: "subjectName", header: "Subject" },
    {
      key: "termName",
      header: "Term",
      render: (r) => r.termName ?? "—",
    },
  ];

  return (
    <PageWrapper
      title="Teacher workload"
      description="View and manage subject assignments per teacher by academic year"
    >
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
            onChange={(e) => {
              const v = e.target.value;
              setAcademicYearId(v);
              void refreshForYearChange(v);
            }}
          />
          <Select
            label="Teacher"
            options={teacherOptions}
            value={teacherId}
            onChange={(e) => {
              const v = e.target.value;
              setTeacherId(v);
              void refreshForTeacherChange(v);
            }}
          />
        </div>
      </Card>

      <Card title="Current assignments">
        {!teacherId ? (
          <p className="text-sm text-muted-foreground">Select a teacher to view assignments.</p>
        ) : !loading && assignments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No subject slots assigned to this teacher for this year.</p>
        ) : (
          <Table
            columns={assignmentColumns}
            rows={assignments as AssignmentRow[]}
            loading={loading || sectionBusy}
            pageSize={500}
          />
        )}
      </Card>

      <Card title="Unassigned slots">
        <p className="mb-3 text-sm text-muted-foreground">
          Class–subject rows with no teacher for the selected academic year. Select slots to assign to the teacher above.
        </p>
        {unassigned.length > 0 ? (
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                className={CHECK}
                checked={allUnassignedSelected}
                disabled={sectionBusy || !teacherId}
                onChange={(e) =>
                  setSelectedUnassigned(e.target.checked ? unassigned.map((r) => r.id) : [])
                }
              />
              Select all ({unassigned.length})
            </label>
            <Button
              type="button"
              disabled={!teacherId || selectedUnassigned.length === 0 || sectionBusy}
              onClick={() => void onAssignUnselected()}
            >
              Assign selected to this teacher ({selectedUnassigned.length})
            </Button>
          </div>
        ) : null}
        {!loading && unassigned.length === 0 ? (
          <p className="text-sm text-muted-foreground">No unassigned slots for this year.</p>
        ) : (
          <Table
            columns={unassignedColumns}
            rows={unassigned as UnassignedTableRow[]}
            loading={loading || sectionBusy}
            pageSize={500}
          />
        )}
      </Card>
    </PageWrapper>
  );
}
