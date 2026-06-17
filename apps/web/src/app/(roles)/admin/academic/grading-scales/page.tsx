"use client";

import {
  DEFAULT_ASSESSMENT_GRADING_SCALES,
  validateGradingScaleRows,
  type GradingScaleLevel,
} from "@uganda-cbc-sms/shared";
import { useEffect, useMemo, useState } from "react";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { OlevelCaPolicyPanel } from "@/components/academic/OlevelCaPolicyPanel";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { apiGet, apiPost, apiPut, getApiErrorMessage } from "@/lib/api";
import { toast } from "@/lib/toast";

type Level = GradingScaleLevel;
type ScaleRow = {
  id?: string;
  level: Level;
  grade: string;
  minScore: number;
  maxScore: number;
  points: number | null;
  descriptor?: string | null;
  sortOrder: number;
  isActive: boolean;
};

const LEVEL_OPTIONS: Level[] = ["O_LEVEL", "A_LEVEL"];

function rowsFromDefaults(level: Level): ScaleRow[] {
  return DEFAULT_ASSESSMENT_GRADING_SCALES[level].map((row) => ({
    level,
    grade: row.grade,
    minScore: row.minScore,
    maxScore: row.maxScore,
    points: row.points ?? null,
    descriptor: row.descriptor,
    sortOrder: row.sortOrder,
    isActive: true,
  }));
}

export default function AdminGradingScalesPage() {
  const [level, setLevel] = useState<Level>("A_LEVEL");
  const [rows, setRows] = useState<ScaleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [confirmSave, setConfirmSave] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmApplyCbc, setConfirmApplyCbc] = useState(false);
  const [applyingCbc, setApplyingCbc] = useState(false);
  const [confirmRecalculate, setConfirmRecalculate] = useState(false);

  const load = async (nextLevel: Level) => {
    setLoading(true);
    try {
      const data = await apiGet<ScaleRow[]>(`/academic/grading-scales?level=${encodeURIComponent(nextLevel)}`);
      setRows(data.length ? data : rowsFromDefaults(nextLevel));
    } catch (e) {
      toast.error(getApiErrorMessage(e), "Could not load grading scales");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(level);
  }, [level]);

  const validationError = useMemo(
    () =>
      validateGradingScaleRows(
        rows.map((r) => ({
          grade: r.grade,
          minScore: Number(r.minScore),
          maxScore: Number(r.maxScore),
          isActive: r.isActive,
        })),
      ),
    [rows],
  );

  const updateRow = (idx: number, patch: Partial<ScaleRow>) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const addRow = () => {
    const nextOrder = (rows.at(-1)?.sortOrder ?? rows.length) + 1;
    setRows((prev) => [
      ...prev,
      { level, grade: "", minScore: 0, maxScore: 0, points: 0, descriptor: "", sortOrder: nextOrder, isActive: true },
    ]);
  };

  const removeRow = (idx: number) => {
    setRows((prev) => prev.filter((_, i) => i !== idx).map((r, i) => ({ ...r, sortOrder: i + 1 })));
  };

  const persist = async () => {
    if (validationError) {
      toast.error(validationError, "Fix grading scale");
      setConfirmSave(false);
      return;
    }
    setSaving(true);
    try {
      const saved = await apiPut<ScaleRow[]>("/academic/grading-scales", {
        level,
        rows: rows.map((r, i) => ({
          grade: r.grade.trim().toUpperCase(),
          minScore: Number(r.minScore),
          maxScore: Number(r.maxScore),
          points: level === "O_LEVEL" ? null : Number(r.points ?? 0),
          descriptor: r.descriptor ?? "",
          sortOrder: i + 1,
          isActive: r.isActive,
        })),
      });
      setRows(saved.length ? saved : rows);
      toast.success(
        `${level === "A_LEVEL" ? "A-Level" : "O-Level"} grade bands are saved and will apply to new marks.`,
        "Grading scale saved",
      );
    } catch (e) {
      toast.error(getApiErrorMessage(e), "Could not save grading scale");
    } finally {
      setSaving(false);
      setConfirmSave(false);
    }
  };

  const resetToDefaults = () => {
    setRows(rowsFromDefaults(level));
    toast.info("Default grade bands restored. Click Save to apply them.", "Defaults loaded");
    setConfirmReset(false);
  };

  const recalculateStoredGrades = async () => {
    setRecalculating(true);
    try {
      const result = await apiPost<{
        updatedScores: number;
        updatedDivisions: number;
        scanned: number;
      }>("/academic/grading-scales/recalculate", {});
      toast.success(
        `Updated ${result.updatedScores} score row(s) and ${result.updatedDivisions} division summary row(s).`,
        "Recalculation complete",
      );
    } catch (e) {
      toast.error(getApiErrorMessage(e), "Could not recalculate grades");
    } finally {
      setRecalculating(false);
      setConfirmRecalculate(false);
    }
  };

  const applyCbcDefaults = async (force = false) => {
    setApplyingCbc(true);
    try {
      const saved = await apiPost<ScaleRow[]>("/academic/grading-scales/apply-cbc-defaults", { force });
      setRows(saved.length ? saved : rowsFromDefaults("O_LEVEL"));
      toast.success("CBC A–E defaults applied. Confirm cut-points with NCDC/UNEB.", "Defaults applied");
    } catch (e) {
      toast.error(getApiErrorMessage(e), "Could not apply defaults");
    } finally {
      setApplyingCbc(false);
      setConfirmApplyCbc(false);
    }
  };

  return (
    <PageWrapper
      title="Grading scales"
      description={
        level === "O_LEVEL"
          ? "O-Level CBC competency bands (A–E). Points are not used; composites use CA + EOC."
          : "A-Level score ranges, grades, and UNEB points"
      }
    >
      <Card title="Scale settings">
        {level === "O_LEVEL" ? (
          <div className="mb-3">
            <Alert tone="info">
              Cut-points shown are <strong>UNCONFIRMED placeholders</strong>. Confirm with your NCDC/UNEB circular
              before end-of-cycle reporting. Use &quot;Apply CBC defaults&quot; only when no O-Level scale exists, or
              to force-replace with defaults.
            </Alert>
          </div>
        ) : (
          <div className="mb-3">
            <Alert tone="info">
              Post-CBC UACE scheme is unconfirmed — contact your exams office before changing A-Level bands.
            </Alert>
          </div>
        )}
        <p className="mb-3 text-sm text-muted-foreground">
          {level === "A_LEVEL"
            ? "Subject teachers enter raw scores. The system maps each score to a grade and UNEB points using this table. After changing ranges, recalculate stored A-Level grades."
            : "Final subject grades map composite scores (20% CA + 80% EOC) to A–E bands. Points column is not used for O-Level CBC."}
        </p>
        <div className="mb-3 flex flex-wrap items-end gap-3">
          <label className="text-sm">
            <span className="mb-1 block text-muted-foreground">Level</span>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value as Level)}
              className="rounded border border-border bg-background px-2 py-2 text-sm"
            >
              {LEVEL_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt === "A_LEVEL" ? "A-Level" : "O-Level"}
                </option>
              ))}
            </select>
          </label>
          <Button variant="secondary" onClick={addRow} disabled={loading}>
            Add row
          </Button>
          <Button variant="secondary" onClick={() => setConfirmReset(true)} disabled={loading}>
            Reset to defaults
          </Button>
          {level === "O_LEVEL" ? (
            <Button variant="secondary" onClick={() => setConfirmApplyCbc(true)} disabled={loading || applyingCbc}>
              {applyingCbc ? "Applying…" : "Apply CBC defaults"}
            </Button>
          ) : null}
          <Button onClick={() => setConfirmSave(true)} disabled={saving || loading || Boolean(validationError)}>
            {saving ? "Saving..." : "Save grading scale"}
          </Button>
          {level === "A_LEVEL" ? (
            <Button variant="secondary" onClick={() => setConfirmRecalculate(true)} disabled={recalculating || loading}>
              {recalculating ? "Recalculating..." : "Recalculate stored A-Level grades"}
            </Button>
          ) : null}
        </div>

        {validationError ? <Alert tone="error">{validationError}</Alert> : null}

        {loading ? <p className="text-sm text-muted-foreground">Loading scale...</p> : null}
        {!loading ? (
          <div className="overflow-x-auto rounded border border-border">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-muted/40">
                  <th className="px-2 py-2 text-left">Grade</th>
                  <th className="px-2 py-2 text-right">Min score</th>
                  <th className="px-2 py-2 text-right">Max score</th>
                  {level === "A_LEVEL" ? (
                    <th className="px-2 py-2 text-right">Points</th>
                  ) : null}
                  <th className="px-2 py-2 text-left">Descriptor</th>
                  <th className="px-2 py-2 text-center">Active</th>
                  <th className="px-2 py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr key={`${row.grade}-${idx}`} className="border-t border-border">
                    <td className="px-2 py-2">
                      <input
                        value={row.grade}
                        onChange={(e) => updateRow(idx, { grade: e.target.value.toUpperCase() })}
                        className="w-16 rounded border border-border bg-background px-2 py-1"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        step="0.01"
                        value={row.minScore}
                        onChange={(e) => updateRow(idx, { minScore: Number(e.target.value) })}
                        className="w-24 rounded border border-border bg-background px-2 py-1 text-right"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        step="0.01"
                        value={row.maxScore}
                        onChange={(e) => updateRow(idx, { maxScore: Number(e.target.value) })}
                        className="w-24 rounded border border-border bg-background px-2 py-1 text-right"
                      />
                    </td>
                    {level === "A_LEVEL" ? (
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          value={row.points ?? 0}
                          onChange={(e) => updateRow(idx, { points: Number(e.target.value) })}
                          className="w-20 rounded border border-border bg-background px-2 py-1 text-right"
                        />
                      </td>
                    ) : null}
                    <td className="px-2 py-2">
                      <input
                        value={row.descriptor ?? ""}
                        onChange={(e) => updateRow(idx, { descriptor: e.target.value })}
                        className="w-44 rounded border border-border bg-background px-2 py-1"
                      />
                    </td>
                    <td className="px-2 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={row.isActive}
                        onChange={(e) => updateRow(idx, { isActive: e.target.checked })}
                      />
                    </td>
                    <td className="px-2 py-2 text-right">
                      <Button variant="ghost" onClick={() => removeRow(idx)} disabled={rows.length <= 1}>
                        Remove
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        <p className="mt-3 text-xs text-muted-foreground">
          CLI: run <code className="rounded bg-muted px-1">npm run seed:grading-scales</code> to load UNEB defaults, or{" "}
          <code className="rounded bg-muted px-1">npm run recalculate:alevel-grades</code> after bulk scale changes.
        </p>
      </Card>

      {level === "O_LEVEL" ? <OlevelCaPolicyPanel /> : null}

      <ConfirmDialog
        open={confirmSave}
        title="Save grading scale?"
        description="This replaces the active grade bands for the selected level. Teachers will see new grade previews immediately; run recalculate to update stored A-Level marks."
        confirmLabel="Save"
        loading={saving}
        onConfirm={() => void persist()}
        onCancel={() => setConfirmSave(false)}
      />
      <ConfirmDialog
        open={confirmReset}
        title="Reset table to defaults?"
        description="This restores the standard UNEB bands in the editor. Click Save grading scale to persist them."
        confirmLabel="Reset"
        onConfirm={resetToDefaults}
        onCancel={() => setConfirmReset(false)}
      />
      <ConfirmDialog
        open={confirmApplyCbc}
        title="Apply O-Level CBC defaults?"
        description="This loads A–E bands with UNCONFIRMED cut-points. If a scale already exists, use force from API or delete rows first."
        confirmLabel="Apply"
        loading={applyingCbc}
        onConfirm={() => void applyCbcDefaults(false)}
        onCancel={() => setConfirmApplyCbc(false)}
      />
      <ConfirmDialog
        open={confirmRecalculate}
        title="Recalculate stored A-Level grades?"
        description="All saved A-Level scores will be remapped using the active scale, and student division summaries will be refreshed."
        confirmLabel="Recalculate"
        loading={recalculating}
        onConfirm={() => void recalculateStoredGrades()}
        onCancel={() => setConfirmRecalculate(false)}
      />
    </PageWrapper>
  );
}
