"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ROLES } from "@uganda-cbc-sms/shared";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { StudentEnrollmentCharts } from "@/components/students/StudentEnrollmentCharts";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { apiDelete, apiGet, apiPost, apiPatch } from "@/lib/api";

type UserRow = {
  id: string;
  fullName: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt?: string;
  locked?: boolean;
  forcePasswordChange?: boolean;
  systemAccount?: boolean;
};
type ListResponse = {
  items: UserRow[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

export default function AdminUsersListPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<UserRow | null>(null);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [busyBulk, setBusyBulk] = useState(false);

  const loadUsers = async (targetPage = pagination.page) => {
    setErr(null);
    setLoading(true);
    try {
      const q = new URLSearchParams();
      q.set("page", String(targetPage));
      q.set("limit", String(pagination.limit));
      if (search.trim()) q.set("search", search.trim());
      if (role) q.set("role", role);
      if (status) q.set("status", status);
      const r = await apiGet<ListResponse>(`/users?${q.toString()}`);
      setUsers(r.items);
      setPagination(r.pagination);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, role, status]);

  const toggleActive = async (user: UserRow) => {
    setErr(null);
    setOk(null);
    setBusyUserId(user.id);
    try {
      if (user.isActive) {
        await apiPatch(`/users/${encodeURIComponent(user.id)}/deactivate`);
      } else {
        await apiPatch(`/users/${encodeURIComponent(user.id)}/activate`);
      }
      await loadUsers();
      setOk(`User ${user.isActive ? "deactivated" : "activated"} successfully.`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to update user");
    } finally {
      setBusyUserId(null);
    }
  };

  const deleteUser = async (user: UserRow) => {
    setErr(null);
    setOk(null);
    setBusyUserId(user.id);
    try {
      await apiDelete(`/users/${encodeURIComponent(user.id)}`);
      setConfirmDelete(null);
      await loadUsers();
      setOk("User deleted successfully.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to delete user");
    } finally {
      setBusyUserId(null);
    }
  };

  const allSelected = useMemo(
    () => users.length > 0 && users.every((u) => selected.includes(u.id)),
    [users, selected],
  );
  const toggleSelectAll = () => {
    setSelected(allSelected ? [] : users.map((u) => u.id));
  };
  const toggleSelect = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };
  const runBulk = async (action: "activate" | "deactivate" | "delete") => {
    if (!selected.length) return;
    setBusyBulk(true);
    setErr(null);
    try {
      await apiPost(`/users/bulk/${action}`, { ids: selected });
      setSelected([]);
      await loadUsers();
      setOk(`Bulk ${action} complete.`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : `Failed to ${action} users`);
    } finally {
      setBusyBulk(false);
    }
  };

  return (
    <PageWrapper title="Users" description="Staff accounts and school enrollment overview">
      <div className="mb-8">
        <StudentEnrollmentCharts />
      </div>

      <div className="mb-4 flex justify-between gap-3">
        <div className="grid w-full max-w-4xl grid-cols-1 gap-2 md:grid-cols-3">
          <Input placeholder="Search name or email" value={search} onChange={(e) => setSearch(e.target.value)} />
          <Select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            options={[{ value: "", label: "All roles" }, ...ROLES.map((r) => ({ value: r, label: r.replace(/_/g, " ") }))]}
          />
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            options={[
              { value: "", label: "All statuses" },
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
              { value: "locked", label: "Locked" },
            ]}
          />
        </div>
        <Link href="/admin/users/create">
          <Button>Create user</Button>
        </Link>
      </div>
      {selected.length ? (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Badge tone="warning">{selected.length} selected</Badge>
          <Button variant="secondary" loading={busyBulk} onClick={() => void runBulk("activate")}>Bulk activate</Button>
          <Button variant="secondary" loading={busyBulk} onClick={() => void runBulk("deactivate")}>Bulk deactivate</Button>
          <Button loading={busyBulk} onClick={() => void runBulk("delete")}>Bulk delete</Button>
        </div>
      ) : null}
      <div className="mb-4 space-y-2">
        {ok ? <Alert tone="success">{ok}</Alert> : null}
        {err ? <Alert tone="error">{err}</Alert> : null}
      </div>
      <Card title={`Accounts (${pagination.total})`}>
        <div className="overflow-x-auto rounded-xl border border-border/70 bg-card shadow-sm">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted/60">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"><input type="checkbox" checked={allSelected} onChange={toggleSelectAll} /></th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Name</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Email</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Role</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Created</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Flags</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-card">
              {loading ? (
                <tr><td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">Loading…</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">No users found.</td></tr>
              ) : users.map((r) => (
                <tr key={r.id} className="transition-ui odd:bg-background even:bg-muted/20 hover:bg-accent/60">
                  <td className="px-3 py-1.5 align-middle"><input type="checkbox" checked={selected.includes(r.id)} onChange={() => toggleSelect(r.id)} /></td>
                  <td className="px-3 py-1.5 align-middle font-medium"><Link className="hover:underline" href={`/admin/users/${r.id}`}>{r.fullName}</Link></td>
                  <td className="px-3 py-1.5 align-middle text-muted-foreground">{r.email}</td>
                  <td className="px-3 py-1.5 align-middle"><Badge tone="success">{r.role.replace(/_/g, " ")}</Badge></td>
                  <td className="px-3 py-1.5 align-middle"><Badge tone={r.isActive ? "success" : "warning"}>{r.isActive ? "Active" : "Inactive"}</Badge></td>
                  <td className="px-3 py-1.5 align-middle text-muted-foreground">{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "—"}</td>
                  <td className="px-3 py-1.5 align-middle flex gap-1">
                    {r.locked ? <Badge tone="warning">Locked</Badge> : null}
                    {r.forcePasswordChange ? <Badge tone="warning">Pwd change</Badge> : null}
                    {r.systemAccount ? <Badge tone="success">System</Badge> : null}
                  </td>
                  <td className="px-3 py-1.5 align-middle">
                    <details className="relative">
                      <summary className="inline-flex h-7 cursor-pointer list-none items-center rounded-md border border-border px-2.5 text-xs font-medium text-foreground hover:bg-accent">
                        Actions
                      </summary>
                      <div className="absolute right-0 z-20 mt-1 min-w-[150px] rounded-md border border-border bg-card p-1 shadow-md">
                        <Link
                          href={`/admin/users/${r.id}/edit`}
                          className="block rounded px-2 py-1.5 text-xs text-foreground hover:bg-accent"
                        >
                          Edit
                        </Link>
                        <button
                          type="button"
                          className="block w-full rounded px-2 py-1.5 text-left text-xs text-foreground hover:bg-accent disabled:opacity-50"
                          disabled={busyUserId === r.id || r.systemAccount}
                          onClick={() => void toggleActive(r)}
                        >
                          {r.isActive ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          type="button"
                          className="block w-full rounded px-2 py-1.5 text-left text-xs text-red-700 hover:bg-red-500/10 disabled:opacity-50 dark:text-red-300"
                          disabled={busyUserId === r.id || r.systemAccount}
                          onClick={() => setConfirmDelete(r)}
                        >
                          Delete
                        </button>
                      </div>
                    </details>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Page {pagination.page} of {pagination.totalPages} • Showing {users.length} of {pagination.total}
          </span>
          <div className="flex gap-2">
            <Button variant="secondary" disabled={pagination.page <= 1} onClick={() => void loadUsers(pagination.page - 1)}>Prev</Button>
            <Button variant="secondary" disabled={pagination.page >= pagination.totalPages} onClick={() => void loadUsers(pagination.page + 1)}>Next</Button>
          </div>
        </div>
      </Card>
      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title="Delete user account?"
        description={
          confirmDelete
            ? `This will remove ${confirmDelete.fullName} from active staff accounts.`
            : "This will remove the user from active staff accounts."
        }
        confirmLabel="Delete"
        danger
        loading={Boolean(confirmDelete && busyUserId === confirmDelete.id)}
        onCancel={() => {
          if (!busyUserId) setConfirmDelete(null);
        }}
        onConfirm={() => {
          if (confirmDelete) void deleteUser(confirmDelete);
        }}
      />
    </PageWrapper>
  );
}
