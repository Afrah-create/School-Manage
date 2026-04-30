"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AnimatedCheckmark } from "@/components/auth/AnimatedCheckmark";
import { AuthCard } from "@/components/auth/AuthCard";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { stateMotion } from "@/components/auth/AuthMotion";
import { CountdownTimer } from "@/components/auth/CountdownTimer";
import { PrimaryButton } from "@/components/auth/PrimaryButton";
import { AUTH_BRAND, AUTH_COPY } from "@/components/auth/constants";
import { SixDigitCodeInput } from "@/components/auth/SixDigitCodeInput";
import { useCountdown } from "@/hooks/useCountdown";

export default function VerifyEmailPage() {
  const email = useSearchParams().get("email") ?? "";
  const redirect = useCountdown(4, false);
  const resend = useCountdown(60, false);
  const router = useRouter();
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"entry" | "loading" | "success" | "error">("entry");
  const [touched, setTouched] = useState(false);
  const [invalidCode, setInvalidCode] = useState(false);

  const codeError = useMemo(() => {
    if (invalidCode) return "That code is incorrect or expired.";
    if (!touched) return "";
    if (!/^\d{6}$/.test(code)) return "Enter a valid 6-digit code.";
    return "";
  }, [code, invalidCode, touched]);

  useEffect(() => {
    if (status !== "success") return;
    redirect.reset(4);
  }, [status]);

  useEffect(() => {
    if (status !== "success" || redirect.secondsLeft > 0) return;
    router.push("/login");
  }, [redirect.secondsLeft, router, status]);

  const verifyCode = async () => {
    setTouched(true);
    setInvalidCode(false);
    if (codeError || !/^\d{6}$/.test(code)) return;
    setStatus("loading");
    await new Promise((r) => setTimeout(r, 900));
    if (code === "123456") {
      setStatus("success");
      return;
    }
    setInvalidCode(true);
    setStatus("entry");
  };

  return (
    <AuthLayout>
      <AuthCard motionKey="verify-email">
        <AnimatePresence mode="wait">
          {status === "loading" ? (
            <motion.div key="loading" variants={stateMotion} initial="enter" animate="center" exit="exit">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                className="mx-auto mt-6 inline-flex"
              >
                <Loader2 className="h-9 w-9 text-[#2563EB]" />
              </motion.div>
              <h1 className="font-heading mt-4 text-center text-2xl font-semibold text-slate-900">
                Verifying your code...
              </h1>
              <p className="font-body mt-2 text-center text-sm text-slate-500">{AUTH_COPY.verifyLoadingSubtext}</p>
            </motion.div>
          ) : status === "success" ? (
            <motion.div
              key="success"
              variants={stateMotion}
              initial="enter"
              animate="center"
              exit="exit"
              className="text-center"
            >
              <div className="mb-3 flex justify-center">
                <AnimatedCheckmark color="#10B981" />
              </div>
              <h1 className="font-heading text-2xl font-semibold text-slate-900">Email verified!</h1>
              <p className="font-body mt-2 text-sm text-slate-600">
                Your account is now active. Welcome aboard!
              </p>
              <p className="font-body mt-2 text-sm italic text-slate-500">{AUTH_BRAND.slogan}</p>
              <div className="mt-5">
                <PrimaryButton onClick={() => router.push("/login")}>Sign In</PrimaryButton>
              </div>
              <div className="mt-5">
                <div className="h-1 w-full overflow-hidden rounded-full bg-slate-200">
                  <motion.div
                    className="h-full bg-[#2563EB]"
                    animate={{ width: `${redirect.progress * 100}%` }}
                    transition={{ ease: "linear" }}
                  />
                </div>
              </div>
            </motion.div>
          ) : status === "error" ? (
            <motion.div
              key="error"
              variants={stateMotion}
              initial="enter"
              animate="center"
              exit="exit"
              className="text-center"
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <XCircle className="mx-auto h-12 w-12 text-[#EF4444]" />
              </motion.div>
              <h1 className="font-heading mt-4 text-2xl font-semibold text-slate-900">Verification failed</h1>
              <p className="font-body mt-2 text-sm text-slate-500">{AUTH_COPY.verifyErrorHelp}</p>
              <div className="mt-5">
                <PrimaryButton onClick={() => setStatus("entry")}>Try code again</PrimaryButton>
              </div>
              <p className="font-body mt-3 text-sm text-slate-500">
                Need help?{" "}
                <a href="mailto:support@slimcybertech.com" className="font-medium text-[#2563EB] hover:underline">
                  Contact support
                </a>
              </p>
            </motion.div>
          ) : (
            <motion.div key="entry" variants={stateMotion} initial="enter" animate="center" exit="exit">
              <h1 className="font-heading text-2xl font-semibold text-slate-900">Verify your email</h1>
              <p className="font-body mt-1.5 text-sm text-slate-500">
                Enter the 6-digit code sent to <span className="font-semibold">{email || "your email"}</span>.
              </p>
              <motion.div
                className="mt-5 space-y-4"
                animate={codeError ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
                transition={{ duration: 0.4 }}
              >
                <SixDigitCodeInput value={code} onChange={setCode} error={codeError} />
                <PrimaryButton onClick={verifyCode}>Verify Email</PrimaryButton>
              </motion.div>
              <div className="mt-4 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => resend.reset(60)}
                  disabled={resend.secondsLeft > 0}
                  className="font-body text-sm font-medium text-[#2563EB] hover:underline disabled:text-slate-400"
                >
                  Resend code
                </button>
                {resend.secondsLeft > 0 ? (
                  <CountdownTimer secondsLeft={resend.secondsLeft} progress={resend.progress} showCircular />
                ) : null}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </AuthCard>
    </AuthLayout>
  );
}
