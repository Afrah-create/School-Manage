"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Lock, Mail, Shield } from "lucide-react";
import { PLATFORM_TOKEN_KEY, platformApi, setPlatformToken } from "@/lib/platformApi";
import { platformApiError } from "@/components/platform/platformUtils";
import {
  platformBtnPrimary,
  platformInputClass,
  platformLabelClass,
} from "@/components/platform/platformFieldStyles";
import { toast } from "@/lib/toast";

export default function PlatformLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await platformApi.post("/auth/login", { email, password });
      const token = res.data?.data?.token as string | undefined;
      if (!token) throw new Error("No token returned");
      setPlatformToken(token);
      const maxAge = 8 * 60 * 60;
      document.cookie = `${PLATFORM_TOKEN_KEY}=${encodeURIComponent(token)}; path=/; max-age=${maxAge}; SameSite=Lax`;
      toast.success("Welcome to the platform console.", "Signed in");
      router.push("/platform/tenants");
    } catch (err: unknown) {
      toast.error(
        platformApiError(err) ?? "Check your email and password, then try again.",
        "Sign-in failed",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col lg:flex-row">
        <aside className="relative flex flex-1 flex-col justify-between overflow-hidden bg-gradient-to-br from-slate-900 via-violet-950 to-indigo-950 p-8 lg:max-w-md lg:p-10">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(139,92,246,0.25),transparent_45%),radial-gradient(circle_at_80%_0%,rgba(99,102,241,0.2),transparent_40%)]" />
          <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:24px_24px]" />
          <div className="relative">
            <div className="inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 backdrop-blur-sm">
              <Image
                src="/images/Logo.jpeg"
                alt="SlimCyberTech"
                width={32}
                height={32}
                className="h-8 w-8 rounded-lg object-cover"
              />
              <span className="font-heading text-sm font-semibold text-white">SlimCyberTech</span>
            </div>
            <div className="mt-10">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/20 text-violet-200 ring-1 ring-violet-400/30">
                <Shield className="h-6 w-6" aria-hidden />
              </div>
              <h1 className="font-heading text-3xl font-semibold leading-tight text-white lg:text-4xl">
                Platform administration
              </h1>
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-violet-100/80">
                Provision schools, configure modules, and manage tenants from a single control plane.
              </p>
            </div>
          </div>
          <p className="relative mt-8 text-xs text-violet-200/50">
            School staff sign in on their school subdomain — not this console.
          </p>
        </aside>

        <section className="flex flex-1 items-center justify-center px-6 py-10 lg:px-12">
          <form
            onSubmit={onSubmit}
            className="w-full max-w-md space-y-5 rounded-2xl border border-slate-800/80 bg-slate-900/60 p-8 shadow-2xl shadow-black/30 backdrop-blur-sm"
          >
            <div>
              <h2 className="font-heading text-xl font-semibold text-white">Sign in</h2>
              <p className="mt-1 text-sm text-slate-400">Use your platform super-admin account.</p>
            </div>

            <label className={platformLabelClass}>
              <span className="mb-1 flex items-center gap-2">
                <Mail className="h-4 w-4 text-slate-500" aria-hidden />
                Email
              </span>
              <input
                type="email"
                required
                autoComplete="email"
                className={platformInputClass}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>

            <label className={platformLabelClass}>
              <span className="mb-1 flex items-center gap-2">
                <Lock className="h-4 w-4 text-slate-500" aria-hidden />
                Password
              </span>
              <input
                type="password"
                required
                autoComplete="current-password"
                className={platformInputClass}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>

            <button type="submit" disabled={loading} className={`w-full ${platformBtnPrimary} py-2.5`}>
              {loading ? "Signing in…" : "Sign in to platform"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
