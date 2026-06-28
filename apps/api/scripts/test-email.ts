/**
 * Manual Resend smoke test — not used in production.
 *
 * Usage (from repo root):
 *   TEST_EMAIL_TO=you@example.com tsx apps/api/scripts/test-email.ts
 *
 * Requires RESEND_API_KEY and EMAIL_FROM in root .env or apps/api/.env.
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { BRAND } from "@uganda-cbc-sms/brand";
import { sendEmail } from "../src/services/mail/resendClient.js";
import { renderEmailShell } from "../src/services/mail/templates/shell.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const TEST_TO = process.env.TEST_EMAIL_TO?.trim();

async function main() {
  if (!TEST_TO) {
    console.error("Set TEST_EMAIL_TO to the inbox that should receive the test message.");
    console.error("Example: TEST_EMAIL_TO=you@example.com tsx apps/api/scripts/test-email.ts");
    process.exit(1);
  }

  if (!process.env.RESEND_API_KEY?.trim()) {
    console.error("RESEND_API_KEY is not set in the environment.");
    process.exit(1);
  }

  if (!process.env.EMAIL_FROM?.trim()) {
    console.error("EMAIL_FROM is not set. Example: SchoolManage <noreply@yourdomain.com>");
    process.exit(1);
  }

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#475569;">
      This is a manual test message from the ${BRAND.productName} API mail service.
    </p>
    <p style="margin:0;font-size:14px;line-height:1.6;color:#475569;">
      If you received this, Resend is configured correctly.
    </p>`;

  const { html, text } = renderEmailShell({
    title: "Resend test email",
    bodyHtml,
  });

  console.log(`Sending test email to ${TEST_TO}…`);

  const result = await sendEmail({
    to: TEST_TO,
    subject: `${BRAND.productName} — Resend test`,
    html,
    text,
  });

  if (result.sent) {
    console.log("Success — message id:", result.id ?? "(no id returned)");
    process.exit(0);
  }

  if (result.skipped) {
    console.error("Send skipped:", result.error ?? "mail not configured");
    process.exit(1);
  }

  console.error("Send failed:", result.error ?? "unknown error");
  process.exit(1);
}

void main();
