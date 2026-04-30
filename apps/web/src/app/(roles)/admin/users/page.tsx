"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Table, type Column } from "@/components/ui/Table";
import { apiGet } from "@/lib/api";

type UserRow = {
  id: string;
  fullName: string;
  email: string;
  role: string;
  isActive?: boolean;
};

export default function AdminUsersListPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const r = await apiGet<UserRow[]>("/users");
        setUsers(r);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Failed");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const columns: Column<UserRow>[] = [
    { key: "fullName", header: "Name" },
    { key: "email", header: "Email" },
    {
      key: "role",
      header: "Role",
      render: (r) => <Badge tone="success">{r.role.replace(/_/g, " ")}</Badge>,
    },
    {
      key: "isActive",
      header: "Active",
      render: (r) => (r.isActive === false ? <span className="text-red-600">No</span> : "Yes"),
    },
  ];

  return (
    <PageWrapper title="Users" description="Staff accounts">
      <div className="mb-4 flex justify-end">
        <Link href="/admin/users/create">
          <Button>Create user</Button>
        </Link>
      </div>
      {err ? <p className="text-red-600">{err}</p> : null}
      <Card title={`Accounts (${users.length})`}>
        <Table columns={columns} rows={users} loading={loading} searchKeys={["fullName", "email"]} />
      </Card>
    </PageWrapper>
  );
}
