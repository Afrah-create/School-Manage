import { markOverdueBillingPeriods } from "./billing.service.js";

const INTERVAL_MS = 60 * 60 * 1000;

let timer: ReturnType<typeof setInterval> | null = null;

async function runOverdueJob(): Promise<void> {
  try {
    const updated = await markOverdueBillingPeriods();
    if (updated > 0) {
      console.log(`[billing] Marked ${updated} period(s) overdue.`);
    }
  } catch (e) {
    console.error("[billing] Overdue job failed:", e);
  }
}

/** Periodically mark billing periods past grace as overdue (locks unpaid schools). */
export function startBillingScheduler(): void {
  if (timer) return;
  void runOverdueJob();
  timer = setInterval(() => void runOverdueJob(), INTERVAL_MS);
  timer.unref?.();
}
