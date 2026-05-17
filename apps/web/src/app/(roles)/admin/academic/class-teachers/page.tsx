"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { AcademicYear, SchoolClass } from "@uganda-cbc-sms/shared";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { Table, type Column } from "@/components/ui/Table";
import { useTeachingStaff } from "@/hooks/useTeachingStaff";
import { apiGet, apiPut } from "@/lib/api";

type ClassTeacherAssignment = {
  id: string;
  classId: string;
  className: string;
  classStream: string;
  teacherId: string;
  teacherName: string;
  teacherRole: string;
  academicYearId: string;
  academicYearName: string;
  isHomeroom: boolean;
};

type Row = ClassTeacherAssignment & Record<string, unknown>;

const CHECK =
  "h-4 w-4 rounded border-border text-foreground accent-brand disabled:cursor-not-allowed disabled:opacity-50";

export default function AdminClassTeachersPage() {
  const searchParams = useSearchParams();
  const initialClassId = searchParams.get("classId") ?? "";
  const initialYearId = searchParams.get("academicYearId") ?? "";
  const { staff, loading: staffLoading } = useTeachingStaff();
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [academicYearId, setAcademicYearId] = useState("");
  const [classId, setClassId] = useState("");
  const [assignments, setAssignments] = useState<ClassTeacherAssignment[]>([]);
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<string[]>([]);
  const [homeroomTeacherId, setHomeroomTeacherId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const classOptions = useMemo(() => {
    const filtered = academicYearId
      ? classes.filter((c) => c.academicYearId === academicYearId)
      : classes;
    return filtered.map((c) => ({ value: c.id, label: `${c.name} ${c.stream}` }));
  }, [classes, academicYearId]);

  const teacherChecklist = useMemo(
    () =>
      staff.filter((t) => ["class_teacher", "subject_teacher", "headteacher"].includes(t.role)),
    [staff],
  );

  const loadMeta = async () => {
    const [y, c] = await Promise.all([
      apiGet<AcademicYear[]>("/academic/years"),
      apiGet<SchoolClass[]>("/academic/classes"),
    ]);
    setYears(y);
    setClasses(c);
    const yearId = academicYearId || initialYearId || y[0]?.id || "";
    if (yearId && yearId !== academicYearId) setAcademicYearId(yearId);
    const yearClasses = yearId ? c.filter((x) => x.academicYearId === yearId) : c;
    const pickClass =
      (initialClassId && yearClasses.find((x) => x.id === initialClassId)) ||
      yearClasses[0];
    if (pickClass && !classId) setClassId(pickClass.id);
  };

  const loadAssignments = async (yId: string, cId: string) => {
    if (!yId || !cId) {
      setAssignments([]);
      return;
    }
    const rows = await apiGet<ClassTeacherAssignment[]>(
      `/academic/class-teacher-assignments?academicYearId=${encodeURIComponent(yId)}&classId=${encodeURIComponent(cId)}`,
    );
    setAssignments(rows);
    setSelectedTeacherIds(rows.map((r) => r.teacherId));
    setHomeroomTeacherId(rows.find((r) => r.isHomeroom)?.teacherId ?? "");
  };

  useEffect(() => {
    void (async () => {
      try {
        await loadMeta();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!academicYearId || !classId) return;
    void loadAssignments(academicYearId, classId).catch((e) => {
      setErr(e instanceof Error ? e.message : "Failed to load assignments");
    });
  }, [academicYearId, classId]);

  const onSave = async () => {
    if (!classId || !academicYearId) return;
    setSaving(true);
    setErr(null);
    setOk(null);
    try {
      const teachers = selectedTeacherIds.map((teacherId) => ({
        teacherId,
        isHomeroom: teacherId === homeroomTeacherId,
      }));
      await apiPut(`/academic/classes/${encodeURIComponent(classId)}/teacher-assignments`, {
        academicYearId,
        teachers,
      });
      await loadAssignments(academicYearId, classId);
      setOk("Class teachers saved.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<Row>[] = [
    {
      key: "teacherName",
      header: "Teacher",
      render: (r) => `${r.teacherName} (${r.teacherRole.replace(/_/g, " ")})`,
    },
    {
      key: "isHomeroom",
      header: "Homeroom head",
      render: (r) => (r.isHomeroom ? "Yes" : "—"),
    },
  ];

  return (
    <PageWrapper
      title="Class teachers"
      description="Assign multiple teachers to each class. One homeroom teacher leads the class with the board."
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

      <Card title="Select class">
        <p className="mb-3 text-sm text-muted-foreground">
          A class may have many teachers. The homeroom teacher is the class head for reports and leadership; other
          teachers support the same learners. Subject teaching load is still managed under Class subjects and Teacher
          workload.
        </p>
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
      </Card>

      <Card title="Assign teachers">
        {staffLoading || loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : !classId ? (
          <p className="text-sm text-muted-foreground">Select a class.</p>
        ) : (
          <>
            <div className="mb-4 max-h-64 space-y-2 overflow-auto rounded-md border border-border p-3">
              {teacherChecklist.map((t) => (
                <label key={t.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className={CHECK}
                    checked={selectedTeacherIds.includes(t.id)}
                    onChange={(e) =>
                      setSelectedTeacherIds((prev) =>
                        e.target.checked ? [...prev, t.id] : prev.filter((id) => id !== t.id),
                      )
                    }
                  />
                  {t.fullName} ({t.role.replace(/_/g, " ")})
                </label>
              ))}
            </div>
            <Select
              label="Homeroom (class head)"
              options={[
                { value: "", label: "— None —" },
                ...selectedTeacherIds
                  .map((id) => teacherChecklist.find((t) => t.id === id))
                  .filter(Boolean)
                  .map((t) => ({ value: t!.id, label: t!.fullName })),
              ]}
              value={homeroomTeacherId}
              onChange={(e) => setHomeroomTeacherId(e.target.value)}
            />
            <div className="mt-4 flex justify-end">
              <Button type="button" loading={saving} onClick={() => void onSave()}>
                Save class teachers
              </Button>
            </div>
          </>
        )}
      </Card>

      <Card title={`Current assignments (${assignments.length})`}>
        <Table columns={columns} rows={assignments as Row[]} loading={loading} pageSize={100} />
      </Card>
    </PageWrapper>
  );
}
