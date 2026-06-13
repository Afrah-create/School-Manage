"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Clock, Plus, RefreshCw, Settings2 } from "lucide-react";
import { PlatformModal } from "@/components/platform/PlatformModal";
import { PlatformTenantActionConfirmDialog } from "@/components/platform/PlatformTenantActionConfirmDialog";
import { PlatformShell } from "@/components/platform/PlatformShell";
import { PlatformStatCard } from "@/components/platform/PlatformStatCard";
import { platformApiError } from "@/components/platform/platformUtils";
import {
  platformBtnPrimary,
  platformBtnSecondary,
  platformCardClass,
  platformInputClass,
  platformLabelClass,
} from "@/components/platform/platformFieldStyles";
import { platformApi, setPlatformToken } from "@/lib/platformApi";
import { toast } from "@/lib/toast";

type BillingOverviewRow = {
  tenantId: string;
  slug: string;
  displayName: string;
  tenantStatus: string;
  accessStatus: "current" | "grace" | "past_due" | "none";
  isLocked: boolean;
  billingPeriod: {
    id: string;
    label: string;
    dueAt: string | null;
    amountUgx: number;
    status: string;
  } | null;
};

type BillingSettings = {
  defaultAmountUgx: number;
  currency: string;
  graceDays: number;
};

type CreatePeriodForm = {
  tenantId: string;
  label: string;
  periodStart: string;
  periodEnd: string;
  dueAt: string;
  amountUgx: string;
  notes: string;
};

const EMPTY_CREATE: CreatePeriodForm = {
  tenantId: "",
  label: "",
  periodStart: "",
  periodEnd: "",
  dueAt: "",
  amountUgx: "",
  notes: "",
};

function accessBadge(accessStatus: BillingOverviewRow["accessStatus"], isLocked: boolean): string {
  if (isLocked) return "bg-red-500/15 text-red-300 ring-red-500/30";
  switch (accessStatus) {
    case "grace":
      return "bg-amber-500/15 text-amber-200 ring-amber-500/30";
    case "current":
      return "bg-emerald-500/15 text-emerald-200 ring-emerald-500/30";
    default:
      return "bg-slate-700/40 text-slate-400 ring-slate-600/30";
  }
}

function accessLabel(accessStatus: BillingOverviewRow["accessStatus"], isLocked: boolean): string {
  if (isLocked) return "Locked (unpaid)";
  switch (accessStatus) {
    case "grace":
      return "Grace period";
    case "current":
      return "Current";
    case "past_due":
      return "Past due";
    default:
      return "No invoice";
  }
}

function statusBadge(status: string | null): string {
  switch (status) {
    case "overdue":
      return "bg-red-500/15 text-red-300 ring-red-500/30";
    case "pending":
      return "bg-amber-500/15 text-amber-200 ring-amber-500/30";
    case "paid":
      return "bg-emerald-500/15 text-emerald-200 ring-emerald-500/30";
    case "waived":
      return "bg-slate-500/15 text-slate-300 ring-slate-500/30";
    default:
      return "bg-slate-700/40 text-slate-400 ring-slate-600/30";
  }
}

export default function PlatformBillingPage() {
  const router = useRouter();
  const [overview, setOverview] = useState<BillingOverviewRow[]>([]);
  const [settings, setSettings] = useState<BillingSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createForm, setCreateForm] = useState<CreatePeriodForm>(EMPTY_CREATE);
  const [settingsForm, setSettingsForm] = useState<BillingSettings>({
    defaultAmountUgx: 500_000,
    currency: "UGX",
    graceDays: 7,
  });
  const [statusConfirm, setStatusConfirm] = useState<{
    kind: "suspend" | "activate";
    row: BillingOverviewRow;
  } | null>(null);

  const stats = useMemo(() => {
    const unpaid = overview.filter(
      (r) => r.billingPeriod && ["pending", "overdue"].includes(r.billingPeriod.status),
    ).length;
    const overdue = overview.filter((r) => r.billingPeriod?.status === "overdue").length;
    const locked = overview.filter((r) => r.isLocked).length;
    const suspended = overview.filter((r) => r.tenantStatus === "suspended").length;
    const clear = overview.filter((r) => !r.billingPeriod && r.tenantStatus === "active").length;
    return { schools: overview.length, unpaid, overdue, locked, suspended, clear };
  }, [overview]);

  const load = useCallback(async () => {
    try {
      const [oRes, sRes] = await Promise.all([
        platformApi.get("/billing/overview"),
        platformApi.get("/billing/settings"),
      ]);
      setOverview(oRes.data?.data ?? []);
      const s = sRes.data?.data as BillingSettings;
      setSettings(s);
      setSettingsForm(s);
    } catch {
      toast.error("Your session may have expired. Please sign in again.", "Could not load billing");
      setPlatformToken(null);
      router.replace("/platform/login");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  const runOverdue = async () => {
    try {
      setSubmitting(true);
      const res = await platformApi.post("/billing/run-overdue");
      const updated = res.data?.data?.updated ?? 0;
      toast.success(`Marked ${updated} period(s) overdue.`, "Billing");
      await load();
    } catch (e) {
      toast.error(platformApiError(e) ?? "Something went wrong.", "Overdue job");
    } finally {
      setSubmitting(false);
    }
  };

  const createPeriod = async () => {
    if (!createForm.tenantId || !createForm.label.trim()) {
      toast.error("Select a school and enter a term label.", "Create invoice");
      return;
    }
    try {
      setSubmitting(true);
      await platformApi.post("/billing/periods", {
        tenantId: createForm.tenantId,
        label: createForm.label.trim(),
        periodStart: createForm.periodStart,
        periodEnd: createForm.periodEnd,
        dueAt: createForm.dueAt ? new Date(createForm.dueAt).toISOString() : undefined,
        amountUgx: createForm.amountUgx ? Number(createForm.amountUgx) : undefined,
        notes: createForm.notes.trim() || undefined,
      });
      toast.success("Billing period created.", "Billing");
      setCreateOpen(false);
      setCreateForm(EMPTY_CREATE);
      await load();
    } catch (e) {
      toast.error(platformApiError(e) ?? "Something went wrong.", "Create invoice");
    } finally {
      setSubmitting(false);
    }
  };

  const patchPeriod = async (periodId: string, status: "paid" | "waived") => {
    try {
      setSubmitting(true);
      await platformApi.patch(`/billing/periods/${periodId}`, { status });
      toast.success(`Period marked ${status}.`, "Billing");
      await load();
    } catch (e) {
      toast.error(platformApiError(e) ?? "Something went wrong.", "Update period");
    } finally {
      setSubmitting(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSubmitting(true);
      await platformApi.patch("/billing/settings", settingsForm);
      toast.success("Billing settings saved.", "Settings");
      setSettingsOpen(false);
      await load();
    } catch (e) {
      toast.error(platformApiError(e) ?? "Something went wrong.", "Settings");
    } finally {
      setSubmitting(false);
    }
  };

  function requestSuspend(row: BillingOverviewRow) {
    setStatusConfirm({ kind: "suspend", row });
  }

  function requestActivate(row: BillingOverviewRow) {
    setStatusConfirm({ kind: "activate", row });
  }

  async function confirmStatusChange() {
    if (!statusConfirm) return;
    const { kind, row } = statusConfirm;
    try {
      setSubmitting(true);
      if (kind === "suspend") {
        await platformApi.post(`/tenants/${row.tenantId}/suspend`);
        toast.success(`${row.displayName} has been suspended.`, "School suspended");
      } else {
        await platformApi.post(`/tenants/${row.tenantId}/activate`);
        toast.success(`${row.displayName} is active again.`, "School reactivated");
      }
      setStatusConfirm(null);
      await load();
    } catch (e) {
      toast.error(
        platformApiError(e) ?? "Something went wrong.",
        kind === "suspend" ? "Suspend" : "Reactivate",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PlatformShell
      title="Platform billing"
      subtitle="Termly school subscriptions, invoices, and payment status"
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={platformBtnPrimary}
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Create invoice
            </button>
            <button
              type="button"
              className={platformBtnSecondary}
              onClick={() => setSettingsOpen(true)}
            >
              <Settings2 className="mr-2 h-4 w-4" />
              Settings
            </button>
            <button
              type="button"
              className={platformBtnSecondary}
              onClick={() => void runOverdue()}
              disabled={submitting}
            >
              <Clock className="mr-2 h-4 w-4" />
              Run overdue job
            </button>
            <button
              type="button"
              className={platformBtnSecondary}
              onClick={() => void load()}
              disabled={loading}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <PlatformStatCard label="Schools" value={String(stats.schools)} icon={AlertTriangle} />
          <PlatformStatCard label="Unpaid" value={String(stats.unpaid)} icon={AlertTriangle} />
          <PlatformStatCard label="Overdue" value={String(stats.overdue)} icon={Clock} />
          <PlatformStatCard label="Billing locked" value={String(stats.locked)} icon={AlertTriangle} />
          <PlatformStatCard label="Suspended" value={String(stats.suspended)} icon={Clock} />
          <PlatformStatCard label="Up to date" value={String(stats.clear)} icon={RefreshCw} />
        </div>

        <div className={platformCardClass}>
          <h2 className="font-heading text-lg font-semibold text-white">School subscription status</h2>
          <p className="mt-1 text-sm text-slate-400">
            Default term fee: {settings ? `${settings.currency} ${settings.defaultAmountUgx.toLocaleString()}` : "…"} · Grace{" "}
            {settings?.graceDays ?? "…"} day{settings?.graceDays === 1 ? "" : "s"}
          </p>

          {loading ? (
            <p className="mt-6 text-sm text-slate-400">Loading…</p>
          ) : overview.length === 0 ? (
            <p className="mt-6 text-sm text-slate-400">No schools found.</p>
          ) : (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="pb-3 pr-4 font-medium">School</th>
                    <th className="pb-3 pr-4 font-medium">Tenant</th>
                    <th className="pb-3 pr-4 font-medium">Access</th>
                    <th className="pb-3 pr-4 font-medium">Account</th>
                    <th className="pb-3 pr-4 font-medium">Current invoice</th>
                    <th className="pb-3 pr-4 font-medium">Due</th>
                    <th className="pb-3 pr-4 font-medium">Amount</th>
                    <th className="pb-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.map((row) => {
                    const period = row.billingPeriod;
                    return (
                      <tr key={row.tenantId} className="border-b border-slate-800/60 last:border-0">
                        <td className="py-3 pr-4 text-white">{row.displayName}</td>
                        <td className="py-3 pr-4 font-mono text-xs text-slate-400">{row.slug}</td>
                        <td className="py-3 pr-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${accessBadge(row.accessStatus, row.isLocked)}`}
                          >
                            {accessLabel(row.accessStatus, row.isLocked)}
                          </span>
                        </td>
                        <td className="py-3 pr-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${
                              row.tenantStatus === "suspended"
                                ? "bg-amber-500/15 text-amber-200 ring-amber-500/30"
                                : "bg-emerald-500/15 text-emerald-200 ring-emerald-500/30"
                            }`}
                          >
                            {row.tenantStatus === "suspended" ? "Suspended" : "Active"}
                          </span>
                        </td>
                        <td className="py-3 pr-4">
                          {period ? (
                            <span
                              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${statusBadge(period.status)}`}
                            >
                              {period.label} · {period.status}
                            </span>
                          ) : (
                            <span className="text-slate-500">No open invoice</span>
                          )}
                        </td>
                        <td className="py-3 pr-4 text-slate-300">
                          {period?.dueAt ? new Date(period.dueAt).toLocaleDateString() : "—"}
                        </td>
                        <td className="py-3 pr-4 text-slate-300">
                          {period ? `UGX ${period.amountUgx.toLocaleString()}` : "—"}
                        </td>
                        <td className="py-3">
                          <div className="flex flex-wrap gap-2">
                            {period ? (
                              <>
                                <button
                                  type="button"
                                  className="text-xs text-emerald-400 hover:text-emerald-300 disabled:opacity-50"
                                  disabled={submitting || period.status === "paid"}
                                  onClick={() => void patchPeriod(period.id, "paid")}
                                >
                                  Mark paid
                                </button>
                                <button
                                  type="button"
                                  className="text-xs text-slate-400 hover:text-slate-200 disabled:opacity-50"
                                  disabled={submitting || period.status === "waived"}
                                  onClick={() => void patchPeriod(period.id, "waived")}
                                >
                                  Waive
                                </button>
                              </>
                            ) : null}
                            {row.tenantStatus === "active" ? (
                              <button
                                type="button"
                                className="text-xs text-amber-400 hover:text-amber-300 disabled:opacity-50"
                                disabled={submitting}
                                onClick={() => requestSuspend(row)}
                              >
                                Suspend
                              </button>
                            ) : row.tenantStatus === "suspended" ? (
                              <button
                                type="button"
                                className="text-xs text-emerald-400 hover:text-emerald-300 disabled:opacity-50"
                                disabled={submitting}
                                onClick={() => requestActivate(row)}
                              >
                                Unblock
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <PlatformModal
        open={createOpen}
        title="Create billing period"
        description="Issue a termly subscription invoice to a school."
        onClose={() => setCreateOpen(false)}
        size="wide"
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" className={platformBtnSecondary} onClick={() => setCreateOpen(false)}>
              Cancel
            </button>
            <button type="button" className={platformBtnPrimary} disabled={submitting} onClick={() => void createPeriod()}>
              Create invoice
            </button>
          </div>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={platformLabelClass} htmlFor="billing-tenant">
              School
            </label>
            <select
              id="billing-tenant"
              className={platformInputClass}
              value={createForm.tenantId}
              onChange={(e) => setCreateForm((f) => ({ ...f, tenantId: e.target.value }))}
            >
              <option value="">Select school…</option>
              {overview.map((t) => (
                <option key={t.tenantId} value={t.tenantId}>
                  {t.displayName} ({t.slug})
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={platformLabelClass} htmlFor="billing-label">
              Term label
            </label>
            <input
              id="billing-label"
              className={platformInputClass}
              placeholder="e.g. Term 1 2026"
              value={createForm.label}
              onChange={(e) => setCreateForm((f) => ({ ...f, label: e.target.value }))}
            />
          </div>
          <div>
            <label className={platformLabelClass} htmlFor="billing-start">
              Period start
            </label>
            <input
              id="billing-start"
              type="date"
              className={platformInputClass}
              value={createForm.periodStart}
              onChange={(e) => setCreateForm((f) => ({ ...f, periodStart: e.target.value }))}
            />
          </div>
          <div>
            <label className={platformLabelClass} htmlFor="billing-end">
              Period end
            </label>
            <input
              id="billing-end"
              type="date"
              className={platformInputClass}
              value={createForm.periodEnd}
              onChange={(e) => setCreateForm((f) => ({ ...f, periodEnd: e.target.value }))}
            />
          </div>
          <div>
            <label className={platformLabelClass} htmlFor="billing-due">
              Payment due
            </label>
            <input
              id="billing-due"
              type="datetime-local"
              className={platformInputClass}
              value={createForm.dueAt}
              onChange={(e) => setCreateForm((f) => ({ ...f, dueAt: e.target.value }))}
            />
          </div>
          <div>
            <label className={platformLabelClass} htmlFor="billing-amount">
              Amount (UGX, optional)
            </label>
            <input
              id="billing-amount"
              type="number"
              min={1}
              className={platformInputClass}
              placeholder={settings ? String(settings.defaultAmountUgx) : "500000"}
              value={createForm.amountUgx}
              onChange={(e) => setCreateForm((f) => ({ ...f, amountUgx: e.target.value }))}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={platformLabelClass} htmlFor="billing-notes">
              Notes (optional)
            </label>
            <textarea
              id="billing-notes"
              rows={2}
              className={platformInputClass}
              value={createForm.notes}
              onChange={(e) => setCreateForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>
        </div>
      </PlatformModal>

      <PlatformModal
        open={settingsOpen}
        title="Billing settings"
        description="Default subscription amount and grace period before access is blocked."
        onClose={() => setSettingsOpen(false)}
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" className={platformBtnSecondary} onClick={() => setSettingsOpen(false)}>
              Cancel
            </button>
            <button type="button" className={platformBtnPrimary} disabled={submitting} onClick={() => void saveSettings()}>
              Save settings
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className={platformLabelClass} htmlFor="settings-amount">
              Default amount (UGX)
            </label>
            <input
              id="settings-amount"
              type="number"
              min={1}
              className={platformInputClass}
              value={settingsForm.defaultAmountUgx}
              onChange={(e) =>
                setSettingsForm((s) => ({ ...s, defaultAmountUgx: Number(e.target.value) || 0 }))
              }
            />
          </div>
          <div>
            <label className={platformLabelClass} htmlFor="settings-grace">
              Grace days after due date
            </label>
            <input
              id="settings-grace"
              type="number"
              min={0}
              max={90}
              className={platformInputClass}
              value={settingsForm.graceDays}
              onChange={(e) =>
                setSettingsForm((s) => ({ ...s, graceDays: Number(e.target.value) || 0 }))
              }
            />
          </div>
          <div>
            <label className={platformLabelClass} htmlFor="settings-currency">
              Currency
            </label>
            <input
              id="settings-currency"
              maxLength={3}
              className={platformInputClass}
              value={settingsForm.currency}
              onChange={(e) =>
                setSettingsForm((s) => ({ ...s, currency: e.target.value.toUpperCase() }))
              }
            />
          </div>
        </div>
      </PlatformModal>

      <PlatformTenantActionConfirmDialog
        open={statusConfirm !== null}
        kind={statusConfirm?.kind ?? "suspend"}
        displayName={statusConfirm?.row.displayName ?? ""}
        slug={statusConfirm?.row.slug ?? ""}
        billingLocked={statusConfirm?.row.isLocked}
        openInvoiceLabel={statusConfirm?.row.billingPeriod?.label ?? null}
        loading={submitting}
        onConfirm={() => void confirmStatusChange()}
        onClose={() => {
          if (!submitting) setStatusConfirm(null);
        }}
      />
    </PlatformShell>
  );
}
