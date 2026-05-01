"use client";

import { ReactNode, useState } from "react";
import { ShellContent } from "./ShellContent";
import { ShellHeader } from "./ShellHeader";
import { ShellSidebar } from "./ShellSidebar";
import type { RoleShellConfig } from "./types";

type Props = {
  config: RoleShellConfig;
  children: ReactNode;
};

export function AppShell({ config, children }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background transition-ui">
      <ShellSidebar config={config} />
      {mobileOpen ? (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden
        >
          <div
            className="h-full w-[var(--sidebar-width)] border-r border-sidebar-border bg-sidebar shadow-xl transition-ui"
            onClick={(e) => e.stopPropagation()}
          >
            <ShellSidebar config={config} mobile />
          </div>
        </div>
      ) : null}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <ShellHeader config={config} onToggleMobileNav={() => setMobileOpen((v) => !v)} />
        <ShellContent>{children}</ShellContent>
      </div>
    </div>
  );
}
