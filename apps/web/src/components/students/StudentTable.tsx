"use client";

import Link from "next/link";
import type { Student } from "@uganda-cbc-sms/shared";
import { Badge } from "@/components/ui/Badge";
import { Table, type Column } from "@/components/ui/Table";

type Row = Student & Record<string, unknown>;

export function StudentTable({
  students,
  loading,
  profileBasePath,
}: {
  students: Student[];
  loading?: boolean;
  /** e.g. `/admin/students` — links become `{profileBasePath}/{id}` */
  profileBasePath: string;
}) {
  const columns: Column<Row>[] = [
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
        <Link className="text-brand underline" href={`${profileBasePath.replace(/\/$/, "")}/${r.id}`}>
          View
        </Link>
      ),
    },
  ];

  return (
    <Table<Row>
      columns={columns}
      rows={students as Row[]}
      searchKeys={["studentNumber", "fullName"]}
      loading={loading}
    />
  );
}
