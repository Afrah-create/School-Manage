import type { ButtonHTMLAttributes, ReactNode } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  loading?: boolean;
};

export function Button({
  children,
  variant = "primary",
  loading,
  className = "",
  disabled,
  type = "button",
  ...rest
}: Props) {
  const base =
    "inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-medium transition-ui focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50";
  const styles =
    variant === "primary"
      ? "bg-brand text-white hover:bg-brand-dark"
      : variant === "secondary"
        ? "border border-border bg-card text-foreground hover:bg-accent hover:text-accent-foreground"
        : "text-foreground hover:bg-accent hover:text-accent-foreground";
  return (
    <button
      type={type}
      className={`${base} ${styles} ${className}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? "…" : children}
    </button>
  );
}
