"use client";

import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";

export function PaginationBar({
  page,
  totalPages,
  total,
  limit,
  onPageChange,
  onLimitChange,
  limitOptions = [25, 50, 100],
}: {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  limitOptions?: number[];
}) {
  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  return (
    <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        {total === 0 ? (
          "No results"
        ) : (
          <>
            Showing <span className="font-medium text-foreground">{start}</span>–
            <span className="font-medium text-foreground">{end}</span> of{" "}
            <span className="font-medium text-foreground">{total}</span>
          </>
        )}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-28">
          <Select
            label="Per page"
            className="!mb-0"
            options={limitOptions.map((n) => ({ value: String(n), label: String(n) }))}
            value={String(limit)}
            onChange={(e) => onLimitChange(Number(e.target.value))}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            className="!px-3"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            Previous
          </Button>
          <span className="min-w-[5rem] text-center text-sm text-muted-foreground">
            Page {page} / {totalPages}
          </span>
          <Button
            type="button"
            variant="secondary"
            className="!px-3"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
