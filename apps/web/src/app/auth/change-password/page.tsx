"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ForcePasswordChangeForm } from "@/components/auth/ForcePasswordChangeForm";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useAuthStore } from "@/store/authStore";

export default function ChangePasswordPage() {
  const router = useRouter();
  const hydrated = useAuthStore((s) => s.hydrated);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (hydrated && !user) {
      router.replace("/login");
    }
  }, [hydrated, user, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-lg sm:p-8">
        <ForcePasswordChangeForm />
      </div>
    </div>
  );
}
