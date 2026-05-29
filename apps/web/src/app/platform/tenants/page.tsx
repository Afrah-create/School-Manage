"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TENANT_FEATURE_FLAG_KEYS } from "@uganda-cbc-sms/shared";
import { PLATFORM_TOKEN_KEY, platformApi, setPlatformToken } from "@/lib/platformApi";
import { schoolLoginUrl } from "@/lib/tenantHost";

type Tenant = {
  id: string;
  slug: string;
  displayName: string;
  status: string;
  subdomain: string;
  schoolName: string | null;
  featureFlags: Record<string, boolean>;
  createdAt: string;
};

type AuditEntry = {
  id: string;
  action: string;
  tenantId: string | null;
  actorEmail: string | null;
  createdAt: string;
};

export default function PlatformTenantsPage() {
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Tenant | null>(null);
  const [editForm, setEditForm] = useState({
    displayName: "",
    status: "active" as "active" | "suspended" | "provisioning",
    featureFlags: {} as Record<string, boolean>,
  });
  const [form, setForm] = useState({
    slug: "",
    displayName: "",
    adminEmail: "",
    adminPassword: "",
    adminFullName: "",
  });

  const load = useCallback(async () => {
    try {
      const [tRes, aRes] = await Promise.all([
        platformApi.get("/tenants"),
        platformApi.get("/audit-log"),
      ]);
      setTenants(tRes.data?.data ?? []);
      setAudit(aRes.data?.data ?? []);
      setError(null);
    } catch {
      setError("Could not load tenants. Sign in again.");
      setPlatformToken(null);
      router.replace("/platform/login");
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function createTenant(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await platformApi.post("/tenants", {
        slug: form.slug,
        displayName: form.displayName,
        adminEmail: form.adminEmail,
        adminPassword: form.adminPassword,
        adminFullName: form.adminFullName || undefined,
      });
      setShowForm(false);
      setForm({
        slug: "",
        displayName: "",
        adminEmail: "",
        adminPassword: "",
        adminFullName: "",
      });
      await load();
    } catch (err: unknown) {
      setError(apiError(err) ?? "Create failed");
    }
  }

  function startEdit(t: Tenant) {
    setEditing(t);
    const flags: Record<string, boolean> = {};
    for (const key of TENANT_FEATURE_FLAG_KEYS) {
      flags[key] = t.featureFlags[key] !== false;
    }
    setEditForm({
      displayName: t.displayName,
      status: t.status as "active" | "suspended" | "provisioning",
      featureFlags: flags,
    });
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setError(null);
    try {
      await platformApi.patch(`/tenants/${editing.id}`, {
        displayName: editForm.displayName,
        status: editForm.status,
        featureFlags: editForm.featureFlags,
      });
      setEditing(null);
      await load();
    } catch (err: unknown) {
      setError(apiError(err) ?? "Update failed");
    }
  }

  function copyLoginUrl(slug: string) {
    const url = schoolLoginUrl(slug);
    void navigator.clipboard.writeText(url);
  }

  function signOut() {
    setPlatformToken(null);
    document.cookie = `${PLATFORM_TOKEN_KEY}=; path=/; max-age=0`;
    router.push("/platform/login");
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
        <h1 className="text-lg font-semibold">School tenants</h1>
        <button type="button" onClick={signOut} className="text-sm text-slate-400 hover:text-white">
          Sign out
        </button>
      </header>
      <main className="mx-auto max-w-5xl space-y-8 px-6 py-8">
        {error ? (
          <p className="rounded-md bg-red-950/50 px-3 py-2 text-sm text-red-300">{error}</p>
        ) : null}

        <section>
          <div className="mb-4 flex justify-end">
            <button
              type="button"
              onClick={() => {
                setShowForm((v) => !v);
                setEditing(null);
              }}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500"
            >
              {showForm ? "Cancel" : "Add school"}
            </button>
          </div>
          {showForm ? (
            <form
              onSubmit={createTenant}
              className="mb-6 grid gap-3 rounded-xl border border-slate-800 bg-slate-900 p-6 sm:grid-cols-2"
            >
              <label className="text-sm">
                Slug (subdomain)
                <input
                  required
                  pattern="[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?"
                  className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase() })}
                />
              </label>
              <label className="text-sm">
                School name
                <input
                  required
                  className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2"
                  value={form.displayName}
                  onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                />
              </label>
              <label className="text-sm">
                Admin email
                <input
                  type="email"
                  required
                  className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2"
                  value={form.adminEmail}
                  onChange={(e) => setForm({ ...form, adminEmail: e.target.value })}
                />
              </label>
              <label className="text-sm">
                Admin password
                <input
                  type="password"
                  required
                  minLength={8}
                  className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2"
                  value={form.adminPassword}
                  onChange={(e) => setForm({ ...form, adminPassword: e.target.value })}
                />
              </label>
              <button
                type="submit"
                className="sm:col-span-2 rounded-md bg-emerald-600 py-2 text-sm font-medium hover:bg-emerald-500"
              >
                Create school
              </button>
            </form>
          ) : null}

          {editing ? (
            <form
              onSubmit={saveEdit}
              className="mb-6 space-y-4 rounded-xl border border-blue-900/50 bg-slate-900 p-6"
            >
              <h2 className="font-medium">Edit {editing.slug}</h2>
              <label className="block text-sm">
                Display name
                <input
                  required
                  className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2"
                  value={editForm.displayName}
                  onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                />
              </label>
              <label className="block text-sm">
                Status
                <select
                  className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2"
                  value={editForm.status}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      status: e.target.value as typeof editForm.status,
                    })
                  }
                >
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="provisioning">Provisioning</option>
                </select>
              </label>
              <fieldset className="text-sm">
                <legend className="mb-2 font-medium">Modules</legend>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {TENANT_FEATURE_FLAG_KEYS.map((key) => (
                    <label key={key} className="flex items-center gap-2 capitalize">
                      <input
                        type="checkbox"
                        checked={editForm.featureFlags[key] !== false}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            featureFlags: {
                              ...editForm.featureFlags,
                              [key]: e.target.checked,
                            },
                          })
                        }
                      />
                      {key}
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm hover:bg-blue-500"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="rounded-md border border-slate-700 px-4 py-2 text-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : null}

          <div className="overflow-hidden rounded-xl border border-slate-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-900 text-slate-400">
                <tr>
                  <th className="px-4 py-3">School</th>
                  <th className="px-4 py-3">Slug</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((t) => (
                  <tr key={t.id} className="border-t border-slate-800">
                    <td className="px-4 py-3">{t.displayName}</td>
                    <td className="px-4 py-3 font-mono text-xs">{t.slug}</td>
                    <td className="px-4 py-3 capitalize">{t.status}</td>
                    <td className="px-4 py-3 space-x-2">
                      <button
                        type="button"
                        onClick={() => startEdit(t)}
                        className="text-blue-400 hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => copyLoginUrl(t.slug)}
                        className="text-slate-400 hover:underline"
                      >
                        Copy URL
                      </button>
                      <a
                        href={schoolLoginUrl(t.slug)}
                        className="text-blue-400 hover:underline"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-medium text-slate-400">Recent platform activity</h2>
          <ul className="space-y-2 rounded-xl border border-slate-800 bg-slate-900 p-4 text-sm">
            {audit.length === 0 ? (
              <li className="text-slate-500">No audit entries yet.</li>
            ) : (
              audit.map((a) => (
                <li key={a.id} className="flex flex-wrap justify-between gap-2 border-b border-slate-800 py-2 last:border-0">
                  <span>
                    <span className="font-mono text-xs text-blue-300">{a.action}</span>
                    {a.actorEmail ? ` · ${a.actorEmail}` : ""}
                  </span>
                  <span className="text-slate-500">{new Date(a.createdAt).toLocaleString()}</span>
                </li>
              ))
            )}
          </ul>
        </section>
      </main>
    </div>
  );
}

function apiError(err: unknown): string | null {
  if (err && typeof err === "object" && "response" in err) {
    const data = (err as { response?: { data?: { error?: string } } }).response?.data;
    return typeof data?.error === "string" ? data.error : null;
  }
  return null;
}
