"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle, ChevronLeft, Mail } from "lucide-react";
import { useMemo, useState } from "react";
import { AuthCard } from "@/components/auth/AuthCard";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { stateMotion } from "@/components/auth/AuthMotion";
import { FormInput } from "@/components/auth/FormInput";
import { PrimaryButton } from "@/components/auth/PrimaryButton";
import { AUTH_COPY } from "@/components/auth/constants";
import { useCountdown } from "@/hooks/useCountdown";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const cooldown = useCountdown(60, false);

  const emailError = useMemo(() => {
    if (!touched) return "";
    if (!email.trim()) return "Email is required.";
    if (!/\S+@\S+\.\S+/.test(email)) return "Enter a valid email address.";
    return "";
  }, [email, touched]);

  const submit = async () => {
    setTouched(true);
    if (emailError || !email) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 900));
    setLoading(false);
    setSent(true);
    cooldown.reset(60);
  };

  return (
    <AuthLayout supportingCopy="We'll send a secure 6-digit code to reset your password.">
      <AuthCard motionKey="forgot-password">
        <AnimatePresence mode="wait">
          {!sent ? (
            <motion.div
              key="form"
              variants={stateMotion}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.35, ease: "easeOut" }}
            >
              <Link
                href="/login"
                className="font-body mb-4 inline-flex items-center gap-1 text-sm font-medium text-[#2563EB] hover:underline"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </Link>
              <h1 className="font-heading text-2xl font-semibold text-slate-900">Forgot your password?</h1>
              <p className="font-body mt-1.5 text-sm text-slate-500">{AUTH_COPY.forgotSubtitle}</p>

              <motion.div
                className="mt-5 space-y-4"
                animate={emailError ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
                transition={{ duration: 0.4 }}
              >
                <FormInput
                  id="forgot-email"
                  label="Email"
                  icon={Mail}
                  value={email}
                  onChange={setEmail}
                  placeholder="you@company.com"
                  error={emailError}
                />

                <PrimaryButton type="button" onClick={submit} loading={loading}>
                  Send Reset Code
                </PrimaryButton>
              </motion.div>
              <p className="mt-4">
                <Link href="/login" className="font-body text-sm font-medium text-[#2563EB] hover:underline">
                  ← Back to Sign In
                </Link>
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="success"
              variants={stateMotion}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="py-3 text-center"
            >
              <motion.div
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="mb-3 inline-flex"
              >
                <CheckCircle className="h-12 w-12 text-[#10B981]" />
              </motion.div>
              <h2 className="font-heading text-2xl font-semibold text-slate-900">Check your inbox</h2>
              <p className="font-body mt-2 text-sm text-slate-600">
                We sent a 6-digit reset code to <span className="font-semibold">{email}</span>. It expires
                in 15 minutes.
              </p>
              <div className="mt-4">
                <PrimaryButton onClick={() => router.push(`/auth/reset-password?email=${encodeURIComponent(email)}`)}>
                  Enter Reset Code
                </PrimaryButton>
              </div>
              <p className="font-body mt-5 text-sm text-slate-500">
                Didn&apos;t receive it?{" "}
                <button
                  type="button"
                  onClick={() => cooldown.reset(60)}
                  disabled={cooldown.secondsLeft > 0}
                  className="font-semibold text-[#2563EB] disabled:text-slate-400"
                >
                  Resend
                </button>{" "}
                {cooldown.secondsLeft > 0 ? `in 0:${cooldown.secondsLeft.toString().padStart(2, "0")}` : ""}
              </p>
              <p className="mt-4">
                <Link href="/login" className="font-body text-sm font-medium text-[#2563EB] hover:underline">
                  ← Back to Sign In
                </Link>
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </AuthCard>
    </AuthLayout>
  );
}
