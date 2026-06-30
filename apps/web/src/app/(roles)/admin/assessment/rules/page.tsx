"use client";

import {
  DEFAULT_ASSESSMENT_CONFIG,
  type AssessmentConfig,
} from "@uganda-cbc-sms/shared";
import { useEffect, useState } from "react";
import Link from "next/link";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { apiGet, apiPut, getApiErrorMessage } from "@/lib/api";
import { toast } from "@/lib/toast";

export default function AdminAssessmentRulesPage() {
  const [config, setConfig] = useState<AssessmentConfig>(DEFAULT_ASSESSMENT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const data = await apiGet<AssessmentConfig>("/settings/assessment-config");
        setConfig(data);
      } catch (e) {
        toast.error(getApiErrorMessage(e), "Could not load term grade policy");
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
      toast.success("Term grade policy saved.", "Saved");
    } catch (e) {
      toast.error(getApiErrorMessage(e), "Could not save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageWrapper
      title="Term grade policy"
      description="How compulsory exam averages and project work combine into term subject grades."
    >
      <p className="-mt-2 mb-4 text-sm text-muted-foreground">
        A–E score bands and descriptors are on{" "}
        <Link href="/admin/academic/grading-scales" className="text-brand hover:underline">
          Grading scales
        </Link>
        . Expected project slots per term can also be set there.
      </p>

      {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}

      {!loading ? (
        <Card title="Term final grade weights">
          <Alert tone="info">
            Term grades average <strong>compulsory exam marks</strong> for the reporting term. When project work is
            enabled, the final score blends project average and exam average using the weights below.
          </Alert>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block text-muted-foreground">Project work weight</span>
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
              <span className="mb-1 block text-muted-foreground">Exam average weight</span>
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
          </div>
          <label className="mt-4 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={config.includeProjectWorkInTermGrade}
              onChange={(e) =>
                setConfig((c) => ({ ...c, includeProjectWorkInTermGrade: e.target.checked }))
              }
            />
            Include project work in term final grade
          </label>
          <label className="mt-2 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={config.allowIncompleteCaOverride}
              onChange={(e) =>
                setConfig((c) => ({ ...c, allowIncompleteCaOverride: e.target.checked }))
              }
            />
            Allow report release when project work slots are incomplete
          </label>
          <Button className="mt-4" onClick={() => void save()} disabled={saving}>
            {saving ? "Saving…" : "Save policy"}
          </Button>
        </Card>
      ) : null}
    </PageWrapper>
  );
}
