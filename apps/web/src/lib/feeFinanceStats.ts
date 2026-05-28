import type { FeeInvoice, FeePayment } from "@uganda-cbc-sms/shared";

export type InvoiceBucket = "all" | "active" | "paid" | "arrears" | "partial";

export type InvoiceFinanceStats = {
  total: number;
  active: number;
  paid: number;
  arrears: number;
  partial: number;
  outstandingUgx: number;
  collectedOnInvoicesUgx: number;
  billedUgx: number;
};

export function computeInvoiceStats(rows: FeeInvoice[]): InvoiceFinanceStats {
  let active = 0;
  let paid = 0;
  let arrears = 0;
  let partial = 0;
  let outstandingUgx = 0;
  let collectedOnInvoicesUgx = 0;
  let billedUgx = 0;

  for (const r of rows) {
    const balance = Number(r.balance);
    const paidAmt = Number(r.amountPaid);
    const billed = Number(r.totalAmount);
    billedUgx += billed;
    collectedOnInvoicesUgx += paidAmt;
    outstandingUgx += balance;

    if (balance <= 0) paid += 1;
    else {
      active += 1;
      if (paidAmt > 0) partial += 1;
      if (r.isFlagged) arrears += 1;
    }
  }

  return {
    total: rows.length,
    active,
    paid,
    arrears,
    partial,
    outstandingUgx,
    collectedOnInvoicesUgx,
    billedUgx,
  };
}

export function filterInvoices(
  rows: FeeInvoice[],
  opts: {
    bucket?: InvoiceBucket;
    search?: string;
    termId?: string;
  },
): FeeInvoice[] {
  const q = opts.search?.trim().toLowerCase() ?? "";
  return rows.filter((r) => {
    if (opts.termId && r.termId !== opts.termId) return false;
    const balance = Number(r.balance);
    const paidAmt = Number(r.amountPaid);
    switch (opts.bucket) {
      case "active":
        if (balance <= 0) return false;
        break;
      case "paid":
        if (balance > 0) return false;
        break;
      case "arrears":
        if (!(r.isFlagged && balance > 0)) return false;
        break;
      case "partial":
        if (!(balance > 0 && paidAmt > 0)) return false;
        break;
      default:
        break;
    }
    if (!q) return true;
    const hay = [r.studentName, r.studentNumber, r.termLabel, r.yearName]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });
}

export function uniqueInvoiceTerms(rows: FeeInvoice[]): { termId: string; label: string }[] {
  const seen = new Map<string, string>();
  for (const r of rows) {
    if (!r.termId) continue;
    const label = [r.termLabel, r.yearName].filter(Boolean).join(" · ") || "Term";
    if (!seen.has(r.termId)) seen.set(r.termId, label);
  }
  return [...seen.entries()].map(([termId, label]) => ({ termId, label }));
}

export function recentPayments(rows: FeePayment[], limit = 8): FeePayment[] {
  return [...rows].sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime()).slice(0, limit);
}
