"use client";

import Link from "next/link";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { NotificationPreferencesForm } from "@/components/notifications/NotificationPreferencesForm";
import { useAuthStore } from "@/store/authStore";

export default function NotificationSettingsPage() {
  const authUser = useAuthStore((s) => s.user);
  const rolePrefixes: Record<string, string> = {
    admin: "/admin",
    headteacher: "/headteacher",
    class_teacher: "/class-teacher",
    subject_teacher: "/subject-teacher",
    bursar: "/bursar",
  };
  const rolePrefix = authUser ? (rolePrefixes[authUser.role] ?? "/login") : "/login";

  return (
    <PageWrapper
      title="Notification settings"
      description="Control in-app and email alerts for assessment and exam activity."
    >
      <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
        <Link href={`${rolePrefix}/dashboard`} className="font-medium text-brand hover:underline">
          ← Back to dashboard
        </Link>
        <span className="text-muted-foreground">·</span>
        <Link href="/profile/notifications" className="font-medium text-brand hover:underline">
          Notifications inbox
        </Link>
        <span className="text-muted-foreground">·</span>
        <Link href="/profile" className="font-medium text-brand hover:underline">
          My profile
        </Link>
      </div>
      <NotificationPreferencesForm />
    </PageWrapper>
  );
}
