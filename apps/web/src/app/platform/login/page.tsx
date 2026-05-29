"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PLATFORM_TOKEN_KEY, platformApi, setPlatformToken } from "@/lib/platformApi";

export default function PlatformLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await platformApi.post("/auth/login", { email, password });
      const token = res.data?.data?.token as string | undefined;
      if (!token) throw new Error("No token returned");
      setPlatformToken(token);
      const maxAge = 8 * 60 * 60;
      document.cookie = `${PLATFORM_TOKEN_KEY}=${encodeURIComponent(token)}; path=/; max-age=${maxAge}; SameSite=Lax`;
      router.push("/platform/tenants");
    } catch (err: unknown) {
      const msg =
        axiosMessage(err) ?? "Sign-in failed. Check your platform credentials.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-8 shadow-xl"
      >
        <h1 className="text-xl font-semibold text-white">Platform administration</h1>
        <p className="text-sm text-slate-400">
          Sign in to provision and manage schools. Use{" "}
          <code className="text-slate-300">platform.localhost:3000</code> in development.
        </p>
        <p className="text-xs text-slate-500">
          After <code className="text-slate-400">npm run seed</code>, use{" "}
          <code className="text-slate-400">platform@school.local</code> and the password from{" "}
          <code className="text-slate-400">PLATFORM_ADMIN_PASSWORD</code> (or{" "}
          <code className="text-slate-400">ADMIN_PASSWORD</code>) in <code className="text-slate-400">.env</code>.
        </p>
        {error ? (
          <p className="rounded-md bg-red-950/50 px-3 py-2 text-sm text-red-300">{error}</p>
        ) : null}
        <label className="block text-sm text-slate-300">
          Email
          <input
            type="email"
            required
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="block text-sm text-slate-300">
          Password
          <input
            type="password"
            required
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}

function axiosMessage(err: unknown): string | null {
  if (err && typeof err === "object" && "response" in err) {
    const data = (err as { response?: { data?: { error?: string } } }).response?.data;
    return typeof data?.error === "string" ? data.error : null;
  }
  return null;
}
