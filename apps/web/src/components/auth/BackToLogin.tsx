"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export function BackToLogin({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/login"
      className={`font-body inline-flex items-center gap-1 text-sm font-medium text-[#2563EB] hover:underline ${className}`}
    >
      <ChevronLeft className="h-4 w-4" />
      Back to Sign In
    </Link>
  );
}
