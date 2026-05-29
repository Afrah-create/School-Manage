"use client";

import { Activity } from "lucide-react";
import type { PlatformAuditEntry } from "./types";
import { formatAuditAction } from "./platformUtils";
import { platformCardClass } from "./platformFieldStyles";

export function AuditLogPanel({ entries }: { entries: PlatformAuditEntry[] }) {
  return (
    <section className={platformCardClass}>
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/15 text-sky-300">
          <Activity className="h-5 w-5" aria-hidden />
        </div>
        <div>
          <h2 className="font-heading text-lg font-semibold text-white">Recent activity</h2>
          <p className="text-sm text-slate-400">Platform audit trail</p>
        </div>
      </div>
      {entries.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-700 px-4 py-8 text-center text-sm text-slate-500">
          No platform actions recorded yet.
        </p>
      ) : (
        <ul className="space-y-0 divide-y divide-slate-800/80">
          {entries.map((a) => (
            <li key={a.id} className="flex flex-wrap items-start justify-between gap-3 py-3.5 first:pt-0">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-200">{formatAuditAction(a.action)}</p>
                {a.actorEmail ? (
                  <p className="mt-0.5 text-xs text-slate-500">{a.actorEmail}</p>
                ) : null}
              </div>
              <time className="shrink-0 text-xs text-slate-500" dateTime={a.createdAt}>
                {new Date(a.createdAt).toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </time>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
