"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Info, Lock } from "lucide-react";
import { AuthCard } from "@/components/auth/AuthCard";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { PrimaryButton } from "@/components/auth/PrimaryButton";
import { useCountdown } from "@/hooks/useCountdown";

export default function AccountLockedPage() {
  const router = useRouter();
  const unlockAt = Number(useSearchParams().get("unlockAt") ?? "");
  const nowUnix = Math.floor(Date.now() / 1000);
  const initial = Number.isFinite(unlockAt) && unlockAt > nowUnix ? unlockAt - nowUnix : 15 * 60;
  const timer = useCountdown(initial, true);
  const canRetry = timer.secondsLeft <= 0;

  const timerDisplay = useMemo(() => {
    const m = Math.floor(timer.secondsLeft / 60)
      .toString()
      .padStart(2, "0");
    const s = (timer.secondsLeft % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }, [timer.secondsLeft]);

  return (
    <AuthLayout>
      <AuthCard motionKey="account-locked">
        <div className="text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: [1, 1.03, 1], opacity: 1 }}
            transition={{
              opacity: { duration: 0.4 },
              scale: { repeat: Infinity, duration: 3, ease: "easeInOut" },
              type: "spring",
              stiffness: 300,
              damping: 20,
            }}
            className="mb-3 inline-flex"
          >
            <Lock className="h-12 w-12 text-[#EF4444]" />
          </motion.div>
          <h1 className="font-heading text-2xl font-semibold text-slate-900">Account temporarily locked</h1>
          <p className="font-body mt-2 text-sm text-slate-500">
            Too many failed sign-in attempts. For your security, this account has been locked.
          </p>

          <motion.p
            key={timerDisplay}
            initial={{ rotateX: -90, opacity: 0 }}
            animate={{ rotateX: 0, opacity: 1 }}
            className="mt-5 font-mono text-4xl font-semibold text-slate-900"
            aria-live="polite"
          >
            {timerDisplay}
          </motion.p>
          <p className="font-body mt-1 text-sm text-slate-500">Your account will unlock automatically.</p>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <a href="mailto:support@slimcybertech.com">
              <PrimaryButton variant="outline">Contact Support</PrimaryButton>
            </a>
            {canRetry ? (
              <PrimaryButton onClick={() => router.push("/login")}>Try Again</PrimaryButton>
            ) : (
              <PrimaryButton disabled>Try Again</PrimaryButton>
            )}
          </div>

          <div className="mt-4 rounded-xl bg-[#EFF6FF] p-3 text-left">
            <p className="font-body flex items-start gap-2 text-sm text-slate-700">
              <Info className="mt-0.5 h-4 w-4 text-[#2563EB]" />
              If this wasn&apos;t you, we recommend changing your password immediately after regaining
              access.
            </p>
          </div>
        </div>
      </AuthCard>
    </AuthLayout>
  );
}
