"use client";

import { TENANT_FEATURE_FLAG_KEYS } from "@uganda-cbc-sms/shared";
import type { PlatformTenant } from "./types";
import { FEATURE_FLAG_LABELS } from "./platformUtils";
import { platformInputClass, platformLabelClass } from "./platformFieldStyles";

export const EDIT_TENANT_FORM_ID = "platform-edit-tenant-form";

export type EditTenantFormState = {
  displayName: string;
  status: "active" | "suspended" | "provisioning";
  featureFlags: Record<string, boolean>;
};

export function EditTenantForm({
  tenant,
  form,
  onChange,
  onSubmit,
}: {
  tenant: PlatformTenant;
  form: EditTenantFormState;
  onChange: (next: EditTenantFormState) => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <form id={EDIT_TENANT_FORM_ID} onSubmit={onSubmit} className="space-y-5">
      <p className="rounded-lg bg-slate-950/60 px-3 py-2 font-mono text-xs text-violet-300/90 ring-1 ring-slate-800">
        {tenant.slug}.localhost
      </p>
      <label className={platformLabelClass}>
        Display name
        <input
          required
          className={platformInputClass}
          value={form.displayName}
          onChange={(e) => onChange({ ...form, displayName: e.target.value })}
        />
      </label>
      <label className={platformLabelClass}>
        Status
        <select
          className={platformInputClass}
          value={form.status}
          onChange={(e) =>
            onChange({
              ...form,
              status: e.target.value as EditTenantFormState["status"],
            })
          }
        >
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="provisioning">Provisioning</option>
        </select>
      </label>
      <fieldset>
        <legend className="mb-3 text-sm font-medium text-slate-300">Enabled modules</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {TENANT_FEATURE_FLAG_KEYS.map((key) => (
            <label
              key={key}
              className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2.5 transition hover:border-slate-700"
            >
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-600 text-violet-600 focus:ring-violet-500/30"
                checked={form.featureFlags[key] !== false}
                onChange={(e) =>
                  onChange({
                    ...form,
                    featureFlags: { ...form.featureFlags, [key]: e.target.checked },
                  })
                }
              />
              <span className="text-sm text-slate-200">{FEATURE_FLAG_LABELS[key] ?? key}</span>
            </label>
          ))}
        </div>
      </fieldset>
    </form>
  );
}
