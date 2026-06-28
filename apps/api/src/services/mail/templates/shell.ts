import { BRAND, COLORS } from "@uganda-cbc-sms/brand";
import { loadEnv } from "../../../config/env.js";

const brandGreen = COLORS.primary.DEFAULT;
const brandGreenDark = COLORS.primary.dark;
const accentBlue = COLORS.accent.DEFAULT;
const textColor = COLORS.neutral[900];
const muted = COLORS.neutral[600];
const border = COLORS.neutral[200];
const surface = COLORS.neutral[50];

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function htmlToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function webAppUrl(): string {
  try {
    return loadEnv().WEB_APP_URL?.trim() || "http://localhost:3000";
  } catch {
    return process.env.WEB_APP_URL?.trim() || "http://localhost:3000";
  }
}

export function renderEmailShell({
  title,
  bodyHtml,
}: {
  title: string;
  bodyHtml: string;
}): { html: string; text: string } {
  const safeTitle = escapeHtml(title);
  const appUrl = webAppUrl();
  const appUrlLabel = appUrl.replace(/^https?:\/\//, "");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${safeTitle}</title>
</head>
<body style="margin:0;padding:0;background:${surface};font-family:Inter,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:${textColor};">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${surface};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid ${border};border-radius:16px;overflow:hidden;box-shadow:0 8px 30px rgba(15,23,42,0.06);">
          <tr>
            <td style="background:linear-gradient(135deg,${brandGreen} 0%,${brandGreenDark} 100%);padding:28px 32px;">
              <p style="margin:0 0 6px;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:rgba(255,255,255,0.82);">${escapeHtml(BRAND.companyName)}</p>
              <h1 style="margin:0;font-size:24px;line-height:1.2;color:#ffffff;font-weight:700;">${safeTitle}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">${bodyHtml}</td>
          </tr>
          <tr>
            <td style="padding:20px 32px 28px;border-top:1px solid ${border};background:#fcfdfe;">
              <p style="margin:0;font-size:12px;line-height:1.6;color:${muted};">
                ${escapeHtml(BRAND.productName)} · School management for Ugandan secondary schools<br />
                <a href="${escapeHtml(appUrl)}" style="color:${accentBlue};text-decoration:none;">${escapeHtml(appUrlLabel)}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const bodyText = htmlToPlainText(bodyHtml);
  const text = [
    title,
    "",
    bodyText,
    "",
    "—",
    `${BRAND.productName} · School management for Ugandan secondary schools`,
    appUrlLabel,
  ]
    .filter((line, index, arr) => line !== "" || (index > 0 && arr[index - 1] !== ""))
    .join("\n");

  return { html, text };
}
