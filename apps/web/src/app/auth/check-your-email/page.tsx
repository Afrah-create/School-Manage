"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Mail } from "lucide-react";
import { useMemo, useState } from "react";
import { AuthCard } from "@/components/auth/AuthCard";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { CountdownTimer } from "@/components/auth/CountdownTimer";
import { AUTH_COPY } from "@/components/auth/constants";
import { useCountdown } from "@/hooks/useCountdown";

export default function CheckYourEmailPage() {
  const email = useSearchParams().get("email") ?? "user@example.com";
  const resend = useCountdown(60, false);
  const [sent, setSent] = useState(false);

  const canResend = resend.secondsLeft === 0;
  const resendLabel = useMemo(() => {
    if (canResend) return "Resend verification email";
    return `Resend in 0:${resend.secondsLeft.toString().padStart(2, "0")}`;
  }, [canResend, resend.secondsLeft]);

  return (
    <AuthLayout>
      <AuthCard motionKey="check-email">
        <div className="text-center">
          <div className="mx-auto mb-4 w-fit">
            <motion.div className="relative">
              <motion.div
                className="h-16 w-20 rounded-md border-2 border-[#2563EB] bg-[#DBEAFE]"
                initial={{ y: 10 }}
                animate={{ y: -8 }}
                transition={{ duration: 0.45, ease: "easeOut" }}
              />
              <motion.div
                className="absolute left-0 top-0 h-10 w-20 origin-top rounded-t-md border-2 border-b-0 border-[#2563EB] bg-[#2563EB]"
                initial={{ rotateX: 0 }}
                animate={{ rotateX: -30 }}
                transition={{ duration: 0.5 }}
                style={{ transformPerspective: 600 }}
              />
              <motion.div
                className="absolute left-2 top-4 h-10 w-16 rounded-sm bg-white"
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: -8, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.45 }}
              />
            </motion.div>
          </div>

          <h1 className="font-heading text-2xl font-semibold text-slate-900">Check your email</h1>
          <p className="font-body mt-2 text-sm text-slate-600">We&apos;ve sent a 6-digit verification code to:</p>
          <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#DBEAFE] px-4 py-2 text-sm text-[#1D4ED8]">
            <Mail className="h-4 w-4" />
            <span className="font-body font-semibold">{email}</span>
          </div>
          <p className="font-body mt-3 text-sm text-slate-500">
            Enter the code in the verification page to activate your account. The code expires in 24
            hours.
          </p>

          <div className="my-5 h-px bg-slate-200" />

          <p className="font-body text-sm text-slate-500">
            Didn&apos;t get it? Check your spam folder or
          </p>
          <div className="mt-2 flex items-center justify-center gap-2">
            <button
              type="button"
              disabled={!canResend}
              onClick={() => {
                setSent(true);
                resend.reset(60);
                setTimeout(() => setSent(false), 2200);
              }}
              className="font-body text-sm font-semibold text-[#2563EB] hover:underline disabled:text-slate-400"
            >
              {resendLabel}
            </button>
            {!canResend ? <CountdownTimer secondsLeft={resend.secondsLeft} progress={resend.progress} showCircular /> : null}
          </div>
          {sent ? <p className="font-body mt-2 text-sm text-[#10B981]">Sent! ✓</p> : null}
          <div className="mt-4">
            <Link
              href={`/auth/verify-email?email=${encodeURIComponent(email)}`}
              className="font-body text-sm font-semibold text-[#2563EB] hover:underline"
            >
              Enter verification code →
            </Link>
          </div>

          <p className="mt-5">
            <Link href="/login" className="font-body text-sm font-medium text-[#2563EB] hover:underline">
              Wrong email? Sign up again →
            </Link>
          </p>
        </div>
      </AuthCard>
    </AuthLayout>
  );
}
