"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { Student } from "@uganda-cbc-sms/shared";
import { EmptyState } from "@/components/feedback/EmptyState";
import { GraduationCap } from "lucide-react";
import { StudentAvatar } from "@/components/students/StudentAvatar";
import { Badge } from "@/components/ui/Badge";
import { Table, type Column } from "@/components/ui/Table";

type Row = Student & Record<string, unknown>;
const ACTION_LINK =
  "inline-flex items-center rounded-md border border-border bg-card px-2 py-1 text-xs font-medium text-foreground transition-ui hover:bg-accent";

export function StudentTable({
  students,
  loading,
  profileBasePath,
  showEnrollmentActions,
  onEditStudent,
  emptyState,
}: {
  students: Student[];
  loading?: boolean;
  /** e.g. `/admin/students` — links become `{profileBasePath}/{id}` */
  profileBasePath: string;
  /** When true, admin-only routes get an Edit action alongside View. */
  showEnrollmentActions?: boolean;
  /** Opens edit UI with student details (modal). Falls back to `/edit` page when omitted. */
  onEditStudent?: (studentId: string) => void;
  emptyState?: ReactNode;
}) {
  const columns: Column<Row>[] = [
    {
      key: "photoUrl",
      header: "",
      render: (r) => <StudentAvatar fullName={r.fullName} photoUrl={r.photoUrl} size="sm" />,
    },
    { key: "studentNumber", header: "Student #" },
    { key: "fullName", header: "Name" },
    {
      key: "status",
      header: "Status",
      render: (r) => <Badge tone={r.status === "active" ? "success" : "warning"}>{r.status}</Badge>,
    },
    {
      key: "id",
      header: "",
      render: (r) => (
        <div className="flex flex-wrap gap-3">
          <Link className={ACTION_LINK} href={`${profileBasePath.replace(/\/$/, "")}/${r.id}`}>
            View
          </Link>
          {showEnrollmentActions ? (
            onEditStudent ? (
              <button type="button" className={ACTION_LINK} onClick={() => onEditStudent(r.id)}>
                Edit
              </button>
            ) : (
              <Link className={ACTION_LINK} href={`${profileBasePath.replace(/\/$/, "")}/${r.id}/edit`}>
                Edit
              </Link>
            )
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <Table<Row>
      columns={columns}
      rows={students as Row[]}
      searchKeys={["studentNumber", "fullName"]}
      loading={loading}
      emptyState={
        emptyState ?? (
          <EmptyState
            title="No students enrolled yet"
            description="Enrol learners to manage attendance, assessments, and report cards."
            icon={GraduationCap}
            action={
              showEnrollmentActions
                ? { label: "Enrol student", href: "/admin/students/enrol" }
                : undefined
            }
          />
        )
      }
    />
  );
}
