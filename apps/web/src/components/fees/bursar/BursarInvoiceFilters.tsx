"use client";

import type { InvoiceBucket } from "@/lib/feeFinanceStats";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

const BUCKET_OPTIONS: { value: InvoiceBucket; label: string }[] = [
  { value: "active", label: "Active bills (unpaid)" },
  { value: "partial", label: "Partially paid" },
  { value: "arrears", label: "Arrears flagged" },
  { value: "paid", label: "Paid in full" },
  { value: "all", label: "All invoices" },
];

export function BursarInvoiceFilters({
  search,
  onSearchChange,
  bucket,
  onBucketChange,
  termId,
  onTermIdChange,
  termOptions,
  counts,
  hideTermFilter,
}: {
  search: string;
  onSearchChange: (v: string) => void;
  bucket: InvoiceBucket;
  onBucketChange: (v: InvoiceBucket) => void;
  termId: string;
  onTermIdChange: (v: string) => void;
  termOptions: { termId: string; label: string }[];
  counts?: Partial<Record<InvoiceBucket, number>>;
  hideTermFilter?: boolean;
}) {
  const termSelectOptions = [
    { value: "", label: "All terms" },
    ...termOptions.map((t) => ({ value: t.termId, label: t.label })),
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {BUCKET_OPTIONS.map((opt) => {
          const count = counts?.[opt.value];
          const active = bucket === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onBucketChange(opt.value)}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-ui ${
                active
                  ? "border-brand bg-brand text-white"
                  : "border-border bg-card text-muted-foreground hover:border-brand/40 hover:text-foreground"
              }`}
            >
              {opt.label}
              {count !== undefined ? (
                <span className={`ml-1.5 tabular-nums ${active ? "text-white/90" : ""}`}>({count})</span>
              ) : null}
            </button>
          );
        })}
      </div>
      <div className={`grid gap-3 ${hideTermFilter ? "max-w-md" : "sm:grid-cols-2"}`}>
        <Input
          label="Search student"
          placeholder="Name or student number…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        {hideTermFilter ? null : (
          <Select
            label="Term"
            options={termSelectOptions}
            value={termId}
            onChange={(e) => onTermIdChange(e.target.value)}
          />
        )}
      </div>
    </div>
  );
}
