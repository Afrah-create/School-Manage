"use client";

import { useEffect, useState } from "react";
import { Spinner } from "@/components/feedback/Spinner";
import { SESSION_LOADING_MESSAGES } from "@/components/auth/constants";

type Layout = "fullscreen" | "inline" | "overlay";

export function SessionLoadingScreen({
  messages = SESSION_LOADING_MESSAGES,
  fixedMessage,
  layout = "fullscreen",
}: {
  /** Rotating friendly lines shown while loading (ignored when fixedMessage is set). */
  messages?: readonly string[];
  /** Single line — no rotation (e.g. redirect copy). */
  fixedMessage?: string;
  layout?: Layout;
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (fixedMessage || messages.length <= 1) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % messages.length);
    }, 2800);
    return () => window.clearInterval(id);
  }, [fixedMessage, messages]);

  const message = fixedMessage ?? messages[index] ?? messages[0] ?? "Loading…";

  const content = (
    <div className="flex flex-col items-center gap-4 text-center" role="status" aria-live="polite">
      <Spinner size="lg" className="text-brand" />
      <p className="max-w-xs font-body text-sm text-muted-foreground">{message}</p>
    </div>
  );

  if (layout === "overlay") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 px-6 backdrop-blur-sm">
        {content}
      </div>
    );
  }

  if (layout === "inline") {
    return (
      <div className="flex min-h-[40vh] items-center justify-center px-6">{content}</div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">{content}</div>
  );
}
