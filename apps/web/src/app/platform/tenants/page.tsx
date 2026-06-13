"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, Building2, PauseCircle, Plus, ShieldCheck } from "lucide-react";
import { TENANT_FEATURE_FLAG_KEYS } from "@uganda-cbc-sms/shared";
import { PLATFORM_TOKEN_KEY, platformApi, setPlatformToken } from "@/lib/platformApi";
import { schoolLoginUrl } from "@/lib/tenantHost";
import { toast } from "@/lib/toast";
import { AuditLogPanel } from "@/components/platform/AuditLogPanel";
import {
  CreateTenantForm,
  CREATE_TENANT_FORM_ID,
  type CreateTenantFormState,
} from "@/components/platform/CreateTenantForm";
import {
  EditTenantForm,
  EDIT_TENANT_FORM_ID,
  type EditTenantFormState,
} from "@/components/platform/EditTenantPanel";
import { PlatformModal } from "@/components/platform/PlatformModal";
import { PlatformShell } from "@/components/platform/PlatformShell";
import { PlatformStatCard } from "@/components/platform/PlatformStatCard";
import { TenantsTable } from "@/components/platform/TenantsTable";
import { platformApiError } from "@/components/platform/platformUtils";
import {
  platformBtnPrimary,
  platformBtnSecondary,
} from "@/components/platform/platformFieldStyles";
import type { PlatformAuditEntry, PlatformTenant } from "@/components/platform/types";
import type { TenantCredentials } from "@uganda-cbc-sms/shared";
import { SchoolCredentialsModal } from "@/components/platform/SchoolCredentialsModal";
import { PlatformTenantActionConfirmDialog } from "@/components/platform/PlatformTenantActionConfirmDialog";

const EMPTY_CREATE: CreateTenantFormState = {
  slug: "",
  displayName: "",
  adminEmail: "",
  adminFullName: "",
};

export default function PlatformTenantsPage() {
  const router = useRouter();
  const [tenants, setTenants] = useState<PlatformTenant[]>([]);
  const [audit, setAudit] = useState<PlatformAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<PlatformTenant | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditTenantFormState>({
    displayName: "",
    status: "active",
    featureFlags: {},
  });
  const [form, setForm] = useState<CreateTenantFormState>(EMPTY_CREATE);
  const [provisionedCredentials, setProvisionedCredentials] = useState<TenantCredentials | null>(
    null,
  );
  const [statusConfirm, setStatusConfirm] = useState<{
    kind: "suspend" | "activate";
    tenant: PlatformTenant;
  } | null>(null);

  const stats = useMemo(() => {
    const active = tenants.filter((t) => t.status === "active").length;
    const suspended = tenants.filter((t) => t.status === "suspended").length;
    return { total: tenants.length, active, suspended };
  }, [tenants]);

  const load = useCallback(async () => {
    try {
      const [tRes, aRes] = await Promise.all([
        platformApi.get("/tenants"),
        platformApi.get("/audit-log"),
      ]);
      setTenants(tRes.data?.data ?? []);
      setAudit(aRes.data?.data ?? []);
    } catch {
      toast.error("Your session may have expired. Please sign in again.", "Could not load schools");
      setPlatformToken(null);
      router.replace("/platform/login");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_CREATE);
    setCreateOpen(true);
  }

  function closeCreate() {
    if (submitting) return;
    setCreateOpen(false);
    setForm(EMPTY_CREATE);
  }

  function closeEdit() {
    if (submitting) return;
    setEditing(null);
  }

  async function createTenant(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const displayName = form.displayName;
    const slug = form.slug;
    try {
      const res = await platformApi.post("/tenants", {
        slug: form.slug,
        displayName: form.displayName,
        adminEmail: form.adminEmail,
        adminFullName: form.adminFullName || undefined,
      });
      const created = res.data?.data as { credentials?: TenantCredentials } | undefined;
      setCreateOpen(false);
      setForm(EMPTY_CREATE);
      if (created?.credentials) {
        setProvisionedCredentials(created.credentials);
      }
      toast.success(`${displayName} is ready. Copy the admin credentials to share.`, "School created");
      await load();
    } catch (err: unknown) {
      toast.error(platformApiError(err) ?? "Please check the form and try again.", "Could not create school");
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(t: PlatformTenant) {
    setCreateOpen(false);
    setEditing(t);
    const flags: Record<string, boolean> = {};
    for (const key of TENANT_FEATURE_FLAG_KEYS) {
      flags[key] = t.featureFlags[key] !== false;
    }
    setEditForm({
      displayName: t.displayName,
      status: t.status as EditTenantFormState["status"],
      featureFlags: flags,
    });
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSubmitting(true);
    try {
      await platformApi.patch(`/tenants/${editing.id}`, {
        displayName: editForm.displayName,
        status: editForm.status,
        featureFlags: editForm.featureFlags,
      });
      const name = editForm.displayName;
      setEditing(null);
      toast.success(`Changes to ${name} have been saved.`, "School updated");
      await load();
    } catch (err: unknown) {
      toast.error(platformApiError(err) ?? "Please check the form and try again.", "Could not update school");
    } finally {
      setSubmitting(false);
    }
  }

  async function copyLoginUrl(slug: string) {
    try {
      await navigator.clipboard.writeText(schoolLoginUrl(slug));
      toast.success("Staff sign-in URL copied to your clipboard.", "Copied");
    } catch {
      toast.error("Allow clipboard access or copy the URL manually.", "Copy failed");
    }
  }

  function requestSuspend(t: PlatformTenant) {
    setStatusConfirm({ kind: "suspend", tenant: t });
  }

  function requestActivate(t: PlatformTenant) {
    setStatusConfirm({ kind: "activate", tenant: t });
  }

  async function confirmStatusChange() {
    if (!statusConfirm) return;
    const { kind, tenant } = statusConfirm;
    setActionBusyId(tenant.id);
    try {
      if (kind === "suspend") {
        await platformApi.post(`/tenants/${tenant.id}/suspend`);
        toast.success(`${tenant.displayName} has been suspended.`, "School suspended");
      } else {
        await platformApi.post(`/tenants/${tenant.id}/activate`);
        toast.success(`${tenant.displayName} is active again.`, "School reactivated");
      }
      setStatusConfirm(null);
      await load();
    } catch (err: unknown) {
      toast.error(
        platformApiError(err) ?? "Something went wrong.",
        kind === "suspend" ? "Could not suspend" : "Could not reactivate",
      );
    } finally {
      setActionBusyId(null);
    }
  }

  return (
    <PlatformShell
      title="School tenants"
      subtitle="Provision schools, manage modules, and open staff sign-in."
    >
      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <PlatformStatCard
          label="Total schools"
          value={loading ? "—" : stats.total}
          icon={Building2}
          accent="violet"
        />
        <PlatformStatCard
          label="Active"
          value={loading ? "—" : stats.active}
          icon={ShieldCheck}
          accent="emerald"
        />
        <PlatformStatCard
          label="Suspended"
          value={loading ? "—" : stats.suspended}
          icon={PauseCircle}
          accent="amber"
        />
        <PlatformStatCard
          label="Audit events"
          value={loading ? "—" : audit.length}
          hint="Recent log entries"
          icon={Activity}
          accent="sky"
        />
      </div>

      <section className="mb-10">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-heading text-lg font-semibold text-white">All schools</h2>
            <p className="text-sm text-slate-400">
              Each school has its own subdomain and isolated data.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-violet-900/25 transition hover:from-violet-500 hover:to-indigo-500"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Add school
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-2xl border border-slate-800 bg-slate-900/50"
              />
            ))}
          </div>
        ) : (
          <TenantsTable
            tenants={tenants}
            onEdit={startEdit}
            onCopyUrl={copyLoginUrl}
            onSuspend={requestSuspend}
            onActivate={requestActivate}
            actionBusyId={actionBusyId}
          />
        )}
      </section>

      {!loading ? <AuditLogPanel entries={audit} /> : null}

      <PlatformModal
        open={createOpen}
        title="Add school"
        description="Creates a new tenant, subdomain, and first administrator account."
        onClose={closeCreate}
        footer={
          <>
            <button type="button" onClick={closeCreate} disabled={submitting} className={platformBtnSecondary}>
              Cancel
            </button>
            <button
              type="submit"
              form={CREATE_TENANT_FORM_ID}
              disabled={submitting}
              className={platformBtnPrimary}
            >
              {submitting ? "Creating…" : "Create school"}
            </button>
          </>
        }
      >
        <CreateTenantForm form={form} onChange={setForm} onSubmit={createTenant} />
      </PlatformModal>

      <PlatformModal
        open={editing !== null}
        title="Edit school"
        description={editing ? `Manage settings for ${editing.displayName}` : undefined}
        onClose={closeEdit}
        size="wide"
        footer={
          <>
            <button type="button" onClick={closeEdit} disabled={submitting} className={platformBtnSecondary}>
              Cancel
            </button>
            <button
              type="submit"
              form={EDIT_TENANT_FORM_ID}
              disabled={submitting}
              className={platformBtnPrimary}
            >
              {submitting ? "Saving…" : "Save changes"}
            </button>
          </>
        }
      >
        {editing ? (
          <EditTenantForm
            tenant={editing}
            form={editForm}
            onChange={setEditForm}
            onSubmit={saveEdit}
          />
        ) : null}
      </PlatformModal>

      <SchoolCredentialsModal
        open={provisionedCredentials !== null}
        credentials={provisionedCredentials}
        onClose={() => setProvisionedCredentials(null)}
      />

      <PlatformTenantActionConfirmDialog
        open={statusConfirm !== null}
        kind={statusConfirm?.kind ?? "suspend"}
        displayName={statusConfirm?.tenant.displayName ?? ""}
        slug={statusConfirm?.tenant.slug ?? ""}
        loading={actionBusyId !== null}
        onConfirm={() => void confirmStatusChange()}
        onClose={() => {
          if (actionBusyId === null) setStatusConfirm(null);
        }}
      />
    </PlatformShell>
  );
}
