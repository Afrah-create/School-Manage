"use client";

import { BrandGradientStrip } from "@/components/brand/BrandGradientStrip";
import { BrandMark } from "@/components/brand/BrandMark";
import { AuthOrbitIllustration } from "@/components/auth/AuthOrbitIllustration";
import { HeroCopyCarousel } from "@/components/auth/HeroCopyCarousel";

export function LoginHeroPanel() {
  return (
    <aside className="relative min-h-screen w-2/5 shrink-0">
      <BrandGradientStrip className="absolute inset-0">
        <div className="flex h-full min-h-screen flex-col p-8 text-white xl:p-10">
          <div className="flex flex-1 items-center justify-center">
            <AuthOrbitIllustration />
          </div>
          <BrandMark
            tone="gradient"
            size="header"
            eyebrow="Sign in"
            subtitle="School administration made simple."
          />
          <HeroCopyCarousel />
        </div>
      </BrandGradientStrip>
    </aside>
  );
}
