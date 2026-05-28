/**
 * Uganda shilling (UGX) formatting — whole shillings only, grouped digits.
 * Supports large aggregates (12+ digits) via compact notation in tight UI.
 */

const UGX_STANDARD = new Intl.NumberFormat("en-UG", {
  maximumFractionDigits: 0,
  useGrouping: true,
});

const UGX_COMPACT = new Intl.NumberFormat("en-UG", {
  notation: "compact",
  compactDisplay: "short",
  maximumFractionDigits: 2,
});

/** Parse API decimal strings and numbers without losing integer precision for typical school totals. */
export function parseMoneyAmount(amount: string | number | null | undefined): number {
  if (amount == null || amount === "") return 0;
  if (typeof amount === "number") return Number.isFinite(amount) ? amount : 0;
  const cleaned = String(amount).trim().replace(/,/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

export type FormatUgxOptions = {
  /** Use 1.2B-style notation from 1 million UGX upward (good for KPI tiles). */
  compact?: boolean;
  /** Threshold for compact mode (default 1_000_000). */
  compactFrom?: number;
};

/** Formatted amount without currency suffix, e.g. "12,345,678,900" or "12.35B". */
export function formatUgx(amount: string | number | null | undefined, options?: FormatUgxOptions): string {
  const n = Math.round(parseMoneyAmount(amount));
  const compactFrom = options?.compactFrom ?? 1_000_000;
  if (options?.compact && Math.abs(n) >= compactFrom) {
    return UGX_COMPACT.format(n);
  }
  return UGX_STANDARD.format(n);
}

/** Full grouped amount (never compact) — use in tables and tooltips. */
export function formatUgxFull(amount: string | number | null | undefined): string {
  return UGX_STANDARD.format(Math.round(parseMoneyAmount(amount)));
}

export function formatUgxWithSuffix(
  amount: string | number | null | undefined,
  options?: FormatUgxOptions,
): string {
  return `${formatUgx(amount, options)} UGX`;
}

export function formatUgxFullWithSuffix(amount: string | number | null | undefined): string {
  return `${formatUgxFull(amount)} UGX`;
}

export function paymentMethodLabel(method: string | null | undefined): string {
  if (method === "mobile_money") return "Mobile money";
  if (method === "cash") return "Cash";
  return method ?? "—";
}
