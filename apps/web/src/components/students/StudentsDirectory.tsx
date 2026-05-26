"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Student } from "@uganda-cbc-sms/shared";
import { EmptyState } from "@/components/feedback/EmptyState";
import { TableSkeleton } from "@/components/feedback/TableSkeleton";
import { StudentAvatar } from "@/components/students/StudentAvatar";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PaginationBar } from "@/components/ui/PaginationBar";
import { Select } from "@/components/ui/Select";
import {
  useClassEnrollmentSummary,
  useStudentsBrowse,
  type StudentsBrowseFilters,
} from "@/hooks/useStudentsBrowse";
import { GraduationCap, Search } from "lucide-react";

const ACTION_LINK =
  "inline-flex items-center rounded-md border border-border bg-card px-2 py-1 text-xs font-medium text-foreground transition-ui hover:bg-accent";

function classOptionLabel(name: string, stream: string | null, active: number) {
  const label = stream ? `${name} · ${stream}` : name;
  return `${label} (${active})`;
}

export function StudentsDirectory({
  profileBasePath,
  showEnrollmentActions,
  onEditStudent,
  enrolHref = "/admin/students/enrol",
}: {
  profileBasePath: string;
  showEnrollmentActions?: boolean;
  onEditStudent?: (studentId: string) => void;
  enrolHref?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const initialQ = searchParams.get("q") ?? "";
  const [searchInput, setSearchInput] = useState(initialQ);
  const [debouncedQ, setDebouncedQ] = useState(initialQ);

  const filters: StudentsBrowseFilters = useMemo(
    () => ({
      page: Math.max(1, Number(searchParams.get("page") ?? "1") || 1),
      limit: Math.min(100, Math.max(10, Number(searchParams.get("limit") ?? "25") || 25)),
      classId: searchParams.get("classId") ?? "",
      status: (searchParams.get("status") as StudentsBrowseFilters["status"]) || "active",
      q: debouncedQ,
      sort: (searchParams.get("sort") as StudentsBrowseFilters["sort"]) || "name",
    }),
    [searchParams, debouncedQ],
  );

  const summaryQ = useClassEnrollmentSummary();
  const browseQ = useStudentsBrowse(filters);

  const base = profileBasePath.replace(/\/$/, "");

  const totalActiveSchool = useMemo(
    () => (summaryQ.data ?? []).reduce((n, c) => n + c.activeCount, 0),
    [summaryQ.data],
  );

  const selectedClass = useMemo(
    () => (summaryQ.data ?? []).find((c) => c.classId === filters.classId),
    [summaryQ.data, filters.classId],
  );

  const patchParams = useCallback(
    (patch: Record<string, string | null>) => {
      const p = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v == null || v === "") p.delete(k);
        else p.set(k, v);
      }
      router.replace(`${pathname}?${p.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQ(searchInput), 350);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    const urlQ = searchParams.get("q") ?? "";
    if (urlQ !== debouncedQ) {
      patchParams({ q: debouncedQ || null, page: "1" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync URL when debounced search changes
  }, [debouncedQ]);

  const items = browseQ.data?.items ?? [];
  const page = browseQ.data?.page ?? 1;
  const totalPages = browseQ.data?.totalPages ?? 1;
  const total = browseQ.data?.total ?? 0;
  const limit = browseQ.data?.limit ?? filters.limit;

  const showNarrowHint = !filters.classId && total > 100;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Active learners</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{totalActiveSchool}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Classes with learners</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{summaryQ.data?.length ?? "—"}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Current view</p>
          <p className="mt-1 text-lg font-semibold text-foreground">
            {selectedClass
              ? classOptionLabel(selectedClass.className, selectedClass.classStream, selectedClass.activeCount)
              : filters.classId
                ? "Filtered"
                : "All classes"}
          </p>
        </div>
      </div>

      <Card title="Browse by class">
        {summaryQ.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading classes…</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={`rounded-lg border px-3 py-2 text-left text-sm transition-ui ${
                !filters.classId
                  ? "border-brand bg-brand/10 font-medium text-foreground"
                  : "border-border bg-card hover:bg-muted/50"
              }`}
              onClick={() => patchParams({ classId: null, page: "1" })}
            >
              <span className="block font-medium">All classes</span>
              <span className="text-xs text-muted-foreground">{totalActiveSchool} active</span>
            </button>
            {(summaryQ.data ?? []).map((c) => (
              <button
                key={c.classId}
                type="button"
                className={`rounded-lg border px-3 py-2 text-left text-sm transition-ui ${
                  filters.classId === c.classId
                    ? "border-brand bg-brand/10 font-medium text-foreground"
                    : "border-border bg-card hover:bg-muted/50"
                }`}
                onClick={() => patchParams({ classId: c.classId, page: "1" })}
              >
                <span className="block font-medium">
                  {c.className}
                  {c.classStream ? ` · ${c.classStream}` : ""}
                </span>
                <span className="text-xs text-muted-foreground">{c.activeCount} active</span>
              </button>
            ))}
          </div>
        )}
      </Card>

      <Card title="Find learners">
        <div className="grid gap-4 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <Select
              label="Class"
              options={[
                { value: "", label: "All classes" },
                ...(summaryQ.data ?? []).map((c) => ({
                  value: c.classId,
                  label: classOptionLabel(c.className, c.classStream, c.activeCount),
                })),
              ]}
              value={filters.classId}
              onChange={(e) => patchParams({ classId: e.target.value || null, page: "1" })}
            />
          </div>
          <div className="lg:col-span-2">
            <Select
              label="Status"
              options={[
                { value: "active", label: "Active" },
                { value: "transferred", label: "Transferred" },
                { value: "withdrawn", label: "Withdrawn" },
                { value: "all", label: "All statuses" },
              ]}
              value={filters.status}
              onChange={(e) =>
                patchParams({ status: e.target.value, page: "1" })
              }
            />
          </div>
          <div className="lg:col-span-2">
            <Select
              label="Sort by"
              options={[
                { value: "name", label: "Name" },
                { value: "number", label: "Student #" },
              ]}
              value={filters.sort}
              onChange={(e) => patchParams({ sort: e.target.value, page: "1" })}
            />
          </div>
          <div className="lg:col-span-4">
            <label className="mb-1 block text-sm font-medium text-foreground">Search</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                placeholder="Name or student number…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full rounded-md border border-border bg-background py-2 pl-9 pr-3 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>
          </div>
        </div>

        {showNarrowHint ? (
          <div className="mt-4">
            <Alert tone="info">
              Large result set ({total} learners). Select a class above or search by name or student number for
              faster browsing.
            </Alert>
          </div>
        ) : null}
      </Card>

      <Card
        title={
          selectedClass
            ? `${selectedClass.className}${selectedClass.classStream ? ` · ${selectedClass.classStream}` : ""}`
            : "Learners"
        }
      >
        {browseQ.isError ? (
          <Alert tone="error">
            {browseQ.error instanceof Error ? browseQ.error.message : "Failed to load students"}
          </Alert>
        ) : null}

        {browseQ.isLoading && !browseQ.data ? (
          <TableSkeleton rows={10} cols={5} />
        ) : items.length === 0 ? (
          <EmptyState
            title="No learners match"
            description="Try another class, status, or search term."
            icon={GraduationCap}
            action={
              showEnrollmentActions ? { label: "Enrol student", href: enrolHref } : undefined
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="min-w-full divide-y divide-border text-sm">
                <thead className="bg-muted/60">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-muted-foreground" scope="col" />
                    <th className="px-3 py-2 text-left font-semibold text-muted-foreground" scope="col">
                      Student #
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-muted-foreground" scope="col">
                      Name
                    </th>
                    {!filters.classId ? (
                      <th className="px-3 py-2 text-left font-semibold text-muted-foreground" scope="col">
                        Class
                      </th>
                    ) : null}
                    <th className="px-3 py-2 text-left font-semibold text-muted-foreground" scope="col">
                      Status
                    </th>
                    <th className="px-3 py-2 text-right font-semibold text-muted-foreground" scope="col">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-card">
                  {items.map((st) => (
                    <StudentRow
                      key={st.id}
                      student={st}
                      base={base}
                      showClass={!filters.classId}
                      showEnrollmentActions={showEnrollmentActions}
                      onEditStudent={onEditStudent}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            <PaginationBar
              page={page}
              totalPages={totalPages}
              total={total}
              limit={limit}
              onPageChange={(p) => patchParams({ page: String(p) })}
              onLimitChange={(n) => patchParams({ limit: String(n), page: "1" })}
            />
          </>
        )}
      </Card>
    </div>
  );
}

function StudentRow({
  student: st,
  base,
  showClass,
  showEnrollmentActions,
  onEditStudent,
}: {
  student: Student;
  base: string;
  showClass: boolean;
  showEnrollmentActions?: boolean;
  onEditStudent?: (id: string) => void;
}) {
  return (
    <tr className="transition-ui hover:bg-muted/30">
      <td className="px-3 py-2">
        <StudentAvatar fullName={st.fullName} photoUrl={st.photoUrl} size="sm" />
      </td>
      <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{st.studentNumber}</td>
      <td className="px-3 py-2 font-medium text-foreground">{st.fullName}</td>
      {showClass ? (
        <td className="px-3 py-2 text-muted-foreground">
          {st.className
            ? `${st.className}${st.classStream ? ` · ${st.classStream}` : ""}`
            : "—"}
        </td>
      ) : null}
      <td className="px-3 py-2">
        <Badge tone={st.status === "active" ? "success" : "warning"}>{st.status}</Badge>
      </td>
      <td className="px-3 py-2">
        <div className="flex justify-end gap-2">
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
      </td>
    </tr>
  );
}
