import type { ReactNode } from "react";

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning";
}) {
  const cls =
    tone === "success"
      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
      : tone === "warning"
        ? "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200"
        : "bg-muted text-muted-foreground dark:bg-muted dark:text-muted-foreground";
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium leading-none ${cls}`}>
      {children}
    </span>
  );
}
