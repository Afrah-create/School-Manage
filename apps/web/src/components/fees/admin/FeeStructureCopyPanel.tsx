"use client";

import { useMemo, useState } from "react";
import type { AcademicYear, SchoolClass, Term } from "@uganda-cbc-sms/shared";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Select } from "@/components/ui/Select";
import { useFeeActions } from "@/hooks/useFees";
import { apiGet } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api";
import { toast } from "@/lib/toast";

function ClassTermPickers({
  prefix,
  yearId,
  setYearId,
  classId,
  setClassId,
  termId,
  setTermId,
}: {
  prefix: string;
  yearId: string;
  setYearId: (v: string) => void;
  classId: string;
  setClassId: (v: string) => void;
  termId: string;
  setTermId: (v: string) => void;
}) {
  const yearsQ = useQuery({
    queryKey: ["academic-years"],
    queryFn: () => apiGet<AcademicYear[]>("/academic/years"),
  });
  const termsQ = useQuery({
    queryKey: ["terms", yearId],
    queryFn: () => apiGet<Term[]>(`/academic/terms?academicYearId=${encodeURIComponent(yearId)}`),
    enabled: Boolean(yearId),
  });
  const classesQ = useQuery({
    queryKey: ["academic-classes"],
    queryFn: () => apiGet<SchoolClass[]>("/academic/classes"),
  });

  const yearOptions = useMemo(
    () => [
      { value: "", label: "Select year" },
      ...(yearsQ.data ?? []).map((y) => ({ value: y.id, label: y.name })),
    ],
    [yearsQ.data],
  );
  const termOptions = useMemo(
    () => [
      { value: "", label: yearId ? "Select term" : "Select year first" },
      ...(termsQ.data ?? []).map((t) => ({ value: t.id, label: `Term ${t.termNumber}` })),
    ],
    [termsQ.data, yearId],
  );
  const classOptions = useMemo(
    () => [
      { value: "", label: "Select class" },
      ...(classesQ.data ?? []).map((c) => ({
        value: c.id,
        label: c.stream ? `${c.name} · ${c.stream}` : c.name,
      })),
    ],
    [classesQ.data],
  );

  return (
    <div className="space-y-2 rounded-md border border-border p-3">
      <p className="text-sm font-medium text-foreground">{prefix}</p>
      <Select
        label="Year"
        options={yearOptions}
        value={yearId}
        onChange={(e) => {
          setYearId(e.target.value);
          setTermId("");
        }}
      />
      <Select label="Term" options={termOptions} value={termId} onChange={(e) => setTermId(e.target.value)} />
      <Select label="Class" options={classOptions} value={classId} onChange={(e) => setClassId(e.target.value)} />
    </div>
  );
}

export function FeeStructureCopyPanel({ onCopied }: { onCopied?: () => void }) {
  const actions = useFeeActions();

  const [srcYear, setSrcYear] = useState("");
  const [srcClass, setSrcClass] = useState("");
  const [srcTerm, setSrcTerm] = useState("");
  const [tgtYear, setTgtYear] = useState("");
  const [tgtClass, setTgtClass] = useState("");
  const [tgtTerm, setTgtTerm] = useState("");
  const [bulkLevel, setBulkLevel] = useState<"" | "O_LEVEL" | "A_LEVEL">("");
  const [bulkConfirm, setBulkConfirm] = useState(false);

  const onSubmit = async () => {
    if (!srcClass || !srcTerm || !tgtClass || !tgtTerm) {
      toast.error("Select source and target class and term.", "Incomplete form");
      return;
    }
    try {
      const result = await actions.copyStructure.mutateAsync({
        sourceClassId: srcClass,
        sourceTermId: srcTerm,
        targetClassId: tgtClass,
        targetTermId: tgtTerm,
      });
      toast.success(
        result.created === 0
          ? `No categories copied (${result.skipped} already on target).`
          : `Copied ${result.created} categor${result.created === 1 ? "y" : "ies"}${result.skipped ? `; ${result.skipped} skipped.` : "."}`,
        "Copy complete",
      );
      onCopied?.();
    } catch (e) {
      toast.error(getApiErrorMessage(e), "Could not copy");
    }
  };

  const onBulkCopy = async () => {
    if (!srcClass || !srcTerm) {
      toast.error("Select source class and term.", "Incomplete form");
      return;
    }
    if (!bulkLevel) {
      toast.error("Select a target level for bulk copy.", "Incomplete form");
      return;
    }
    try {
      const result = await actions.bulkCopyStructure.mutateAsync({
        sourceClassId: srcClass,
        sourceTermId: srcTerm,
        targetTermId: tgtTerm || srcTerm,
        targetLevel: bulkLevel,
      });
      toast.success(
        `Copied ${result.totalCreated} categor${result.totalCreated === 1 ? "y" : "ies"} to ${result.targets.length} class(es).`,
        "Bulk copy complete",
      );
      onCopied?.();
    } catch (e) {
      toast.error(getApiErrorMessage(e), "Bulk copy failed");
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Copy all fee categories from one class/term to another. Existing categories on the target are skipped.
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        <ClassTermPickers
          prefix="Source"
          yearId={srcYear}
          setYearId={setSrcYear}
          classId={srcClass}
          setClassId={setSrcClass}
          termId={srcTerm}
          setTermId={setSrcTerm}
        />
        <ClassTermPickers
          prefix="Target"
          yearId={tgtYear}
          setYearId={setTgtYear}
          classId={tgtClass}
          setClassId={setTgtClass}
          termId={tgtTerm}
          setTermId={setTgtTerm}
        />
      </div>
      <Button loading={actions.copyStructure.isPending} onClick={() => void onSubmit()}>
        Copy fee structure
      </Button>

      <div className="mt-6 rounded-md border border-border p-4">
        <p className="mb-3 text-sm font-medium text-foreground">Copy to all classes (same term)</p>
        <p className="mb-3 text-sm text-muted-foreground">
          Copy the source class fees to every class at the selected level. Uses the source term unless a target term
          is set above.
        </p>
        <Select
          label="Target level"
          value={bulkLevel}
          onChange={(e) => setBulkLevel(e.target.value as "" | "O_LEVEL" | "A_LEVEL")}
          options={[
            { value: "", label: "Select level" },
            { value: "O_LEVEL", label: "All O-Level classes" },
            { value: "A_LEVEL", label: "All A-Level classes" },
          ]}
        />
        <Button
          className="mt-3"
          variant="secondary"
          loading={actions.bulkCopyStructure.isPending}
          onClick={() => setBulkConfirm(true)}
        >
          Copy to all classes at level
        </Button>
      </div>

      <ConfirmDialog
        open={bulkConfirm}
        title="Copy fees to all classes?"
        description="This copies every fee category from the source class to all classes at the selected level for the same term."
        confirmLabel="Copy all"
        loading={actions.bulkCopyStructure.isPending}
        onConfirm={() => {
          setBulkConfirm(false);
          void onBulkCopy();
        }}
        onCancel={() => setBulkConfirm(false)}
      />
    </div>
  );
}
