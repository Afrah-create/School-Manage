"use client";

import { useEffect, useMemo, useState } from "react";
import type { SchoolSettings, UpdateSchoolSettingsInput } from "@uganda-cbc-sms/shared";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useSchoolSettings, useSchoolSettingsActions } from "@/hooks/useSchoolSettings";
import { getApiErrorMessage } from "@/lib/api";

const EMPTY_FORM: UpdateSchoolSettingsInput = {
  schoolName: "",
  motto: null,
  vision: null,
  mission: null,
  logoUrl: null,
  contactEmail: null,
  contactPhone: null,
  websiteUrl: null,
  postalAddress: null,
  physicalAddress: null,
  primaryColor: "#1D4ED8",
  secondaryColor: "#0F172A",
  reportFooterText: null,
};

function mapToForm(settings: SchoolSettings): UpdateSchoolSettingsInput {
  return {
    schoolName: settings.schoolName ?? "",
    motto: settings.motto,
    vision: settings.vision,
    mission: settings.mission,
    logoUrl: settings.logoUrl,
    contactEmail: settings.contactEmail,
    contactPhone: settings.contactPhone,
    websiteUrl: settings.websiteUrl,
    postalAddress: settings.postalAddress,
    physicalAddress: settings.physicalAddress,
    primaryColor: settings.primaryColor ?? "#1D4ED8",
    secondaryColor: settings.secondaryColor ?? "#0F172A",
    reportFooterText: settings.reportFooterText,
  };
}

function nullableText(value: string): string | null {
  const t = value.trim();
  return t.length ? t : null;
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-foreground">{label}</span>
      {children}
      {hint ? <span className="block text-xs text-muted-foreground">{hint}</span> : null}
    </label>
  );
}

const INPUT_CLS =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-ui focus:border-brand focus:ring-2 focus:ring-brand/20";

export default function AdminSchoolSettingsPage() {
  const settingsQ = useSchoolSettings();
  const saveMutation = useSchoolSettingsActions();
  const [form, setForm] = useState<UpdateSchoolSettingsInput>(EMPTY_FORM);
  const [ok, setOk] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (settingsQ.data) {
      setForm(mapToForm(settingsQ.data));
    }
  }, [settingsQ.data]);

  const isDirty = useMemo(() => {
    if (!settingsQ.data) return false;
    return JSON.stringify(form) !== JSON.stringify(mapToForm(settingsQ.data));
  }, [form, settingsQ.data]);

  const onSave = async () => {
    setOk(null);
    setErr(null);
    if (!form.schoolName.trim()) {
      setErr("School name is required.");
      return;
    }
    try {
      await saveMutation.mutateAsync({
        ...form,
        schoolName: form.schoolName.trim(),
        motto: nullableText(form.motto ?? ""),
        vision: nullableText(form.vision ?? ""),
        mission: nullableText(form.mission ?? ""),
        logoUrl: nullableText(form.logoUrl ?? ""),
        contactEmail: nullableText(form.contactEmail ?? ""),
        contactPhone: nullableText(form.contactPhone ?? ""),
        websiteUrl: nullableText(form.websiteUrl ?? ""),
        postalAddress: nullableText(form.postalAddress ?? ""),
        physicalAddress: nullableText(form.physicalAddress ?? ""),
        reportFooterText: nullableText(form.reportFooterText ?? ""),
        primaryColor: (form.primaryColor ?? "#1D4ED8").trim().toUpperCase(),
        secondaryColor: (form.secondaryColor ?? "#0F172A").trim().toUpperCase(),
      });
      setOk("School settings saved successfully.");
    } catch (e) {
      setErr(getApiErrorMessage(e));
    }
  };

  const onReset = () => {
    setOk(null);
    setErr(null);
    if (settingsQ.data) {
      setForm(mapToForm(settingsQ.data));
    }
  };

  return (
    <PageWrapper
      title="School settings"
      description="Configure your institution profile and branding used across admin workflows and generated report documents."
    >
      <div className="space-y-4">
        {ok ? <Alert tone="success">{ok}</Alert> : null}
        {err ? <Alert tone="error">{err}</Alert> : null}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="space-y-6">
          <Card title="Identity and message">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="School name" hint="Shown in report headers and administration pages.">
                <input
                  className={INPUT_CLS}
                  value={form.schoolName}
                  maxLength={140}
                  onChange={(e) => setForm((s) => ({ ...s, schoolName: e.target.value }))}
                />
              </Field>
              <Field label="Motto" hint="Short inspirational line.">
                <input
                  className={INPUT_CLS}
                  value={form.motto ?? ""}
                  maxLength={180}
                  onChange={(e) => setForm((s) => ({ ...s, motto: e.target.value }))}
                />
              </Field>
            </div>
            <div className="mt-4 grid gap-4">
              <Field label="Vision">
                <textarea
                  className={INPUT_CLS}
                  rows={3}
                  value={form.vision ?? ""}
                  maxLength={600}
                  onChange={(e) => setForm((s) => ({ ...s, vision: e.target.value }))}
                />
              </Field>
              <Field label="Mission">
                <textarea
                  className={INPUT_CLS}
                  rows={4}
                  value={form.mission ?? ""}
                  maxLength={1200}
                  onChange={(e) => setForm((s) => ({ ...s, mission: e.target.value }))}
                />
              </Field>
            </div>
          </Card>

          <Card title="Branding and contacts">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Logo URL" hint="Public image URL (PNG/JPG/SVG recommended).">
                <input
                  className={INPUT_CLS}
                  value={form.logoUrl ?? ""}
                  maxLength={500}
                  placeholder="https://example.com/logo.png"
                  onChange={(e) => setForm((s) => ({ ...s, logoUrl: e.target.value }))}
                />
              </Field>
              <Field label="Website URL">
                <input
                  className={INPUT_CLS}
                  value={form.websiteUrl ?? ""}
                  maxLength={500}
                  placeholder="https://example.ac.ug"
                  onChange={(e) => setForm((s) => ({ ...s, websiteUrl: e.target.value }))}
                />
              </Field>
              <Field label="Contact email">
                <input
                  className={INPUT_CLS}
                  value={form.contactEmail ?? ""}
                  maxLength={160}
                  placeholder="admin@school.ac.ug"
                  onChange={(e) => setForm((s) => ({ ...s, contactEmail: e.target.value }))}
                />
              </Field>
              <Field label="Contact phone">
                <input
                  className={INPUT_CLS}
                  value={form.contactPhone ?? ""}
                  maxLength={40}
                  placeholder="+256 ..."
                  onChange={(e) => setForm((s) => ({ ...s, contactPhone: e.target.value }))}
                />
              </Field>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Field label="Postal address">
                <textarea
                  className={INPUT_CLS}
                  rows={3}
                  value={form.postalAddress ?? ""}
                  maxLength={300}
                  onChange={(e) => setForm((s) => ({ ...s, postalAddress: e.target.value }))}
                />
              </Field>
              <Field label="Physical address">
                <textarea
                  className={INPUT_CLS}
                  rows={3}
                  value={form.physicalAddress ?? ""}
                  maxLength={300}
                  onChange={(e) => setForm((s) => ({ ...s, physicalAddress: e.target.value }))}
                />
              </Field>
            </div>
          </Card>

          <Card title="Report styling">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Primary color" hint="Hex format e.g. #1D4ED8">
                <input
                  className={INPUT_CLS}
                  value={form.primaryColor ?? ""}
                  maxLength={7}
                  onChange={(e) => setForm((s) => ({ ...s, primaryColor: e.target.value }))}
                />
              </Field>
              <Field label="Secondary color" hint="Hex format e.g. #0F172A">
                <input
                  className={INPUT_CLS}
                  value={form.secondaryColor ?? ""}
                  maxLength={7}
                  onChange={(e) => setForm((s) => ({ ...s, secondaryColor: e.target.value }))}
                />
              </Field>
            </div>
            <div className="mt-4">
              <Field label="Report footer text">
                <textarea
                  className={INPUT_CLS}
                  rows={3}
                  value={form.reportFooterText ?? ""}
                  maxLength={280}
                  onChange={(e) => setForm((s) => ({ ...s, reportFooterText: e.target.value }))}
                />
              </Field>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Live preview">
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <div className="flex items-center gap-3">
                {form.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={form.logoUrl}
                    alt="School logo preview"
                    className="h-12 w-12 rounded-lg border border-border object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-dashed border-border text-xs text-muted-foreground">
                    Logo
                  </div>
                )}
                <div>
                  <p className="font-semibold text-foreground">{form.schoolName || "School name"}</p>
                  <p className="text-sm text-muted-foreground">{form.motto || "School motto"}</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-md border border-border bg-background p-2">
                  <p className="text-muted-foreground">Primary</p>
                  <p className="font-mono text-foreground">{form.primaryColor || "#1D4ED8"}</p>
                </div>
                <div className="rounded-md border border-border bg-background p-2">
                  <p className="text-muted-foreground">Secondary</p>
                  <p className="font-mono text-foreground">{form.secondaryColor || "#0F172A"}</p>
                </div>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                {form.reportFooterText || "Footer text for generated reports appears here."}
              </p>
            </div>
          </Card>

          <Card title="Actions">
            <div className="space-y-3">
              <Button
                className="w-full"
                loading={saveMutation.isPending}
                disabled={settingsQ.isLoading || !isDirty}
                onClick={() => void onSave()}
              >
                Save settings
              </Button>
              <Button
                className="w-full"
                variant="secondary"
                disabled={settingsQ.isLoading || saveMutation.isPending || !isDirty}
                onClick={onReset}
              >
                Reset unsaved changes
              </Button>
              <p className="text-xs text-muted-foreground">
                Last updated: {settingsQ.data?.updatedAt ? new Date(settingsQ.data.updatedAt).toLocaleString() : "—"}
              </p>
            </div>
          </Card>
        </div>
      </div>
    </PageWrapper>
  );
}
