"use client";

import { Copy, ExternalLink, Pencil, School } from "lucide-react";
import { schoolLoginUrl } from "@/lib/tenantHost";
import type { PlatformTenant } from "./types";
import { TenantStatusBadge } from "./TenantStatusBadge";

export function TenantsTable({
  tenants,
  onEdit,
  onCopyUrl,
}: {
  tenants: PlatformTenant[];
  onEdit: (t: PlatformTenant) => void;
  onCopyUrl: (slug: string) => void;
}) {
  if (tenants.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-900/30 px-6 py-16 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-300">
          <School className="h-7 w-7" aria-hidden />
        </div>
        <p className="font-heading text-lg font-medium text-white">No schools yet</p>
        <p className="mt-2 max-w-sm text-sm text-slate-400">
          Add your first school tenant to provision a subdomain and administrator account.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/40 shadow-lg shadow-black/10">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/80 text-xs uppercase tracking-wider text-slate-500">
              <th className="px-5 py-3.5 font-medium">School</th>
              <th className="px-5 py-3.5 font-medium">Subdomain</th>
              <th className="px-5 py-3.5 font-medium">Status</th>
              <th className="px-5 py-3.5 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80">
            {tenants.map((t) => (
              <tr key={t.id} className="transition hover:bg-slate-800/30">
                <td className="px-5 py-4">
                  <p className="font-medium text-white">{t.displayName}</p>
                  {t.schoolName && t.schoolName !== t.displayName ? (
                    <p className="mt-0.5 text-xs text-slate-500">{t.schoolName}</p>
                  ) : null}
                </td>
                <td className="px-5 py-4">
                  <code className="rounded-md bg-slate-950 px-2 py-1 text-xs text-violet-200">
                    {t.slug}
                  </code>
                </td>
                <td className="px-5 py-4">
                  <TenantStatusBadge status={t.status} />
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center justify-end gap-1">
                    <ActionButton
                      label="Edit"
                      onClick={() => onEdit(t)}
                      icon={Pencil}
                    />
                    <ActionButton
                      label="Copy sign-in URL"
                      onClick={() => onCopyUrl(t.slug)}
                      icon={Copy}
                    />
                    <a
                      href={schoolLoginUrl(t.slug)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-400 transition hover:bg-slate-800 hover:text-violet-200"
                    >
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                      Open
                    </a>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ActionButton({
  label,
  onClick,
  icon: Icon,
}: {
  label: string;
  onClick: () => void;
  icon: typeof Pencil;
}) {
  return (
    <button
      type="button"
      title={label}
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-400 transition hover:bg-slate-800 hover:text-white"
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      <span className="sr-only sm:not-sr-only sm:inline">{label}</span>
    </button>
  );
}
