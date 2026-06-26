"use client";

import { useEffect, useRef, useState } from "react";

export type ImageRevealVariant = "hero" | "from-left" | "from-right" | "rise";

type ImageRevealProps = {
  src: string;
  alt: string;
  variant?: ImageRevealVariant;
  priority?: boolean;
  delay?: number;
  className?: string;
};

const frameAccent: Record<ImageRevealVariant, string> = {
  hero: "from-brand/20 via-transparent to-brand/10",
  "from-left": "from-brand/15 via-transparent to-transparent",
  "from-right": "from-transparent via-transparent to-brand/15",
  rise: "from-brand/10 via-transparent to-transparent",
};

export function ImageReveal({
  src,
  alt,
  variant = "rise",
  priority = false,
  delay = 0,
  className = "",
}: ImageRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.18, rootMargin: "0px 0px -5% 0px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const imageMotion = {
    hero: visible
      ? "scale-100 opacity-100 [clip-path:inset(0%_0%_0%_0%_round_1rem)]"
      : "scale-[1.07] opacity-0 [clip-path:inset(6%_8%_10%_8%_round_1.5rem)]",
    "from-left": visible
      ? "translate-x-0 translate-y-0 rotate-0 scale-100 opacity-100"
      : "-translate-x-10 translate-y-4 -rotate-2 scale-[0.94] opacity-0",
    "from-right": visible
      ? "translate-x-0 translate-y-0 rotate-0 scale-100 opacity-100"
      : "translate-x-10 translate-y-4 rotate-2 scale-[0.94] opacity-0",
    rise: visible
      ? "translate-y-0 scale-100 opacity-100"
      : "translate-y-8 scale-[0.96] opacity-0",
  }[variant];

  const frameMotion = visible ? "scale-100 opacity-100" : "scale-[0.97] opacity-0";

  return (
    <div ref={ref} className={`relative ${className}`} style={{ perspective: "1200px" }}>
      <div
        aria-hidden
        className={`pointer-events-none absolute -inset-2 rounded-[1.35rem] bg-gradient-to-br transition-all duration-[900ms] ease-smooth sm:-inset-3 ${frameAccent[variant]} ${frameMotion}`}
        style={{ transitionDelay: `${delay}ms` }}
      />
      <div className="relative overflow-hidden rounded-2xl bg-muted shadow-elevated ring-1 ring-border">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          className={`h-full w-full object-cover object-center transition-all duration-[900ms] ease-smooth will-change-transform ${imageMotion}`}
          style={{ transitionDelay: `${delay}ms` }}
        />
      </div>
    </div>
  );
}
