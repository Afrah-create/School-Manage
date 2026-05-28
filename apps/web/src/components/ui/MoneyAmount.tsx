import type { FormatUgxOptions } from "@/lib/formatMoney";
import { formatUgx, formatUgxFull } from "@/lib/formatMoney";

type MoneyTone = "default" | "positive" | "warning" | "muted";

const TONE_CLASS: Record<MoneyTone, string> = {
  default: "text-foreground",
  positive: "text-emerald-700 dark:text-emerald-400",
  warning: "text-amber-700 dark:text-amber-400",
  muted: "text-muted-foreground",
};

export function MoneyAmount({
  amount,
  compact,
  compactFrom,
  size = "md",
  tone = "default",
  showCurrency = true,
  className = "",
  title,
}: {
  amount: string | number | null | undefined;
  compact?: boolean;
  compactFrom?: number;
  size?: "sm" | "md" | "lg" | "hero";
  tone?: MoneyTone;
  /** Show "UGX" suffix (default true). */
  showCurrency?: boolean;
  className?: string;
  /** Override native title (defaults to full amount). */
  title?: string;
}) {
  const opts: FormatUgxOptions = { compact, compactFrom };
  const display = formatUgx(amount, opts);
  const full = formatUgxFull(amount);
  const useCompact = compact && display !== full;

  const sizeClass =
    size === "hero"
      ? "text-2xl font-semibold tracking-tight sm:text-3xl"
      : size === "lg"
        ? "text-xl font-semibold"
        : size === "sm"
          ? "text-sm font-medium"
          : "text-base font-semibold";

  return (
    <span
      className={`inline-flex max-w-full flex-wrap items-baseline gap-x-1 tabular-nums ${sizeClass} ${TONE_CLASS[tone]} ${className}`}
      title={title ?? (useCompact ? `${full} UGX` : undefined)}
    >
      <span className="break-all sm:break-normal">{display}</span>
      {showCurrency ? (
        <span
          className={`shrink-0 font-medium ${
            size === "hero" || size === "lg"
              ? "text-sm text-muted-foreground"
              : "text-xs text-muted-foreground"
          }`}
        >
          UGX
        </span>
      ) : null}
    </span>
  );
}
