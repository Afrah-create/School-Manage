"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useEffect } from "react";
import { AuthCard } from "@/components/auth/AuthCard";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { PrimaryButton } from "@/components/auth/PrimaryButton";
import { AUTH_BRAND } from "@/components/auth/constants";
import { useCountdown } from "@/hooks/useCountdown";

export default function ResetSuccessPage() {
  const router = useRouter();
  const countdown = useCountdown(5, true);

  useEffect(() => {
    if (countdown.secondsLeft === 0) router.push("/login");
  }, [countdown.secondsLeft, router]);

  return (
    <AuthLayout>
      <AuthCard motionKey="reset-success">
        <div className="text-center">
          <svg viewBox="0 0 64 64" className="mx-auto mb-4 h-20 w-20">
            <motion.path
              d="M32 4l20 8v18c0 14-8 24-20 30C20 54 12 44 12 30V12l20-8z"
              fill="none"
              stroke="#2563EB"
              strokeWidth="3"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1, fill: "#2563EB" }}
              transition={{ duration: 0.6 }}
            />
            <motion.path
              d="M22 33l7 7 13-13"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            />
          </svg>
          <h1 className="font-heading text-2xl font-semibold text-slate-900">You&apos;re all set!</h1>
          <p className="font-body mt-2 text-sm text-slate-600">Your password has been successfully reset.</p>
          <p className="font-body mt-1 text-sm italic text-slate-500">{AUTH_BRAND.slogan}</p>
          <p className="font-body mt-4 text-sm text-slate-500">
            Redirecting to sign in in {countdown.secondsLeft}s...
          </p>
          <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-slate-200">
            <motion.div
              className="h-full bg-[#2563EB]"
              animate={{ width: `${countdown.progress * 100}%` }}
              transition={{ ease: "linear" }}
            />
          </div>
          <div className="mt-5">
            <PrimaryButton onClick={() => router.push("/login")}>Sign In Now</PrimaryButton>
          </div>
        </div>
      </AuthCard>
    </AuthLayout>
  );
}
