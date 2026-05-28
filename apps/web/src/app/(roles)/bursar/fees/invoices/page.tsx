"use client";

import { useState } from "react";
import { AsyncContent } from "@/components/feedback/AsyncContent";
import { ErrorState } from "@/components/feedback/ErrorState";
import { FormSkeleton } from "@/components/feedback/FormSkeleton";
import { BulkInvoiceForm } from "@/components/fees/BulkInvoiceForm";
import { FeeInvoicesTable } from "@/components/fees/FeeInvoicesTable";
import { InvoiceCreateForm } from "@/components/fees/InvoiceCreateForm";
import { Card } from "@/components/ui/Card";
import { useFeeInvoices } from "@/hooks/useFees";
import { queryStatus } from "@/lib/queryStatus";

export default function BursarInvoicesListPage() {
  const invoicesQ = useFeeInvoices();
  const status = queryStatus(invoicesQ);
  const [tab, setTab] = useState<"list" | "create" | "bulk">("list");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 border-b border-border pb-2">
        {(
          [
            ["list", "All invoices"],
            ["create", "New invoice"],
            ["bulk", "Bill class"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-ui ${
              tab === key ? "bg-brand text-white" : "text-muted-foreground hover:bg-accent/50"
            }`}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "create" ? (
        <Card title="Create invoice for one student">
          <InvoiceCreateForm onCreated={() => void invoicesQ.refetch()} />
        </Card>
      ) : tab === "bulk" ? (
        <Card title="Bill entire class from fee schedule">
          <BulkInvoiceForm onDone={() => void invoicesQ.refetch()} />
        </Card>
      ) : (
        <Card title={`Invoices (${invoicesQ.data?.length ?? 0})`}>
          <AsyncContent
            status={status}
            loading={<FormSkeleton fields={4} />}
            error={
              <ErrorState
                message={
                  invoicesQ.error instanceof Error ? invoicesQ.error.message : "Could not load invoices."
                }
                onRetry={() => void invoicesQ.refetch()}
              />
            }
          >
            <FeeInvoicesTable rows={invoicesQ.data ?? []} />
          </AsyncContent>
        </Card>
      )}
    </div>
  );
}
