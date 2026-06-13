"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Building2, CreditCard, LogOut } from "lucide-react";
import { PLATFORM_TOKEN_KEY, setPlatformToken } from "@/lib/platformApi";
import { clearPlatformSessionCookie } from "@/lib/platformSession";

const NAV = [
  { href: "/platform/tenants", label: "Schools", icon: Building2 },
  { href: "/platform/billing", label: "Billing", icon: CreditCard },
] as const;

export function PlatformShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  function signOut() {
    setPlatformToken(null);
    clearPlatformSessionCookie();
    router.push("/platform/login");
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-800/80 bg-slate-900/95 backdrop-blur-md lg:flex">
        <div className="shrink-0 border-b border-slate-800/80 px-5 py-5">
          <Link href="/platform/tenants" className="flex items-center gap-3">
            <Image
              src="/images/Logo.jpeg"
              alt="SlimCyberTech"
              width={36}
              height={36}
              className="h-9 w-9 rounded-lg object-cover ring-1 ring-white/10"
            />
            <div>
              <p className="font-heading text-sm font-semibold text-white">SlimCyberTech</p>
              <p className="text-xs text-violet-300/90">Platform</p>
            </div>
          </Link>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? "bg-violet-500/15 text-violet-100 ring-1 ring-violet-500/30"
                    : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-100"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="shrink-0 border-t border-slate-800/80 p-3">
          <button
            type="button"
            onClick={signOut}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-400 transition hover:bg-slate-800/50 hover:text-white"
          >
            <LogOut className="h-4 w-4" aria-hidden />
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <header className="shrink-0 border-b border-slate-800/80 bg-slate-950/90 px-4 py-4 backdrop-blur-md sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h1 className="font-heading truncate text-xl font-semibold text-white sm:text-2xl">
                {title}
              </h1>
              {subtitle ? (
                <p className="mt-0.5 truncate text-sm text-slate-400">{subtitle}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={signOut}
              className="shrink-0 rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 transition hover:border-slate-600 hover:bg-slate-800 hover:text-white lg:hidden"
            >
              Sign out
            </button>
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
