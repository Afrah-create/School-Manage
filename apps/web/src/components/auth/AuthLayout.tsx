"use client";

import Image from "next/image";
import { ReactNode } from "react";
import { AUTH_BRAND } from "./constants";

type AuthLayoutProps = {
  children: ReactNode;
  supportingCopy?: string;
};

function BrandingPanel({ supportingCopy }: { supportingCopy?: string }) {
  return (
    <aside className="relative flex w-2/5 flex-col justify-between overflow-hidden bg-gradient-to-br from-[#1E3A8A] to-[#1D4ED8] p-8 text-white xl:p-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_20%,rgba(255,255,255,0.16),transparent_38%),radial-gradient(circle_at_85%_15%,rgba(219,234,254,0.18),transparent_35%)]" />
      <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.18)_1px,transparent_1px)] [background-size:26px_26px]" />
      <div className="relative">
        <div className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-4 py-2 backdrop-blur-sm">
          <Image
            src={AUTH_BRAND.logoIcon}
            alt={`${AUTH_BRAND.companyName} logo`}
            width={30}
            height={30}
            className="h-7 w-7 rounded-md object-cover"
          />
          <span className="font-heading ml-2 text-sm font-semibold">{AUTH_BRAND.companyName}</span>
        </div>
        <div className="mt-7 rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
          <Image
            src={AUTH_BRAND.logoFull}
            alt={`${AUTH_BRAND.companyName} full logo`}
            width={420}
            height={140}
            className="h-auto w-full max-w-[320px] rounded-lg object-cover"
            priority
          />
          <h1 className="font-heading mt-4 max-w-sm text-3xl font-semibold leading-tight xl:text-4xl">
            {AUTH_BRAND.companyName}
          </h1>
          <p className="font-body mt-2 max-w-md text-sm text-blue-100/90">{AUTH_BRAND.slogan}</p>
          {supportingCopy ? (
            <p className="font-body mt-3 max-w-md text-sm text-blue-100/90">{supportingCopy}</p>
          ) : null}
        </div>
      </div>
      <div className="relative">
        <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
          <p className="font-body text-sm text-blue-100">
            Trusted by administrators, teachers, and bursars to simplify daily workflows.
          </p>
        </div>
      </div>
    </aside>
  );
}

export function AuthLayout({ children, supportingCopy }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-[#EFF6FF]">
      <div className="mx-auto hidden min-h-screen max-w-[1600px] lg:flex">
        <BrandingPanel supportingCopy={supportingCopy} />
        <section className="flex w-3/5 items-center justify-center bg-[#EFF6FF] px-8 py-6 xl:px-10 xl:py-8">
          <div className="w-full max-w-xl">{children}</div>
        </section>
      </div>

      <div className="lg:hidden">
        <div className="bg-[#1E3A8A] px-5 py-4">
          <div className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-4 py-2 text-white backdrop-blur-sm">
            <Image
              src={AUTH_BRAND.logoIcon}
              alt={`${AUTH_BRAND.companyName} logo`}
              width={26}
              height={26}
              className="h-6 w-6 rounded-md object-cover"
            />
            <span className="font-heading ml-2 text-sm font-semibold">{AUTH_BRAND.companyName}</span>
          </div>
        </div>
        <div className="px-4 py-6">
          <div className="mx-auto w-full max-w-xl">{children}</div>
        </div>
      </div>
    </div>
  );
}
