"use client";

import Image from "next/image";
import { useMemo } from "react";
import { resolveUploadUrl } from "@/lib/media";

type Size = "sm" | "md" | "lg";

const sizeClasses: Record<Size, string> = {
  sm: "h-9 w-9 text-xs",
  md: "h-11 w-11 text-sm",
  lg: "h-14 w-14 text-base",
};

export function StudentAvatar({
  fullName,
  photoUrl,
  size = "sm",
  className = "",
}: {
  fullName: string;
  photoUrl?: string | null;
  size?: Size;
  className?: string;
}) {
  const src = resolveUploadUrl(photoUrl ?? null);
  const initials = useMemo(() => {
    const parts = fullName.trim().split(/\s+/);
    const a = parts[0]?.[0] ?? "";
    const b = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
    return `${a}${b}`.toUpperCase() || "?";
  }, [fullName]);

  const dim = sizeClasses[size];

  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-full border border-border bg-muted font-semibold text-muted-foreground ${dim} ${className}`}
    >
      {src ? (
        <Image src={src} alt="" fill className="object-cover" sizes="56px" unoptimized />
      ) : (
        <span className="flex h-full w-full items-center justify-center">{initials}</span>
      )}
    </div>
  );
}
