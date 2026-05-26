"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Student } from "@uganda-cbc-sms/shared";
import { EmptyState } from "@/components/feedback/EmptyState";
import { TableSkeleton } from "@/components/feedback/TableSkeleton";
import { StudentAvatar } from "@/components/students/StudentAvatar";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { GraduationCap } from "lucide-react";

const ACTION_LINK =
  "inline-flex items-center rounded-md border border-border bg-card px-2 py-1 text-xs font-medium text-foreground transition-ui hover:bg-accent";

type Group = {
  key: string;
  label: string;
  students: Student[];
};

function groupLabel(st: Student): { key: string; label: string } {
  if (st.classId && st.className) {
    const stream = st.classStream?.trim();
    return {
      key: st.classId,
      label: stream ? `${st.className} · ${stream}` : st.className,
    };
  }
  return { key: "__unassigned__", label: "Unassigned class" };
}

export function StudentsGroupedByClass({
  students,
  loading,
  profileBasePath,
  showEnrollmentActions,
  onEditStudent,
}: {
  students: Student[];
  loading?: boolean;
  profileBasePath: string;
  showEnrollmentActions?: boolean;
  onEditStudent?: (studentId: string) => void;
}) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return students;
    return students.filter(
      (st) =>
        st.fullName.toLowerCase().includes(s) ||
        st.studentNumber.toLowerCase().includes(s) ||
        (st.className?.toLowerCase().includes(s) ?? false),
    );
  }, [students, q]);

  const groups = useMemo(() => {
    const map = new Map<string, Group>();
    for (const st of filtered) {
      const { key, label } = groupLabel(st);
      const existing = map.get(key);
      if (existing) {
        existing.students.push(st);
      } else {
        map.set(key, { key, label, students: [st] });
      }
    }
    const list = [...map.values()];
    list.sort((a, b) => {
      if (a.key === "__unassigned__") return 1;
      if (b.key === "__unassigned__") return -1;
      return a.label.localeCompare(b.label);
    });
    for (const g of list) {
      g.students.sort((a, b) => a.fullName.localeCompare(b.fullName));
    }
    return list;
  }, [filtered]);

  const base = profileBasePath.replace(/\/$/, "");

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="max-w-sm">
          <Input placeholder="Search…" disabled />
        </div>
        <TableSkeleton rows={6} cols={4} />
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <EmptyState
        title="No students enrolled yet"
        description="Enrol learners to manage attendance, assessments, and report cards."
        icon={GraduationCap}
        action={
          showEnrollmentActions ? { label: "Enrol student", href: "/admin/students/enrol" } : undefined
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="max-w-sm">
        <Input
          placeholder="Search by name, number, or class…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {groups.length === 0 ? (
        <p className="text-sm text-muted-foreground">No students match your search.</p>
      ) : (
        groups.map((group) => (
          <section
            key={group.key}
            className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/40 px-4 py-3">
              <h3 className="font-heading text-base font-semibold text-foreground">{group.label}</h3>
              <span className="text-sm text-muted-foreground">
                {group.students.length} learner{group.students.length === 1 ? "" : "s"}
              </span>
            </div>
            <ul className="divide-y divide-border">
              {group.students.map((st) => (
                <li
                  key={st.id}
                  className="flex flex-wrap items-center gap-3 px-4 py-3 transition-ui hover:bg-muted/30"
                >
                  <StudentAvatar fullName={st.fullName} photoUrl={st.photoUrl} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground">{st.fullName}</p>
                    <p className="font-mono text-xs text-muted-foreground">{st.studentNumber}</p>
                  </div>
                  <Badge tone={st.status === "active" ? "success" : "warning"}>{st.status}</Badge>
                  <div className="flex flex-wrap gap-2">
                    <Link className={ACTION_LINK} href={`${base}/${st.id}`}>
                      View
                    </Link>
                    {showEnrollmentActions ? (
                      onEditStudent ? (
                        <button type="button" className={ACTION_LINK} onClick={() => onEditStudent(st.id)}>
                          Edit
                        </button>
                      ) : (
                        <Link className={ACTION_LINK} href={`${base}/${st.id}/edit`}>
                          Edit
                        </Link>
                      )
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
