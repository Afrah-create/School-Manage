import { Resend } from "resend";
import { loadEnv } from "../../config/env.js";
import { getResolvedFromOverride } from "./verifyMailConfig.js";

export type SendEmailInput = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
};

export type SendEmailResult = {
  sent: boolean;
  skipped?: boolean;
  id?: string;
  error?: string;
};

let client: Resend | null | undefined;
let warnedMissingKey = false;
let warnedMissingFrom = false;

function getResendClient(): Resend | null {
  if (client !== undefined) return client;

  const apiKey = loadEnv().RESEND_API_KEY?.trim() ?? process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    if (!warnedMissingKey) {
      warnedMissingKey = true;
      console.warn(
        "[mail] RESEND_API_KEY not set — outbound email is disabled. Set it in .env to enable Resend.",
      );
    }
    client = null;
    return null;
  }

  client = new Resend(apiKey);
  return client;
}

function getEmailFrom(): string | null {
  const override = getResolvedFromOverride();
  if (override) return override;

  const from = loadEnv().EMAIL_FROM?.trim() ?? process.env.EMAIL_FROM?.trim();
  if (!from) {
    if (!warnedMissingFrom) {
      warnedMissingFrom = true;
      console.warn(
        '[mail] EMAIL_FROM not set — outbound email is disabled. Example: SchoolManage <noreply@yourdomain.com>',
      );
    }
    return null;
  }
  return from;
}

/**
 * Sends email via Resend. Never throws — logs failures and returns `{ sent: false }`
 * so callers (e.g. password reset) can stay enumeration-safe and avoid 500s on mail errors.
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const resend = getResendClient();
  const from = getEmailFrom();
  if (!resend) {
    return { sent: false, skipped: true, error: "RESEND_API_KEY not configured" };
  }

  if (!from) {
    return { sent: false, skipped: true, error: "EMAIL_FROM not configured" };
  }

  const to = Array.isArray(input.to) ? input.to : [input.to];
  if (to.length === 0 || to.every((addr) => !addr.trim())) {
    console.warn("[mail] sendEmail called with no recipients — skipping.");
    return { sent: false, skipped: true, error: "No recipients" };
  }

  try {
    const { data, error } = await resend.emails.send({
      from,
      to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });

    if (error) {
      console.error("[mail] Resend API error:", error.message ?? error);
      return { sent: false, error: error.message ?? "Resend send failed" };
    }

    return { sent: true, id: data?.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[mail] Unexpected send failure:", message);
    return { sent: false, error: message };
  }
}
