"use client";

import type { ReactNode } from "react";

export function Modal({
  open,
  title,
  children,
  onClose,
  size = "default",
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  size?: "default" | "wide";
}) {
  if (!open) return null;
  const widthClass = size === "wide" ? "max-w-3xl" : "max-w-lg";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        className={`max-h-[90vh] w-full ${widthClass} overflow-auto rounded-lg border border-border bg-card p-4 text-card-foreground shadow-xl`}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
