"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import { LogOut } from "lucide-react";
import { useAuthStore } from "@/store/authStore";

export function BillingPaywallShell({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const logoutRemote = useAuthStore((s) => s.logoutRemote);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/80 px-4 py-4 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Image
              src="/images/Logo.jpeg"
              alt="SchoolManage"
              width={36}
              height={36}
              className="h-9 w-9 rounded-lg object-cover"
            />
            <div>
              <p className="font-heading text-sm font-semibold text-foreground">SchoolManage</p>
              {user ? (
                <p className="text-xs text-muted-foreground">{user.fullName}</p>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            onClick={() => void logoutRemote()}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
