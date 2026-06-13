"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { AcademicYear, SchoolClass } from "@uganda-cbc-sms/shared";
import { AcademicLevelScope } from "@/components/academic/AcademicLevelScope";
import {
  TeacherWorkloadChart,
  type TeacherWorkloadSummary,
} from "@/components/academic/TeacherWorkloadChart";
import { TeacherTeachableSubjectsPanel } from "@/components/academic/TeacherTeachableSubjectsPanel";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { Table, type Column } from "@/components/ui/Table";
import { useAcademicLevelScope } from "@/hooks/useAcademicLevelScope";
import { useTeachingStaff } from "@/hooks/useTeachingStaff";
import {
  classDisplayName,
  filterClassesByLevel,
  levelLabel,
  levelShortLabel,
} from "@/lib/academicLevel";
import { apiGet, apiPost } from "@/lib/api";

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
  const searchParams = useSearchParams();
  const { level, setLevel, hrefWithLevel } = useAcademicLevelScope("O_LEVEL");
  const { staff: teachers, options: teacherOptions, loading: staffLoading } = useTeachingStaff();
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [academicYearId, setAcademicYearId] = useState(searchParams.get("academicYearId") ?? "");
  const [classFilterId, setClassFilterId] = useState("");
  const [teacherId, setTeacherId] = useState(searchParams.get("teacherId") ?? "");
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
  const [unassigned, setUnassigned] = useState<UnassignedRow[]>([]);
  const [selectedUnassigned, setSelectedUnassigned] = useState<string[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [unassignedLoading, setUnassignedLoading] = useState(false);
  const [sectionBusy, setSectionBusy] = useState(false);
  const [busyRemoveId, setBusyRemoveId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [workloadSummary, setWorkloadSummary] = useState<TeacherWorkloadSummary | null>(null);
  const [workloadLoading, setWorkloadLoading] = useState(true);

  const levelClasses = useMemo(
    () => filterClassesByLevel(classes, level, academicYearId),
    [classes, level, academicYearId],
  );

  const classFilterOptions = useMemo(
    () => [
      { value: "", label: `All ${levelShortLabel(level)} classes` },
      ...levelClasses.map((c) => ({ value: c.id, label: classDisplayName(c) })),
    ],
    [levelClasses, level],
  );

  useEffect(() => {
    if (classFilterId && !levelClasses.some((c) => c.id === classFilterId)) {
      setClassFilterId("");
    }
  }, [classFilterId, levelClasses]);

  const selectedTeacher = useMemo(
    () => teachers.find((t) => t.id === teacherId) ?? null,
    [teachers, teacherId],
  );

  const loadLookups = async (): Promise<{ yearId: string; teacherIdResolved: string }> => {
    const [y, c] = await Promise.all([
      apiGet<AcademicYear[]>("/academic/years"),
      apiGet<SchoolClass[]>("/academic/classes"),
    ]);
    setYears(y);
    setClasses(c);
    const yearId = academicYearId || y[0]?.id || "";
    if (yearId && yearId !== academicYearId) setAcademicYearId(yearId);
    const firstTeacher = teachers[0];
    const teacherIdResolved = teacherId || firstTeacher?.id || "";
    if (teacherIdResolved && teacherIdResolved !== teacherId) setTeacherId(teacherIdResolved);
    return { yearId, teacherIdResolved };
  };

  const loadTeacherDataWith = async (yId: string, tId: string, classId?: string) => {
    if (!yId || !tId) {
      setAssignments([]);
      return;
    }
    setAssignmentsLoading(true);
    try {
      const q = new URLSearchParams({ academicYearId: yId, level });
      const resolvedClassId = classId ?? classFilterId;
      if (resolvedClassId) q.set("classId", resolvedClassId);
      const data = await apiGet<{ assignments: TeacherAssignment[]; totalCount: number }>(
        `/academic/teachers/${encodeURIComponent(tId)}/assignments?${q.toString()}`,
      );
      setAssignments(data.assignments);
    } finally {
      setAssignmentsLoading(false);
    }
  };

  const loadWorkloadSummaryWith = async (yId: string, classId?: string) => {
    if (!yId) {
      setWorkloadSummary(null);
      return;
    }
    const q = new URLSearchParams({ academicYearId: yId, level });
    if (classId) q.set("classId", classId);
    const data = await apiGet<TeacherWorkloadSummary>(`/academic/workload-summary?${q.toString()}`);
    setWorkloadSummary(data);
  };

  const loadUnassignedWith = async (yId: string, tId?: string, classId?: string) => {
    if (!yId) {
      setUnassigned([]);
      return;
    }
    setUnassignedLoading(true);
    try {
      const q = new URLSearchParams({ academicYearId: yId, level });
      if (classId) q.set("classId", classId);
      if (tId) q.set("teacherId", tId);
      const data = await apiGet<{ unassigned: UnassignedRow[]; count: number }>(
        `/academic/class-subjects/unassigned?${q.toString()}`,
      );
      setUnassigned(data.unassigned);
      setSelectedUnassigned((prev) => prev.filter((id) => data.unassigned.some((r) => r.id === id)));
    } finally {
      setUnassignedLoading(false);
    }
  };

  const load = async () => {
    setErr(null);
    setWorkloadLoading(true);
    try {
      const { yearId, teacherIdResolved } = await loadLookups();
      await Promise.all([
        loadTeacherDataWith(yearId, teacherIdResolved),
        loadUnassignedWith(yearId, teacherIdResolved, classFilterId || undefined),
        loadWorkloadSummaryWith(yearId, classFilterId || undefined),
      ]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setPageLoading(false);
      setWorkloadLoading(false);
    }
  };

  useEffect(() => {
    if (staffLoading) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staffLoading]);

  useEffect(() => {
    if (staffLoading || pageLoading || !academicYearId) return;
    void refreshForLevelChange();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level]);

  const refreshForLevelChange = async () => {
    if (!academicYearId) return;
    setSectionBusy(true);
    setWorkloadLoading(true);
    setErr(null);
    try {
      await Promise.all([
        loadTeacherDataWith(academicYearId, teacherId),
        loadUnassignedWith(academicYearId, teacherId || undefined, classFilterId || undefined),
        loadWorkloadSummaryWith(academicYearId, classFilterId || undefined),
      ]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to refresh level data");
    } finally {
      setSectionBusy(false);
      setWorkloadLoading(false);
    }
  };

  const refreshForYearChange = async (yearId: string) => {
    setSectionBusy(true);
    setWorkloadLoading(true);
    setErr(null);
    try {
      await Promise.all([
        loadUnassignedWith(yearId, teacherId || undefined, classFilterId || undefined),
        loadTeacherDataWith(yearId, teacherId),
        loadWorkloadSummaryWith(yearId, classFilterId || undefined),
      ]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to refresh data");
    } finally {
      setSectionBusy(false);
      setWorkloadLoading(false);
    }
  };

  const refreshForTeacherChange = async (tId: string) => {
    if (!academicYearId) return;
    setSectionBusy(true);
    setErr(null);
    try {
      await Promise.all([
        loadTeacherDataWith(academicYearId, tId),
        loadUnassignedWith(academicYearId, tId, classFilterId || undefined),
      ]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load assignments");
    } finally {
      setSectionBusy(false);
    }
  };

  const refreshForClassFilter = async (classId: string) => {
    if (!academicYearId) return;
    setSectionBusy(true);
    setWorkloadLoading(true);
    setErr(null);
    try {
      await Promise.all([
        loadTeacherDataWith(academicYearId, teacherId),
        loadUnassignedWith(academicYearId, teacherId || undefined, classId || undefined),
        loadWorkloadSummaryWith(academicYearId, classId || undefined),
      ]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to refresh slots");
    } finally {
      setSectionBusy(false);
      setWorkloadLoading(false);
    }
  };

  const refetchAll = async () => {
    await Promise.all([
      loadTeacherDataWith(academicYearId, teacherId),
      loadUnassignedWith(academicYearId, teacherId || undefined, classFilterId || undefined),
      loadWorkloadSummaryWith(academicYearId, classFilterId || undefined),
    ]);
  };

  const onChartSelectTeacher = (tId: string) => {
    setTeacherId(tId);
    void refreshForTeacherChange(tId);
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
      title="Subject teachers"
      description={`Single place to set teachable subjects and assign ${levelShortLabel(level)} class–subject slots`}
    >
      <div className="mb-3 flex flex-wrap items-center gap-4">
        <Link href={hrefWithLevel("/admin/academic/assignments")} className="text-sm font-medium text-brand hover:underline">
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

      <Card title="School level">
        <AcademicLevelScope
          level={level}
          onLevelChange={setLevel}
          description={`Showing ${levelLabel(level)} classes and eligible teachers only.`}
        />
      </Card>

      <Card title="Filters">
        <p className="mb-3 text-sm text-muted-foreground">
          Assign each class–subject slot to the teacher who teaches that subject. Set teachable subjects on each
          teacher&apos;s profile first, then pick a teacher and assign matching unassigned slots below.
        </p>
        <div className="grid gap-3 md:grid-cols-3">
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
            label="Class (filter)"
            options={classFilterOptions}
            value={classFilterId}
            onChange={(e) => {
              const v = e.target.value;
              setClassFilterId(v);
              void refreshForClassFilter(v);
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

      {teacherId &&
      selectedTeacher &&
      (selectedTeacher.role === "subject_teacher" || selectedTeacher.role === "class_teacher") ? (
        <Card title="Teachable subjects (qualifications)">
          <TeacherTeachableSubjectsPanel
            teacherId={teacherId}
            teacherName={selectedTeacher.fullName}
            highlightLevel={level}
            onSaved={async () => {
              await refetchAll();
            }}
          />
        </Card>
      ) : null}

      <Card title="Workload overview">
        <TeacherWorkloadChart
          summary={workloadSummary}
          selectedTeacherId={teacherId || undefined}
          onSelectTeacher={onChartSelectTeacher}
          loading={workloadLoading || pageLoading}
        />
      </Card>

      <Card title="Current assignments">
        {!teacherId ? (
          <p className="text-sm text-muted-foreground">Select a teacher to view assignments.</p>
        ) : !assignmentsLoading && !pageLoading && assignments.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No subject slots assigned to this teacher for this year
            {classFilterId ? " in the selected class" : ""}.
          </p>
        ) : (
          <Table
            columns={assignmentColumns}
            rows={assignments as AssignmentRow[]}
            loading={assignmentsLoading || pageLoading}
            loadingRows={5}
            pageSize={500}
          />
        )}
      </Card>

      <Card title="Unassigned slots">
        <p className="mb-3 text-sm text-muted-foreground">
          Class–subject rows with no teacher. When a teacher is selected, only slots they are qualified to teach
          are listed (matching O-Level / A-Level and teachable subjects on their profile).
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
        {!unassignedLoading && !pageLoading && unassigned.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {teacherId
              ? "No unassigned slots this teacher can take for the current filters."
              : "No unassigned slots for this year."}
          </p>
        ) : (
          <Table
            columns={unassignedColumns}
            rows={unassigned as UnassignedTableRow[]}
            loading={unassignedLoading || pageLoading}
            loadingRows={5}
            pageSize={500}
          />
        )}
      </Card>
    </PageWrapper>
  );
}
