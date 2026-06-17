"use client";

import {
  DEFAULT_ASSESSMENT_CONFIG,
  DEFAULT_O_LEVEL_COMPULSORY_SUBJECT_CODES,
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
  const [compulsoryText, setCompulsoryText] = useState("");

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const data = await apiGet<AssessmentConfig>("/settings/assessment-config");
        setConfig(data);
        const codes = data.compulsorySubjectCodes ?? [...DEFAULT_O_LEVEL_COMPULSORY_SUBJECT_CODES];
        setCompulsoryText(codes.join(", "));
      } catch (e) {
        toast.error(getApiErrorMessage(e), "Could not load assessment rules");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const codes = compulsoryText
        .split(/[,\s]+/)
        .map((c) => c.trim().toUpperCase())
        .filter(Boolean);
      const saved = await apiPut<AssessmentConfig>("/settings/assessment-config", {
        ...config,
        compulsorySubjectCodes: codes.length ? codes : null,
      });
      setConfig(saved);
      toast.success("Certification rules saved.", "Saved");
    } catch (e) {
      toast.error(getApiErrorMessage(e), "Could not save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageWrapper
      title="Assessment rules"
      description="UCE certification thresholds and compulsory subjects"
    >
      <p className="-mt-2 mb-4 text-sm text-muted-foreground">
        CA weights, project work policy, and strand fallback maps are on{" "}
        <Link href="/admin/academic/grading-scales" className="text-brand hover:underline">
          Grading scales → O-Level CA policy
        </Link>
        . Grade bands (A–E) are on the same page.
      </p>

      {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}

      {!loading ? (
        <Card title="UCE certification (Result 1 / 2 / 3)">
          <Alert tone="info">
            Result 1 requires official project-work CA per subject. Provisional strand-only CA does not qualify.
          </Alert>
          <label className="mb-4 mt-4 block text-sm">
            <span className="mb-1 block text-muted-foreground">
              Compulsory subject codes (comma-separated; blank = catalog default)
            </span>
            <input
              value={compulsoryText}
              onChange={(e) => setCompulsoryText(e.target.value)}
              placeholder={DEFAULT_O_LEVEL_COMPULSORY_SUBJECT_CODES.join(", ")}
              className="w-full rounded border border-border bg-background px-2 py-2"
            />
          </label>
          <label className="mb-4 block text-sm">
            <span className="mb-1 block text-muted-foreground">Minimum subjects for Result 1</span>
            <input
              type="number"
              min={1}
              max={20}
              value={config.minimumSubjects}
              onChange={(e) => setConfig((c) => ({ ...c, minimumSubjects: Number(e.target.value) }))}
              className="w-24 rounded border border-border bg-background px-2 py-2"
            />
          </label>
          <Button onClick={() => void save()} disabled={saving}>
            {saving ? "Saving…" : "Save certification rules"}
          </Button>
        </Card>
      ) : null}
    </PageWrapper>
  );
}
