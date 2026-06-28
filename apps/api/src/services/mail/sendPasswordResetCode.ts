import { sendEmail } from "./resendClient.js";
import { buildPasswordResetCodeEmail } from "./templates/passwordResetCode.js";

export async function sendPasswordResetCodeEmail(
  to: string,
  code: string,
  expiresMinutes: number,
): Promise<void> {
  const { subject, html, text } = buildPasswordResetCodeEmail({ code, expiresMinutes });
  const result = await sendEmail({ to, subject, html, text });
  if (!result.sent) {
    console.error("[mail] password reset code not sent:", result.error ?? "unknown error");
  }
}
