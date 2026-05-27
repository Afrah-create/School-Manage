"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useMyTeachingScope } from "@/hooks/useMyTeachingScope";
import { apiGet, apiPost, apiPut } from "@/lib/api";
import { classDisplayName } from "@/lib/academicLevel";

type AttendanceStatus = "present" | "absent" | "late";

type RegisterRow = {
  studentId: string;
  studentName: string;
  studentNumber: string;
  status: AttendanceStatus | null;
};

type RegisterResponse = {
  classId: string;
  className: string;
  classStream: string;
  date: string;
  registerId: string | null;
  registerStatus: "draft" | "submitted" | "locked";
  submittedAt: string | null;
  students: RegisterRow[];
  summary: {
    total: number;
    present: number;
    absent: number;
    late: number;
    unmarked: number;
  };
};

const PAGE_SIZE = 50;
const STATUS_OPTIONS: AttendanceStatus[] = ["present", "absent", "late"];

export default function ClassTeacherAttendancePage() {
  const scope = useMyTeachingScope();

  const classOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of scope.homeroomClasses) {
      map.set(c.classId, classDisplayName({ name: c.className, stream: c.classStream }));
    }
    for (const c of scope.myClasses) {
      if (!map.has(c.classId)) {
        map.set(c.classId, classDisplayName({ name: c.className, stream: c.classStream }));
      }
    }
    for (const s of scope.subjectSlots) {
      if (!map.has(s.classId)) {
        map.set(s.classId, classDisplayName({ name: s.className, stream: s.classStream }));
      }
    }
    return [...map.entries()].map(([value, label]) => ({ value, label }));
  }, [scope.homeroomClasses, scope.myClasses, scope.subjectSlots]);

  const [classId, setClassId] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [register, setRegister] = useState<RegisterResponse | null>(null);
  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus>>({});
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!classId && classOptions[0]) {
      setClassId(classOptions[0].value);
    }
  }, [classId, classOptions]);

  const editable = register?.registerStatus === "draft" || !register;

  const applyRegister = useCallback((data: RegisterResponse) => {
    setRegister(data);
    const next: Record<string, AttendanceStatus> = {};
    for (const row of data.students) {
      next[row.studentId] = row.status ?? "present";
    }
    setStatuses(next);
    setSelectedStudentIds([]);
    setPage(0);
  }, []);

  const load = useCallback(async () => {
    if (!classId) return;
    setLoading(true);
    setErr(null);
    setOk(null);
    try {
      const r = await apiGet<RegisterResponse>(
        `/attendance/register?classId=${encodeURIComponent(classId)}&date=${encodeURIComponent(date)}`,
      );
      applyRegister(r);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load register");
    } finally {
      setLoading(false);
    }
  }, [applyRegister, classId, date]);

  const buildRowsPayload = useCallback(() => {
    if (!register) return [];
    return register.students.map((s) => ({
      studentId: s.studentId,
      status: statuses[s.studentId] ?? "present",
    }));
  }, [register, statuses]);

  const saveDraft = useCallback(async () => {
    if (!classId || !register || !editable) return;
    setSaving(true);
    setErr(null);
    setOk(null);
    try {
      const data = await apiPut<RegisterResponse>("/attendance/register", {
        classId,
        date,
        rows: buildRowsPayload(),
      });
      applyRegister(data);
      setOk("Attendance draft saved.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to save draft");
    } finally {
      setSaving(false);
    }
  }, [applyRegister, buildRowsPayload, classId, date, editable, register]);

  const submitRegister = async () => {
    if (!classId || !register || !editable) return;
    setSubmitting(true);
    setErr(null);
    setOk(null);
    try {
      const data = await apiPut<RegisterResponse>("/attendance/register", {
        classId,
        date,
        rows: buildRowsPayload(),
      });
      applyRegister(data);
      const submitted = await apiPost<RegisterResponse>("/attendance/register/submit", { classId, date });
      applyRegister(submitted);
      setOk("Attendance register submitted.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to submit register");
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (classId) {
      void load();
    }
  }, [classId, date, load]);

  const setOneStatus = (studentId: string, status: AttendanceStatus) => {
    if (!editable) return;
    setStatuses((prev) => ({ ...prev, [studentId]: status }));
  };

  const applyBulkStatus = (status: AttendanceStatus) => {
    if (!editable || !register) return;
    const targetIds =
      selectedStudentIds.length > 0 ? selectedStudentIds : register.students.map((s) => s.studentId);
    setStatuses((prev) => {
      const next = { ...prev };
      for (const id of targetIds) {
        next[id] = status;
      }
      return next;
    });
  };

  const visibleRows = useMemo(() => {
    const rows = register?.students ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) => r.studentName.toLowerCase().includes(q) || r.studentNumber.toLowerCase().includes(q),
    );
  }, [register?.students, search]);

  const pageCount = Math.max(1, Math.ceil(visibleRows.length / PAGE_SIZE));
  const pagedRows = visibleRows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const allVisibleSelected =
    pagedRows.length > 0 && pagedRows.every((r) => selectedStudentIds.includes(r.studentId));

  const totals = useMemo(() => {
    if (!register) return { total: 0, present: 0, absent: 0, late: 0 };
    let present = 0;
    let absent = 0;
    let late = 0;
    for (const row of register.students) {
      const status = statuses[row.studentId] ?? "present";
      if (status === "present") present += 1;
      else if (status === "absent") absent += 1;
      else late += 1;
    }
    return {
      total: register.students.length,
      present,
      absent,
      late,
    };
  }, [register, statuses]);

  const attendanceRate =
    totals.total > 0 ? Math.round(((totals.present + totals.late) / totals.total) * 1000) / 10 : 0;

  const noClasses = classOptions.length === 0 && !scope.isLoading;

  return (
    <PageWrapper
      title="Attendance register"
      description="Mark the whole class at once, save a draft, then submit when done."
    >
      <p className="-mt-4 mb-4">
        <Link href="/class-teacher/attendance/history" className="text-sm font-medium text-brand hover:underline">
          View attendance history
        </Link>
      </p>
      {err ? <Alert tone="error">{err}</Alert> : null}
      {ok ? <Alert tone="success">{ok}</Alert> : null}
      {noClasses ? (
        <Alert tone="info">
          No classes are assigned to you for {scope.activeYear?.name ?? "this year"}. Ask an administrator to
          set your class or subject assignments.
        </Alert>
      ) : null}

      <Card title="Register">
        <div className="mb-4 grid gap-3 md:grid-cols-2">
          <Select
            label="Class"
            options={classOptions}
            value={classId}
            disabled={classOptions.length === 0}
            onChange={(e) => setClassId(e.target.value)}
          />
          <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button type="button" disabled={!classId} loading={loading} onClick={() => void load()}>
            Refresh register
          </Button>
          {register ? (
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={register.registerStatus === "draft" ? "neutral" : "warning"}>
                {register.registerStatus}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {totals.total} learners · {totals.present} present · {totals.absent} absent · {totals.late}{" "}
                late · {attendanceRate}% rate
              </span>
            </div>
          ) : null}
        </div>
      </Card>

      <div className="mt-4">
        <Card title="Mark attendance">
          {!register && !loading ? (
            <p className="text-sm text-muted-foreground">Select a class and date to load the register.</p>
          ) : loading && !register ? (
            <p className="text-sm text-muted-foreground">Loading register…</p>
          ) : register ? (
            <>
              {!editable ? (
                <Alert tone="info">
                  This register is {register.registerStatus}. Edits are disabled.
                  {register.submittedAt
                    ? ` Submitted ${new Date(register.submittedAt).toLocaleString()}.`
                    : null}
                </Alert>
              ) : null}

              <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                <div className="min-w-[260px] max-w-md flex-1">
                  <Input
                    label="Search learner"
                    placeholder="Name or student number…"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(0);
                    }}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" disabled={!editable} onClick={() => applyBulkStatus("present")}>
                    {selectedStudentIds.length > 0 ? "Mark selected present" : "Mark all present"}
                  </Button>
                  <Button variant="secondary" disabled={!editable} onClick={() => applyBulkStatus("absent")}>
                    Mark {selectedStudentIds.length > 0 ? "selected" : "all"} absent
                  </Button>
                  <Button variant="secondary" disabled={!editable} onClick={() => applyBulkStatus("late")}>
                    Mark {selectedStudentIds.length > 0 ? "selected" : "all"} late
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="min-w-full divide-y divide-border text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-3 py-2 text-left">
                        <input
                          type="checkbox"
                          checked={allVisibleSelected}
                          disabled={!editable}
                          aria-label="Select all on this page"
                          onChange={(e) => {
                            if (!editable) return;
                            if (!e.target.checked) {
                              setSelectedStudentIds((prev) =>
                                prev.filter((id) => !pagedRows.some((r) => r.studentId === id)),
                              );
                              return;
                            }
                            setSelectedStudentIds((prev) => {
                              const set = new Set(prev);
                              for (const row of pagedRows) set.add(row.studentId);
                              return [...set];
                            });
                          }}
                        />
                      </th>
                      <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Student #</th>
                      <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Learner</th>
                      <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-card">
                    {pagedRows.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">
                          No learners match your search.
                        </td>
                      </tr>
                    ) : (
                      pagedRows.map((row) => {
                        const value = statuses[row.studentId] ?? "present";
                        return (
                          <tr key={row.studentId} className="transition-ui hover:bg-accent/40">
                            <td className="px-3 py-2">
                              <input
                                type="checkbox"
                                checked={selectedStudentIds.includes(row.studentId)}
                                disabled={!editable}
                                aria-label={`Select ${row.studentName}`}
                                onChange={(e) => {
                                  if (!editable) return;
                                  setSelectedStudentIds((prev) =>
                                    e.target.checked
                                      ? [...prev, row.studentId]
                                      : prev.filter((id) => id !== row.studentId),
                                  );
                                }}
                              />
                            </td>
                            <td className="px-3 py-2 font-mono text-xs">{row.studentNumber}</td>
                            <td className="px-3 py-2 font-medium text-foreground">{row.studentName}</td>
                            <td className="px-3 py-2">
                              <StatusToggle
                                value={value}
                                disabled={!editable}
                                onChange={(s) => setOneStatus(row.studentId, s)}
                              />
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {visibleRows.length > PAGE_SIZE ? (
                <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
                  <span>
                    Page {page + 1} of {pageCount} ({visibleRows.length} learners)
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="rounded border border-border bg-card px-2 py-1 text-foreground transition-ui hover:bg-accent disabled:opacity-40"
                      disabled={page <= 0}
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                    >
                      Prev
                    </button>
                    <button
                      type="button"
                      className="rounded border border-border bg-card px-2 py-1 text-foreground transition-ui hover:bg-accent disabled:opacity-40"
                      disabled={page >= pageCount - 1}
                      onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                    >
                      Next
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="mt-4 flex flex-wrap justify-end gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  loading={saving}
                  disabled={!editable}
                  onClick={() => void saveDraft()}
                >
                  Save draft
                </Button>
                <Button
                  type="button"
                  loading={submitting}
                  disabled={!editable}
                  onClick={() => void submitRegister()}
                >
                  Submit register
                </Button>
              </div>
            </>
          ) : null}
        </Card>
      </div>

      {register ? (
        <div className="mt-4">
          <Card title="Quick summary">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <Stat label="Total" value={totals.total} />
              <Stat label="Present" value={totals.present} tone="success" />
              <Stat label="Absent" value={totals.absent} tone="danger" />
              <Stat label="Late" value={totals.late} tone="warning" />
              <Stat label="Attendance rate" value={`${attendanceRate}%`} />
            </div>
          </Card>
        </div>
      ) : null}
    </PageWrapper>
  );
}

function StatusToggle({
  value,
  disabled,
  onChange,
}: {
  value: AttendanceStatus;
  disabled?: boolean;
  onChange: (status: AttendanceStatus) => void;
}) {
  return (
    <div className="inline-flex rounded-md border border-border bg-muted/40 p-1">
      {STATUS_OPTIONS.map((s) => (
        <button
          key={s}
          type="button"
          disabled={disabled}
          onClick={() => onChange(s)}
          className={`rounded px-2 py-1 text-xs font-medium capitalize transition-ui ${
            value === s
              ? s === "present"
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                : s === "absent"
                  ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                  : "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {s}
        </button>
      ))}
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  tone?: "neutral" | "success" | "warning" | "danger";
}) {
  const cls =
    tone === "success"
      ? "border-emerald-500/30 bg-emerald-500/10"
      : tone === "warning"
        ? "border-amber-500/30 bg-amber-500/10"
        : tone === "danger"
          ? "border-red-500/30 bg-red-500/10"
          : "border-border bg-muted/30";
  return (
    <div className={`rounded-lg border px-3 py-2 ${cls}`}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  );
}
