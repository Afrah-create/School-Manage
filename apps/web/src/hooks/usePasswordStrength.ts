import { useMemo } from "react";

export type PasswordStrengthLabel = "Weak" | "Fair" | "Good" | "Strong";

export function usePasswordStrength(password: string) {
  return useMemo(() => {
    const hasMinLength = password.length >= 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasLowercase = /[a-z]/.test(password);

    const score = [hasMinLength, hasUppercase, hasNumber, hasLowercase].filter(Boolean).length;
    let label: PasswordStrengthLabel = "Weak";
    if (score === 2) label = "Fair";
    if (score === 3) label = "Good";
    if (score >= 4) label = "Strong";

    return {
      score,
      label,
      checks: {
        hasMinLength,
        hasUppercase,
        hasNumber,
      },
    };
  }, [password]);
}
