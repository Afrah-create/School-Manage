"use client";

import Link from "next/link";

type CtaButtonProps = {
  children: React.ReactNode;
  className?: string;
  href?: string;
  variant?: "primary" | "accent";
  onClick?: () => void;
};

export function CtaButton({
  children,
  className = "",
  href = "/contact",
  variant = "primary",
  onClick,
}: CtaButtonProps) {
  const variantClass =
    variant === "accent"
      ? "bg-accent hover:bg-accent-deep focus-visible:outline-accent"
      : "bg-brand hover:bg-brand-dark focus-visible:outline-brand";

  return (
    <Link
      href={href}
      onClick={onClick}
      className={`inline-flex items-center justify-center rounded-md px-5 py-2.5 text-small font-semibold text-white transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${variantClass} ${className}`}
    >
      {children}
    </Link>
  );
}
