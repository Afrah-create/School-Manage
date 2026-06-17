"use client";

import {
  DEFAULT_ASSESSMENT_CONFIG,
  type AssessmentConfig,
  type CaYearWindow,
  type CurriculumForm,
} from "@uganda-cbc-sms/shared";
import { useEffect, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { apiGet, apiPost, apiPut, getApiErrorMessage } from "@/lib/api";
import { toast } from "@/lib/toast";

const RATINGS = ["A", "B", "C", "D", "E"] as const;
const WINDOW_OPTIONS: { value: CaYearWindow; label: string }[] = [
  { value: "S1_S4", label: "Senior 1 – 4 (full O-Level)" },
  { value: "S3_S4", label: "Senior 3 – 4 only" },
  { value: "custom", label: "Custom forms" },
];
const FORM_OPTIONS: CurriculumForm[] = ["S1", "S2", "S3", "S4"];

export function OlevelCaPolicyPanel() {
  const [config, setConfig] = useState<AssessmentConfig>(DEFAULT_ASSESSMENT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [confirmRecalc, setConfirmRecalc] = useState(false);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const data = await apiGet<AssessmentConfig>("/settings/assessment-config");
        setConfig(data);
      } catch (e) {
        toast.error(getApiErrorMessage(e), "Could not load CA policy");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const saved = await apiPut<AssessmentConfig>("/settings/assessment-config", config);
      setConfig(saved);
      toast.success(
        "CA policy saved. Run O-Level recalculation before publishing report cards.",
        "Saved",
      );
    } catch (e) {
      toast.error(getApiErrorMessage(e), "Could not save");
    } finally {
      setSaving(false);
    }
  };

  const recalculate = async () => {
    setRecalculating(true);
    try {
      const result = await apiPost<{ scanned: number; updated: number }>(
        "/academic/grading-scales/recalculate-olevel",
        {},
      );
      toast.success(
        `Updated ${result.updated} subject row(s) for ${result.scanned} student(s).`,
        "Recalculation complete",
      );
    } catch (e) {
      toast.error(getApiErrorMessage(e), "Could not recalculate");
    } finally {
      setRecalculating(false);
      setConfirmRecalc(false);
    }
  };

  const toggleForm = (form: CurriculumForm) => {
    setConfig((c) => {
      const set = new Set(c.caCustomForms);
      if (set.has(form)) set.delete(form);
      else set.add(form);
      return { ...c, caCustomForms: [...set] };
    });
  };

  if (loading) return <p className="text-sm text-muted-foreground">Loading CA policy…</p>;

  return (
    <Card title="O-Level CA policy (project work)">
      <Alert tone="info">
        Official CA is built from <strong>scored project work</strong> (default 4 projects/term per NCDC).
        Strand rating → % map below is a <strong>provisional fallback only</strong> when no project scores exist.
        Set each academic year&apos;s <strong>curriculum form (S1–S4)</strong> under Academic → Years for cumulative windows.
      </Alert>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block text-muted-foreground">CA weight</span>
          <input
            type="number"
            step="0.01"
            min={0}
            max={1}
            value={config.caWeight}
            onChange={(e) => setConfig((c) => ({ ...c, caWeight: Number(e.target.value) }))}
            className="w-full rounded border border-border bg-background px-2 py-2"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-muted-foreground">EOC weight</span>
          <input
            type="number"
            step="0.01"
            min={0}
            max={1}
            value={config.eocWeight}
            onChange={(e) => setConfig((c) => ({ ...c, eocWeight: Number(e.target.value) }))}
            className="w-full rounded border border-border bg-background px-2 py-2"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-muted-foreground">CA year window</span>
          <select
            value={config.caYearWindow}
            onChange={(e) =>
              setConfig((c) => ({ ...c, caYearWindow: e.target.value as CaYearWindow }))
            }
            className="w-full rounded border border-border bg-background px-2 py-2"
          >
            {WINDOW_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-muted-foreground">Expected projects per term</span>
          <input
            type="number"
            min={1}
            max={20}
            value={config.projectWork.expectedPerTerm}
            onChange={(e) =>
              setConfig((c) => ({
                ...c,
                projectWork: { ...c.projectWork, expectedPerTerm: Number(e.target.value) },
              }))
            }
            className="w-full rounded border border-border bg-background px-2 py-2"
          />
        </label>
      </div>

      {config.caYearWindow === "custom" ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {FORM_OPTIONS.map((f) => (
            <label key={f} className="flex items-center gap-1 text-sm">
              <input
                type="checkbox"
                checked={config.caCustomForms.includes(f)}
                onChange={() => toggleForm(f)}
              />
              {f}
            </label>
          ))}
        </div>
      ) : null}

      <label className="mt-3 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={config.allowIncompleteCaOverride}
          onChange={(e) =>
            setConfig((c) => ({ ...c, allowIncompleteCaOverride: e.target.checked }))
          }
        />
        Allow CA with incomplete project slots (admin override)
      </label>

      <p className="mt-4 text-sm font-medium">Strand fallback map (provisional only)</p>
      <div className="mb-3 grid grid-cols-5 gap-2">
        {RATINGS.map((r) => (
          <label key={r} className="text-sm">
            <span className="mb-1 block text-muted-foreground">{r}</span>
            <input
              type="number"
              min={0}
              max={100}
              value={config.caRules.fallbackRatingScoreMap[r]}
              onChange={(e) =>
                setConfig((c) => ({
                  ...c,
                  caRules: {
                    ...c.caRules,
                    fallbackRatingScoreMap: {
                      ...c.caRules.fallbackRatingScoreMap,
                      [r]: Number(e.target.value),
                    },
                  },
                }))
              }
              className="w-full rounded border border-border bg-background px-2 py-1 text-right"
            />
          </label>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block text-muted-foreground">Policy last verified (CA / projects)</span>
          <input
            type="date"
            value={config.projectWork.policyVerifiedAt?.slice(0, 10) ?? ""}
            onChange={(e) =>
              setConfig((c) => ({
                ...c,
                projectWork: {
                  ...c.projectWork,
                  policyVerifiedAt: e.target.value ? `${e.target.value}T00:00:00.000Z` : null,
                },
              }))
            }
            className="w-full rounded border border-border bg-background px-2 py-2"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-muted-foreground">Policy last verified (weights / window)</span>
          <input
            type="date"
            value={config.policyVerifiedAt?.slice(0, 10) ?? ""}
            onChange={(e) =>
              setConfig((c) => ({
                ...c,
                policyVerifiedAt: e.target.value ? `${e.target.value}T00:00:00.000Z` : null,
              }))
            }
            className="w-full rounded border border-border bg-background px-2 py-2"
          />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={() => void save()} disabled={saving}>
          {saving ? "Saving…" : "Save CA policy"}
        </Button>
        <Button variant="secondary" onClick={() => setConfirmRecalc(true)} disabled={recalculating}>
          {recalculating ? "Recalculating…" : "Recalculate O-Level grades"}
        </Button>
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        CLI: <code className="rounded bg-muted px-1">npm run recalculate:olevel-grades</code>
      </p>

      <ConfirmDialog
        open={confirmRecalc}
        title="Recalculate O-Level composites?"
        description="Recomputes CA (from project work), EOC, final grades, and certification for all active students using current policy."
        confirmLabel="Recalculate"
        loading={recalculating}
        onConfirm={() => void recalculate()}
        onCancel={() => setConfirmRecalc(false)}
      />
    </Card>
  );
}
