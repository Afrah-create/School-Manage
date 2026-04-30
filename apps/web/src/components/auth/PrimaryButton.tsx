import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { ReactNode } from "react";

type PrimaryButtonProps = {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  loading?: boolean;
  disabled?: boolean;
  variant?: "primary" | "outline";
  className?: string;
};

export function PrimaryButton({
  children,
  onClick,
  type = "button",
  loading = false,
  disabled = false,
  variant = "primary",
  className,
}: PrimaryButtonProps) {
  const isPrimary = variant === "primary";
  return (
    <motion.button
      type={type}
      onClick={onClick}
      whileHover={!disabled ? { scale: 1.01, y: -1 } : undefined}
      whileTap={!disabled ? { scale: 0.98 } : undefined}
      disabled={disabled || loading}
      aria-busy={loading}
      aria-label={loading ? "Loading" : undefined}
      className={[
        "font-body w-full rounded-xl py-3 text-sm font-semibold transition",
        isPrimary
          ? "bg-[#2563EB] text-white shadow-[0_16px_30px_-16px_rgba(37,99,235,0.8)] hover:bg-[#1D4ED8] hover:shadow-[0_20px_34px_-16px_rgba(30,64,175,0.85)] disabled:cursor-not-allowed disabled:bg-blue-300"
          : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100",
        className ?? "",
      ].join(" ")}
    >
      {loading ? (
        <motion.span
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="inline-flex"
        >
          <Loader2 className="h-4 w-4" />
        </motion.span>
      ) : (
        children
      )}
    </motion.button>
  );
}
