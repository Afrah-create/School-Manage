"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { apiPatch, getApiErrorMessage } from "@/lib/api";
import { dashboardForRole, postLoginPath } from "@/lib/postLoginPath";
import { toast } from "@/lib/toast";
import { useAuthStore } from "@/store/authStore";

export function ForcePasswordChangeForm() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const setToken = useAuthStore((s) => s.setToken);
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (user && !user.forcePasswordChange) {
      router.replace(dashboardForRole(user.role));
    }
  }, [user, router]);

  if (!user) {
    return (
      <p className="text-sm text-muted-foreground">
        Sign in with your temporary password to continue.
      </p>
    );
  }

  if (!user.forcePasswordChange) {
    return (
      <p className="text-sm text-muted-foreground">Redirecting to your dashboard…</p>
    );
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (form.next !== form.confirm) {
      toast.error("New passwords do not match.", "Password");
      return;
    }
    if (form.next.length < 8) {
      toast.error("Use at least 8 characters.", "Password");
      return;
    }

    try {
      setPending(true);
      const result = await apiPatch<{ token: string }>("/auth/change-password", {
        currentPassword: form.current,
        newPassword: form.next,
      });
      setToken(result.token);
      updateUser({ forcePasswordChange: false });
      toast.success("Password updated. Welcome!", "Security");
      router.replace(postLoginPath({ ...user, forcePasswordChange: false }));
    } catch (error) {
      toast.error(getApiErrorMessage(error), "Could not change password");
    } finally {
      setPending(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={submit}>
      <div>
        <p className="font-heading text-2xl font-semibold text-foreground">Set a new password</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Your administrator requires you to replace the temporary password before using
          SchoolManage.
        </p>
      </div>
      <Input
        label="Current (temporary) password"
        type="password"
        autoComplete="current-password"
        value={form.current}
        onChange={(e) => setForm((f) => ({ ...f, current: e.target.value }))}
      />
      <Input
        label="New password"
        type="password"
        autoComplete="new-password"
        value={form.next}
        onChange={(e) => setForm((f) => ({ ...f, next: e.target.value }))}
      />
      <Input
        label="Confirm new password"
        type="password"
        autoComplete="new-password"
        value={form.confirm}
        onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))}
      />
      <Button type="submit" className="w-full" disabled={pending} loading={pending}>
        Save password & continue
      </Button>
    </form>
  );
}
