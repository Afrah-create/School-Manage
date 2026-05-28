"use client";

import { useMemo, useState } from "react";
import type { FeeStructure } from "@uganda-cbc-sms/shared";
import type { ClassEnrollmentSummary } from "@uganda-cbc-sms/shared";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Table, type Column } from "@/components/ui/Table";
import { useFeeActions } from "@/hooks/useFees";
import { formatUgx } from "@/lib/formatMoney";
import { getApiErrorMessage } from "@/lib/api";
import { toast } from "@/lib/toast";

function classLabel(row: FeeStructure) {
  const name = row.className ?? "Class";
  return row.classStream ? `${name} · ${row.classStream}` : name;
}

export function FeeStructureTable({
  rows,
  enrollment,
  lockedClassTerms,
}: {
  rows: FeeStructure[];
  enrollment: ClassEnrollmentSummary[];
  /** classId:termId keys that already have invoices */
  lockedClassTerms?: Set<string>;
}) {
  const actions = useFeeActions();
  const [editing, setEditing] = useState<FeeStructure | null>(null);
  const [editAmount, setEditAmount] = useState("");

  const enrollmentByClass = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of enrollment) m.set(c.classId, c.activeCount);
    return m;
  }, [enrollment]);

  const groups = useMemo(() => {
    const map = new Map<string, FeeStructure[]>();
    for (const r of rows) {
      const key = `${r.classId}:${r.termId}`;
      const list = map.get(key) ?? [];
      list.push(r);
      map.set(key, list);
    }
    return [...map.entries()].map(([key, items]) => {
      const total = items.reduce((s, i) => s + Number(i.amount), 0);
      const first = items[0]!;
      const locked = lockedClassTerms?.has(key) ?? false;
      return {
        key,
        items,
        total,
        label: `${classLabel(first)} · ${first.termLabel ?? "Term"}${first.yearName ? ` (${first.yearName})` : ""}`,
        studentCount: enrollmentByClass.get(first.classId) ?? 0,
        locked,
      };
    });
  }, [rows, enrollmentByClass, lockedClassTerms]);

  const openEdit = (row: FeeStructure) => {
    setEditing(row);
    setEditAmount(String(Math.round(Number(row.amount))));
  };

  const saveEdit = async () => {
    if (!editing) return;
    try {
      await actions.updateStructure.mutateAsync({
        structureId: editing.id,
        body: { amount: editAmount },
      });
      toast.success("Amount updated.", "Saved");
      setEditing(null);
    } catch (e) {
      toast.error(getApiErrorMessage(e), "Could not update");
    }
  };

  const confirmDelete = (row: FeeStructure) => {
    const key = `${row.classId}:${row.termId}`;
    if (lockedClassTerms?.has(key)) {
      toast.error(
        "Invoices have already been issued for this class and term. You cannot remove fee categories.",
        "Structure locked",
      );
      return;
    }
    toast.confirm({
      title: "Remove fee category?",
      description: `Remove ${row.category} (${formatUgx(row.amount)} UGX) for ${classLabel(row)}?`,
      confirmLabel: "Remove",
      onConfirm: async () => {
        try {
          await actions.deleteStructure.mutateAsync(row.id);
          toast.success("Fee category removed.", "Removed");
        } catch (e) {
          toast.error(getApiErrorMessage(e), "Could not remove");
        }
      },
    });
  };

  const columns: Column<FeeStructure>[] = [
    { key: "category", header: "Category", render: (r) => r.category },
    {
      key: "amount",
      header: "Amount (UGX)",
      render: (r) => <span className="tabular-nums font-medium">{formatUgx(r.amount)}</span>,
    },
    {
      key: "actions",
      header: "",
      render: (r) => {
        const locked = lockedClassTerms?.has(`${r.classId}:${r.termId}`) ?? false;
        return (
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" className="!px-2 !py-1 text-xs" onClick={() => openEdit(r)}>
              Edit
            </Button>
            <Button
              variant="secondary"
              className="!px-2 !py-1 text-xs text-red-700 dark:text-red-400"
              disabled={locked}
              onClick={() => confirmDelete(r)}
            >
              Delete
            </Button>
          </div>
        );
      },
    },
  ];

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No fee structure rows match your filters.</p>;
  }

  return (
    <div className="space-y-6">
      {groups.map((g) => (
        <div key={g.key} className="rounded-lg border border-border">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/30 px-4 py-3">
            <div>
              <p className="font-medium text-foreground">{g.label}</p>
              <p className="text-xs text-muted-foreground">
                {g.studentCount} active student{g.studentCount === 1 ? "" : "s"} · Total per student:{" "}
                <span className="font-semibold tabular-nums">{formatUgx(g.total)} UGX</span>
              </p>
            </div>
            {g.locked ? (
              <Alert tone="info">Invoices issued — structure locked for edits/deletes</Alert>
            ) : null}
          </div>
          <div className="p-2">
            <Table
              columns={columns as unknown as Column<Record<string, unknown>>[]}
              rows={g.items as unknown as Record<string, unknown>[]}
              emptyState={null}
            />
          </div>
        </div>
      ))}

      <Modal open={Boolean(editing)} title="Edit amount" onClose={() => setEditing(null)}>
        {editing ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {editing.category} · {classLabel(editing)}
            </p>
            <Input
              label="Amount (UGX)"
              type="number"
              min={1}
              value={editAmount}
              onChange={(e) => setEditAmount(e.target.value)}
            />
            <div className="flex gap-2">
              <Button loading={actions.updateStructure.isPending} onClick={() => void saveEdit()}>
                Save
              </Button>
              <Button variant="secondary" onClick={() => setEditing(null)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
