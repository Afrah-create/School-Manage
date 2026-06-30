import { loadEnv } from "../../config/env.js";

export type ResendDomainStatus = { name: string; status: string };

/** Parse domain from `Name <user@domain.com>` or `user@domain.com`. */
export function domainFromEmailFrom(from: string): string | null {
  const trimmed = from.trim();
  const angle = trimmed.match(/<([^>]+)>/);
  const addr = (angle ? angle[1] : trimmed).trim();
  const at = addr.lastIndexOf("@");
  if (at < 0) return null;
  return addr.slice(at + 1).toLowerCase();
}

export function domainIsVerifiedForFrom(fromDomain: string, verified: string[]): boolean {
  const d = fromDomain.toLowerCase();
  return verified.some((v) => {
    const root = v.toLowerCase();
    return d === root || d.endsWith(`.${root}`);
  });
}

/** Keep display name / local-part; swap @domain (e.g. apex → verified subdomain). */
export function rewriteEmailFromDomain(from: string, newDomain: string): string {
  const trimmed = from.trim();
  const angle = trimmed.match(/^(.+?)<([^>]+)>$/);
  if (angle) {
    const local = angle[2]!.trim().split("@")[0] ?? "noreply";
    return `${angle[1]!.trim()}<${local}@${newDomain}>`;
  }
  const local = trimmed.split("@")[0] ?? "noreply";
  return `${local}@${newDomain}`;
}

/** When apex is in EMAIL_FROM but only a subdomain is verified (e.g. schoolmanage.example.com). */
export function pickVerifiedSubdomainForFrom(fromDomain: string, verified: string[]): string | null {
  const d = fromDomain.toLowerCase();
  const children = verified
    .map((v) => v.toLowerCase())
    .filter((v) => v !== d && v.endsWith(`.${d}`));
  if (children.length === 1) return children[0]!;
  return null;
}

let devFromOverride: string | null = null;
let resolvedFromOverride: string | null = null;

/** Resolved From address (dev fallback or verified-subdomain remap). */
export function getResolvedFromOverride(): string | null {
  return resolvedFromOverride ?? devFromOverride;
}

export async function verifyMailConfigAtStartup(): Promise<void> {
  const env = loadEnv();
  const apiKey = env.RESEND_API_KEY?.trim();
  const from = env.EMAIL_FROM?.trim();
  if (!apiKey || !from) {
    console.warn(
      "[mail] Outbound email disabled — set RESEND_API_KEY and EMAIL_FROM in .env (see apps/api/.env.example).",
    );
    return;
  }

  const fromDomain = domainFromEmailFrom(from);
  if (!fromDomain) {
    console.error(`[mail] EMAIL_FROM is not a valid address: ${from}`);
    return;
  }

  let verified: string[] = [];
  let allDomains: ResendDomainStatus[] = [];

  try {
    const res = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const body = (await res.json()) as { data?: ResendDomainStatus[]; message?: string };
    if (!res.ok) {
      console.error("[mail] Resend domains API error:", body.message ?? res.statusText);
      return;
    }
    allDomains = body.data ?? [];
    verified = allDomains.filter((d) => d.status === "verified").map((d) => d.name);
  } catch (err) {
    console.warn("[mail] Could not reach Resend to verify domains:", err instanceof Error ? err.message : err);
    return;
  }

  if (domainIsVerifiedForFrom(fromDomain, verified)) {
    console.log(`[mail] EMAIL_FROM domain verified: ${fromDomain}`);
    return;
  }

  const explicitDomain =
    process.env.RESEND_FROM_DOMAIN?.trim() ?? process.env.EMAIL_FROM_DOMAIN?.trim();
  if (explicitDomain && domainIsVerifiedForFrom(explicitDomain, verified)) {
    resolvedFromOverride = rewriteEmailFromDomain(from, explicitDomain);
    console.warn(
      `[mail] EMAIL_FROM remapped to verified domain @${explicitDomain} → ${resolvedFromOverride}`,
    );
    return;
  }

  const subdomain = pickVerifiedSubdomainForFrom(fromDomain, verified);
  if (subdomain) {
    resolvedFromOverride = rewriteEmailFromDomain(from, subdomain);
    console.warn(
      `[mail] EMAIL_FROM @${fromDomain} auto-remapped to verified subdomain @${subdomain}`,
    );
    return;
  }

  const devFallback =
    env.NODE_ENV === "development" ? process.env.RESEND_DEV_FROM?.trim() : undefined;

  console.error(
    `[mail] EMAIL_FROM uses @${fromDomain} but this RESEND_API_KEY has verified domains: ` +
      `${verified.length ? verified.join(", ") : "(none)"}. ` +
      `Use EMAIL_FROM with a verified domain on the same Resend account as RESEND_API_KEY, ` +
      `or complete verification at https://resend.com/domains`,
  );

  if (devFallback) {
    const fallbackDomain = domainFromEmailFrom(devFallback);
    if (fallbackDomain === "resend.dev") {
      devFromOverride = devFallback;
      console.warn(
        `[mail] Development: using Resend sandbox sender ${devFallback} (delivers only to your Resend account email).`,
      );
      return;
    }
    if (fallbackDomain && domainIsVerifiedForFrom(fallbackDomain, verified)) {
      devFromOverride = devFallback;
      console.warn(`[mail] Development: using RESEND_DEV_FROM=${devFallback}`);
    }
  }
}
