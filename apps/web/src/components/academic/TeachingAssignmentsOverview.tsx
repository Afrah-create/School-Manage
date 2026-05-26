"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { AcademicYear, SchoolClass } from "@uganda-cbc-sms/shared";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import {
  classDisplayName,
  filterClassesByLevel,
  type AcademicLevel,
} from "@/lib/academicLevel";

type ClassSubjectRow = {
  id: string;
  classId: string;
  teacherId: string | null;
};

type ClassTeacherRow = {
  classId: string;
  isHomeroom: boolean;
  teacherName: string;
};

export function TeachingAssignmentsOverview({
  level,
  yearId,
  years,
  classes,
  classSubjects,
  classTeachers,
  hrefWithLevel,
}: {
  level: AcademicLevel;
  yearId: string;
  years: AcademicYear[];
  classes: SchoolClass[];
  classSubjects: ClassSubjectRow[];
  classTeachers: ClassTeacherRow[];
  hrefWithLevel: (path: string, extra?: Record<string, string>) => string;
}) {
  const yearName = years.find((y) => y.id === yearId)?.name ?? "Selected year";
  const levelClasses = useMemo(
    () => filterClassesByLevel(classes, level, yearId),
    [classes, level, yearId],
  );

  const rows = useMemo(() => {
    return levelClasses.map((c) => {
      const slots = classSubjects.filter((s) => s.classId === c.id);
      const teachers = classTeachers.filter((t) => t.classId === c.id);
      const homeroom = teachers.find((t) => t.isHomeroom);
      const assignedSlots = slots.filter((s) => s.teacherId).length;
      const totalSlots = slots.length;
      const homeroomOk = Boolean(homeroom);
      const subjectsOk = totalSlots > 0;
      const teachersOk = totalSlots > 0 && assignedSlots === totalSlots;
      const ready = homeroomOk && teachersOk;

      return {
        class: c,
        homeroom,
        totalSlots,
        assignedSlots,
        homeroomOk,
        subjectsOk,
        teachersOk,
        ready,
      };
    });
  }, [levelClasses, classSubjects, classTeachers]);

  const summary = useMemo(
    () => ({
      classes: rows.length,
      withHomeroom: rows.filter((r) => r.homeroomOk).length,
      withSubjects: rows.filter((r) => r.subjectsOk).length,
      fullyStaffed: rows.filter((r) => r.ready).length,
    }),
    [rows],
  );

  if (!yearId) {
    return (
      <Card title="Class overview">
        <p className="text-sm text-muted-foreground">Select an academic year to review assignments.</p>
      </Card>
    );
  }

  if (levelClasses.length === 0) {
    return (
      <Card title="Class overview">
        <p className="text-sm text-muted-foreground">
          No {level === "A_LEVEL" ? "A-Level" : "O-Level"} classes for {yearName}. Create them under{" "}
          <Link href={hrefWithLevel("/admin/academic/classes")} className="font-medium text-brand hover:underline">
            Classes
          </Link>
          .
        </p>
      </Card>
    );
  }

  return (
    <Card title={`${level === "A_LEVEL" ? "A-Level" : "O-Level"} classes · ${yearName}`}>
      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">
          <p className="text-muted-foreground">Classes</p>
          <p className="text-xl font-semibold tabular-nums">{summary.classes}</p>
        </div>
        <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">
          <p className="text-muted-foreground">Homeroom set</p>
          <p className="text-xl font-semibold tabular-nums">{summary.withHomeroom}</p>
        </div>
        <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">
          <p className="text-muted-foreground">With subjects</p>
          <p className="text-xl font-semibold tabular-nums">{summary.withSubjects}</p>
        </div>
        <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">
          <p className="text-muted-foreground">Fully staffed</p>
          <p className="text-xl font-semibold tabular-nums">{summary.fullyStaffed}</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border/70">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-muted/60">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Class
              </th>
              <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Homeroom
              </th>
              <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Subject slots
              </th>
              <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Status
              </th>
              <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => (
              <tr key={r.class.id} className="hover:bg-muted/20">
                <td className="px-4 py-3 font-medium">{classDisplayName(r.class)}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {r.homeroom ? r.homeroom.teacherName : "Not set"}
                </td>
                <td className="px-4 py-3 tabular-nums text-muted-foreground">
                  {r.totalSlots === 0
                    ? "No subjects"
                    : `${r.assignedSlots} / ${r.totalSlots} teachers assigned`}
                </td>
                <td className="px-4 py-3">
                  {r.ready ? (
                    <Badge tone="success">Ready</Badge>
                  ) : !r.homeroomOk ? (
                    <Badge tone="warning">Needs homeroom</Badge>
                  ) : !r.subjectsOk ? (
                    <Badge tone="warning">Needs subjects</Badge>
                  ) : (
                    <Badge tone="warning">Needs teachers</Badge>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={hrefWithLevel("/admin/academic/class-teachers", {
                      classId: r.class.id,
                      academicYearId: yearId,
                    })}
                    className="mr-3 text-xs font-medium text-brand hover:underline"
                  >
                    Teachers
                  </Link>
                  <Link
                    href={hrefWithLevel("/admin/academic/class-subjects", {
                      classId: r.class.id,
                      academicYearId: yearId,
                    })}
                    className="text-xs font-medium text-brand hover:underline"
                  >
                    Subjects
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
