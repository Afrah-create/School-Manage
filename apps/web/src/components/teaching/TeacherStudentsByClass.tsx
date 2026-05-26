"use client";

import { useEffect, useMemo, useState } from "react";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { Alert } from "@/components/ui/Alert";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { StudentAvatar } from "@/components/students/StudentAvatar";
import { PaginationBar } from "@/components/ui/PaginationBar";
import { apiGet } from "@/lib/api";
import type { PaginatedStudents } from "@uganda-cbc-sms/shared";

export type TeacherClassOption = {
  classId: string;
  className: string;
  classStream: string;
  level: string;
  academicYearId: string;
  academicYearName: string;
  isHomeroom: boolean;
  studentCount: number;
};

type Props = {
  title: string;
  description: string;
  profileBasePath: string;
};

export function TeacherStudentsByClass({ title, description, profileBasePath }: Props) {
  const [classes, setClasses] = useState<TeacherClassOption[]>([]);
  const [classId, setClassId] = useState("");
  const [browse, setBrowse] = useState<PaginatedStudents | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [searchQ, setSearchQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [studentsLoading, setStudentsLoading] = useState(false);

  const selectedClass = useMemo(() => classes.find((c) => c.classId === classId) ?? null, [classes, classId]);

  const classOptions = useMemo(
    () =>
      classes.map((c) => ({
        value: c.classId,
        label: `${c.className} ${c.classStream}${c.isHomeroom ? " (homeroom)" : ""} · ${c.studentCount} learners`,
      })),
    [classes],
  );

  useEffect(() => {
    void (async () => {
      setErr(null);
      try {
        const rows = await apiGet<TeacherClassOption[]>("/academic/my-classes");
        setClasses(rows);
        if (rows[0] && !classId) setClassId(rows[0].classId);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Failed to load your classes");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQ(searchQ), 350);
    return () => window.clearTimeout(t);
  }, [searchQ]);

  useEffect(() => {
    if (!classId) {
      setBrowse(null);
      return;
    }
    setStudentsLoading(true);
    setErr(null);
    void (async () => {
      try {
        const qp = new URLSearchParams({
          page: String(page),
          limit: String(limit),
          classId,
          status: "active",
          sort: "name",
        });
        if (debouncedQ.trim()) qp.set("q", debouncedQ.trim());
        const data = await apiGet<PaginatedStudents>(`/students?${qp.toString()}`);
        setBrowse(data);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Failed to load students");
        setBrowse(null);
      } finally {
        setStudentsLoading(false);
      }
    })();
  }, [classId, page, limit, debouncedQ]);

  useEffect(() => {
    setPage(1);
    setSearchQ("");
    setDebouncedQ("");
  }, [classId]);

  return (
    <PageWrapper title={title} description={description}>
      {err ? <Alert tone="error">{err}</Alert> : null}
      <Card title="Your classes">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading classes…</p>
        ) : classes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No classes are assigned to you yet. Ask the administrator to add you under Academic → Class teachers or
            assign subjects under Teacher workload.
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            <Select
              label="Class"
              options={classOptions}
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
            />
            {selectedClass ? (
              <div className="flex flex-col justify-end text-sm text-muted-foreground">
                <p>
                  {selectedClass.academicYearName} · {selectedClass.level === "O_LEVEL" ? "O-Level" : "A-Level"}
                </p>
                <p>{selectedClass.studentCount} active learner(s)</p>
              </div>
            ) : null}
          </div>
        )}
      </Card>
      <Card title={selectedClass ? `Learners — ${selectedClass.className} ${selectedClass.classStream}` : "Learners"}>
        {selectedClass ? (
          <div className="mb-4 max-w-md">
            <label className="mb-1 block text-sm font-medium text-foreground">Search this class</label>
            <input
              type="search"
              value={searchQ}
              onChange={(e) => {
                setSearchQ(e.target.value);
                setPage(1);
              }}
              placeholder="Name or student number…"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
        ) : null}
        {studentsLoading && !browse ? (
          <p className="text-sm text-muted-foreground">Loading learners…</p>
        ) : browse && browse.items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No learners in this class match your search.</p>
        ) : browse ? (
          <>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="min-w-full divide-y divide-border text-sm">
                <thead className="bg-muted/60">
                  <tr>
                    <th className="px-3 py-2 text-left" />
                    <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Student #</th>
                    <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Name</th>
                    <th className="px-3 py-2 text-right font-semibold text-muted-foreground"> </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {browse.items.map((st) => (
                    <tr key={st.id} className="hover:bg-muted/30">
                      <td className="px-3 py-2">
                        <StudentAvatar fullName={st.fullName} photoUrl={st.photoUrl} size="sm" />
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">{st.studentNumber}</td>
                      <td className="px-3 py-2 font-medium">{st.fullName}</td>
                      <td className="px-3 py-2 text-right">
                        <a
                          className="text-xs font-medium text-brand underline"
                          href={`${profileBasePath.replace(/\/$/, "")}/${st.id}`}
                        >
                          View
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <PaginationBar
              page={browse.page}
              totalPages={browse.totalPages}
              total={browse.total}
              limit={browse.limit}
              onPageChange={setPage}
              onLimitChange={(n) => {
                setLimit(n);
                setPage(1);
              }}
            />
          </>
        ) : null}
      </Card>
    </PageWrapper>
  );
}
