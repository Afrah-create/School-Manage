import { BRAND, COLORS } from "@uganda-cbc-sms/brand";
import { renderEmailShell } from "./shell.js";

const muted = COLORS.neutral[600];
const text = COLORS.neutral[900];

export function buildPasswordResetCodeEmail({
  code,
  expiresMinutes,
}: {
  code: string;
  expiresMinutes: number;
}): { subject: string; html: string; text: string } {
  const subject = `${BRAND.productName} — password reset code`;

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:${muted};">
      Use this code to reset your ${BRAND.productName} password. It expires in
      <strong style="color:${text};">${expiresMinutes} minutes</strong>.
    </p>
    <p style="margin:0 0 20px;font-size:32px;font-weight:700;letter-spacing:0.35em;color:${text};font-family:ui-monospace,monospace;">
      ${code}
    </p>
    <p style="margin:0;font-size:14px;line-height:1.6;color:${muted};">
      If you did not request a password reset, you can safely ignore this email — your password will not change.
    </p>
    <p style="margin:16px 0 0;font-size:13px;line-height:1.6;color:${muted};">
      For your security, never share this code with anyone. ${escapeHtml(BRAND.companyName)} staff will never ask for it.
    </p>`;

  const { html, text: plain } = renderEmailShell({
    title: "Password reset code",
    bodyHtml,
  });

  return {
    subject,
    html,
    text: [
      plain,
      "",
      `Your reset code: ${code}`,
      `Expires in ${expiresMinutes} minutes.`,
      "",
      "If you did not request this, ignore this email.",
    ].join("\n"),
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
