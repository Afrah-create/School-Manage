"use client";

import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/store/authStore";

export function Header() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const roleLabel = user?.role?.replace(/_/g, " ") ?? "";

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4">
      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
        <span>
          Signed in as{" "}
          <span className="font-medium text-slate-900">{user?.fullName ?? "—"}</span>
        </span>
        <Badge tone="success">{roleLabel}</Badge>
      </div>
      <Button
        variant="secondary"
        onClick={() => {
          logout();
          router.push("/login");
        }}
      >
        Logout
      </Button>
    </header>
  );
}
