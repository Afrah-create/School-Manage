import type { Role } from "@uganda-cbc-sms/shared";

export function billingPageForRole(role: Role): string | null {
  if (role === "admin") return "/admin/billing";
  if (role === "headteacher") return "/headteacher/billing";
  return null;
}

export function canPaySubscription(role: Role): boolean {
  return role === "admin" || role === "headteacher";
}
