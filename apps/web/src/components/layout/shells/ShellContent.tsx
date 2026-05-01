import { ReactNode } from "react";

export function ShellContent({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-0 flex-1 overflow-y-auto bg-muted/30 transition-ui">
      <div className="mx-auto w-full max-w-[var(--content-max-w)] space-y-6 px-6 py-6">{children}</div>
    </main>
  );
}
