"use client";

import { AlertTriangle, CheckCircle2, PauseCircle, PlayCircle } from "lucide-react";
import { PlatformModal } from "./PlatformModal";
import { platformBtnPrimary, platformBtnSecondary } from "./platformFieldStyles";

export type TenantActionConfirmKind = "suspend" | "activate";

type PlatformTenantActionConfirmDialogProps = {
  open: boolean;
  kind: TenantActionConfirmKind;
  displayName: string;
  slug: string;
  loading?: boolean;
  billingLocked?: boolean;
  openInvoiceLabel?: string | null;
  onConfirm: () => void;
  onClose: () => void;
};

const COPY: Record<
  TenantActionConfirmKind,
  {
    title: string;
    description: string;
    bullets: string[];
    confirmLabel: string;
    icon: typeof PauseCircle;
    tone: "danger" | "success";
  }
> = {
  suspend: {
    title: "Suspend school",
    description: "This immediately blocks all sign-in for the school — stronger than a billing lock.",
    confirmLabel: "Suspend school",
    icon: PauseCircle,
    tone: "danger",
    bullets: [
      "No staff or administrators can sign in until you unblock the school.",
      "Existing sessions will stop working on their next request.",
      "Billing unpaid invoices separately — suspension is a manual platform action.",
    ],
  },
  activate: {
    title: "Unblock school",
    description: "Restore normal sign-in access for this school.",
    confirmLabel: "Unblock school",
    icon: PlayCircle,
    tone: "success",
    bullets: [
      "Staff and administrators can sign in again immediately.",
      "If the school still has unpaid term billing, normal billing restrictions may apply after sign-in.",
    ],
  },
};

export function PlatformTenantActionConfirmDialog({
  open,
  kind,
  displayName,
  slug,
  loading = false,
  billingLocked = false,
  openInvoiceLabel,
  onConfirm,
  onClose,
}: PlatformTenantActionConfirmDialogProps) {
  const copy = COPY[kind];
  const Icon = copy.icon;
  const BannerIcon = kind === "suspend" ? AlertTriangle : CheckCircle2;

  const bannerClass =
    copy.tone === "danger"
      ? "border-amber-500/30 bg-amber-500/10 text-amber-100"
      : "border-emerald-500/30 bg-emerald-500/10 text-emerald-100";

  const confirmBtnClass =
    copy.tone === "danger"
      ? "inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 px-5 py-2 text-sm font-medium text-white shadow-lg shadow-amber-900/25 transition hover:from-amber-500 hover:to-orange-500 disabled:cursor-not-allowed disabled:opacity-50"
      : platformBtnPrimary;

  return (
    <PlatformModal
      open={open}
      title={copy.title}
      description={copy.description}
      onClose={loading ? () => undefined : onClose}
      footer={
        <>
          <button type="button" className={platformBtnSecondary} onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button type="button" className={confirmBtnClass} onClick={onConfirm} disabled={loading}>
            <Icon className="mr-2 h-4 w-4" aria-hidden />
            {loading ? "Please wait…" : copy.confirmLabel}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">School</p>
          <p className="mt-1 font-heading text-base font-semibold text-white">{displayName}</p>
          <p className="mt-0.5 font-mono text-xs text-slate-400">{slug}</p>
          {openInvoiceLabel ? (
            <p className="mt-3 text-sm text-slate-400">
              Open invoice: <span className="text-slate-200">{openInvoiceLabel}</span>
            </p>
          ) : null}
          {billingLocked ? (
            <p className="mt-2 inline-flex rounded-full bg-red-500/15 px-2.5 py-0.5 text-xs font-medium text-red-200 ring-1 ring-red-500/30">
              Billing locked (unpaid)
            </p>
          ) : null}
        </div>

        <div className={`rounded-xl border p-4 ${bannerClass}`}>
          <div className="flex gap-3">
            <BannerIcon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
            <ul className="space-y-2 text-sm leading-relaxed">
              {copy.bullets.map((bullet) => (
                <li key={bullet} className="flex gap-2">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-current opacity-70" aria-hidden />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </PlatformModal>
  );
}
