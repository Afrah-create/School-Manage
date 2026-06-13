"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { TableSkeleton } from "@/components/feedback/TableSkeleton";
import { Input } from "./Input";

export type Column<T> = {
  key: keyof T | string;
  header: string;
  render?: (row: T) => ReactNode;
};

type Props<T extends Record<string, unknown>> = {
  columns: Column<T>[];
  rows: T[];
  searchKeys?: (keyof T)[];
  pageSize?: number;
  loading?: boolean;
  /** Skeleton row count while loading (defaults to 5, not pageSize). */
  loadingRows?: number;
  emptyState?: ReactNode;
};

export function Table<T extends Record<string, unknown>>({
  columns,
  rows,
  searchKeys,
  pageSize = 10,
  loading,
  loadingRows = 5,
  emptyState,
}: Props<T>) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    if (!q.trim() || !searchKeys?.length) return rows;
    const s = q.toLowerCase();
    return rows.filter((r) =>
      searchKeys.some((k) => String(r[k] ?? "").toLowerCase().includes(s)),
    );
  }, [rows, q, searchKeys]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const slice = filtered.slice(page * pageSize, (page + 1) * pageSize);

  if (loading) {
    return (
      <TableSkeleton rows={loadingRows} cols={columns.length} showSearch={Boolean(searchKeys?.length)} />
    );
  }

  return (
    <div className="space-y-3">
      {searchKeys?.length ? (
        <div className="max-w-sm">
          <Input
            placeholder="Search…"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(0);
            }}
          />
        </div>
      ) : null}
      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-muted">
            <tr>
              {columns.map((c) => (
                <th
                  key={String(c.key)}
                  className="px-3 py-2 text-left font-semibold text-muted-foreground"
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-card">
            {slice.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="p-0">
                  {emptyState ?? (
                    <p className="px-3 py-6 text-center text-sm text-muted-foreground">No records to display</p>
                  )}
                </td>
              </tr>
            ) : (
              slice.map((row, i) => (
                <tr key={i} className="transition-ui hover:bg-accent">
                  {columns.map((c) => (
                    <td key={String(c.key)} className="px-3 py-2 text-foreground">
                      {c.render
                        ? c.render(row)
                        : String(row[c.key as keyof T] ?? "")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {filtered.length > pageSize ? (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Page {page + 1} of {pageCount} ({filtered.length} rows)
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
    </div>
  );
}
