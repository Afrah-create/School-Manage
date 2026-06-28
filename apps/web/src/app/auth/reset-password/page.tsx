"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, CheckIcon, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { useMemo, useState } from "react";
import { AuthCard } from "@/components/auth/AuthCard";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { CountdownTimer } from "@/components/auth/CountdownTimer";
import { stateMotion } from "@/components/auth/AuthMotion";
import {
  AUTH_COPY,
  PASSWORD_RESET_RESEND_COOLDOWN_SECONDS,
} from "@/components/auth/constants";
import { FormInput } from "@/components/auth/FormInput";
import { PasswordStrengthMeter } from "@/components/auth/PasswordStrengthMeter";
import { PrimaryButton } from "@/components/auth/PrimaryButton";
import { SixDigitCodeInput } from "@/components/auth/SixDigitCodeInput";
import { useCountdown } from "@/hooks/useCountdown";
import { usePasswordStrength } from "@/hooks/usePasswordStrength";
import { apiPost, getApiErrorMessage } from "@/lib/api";

function ResetPasswordPageInner() {
  const params = useSearchParams();
  const email = params.get("email") ?? "";
  const router = useRouter();
  const resend = useCountdown(PASSWORD_RESET_RESEND_COOLDOWN_SECONDS, false);

  const [stage, setStage] = useState<"code" | "password">("code");
  const [code, setCode] = useState("");
  const [codeTouched, setCodeTouched] = useState(false);
  const [codeInvalid, setCodeInvalid] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const codeError = useMemo(() => {
    if (codeInvalid) return "That code is incorrect or expired.";
    if (!codeTouched) return "";
    if (!/^\d{6}$/.test(code)) return "Enter a valid 6-digit code.";
    return "";
  }, [code, codeInvalid, codeTouched]);

  const strength = usePasswordStrength(password);
  const checks = useMemo(
    () => [
      { label: "At least 8 characters", passed: strength.checks.hasMinLength },
      { label: "At least one uppercase letter", passed: strength.checks.hasUppercase },
      { label: "At least one number", passed: strength.checks.hasNumber },
      { label: "Passwords match", passed: password.length > 0 && password === confirmPassword },
    ],
    [confirmPassword, password, strength.checks.hasMinLength, strength.checks.hasNumber, strength.checks.hasUppercase],
  );
  const allPassed = checks.every((item) => item.passed);

  const requestCode = async () => {
    if (!email.trim()) return;
    setError("");
    setLoading(true);
    try {
      await apiPost("/auth/password-reset/request-code", { email: email.trim() });
      resend.reset(PASSWORD_RESET_RESEND_COOLDOWN_SECONDS);
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    setCodeTouched(true);
    setCodeInvalid(false);
    setError("");
    if (!email.trim()) {
      setError("Email is required. Return to the forgot-password page and try again.");
      return;
    }
    if (codeError || !/^\d{6}$/.test(code)) return;

    setLoading(true);
    try {
      await apiPost("/auth/password-reset/verify-code", { email: email.trim(), code });
      setStage("password");
    } catch (e) {
      setCodeInvalid(true);
      setError(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async () => {
    if (!allPassed || !email.trim()) return;
    setError("");
    setLoading(true);
    try {
      await apiPost("/auth/password-reset/confirm", {
        email: email.trim(),
        code,
        newPassword: password,
      });
      router.push("/auth/reset-success");
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <AuthCard motionKey="reset-password">
        <AnimatePresence mode="wait">
          {stage === "code" ? (
            <motion.div
              key="code"
              variants={stateMotion}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.35, ease: "easeOut" }}
            >
              <h1 className="font-heading text-2xl font-semibold text-slate-900">Verify reset code</h1>
              <p className="font-body mt-1.5 text-sm text-slate-500">
                Enter the 6-digit code sent to <span className="font-semibold">{email || "your email"}</span>.
              </p>
              <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#DBEAFE] px-4 py-2 text-sm text-[#1D4ED8]">
                <Mail className="h-4 w-4" />
                <span className="font-body font-semibold">{email || "Email required"}</span>
              </div>
              <motion.div
                className="mt-5 space-y-4"
                animate={codeError ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
                transition={{ duration: 0.4 }}
              >
                <SixDigitCodeInput value={code} onChange={setCode} error={codeError} />
                {error ? <p className="text-sm text-red-600">{error}</p> : null}
                <PrimaryButton onClick={verifyCode} loading={loading}>
                  Verify Code
                </PrimaryButton>
              </motion.div>
              <div className="mt-4 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => void requestCode()}
                  disabled={resend.secondsLeft > 0 || loading || !email.trim()}
                  className="font-body text-sm font-medium text-[#2563EB] hover:underline disabled:text-slate-400"
                >
                  Resend code
                </button>
                {resend.secondsLeft > 0 ? (
                  <CountdownTimer secondsLeft={resend.secondsLeft} progress={resend.progress} showCircular />
                ) : null}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              variants={stateMotion}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.35, ease: "easeOut" }}
            >
              <h1 className="font-heading text-2xl font-semibold text-slate-900">Set a new password</h1>
              <p className="font-body mt-1.5 text-sm text-slate-500">{AUTH_COPY.resetSubtitle}</p>

              <div className="mt-5 space-y-3">
                <FormInput
                  id="new-password"
                  label="New Password"
                  icon={Lock}
                  type={showPwd ? "text" : "password"}
                  value={password}
                  onChange={setPassword}
                  placeholder="Create a strong password"
                  rightSlot={
                    <button
                      type="button"
                      onClick={() => setShowPwd((v) => !v)}
                      className="transition hover:text-slate-700"
                    >
                      {showPwd ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  }
                />
                <PasswordStrengthMeter score={strength.score} label={strength.label} />
                <FormInput
                  id="confirm-password"
                  label="Confirm Password"
                  icon={Lock}
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  placeholder="Confirm your password"
                  rightSlot={
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      className="transition hover:text-slate-700"
                    >
                      {showConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  }
                />
              </div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: password ? 1 : 0 }}
                className="mt-4 space-y-2"
              >
                {checks.map((item, index) => (
                  <motion.div
                    key={item.label}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`font-body flex items-center gap-2 text-sm ${
                      item.passed ? "text-[#10B981]" : "text-slate-500"
                    }`}
                  >
                    {item.passed ? <CheckCircle2 className="h-4 w-4" /> : <CheckIcon className="h-4 w-4" />}
                    {item.label}
                  </motion.div>
                ))}
              </motion.div>

              {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

              <div className="mt-5">
                <PrimaryButton type="button" onClick={onSubmit} loading={loading} disabled={!allPassed}>
                  Reset Password
                </PrimaryButton>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </AuthCard>
    </AuthLayout>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
          Loading…
        </div>
      }
    >
      <ResetPasswordPageInner />
    </Suspense>
  );
}
