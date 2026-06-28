import { BRAND } from "@/lib/brand";

export const AUTH_BRAND = {
  productName: BRAND.productName,
  companyName: BRAND.companyName,
  slogan: BRAND.companyTagline,
  logoIcon: BRAND.logoIcon,
  logoFull: BRAND.logoFull,
};

export const AUTH_COLORS = {
  primaryBlue: "#2563EB",
  darkBlue: "#1E3A8A",
  lightBlueTint: "#EFF6FF",
  textPrimary: "#111827",
  textMuted: "#6B7280",
  errorRed: "#EF4444",
  successGreen: "#10B981",
  warningAmber: "#F59E0B",
};

export const AUTH_COPY = {
  forgotSubtitle:
    "Enter the email address linked to your account and we'll send you a reset code.",
  resetSubtitle:
    "Your new password must be at least 8 characters and include a mix of letters and numbers.",
  verifyLoadingSubtext: "This will only take a moment.",
  verifyErrorHelp: "This link may have expired or already been used.",
  checkEmailBody:
    "Click the link in the email to activate your account. The link expires in 24 hours.",
};

/** Matches backend PASSWORD_RESET_EXPIRES_SECONDS (15 minutes). */
export const PASSWORD_RESET_CODE_EXPIRES_MINUTES = 15;

/** Client resend cooldown — backend authRateLimiter allows 10 requests per 15 minutes. */
export const PASSWORD_RESET_RESEND_COOLDOWN_SECONDS = 60;

/** Rotating copy while the app restores or finishes signing in. */
export const SESSION_LOADING_MESSAGES = [
  "Just a moment…",
  "Getting things ready…",
  "Almost there…",
  "Won't be long…",
  "Preparing your workspace…",
  "Hang tight…",
] as const;

export const SESSION_SIGN_IN_MESSAGES = [
  "Signing you in…",
  "Verifying your details…",
  "Just a second…",
  "Almost there…",
  "Getting your dashboard ready…",
] as const;
