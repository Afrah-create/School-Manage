"use client";

import { PageWrapper } from "@/components/layout/PageWrapper";
import { NotificationInbox } from "@/components/notifications/NotificationInbox";
import { useAuthStore } from "@/store/authStore";

export default function NotificationsInboxPage() {
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
      title="Notifications"
      description="Exam workflow updates, mark submissions, and other school alerts."
    >
      <NotificationInbox rolePrefix={rolePrefix} />
    </PageWrapper>
  );
}
